import { requireAuth, type AuthTokenPayload } from './_authHelpers.js';
import { getTokenVersion } from './_db.js';

/** Las respuestas de la API son privadas y no deben cachearse. Sin CORS: la app es same-origin. */
export function prepareApi(req: any, res: any, methods: string[]): boolean {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Allow', [...methods, 'OPTIONS'].join(', '));
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }
  if (!methods.includes(req.method)) {
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }
  return true;
}

export function parseBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (typeof req.body === 'string') {
      try {
        return resolve(JSON.parse(req.body));
      } catch {
        return resolve({});
      }
    }
    if (typeof req.on !== 'function') return resolve({});
    let str = '';
    req.on('data', (c: any) => {
      str += c;
      if (str.length > 1_000_000) req.destroy?.(); // 1 MB máx.
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(str));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

/** JWT válido Y token_version vigente. Si el usuario no existe, la sesión no es válida. */
export async function requireValidSession(req: any): Promise<AuthTokenPayload | null> {
  const payload = requireAuth(req);
  if (!payload) return null;
  const current = await getTokenVersion(payload.sub);
  if (current === null || (payload.tv ?? 0) !== current) return null;
  return payload;
}

export function serverError(res: any, label: string, error: any) {
  console.error(`[API ${label}]`, error);
  const msg = String(error?.message || '');
  if (msg.includes('JWT_SECRET')) {
    return res.status(500).json({ error: 'Configuración del servidor incompleta (JWT_SECRET)' });
  }
  return res.status(500).json({ error: 'Error interno del servidor' });
}
