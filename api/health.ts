import { testConnection } from './_db.js';

/**
 * GET /api/health          → superficial: NO toca la base de datos (no despierta Neon ni gasta compute).
 * GET /api/health?deep=1   → comprueba la conexión con la BD.
 *
 * Ambas variantes se cachean 60 s en el CDN de Vercel: aunque haya ráfagas de visitas o bots,
 * la función (y Neon) se ejecutan como mucho una vez por minuto y región.
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const deep = String(req.query?.deep ?? '') === '1';
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
