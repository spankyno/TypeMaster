import { fetchUser, saveUser, toPublicUser } from './_db.js';
import { requireAuth } from './_authHelpers.js';

function parseBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }
    if (typeof req.body === 'string') {
      try { resolve(JSON.parse(req.body)); } catch { resolve({}); }
      return;
    }
    if (typeof req.on !== 'function') {
      resolve({});
      return;
    }
    let str = '';
    req.on('data', (c: any) => { str += c; });
    req.on('end', () => {
      try { resolve(JSON.parse(str)); } catch { resolve({}); }
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
    const auth = requireAuth(req);

    if (req.method === 'GET') {
      if (!auth) {
        return res.status(401).json({ error: 'No autenticado' });
      }
      const user = await fetchUser(auth.sub);
      return res.status(200).json(toPublicUser(user));
    }

    if (req.method === 'POST') {
      if (!auth) {
        return res.status(401).json({ error: 'No autenticado' });
      }
      const body = await parseBody(req);
      // Only allow updating own profile fields (not id/email takeover)
      await saveUser({
        ...body,
        id: auth.sub,
        email: undefined, // email change not supported here
      });
      const updated = await fetchUser(auth.sub);
      return res.status(200).json({ success: true, user: toPublicUser(updated) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API /api/user error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error?.message });
  }
}
