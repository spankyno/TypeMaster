import {
  registerUser,
  fetchUserByEmail,
  fetchTests,
  toPublicUser,
  fetchUser,
  getTokenVersion,
  incrementTokenVersion,
} from './_db.js';
import {
  hashPassword,
  verifyPassword,
  signToken,
  requireAuth,
  rateLimit,
  clientIp,
} from './_authHelpers.js';

function parseBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }
    if (typeof req.body === 'string') {
      try {
        resolve(JSON.parse(req.body));
      } catch {
        resolve({});
      }
      return;
    }
    if (typeof req.on !== 'function') {
      resolve({});
      return;
    }
    let str = '';
    req.on('data', (c: any) => {
      str += c;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(str));
      } catch {
        resolve({});
      }
    });
  });
}

/** Validate JWT signature and that token_version still matches DB. */
async function requireValidSession(req: any) {
  const payload = requireAuth(req);
  if (!payload) return null;
  const currentTv = await getTokenVersion(payload.sub);
  if ((payload.tv ?? 0) !== currentTv) return null;
  return payload;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Rate limit auth endpoints: 20 req / 15 min per IP
    const ip = clientIp(req);
    const rl = rateLimit(`auth:${ip}`, 20, 15 * 60 * 1000);
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfterSec || 60));
      return res.status(429).json({
        error: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
        retryAfterSec: rl.retryAfterSec,
      });
    }

    if (req.method === 'GET') {
      const payload = await requireValidSession(req);
      if (!payload) {
        return res.status(401).json({ error: 'No autenticado o sesión revocada' });
      }
      const user = await fetchUser(payload.sub);
      return res.status(200).json({
        success: true,
        user: toPublicUser(user),
      });
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const action = (body?.action || 'login').toLowerCase();

      // --- LOGOUT ALL DEVICES ---
      if (action === 'logout-all') {
        const payload = await requireValidSession(req);
        if (!payload) {
          return res.status(401).json({ error: 'No autenticado' });
        }
        const newTv = await incrementTokenVersion(payload.sub);
        return res.status(200).json({
          success: true,
          message: 'Sesiones cerradas en todos los dispositivos',
          tokenVersion: newTv,
        });
      }

      // --- REGISTER ---
      if (action === 'register') {
        const username = (body?.username || '').trim();
        const email = (body?.email || '').trim().toLowerCase();
        const password = body?.password || '';

        if (!username || username.length < 2) {
          return res
            .status(400)
            .json({ error: 'El nombre de usuario debe tener al menos 2 caracteres' });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return res.status(400).json({ error: 'Introduce un correo electrónico válido' });
        }
        if (!password || password.length < 6) {
          return res
            .status(400)
            .json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }

        // Stricter limit on register: 5 / 15 min per IP
        const regRl = rateLimit(`auth-register:${ip}`, 5, 15 * 60 * 1000);
        if (!regRl.ok) {
          res.setHeader('Retry-After', String(regRl.retryAfterSec || 60));
          return res.status(429).json({
            error: 'Demasiados registros desde esta dirección. Inténtalo más tarde.',
          });
        }

        try {
          const passwordHash = hashPassword(password);
          const user = await registerUser(username, email, passwordHash);
          const token = signToken({
            sub: user.id,
            email: user.email,
            username: user.username,
            tv: 0,
          });
          const tests = await fetchTests(user.id);
          return res.status(201).json({
            success: true,
            token,
            user,
            tests,
          });
        } catch (err: any) {
          const msg = err?.message || 'No se pudo registrar';
          // JWT_SECRET missing in prod
          if (String(msg).includes('JWT_SECRET')) {
            return res.status(500).json({ error: 'Configuración del servidor incompleta (JWT_SECRET)' });
          }
          const status = msg.includes('Ya existe') ? 409 : 500;
          return res.status(status).json({ error: msg });
        }
      }

      // --- LOGIN ---
      if (action === 'login') {
        const email = (body?.email || '').trim().toLowerCase();
        const password = body?.password || '';

        if (!email || !password) {
          return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
        }

        // Stricter login limit: 10 / 15 min per IP+email
        const loginRl = rateLimit(`auth-login:${ip}:${email}`, 10, 15 * 60 * 1000);
        if (!loginRl.ok) {
          res.setHeader('Retry-After', String(loginRl.retryAfterSec || 60));
          return res.status(429).json({
            error: 'Demasiados intentos de inicio de sesión. Espera e inténtalo de nuevo.',
          });
        }

        const row = await fetchUserByEmail(email);
        if (!row || !row.passwordHash) {
          return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        }
        if (!verifyPassword(password, row.passwordHash)) {
          return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        }

        const user = toPublicUser(row);
        const tv = row.tokenVersion ?? 0;
        const token = signToken({
          sub: user.id,
          email: user.email,
          username: user.username,
          tv,
        });
        const tests = await fetchTests(user.id);
        return res.status(200).json({
          success: true,
          token,
          user,
          tests,
        });
      }

      return res
        .status(400)
        .json({ error: 'Acción no válida. Usa action: "login", "register" o "logout-all"' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API /api/auth error:', error);
    const msg = error?.message || String(error);
    if (String(msg).includes('JWT_SECRET')) {
      return res.status(500).json({ error: 'Configuración del servidor incompleta (JWT_SECRET)' });
    }
    return res.status(500).json({
      error: 'Error en la autenticación',
      message: msg,
    });
  }
}
