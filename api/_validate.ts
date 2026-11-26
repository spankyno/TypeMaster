/**
 * Validación y saneado de datos que llegan del cliente.
 * Módulo puro (sin I/O) para poder testearlo fácilmente.
 */
import { randomUUID } from 'crypto';

export const ALLOWED_MODES = ['time', 'words', 'quote', 'prose', 'zen', 'custom', 'adaptive'] as const;

export interface CleanTest {
  id: string;
  mode: string;
  subMode: string;
  wpm: number;
  rawWpm: number;
  kpm: number;
  keystrokes: number;
  accuracy: number;
  consistency: number;
  charsCorrect: number;
  charsWrong: number;
  charsExtra: number;
  charsMissed: number;
  durationSeconds: number;
  wpmSeries: number[];
  createdAt: string;
}

export interface CleanProfile {
  username?: string;
  xp?: number;
  level?: number;
  streak?: number;
  maxStreak?: number;
  lastActiveDate?: string;
  dailyGoalMinutes?: number;
  minutesToday?: number;
}

const MAX_WPM = 400; // el récord mundial ronda 300–350 PPM
const MAX_SERIES = 7200;

function num(v: unknown): number | null {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function intInRange(v: unknown, min: number, max: number): number | null {
  const n = num(v);
  if (n === null) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Devuelve el test saneado o null si es inválido. */
export function sanitizeTest(raw: any, now: number = Date.now()): CleanTest | null {
  if (!raw || typeof raw !== 'object') return null;

  const mode = typeof raw.mode === 'string' ? raw.mode : '';
  if (!(ALLOWED_MODES as readonly string[]).includes(mode)) return null;

  const wpm = intInRange(raw.wpm, 0, MAX_WPM);
  const rawWpm = intInRange(raw.rawWpm, 0, MAX_WPM + 100);
  const accuracy = intInRange(raw.accuracy, 0, 100);
  const consistency = intInRange(raw.consistency ?? 100, 0, 100);
  if (wpm === null || rawWpm === null || accuracy === null || consistency === null) return null;

  const duration = num(raw.durationSeconds);
  if (duration === null || duration <= 0) return null;
  const durationSeconds = Math.round(Math.min(7200, Math.max(1, duration)) * 100) / 100;

  // Plausibilidad: el PPM neto no puede superar al bruto (margen de redondeo)
  if (wpm > rawWpm + 1) return null;

  const subModeRaw = raw.subMode;
  const subMode = String(subModeRaw ?? '').slice(0, 20);
  if (!subMode) return null;

  const series = Array.isArray(raw.wpmSeries)
    ? raw.wpmSeries
        .slice(0, MAX_SERIES)
        .map((v: unknown) => intInRange(v, 0, MAX_WPM + 100) ?? 0)
    : [];

  // KPM / pulsaciones: si el cliente es antiguo y no las envía, se estiman a partir del PPM bruto
  const kpm = intInRange(raw.kpm, 0, 2500) ?? rawWpm * 5;
  const keystrokes = intInRange(raw.keystrokes, 0, 500_000) ?? Math.round((kpm * durationSeconds) / 60);

  let id = typeof raw.id === 'string' ? raw.id : '';
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) id = `test_${randomUUID()}`;

  let createdAt = new Date(now).toISOString();
  if (typeof raw.createdAt === 'string') {
    const t = Date.parse(raw.createdAt);
    const earliest = Date.parse('2020-01-01T00:00:00Z');
    if (Number.isFinite(t) && t >= earliest && t <= now + 5 * 60 * 1000) {
      createdAt = new Date(t).toISOString();
    }
  }

  return {
    id,
    mode,
    subMode,
    wpm,
    rawWpm,
    kpm,
    keystrokes,
    accuracy,
    consistency,
    charsCorrect: intInRange(raw.charsCorrect ?? 0, 0, 200000) ?? 0,
    charsWrong: intInRange(raw.charsWrong ?? 0, 0, 200000) ?? 0,
    charsExtra: intInRange(raw.charsExtra ?? 0, 0, 200000) ?? 0,
    charsMissed: intInRange(raw.charsMissed ?? 0, 0, 200000) ?? 0,
    durationSeconds,
    wpmSeries: series,
    createdAt,
  };
}

/** Solo devuelve los campos presentes y válidos; el resto queda undefined. */
export function sanitizeProfile(raw: any): CleanProfile {
  const out: CleanProfile = {};
  if (!raw || typeof raw !== 'object') return out;

  if (typeof raw.username === 'string') {
    const u = raw.username.trim().slice(0, 40);
    if (u.length >= 2) out.username = u;
  }
  const xp = intInRange(raw.xp, 0, 10_000_000);
  if (xp !== null) out.xp = xp;
  const level = intInRange(raw.level, 1, 10_000);
  if (level !== null) out.level = level;
  const streak = intInRange(raw.streak, 0, 10_000);
  if (streak !== null) out.streak = streak;
  const maxStreak = intInRange(raw.maxStreak, 0, 10_000);
  if (maxStreak !== null) out.maxStreak = maxStreak;
  const goal = intInRange(raw.dailyGoalMinutes, 1, 1440);
  if (goal !== null) out.dailyGoalMinutes = goal;
  const minutes = intInRange(raw.minutesToday, 0, 1440);
  if (minutes !== null) out.minutesToday = minutes;
  if (typeof raw.lastActiveDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.lastActiveDate)) {
    if (!Number.isNaN(Date.parse(raw.lastActiveDate))) out.lastActiveDate = raw.lastActiveDate;
  }
  return out;
}

export function validateRegistration(body: any): {
  ok: boolean;
  error?: string;
  username: string;
  email: string;
  password: string;
} {
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (username.length < 2 || username.length > 40) {
    return { ok: false, username, email, password, error: 'El nombre de usuario debe tener entre 2 y 40 caracteres' };
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, username, email, password, error: 'Introduce un correo electrónico válido' };
  }
  if (password.length < 8) {
    return { ok: false, username, email, password, error: 'La contraseña debe tener al menos 8 caracteres' };
  }
  if (password.length > 200) {
    return { ok: false, username, email, password, error: 'La contraseña es demasiado larga (máx. 200 caracteres)' };
  }
  return { ok: true, username, email, password };
}
