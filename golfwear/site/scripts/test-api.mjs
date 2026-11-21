// Tests the API handlers against an in-memory Postgres (PGlite).  node scripts/test-api.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { PGlite } from '@electric-sql/pglite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-api-'));
for (const name of ['subscribe', 'admin']) {
  await build({ entryPoints: [path.join(ROOT, `server/${name}.ts`)], outfile: path.join(tmp, `${name}.mjs`), bundle: true, format: 'esm', platform: 'node', logLevel: 'error' });
}
const load = async (n) => (await import(pathToFileURL(path.join(tmp, `${n}.mjs`)).href)).default;
const subscribe = await load('subscribe');
const admin = await load('admin');

const pg = new PGlite();
const base = 'https://golfwear.test';
const call = async (fn, method, url, { body, cookie, csrf = true, ip = '1.1.1.1' } = {}) => {
  const headers = { 'content-type': 'application/json', 'x-forwarded-for': ip };
  if (cookie) headers.cookie = cookie;
  if (csrf) headers['x-requested-with'] = 'gw-admin';
  const res = await fn(new Request(base + url, { method, headers, body: body ? JSON.stringify(body) : undefined }));
  return { status: res.status, body: await res.json(), setCookie: res.headers.get('set-cookie') };
};
let passed = 0;
const ok = (name, cond) => { assert.ok(cond, name); passed++; console.log('  ✓', name); };

// 1. Nothing configured -> 503, never a fake success
let r = await call(subscribe, 'POST', '/api/subscribe', { body: { email: 'a@b.co' } });
ok('subscribe without a database answers 503', r.status === 503 && r.body.error === 'database_not_configured');
globalThis.__GW_TEST_DB__ = { query: async (text, params) => (await pg.query(text, params)).rows };
r = await call(admin, 'GET', '/api/admin/data');
ok('admin without ADMIN_PASSWORD answers 503', r.status === 503 && r.body.error === 'admin_not_configured');
process.env.ADMIN_PASSWORD = 'correct horse battery';

// 2. Newsletter
r = await call(subscribe, 'POST', '/api/subscribe', { body: { email: 'not-an-email' } });
ok('invalid email is rejected (400)', r.status === 400);
r = await call(subscribe, 'POST', '/api/subscribe', { body: { email: 'Golfer@Example.com', lang: 'en' } });
ok('valid email is stored', r.status === 200);
r = await call(subscribe, 'POST', '/api/subscribe', { body: { email: 'golfer@example.com' } });
ok('duplicate email is accepted quietly', r.status === 200);
r = await call(subscribe, 'POST', '/api/subscribe', { body: { email: 'bot@spam.com', website: 'http://x' } });
const subs = await pg.query('SELECT email FROM subscribers');
ok('honeypot sign-up is not stored, duplicates collapse', subs.rows.length === 1 && subs.rows[0].email === 'golfer@example.com');

// 3. Auth
r = await call(admin, 'GET', '/api/admin/data');
ok('data without a session is 401', r.status === 401);
r = await call(admin, 'POST', '/api/admin/login', { body: { password: 'wrong' }, ip: '9.9.9.9' });
ok('wrong password is 401', r.status === 401 && r.body.error === 'wrong_password');
for (let i = 0; i < 8; i++) await call(admin, 'POST', '/api/admin/login', { body: { password: 'nope' }, ip: '8.8.8.8' });
r = await call(admin, 'POST', '/api/admin/login', { body: { password: 'correct horse battery' }, ip: '8.8.8.8' });
ok('8 failed logins lock that address for 15 minutes (429)', r.status === 429);
r = await call(admin, 'POST', '/api/admin/login', { body: { password: 'correct horse battery' } });
ok('right password sets an HttpOnly, Secure, SameSite=Strict cookie', r.status === 200 && /HttpOnly/.test(r.setCookie) && /Secure/.test(r.setCookie) && /SameSite=Strict/.test(r.setCookie) && /Path=\/api\/admin/.test(r.setCookie));
const cookie = r.setCookie.split(';')[0];
r = await call(admin, 'GET', '/api/admin/session', { cookie });
ok('session check passes with the cookie', r.status === 200);
r = await call(admin, 'GET', '/api/admin/session', { cookie: cookie.slice(0, -3) + 'abc' });
ok('a tampered cookie is rejected', r.status === 401);
r = await call(admin, 'POST', '/api/admin/sales', { cookie, csrf: false, body: { rows: [{ order_date: '2026-11-01', product: 'X', quantity: 1, unit_price: 1 }] } });
ok('writes without the same-site header are refused (403)', r.status === 403);

// 4. Records
r = await call(admin, 'POST', '/api/admin/sales', { cookie, body: { rows: [
  { order_date: '2026-11-01', product: 'UV Arm Sleeve Classic', quantity: 2, unit_price: 79000, discount: 5000, platform_fee: 15000, marketplace_ref: 'INV/1', size: 'L' },
  { order_date: '2026-11-02', product: 'Fairway Polo', quantity: 1, unit_price: 350000, status: 'completed', marketplace_ref: 'INV/2' },
] } });
ok('two sales inserted', r.status === 201 && r.body.inserted === 2);
r = await call(admin, 'POST', '/api/admin/sales', { cookie, body: { rows: [{ order_date: '2026-11-01', product: 'UV Arm Sleeve Classic', quantity: 2, unit_price: 79000, marketplace_ref: 'INV/1', size: 'L' }] } });
ok('re-importing the same Tokopedia invoice line is skipped', r.status === 201 && r.body.inserted === 0 && r.body.skipped === 1);
r = await call(admin, 'POST', '/api/admin/sales', { cookie, body: { rows: [{ order_date: '01/11/2026', product: 'X', quantity: 1, unit_price: 1 }] } });
ok('a malformed date is rejected with the row number', r.status === 400 && r.body.error === 'row_1_invalid_order_date');
r = await call(admin, 'POST', '/api/admin/expenses', { cookie, body: { rows: [{ expense_date: '2026-11-03', category: 'acquisition', description: 'Blank sleeves x50', amount: 1250000 }, { expense_date: '2026-11-04', category: 'marketing', amount: 200000 }] } });
ok('expenses inserted', r.status === 201 && r.body.inserted === 2);
r = await call(admin, 'POST', '/api/admin/expenses', { cookie, body: { rows: [{ expense_date: '2026-11-03', category: 'lunch', amount: 1 }] } });
ok('unknown expense category is rejected', r.status === 400);
r = await call(admin, 'POST', '/api/admin/inventory', { cookie, body: { rows: [{ product: 'UV Arm Sleeve Classic', sku: 'GW-SLV-WHT', sizes: 'M,L,XL', stock: 40, unit_cost: 25000, restock_level: 10 }] } });
ok('inventory item inserted', r.status === 201 && r.body.inserted === 1);
r = await call(admin, 'GET', '/api/admin/data', { cookie });
ok('data returns every table with numbers and ISO dates', r.status === 200 && r.body.sales.length === 2 && r.body.sales[0].order_date === '2026-11-02' && r.body.sales[1].unit_price === 79000 && r.body.subscribers.length === 1);
const saleId = r.body.sales[0].id, itemId = r.body.inventory[0].id;
r = await call(admin, 'PUT', `/api/admin/inventory/${itemId}`, { cookie, body: { stock: 35 } });
ok('inventory stock updated', r.status === 200 && r.body.stock === 35);
r = await call(admin, 'PUT', `/api/admin/sales/${saleId}`, { cookie, body: { status: 'returned' } });
ok('sale status updated', r.status === 200 && r.body.status === 'returned');
r = await call(admin, 'DELETE', `/api/admin/sales/${saleId}`, { cookie });
ok('sale deleted', r.status === 200);
r = await call(admin, 'DELETE', `/api/admin/sales/${saleId}`, { cookie });
ok('deleting it again is 404', r.status === 404);
r = await call(admin, 'GET', '/api/admin/users', { cookie });
ok('unknown resources are 404', r.status === 404);
r = await call(admin, 'POST', '/api/admin/logout', { cookie });
ok('logout clears the cookie', r.status === 200 && /Max-Age=0/.test(r.setCookie));

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} checks passed`);
