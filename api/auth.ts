import { registerUser, fetchUserByEmail, fetchTests, toPublicUser, fetchUser } from './_db.js';
import { hashPassword, verifyPassword, signToken, requireAuth } from './_authHelpers.js';

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

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const payload = requireAuth(req);
      if (!payload) {
        return res.status(401).json({ error: 'No autenticado' });
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

      if (action === 'register') {
        const username = (body?.username || '').trim();
        const email = (body?.email || '').trim().toLowerCase();
        const password = body?.password || '';

        if (!username || username.length < 2) {
          return res.status(400).json({ error: 'El nombre de usuario debe tener al menos 2 caracteres' });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return res.status(400).json({ error: 'Introduce un correo electrónico válido' });
        }
        if (!password || password.length < 6) {
          return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }

        try {
          const passwordHash = hashPassword(password);
          const user = await registerUser(username, email, passwordHash);
          const token = signToken({
            sub: user.id,
            email: user.email,
            username: user.username,
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
          const status = msg.includes('Ya existe') ? 409 : 500;
          return res.status(status).json({ error: msg });
        }
      }

      if (action === 'login') {
        const email = (body?.email || '').trim().toLowerCase();
        const password = body?.password || '';

        if (!email || !password) {
          return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
        }

        const row = await fetchUserByEmail(email);
        if (!row || !row.passwordHash) {
          return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        }
        if (!verifyPassword(password, row.passwordHash)) {
          return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        }

        const user = toPublicUser(row);
        const token = signToken({
          sub: user.id,
          email: user.email,
          username: user.username,
        });
        const tests = await fetchTests(user.id);
        return res.status(200).json({
          success: true,
          token,
          user,
          tests,
        });
      }

      return res.status(400).json({ error: 'Acción no válida. Usa action: "login" o "register"' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API /api/auth error:', error);
    return res.status(500).json({
      error: 'Error en la autenticación',
      message: error?.message || String(error),
    });
  }
}
