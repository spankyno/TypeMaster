import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { fetchUser, saveUser, fetchTests, insertTest } from './src/lib/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TypeMaster Local Dev Server',
    database: process.env.DATABASE_URL ? 'Neon Postgres Connected' : 'In-Memory Fallback',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/user/:id', async (req, res) => {
  try {
    const user = await fetchUser(req.params.id);
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Error fetching user' });
  }
});

app.post('/api/user/:id', async (req, res) => {
  try {
    await saveUser({ ...req.body, id: req.params.id });
    const user = await fetchUser(req.params.id);
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Error saving user' });
  }
});

app.post('/api/tests', async (req, res) => {
  try {
    const record = await insertTest(req.body);
    res.status(201).json({ success: true, test: record });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Error saving test' });
  }
});

app.get('/api/tests/:userId', async (req, res) => {
  try {
    const tests = await fetchTests(req.params.userId);
    res.json(tests);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Error fetching tests' });
  }
});

app.get('/api/tests', async (req, res) => {
  try {
    const userId = (req.query.userId as string) || 'guest';
    const tests = await fetchTests(userId);
    res.json(tests);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Error fetching tests' });
  }
});

// Serve frontend in production or dev proxy
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`TypeMaster server running on http://0.0.0.0:${PORT}`);
    if (process.env.DATABASE_URL) {
      console.log('Database: Neon PostgreSQL active');
    } else {
      console.log('Database: In-Memory / Local fallback active');
    }
  });
}

startServer();
