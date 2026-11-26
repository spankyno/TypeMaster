import { testConnection } from './_db.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = await testConnection();
  // El detalle del error se queda en los logs del servidor; no se expone públicamente
  res.status(200).json({
    status: 'ok',
    service: 'TypeMaster API',
    database: { configured: Boolean(process.env.DATABASE_URL), status: db.status, connected: db.connected },
    timestamp: new Date().toISOString(),
  });
}
