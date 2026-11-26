/** Lógica pura de mecanografía (sin React ni DOM) para poder testearla. */
import type { UserProfile } from '../types';

/** PPM = (caracteres / 5) por minuto. Se usa un mínimo de 1 s para no disparar la cifra en las primeras pulsaciones. */
export function calcWpm(chars: number, elapsedMs: number): number {
  const minutes = Math.max(elapsedMs, 1000) / 60000;
  return Math.max(0, Math.round(chars / 5 / minutes));
}

/** Consistencia = 100 − coeficiente de variación (%) de la serie de PPM, acotada a 0–100. */
export function calculateConsistency(series: number[]): number {
  if (!series || series.length < 2) return 100;
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  if (mean <= 0) return 100;
  const variance = series.reduce((acc, v) => acc + (v - mean) ** 2, 0) / series.length;
  return Math.max(0, Math.min(100, Math.round(100 - (Math.sqrt(variance) / mean) * 100)));
}

/** Precisión: correctos / (escritos + errores en modo estricto que no avanzaron). */
export function calcAccuracy(correct: number, typed: number, strictMisses = 0): number {
  const total = typed + strictMisses;
  return total > 0 ? Math.round((correct / total) * 100) : 100;
}

export function computeXp(wpm: number, accuracy: number, charsCorrect: number): number {
  return Math.round(wpm * 2 + accuracy * 0.5 + charsCorrect / 5);
}

export function levelFromXp(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

/** Fecha local YYYY-MM-DD (no UTC: la racha debe cambiar a medianoche del usuario). */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function previousDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return localDateStr(new Date(y, m - 1, d - 1));
}

type DayFields = Pick<UserProfile, 'streak' | 'maxStreak' | 'lastActiveDate' | 'minutesToday'>;

/**
 * Al abrir la app: si es otro día se reinician los minutos de hoy y, si se
 * rompió la racha (más de un día sin practicar), se muestra 0. No toca lastActiveDate.
 */
export function normalizeProfileDay<T extends DayFields>(profile: T, today: string): T {
  if (profile.lastActiveDate === today) return profile;
  const brokeStreak = profile.lastActiveDate !== previousDateStr(today);
  return { ...profile, minutesToday: 0, streak: brokeStreak ? 0 : profile.streak };
}

/** Al completar un test: actualiza racha, racha máxima y fecha de actividad. */
export function registerActivity<T extends DayFields>(profile: T, today: string): T {
  if (profile.lastActiveDate === today) return profile;
  const continues = profile.lastActiveDate === previousDateStr(today);
  const streak = continues ? profile.streak + 1 : 1;
  return {
    ...profile,
    streak,
    maxStreak: Math.max(profile.maxStreak, streak),
    lastActiveDate: today,
    minutesToday: 0,
  };
}

/** Fisher–Yates (el `sort(() => 0.5 - Math.random())` original produce un barajado sesgado). */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** `count` palabras sin repetir hasta agotar la lista y sin duplicados consecutivos (la lista se recicla si hace falta). */
export function randomWords(list: readonly string[], count: number, rng: () => number = Math.random): string[] {
  const out: string[] = [];
  while (out.length < count) {
    const batch = shuffle(list, rng);
    if (out.length > 0 && batch.length > 1 && batch[0] === out[out.length - 1]) {
      [batch[0], batch[1]] = [batch[1], batch[0]];
    }
    out.push(...batch);
  }
  return out.slice(0, count);
}

const cap = (w: string) => (w ? w[0].toUpperCase() + w.slice(1) : w);

export function decorateWords(
  words: string[],
  opts: { punctuation: boolean; numbers: boolean },
  rng: () => number = Math.random
): string[] {
  let out = [...words];
  if (opts.numbers) {
    out = out.map((w, i) => (i % 6 === 0 ? String(Math.floor(rng() * 90) + 10) : w));
  }
  if (opts.punctuation) {
    out = out.map((w, i) => {
      if (/^\d+$/.test(w)) return w;
      if (i > 0 && i % 8 === 0) return w + '.';
      if (i > 0 && i % 4 === 0) return w + ',';
      return w;
    });
    // Mayúscula tras punto: practica Shift de forma realista
    out = out.map((w, i) => (i > 0 && out[i - 1].endsWith('.') ? cap(w) : w));
  }
  return out;
}

/** Quita tildes salvo la ñ (para localizar la tecla física de una letra acentuada). */
export function baseKey(ch: string): string {
  return ch.replace(/ñ/g, '\u0001').replace(/Ñ/g, '\u0002').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0001/g, 'ñ').replace(/\u0002/g, 'Ñ');
}

/** Divide el texto en palabras con su posición de inicio. */
export function splitWords(text: string): { word: string; start: number }[] {
  const res: { word: string; start: number }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) res.push({ word: m[0], start: m.index });
  return res;
}
