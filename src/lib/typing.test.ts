import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcWpm, calcAccuracy, calculateConsistency, registerActivity, normalizeProfileDay,
  previousDateStr, calcKpm, normalizeTest, formatDuration, describeTest, randomWords, shuffle, decorateWords, baseKey, computeXp, levelFromXp,
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

test('calcKpm: 300 pulsaciones en 60 s = 300 KPM; cuenta también los errores', () => {
  assert.equal(calcKpm(300, 60_000), 300);
  assert.equal(calcKpm(150, 30_000), 300);
});
test('REGRESIÓN NaN: duraciones NUMERIC llegan como string desde Neon', () => {
  const fromNeon = [{ durationSeconds: '30.00' }, { durationSeconds: '45.50' }, { durationSeconds: '60.00' }];
  // Comportamiento antiguo: 0 + "30.00" concatena cadenas → NaN al dividir
  const broken = fromNeon.reduce((a: any, t) => a + t.durationSeconds, 0);
  assert.ok(Number.isNaN(Number(broken) / 3600));
  // Con normalización se suma como número
  const total = fromNeon.map(normalizeTest).reduce((a, t) => a + t.durationSeconds, 0);
  assert.equal(total, 135.5);
});
test('normalizeTest: tests antiguos sin kpm lo estiman; basura no produce NaN', () => {
  const old = normalizeTest({ id: 'a', mode: 'time', subMode: 30, wpm: 50, rawWpm: 60, durationSeconds: '30.00', accuracy: 97 });
  assert.equal(old.kpm, 300);
  assert.equal(old.keystrokes, 150);
  const junk = normalizeTest({ wpm: 'abc', durationSeconds: null, wpmSeries: ['1', 'x'] });
  assert.ok(Object.values(junk).every((v) => typeof v !== 'number' || Number.isFinite(v)));
  assert.deepEqual(junk.wpmSeries, [1, 0]);
});
test('formatDuration', () => {
  assert.equal(formatDuration(45), '45 s');
  assert.equal(formatDuration(754), '13 min');
  assert.equal(formatDuration(5400), '1,5 h');
  assert.equal(formatDuration(NaN), '0 s');
});
test('describeTest', () => {
  assert.equal(describeTest('time', 30), 'Tiempo · 30 s');
  assert.equal(describeTest('prose', 2), 'Prosa · 2 párr.');
  assert.equal(describeTest('prose', 25), 'Prosa'); // dato antiguo (era nº de palabras)
});
