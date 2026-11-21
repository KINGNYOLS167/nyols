// Owner sign-in for the private dashboard. The password lives only in the ADMIN_PASSWORD
// environment variable; a successful sign-in sets a signed, HttpOnly session cookie.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { Db } from './db';

export const COOKIE = 'gw_admin';
const SESSION_DAYS = 7;
const WINDOW_MIN = 15;
const MAX_FAILS_PER_IP = 8;
const MAX_FAILS_TOTAL = 60;

export function authConfigured() {
  return (process.env.ADMIN_PASSWORD ?? '').length >= 10;
}

function key() {
  return process.env.SESSION_SECRET || createHash('sha256').update('gw-session:' + (process.env.ADMIN_PASSWORD ?? '')).digest('hex');
}

const b64 = (s: string) => Buffer.from(s).toString('base64url');
const sign = (payload: string) => createHmac('sha256', key()).update(payload).digest('base64url');

export function passwordMatches(input: string) {
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (!authConfigured()) return false;
  const a = createHash('sha256').update(input).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export function createSession() {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const payload = b64(JSON.stringify({ exp, v: 1 }));
  return { token: `${payload}.${sign(payload)}`, maxAge: SESSION_DAYS * 86400 };
}

export function verifySession(token: string | undefined): boolean {
  if (!token || !authConfigured()) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

export function cookieHeader(token: string, maxAge: number, secure: boolean) {
  return `${COOKIE}=${token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

/** True when this IP (or everyone together) has failed too often in the last 15 minutes. */
export async function tooManyAttempts(db: Db, ip: string) {
  const [r] = await db.query<{ ip_fails: number; all_fails: number }>(
    `select count(*) filter (where ip = $1 and not ok)::int as ip_fails, count(*) filter (where not ok)::int as all_fails
       from login_attempts where at > now() - interval '${WINDOW_MIN} minutes'`,
    [ip],
  );
  return (r?.ip_fails ?? 0) >= MAX_FAILS_PER_IP || (r?.all_fails ?? 0) >= MAX_FAILS_TOTAL;
}

export async function recordAttempt(db: Db, ip: string, ok: boolean) {
  await db.query('insert into login_attempts (ip, ok) values ($1, $2)', [ip, ok]);
  await db.query(`delete from login_attempts where at < now() - interval '1 day'`);
}
