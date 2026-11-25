import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

const JWT_SECRET = (process.env.JWT_SECRET || process.env.DATABASE_URL || 'typemaster-dev-secret-change-me').slice(0, 64);
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
  sub: string; // user id
  email: string;
  username: string;
  exp: number;
  iat: number;
}

export function signToken(payload: Omit<AuthTokenPayload, 'exp' | 'iat'>): string {
  const iat = Math.floor(Date.now() / 1000);
  const full: AuthTokenPayload = { ...payload, iat, exp: iat + TOKEN_TTL_SEC };
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(full));
  const data = `${header}.${body}`;
  const sig = createHmac('sha256', JWT_SECRET).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const data = `${header}.${body}`;
    const expected = createHmac('sha256', JWT_SECRET).update(data).digest();
    const actual = fromB64url(sig);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(fromB64url(body).toString('utf8')) as AuthTokenPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Extract Bearer token from Authorization header or body.token */
export function extractToken(req: { headers?: Record<string, string | string[] | undefined>; body?: any; query?: any }): string | null {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  if (typeof req.body?.token === 'string') return req.body.token;
  if (typeof req.query?.token === 'string') return req.query.token;
  return null;
}

export function requireAuth(req: any): AuthTokenPayload | null {
  const token = extractToken(req);
  if (!token) return null;
  return verifyToken(token);
}
