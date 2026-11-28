import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'crypto';
import type { CleanKeyStat, CleanProfile, CleanTest } from './_validate.js';

export type DbTestRecord = CleanTest & { userId?: string };

export interface DbUserProfile {
  id: string;
  username: string;
  email: string;
  xp: number;
  level: number;
  streak: number;
  maxStreak: number;
  lastActiveDate: string;
  dailyGoalMinutes: number;
  minutesToday: number;
  /** Solo en consultas internas — nunca se envía al cliente */
  passwordHash?: string;
  /** Se incrementa para invalidar todos los JWT del usuario */
  tokenVersion?: number;
}

const today = () => new Date().toISOString().split('T')[0];

// Fallback en memoria para desarrollo local cuando DATABASE_URL no está configurada
const localMemoryDb = {
  users: {} as Record<string, DbUserProfile>,
  tests: [] as DbTestRecord[],
  progress: {} as Record<string, DbProgress>,
};

export interface DbProgress {
  keyStats: Record<string, CleanKeyStat>;
  achievements: string[];
}

function stripPassword(user: DbUserProfile): DbUserProfile {
  const { passwordHash: _p, tokenVersion: _t, ...rest } = user;
  return rest;
}

export function getDatabaseClient() {
  const connectionString = (process.env.DATABASE_URL || '').trim();
  if (!connectionString) return null;
  return neon(connectionString);
}

export async function testConnection(): Promise<{ connected: boolean; status: string; error?: string }> {
  const sql = getDatabaseClient();
  if (!sql) {
    return { connected: false, status: 'offline', error: 'DATABASE_URL no configurada' };
  }
  try {
    const result = await sql`SELECT 1 as ok`;
    if (result && result.length > 0) return { connected: true, status: 'connected' };
    return { connected: false, status: 'error', error: 'Sin respuesta de la base de datos' };
  } catch (err: any) {
    console.error('Error al probar conexión con Neon:', err);
    return { connected: false, status: 'error', error: err?.message || 'Fallo de conexión con Neon' };
  }
}


/** Devuelve el usuario o null si no existe (no se crean usuarios implícitamente). */
export async function fetchUser(userId: string): Promise<DbUserProfile | null> {
  const sql = getDatabaseClient();
  if (!sql) return localMemoryDb.users[userId] ?? null;

  const rows = await sql`
    SELECT id, username, email, xp, level, streak, max_streak AS "maxStreak",
           last_active_date::text AS "lastActiveDate",
           daily_goal_minutes AS "dailyGoalMinutes",
           minutes_today AS "minutesToday"
    FROM users WHERE id = ${userId} LIMIT 1
  `;
  return rows.length > 0 ? (rows[0] as unknown as DbUserProfile) : null;
}

/**
 * Actualiza SOLO los campos presentes (los omitidos se conservan).
 * xp, level y max_streak nunca retroceden (varios dispositivos pueden sincronizar a la vez).
 */
export async function saveUser(userId: string, p: CleanProfile): Promise<void> {
  const sql = getDatabaseClient();
  if (!sql) {
    const cur = localMemoryDb.users[userId];
    if (!cur) return;
    localMemoryDb.users[userId] = {
      ...cur,
      ...p,
      xp: Math.max(cur.xp, p.xp ?? cur.xp),
      level: Math.max(cur.level, p.level ?? cur.level),
      maxStreak: Math.max(cur.maxStreak, p.maxStreak ?? cur.maxStreak),
    };
    return;
  }

  await sql`
    UPDATE users SET
      username           = COALESCE(${p.username ?? null}::varchar, username),
      xp                 = GREATEST(xp, COALESCE(${p.xp ?? null}::int, xp)),
      level              = GREATEST(level, COALESCE(${p.level ?? null}::int, level)),
      streak             = COALESCE(${p.streak ?? null}::int, streak),
      max_streak         = GREATEST(max_streak, COALESCE(${p.maxStreak ?? null}::int, max_streak)),
      last_active_date   = COALESCE(${p.lastActiveDate ?? null}::date, last_active_date),
      daily_goal_minutes = COALESCE(${p.dailyGoalMinutes ?? null}::int, daily_goal_minutes),
      minutes_today      = COALESCE(${p.minutesToday ?? null}::int, minutes_today),
      updated_at         = CURRENT_TIMESTAMP
    WHERE id = ${userId}
  `;
}

export async function fetchTests(userId: string, limit = 200): Promise<DbTestRecord[]> {
  const sql = getDatabaseClient();
  if (!sql) {
    return localMemoryDb.tests.filter((t) => t.userId === userId).slice(0, limit);
  }
  const rows = await sql`
    SELECT id, user_id AS "userId", mode, sub_mode AS "subMode", wpm, raw_wpm AS "rawWpm", kpm, keystrokes,
           accuracy, consistency, chars_correct AS "charsCorrect", chars_wrong AS "charsWrong",
           chars_extra AS "charsExtra", chars_missed AS "charsMissed",
           duration_seconds::float8 AS "durationSeconds", wpm_series AS "wpmSeries",
           created_at AS "createdAt"
    FROM tests
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows as unknown as DbTestRecord[];
}

/** Inserción idempotente: reenviar el mismo test (reintentos / subida masiva) no duplica ni falla. */
export async function insertTests(userId: string, tests: CleanTest[]): Promise<number> {
  if (tests.length === 0) return 0;
  const sql = getDatabaseClient();

  if (!sql) {
    let added = 0;
    for (const t of tests) {
      if (localMemoryDb.tests.some((x) => x.id === t.id)) continue;
      localMemoryDb.tests.unshift({ ...t, userId });
      added++;
    }
    return added;
  }

  const results = await Promise.all(
    tests.map(
      (t) => sql`
        INSERT INTO tests (
          id, user_id, mode, sub_mode, wpm, raw_wpm, kpm, keystrokes, accuracy, consistency,
          chars_correct, chars_wrong, chars_extra, chars_missed,
          duration_seconds, wpm_series, created_at
        ) VALUES (
          ${t.id}, ${userId}, ${t.mode}, ${t.subMode}, ${t.wpm}, ${t.rawWpm}, ${t.kpm}, ${t.keystrokes},
          ${t.accuracy}, ${t.consistency}, ${t.charsCorrect}, ${t.charsWrong},
          ${t.charsExtra}, ${t.charsMissed}, ${t.durationSeconds},
          ${JSON.stringify(t.wpmSeries)}::jsonb, ${t.createdAt}
        )
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `
    )
  );
  return results.reduce((acc, r) => acc + (r.length > 0 ? 1 : 0), 0);
}

/** Perfil público (sin hash de contraseña) */
export function toPublicUser(user: DbUserProfile): DbUserProfile {
  return stripPassword(user);
}

/** Registra un usuario. Lanza Error('Ya existe una cuenta con este correo') si el email está en uso. */
export async function registerUser(
  username: string,
  email: string,
  passwordHash: string
): Promise<DbUserProfile> {
  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanUsername || !cleanEmail || !passwordHash) {
    throw new Error('username, email y password son obligatorios');
  }

  const userId = `usr_${randomUUID()}`;
  const profile: DbUserProfile = {
    id: userId,
    username: cleanUsername,
    email: cleanEmail,
    xp: 0,
    level: 1,
    streak: 1,
    maxStreak: 1,
    lastActiveDate: today(),
    dailyGoalMinutes: 10,
    minutesToday: 0,
  };

  const sql = getDatabaseClient();
  if (!sql) {
    const exists = Object.values(localMemoryDb.users).some((u) => u.email?.toLowerCase() === cleanEmail);
    if (exists) throw new Error('Ya existe una cuenta con este correo');
    localMemoryDb.users[userId] = { ...profile, passwordHash, tokenVersion: 0 };
    return profile;
  }

  try {
    await sql`
      INSERT INTO users (
        id, username, email, password_hash, token_version, xp, level, streak, max_streak,
        last_active_date, daily_goal_minutes, minutes_today
      ) VALUES (
        ${userId}, ${cleanUsername}, ${cleanEmail}, ${passwordHash}, 0,
        0, 1, 1, 1, CURRENT_DATE, 10, 0
      )
    `;
  } catch (err: any) {
    // 23505 = unique_violation (índice único sobre LOWER(email)): protege de carreras
    if (err?.code === '23505') throw new Error('Ya existe una cuenta con este correo');
    throw err;
  }
  return profile;
}

/** Usuario con password_hash y token_version (solo para el login). */
export async function fetchUserByEmail(email: string): Promise<DbUserProfile | null> {
  const cleanEmail = email.trim().toLowerCase();
  const sql = getDatabaseClient();
  if (!sql) {
    return Object.values(localMemoryDb.users).find((u) => u.email?.toLowerCase() === cleanEmail) ?? null;
  }
  const rows = await sql`
    SELECT id, username, email, password_hash AS "passwordHash",
           COALESCE(token_version, 0) AS "tokenVersion",
           xp, level, streak, max_streak AS "maxStreak",
           last_active_date::text AS "lastActiveDate",
           daily_goal_minutes AS "dailyGoalMinutes",
           minutes_today AS "minutesToday"
    FROM users
    WHERE LOWER(email) = ${cleanEmail}
    LIMIT 1
  `;
  return rows.length > 0 ? (rows[0] as unknown as DbUserProfile) : null;
}

export async function updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
  const sql = getDatabaseClient();
  if (!sql) {
    if (localMemoryDb.users[userId]) localMemoryDb.users[userId].passwordHash = passwordHash;
    return;
  }
  await sql`UPDATE users SET password_hash = ${passwordHash}, updated_at = CURRENT_TIMESTAMP WHERE id = ${userId}`;
}

/**
 * token_version actual del usuario, o null si el usuario NO existe
 * (un JWT de una cuenta borrada no debe validarse). Lanza si la BD falla.
 */
export async function getTokenVersion(userId: string): Promise<number | null> {
  const sql = getDatabaseClient();
  if (!sql) {
    const u = localMemoryDb.users[userId];
    return u ? u.tokenVersion ?? 0 : null;
  }
  const rows = await sql`SELECT COALESCE(token_version, 0) AS tv FROM users WHERE id = ${userId} LIMIT 1`;
  return rows.length > 0 ? Number(rows[0].tv) || 0 : null;
}

/** Invalida todas las sesiones del usuario. Devuelve la nueva versión. */
export async function incrementTokenVersion(userId: string): Promise<number> {
  const sql = getDatabaseClient();
  if (!sql) {
    const u = localMemoryDb.users[userId];
    if (!u) return 0;
    u.tokenVersion = (u.tokenVersion || 0) + 1;
    return u.tokenVersion;
  }
  const rows = await sql`
    UPDATE users
    SET token_version = COALESCE(token_version, 0) + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
    RETURNING token_version AS tv
  `;
  return rows.length > 0 ? Number(rows[0].tv) || 0 : 0;
}

// ---------------------------------------------------------------------------
// Progreso adaptativo (key_stats) y logros (achievements)
// ---------------------------------------------------------------------------

export async function fetchProgress(userId: string): Promise<DbProgress> {
  const sql = getDatabaseClient();
  if (!sql) {
    return localMemoryDb.progress[userId] ?? { keyStats: {}, achievements: [] };
  }

  const [keyRows, achRows] = await Promise.all([
    sql`
      SELECT key_char AS key, samples, avg_ms::float8 AS "avgMs", ema_ms::float8 AS "emaMs",
             errors, confidence::float8 AS confidence, unlocked
      FROM key_stats WHERE user_id = ${userId}
    `,
    sql`SELECT achievement_id AS id FROM achievements WHERE user_id = ${userId} AND unlocked = TRUE`,
  ]);

  const keyStats: Record<string, CleanKeyStat> = {};
  for (const r of keyRows as any[]) keyStats[r.key] = r as CleanKeyStat;
  return { keyStats, achievements: (achRows as any[]).map((r) => String(r.id)) };
}

/**
 * Fusiona (nunca retrocede): por tecla gana el registro con más muestras, `unlocked` es una unión,
 * y los logros solo se añaden. Es idempotente, así que reenviar el mismo estado es seguro.
 */
export async function saveProgress(
  userId: string,
  keyStats: CleanKeyStat[],
  achievementIds: string[]
): Promise<void> {
  const sql = getDatabaseClient();
  if (!sql) {
    const cur = localMemoryDb.progress[userId] ?? { keyStats: {}, achievements: [] };
    for (const k of keyStats) {
      const old = cur.keyStats[k.key];
      const richer = !old || k.samples > old.samples ? k : old;
      cur.keyStats[k.key] = { ...richer, samples: Math.max(k.samples, old?.samples ?? 0), unlocked: k.unlocked || !!old?.unlocked };
    }
    cur.achievements = [...new Set([...cur.achievements, ...achievementIds])];
    localMemoryDb.progress[userId] = cur;
    return;
  }

  await Promise.all([
    ...keyStats.map(
      (k) => sql`
        INSERT INTO key_stats (user_id, key_char, samples, avg_ms, ema_ms, errors, confidence, unlocked)
        VALUES (${userId}, ${k.key}, ${k.samples}, ${k.avgMs}, ${k.emaMs}, ${k.errors}, ${k.confidence}, ${k.unlocked})
        ON CONFLICT (user_id, key_char) DO UPDATE SET
          avg_ms     = CASE WHEN EXCLUDED.samples > key_stats.samples THEN EXCLUDED.avg_ms     ELSE key_stats.avg_ms     END,
          ema_ms     = CASE WHEN EXCLUDED.samples > key_stats.samples THEN EXCLUDED.ema_ms     ELSE key_stats.ema_ms     END,
          errors     = CASE WHEN EXCLUDED.samples > key_stats.samples THEN EXCLUDED.errors     ELSE key_stats.errors     END,
          confidence = CASE WHEN EXCLUDED.samples > key_stats.samples THEN EXCLUDED.confidence ELSE key_stats.confidence END,
          samples    = GREATEST(key_stats.samples, EXCLUDED.samples),
          unlocked   = key_stats.unlocked OR EXCLUDED.unlocked,
          updated_at = CURRENT_TIMESTAMP
      `
    ),
    ...achievementIds.map(
      (id) => sql`
        INSERT INTO achievements (user_id, achievement_id, unlocked)
        VALUES (${userId}, ${id}, TRUE)
        ON CONFLICT (user_id, achievement_id) DO NOTHING
      `
    ),
  ]);
}

/** Reinicio explícito del entrenamiento adaptativo (los logros se conservan). */
export async function resetKeyStats(userId: string): Promise<void> {
  const sql = getDatabaseClient();
  if (!sql) {
    if (localMemoryDb.progress[userId]) localMemoryDb.progress[userId].keyStats = {};
    return;
  }
  await sql`DELETE FROM key_stats WHERE user_id = ${userId}`;
}
