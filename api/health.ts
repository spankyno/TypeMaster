import { testConnection } from './_db.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const dbCheck = await testConnection();

  res.status(200).json({
    status: 'ok',
    service: 'TypeMaster API',
    database: {
      configured: Boolean(process.env.DATABASE_URL),
      status: dbCheck.status,
      connected: dbCheck.connected,
      error: dbCheck.error || null,
    },
    timestamp: new Date().toISOString(),
  });
}
