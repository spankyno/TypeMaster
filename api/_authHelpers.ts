import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

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
  // Dev fallback only
  const fallback = (process.env.DATABASE_URL || 'typemaster-dev-secret-change-me').slice(0, 64);
  console.warn('[TypeMaster Auth] JWT_SECRET ausente — usando secreto de desarrollo (NO usar en producción)');
  return fallback;
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

/** PBKDF2-SHA256 hash. Format: pbkdf2$iterations$saltHex$hashHex */
export function hashPassword(password: string): string {
  const iterations = 100000;
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  return `pbkdf2$${iterations}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
    const iterations = parseInt(parts[1], 10);
    const salt = Buffer.from(parts[2], 'hex');
    const expected = Buffer.from(parts[3], 'hex');
    const actual = pbkdf2Sync(password, salt, iterations, expected.length, 'sha256');
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

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

export function extractToken(req: {
  headers?: Record<string, string | string[] | undefined>;
  body?: any;
  query?: any;
}): string | null {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  if (typeof req.body?.token === 'string') return req.body.token;
  if (typeof req.query?.token === 'string') return req.query.token;
  return null;
}

/** Sync JWT signature/expiry check only (no DB token_version). */
export function requireAuth(req: any): AuthTokenPayload | null {
  const token = extractToken(req);
  if (!token) return null;
  return verifyToken(token);
}

/** Simple in-memory rate limit: max N hits per key per windowMs */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
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

/** Client IP best-effort for rate limiting */
export function clientIp(req: any): string {
  const xf = req.headers?.['x-forwarded-for'] || req.headers?.['X-Forwarded-For'];
  if (typeof xf === 'string' && xf.length > 0) return xf.split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || 'unknown';
}
