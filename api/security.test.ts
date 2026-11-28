import test from 'node:test';
import assert from 'node:assert/strict';
import authHandler from './auth.ts';
import testsHandler from './tests.ts';
import healthHandler from './health.ts';
import { sanitizeTest, MAX_SERIES } from './_validate.ts';
import { rateLimitShared, rateLimitResetShared } from './_rateLimit.ts';
import { insertTests, trimTests, fetchTests } from './_db.ts';

// Sin DATABASE_URL, todo corre contra la memoria local: mismas rutas de código que en producción.
delete process.env.DATABASE_URL;

function mockRes() {
  const res: any = {
    code: 200,
    body: undefined as any,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) {
      this.headers[k.toLowerCase()] = String(v);
    },
    status(c: number) {
      this.code = c;
      return this;
    },
    json(b: any) {
      this.body = b;
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
}

async function call(handler: any, opts: { method?: string; ip: string; body?: any; token?: string; headers?: any; query?: any }) {
  const req: any = {
    method: opts.method ?? 'POST',
    headers: {
      'x-forwarded-for': opts.ip,
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.headers ?? {}),
    },
    body: opts.body,
    query: opts.query ?? {},
  };
  const res = mockRes();
  await handler(req, res);
  return res;
}

const goodTest = (i: number) => ({
  id: `test_sec_${i}_abcdef12`,
  mode: 'time',
  subMode: 30,
  wpm: 60,
  rawWpm: 65,
  accuracy: 96,
  consistency: 80,
  durationSeconds: 30,
  wpmSeries: [50, 60],
  createdAt: new Date().toISOString(),
});

// ---------------------------------------------------------------------------
// Punto 2: series acotadas, lotes, tope por usuario, listados ligeros
// ---------------------------------------------------------------------------
test('sanitizeTest: la serie larga se reduce por muestreo a ≤ MAX_SERIES (no se trunca)', () => {
  const long = Array.from({ length: 5000 }, (_, i) => i % 300);
  const t = sanitizeTest({ ...goodTest(1), wpmSeries: long })!;
  assert.equal(t.wpmSeries.length, MAX_SERIES);
  assert.equal(t.wpmSeries[0], long[0]);
  // el último punto muestreado viene del final de la serie, no de los primeros 600
  assert.ok(t.wpmSeries[MAX_SERIES - 1] === long[Math.floor(((MAX_SERIES - 1) * 5000) / MAX_SERIES)]);
  assert.equal(sanitizeTest({ ...goodTest(2), wpmSeries: [1, 2, 3] })!.wpmSeries.length, 3);
});

test('trimTests conserva solo los N más recientes y fetchTests no devuelve la serie', async () => {
  const uid = 'usr_trim_test';
  const base = Date.now();
  const tests = Array.from({ length: 5 }, (_, i) => ({
    ...sanitizeTest({ ...goodTest(100 + i), createdAt: new Date(base - i * 1000).toISOString() })!,
  }));
  assert.equal(await insertTests(uid, tests), 5);
  assert.equal(await trimTests(uid, 3), 2);
  const left = await fetchTests(uid);
  assert.equal(left.length, 3);
  assert.deepEqual(left.map((t) => t.id).sort(), [tests[0].id, tests[1].id, tests[2].id].sort());
  assert.ok(left.every((t) => Array.isArray(t.wpmSeries) && t.wpmSeries.length === 0));
});

// ---------------------------------------------------------------------------
// Punto 1: limitador compartido
// ---------------------------------------------------------------------------
test('rateLimitShared: bloquea al superar el máximo y se reinicia', async () => {
  const k = 'unit:rl:1';
  for (let i = 0; i < 3; i++) assert.equal((await rateLimitShared(k, 3, 60_000)).ok, true);
  const blocked = await rateLimitShared(k, 3, 60_000);
  assert.equal(blocked.ok, false);
  assert.ok((blocked.retryAfterSec ?? 0) >= 1);
  await rateLimitResetShared([k]);
  assert.equal((await rateLimitShared(k, 3, 60_000)).ok, true);
});

test('login: límite por IP+cuenta (10) y el 11.º intento devuelve 429', async () => {
  const body = { action: 'login', email: 'nadie-1@example.com', password: 'incorrecta-123' };
  let last: any;
  for (let i = 0; i < 10; i++) {
    last = await call(authHandler, { ip: '10.0.0.1', body });
    assert.equal(last.code, 401);
  }
  last = await call(authHandler, { ip: '10.0.0.1', body });
  assert.equal(last.code, 429);
  assert.ok(Number(last.headers['retry-after']) >= 1);
});

test('login: límite POR CUENTA aunque el atacante cambie de IP en cada intento', async () => {
  const body = { action: 'login', email: 'victima@example.com', password: 'incorrecta-123' };
  for (let i = 0; i < 20; i++) {
    const r = await call(authHandler, { ip: `10.1.0.${i + 1}`, body });
    assert.equal(r.code, 401, `intento ${i + 1}`);
  }
  const r = await call(authHandler, { ip: '10.1.0.99', body });
  assert.equal(r.code, 429);
});

test('un login correcto reinicia los contadores (un despiste no bloquea al usuario)', async () => {
  const ip = '10.2.0.1';
  const email = 'ana-reset@example.com';
  const reg = await call(authHandler, { ip, body: { action: 'register', username: 'Ana', email, password: 'contraseña-ok-1' } });
  assert.equal(reg.code, 201);
  for (let i = 0; i < 8; i++) {
    assert.equal((await call(authHandler, { ip, body: { action: 'login', email, password: 'mala-mala-1' } })).code, 401);
  }
  assert.equal((await call(authHandler, { ip, body: { action: 'login', email, password: 'contraseña-ok-1' } })).code, 200);
  for (let i = 0; i < 8; i++) {
    assert.equal((await call(authHandler, { ip, body: { action: 'login', email, password: 'mala-mala-1' } })).code, 401);
  }
});

// ---------------------------------------------------------------------------
// Punto 9: GET de sesión no consume el cupo de login/registro
// ---------------------------------------------------------------------------
test('GET /api/auth (sesión) no gasta el cupo de intentos de login de la IP', async () => {
  const ip = '10.3.0.1';
  for (let i = 0; i < 60; i++) {
    const r = await call(authHandler, { method: 'GET', ip });
    assert.equal(r.code, 401);
  }
  const r = await call(authHandler, { ip, body: { action: 'login', email: 'nadie-2@example.com', password: 'x-incorrecta-1' } });
  assert.equal(r.code, 401); // antes del cambio: 429, porque el GET contaba dentro del límite de 30
});

// ---------------------------------------------------------------------------
// Punto 2: registro (honeypot, por IP y global) y escrituras de tests
// ---------------------------------------------------------------------------
test('registro: el campo trampa rellenado se rechaza sin crear la cuenta', async () => {
  const r = await call(authHandler, {
    ip: '10.4.0.1',
    body: { action: 'register', username: 'Bot', email: 'bot@example.com', password: 'contraseña-ok-1', website: 'http://spam.example' },
  });
  assert.equal(r.code, 400);
  const login = await call(authHandler, { ip: '10.4.0.2', body: { action: 'login', email: 'bot@example.com', password: 'contraseña-ok-1' } });
  assert.equal(login.code, 401);
});

test('registro: máx. 5 por IP y hora', async () => {
  const ip = '10.5.0.1';
  for (let i = 0; i < 5; i++) {
    const r = await call(authHandler, {
      ip,
      body: { action: 'register', username: `U${i}`, email: `u${i}-limit@example.com`, password: 'contraseña-ok-1', website: '' },
    });
    assert.equal(r.code, 201, `registro ${i + 1}`);
  }
  const r = await call(authHandler, {
    ip,
    body: { action: 'register', username: 'U6', email: 'u6-limit@example.com', password: 'contraseña-ok-1' },
  });
  assert.equal(r.code, 429);
});

test('POST /api/tests: lotes > 20 se rechazan (413) y a las 120 escrituras por ventana llega el 429', async () => {
  const reg = await call(authHandler, {
    ip: '10.6.0.1',
    body: { action: 'register', username: 'Writer', email: 'writer@example.com', password: 'contraseña-ok-1' },
  });
  const token = reg.body.token as string;

  const big = await call(testsHandler, { ip: '10.6.0.1', token, body: { tests: Array.from({ length: 21 }, (_, i) => goodTest(i)) } });
  assert.equal(big.code, 413);

  // Los dos intentos anteriores ya cuentan como escrituras (1); hasta 120 pasan, la siguiente no
  let ok = 0;
  let status = 0;
  for (let i = 0; i < 125; i++) {
    const r = await call(testsHandler, { ip: '10.6.0.1', token, body: goodTest(1000 + i) });
    status = r.code;
    if (r.code === 201) ok++;
    else break;
  }
  assert.equal(status, 429);
  assert.equal(ok, 119);
});

// ---------------------------------------------------------------------------
// Punto 4: health?deep=1 exige clave
// ---------------------------------------------------------------------------
test('health: deep sin clave → respuesta superficial cacheable; con clave → privada', async () => {
  process.env.HEALTH_KEY = 'una-clave-larga-de-prueba-123';
  const plain = await call(healthHandler, { method: 'GET', ip: '10.7.0.1', query: { deep: '1' } });
  assert.equal(plain.code, 200);
  assert.equal(plain.body.database.status === 'unchecked' || plain.body.database.status === 'offline', true);
  assert.match(plain.headers['cache-control'], /s-maxage=60/);

  const wrong = await call(healthHandler, { method: 'GET', ip: '10.7.0.1', query: { deep: '1' }, headers: { 'x-health-key': 'otra' } });
  assert.match(wrong.headers['cache-control'], /s-maxage=60/);

  const ok = await call(healthHandler, {
    method: 'GET',
    ip: '10.7.0.1',
    query: { deep: '1' },
    headers: { 'x-health-key': 'una-clave-larga-de-prueba-123' },
  });
  assert.equal(ok.headers['cache-control'], 'private, no-store');

  delete process.env.HEALTH_KEY;
  const noEnv = await call(healthHandler, { method: 'GET', ip: '10.7.0.1', query: { deep: '1' }, headers: { 'x-health-key': 'x' } });
  assert.match(noEnv.headers['cache-control'], /s-maxage=60/);
});
