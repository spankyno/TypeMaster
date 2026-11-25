import { fetchUser, saveUser } from '../src/lib/db';

export default async function handler(req: any, res: any) {
  // Set CORS headers
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
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      await saveUser({ ...body, id: body.id || userId });
      const updated = await fetchUser(userId);
      return res.status(200).json({ success: true, user: updated });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API /api/user error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error?.message });
  }
}
