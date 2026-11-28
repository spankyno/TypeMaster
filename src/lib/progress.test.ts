import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeKeyStats, mergeProgress, normalizeKeyStats, progressNeedsUpload, uploadablePayload } from './progress.ts';

const rec = (key: string, samples: number, unlocked = true, confidence = 0.5) => ({
  key, samples, avgMs: 200, emaMs: 200, errors: 1, confidence, unlocked,
});

test('normalizeKeyStats: strings de Neon → números; descarta claves inválidas', () => {
  const out = normalizeKeyStats({ a: { key: 'a', samples: '40', avgMs: '180.50', emaMs: '170.00', errors: '2', confidence: '0.750', unlocked: true }, '9': { samples: 1 } });
  assert.deepEqual(Object.keys(out), ['a']);
  assert.equal(out.a.avgMs, 180.5);
  assert.equal(out.a.confidence, 0.75);
});
test('mergeKeyStats: gana el registro con más muestras; unlocked es unión', () => {
  const m = mergeKeyStats(
    { a: rec('a', 100, false, 0.9), b: rec('b', 5, true) },
    { a: rec('a', 40, true, 0.4), c: rec('c', 10, true) }
  );
  assert.equal(m.a.samples, 100);
  assert.equal(m.a.confidence, 0.9);
  assert.equal(m.a.unlocked, true); // desbloqueada en la nube → no se pierde
  assert.deepEqual(Object.keys(m).sort(), ['a', 'b', 'c']);
});
test('mergeProgress: logros = unión', () => {
  const { merged } = mergeProgress(
    { keyStats: {}, achievements: ['first_test'] },
    { keyStats: {}, achievements: ['wpm_50', 'first_test'] }
  );
  assert.deepEqual([...merged.achievements].sort(), ['first_test', 'wpm_50']);
});
test('progressNeedsUpload: el estado virgen no sube nada; lo nuevo sí', () => {
  const cloud = { keyStats: { a: rec('a', 50) }, achievements: ['first_test'] };
  assert.equal(progressNeedsUpload({ keyStats: { e: rec('e', 0) }, achievements: [] }, { keyStats: {}, achievements: [] }), false);
  assert.equal(progressNeedsUpload({ keyStats: { a: rec('a', 50) }, achievements: ['first_test'] }, cloud), false);
  assert.equal(progressNeedsUpload({ keyStats: { a: rec('a', 51) }, achievements: ['first_test'] }, cloud), true);
  assert.equal(progressNeedsUpload({ keyStats: {}, achievements: ['wpm_80'] }, cloud), true);
});
test('uploadablePayload: solo teclas con muestras', () => {
  const p = uploadablePayload({ keyStats: { e: rec('e', 0), a: rec('a', 3) }, achievements: [] });
  assert.deepEqual(Object.keys(p.keyStats), ['a']);
});
