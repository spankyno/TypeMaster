/**
 * Servidor de desarrollo local: monta los MISMOS handlers de /api que usa Vercel,
 * de modo que auth, validación y rate-limit se comportan igual que en producción.
 */
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authHandler from './api/auth.js';
import testsHandler from './api/tests.js';
import userHandler from './api/user.js';
import healthHandler from './api/health.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));

const wrap =
  (h: (req: any, res: any) => Promise<unknown>) =>
  (req: express.Request, res: express.Response) => {
    h(req, res).catch((err) => {
      console.error(err);
      if (!res.headersSent) res.status(500).json({ error: 'Error interno del servidor' });
    });
  };

app.all('/api/auth', wrap(authHandler));
app.all('/api/tests', wrap(testsHandler));
app.all('/api/user', wrap(userHandler));
app.all('/api/health', wrap(healthHandler));
app.all('/api/*', (_req, res) => res.status(404).json({ error: 'Not found' }));

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TypeMaster server en http://localhost:${PORT}`);
    console.log(
      process.env.DATABASE_URL
        ? 'Base de datos: Neon PostgreSQL'
        : 'Base de datos: memoria local (define DATABASE_URL para usar Neon)'
    );
  });
}

startServer();
