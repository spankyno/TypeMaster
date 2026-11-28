import { createHmac, pbkdf2, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(pbkdf2);

const isProd =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL === '1' ||
  process.env.VERCEL_ENV === 'production';

function resolveJwtSecret(): string {
  const fromEnv = (process.env.JWT_SECRET || '').trim();
  if (fromEnv.length >= 16) return fromEnv.slice(0, 128);
  if (isProd) {
    throw new Error(
      'JWT_SECRET no está configurado. Define una variable de entorno JWT_SECRET (mín. 16 caracteres) en producción.'
    );
  }
  // Solo desarrollo: secreto aleatorio por proceso (las sesiones no sobreviven a un reinicio)
  console.warn('[TypeMaster Auth] JWT_SECRET ausente — usando secreto efímero de desarrollo');
  return randomBytes(32).toString('hex');
}

let _secret: string | null = null;
function jwtSecret(): string {
  if (!_secret) _secret = resolveJwtSecret();
  return _secret;
}

const TOKEN_TTL_SEC = 60 * 60 * 24 * 30; // 30 days

function b64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromB64url(str: string): Buffer {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64');
}

/** Iteraciones PBKDF2-HMAC-SHA256 (OWASP 2023: 600 000). */
export const PBKDF2_ITERATIONS = 600_000;

/** PBKDF2-SHA256 hash. Formato: pbkdf2$iteraciones$saltHex$hashHex (asíncrono: no bloquea el event loop). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await pbkdf2Async(password, salt, PBKDF2_ITERATIONS, 32, 'sha256');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
    const iterations = parseInt(parts[1], 10);
    if (!Number.isFinite(iterations) || iterations < 1 || iterations > 5_000_000) return false;
    const salt = Buffer.from(parts[2], 'hex');
    const expected = Buffer.from(parts[3], 'hex');
    const actual = await pbkdf2Async(password, salt, iterations, expected.length, 'sha256');
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** True si el hash se generó con menos iteraciones que las actuales (se actualiza en el siguiente login). */
export function needsRehash(stored: string): boolean {
  const iterations = parseInt(stored.split('$')[1] ?? '0', 10);
  return !Number.isFinite(iterations) || iterations < PBKDF2_ITERATIONS;
}

/**
 * Hash "señuelo" para igualar el tiempo de respuesta cuando el correo no existe
 * y así no revelar qué cuentas están registradas.
 */
export const DUMMY_HASH = `pbkdf2$${PBKDF2_ITERATIONS}$${'00'.repeat(16)}$${'00'.repeat(32)}`;

export interface AuthTokenPayload {
  sub: string;
  email: string;
  username: string;
  /** Must match users.token_version — bump to revoke all sessions */
  tv: number;
  exp: number;
  iat: number;
}

export function signToken(
  payload: Omit<AuthTokenPayload, 'exp' | 'iat'>
): string {
  const iat = Math.floor(Date.now() / 1000);
  const full: AuthTokenPayload = {
    ...payload,
    tv: payload.tv ?? 0,
    iat,
    exp: iat + TOKEN_TTL_SEC,
  };
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(full));
  const data = `${header}.${body}`;
  const sig = createHmac('sha256', jwtSecret()).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const data = `${header}.${body}`;
    const expected = createHmac('sha256', jwtSecret()).update(data).digest();
    const actual = fromB64url(sig);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(fromB64url(body).toString('utf8')) as AuthTokenPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.sub) return null;
    if (typeof payload.tv !== 'number') payload.tv = 0;
    return payload;
  } catch {
    return null;
  }
}

/** Solo se acepta por cabecera Authorization: los tokens en query/body acaban en logs. */
export function extractToken(req: {
  headers?: Record<string, string | string[] | undefined>;
}): string | null {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim() || null;
  }
  return null;
}

/** Sync JWT signature/expiry check only (no DB token_version). */
export function requireAuth(req: any): AuthTokenPayload | null {
  const token = extractToken(req);
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Rate limit en memoria: max N hits por clave y ventana.
 * OJO: en Vercel cada instancia serverless tiene su propio contador, así que es una
 * defensa best-effort. Para garantías reales usa un almacén compartido (p. ej. Upstash Redis).
 */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  if (rateBuckets.size > 5000) {
    for (const [k, b] of rateBuckets) if (now >= b.resetAt) rateBuckets.delete(k);
  }
  let bucket = rateBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { ok: true };
}

/** Borra un contador del limitador en memoria (p. ej. tras un login correcto). */
export function rateLimitReset(key: string): void {
  rateBuckets.delete(key);
}

/** Client IP best-effort for rate limiting */
export function clientIp(req: any): string {
  const xf = req.headers?.['x-forwarded-for'] || req.headers?.['X-Forwarded-For'];
  if (typeof xf === 'string' && xf.length > 0) return xf.split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || 'unknown';
}
