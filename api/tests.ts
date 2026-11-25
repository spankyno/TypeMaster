import { fetchTests, insertTest } from '../src/lib/db';

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const userId = (req.query?.userId as string) || 'guest';
      const tests = await fetchTests(userId);
      return res.status(200).json(tests);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const testRecord = await insertTest(body);
      return res.status(201).json({ success: true, test: testRecord });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API /api/tests error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error?.message });
  }
}
