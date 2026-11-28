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
import { rateLimitShared, rateLimitResetShared, keyPart } from './_rateLimit.js';

const WINDOW = 15 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/** Máx. de cuentas nuevas por hora en TODO el sitio (freno al registro masivo). Configurable por entorno. */
const REGISTER_GLOBAL_PER_HOUR = Math.max(1, Number(process.env.REGISTER_GLOBAL_PER_HOUR) || 100);

function tooMany(res: any, rl: { retryAfterSec?: number }, error: string) {
  res.setHeader('Retry-After', String(rl.retryAfterSec || 60));
  return res.status(429).json({ error, retryAfterSec: rl.retryAfterSec });
}

export default async function handler(req: any, res: any) {
  if (!prepareApi(req, res, ['GET', 'POST'])) return;

  try {
    const ip = clientIp(req);

    // --- Sesión actual ---
    // La comprobación de sesión (GET) NO consume el cupo de intentos de login/registro:
    // varios usuarios legítimos tras la misma IP (colegio, oficina) no se bloquean entre sí.
    // Solo lleva un tope muy holgado en memoria contra bucles descontrolados.
    if (req.method === 'GET') {
      const sessionRl = rateLimit(`auth-session:${ip}`, 600, WINDOW);
      if (!sessionRl.ok) return tooMany(res, sessionRl, 'Demasiadas peticiones. Espera un momento.');
      const payload = await requireValidSession(req);
      if (!payload) return res.status(401).json({ error: 'No autenticado o sesión revocada' });
      const user = await fetchUser(payload.sub);
      if (!user) return res.status(401).json({ error: 'No autenticado o sesión revocada' });
      return res.status(200).json({ success: true, user: toPublicUser(user) });
    }

    // Límite general de escrituras de autenticación por IP (compartido entre instancias)
    const rl = await rateLimitShared(`auth:${ip}`, 40, WINDOW);
    if (!rl.ok) return tooMany(res, rl, 'Demasiados intentos. Espera un momento e inténtalo de nuevo.');

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
      // Campo trampa: el formulario real lo envía vacío; los bots que rellenan todo, no.
      if (typeof body?.website === 'string' && body.website.trim() !== '') {
        return res.status(400).json({ error: 'Solicitud no válida' });
      }

      const v = validateRegistration(body);
      if (!v.ok) return res.status(400).json({ error: v.error });

      const regRl = await rateLimitShared(`auth-register:${ip}`, 5, HOUR);
      if (!regRl.ok) return tooMany(res, regRl, 'Demasiados registros desde esta dirección. Inténtalo más tarde.');

      const globalRl = await rateLimitShared('auth-register:global', REGISTER_GLOBAL_PER_HOUR, HOUR);
      if (!globalRl.ok) {
        return tooMany(res, globalRl, 'Hay demasiados registros ahora mismo. Inténtalo de nuevo en un rato.');
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

      // Dos límites compartidos entre instancias, ANTES del coste de PBKDF2:
      //  - por IP + cuenta (10 / 15 min)
      //  - por cuenta, sea cual sea la IP (20 / 15 min): frena la fuerza bruta distribuida
      const emailKey = keyPart(email);
      const loginKey = `auth-login:${ip}:${emailKey}`;
      const acctKey = `auth-acct:${emailKey}`;
      const loginRl = await rateLimitShared(loginKey, 10, WINDOW);
      if (!loginRl.ok) {
        return tooMany(res, loginRl, 'Demasiados intentos de inicio de sesión. Espera e inténtalo de nuevo.');
      }
      const acctRl = await rateLimitShared(acctKey, 20, WINDOW);
      if (!acctRl.ok) {
        return tooMany(res, acctRl, 'Demasiados intentos de inicio de sesión. Espera e inténtalo de nuevo.');
      }

      const row = await fetchUserByEmail(email);
      // Se calcula siempre un hash para que el tiempo no delate si el correo existe
      const ok = await verifyPassword(password, row?.passwordHash || DUMMY_HASH);
      if (!row || !row.passwordHash || !ok) {
        return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
      }

      // Login correcto: se reinician los contadores para que un despiste no deje al usuario bloqueado
      await rateLimitResetShared([loginKey, acctKey]);

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
