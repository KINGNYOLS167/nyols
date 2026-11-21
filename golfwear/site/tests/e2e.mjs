// End-to-end checks in Chromium against a running build (tests/vercel-harness.mjs or
// npm run serve) with a seeded local database (tests/seed.mjs runs first if the store is empty).
//   BASE=http://localhost:4191 ADMIN_PASSWORD=test-password-123 node tests/e2e.mjs
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const BASE = process.env.BASE || 'http://localhost:4191';
const PASSWORD = process.env.ADMIN_PASSWORD || 'test-password-123';
const STORE = 'https://www.tokopedia.com/golfwear';
if (/vercel\.app|golfwear\./.test(BASE)) throw new Error('The e2e suite writes data: run it against a local build only.');

const results = [];
const consoleErrors = [];
async function check(name, fn) {
  try {
    await fn();
    results.push([true, name]);
    console.log(`  ok    ${name}`);
  } catch (e) {
    results.push([false, name, e.message.split('\n')[0]]);
    console.log(`  FAIL  ${name}\n        ${e.message.split('\n').slice(0, 3).join('\n        ')}`);
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const api = async (path, init) => (await fetch(BASE + path, init)).json();

// Seed when empty.
const first = await api('/api/catalog');
if (!first.products?.length) execFileSync('node', ['tests/seed.mjs', BASE, PASSWORD], { stdio: 'inherit' });
const catalog = await api('/api/catalog');

const browser = await chromium.launch();
async function context(opts = {}, { intro = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', ...opts });
  if (!intro) await ctx.addInitScript(() => { try { sessionStorage.setItem('gw-intro', '1'); } catch {} });
  ctx.on('page', (p) => watch(p));
  return ctx;
}
function watch(page) {
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${page.url()} :: ${m.text()}`); });
  page.on('pageerror', (e) => consoleErrors.push(`${page.url()} :: pageerror ${e.message}`));
}
const overflowX = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
async function brokenImages(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
  return page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map((i) => i.getAttribute('src')));
}

console.log(`\nStorefront (${catalog.products.length} products, ranking: ${catalog.ranking})`);
const ctx = await context();
const page = await ctx.newPage();

await check('home renders the hero, announcement and best sellers', async () => {
  await page.goto(BASE + '/');
  await page.getByRole('heading', { level: 1, name: /beyond\s*the game/i }).waitFor();
  assert(await page.getByRole('region', { name: 'Store announcements' }).isVisible(), 'announcement bar missing');
  const title = catalog.ranking === 'sales' ? 'Best sellers' : 'Featured';
  await page.getByRole('heading', { name: title }).waitFor();
  if (catalog.ranking === 'sales') await page.getByText('Ranked by units sold.').waitFor();
});

await check('home has no broken images and no horizontal overflow', async () => {
  const broken = await brokenImages(page);
  assert(broken.length === 0, `broken: ${broken.join(', ')}`);
  assert((await overflowX(page)) <= 0, 'horizontal overflow');
});

await check('loader plays once per session, then lifts', async () => {
  const c = await context({}, { intro: true });
  const p = await c.newPage();
  await p.goto(BASE + '/');
  const loader = p.locator('.fixed.inset-0.z-\\[90\\]');
  await loader.waitFor({ state: 'attached', timeout: 2000 });
  await loader.waitFor({ state: 'detached', timeout: 5000 });
  await p.reload();
  await p.waitForTimeout(300);
  assert((await loader.count()) === 0, 'loader shown again in the same session');
  await c.close();
});

await check('category index links to collections with matching counts', async () => {
  await page.goto(BASE + '/');
  await page.getByRole('link', { name: /^Polo shirts/ }).first().click();
  await page.waitForURL('**/collections/polo-shirts');
  const expected = catalog.products.filter((p) => p.category === 'polo').length;
  await page.getByText(new RegExp(`^${expected} products?$`)).first().waitFor();
});

await check('mega menu opens on hover and closes with Escape', async () => {
  await page.goto(BASE + '/');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Shop', exact: true }).hover();
  const panel = page.locator('#mega');
  await panel.getByText('Categories').waitFor();
  await page.keyboard.press('Escape');
  await panel.getByText('Categories').waitFor({ state: 'detached' });
});

const ready = (p) => p.getByRole('heading', { level: 1 }).first().waitFor();

await check('search: "/" opens it, results appear, Enter goes to the shop', async () => {
  await page.goto(BASE + '/');
  await ready(page);
  await page.keyboard.press('/');
  const box = page.getByRole('searchbox', { name: 'Search products' });
  await box.waitFor();
  await box.fill('polo');
  await page.getByRole('dialog', { name: 'Search products' }).getByText('QA Polo Short Sleeve').waitFor();
  await box.press('Enter');
  await page.waitForURL('**/shop?q=polo');
  await page.getByRole('heading', { name: 'Results for "polo"' }).waitFor();
});

const prices = async () => page.$$eval('main ul > li article', (cards) => cards.map((c) => {
  const now = c.querySelector('p.tnum span:not(.sr-only)')?.textContent ?? '';
  return Number(now.replace(/[^\d]/g, ''));
}));

await check('shop sorts by price both ways and by newest', async () => {
  await page.goto(BASE + '/shop?sort=price-asc');
  await page.locator('main ul > li article').first().waitFor();
  const asc = await prices();
  assert(asc.length === catalog.products.length, `expected ${catalog.products.length} cards, got ${asc.length}`);
  assert(asc.every((v, i) => i === 0 || asc[i - 1] <= v), `not ascending: ${asc}`);
  await page.getByRole('combobox').selectOption('price-desc');
  await page.waitForURL('**sort=price-desc');
  const desc = await prices();
  assert(desc.every((v, i) => i === 0 || desc[i - 1] >= v), `not descending: ${desc}`);
  await page.getByRole('combobox').selectOption('newest');
  await page.waitForURL('**sort=newest');
});

await check('shop filters by brand, size and price, and clears', async () => {
  await page.goto(BASE + '/shop');
  const brand = catalog.brands[0];
  await page.getByRole('complementary', { name: 'Filters' }).getByLabel(brand.name).check();
  await page.waitForURL(`**brand=${brand.slug}**`);
  const names = await page.$$eval('main ul > li article h3', (h) => h.map((x) => x.textContent));
  const expected = catalog.products.filter((p) => p.brand?.slug === brand.slug).map((p) => p.name);
  assert(names.length === expected.length && names.every((n) => expected.includes(n)), `brand filter wrong: ${names}`);
  await page.getByRole('button', { name: 'Clear all filters' }).click();
  await page.getByRole('complementary', { name: 'Filters' }).getByRole('button', { name: 'XL', exact: true }).click();
  await page.waitForURL('**size=XL**');
  const xl = catalog.products.filter((p) => p.sizes.some((s) => s.size === 'XL' && s.available)).length;
  assert((await page.locator('main ul > li article').count()) === xl, 'size filter count wrong');
  await page.getByRole('button', { name: 'Clear all filters' }).click();
  const max = page.getByRole('complementary', { name: 'Filters' }).getByLabel('Maximum');
  await max.fill('300000');
  await max.press('Enter');
  await page.waitForURL('**max=300000**');
  const under = await prices();
  assert(under.length > 0 && under.every((v) => v <= 300000), `price filter wrong: ${under}`);
});

await check('shop shows an honest empty state when nothing matches', async () => {
  await page.goto(BASE + '/shop?q=zzzz-nothing');
  await page.getByText('No products match.').waitFor();
  await page.getByRole('button', { name: 'Clear all filters' }).first().click();
  await page.locator('main ul > li article').first().waitFor();
});

const linked = catalog.products.find((p) => p.tokopediaUrl && p.sizes.some((s) => !s.available));
const unlinked = catalog.products.find((p) => !p.tokopediaUrl);
await check('product page: price, sizes, Buy on Tokopedia link, structured data', async () => {
  await page.goto(BASE + `/product/${linked.slug}`);
  await page.getByRole('heading', { level: 1, name: linked.name }).waitFor();
  const buy = page.getByRole('link', { name: /Buy on Tokopedia/ });
  assert((await buy.getAttribute('href')) === linked.tokopediaUrl, 'buy link does not point at the listing');
  assert((await buy.getAttribute('target')) === '_blank' && (await buy.getAttribute('rel'))?.includes('noopener'), 'buy link target/rel');
  const soldOut = linked.sizes.find((s) => !s.available);
  assert(await page.getByRole('radio', { name: new RegExp(`^${soldOut.size}\\b`) }).isDisabled(), 'sold-out size not disabled');
  const low = linked.sizes.find((s) => s.low);
  if (low) {
    await page.locator('label', { has: page.getByRole('radio', { name: new RegExp(`^${low.size}\\b`) }) }).click();
    await page.getByText(`Only ${low.low} left`).waitFor();
  }
  const ld = await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => JSON.parse(x.textContent)));
  assert(ld.some((x) => x['@type'] === 'Product' && x.offers?.priceCurrency === 'IDR'), 'Product JSON-LD missing');
});

await check('product without a listing link falls back to the store, and says so', async () => {
  await page.goto(BASE + `/product/${unlinked.slug}`);
  const buy = page.getByRole('link', { name: /Find it on our Tokopedia store/ });
  assert((await buy.getAttribute('href')) === STORE, 'fallback link is not the store');
  await page.getByText(/no direct link yet/).waitFor();
});

await check('quick view opens from a card and closes with Escape', async () => {
  await page.goto(BASE + '/shop');
  const card = page.locator('main ul > li article').first();
  await card.hover();
  await card.getByRole('button', { name: 'Quick view' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('link', { name: 'View product' }).waitFor();
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
});

await check('brand page lists only that brand', async () => {
  const b = catalog.brands[1] ?? catalog.brands[0];
  await page.goto(BASE + `/brands/${b.slug}`);
  await page.getByRole('heading', { level: 1, name: b.name }).waitFor();
  assert((await page.locator('main ul > li article').count()) === b.count, 'brand product count wrong');
});

await check('unknown pages show 404 or a clear "not available" message', async () => {
  await page.goto(BASE + '/collections/nope');
  await page.getByRole('heading', { name: 'Page not found' }).waitFor();
  await page.goto(BASE + '/brands/nope');
  await page.getByRole('heading', { name: 'Page not found' }).waitFor();
  await page.goto(BASE + '/product/nope');
  await page.getByRole('heading', { name: "This product isn't available here." }).waitFor();
});

await check('language switch translates the page and persists', async () => {
  await page.goto(BASE + '/');
  await page.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'ID' }).click();
  await page.getByText('Temukan pakaian golf yang dirancang').waitFor();
  await page.getByRole('heading', { name: 'Belanja per kategori' }).waitFor();
  await page.reload();
  await page.getByText('Temukan pakaian golf yang dirancang').waitFor();
  assert((await page.evaluate(() => document.documentElement.lang)) === 'id', 'html lang not id');
  await page.getByRole('group', { name: 'Bahasa' }).getByRole('button', { name: 'EN' }).click();
  await page.getByRole('heading', { name: 'Shop by category' }).waitFor();
});

await check('newsletter rejects a bad email and accepts a good one', async () => {
  await page.goto(BASE + '/');
  const field = page.getByLabel('Email address');
  await field.fill('not-an-email');
  await page.getByRole('button', { name: 'Subscribe' }).click();
  await page.getByText('Enter a valid email address.').waitFor();
  await field.fill(`qa+${Date.now()}@example.com`);
  await page.getByRole('button', { name: 'Subscribe' }).click();
  await page.getByText("Thanks, you're on the list.").waitFor();
});

await check('every internal link on the main pages opens a real page', async () => {
  const seen = new Set();
  for (const path of ['/', '/shop', `/product/${linked.slug}`, '/about', '/brands']) {
    await page.goto(BASE + path);
    await page.waitForTimeout(400);
    for (const href of await page.$$eval('a[href^="/"]', (as) => as.map((a) => a.getAttribute('href')))) seen.add(href.split('#')[0]);
  }
  const bad = [];
  for (const href of seen) {
    if (href.startsWith('/api/')) continue;
    await page.goto(BASE + href);
    await page.waitForTimeout(150);
    if (await page.getByRole('heading', { name: 'Page not found' }).count()) bad.push(href);
  }
  assert(bad.length === 0, `links to missing pages: ${bad.join(', ')}`);
  console.log(`        (${seen.size} internal links checked)`);
});

await check('external links point only at the real Tokopedia store and listings', async () => {
  await page.goto(BASE + '/');
  await ready(page);
  await page.locator('main article').first().waitFor();
  const ext = await page.$$eval('a[href^="http"]', (as) => as.map((a) => a.href));
  assert(ext.length > 0 && ext.every((h) => h.startsWith('https://www.tokopedia.com/golfwear')), `unexpected: ${ext.filter((h) => !h.startsWith(STORE))}`);
});

await check('about page: story, questions open and close, ordering steps', async () => {
  await page.goto(BASE + '/about');
  await page.getByRole('heading', { level: 1, name: 'About GOLFWEAR' }).waitFor();
  const q = page.getByText('Why do I check out on Tokopedia?');
  await q.click();
  await page.getByText('Payment and delivery run through Tokopedia').waitFor();
  await page.getByRole('heading', { name: 'How ordering works' }).waitFor();
});
await ctx.close();

console.log('\nPhone and tablet');
const phone = await context({ ...devices['iPhone 13'], locale: 'en-US' });
const m = await phone.newPage();
await check('phone: home, menu and shop without horizontal overflow', async () => {
  await m.goto(BASE + '/');
  assert((await overflowX(m)) <= 0, 'home overflows');
  await m.getByRole('button', { name: 'Menu' }).click();
  const menu = m.getByRole('dialog', { name: 'Menu' });
  await menu.getByText('Shop', { exact: true }).click();
  await menu.getByRole('link', { name: 'Shop everything' }).click();
  await m.waitForURL('**/shop');
  assert((await overflowX(m)) <= 0, 'shop overflows');
});
await check('phone: filter drawer opens and shows the result count', async () => {
  await m.getByRole('button', { name: /^Filters/ }).click();
  const drawer = m.getByRole('dialog', { name: 'Filters' });
  await drawer.getByRole('button', { name: /^Show \d+ products?$/ }).click();
  await drawer.waitFor({ state: 'hidden' });
});
await check('phone: product page swipe gallery, no overflow', async () => {
  await m.goto(BASE + `/product/${linked.slug}`);
  await m.getByRole('heading', { level: 1, name: linked.name }).waitFor();
  assert((await overflowX(m)) <= 0, 'product overflows');
  await m.locator('[aria-roledescription="carousel"]').waitFor();
});
await phone.close();
const tablet = await context({ ...devices['iPad Mini'], locale: 'en-US' });
const tb = await tablet.newPage();
await check('tablet: home and shop without horizontal overflow', async () => {
  for (const path of ['/', '/shop', '/about']) {
    await tb.goto(BASE + path);
    await tb.waitForTimeout(500);
    assert((await overflowX(tb)) <= 0, `${path} overflows`);
  }
});
await tablet.close();

console.log('\nReduced motion');
const calm = await context({ reducedMotion: 'reduce' }, { intro: true });
const rm = await calm.newPage();
await check('reduced motion: no loader, no smooth scroll, headline visible at once', async () => {
  await rm.goto(BASE + '/');
  await rm.waitForTimeout(150);
  assert((await rm.locator('.fixed.inset-0.z-\\[90\\]').count()) === 0, 'loader shown');
  assert(!(await rm.evaluate(() => document.documentElement.classList.contains('lenis'))), 'Lenis active');
  const visible = await rm.evaluate(() => [...document.querySelectorAll('.hero-line')].every((l) => getComputedStyle(l).opacity !== '0'));
  assert(visible, 'hero headline hidden');
  assert(!(await rm.evaluate(() => document.documentElement.classList.contains('has-cursor'))), 'custom cursor active');
});
await calm.close();

console.log('\nDashboard');
const actx = await context();
const a = await actx.newPage();
// The session cookie is scoped to /api, so ask for the cookies of an /api URL.
const cookieHeader = async () => (await actx.cookies(BASE + '/api/admin')).map((c) => `${c.name}=${c.value}`).join('; ');
const adminFetch = async (path, init = {}) => fetch(BASE + '/api/admin' + path, { ...init, headers: { cookie: await cookieHeader(), 'x-gw-admin': '1', 'content-type': 'application/json', ...(init.headers ?? {}) } });
const stockOf = async (name, size) => (await (await adminFetch('/inventory')).json()).find((r) => r.name === name && r.size === size)?.qty;

await check('admin API refuses requests without a session', async () => {
  const r = await fetch(BASE + '/api/admin/products');
  assert(r.status === 401, `expected 401, got ${r.status}`);
});

await check('sign-in rejects a wrong password, accepts the right one', async () => {
  await a.goto(BASE + '/admin');
  await a.getByLabel('Password').fill('definitely-wrong-1');
  await a.getByRole('button', { name: 'Sign in' }).click();
  await a.getByText('That password is not right.').waitFor();
  await a.getByLabel('Password').fill(PASSWORD);
  await a.getByRole('button', { name: 'Sign in' }).click();
  await a.getByRole('heading', { name: 'Overview' }).waitFor();
  const robots = await a.$eval('meta[name="robots"]', (x) => x.content).catch(() => '');
  assert(robots.includes('noindex'), 'dashboard not marked noindex');
});

await check('writes need the dashboard header and the same origin', async () => {
  const noHeader = await fetch(BASE + '/api/admin/expenses', { method: 'POST', headers: { cookie: await cookieHeader(), 'content-type': 'application/json' }, body: '{}' });
  assert(noHeader.status === 403, `missing header: ${noHeader.status}`);
  const foreign = await adminFetch('/expenses', { method: 'POST', body: '{}', headers: { origin: 'https://evil.example' } });
  assert(foreign.status === 403, `foreign origin: ${foreign.status}`);
});

await check('overview shows totals computed from the recorded sales and expenses', async () => {
  const s = await (await adminFetch('/summary?year=2026')).json();
  const sales = await (await adminFetch('/sales?year=2026')).json();
  const expenses = await (await adminFetch('/expenses?year=2026')).json();
  const rev = sales.filter((x) => ['processing', 'shipped', 'completed'].includes(x.status)).reduce((n, x) => n + x.qty * x.unitPrice - x.discount, 0);
  const exp = expenses.reduce((n, x) => n + x.amount, 0);
  assert(s.total.revenue === rev, `revenue ${s.total.revenue} != ${rev}`);
  assert(s.total.totalExpenses === exp, `expenses ${s.total.totalExpenses} != ${exp}`);
  assert(s.total.netProfit === rev - exp, 'net profit wrong');
  await a.goto(BASE + '/admin');
  await a.getByText(new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(rev - exp).replace(/\u00a0/g, ' ')).first().waitFor();
});

let saleProduct;
await check('record a sale in the form: it lists, and takes stock out', async () => {
  saleProduct = catalog.products.find((p) => p.sizes.some((s) => s.available) && !p.preorder);
  const size = saleProduct.sizes.find((s) => s.available).size;
  const before = await stockOf(saleProduct.name, size);
  await a.goto(BASE + '/admin/sales');
  await a.getByRole('button', { name: 'Record a sale' }).first().click();
  const form = a.getByRole('dialog', { name: 'Record a sale' });
  await form.getByLabel('Product', { exact: true }).selectOption({ label: `${saleProduct.name}${saleProduct.brand ? `, ${saleProduct.brand.name}` : ''}` });
  await form.getByLabel('Size').selectOption(size);
  await form.getByLabel('Marketplace reference').fill('INV/E2E/1');
  await form.getByRole('button', { name: 'Record sale' }).click();
  await a.getByText('Sale recorded').waitFor();
  await a.getByRole('cell', { name: /INV\/E2E\/1/ }).waitFor();
  assert((await stockOf(saleProduct.name, size)) === before - 1, 'stock not reduced');
  saleProduct.size = size;
  saleProduct.before = before;
});

await check('delete that sale: units go back into stock', async () => {
  await a.getByRole('button', { name: new RegExp(`^Delete sale of ${saleProduct.name}`) }).first().click();
  await a.getByRole('dialog', { name: 'Delete this sale?' }).getByRole('button', { name: 'Delete' }).click();
  await a.getByText('Sale deleted').waitFor();
  assert((await stockOf(saleProduct.name, saleProduct.size)) === saleProduct.before, 'stock not restored');
});

await check('record an expense in the form', async () => {
  await a.goto(BASE + '/admin/expenses');
  await a.getByRole('button', { name: 'Record an expense' }).first().click();
  const form = a.getByRole('dialog', { name: 'Record an expense' });
  await form.getByLabel('Category').selectOption('operational');
  await form.getByLabel('Description').fill('E2E packaging');
  await form.getByLabel('Amount').fill('125000');
  await form.getByRole('button', { name: 'Record expense' }).click();
  await a.getByText('Expense recorded').waitFor();
  await a.getByRole('cell', { name: 'E2E packaging', exact: true }).waitFor();
});

await check('mark an ordered restock as received: stock goes up', async () => {
  const restocks = await (await adminFetch('/restocks')).json();
  const r = restocks.find((x) => x.status === 'ordered');
  assert(r, 'no ordered restock in the seed');
  const before = (await stockOf(r.productName, r.size)) ?? 0;
  await a.goto(BASE + '/admin/inventory');
  await a.getByRole('button', { name: 'Mark received' }).first().click();
  await a.getByText(new RegExp(`added to ${r.productName}`)).waitFor();
  assert((await stockOf(r.productName, r.size)) === before + r.qty, 'stock not increased');
});

await check('add a draft product, publish it, and it reaches the store', async () => {
  await a.goto(BASE + '/admin/products/new');
  await a.getByLabel('Name', { exact: true }).fill('E2E Trial Polo');
  await a.getByLabel('Regular price').fill('410000');
  await a.getByLabel('Product link').fill('https://www.tokopedia.com/golfwear/e2e-trial-polo');
  await a.getByRole('button', { name: 'Add product' }).click();
  await a.getByText('Product added').waitFor();
  await a.waitForURL(/\/admin\/products\/\d+$/);
  let pub = await api('/api/catalog');
  assert(!pub.products.some((p) => p.name === 'E2E Trial Polo'), 'draft visible on the store');
  await a.getByLabel('Status').selectOption('published');
  await a.getByRole('button', { name: 'Save product' }).click();
  await a.getByText('Product saved').waitFor();
  pub = await api('/api/catalog');
  const p = pub.products.find((x) => x.name === 'E2E Trial Polo');
  assert(p && p.price === 410000 && p.tokopediaUrl.endsWith('/e2e-trial-polo'), 'published product missing or wrong');
});

await check('product form rejects a non-Tokopedia link with a clear message', async () => {
  await a.goto(BASE + '/admin/products/new');
  await a.getByLabel('Name', { exact: true }).fill('Bad link');
  await a.getByLabel('Regular price').fill('100000');
  await a.getByLabel('Product link').fill('https://example.com/item');
  await a.getByRole('button', { name: 'Add product' }).click();
  await a.getByText('Tokopedia link must be a tokopedia.com address.').waitFor();
});

await check('CSV exports download as spreadsheet-ready files', async () => {
  for (const [path, head] of [['sales.csv?year=2026', 'Order date'], ['expenses.csv?year=2026', 'Date'], ['monthly.csv?year=2026', 'Month'], ['yearly.csv', 'Year'], ['inventory.csv', 'SKU'], ['products.csv', 'name'], ['subscribers.csv', 'Email']]) {
    const r = await adminFetch('/export/' + path);
    const bytes = new Uint8Array(await r.arrayBuffer());
    assert(r.status === 200 && r.headers.get('content-type')?.startsWith('text/csv'), `${path}: ${r.status}`);
    assert(r.headers.get('content-disposition')?.includes('attachment'), `${path}: not an attachment`);
    // A UTF-8 byte order mark first (Excel needs it for Indonesian text), then the header row.
    assert(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf, `${path}: no byte order mark`);
    assert(new TextDecoder().decode(bytes).startsWith(head), `${path}: unexpected header`);
  }
});

await check('settings: a new announcement shows on the store', async () => {
  await a.goto(BASE + '/admin/settings');
  await a.getByRole('button', { name: 'Add a message' }).click();
  await a.getByLabel('English').last().fill('E2E announcement: new arrivals this week.');
  await a.getByLabel('Bahasa Indonesia').last().fill('Pengumuman E2E: produk baru minggu ini.');
  await a.getByRole('button', { name: 'Save settings' }).click();
  await a.getByText(/Settings saved/).waitFor();
  const pub = await api('/api/catalog');
  assert(pub.settings.announcements.some((x) => x.en.startsWith('E2E announcement')), 'announcement not public');
});

await check('dashboard pages have no horizontal overflow on a phone', async () => {
  const c = await context({ ...devices['iPhone 13'], locale: 'en-US' });
  await c.addCookies(await actx.cookies());
  const p = await c.newPage();
  for (const path of ['/admin', '/admin/sales', '/admin/inventory', '/admin/reports']) {
    await p.goto(BASE + path);
    await p.getByRole('heading', { level: 1 }).first().waitFor();
    assert(!(await p.getByRole('button', { name: 'Sign in' }).count()), 'phone context is not signed in');
    await p.waitForTimeout(400);
    assert((await overflowX(p)) <= 0, `${path} overflows`);
  }
  await c.close();
});

await check('sign out ends the session', async () => {
  await a.goto(BASE + '/admin');
  await a.getByRole('button', { name: 'Sign out' }).first().click();
  await a.getByRole('button', { name: 'Sign in' }).waitFor();
  const r = await fetch(BASE + '/api/admin/products', { headers: { cookie: await cookieHeader() } });
  assert(r.status === 401, `still signed in: ${r.status}`);
});
await actx.close();
await browser.close();

// Expected in the dashboard: 401s from the wrong-password and signed-out checks, and the 400 from
// the deliberately invalid product link. Anything else is a real error.
const unexpected = consoleErrors.filter((e) => !(/\/admin/.test(e) && /status of 40[01]/.test(e)));
results.push([unexpected.length === 0, 'no unexpected console errors', unexpected.slice(0, 5).join(' | ')]);
console.log(`\n${unexpected.length ? 'FAIL' : 'ok  '}  no unexpected console errors${unexpected.length ? `\n        ${unexpected.slice(0, 8).join('\n        ')}` : ''}`);
const failed = results.filter((r) => !r[0]);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
