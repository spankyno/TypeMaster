import { fetchTests, insertTest } from './_db.js';
import { requireAuth } from './_authHelpers.js';
import { getTokenVersion } from './_db.js';

async function requireValidSession(req: any) {
  const payload = requireAuth(req);
  if (!payload) return null;
  const tv = await getTokenVersion(payload.sub);
  if ((payload.tv ?? 0) !== tv) return null;
  return payload;
}


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
    if (req.method === 'GET') {
      const auth = await requireValidSession(req);
      // Only authenticated users can load cloud history
      if (!auth) {
        return res.status(401).json({ error: 'Debes iniciar sesión para sincronizar el historial' });
      }
      const userId = auth.sub;
      const tests = await fetchTests(userId);
      return res.status(200).json(tests);
    }

    if (req.method === 'POST') {
      const auth = await requireValidSession(req);
      if (!auth) {
        return res.status(401).json({ error: 'Debes iniciar sesión para guardar tests en la nube' });
      }

      const body = await parseBody(req);
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Cuerpo de petición inválido' });
      }

      // Force ownership — ignore client-supplied userId
      const testRecord = await insertTest({ ...body, userId: auth.sub });
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
