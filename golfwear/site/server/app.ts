// The GOLFWEAR API. Public: catalog, newsletter sign-up, product images.
// Private (owner session required): everything under /api/admin.
import { Hono, type Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { getDb, type Db } from './db';
import { authConfigured, COOKIE, cookieHeader, createSession, passwordMatches, recordAttempt, tooManyAttempts, verifySession } from './auth';
import * as repo from './repo';
import { EMAIL, InputError, toCsv } from './util';
import { DEFAULT_ANNOUNCEMENTS, DEFAULT_STORE, EXPENSE_CATEGORIES, REVENUE_STATUSES, type CatalogPayload } from '../shared/domain';

type Env = { Variables: { db: Db } };
const app = new Hono<Env>().basePath('/api');

const noStore = { 'Cache-Control': 'no-store' };

app.onError((err, c) => {
  if (err instanceof InputError) return c.json({ error: err.message, field: err.field }, 400, noStore);
  if (err instanceof repo.NotFound) return c.json({ error: err.message }, 404, noStore);
  if (err instanceof SyntaxError) return c.json({ error: 'The request body is not valid JSON.' }, 400, noStore);
  console.error('[api]', err);
  return c.json({ error: 'Something went wrong on our side. Try again in a moment.' }, 500, noStore);
});

app.notFound((c) => c.json({ error: 'Not found.' }, 404, noStore));

/** Attach the database, or answer 503 when there is none. */
async function withDb(c: Context<Env>, next: () => Promise<void>) {
  const state = await getDb();
  if (!state.ok) return c.json({ error: state.message, reason: state.reason }, 503, noStore);
  c.set('db', state.db);
  await next();
}

const clientIp = (c: Context) =>
  (c.req.header('x-real-ip') || c.req.header('x-forwarded-for')?.split(',')[0] || 'local').trim().slice(0, 64);

const isHttps = (c: Context) => c.req.header('x-forwarded-proto') === 'https' || new URL(c.req.url).protocol === 'https:';

// ---------- public ----------

app.get('/health', async (c) => {
  const state = await getDb();
  return c.json({ ok: true, database: state.ok ? 'connected' : state.reason }, 200, noStore);
});

app.get('/catalog', async (c) => {
  const cache = { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=300' };
  const state = await getDb();
  // Before a database is connected the store simply has nothing listed yet: answer that plainly.
  if (!state.ok && state.reason === 'not_configured') {
    const empty: CatalogPayload = { products: [], brands: [], ranking: 'featured', settings: { announcements: DEFAULT_ANNOUNCEMENTS, store: DEFAULT_STORE }, updatedAt: new Date().toISOString() };
    return c.json(empty, 200, cache);
  }
  if (!state.ok) return c.json({ error: state.message, reason: state.reason }, 503, noStore);
  return c.json(await repo.publicCatalog(state.db.query), 200, cache);
});

app.post('/newsletter', withDb, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body?.email ?? '').trim();
  if (!EMAIL.test(email)) return c.json({ error: 'Enter a valid email address.', field: 'email' }, 400, noStore);
  if (body?.company) return c.json({ ok: true }, 200, noStore); // honeypot field filled in: quietly ignore
  await repo.addSubscriber(c.var.db.query, email, String(body?.lang ?? 'id'));
  return c.json({ ok: true }, 200, noStore);
});

app.get('/media/:id{[a-f0-9]{32}}', withDb, async (c) => {
  const row = await repo.getMedia(c.var.db.query, c.req.param('id') ?? '');
  if (!row) return c.json({ error: 'Image not found.' }, 404, noStore);
  return c.body(row.bytes as any, 200, {
    'Content-Type': row.mime,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  });
});

// ---------- admin: session ----------

const admin = new Hono<Env>();

admin.get('/status', async (c) => {
  const state = await getDb();
  return c.json({
    database: state.ok ? 'connected' : state.reason,
    auth: authConfigured() ? 'configured' : 'not_configured',
    signedIn: verifySession(getCookie(c, COOKIE)),
  }, 200, noStore);
});

admin.post('/login', withDb, async (c) => {
  if (!authConfigured()) return c.json({ error: 'Sign-in is not set up yet: add ADMIN_PASSWORD (10+ characters) to the environment.' }, 503, noStore);
  const db = c.var.db;
  const ip = clientIp(c);
  if (await tooManyAttempts(db, ip)) return c.json({ error: 'Too many attempts. Wait 15 minutes, then try again.' }, 429, noStore);
  const body = await c.req.json().catch(() => ({}));
  const ok = passwordMatches(String(body?.password ?? ''));
  await recordAttempt(db, ip, ok);
  if (!ok) return c.json({ error: 'That password is not right.' }, 401, noStore);
  const { token, maxAge } = createSession();
  c.header('Set-Cookie', cookieHeader(token, maxAge, isHttps(c)));
  return c.json({ ok: true }, 200, noStore);
});

admin.post('/logout', (c) => {
  c.header('Set-Cookie', cookieHeader('', 0, isHttps(c)));
  return c.json({ ok: true }, 200, noStore);
});

// Everything below needs a session. Writes also need the dashboard's own header (CSRF guard).
admin.use('*', async (c, next) => {
  if (!verifySession(getCookie(c, COOKIE))) return c.json({ error: 'Sign in to continue.' }, 401, noStore);
  if (c.req.method !== 'GET' && c.req.header('x-gw-admin') !== '1') return c.json({ error: 'Request blocked.' }, 403, noStore);
  const origin = c.req.header('origin');
  if (origin && c.req.method !== 'GET') {
    let host = '';
    try { host = new URL(origin).host; } catch { /* malformed origin */ }
    if (host !== (c.req.header('x-forwarded-host') || c.req.header('host'))) return c.json({ error: 'Request blocked.' }, 403, noStore);
  }
  await next();
  c.header('Cache-Control', 'no-store');
});
admin.use('*', withDb);

const id = (c: Context) => {
  const n = Number(c.req.param('id'));
  if (!Number.isInteger(n) || n < 1) throw new repo.NotFound('Record');
  return n;
};
const params = (c: Context) => new URL(c.req.url).searchParams;
const q = (c: Context<Env>) => c.var.db.query;

// products and brands
admin.get('/products', async (c) => c.json(await repo.listProducts(q(c))));
admin.get('/products/:id', async (c) => c.json(await repo.getProduct(q(c), id(c))));
admin.post('/products', async (c) => c.json(await repo.saveProduct(c.var.db, await c.req.json()), 201));
admin.put('/products/:id', async (c) => c.json(await repo.saveProduct(c.var.db, await c.req.json(), id(c))));
admin.delete('/products/:id', async (c) => { await repo.deleteProduct(q(c), id(c)); return c.json({ ok: true }); });
admin.post('/products/import', async (c) => c.json(await repo.importProducts(c.var.db, await c.req.json())));
admin.get('/brands', async (c) => c.json(await repo.listBrands(q(c))));
admin.post('/brands', async (c) => c.json(await repo.saveBrand(q(c), await c.req.json()), 201));
admin.put('/brands/:id', async (c) => c.json(await repo.saveBrand(q(c), await c.req.json(), id(c))));
admin.delete('/brands/:id', async (c) => {
  const [row] = await q(c)(`delete from brands where id = $1 returning id`, [id(c)]);
  if (!row) throw new repo.NotFound('Brand');
  return c.json({ ok: true });
});

// sales, expenses, restocks
admin.get('/sales', async (c) => c.json(await repo.listSales(q(c), params(c))));
admin.post('/sales', async (c) => c.json(await repo.saveSale(c.var.db, await c.req.json()), 201));
admin.put('/sales/:id', async (c) => c.json(await repo.saveSale(c.var.db, await c.req.json(), id(c))));
admin.delete('/sales/:id', async (c) => { await repo.deleteSale(c.var.db, id(c)); return c.json({ ok: true }); });
admin.get('/expenses', async (c) => c.json(await repo.listExpenses(q(c), params(c))));
admin.post('/expenses', async (c) => c.json(await repo.saveExpense(q(c), await c.req.json()), 201));
admin.put('/expenses/:id', async (c) => c.json(await repo.saveExpense(q(c), await c.req.json(), id(c))));
admin.delete('/expenses/:id', async (c) => { await repo.deleteExpense(q(c), id(c)); return c.json({ ok: true }); });
admin.get('/restocks', async (c) => c.json(await repo.listRestocks(q(c))));
admin.post('/restocks', async (c) => c.json(await repo.saveRestock(c.var.db, await c.req.json()), 201));
admin.put('/restocks/:id', async (c) => c.json(await repo.saveRestock(c.var.db, await c.req.json(), id(c))));
admin.delete('/restocks/:id', async (c) => { await repo.deleteRestock(c.var.db, id(c)); return c.json({ ok: true }); });
admin.get('/inventory', async (c) => c.json(await repo.inventory(q(c))));

// finance
admin.get('/summary', async (c) => {
  const ys = await repo.years(q(c));
  const year = Number(params(c).get('year')) || ys[0] || new Date().getFullYear();
  return c.json({ years: ys, ...(await repo.summary(q(c), year)) });
});
admin.get('/yearly', async (c) => c.json(await repo.yearly(q(c))));

// settings, subscribers, media
admin.get('/settings', async (c) => c.json(await repo.getSettings(q(c))));
admin.put('/settings', async (c) => c.json(await repo.saveSettings(q(c), await c.req.json())));
admin.get('/subscribers', async (c) => c.json(await repo.listSubscribers(q(c))));
admin.delete('/subscribers/:id', async (c) => { await repo.deleteSubscriber(q(c), id(c)); return c.json({ ok: true }); });

const IMAGE_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/avif'];
admin.post('/media', async (c) => {
  const mime = (c.req.header('content-type') ?? '').split(';')[0].trim();
  if (!IMAGE_TYPES.includes(mime)) return c.json({ error: 'Upload a WebP, JPEG, PNG or AVIF image.' }, 400);
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (!bytes.byteLength) return c.json({ error: 'The file is empty.' }, 400);
  if (bytes.byteLength > 3 * 1024 * 1024) return c.json({ error: 'Images must be under 3 MB.' }, 413);
  return c.json(await repo.putMedia(q(c), mime, bytes), 201);
});

// ---------- admin: CSV exports ----------

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pct = (v: number | null) => (v === null ? '' : (v * 100).toFixed(1) + '%');

function csv(c: Context, name: string, header: string[], rows: unknown[][]) {
  return c.body(toCsv(header, rows), 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${name}"`,
  });
}

function suffix(p: URLSearchParams) {
  const y = p.get('year');
  const m = p.get('month');
  return [y, m && m.padStart(2, '0')].filter(Boolean).join('-') || 'all';
}

admin.get('/export/sales.csv', async (c) => {
  const p = params(c);
  const rows = await repo.listSales(q(c), p);
  return csv(c, `golfwear-sales-${suffix(p)}.csv`,
    ['Order date', 'Marketplace', 'Marketplace ref', 'Product', 'Brand', 'Size', 'Qty', 'Unit price (IDR)', 'Discount (IDR)', 'Revenue (IDR)', 'Status', 'Counted in revenue', 'Note'],
    rows.map((s) => [s.orderDate, s.marketplace, s.marketplaceRef, s.productName, s.brand, s.size, s.qty, s.unitPrice, s.discount, s.revenue, s.status,
      (REVENUE_STATUSES as readonly string[]).includes(s.status) ? 'yes' : 'no', s.note]));
});

admin.get('/export/expenses.csv', async (c) => {
  const p = params(c);
  const rows = await repo.listExpenses(q(c), p);
  return csv(c, `golfwear-expenses-${suffix(p)}.csv`,
    ['Date', 'Category', 'Description', 'Vendor', 'Product', 'Amount (IDR)', 'Note'],
    rows.map((e) => [e.date, e.category, e.description, e.vendor, e.productName ?? '', e.amount, e.note]));
});

const REPORT_HEAD = ['Revenue (IDR)', 'Orders', 'Units', 'Discounts (IDR)', ...EXPENSE_CATEGORIES.map((k) => `${k[0].toUpperCase()}${k.slice(1)} (IDR)`),
  'Total expenses (IDR)', 'Gross profit (IDR)', 'Net profit (IDR)', 'Gross margin', 'Net margin'];
type Fin = Awaited<ReturnType<typeof repo.summary>>['total'];
const reportCells = (m: Fin) => [m.revenue, m.orders, m.units, m.discounts, ...EXPENSE_CATEGORIES.map((k) => m.expenses[k]), m.totalExpenses, m.grossProfit, m.netProfit, pct(m.grossMargin), pct(m.netMargin)];

admin.get('/export/monthly.csv', async (c) => {
  const year = Number(params(c).get('year')) || new Date().getFullYear();
  const s = await repo.summary(q(c), year);
  return csv(c, `golfwear-monthly-report-${year}.csv`, ['Month', ...REPORT_HEAD],
    [...s.months.map((m) => [`${MONTHS[m.month - 1]} ${year}`, ...reportCells(m)]), [`Total ${year}`, ...reportCells(s.total)]]);
});

admin.get('/export/yearly.csv', async (c) => {
  const rows = await repo.yearly(q(c));
  return csv(c, 'golfwear-yearly-report.csv', ['Year', ...REPORT_HEAD], rows.map((r) => [r.year, ...reportCells(r)]));
});

admin.get('/export/inventory.csv', async (c) => {
  const rows = await repo.inventory(q(c));
  return csv(c, 'golfwear-inventory.csv',
    ['SKU', 'Product', 'Brand', 'Category', 'Size', 'Stock', 'On order', 'Next restock', 'Restock note', 'Listing status'],
    rows.map((r) => [r.sku, r.name, r.brand ?? '', r.category, r.size ?? '', r.qty ?? '', r.onOrder ?? 0, r.nextRestock ?? '', r.restockNote, r.status]));
});

admin.get('/export/products.csv', async (c) => {
  const rows = await repo.listProducts(q(c));
  return csv(c, 'golfwear-products.csv',
    ['name', 'brand', 'category', 'sleeve', 'gender', 'price', 'sale_price', 'cost_price', 'sizes', 'stock', 'sku', 'tokopedia_url', 'tokopedia_sold', 'images', 'colors', 'description', 'status', 'featured', 'is_new', 'preorder', 'preorder_days'],
    rows.map((p: any) => [p.name, p.brandName ?? '', p.category, p.sleeve, p.gender, p.price, p.salePrice ?? '', p.costPrice ?? '',
      p.stock.map((s: any) => s.size).join('|'), p.stock.map((s: any) => `${s.size}:${s.qty}`).join('|'), p.sku, p.tokopediaUrl, p.tokopediaSold,
      (p.images ?? []).join('|'), (p.colors ?? []).map((x: any) => `${x.name}:${x.hex}`).join('|'), p.description, p.status,
      p.featured ? 'yes' : 'no', p.isNew ? 'yes' : 'no', p.preorder ? 'yes' : 'no', p.preorderDays ?? '']));
});

admin.get('/export/subscribers.csv', async (c) => {
  const rows = await repo.listSubscribers(q(c));
  return csv(c, 'golfwear-newsletter.csv', ['Email', 'Language', 'Signed up'], rows.map((s) => [s.email, s.lang, s.createdAt]));
});

app.route('/admin', admin);

export default app;
