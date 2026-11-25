import { fetchTests, insertTest } from './_db.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const userId = (req.query?.userId as string) || (req.query?.id as string) || 'guest';
      const tests = await fetchTests(userId);
      return res.status(200).json(tests);
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          // keep as is
        }
      } else if (!body && typeof req.on === 'function') {
        body = await new Promise((resolve) => {
          let str = '';
          req.on('data', (c: any) => { str += c; });
          req.on('end', () => {
            try { resolve(JSON.parse(str)); } catch { resolve({}); }
          });
        });
      }

      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Cuerpo de petición inválido' });
      }

      const testRecord = await insertTest(body);
      return res.status(201).json({ success: true, test: testRecord });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API /api/tests error:', error);
    return res.status(500).json({
      error: 'Error al procesar el test en la base de datos',
      message: error?.message || String(error),
    });
  }
}
