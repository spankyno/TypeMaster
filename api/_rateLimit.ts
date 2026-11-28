import { createHash } from 'crypto';
import { getDatabaseClient } from './_db.js';
import { rateLimit, rateLimitReset } from './_authHelpers.js';

export interface LimitResult {
  ok: boolean;
  retryAfterSec?: number;
}

/** Hash corto para meter datos de usuario (emails) en una clave sin guardarlos en claro. */
export function keyPart(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

let warned = false;
function warnOnce(err: unknown) {
  if (warned) return;
  warned = true;
  console.warn(
    '[rate-limit] No se pudo usar la tabla rate_limits (¿ejecutaste schema.sql?). Se usa el limitador en memoria.',
    err
  );
}

/**
 * Rate limit COMPARTIDO entre instancias: el contador vive en Neon (tabla rate_limits) y se
 * incrementa de forma atómica. Sin DATABASE_URL, o si la tabla falla/no existe, cae al
 * limitador en memoria (mejor eso que dejar la ruta sin límite).
 */
export async function rateLimitShared(key: string, max: number, windowMs: number): Promise<LimitResult> {
  const sql = getDatabaseClient();
  const safeKey = key.slice(0, 200);
  if (!sql) return rateLimit(safeKey, max, windowMs);

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  try {
    const rows = await sql`
      INSERT INTO rate_limits AS r (key, count, reset_at)
      VALUES (${safeKey}, 1, NOW() + make_interval(secs => ${windowSec}::double precision))
      ON CONFLICT (key) DO UPDATE SET
        count    = CASE WHEN r.reset_at <= NOW() THEN 1 ELSE r.count + 1 END,
        reset_at = CASE WHEN r.reset_at <= NOW()
                        THEN NOW() + make_interval(secs => ${windowSec}::double precision)
                        ELSE r.reset_at END
      RETURNING count, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (reset_at - NOW()))))::int AS retry
    `;
    // Limpieza ocasional de filas caducadas (la tabla se mantiene pequeña)
    if (Math.random() < 0.01) {
      await sql`DELETE FROM rate_limits WHERE reset_at < NOW() - INTERVAL '1 hour'`;
    }
    const count = Number(rows[0]?.count ?? 1);
    if (count > max) return { ok: false, retryAfterSec: Math.max(1, Number(rows[0]?.retry ?? 60)) };
    return { ok: true };
  } catch (err) {
    warnOnce(err);
    return rateLimit(safeKey, max, windowMs);
  }
}

/** Reinicia contadores (p. ej. tras un login correcto). */
export async function rateLimitResetShared(keys: string[]): Promise<void> {
  for (const k of keys) rateLimitReset(k.slice(0, 200));
  const sql = getDatabaseClient();
  if (!sql || keys.length === 0) return;
  try {
    await sql`DELETE FROM rate_limits WHERE key = ANY(${keys.map((k) => k.slice(0, 200))}::text[])`;
  } catch (err) {
    warnOnce(err);
  }
}
