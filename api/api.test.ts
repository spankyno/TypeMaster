import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeTest, sanitizeProfile, validateRegistration, sanitizeKeyStats, sanitizeAchievementIds } from './_validate.ts';
import { hashPassword, verifyPassword, needsRehash, signToken, verifyToken, extractToken } from './_authHelpers.ts';

const good = { id: 'test_abcdef123456', mode: 'time', subMode: 30, wpm: 60, rawWpm: 65, accuracy: 96, consistency: 80, durationSeconds: 30, wpmSeries: [50, 60], createdAt: new Date().toISOString() };

test('sanitizeTest acepta un test válido', () => {
  const t = sanitizeTest(good)!;
  assert.equal(t.wpm, 60);
  assert.equal(t.subMode, '30');
});
test('sanitizeTest rechaza PPM absurdos, modos raros y neto > bruto', () => {
  assert.equal(sanitizeTest({ ...good, wpm: 9999, rawWpm: 9999 })!.wpm, 400);
  assert.equal(sanitizeTest({ ...good, mode: 'hack' }), null);
  assert.equal(sanitizeTest({ ...good, wpm: 100, rawWpm: 50 }), null);
  assert.equal(sanitizeTest({ ...good, durationSeconds: 0 }), null);
  assert.equal(sanitizeTest(null), null);
});
test('sanitizeTest genera id seguro y fecha válida si vienen mal', () => {
  const t = sanitizeTest({ ...good, id: "x'; DROP TABLE tests;--", createdAt: '2999-01-01' })!;
  assert.match(t.id, /^test_[0-9a-f-]{36}$/);
  assert.ok(Date.parse(t.createdAt) <= Date.now() + 1000);
});
test('sanitizeProfile solo devuelve campos presentes y acotados', () => {
  assert.deepEqual(sanitizeProfile({ xp: 5 }), { xp: 5 });
  assert.equal(sanitizeProfile({ xp: 1e12 }).xp, 10_000_000);
  assert.equal(sanitizeProfile({ username: ' ' }).username, undefined);
  assert.equal((sanitizeProfile({ id: 'otro', email: 'x@y.z' }) as any).id, undefined);
});
test('validateRegistration', () => {
  assert.equal(validateRegistration({ username: 'Ana', email: 'a@b.co', password: '12345678' }).ok, true);
  assert.equal(validateRegistration({ username: 'Ana', email: 'a@b.co', password: '1234567' }).ok, false);
  assert.equal(validateRegistration({ username: 'A', email: 'a@b.co', password: '12345678' }).ok, false);
  assert.equal(validateRegistration({ username: 'Ana', email: 'nope', password: '12345678' }).ok, false);
});
test('hash de contraseña: verifica, rechaza y detecta hashes antiguos', async () => {
  const h = await hashPassword('secreto-123');
  assert.equal(await verifyPassword('secreto-123', h), true);
  assert.equal(await verifyPassword('otra', h), false);
  assert.equal(needsRehash(h), false);
  assert.equal(needsRehash('pbkdf2$100000$aa$bb'), true);
});
test('JWT: firma, manipulación y extracción solo por cabecera', () => {
  const tok = signToken({ sub: 'u1', email: 'a@b.co', username: 'a', tv: 2 });
  assert.equal(verifyToken(tok)!.sub, 'u1');
  const [h, b, s] = tok.split('.');
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(b, 'base64url').toString()), sub: 'admin' })).toString('base64url');
  assert.equal(verifyToken(`${h}.${forged}.${s}`), null);
  assert.equal(extractToken({ headers: { authorization: `Bearer ${tok}` } }), tok);
  assert.equal(extractToken({ headers: {}, ...({ query: { token: tok } } as any) }), null);
});

test('sanitizeTest: KPM y pulsaciones se acotan; si faltan se estiman', () => {
  const withKpm = sanitizeTest({ ...good, kpm: 330, keystrokes: 165 })!;
  assert.equal(withKpm.kpm, 330);
  assert.equal(withKpm.keystrokes, 165);
  assert.equal(sanitizeTest({ ...good, kpm: 99999 })!.kpm, 2500);
  const legacy = sanitizeTest(good)!; // cliente antiguo: rawWpm 65 → 325 KPM
  assert.equal(legacy.kpm, 325);
  assert.equal(legacy.keystrokes, 163);
});

test('sanitizeKeyStats: solo letras válidas, valores acotados, errores ≤ muestras', () => {
  const out = sanitizeKeyStats({
    a: { samples: 50, avgMs: 180.456, emaMs: 170, errors: 3, confidence: 0.8, unlocked: true },
    ñ: { samples: 10, errors: 999, confidence: 7 },
    '1': { samples: 5 },
    zz: { samples: 5 },
    e: { samples: 'x' },
  });
  assert.deepEqual(out.map((k) => k.key).sort(), ['a', 'ñ']);
  const ñ = out.find((k) => k.key === 'ñ')!;
  assert.equal(ñ.errors, 10);
  assert.equal(ñ.confidence, 1);
  assert.equal(out.find((k) => k.key === 'a')!.avgMs, 180.46);
  assert.deepEqual(sanitizeKeyStats(null), []);
});
test('sanitizeAchievementIds: formato seguro y sin duplicados', () => {
  assert.deepEqual(sanitizeAchievementIds(['wpm_50', 'wpm_50', "x'; DROP", 5, 'streak_3']), ['wpm_50', 'streak_3']);
  assert.deepEqual(sanitizeAchievementIds('nope'), []);
});
