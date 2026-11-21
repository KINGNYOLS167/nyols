// Shared server code for the Edge Functions in /api: database, auth, validation, responses.
import { neon } from '@neondatabase/serverless';

export interface Db { query: (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]> }

declare global { var __GW_TEST_DB__: Db | undefined }

const env = (k: string) => (typeof process !== 'undefined' ? process.env[k] : undefined) || '';
const databaseUrl = () => env('DATABASE_URL') || env('POSTGRES_URL');

export class HttpError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

let schemaReady: Promise<void> | null = null;
export async function getDb(): Promise<Db> {
  let db = globalThis.__GW_TEST_DB__;
  if (!db) {
    const url = databaseUrl();
    if (!url) throw new HttpError(503, 'database_not_configured');
    const sql = neon(url);
    db = { query: (text, params = []) => sql.query(text, params) as Promise<Record<string, unknown>[]> };
  }
  schemaReady ??= migrate(db).catch((e) => { schemaReady = null; throw e; });
  await schemaReady;
  return db;
}

async function migrate(db: Db) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY, order_date DATE NOT NULL, product TEXT NOT NULL, brand TEXT NOT NULL DEFAULT 'GOLFWEAR',
      sku TEXT, size TEXT, quantity INTEGER NOT NULL CHECK (quantity > 0), unit_price BIGINT NOT NULL CHECK (unit_price >= 0),
      discount BIGINT NOT NULL DEFAULT 0, platform_fee BIGINT NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'completed',
      marketplace_ref TEXT, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
    `CREATE UNIQUE INDEX IF NOT EXISTS sales_ref_unique ON sales (marketplace_ref, product, COALESCE(size, '')) WHERE marketplace_ref IS NOT NULL`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY, expense_date DATE NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      amount BIGINT NOT NULL CHECK (amount >= 0), created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY, product TEXT NOT NULL, brand TEXT NOT NULL DEFAULT 'GOLFWEAR', sku TEXT NOT NULL UNIQUE, sizes TEXT NOT NULL DEFAULT '',
      stock INTEGER NOT NULL DEFAULT 0, unit_cost BIGINT NOT NULL DEFAULT 0, restock_level INTEGER NOT NULL DEFAULT 0, restock_note TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS subscribers (
      id SERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE, lang TEXT NOT NULL DEFAULT 'id', source TEXT NOT NULL DEFAULT 'footer',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  ];
  for (const s of statements) await db.query(s);
}

// ---------- responses ----------
const SECURITY_HEADERS = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin' };
export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...SECURITY_HEADERS, ...headers } });
export const fail = (e: unknown) => {
  if (e instanceof HttpError) return json({ error: e.code }, e.status);
  console.error(e);
  return json({ error: 'server_error' }, 500);
};
export const clientIp = (req: Request) => (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown').split(',')[0].trim();
export async function readJson<T>(req: Request, max = 512_000): Promise<T> {
  const text = await req.text();
  if (text.length > max) throw new HttpError(413, 'too_large');
  try { return JSON.parse(text) as T; } catch { throw new HttpError(400, 'invalid_json'); }
}

// ---------- auth: password from ADMIN_PASSWORD, session in a signed HttpOnly cookie ----------
const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmacKey() {
  const password = env('ADMIN_PASSWORD');
  if (password.length < 10) throw new HttpError(503, 'admin_not_configured');
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(`gw-session:${password}:${env('SESSION_SECRET')}`));
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
const sign = async (msg: string) => b64url(await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(msg)));
/** Constant-time comparison of two strings via their HMACs. */
async function same(a: string, b: string) {
  const [x, y] = await Promise.all([sign(`cmp:${a}`), sign(`cmp:${b}`)]);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.min(x.length, y.length); i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

export const COOKIE = 'gw_admin';
const SESSION_HOURS = 12;
export async function checkPassword(given: string) { return same(given, env('ADMIN_PASSWORD')); }
export async function sessionCookie() {
  const exp = Date.now() + SESSION_HOURS * 3600_000;
  const token = `${exp}.${await sign(`session:${exp}`)}`;
  return `${COOKIE}=${token}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
export async function requireSession(req: Request) {
  await hmacKey(); // 503 when the password isn't set
  const cookie = (req.headers.get('cookie') ?? '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  const token = cookie?.slice(COOKIE.length + 1) ?? '';
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now() || !(await same(sig, await sign(`session:${exp}`)))) throw new HttpError(401, 'unauthorized');
  // Mutations must come from our own page: a custom header can't be sent cross-site without CORS.
  if (req.method !== 'GET' && req.headers.get('x-requested-with') !== 'gw-admin') throw new HttpError(403, 'forbidden');
}

// ---------- validation ----------
type Field = { type: 'date' | 'text' | 'int' | 'money' | 'enum'; required?: boolean; max?: number; values?: string[]; def?: unknown };
export type Schema = Record<string, Field>;
export function clean(input: Record<string, unknown>, schema: Schema, partial = false) {
  const out: Record<string, unknown> = {};
  for (const [key, f] of Object.entries(schema)) {
    let v = input[key];
    if (v === undefined || v === null || v === '') {
      if (partial) continue;
      if (f.required) throw new HttpError(400, `missing_${key}`);
      if (f.def !== undefined) out[key] = f.def; else out[key] = null;
      continue;
    }
    switch (f.type) {
      case 'date':
        if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) throw new HttpError(400, `invalid_${key}`);
        break;
      case 'text':
        v = String(v).trim().slice(0, f.max ?? 200);
        break;
      case 'int':
      case 'money': {
        const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.-]/g, ''));
        if (!Number.isFinite(n) || n < 0 || n > 1e13) throw new HttpError(400, `invalid_${key}`);
        v = Math.round(n);
        break;
      }
      case 'enum':
        if (!f.values!.includes(String(v))) throw new HttpError(400, `invalid_${key}`);
        v = String(v);
    }
    out[key] = v;
  }
  return out;
}
