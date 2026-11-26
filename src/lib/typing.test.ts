import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcWpm, calcAccuracy, calculateConsistency, registerActivity, normalizeProfileDay,
  previousDateStr, randomWords, shuffle, decorateWords, baseKey, computeXp, levelFromXp,
} from './typing.ts';

const base = { streak: 3, maxStreak: 5, lastActiveDate: '2026-11-25', minutesToday: 12 };

test('calcWpm: 300 caracteres en 60 s = 60 PPM', () => {
  assert.equal(calcWpm(300, 60_000), 60);
});
test('calcWpm: no se dispara con tiempos diminutos', () => {
  assert.equal(calcWpm(1, 0), 12);
});
test('calcAccuracy incluye los errores del modo estricto', () => {
  assert.equal(calcAccuracy(90, 90, 10), 90);
  assert.equal(calcAccuracy(0, 0), 100);
});
test('consistencia: serie constante = 100, serie vacía = 100', () => {
  assert.equal(calculateConsistency([50, 50, 50]), 100);
  assert.equal(calculateConsistency([]), 100);
  assert.ok(calculateConsistency([10, 90, 10, 90]) < 60);
});
test('racha: día consecutivo suma, mismo día no cambia, hueco reinicia', () => {
  assert.equal(registerActivity(base, '2026-11-26').streak, 4);
  assert.equal(registerActivity(base, '2026-11-26').minutesToday, 0);
  assert.deepEqual(registerActivity(base, '2026-11-25'), base);
  assert.equal(registerActivity(base, '2026-11-28').streak, 1);
  assert.equal(registerActivity({ ...base, streak: 5 }, '2026-11-26').maxStreak, 6);
});
test('racha cruza fin de mes y de año', () => {
  assert.equal(previousDateStr('2026-12-01'), '2026-11-30');
  assert.equal(previousDateStr('2027-01-01'), '2026-12-31');
});
test('normalizeProfileDay: racha rota se muestra a 0 y minutos se reinician', () => {
  const p = normalizeProfileDay(base, '2026-11-30');
  assert.equal(p.streak, 0);
  assert.equal(p.minutesToday, 0);
  assert.equal(normalizeProfileDay(base, '2026-11-26').streak, 3);
});
test('randomWords: longitud exacta, sin duplicados consecutivos', () => {
  const list = ['a', 'b', 'c', 'd'];
  const out = randomWords(list, 50);
  assert.equal(out.length, 50);
  for (let i = 1; i < out.length; i++) assert.notEqual(out[i], out[i - 1]);
});
test('shuffle conserva los elementos', () => {
  assert.deepEqual([...shuffle([1, 2, 3, 4, 5])].sort(), [1, 2, 3, 4, 5]);
});
test('decorateWords: mayúscula tras punto', () => {
  const out = decorateWords(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'], { punctuation: true, numbers: false });
  assert.equal(out[8], 'i.');
  assert.equal(out[9], 'J'); // la palabra tras un punto va en mayúscula
  assert.equal(out[4], 'e,');
});
test('baseKey: quita tildes pero conserva ñ', () => {
  assert.equal(baseKey('á'), 'a');
  assert.equal(baseKey('Ü'), 'U');
  assert.equal(baseKey('ñ'), 'ñ');
});
test('XP y nivel', () => {
  assert.equal(computeXp(50, 100, 250), 200);
  assert.equal(levelFromXp(499), 1);
  assert.equal(levelFromXp(500), 2);
});
