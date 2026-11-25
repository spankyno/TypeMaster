import { neon } from '@neondatabase/serverless';

export interface DbTestRecord {
  id: string;
  userId?: string;
  mode: string;
  subMode: string | number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  charsCorrect?: number;
  charsWrong?: number;
  charsExtra?: number;
  charsMissed?: number;
  durationSeconds: number;
  wpmSeries?: number[];
  createdAt?: string;
}

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
}

// In-memory fallback for local dev when DATABASE_URL is not configured
let localMemoryDb = {
  users: {
    guest: {
      id: 'guest',
      username: 'Mecanógrafo Invitado',
      email: 'guest@typemaster.pro',
      xp: 0,
      level: 1,
      streak: 1,
      maxStreak: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      dailyGoalMinutes: 10,
      minutesToday: 0,
    } as DbUserProfile,
  } as Record<string, DbUserProfile>,
  tests: [] as DbTestRecord[],
};

export function getDatabaseClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  return neon(connectionString);
}

export async function fetchUser(userId: string = 'guest'): Promise<DbUserProfile> {
  const sql = getDatabaseClient();
  if (!sql) {
    return localMemoryDb.users[userId] || localMemoryDb.users['guest'];
  }

  try {
    const rows = await sql`
      SELECT id, username, email, xp, level, streak, max_streak AS "maxStreak",
             last_active_date::text AS "lastActiveDate",
             daily_goal_minutes AS "dailyGoalMinutes",
             minutes_today AS "minutesToday"
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;

    if (rows && rows.length > 0) {
      return rows[0] as unknown as DbUserProfile;
    }

    // Insert default guest if not found
    await sql`
      INSERT INTO users (id, username, email, xp, level, streak, max_streak, last_active_date, daily_goal_minutes, minutes_today)
      VALUES (${userId}, 'Mecanógrafo Invitado', 'guest@typemaster.pro', 0, 1, 1, 1, CURRENT_DATE, 10, 0)
      ON CONFLICT (id) DO NOTHING
    `;

    return {
      id: userId,
      username: 'Mecanógrafo Invitado',
      email: 'guest@typemaster.pro',
      xp: 0,
      level: 1,
      streak: 1,
      maxStreak: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      dailyGoalMinutes: 10,
      minutesToday: 0,
    };
  } catch (err) {
    console.error('Error fetching user from Neon DB:', err);
    return localMemoryDb.users[userId] || localMemoryDb.users['guest'];
  }
}

export async function saveUser(profile: Partial<DbUserProfile> & { id: string }): Promise<void> {
  const sql = getDatabaseClient();
  if (!sql) {
    const current = localMemoryDb.users[profile.id] || localMemoryDb.users['guest'];
    localMemoryDb.users[profile.id] = { ...current, ...profile };
    return;
  }

  try {
    await sql`
      INSERT INTO users (id, username, email, xp, level, streak, max_streak, last_active_date, daily_goal_minutes, minutes_today, updated_at)
      VALUES (
        ${profile.id},
        ${profile.username ?? 'Mecanógrafo Invitado'},
        ${profile.email ?? ''},
        ${profile.xp ?? 0},
        ${profile.level ?? 1},
        ${profile.streak ?? 1},
        ${profile.maxStreak ?? 1},
        ${profile.lastActiveDate ? profile.lastActiveDate : new Date().toISOString().split('T')[0]},
        ${profile.dailyGoalMinutes ?? 10},
        ${profile.minutesToday ?? 0},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        xp = EXCLUDED.xp,
        level = EXCLUDED.level,
        streak = EXCLUDED.streak,
        max_streak = EXCLUDED.max_streak,
        last_active_date = EXCLUDED.last_active_date,
        daily_goal_minutes = EXCLUDED.daily_goal_minutes,
        minutes_today = EXCLUDED.minutes_today,
        updated_at = CURRENT_TIMESTAMP
    `;
  } catch (err) {
    console.error('Error saving user to Neon DB:', err);
  }
}

export async function fetchTests(userId: string = 'guest'): Promise<DbTestRecord[]> {
  const sql = getDatabaseClient();
  if (!sql) {
    return localMemoryDb.tests;
  }

  try {
    const rows = await sql`
      SELECT id, user_id AS "userId", mode, sub_mode AS "subMode", wpm, raw_wpm AS "rawWpm",
             accuracy, consistency, chars_correct AS "charsCorrect", chars_wrong AS "charsWrong",
             chars_extra AS "charsExtra", chars_missed AS "charsMissed",
             duration_seconds AS "durationSeconds", wpm_series AS "wpmSeries",
             created_at AS "createdAt"
      FROM tests
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 100
    `;
    return rows as unknown as DbTestRecord[];
  } catch (err) {
    console.error('Error fetching tests from Neon DB:', err);
    return localMemoryDb.tests;
  }
}

export async function insertTest(test: DbTestRecord): Promise<DbTestRecord> {
  const sql = getDatabaseClient();
  const testId = test.id || `test_${Date.now()}`;
  const userId = test.userId || 'guest';
  const createdAt = test.createdAt || new Date().toISOString();

  const record: DbTestRecord = {
    ...test,
    id: testId,
    userId,
    createdAt,
  };

  if (!sql) {
    localMemoryDb.tests.unshift(record);
    return record;
  }

  try {
    // Ensure user exists before inserting test
    await fetchUser(userId);

    await sql`
      INSERT INTO tests (
        id, user_id, mode, sub_mode, wpm, raw_wpm, accuracy, consistency,
        chars_correct, chars_wrong, chars_extra, chars_missed,
        duration_seconds, wpm_series, created_at
      ) VALUES (
        ${testId},
        ${userId},
        ${test.mode},
        ${String(test.subMode)},
        ${test.wpm},
        ${test.rawWpm},
        ${test.accuracy},
        ${test.consistency},
        ${test.charsCorrect ?? 0},
        ${test.charsWrong ?? 0},
        ${test.charsExtra ?? 0},
        ${test.charsMissed ?? 0},
        ${test.durationSeconds},
        ${JSON.stringify(test.wpmSeries || [])}::jsonb,
        ${createdAt}
      )
    `;
  } catch (err) {
    console.error('Error saving test to Neon DB:', err);
    localMemoryDb.tests.unshift(record);
  }

  return record;
}
