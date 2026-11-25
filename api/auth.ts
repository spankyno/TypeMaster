import { findOrCreateUser, fetchTests } from './_db.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch {}
      } else if (!body && typeof req.on === 'function') {
        body = await new Promise((resolve) => {
          let str = '';
          req.on('data', (c: any) => { str += c; });
          req.on('end', () => {
            try { resolve(JSON.parse(str)); } catch { resolve({}); }
          });
        });
      }

      const username = (body?.username || '').trim();
      const email = (body?.email || '').trim();

      if (!username) {
        return res.status(400).json({ error: 'El nombre de usuario o alias es obligatorio' });
      }

      const user = await findOrCreateUser(username, email);
      const tests = await fetchTests(user.id);

      return res.status(200).json({
        success: true,
        user,
        tests,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API /api/auth error:', error);
    return res.status(500).json({
      error: 'Error en la autenticación del usuario',
      message: error?.message || String(error),
    });
  }
}
