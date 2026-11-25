-- ========================================================
-- TYPEMASTER PRO - SCHEMA POSTGRESQL (NEON DATABASE)
-- Ejecutar este script en el SQL Editor de Neon (https://console.neon.tech)
-- ========================================================

-- 1. Tabla de Usuarios / Perfiles
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) NOT NULL DEFAULT 'Mecanógrafo Invitado',
  email VARCHAR(255) DEFAULT '',
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak INTEGER NOT NULL DEFAULT 1,
  max_streak INTEGER NOT NULL DEFAULT 1,
  last_active_date DATE NOT NULL DEFAULT CURRENT_DATE,
  daily_goal_minutes INTEGER NOT NULL DEFAULT 10,
  minutes_today INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Resultados de Tests
CREATE TABLE IF NOT EXISTS tests (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL DEFAULT 'guest' REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(50) NOT NULL,
  sub_mode VARCHAR(50) NOT NULL,
  wpm INTEGER NOT NULL,
  raw_wpm INTEGER NOT NULL,
  accuracy INTEGER NOT NULL,
  consistency INTEGER NOT NULL,
  chars_correct INTEGER NOT NULL DEFAULT 0,
  chars_wrong INTEGER NOT NULL DEFAULT 0,
  chars_extra INTEGER NOT NULL DEFAULT 0,
  chars_missed INTEGER NOT NULL DEFAULT 0,
  duration_seconds NUMERIC(6, 2) NOT NULL,
  wpm_series JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Estadísticas de Teclas (Entrenamiento Adaptativo)
CREATE TABLE IF NOT EXISTS key_stats (
  user_id VARCHAR(255) NOT NULL DEFAULT 'guest' REFERENCES users(id) ON DELETE CASCADE,
  key_char VARCHAR(10) NOT NULL,
  samples INTEGER NOT NULL DEFAULT 0,
  avg_ms NUMERIC(8, 2) NOT NULL DEFAULT 0,
  ema_ms NUMERIC(8, 2) NOT NULL DEFAULT 300,
  errors INTEGER NOT NULL DEFAULT 0,
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.0,
  unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, key_char)
);

-- 4. Tabla de Logros Desbloqueados
CREATE TABLE IF NOT EXISTS achievements (
  user_id VARCHAR(255) NOT NULL DEFAULT 'guest' REFERENCES users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(100) NOT NULL,
  unlocked BOOLEAN NOT NULL DEFAULT TRUE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_id)
);

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_tests_user_id ON tests(user_id);
CREATE INDEX IF NOT EXISTS idx_tests_created_at ON tests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_key_stats_user ON key_stats(user_id);

-- Usuario Inicial por defecto (Invitado)
INSERT INTO users (id, username, email, xp, level, streak, max_streak, last_active_date, daily_goal_minutes, minutes_today)
VALUES ('guest', 'Mecanógrafo Invitado', 'guest@typemaster.pro', 0, 1, 1, 1, CURRENT_DATE, 10, 0)
ON CONFLICT (id) DO NOTHING;
