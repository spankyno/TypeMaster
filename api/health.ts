import { createHash, timingSafeEqual } from 'crypto';
import { testConnection } from './_db.js';

/**
 * GET /api/health          → superficial: NO toca la base de datos (no despierta Neon ni gasta compute).
 * GET /api/health?deep=1   → comprueba la conexión con la BD, SOLO si la petición trae la cabecera
 *                            `x-health-key` igual a la variable de entorno HEALTH_KEY (≥ 16 caracteres).
 *                            Sin clave válida se responde la versión superficial.
 *
 * Motivo: el caché del CDN va por URL completa, así que `?deep=1&x=<aleatorio>` lo esquivaba y cada
 * llamada despertaba Neon (mantenerlo despierto gasta las CU-horas del plan gratuito).
 */
function sameSecret(provided: unknown, expected: string): boolean {
  if (typeof provided !== 'string' || provided.length === 0) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export default async function handler(req: any, res: any) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const healthKey = (process.env.HEALTH_KEY || '').trim();
  const deep =
    String(req.query?.deep ?? '') === '1' &&
    healthKey.length >= 16 &&
    sameSecret(req.headers?.['x-health-key'], healthKey);

  // La versión profunda es privada (no se cachea en el CDN); la superficial sí, 60 s
  res.setHeader(
    'Cache-Control',
    deep ? 'private, no-store' : 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
  );

  const configured = Boolean(process.env.DATABASE_URL);
  const db = deep ? await testConnection() : null;

  // El detalle del error se queda en los logs del servidor; no se expone públicamente
  res.status(200).json({
    status: 'ok',
    service: 'TypeMaster API',
    database: {
      configured,
      status: db ? db.status : configured ? 'unchecked' : 'offline',
      connected: db ? db.connected : false,
    },
    timestamp: new Date().toISOString(),
  });
}
