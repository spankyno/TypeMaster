import { fetchUser, saveUser } from './_db.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const userId = (req.query?.id as string) || (req.query?.userId as string) || 'guest';

    if (req.method === 'GET') {
      const user = await fetchUser(userId);
      return res.status(200).json(user);
    }

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

      await saveUser({ ...body, id: body?.id || userId });
      const updated = await fetchUser(userId);
      return res.status(200).json({ success: true, user: updated });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API /api/user error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error?.message });
  }
}
