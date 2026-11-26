import {
  registerUser,
  fetchUserByEmail,
  fetchTests,
  fetchUser,
  toPublicUser,
  incrementTokenVersion,
  updatePasswordHash,
} from './_db.js';
import {
  hashPassword,
  verifyPassword,
  needsRehash,
  DUMMY_HASH,
  signToken,
  rateLimit,
  clientIp,
} from './_authHelpers.js';
import { prepareApi, parseBody, requireValidSession, serverError } from './_http.js';
import { validateRegistration } from './_validate.js';

const WINDOW = 15 * 60 * 1000;

export default async function handler(req: any, res: any) {
  if (!prepareApi(req, res, ['GET', 'POST'])) return;

  try {
    const ip = clientIp(req);
    const rl = rateLimit(`auth:${ip}`, 30, WINDOW);
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfterSec || 60));
      return res.status(429).json({
        error: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
        retryAfterSec: rl.retryAfterSec,
      });
    }

    // --- Sesión actual ---
    if (req.method === 'GET') {
      const payload = await requireValidSession(req);
      if (!payload) return res.status(401).json({ error: 'No autenticado o sesión revocada' });
      const user = await fetchUser(payload.sub);
      if (!user) return res.status(401).json({ error: 'No autenticado o sesión revocada' });
      return res.status(200).json({ success: true, user: toPublicUser(user) });
    }

    const body = await parseBody(req);
    const action = String(body?.action || 'login').toLowerCase();

    // --- Cerrar sesión en todos los dispositivos ---
    if (action === 'logout-all') {
      const payload = await requireValidSession(req);
      if (!payload) return res.status(401).json({ error: 'No autenticado' });
      const tokenVersion = await incrementTokenVersion(payload.sub);
      return res.status(200).json({
        success: true,
        message: 'Sesiones cerradas en todos los dispositivos',
        tokenVersion,
      });
    }

    // --- Registro ---
    if (action === 'register') {
      const v = validateRegistration(body);
      if (!v.ok) return res.status(400).json({ error: v.error });

      const regRl = rateLimit(`auth-register:${ip}`, 5, WINDOW);
      if (!regRl.ok) {
        res.setHeader('Retry-After', String(regRl.retryAfterSec || 60));
        return res.status(429).json({ error: 'Demasiados registros desde esta dirección. Inténtalo más tarde.' });
      }

      try {
        const passwordHash = await hashPassword(v.password);
        const user = await registerUser(v.username, v.email, passwordHash);
        const token = signToken({ sub: user.id, email: user.email, username: user.username, tv: 0 });
        return res.status(201).json({ success: true, token, user, tests: [] });
      } catch (err: any) {
        if (String(err?.message).includes('Ya existe')) {
          return res.status(409).json({ error: err.message });
        }
        throw err;
      }
    }

    // --- Login ---
    if (action === 'login') {
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body?.password === 'string' ? body.password : '';
      if (!email || !password || password.length > 200) {
        return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
      }

      const loginRl = rateLimit(`auth-login:${ip}:${email}`, 10, WINDOW);
      if (!loginRl.ok) {
        res.setHeader('Retry-After', String(loginRl.retryAfterSec || 60));
        return res.status(429).json({ error: 'Demasiados intentos de inicio de sesión. Espera e inténtalo de nuevo.' });
      }

      const row = await fetchUserByEmail(email);
      // Se calcula siempre un hash para que el tiempo no delate si el correo existe
      const ok = await verifyPassword(password, row?.passwordHash || DUMMY_HASH);
      if (!row || !row.passwordHash || !ok) {
        return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
      }

      // Migración transparente a más iteraciones PBKDF2
      if (needsRehash(row.passwordHash)) {
        try {
          await updatePasswordHash(row.id, await hashPassword(password));
        } catch (e) {
          console.warn('[auth] no se pudo actualizar el hash', e);
        }
      }

      const user = toPublicUser(row);
      const token = signToken({
        sub: user.id,
        email: user.email,
        username: user.username,
        tv: row.tokenVersion ?? 0,
      });
      const tests = await fetchTests(user.id);
      return res.status(200).json({ success: true, token, user, tests });
    }

    return res.status(400).json({ error: 'Acción no válida. Usa action: "login", "register" o "logout-all"' });
  } catch (error: any) {
    return serverError(res, 'auth', error);
  }
}
