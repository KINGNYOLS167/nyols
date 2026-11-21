// Every read and write the API makes. Plain SQL over the Db adapter.
import { randomUUID } from 'node:crypto';
import type { Db, Row } from './db';
import {
  CATEGORIES, DEFAULT_ANNOUNCEMENTS, DEFAULT_STORE, EXPENSE_CATEGORIES, GENDERS, LOW_STOCK, PRODUCT_STATUSES,
  RESTOCK_STATUSES, REVENUE_STATUSES, SALE_STATUSES, SLEEVES, STOCK_STATUSES,
  type Announcement, type Availability, type CatalogPayload, type PublicProduct, type StoreSettings,
} from '../shared/domain';
import { EMAIL, InputError, bool, date, int, obj, oneOf, optInt, slugify, str, strList } from './util';

type Q = Db['query'];
const inList = (xs: readonly string[]) => xs.map((x) => `'${x}'`).join(',');
const REV = inList(REVENUE_STATUSES);
const D = (col: string) => `to_char(${col}, 'YYYY-MM-DD')`;
const TS = (col: string) => `to_char(${col} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

// ---------- settings ----------

export async function getSettings(q: Q): Promise<{ announcements: Announcement[]; store: StoreSettings }> {
  const rows = await q<{ key: string; value: any }>(`select key, value from settings where key in ('announcements','store')`);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    announcements: Array.isArray(map.announcements) ? map.announcements : DEFAULT_ANNOUNCEMENTS,
    store: { ...DEFAULT_STORE, ...(map.store ?? {}) },
  };
}

export async function saveSettings(q: Q, body: unknown) {
  const o = obj(body);
  if (o.announcements !== undefined) {
    if (!Array.isArray(o.announcements)) throw new InputError('announcements', 'Announcements must be a list.');
    const list = o.announcements.slice(0, 6).map((a, i) => {
      const x = obj(a);
      const id = str(x, 'id', { max: 140 });
      const en = str(x, 'en', { max: 140 });
      const href = str(x, 'href', { max: 300 });
      if (!id && !en) throw new InputError(`announcements.${i}`, 'Each announcement needs text.');
      if (href && !/^(https:\/\/|\/)/.test(href)) throw new InputError(`announcements.${i}`, 'Links must start with https:// or /.');
      return { id: id || en, en: en || id, ...(href ? { href } : {}) };
    });
    await q(`insert into settings (key, value) values ('announcements', $1::text::jsonb) on conflict (key) do update set value = excluded.value`, [JSON.stringify(list)]);
  }
  if (o.store !== undefined) {
    const s = obj(o.store);
    const handle = (k: string) => str(s, k, { max: 60 }).replace(/^@/, '');
    const whatsapp = str(s, 'whatsapp', { max: 20 }).replace(/[^\d]/g, '');
    if (whatsapp && !/^62\d{8,13}$/.test(whatsapp)) throw new InputError('whatsapp', 'WhatsApp must be an Indonesian number in international format, e.g. 6281234567890.');
    const email = str(s, 'email', { max: 120 });
    if (email && !EMAIL.test(email)) throw new InputError('email', 'Enter a valid email address.');
    const store: StoreSettings = {
      whatsapp,
      instagram: handle('instagram'),
      tiktok: handle('tiktok'),
      email,
      rating: s.rating === '' || s.rating === null || s.rating === undefined ? null : Math.min(5, Math.max(0, Number(s.rating) || 0)),
      reviews: optInt(s, 'reviews', { min: 0 }),
      sold: optInt(s, 'sold', { min: 0 }),
      statsDate: date(s, 'statsDate', { required: false }) ?? '',
    };
    await q(`insert into settings (key, value) values ('store', $1::text::jsonb) on conflict (key) do update set value = excluded.value`, [JSON.stringify(store)]);
  }
  return getSettings(q);
}

// ---------- brands ----------

export async function listBrands(q: Q) {
  return q(`select b.id, b.slug, b.name, b.description, b.logo_url as "logoUrl", b.sort,
              (select count(*)::int from products p where p.brand_id = b.id) as products,
              (select count(*)::int from products p where p.brand_id = b.id and p.status = 'published') as published
            from brands b order by b.sort, lower(b.name)`);
}

async function uniqueSlug(q: Q, table: 'brands' | 'products', base: string, exceptId?: number) {
  let slug = slugify(base);
  for (let i = 2; ; i++) {
    const [hit] = await q(`select id from ${table} where slug = $1 and ($2::int is null or id <> $2::int)`, [slug, exceptId ?? null]);
    if (!hit) return slug;
    slug = `${slugify(base).slice(0, 74)}-${i}`;
  }
}

export async function saveBrand(q: Q, body: unknown, id?: number) {
  const o = obj(body);
  const name = str(o, 'name', { required: true, max: 80 });
  const description = str(o, 'description', { max: 1200 });
  const logoUrl = str(o, 'logoUrl', { max: 600 });
  if (logoUrl && !/^(https:\/\/|\/api\/media\/)/.test(logoUrl)) throw new InputError('logoUrl', 'Logo must be an uploaded image or an https:// link.');
  const sort = int(o, 'sort', { min: -1000, max: 1000 });
  const slug = await uniqueSlug(q, 'brands', str(o, 'slug', { max: 80 }) || name, id);
  if (id) {
    const [row] = await q(`update brands set name=$1, slug=$2, description=$3, logo_url=$4, sort=$5 where id=$6 returning id`, [name, slug, description, logoUrl, sort, id]);
    if (!row) throw new NotFound('Brand');
    return row;
  }
  const [row] = await q(`insert into brands (name, slug, description, logo_url, sort) values ($1,$2,$3,$4,$5) returning id`, [name, slug, description, logoUrl, sort]);
  return row;
}

export async function brandIdByName(q: Q, name: string): Promise<number | null> {
  const n = name.trim();
  if (!n) return null;
  const [hit] = await q<{ id: number }>(`select id from brands where lower(name) = lower($1) or slug = $2`, [n, slugify(n)]);
  if (hit) return hit.id;
  const [row] = await q<{ id: number }>(`insert into brands (name, slug) values ($1, $2) returning id`, [n, await uniqueSlug(q, 'brands', n)]);
  return row.id;
}

export class NotFound extends Error {
  constructor(what: string) {
    super(`${what} not found.`);
  }
}

// ---------- products ----------

const PRODUCT_COLS = `p.id, p.slug, p.sku, p.name, p.brand_id as "brandId", b.name as "brandName", b.slug as "brandSlug",
  p.category, p.sleeve, p.gender, p.description, p.specs, p.colors, p.images, p.price, p.sale_price as "salePrice",
  p.cost_price as "costPrice", p.tokopedia_url as "tokopediaUrl", p.tokopedia_sold as "tokopediaSold", p.preorder,
  p.preorder_days as "preorderDays", p.featured, p.is_new as "isNew", p.status, p.restock_note as "restockNote",
  ${TS('p.created_at')} as "createdAt", ${TS('p.updated_at')} as "updatedAt"`;

async function stockFor(q: Q, ids: number[]) {
  if (!ids.length) return new Map<number, { size: string; qty: number }[]>();
  const rows = await q<{ product_id: number; size: string; qty: number }>(
    `select product_id, size, qty from stock where product_id = any($1::int[]) order by product_id, sort, size`,
    [ids],
  );
  const map = new Map<number, { size: string; qty: number }[]>();
  for (const r of rows) {
    const list = map.get(r.product_id) ?? [];
    list.push({ size: r.size, qty: r.qty });
    map.set(r.product_id, list);
  }
  return map;
}

async function soldFor(q: Q) {
  const rows = await q<{ product_id: number; units: number }>(
    `select product_id, sum(qty)::int as units from sales where product_id is not null and status in (${REV}) group by product_id`,
  );
  return new Map(rows.map((r) => [r.product_id, r.units]));
}

export async function listProducts(q: Q) {
  const rows = await q(`select ${PRODUCT_COLS} from products p left join brands b on b.id = p.brand_id order by p.updated_at desc`);
  const stock = await stockFor(q, rows.map((r) => r.id));
  const sold = await soldFor(q);
  return rows.map((r) => ({ ...r, stock: stock.get(r.id) ?? [], unitsSold: sold.get(r.id) ?? 0 }));
}

export async function getProduct(q: Q, id: number) {
  const [row] = await q(`select ${PRODUCT_COLS} from products p left join brands b on b.id = p.brand_id where p.id = $1`, [id]);
  if (!row) throw new NotFound('Product');
  const stock = await stockFor(q, [id]);
  return { ...row, stock: stock.get(id) ?? [] };
}

const TOKOPEDIA_HOSTS = ['tokopedia.com', 'www.tokopedia.com', 'm.tokopedia.com', 'tk.tokopedia.com', 'tokopedia.link', 'vt.tokopedia.com'];

export function checkTokopediaUrl(url: string, field = 'tokopediaUrl') {
  if (!url) return '';
  let u: URL;
  try { u = new URL(url); } catch { throw new InputError(field, 'Tokopedia link must be a full address starting with https://'); }
  if (u.protocol !== 'https:' || !TOKOPEDIA_HOSTS.includes(u.hostname)) throw new InputError(field, 'Tokopedia link must be a tokopedia.com address.');
  return u.toString();
}

function images(v: unknown, field = 'images') {
  const list = strList(v, { max: 12, maxLen: 800 });
  for (const url of list) if (!/^(https:\/\/|\/api\/media\/|\/campaign\/)/.test(url)) throw new InputError(field, 'Images must be uploaded files or https:// links.');
  return list;
}

function pairs(v: unknown, field: string, a: string, b: string, check?: (x: string) => boolean) {
  if (v === undefined || v === null || v === '') return [];
  if (!Array.isArray(v)) throw new InputError(field, `${field} must be a list.`);
  return v.slice(0, 30).map((x) => {
    const o = obj(x);
    const first = str(o, a, { max: 80 });
    const second = str(o, b, { max: 300 });
    if (check && second && !check(second)) throw new InputError(field, `Invalid value "${second}".`);
    return { [a]: first, [b]: second };
  }).filter((x) => x[a] || x[b]);
}

function parseProduct(body: unknown) {
  const o = obj(body);
  const price = int(o, 'price', { required: true, min: 0, max: 1_000_000_000 });
  const salePrice = optInt(o, 'salePrice', { min: 0, max: 1_000_000_000 });
  if (salePrice !== null && salePrice >= price && price > 0) throw new InputError('salePrice', 'Sale price must be lower than the regular price.');
  const stockIn = o.stock === undefined ? undefined : Array.isArray(o.stock) ? o.stock : null;
  if (stockIn === null) throw new InputError('stock', 'Stock must be a list of sizes.');
  const seen = new Set<string>();
  const stock = stockIn?.slice(0, 40).map((x) => {
    const s = obj(x);
    const size = str(s, 'size', { required: true, max: 24 });
    if (seen.has(size.toLowerCase())) throw new InputError('stock', `Size ${size} is listed twice.`);
    seen.add(size.toLowerCase());
    return { size, qty: int(s, 'qty', { min: -100000, max: 1_000_000 }) };
  });
  return {
    name: str(o, 'name', { required: true, max: 200 }),
    slug: str(o, 'slug', { max: 90 }),
    sku: str(o, 'sku', { max: 60 }),
    brandId: optInt(o, 'brandId', { min: 1 }),
    category: oneOf(o, 'category', CATEGORIES, 'polo'),
    sleeve: oneOf(o, 'sleeve', SLEEVES, ''),
    gender: oneOf(o, 'gender', GENDERS, 'unisex'),
    description: str(o, 'description', { max: 6000 }),
    specs: pairs(o.specs, 'specs', 'label', 'value'),
    colors: pairs(o.colors, 'colors', 'name', 'hex', (h) => /^#[0-9a-f]{6}$/i.test(h)),
    images: images(o.images),
    price,
    salePrice,
    costPrice: optInt(o, 'costPrice', { min: 0, max: 1_000_000_000 }),
    tokopediaUrl: checkTokopediaUrl(str(o, 'tokopediaUrl', { max: 800 })),
    tokopediaSold: int(o, 'tokopediaSold', { min: 0, max: 100_000_000 }),
    preorder: bool(o, 'preorder'),
    preorderDays: optInt(o, 'preorderDays', { min: 1, max: 90 }),
    featured: bool(o, 'featured'),
    isNew: bool(o, 'isNew'),
    status: oneOf(o, 'status', PRODUCT_STATUSES, 'draft'),
    restockNote: str(o, 'restockNote', { max: 300 }),
    stock,
  };
}

export async function saveProduct(db: Db, body: unknown, id?: number) {
  const p = parseProduct(body);
  return db.tx(async (q) => {
    const slug = await uniqueSlug(q, 'products', p.slug || p.name, id);
    const vals = [
      p.name, slug, p.sku, p.brandId, p.category, p.sleeve, p.gender, p.description, JSON.stringify(p.specs),
      JSON.stringify(p.colors), JSON.stringify(p.images), p.price, p.salePrice, p.costPrice, p.tokopediaUrl,
      p.tokopediaSold, p.preorder, p.preorderDays, p.featured, p.isNew, p.status, p.restockNote,
    ];
    let productId = id;
    if (id) {
      const [row] = await q(
        `update products set name=$1, slug=$2, sku=$3, brand_id=$4, category=$5, sleeve=$6, gender=$7, description=$8,
           specs=$9::text::jsonb, colors=$10::text::jsonb, images=$11::text::jsonb, price=$12, sale_price=$13, cost_price=$14,
           tokopedia_url=$15, tokopedia_sold=$16, preorder=$17, preorder_days=$18, featured=$19, is_new=$20, status=$21,
           restock_note=$22, updated_at=now() where id=$23 returning id`,
        [...vals, id],
      );
      if (!row) throw new NotFound('Product');
    } else {
      const [row] = await q<{ id: number }>(
        `insert into products (name, slug, sku, brand_id, category, sleeve, gender, description, specs, colors, images, price,
           sale_price, cost_price, tokopedia_url, tokopedia_sold, preorder, preorder_days, featured, is_new, status, restock_note)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9::text::jsonb,$10::text::jsonb,$11::text::jsonb,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
         returning id`,
        vals,
      );
      productId = row.id;
    }
    if (p.stock) await replaceStock(q, productId!, p.stock);
    return { id: productId };
  });
}

async function replaceStock(q: Q, productId: number, stock: { size: string; qty: number }[]) {
  await q(`delete from stock where product_id = $1 and not (size = any($2::text[]))`, [productId, stock.map((s) => s.size)]);
  for (const [i, s] of stock.entries()) {
    await q(
      `insert into stock (product_id, size, qty, sort) values ($1,$2,$3,$4)
       on conflict (product_id, size) do update set qty = excluded.qty, sort = excluded.sort`,
      [productId, s.size, s.qty, i],
    );
  }
}

async function adjustStock(q: Q, productId: number | null, size: string, delta: number) {
  if (!productId || !size || !delta) return;
  await q(
    `insert into stock (product_id, size, qty, sort) values ($1, $2, $3, 999)
     on conflict (product_id, size) do update set qty = stock.qty + excluded.qty`,
    [productId, size, delta],
  );
}

export async function deleteProduct(q: Q, id: number) {
  const [row] = await q(`delete from products where id = $1 returning id`, [id]);
  if (!row) throw new NotFound('Product');
}

/** Bulk create or update from imported rows. Matches on Tokopedia link, then SKU, then name. */
export async function importProducts(db: Db, body: unknown) {
  const o = obj(body);
  if (!Array.isArray(o.rows)) throw new InputError('rows', 'Nothing to import.');
  if (o.rows.length > 2000) throw new InputError('rows', 'Import at most 2,000 rows at a time.');
  const result = { created: 0, updated: 0, errors: [] as { row: number; message: string }[] };
  for (const [i, raw] of o.rows.entries()) {
    try {
      const r = obj(raw);
      await db.tx(async (q) => {
        // Only the columns present in the row are applied, so a partial import updates without erasing.
        const has = (...keys: string[]) => keys.find((k) => r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '');
        const input: Record<string, unknown> = {};
        const map: [string, string[]][] = [
          ['name', ['name']], ['sku', ['sku']], ['category', ['category']], ['sleeve', ['sleeve']], ['gender', ['gender']],
          ['description', ['description']], ['price', ['price']], ['salePrice', ['sale_price', 'salePrice']],
          ['costPrice', ['cost_price', 'costPrice']], ['tokopediaUrl', ['tokopedia_url', 'tokopediaUrl']],
          ['tokopediaSold', ['tokopedia_sold', 'tokopediaSold']], ['images', ['images']], ['preorder', ['preorder']],
          ['preorderDays', ['preorder_days', 'preorderDays']], ['featured', ['featured']], ['isNew', ['is_new', 'isNew']],
          ['status', ['status']],
        ];
        for (const [field, keys] of map) {
          const k = has(...keys);
          if (k) input[field] = typeof r[k] === 'string' ? (r[k] as string).trim() : r[k];
        }
        const brandName = has('brand') ? str(r, 'brand', { max: 80 }) : '';
        if (brandName) input.brandId = await brandIdByName(q, brandName);
        if (has('colors')) {
          input.colors = strList(r.colors, { max: 20, maxLen: 40 }).map((c) => {
            const [name, hex] = c.split(':');
            return { name: name.trim(), hex: (hex ?? '').trim() };
          });
        }
        if (has('stock')) {
          input.stock = strList(r.stock, { max: 40, maxLen: 40 }).map((x) => {
            const [size, qty] = x.split(':');
            return { size: size.trim(), qty: Number(qty) || 0 };
          });
        } else if (has('sizes')) {
          input.sizes = strList(r.sizes, { max: 40, maxLen: 24 });
        }
        const tUrl = input.tokopediaUrl ? checkTokopediaUrl(String(input.tokopediaUrl), 'tokopedia_url') : '';
        let [hit] = tUrl ? await q<{ id: number }>(`select id from products where tokopedia_url = $1`, [tUrl]) : [];
        if (!hit && input.sku) [hit] = await q<{ id: number }>(`select id from products where sku = $1`, [input.sku]);
        if (!hit && input.name) [hit] = await q<{ id: number }>(`select id from products where lower(name) = lower($1)`, [input.name]);
        const existing: Record<string, any> = hit ? await getProduct(q, hit.id) : { status: 'draft' };
        if (input.sizes) {
          // A sizes column adds missing sizes with zero stock and keeps the counts already recorded.
          const known = new Map((existing.stock ?? []).map((s: { size: string; qty: number }) => [s.size.toLowerCase(), s.qty]));
          input.stock = (input.sizes as string[]).map((size) => ({ size, qty: known.get(size.toLowerCase()) ?? 0 }));
          delete input.sizes;
        }
        const fake: Db = { query: q, tx: (fn) => fn(q) };
        await saveProduct(fake, { ...existing, ...input, slug: existing.slug }, hit?.id);
        if (hit) result.updated++; else result.created++;
      });
    } catch (err) {
      result.errors.push({ row: i + 1, message: err instanceof Error ? err.message : 'Could not import this row.' });
    }
  }
  return result;
}


// ---------- public catalog ----------

export async function publicCatalog(q: Q): Promise<CatalogPayload> {
  const rows = await q(`select ${PRODUCT_COLS} from products p left join brands b on b.id = p.brand_id where p.status = 'published' order by p.created_at desc`);
  const stock = await stockFor(q, rows.map((r) => r.id));
  const sold = await soldFor(q);
  const products: PublicProduct[] = rows.map((r: Row) => {
    const s = stock.get(r.id) ?? [];
    const total = s.reduce((n, x) => n + Math.max(0, x.qty), 0);
    let availability: Availability;
    if (r.preorder) availability = 'preorder';
    else if (!s.length) availability = 'unknown';
    else if (total <= 0) availability = 'sold_out';
    else if (total <= LOW_STOCK) availability = 'low_stock';
    else availability = 'in_stock';
    return {
      id: r.id, slug: r.slug, sku: r.sku, name: r.name,
      brand: r.brandSlug ? { slug: r.brandSlug, name: r.brandName } : null,
      category: r.category, sleeve: r.sleeve, gender: r.gender, description: r.description,
      specs: r.specs ?? [], colors: r.colors ?? [], images: r.images ?? [],
      price: r.price, salePrice: r.salePrice, tokopediaUrl: r.tokopediaUrl, preorder: r.preorder,
      preorderDays: r.preorderDays, featured: r.featured, isNew: r.isNew, createdAt: r.createdAt,
      sizes: s.map((x) => ({ size: x.size, available: r.preorder || x.qty > 0, low: !r.preorder && x.qty > 0 && x.qty <= LOW_STOCK ? x.qty : null })),
      availability,
      sold: (sold.get(r.id) ?? 0) + (r.tokopediaSold ?? 0),
    };
  });
  const counts = new Map<string, number>();
  for (const p of products) if (p.brand) counts.set(p.brand.slug, (counts.get(p.brand.slug) ?? 0) + 1);
  const brandRows = await q(`select slug, name, description, logo_url as "logoUrl" from brands order by sort, lower(name)`);
  const brands = brandRows.filter((b) => counts.has(b.slug)).map((b) => ({ ...b, count: counts.get(b.slug)! })) as CatalogPayload['brands'];
  return {
    products,
    brands,
    ranking: products.some((p) => p.sold > 0) ? 'sales' : 'featured',
    settings: await getSettings(q),
    updatedAt: new Date().toISOString(),
  };
}

// ---------- sales ----------

const SALE_COLS = `s.id, ${D('s.order_date')} as "orderDate", s.product_id as "productId", s.product_name as "productName", s.brand, s.size,
  s.qty, s.unit_price as "unitPrice", s.discount, s.status, s.marketplace, s.marketplace_ref as "marketplaceRef", s.note,
  s.deduct_stock as "deductStock", (s.qty::bigint * s.unit_price - s.discount)::float8 as revenue`;

function period(params: URLSearchParams, col: string, args: unknown[]) {
  const where: string[] = [];
  const year = Number(params.get('year'));
  const month = Number(params.get('month'));
  if (year >= 2000 && year <= 2100) { args.push(year); where.push(`extract(year from ${col})::int = $${args.length}`); }
  if (month >= 1 && month <= 12) { args.push(month); where.push(`extract(month from ${col})::int = $${args.length}`); }
  return where;
}

export async function listSales(q: Q, params: URLSearchParams) {
  const args: unknown[] = [];
  const where = period(params, 's.order_date', args);
  const status = params.get('status');
  if (status && (SALE_STATUSES as readonly string[]).includes(status)) { args.push(status); where.push(`s.status = $${args.length}`); }
  return q(`select ${SALE_COLS} from sales s ${where.length ? 'where ' + where.join(' and ') : ''} order by s.order_date desc, s.id desc limit 5000`, args);
}

async function parseSale(q: Q, body: unknown) {
  const o = obj(body);
  const productId = optInt(o, 'productId', { min: 1 });
  let productName = str(o, 'productName', { max: 200 });
  let brand = str(o, 'brand', { max: 80 });
  if (productId) {
    const [p] = await q<{ name: string; brand: string | null }>(`select p.name, b.name as brand from products p left join brands b on b.id = p.brand_id where p.id = $1`, [productId]);
    if (!p) throw new InputError('productId', 'That product no longer exists.');
    productName ||= p.name;
    brand ||= p.brand ?? '';
  }
  if (!productName) throw new InputError('productName', 'Choose a product or type its name.');
  const qty = int(o, 'qty', { required: true, min: 1, max: 10000 });
  const unitPrice = int(o, 'unitPrice', { required: true, min: 0, max: 1_000_000_000 });
  const discount = int(o, 'discount', { min: 0, max: 1_000_000_000 });
  if (discount > qty * unitPrice) throw new InputError('discount', 'Discount cannot be more than the order value.');
  return {
    orderDate: date(o, 'orderDate')!, productId, productName, brand, size: str(o, 'size', { max: 24 }), qty, unitPrice, discount,
    status: oneOf(o, 'status', SALE_STATUSES, 'completed'), marketplace: str(o, 'marketplace', { max: 40, fallback: 'Tokopedia' }),
    marketplaceRef: str(o, 'marketplaceRef', { max: 80 }), note: str(o, 'note', { max: 500 }), deductStock: bool(o, 'deductStock', true),
  };
}

type SaleLike = { productId: number | null; size: string; qty: number; status: string; deductStock: boolean };
const saleTakesStock = (s: SaleLike) => s.deductStock && !!s.productId && !!s.size && (STOCK_STATUSES as readonly string[]).includes(s.status);

export async function saveSale(db: Db, body: unknown, id?: number) {
  return db.tx(async (q) => {
    const s = await parseSale(q, body);
    if (id) {
      const [old] = await q<SaleLike & { id: number }>(`select id, product_id as "productId", size, qty, status, deduct_stock as "deductStock" from sales where id = $1 for update`, [id]);
      if (!old) throw new NotFound('Sale');
      if (saleTakesStock(old)) await adjustStock(q, old.productId, old.size, old.qty);
      await q(
        `update sales set order_date=$1, product_id=$2, product_name=$3, brand=$4, size=$5, qty=$6, unit_price=$7, discount=$8,
           status=$9, marketplace=$10, marketplace_ref=$11, note=$12, deduct_stock=$13 where id=$14`,
        [s.orderDate, s.productId, s.productName, s.brand, s.size, s.qty, s.unitPrice, s.discount, s.status, s.marketplace, s.marketplaceRef, s.note, s.deductStock, id],
      );
    } else {
      const [row] = await q<{ id: number }>(
        `insert into sales (order_date, product_id, product_name, brand, size, qty, unit_price, discount, status, marketplace, marketplace_ref, note, deduct_stock)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id`,
        [s.orderDate, s.productId, s.productName, s.brand, s.size, s.qty, s.unitPrice, s.discount, s.status, s.marketplace, s.marketplaceRef, s.note, s.deductStock],
      );
      id = row.id;
    }
    if (saleTakesStock(s)) await adjustStock(q, s.productId, s.size, -s.qty);
    return { id };
  });
}

export async function deleteSale(db: Db, id: number) {
  return db.tx(async (q) => {
    const [old] = await q<SaleLike>(`delete from sales where id = $1 returning product_id as "productId", size, qty, status, deduct_stock as "deductStock"`, [id]);
    if (!old) throw new NotFound('Sale');
    if (saleTakesStock(old)) await adjustStock(q, old.productId, old.size, old.qty);
  });
}

// ---------- expenses ----------

const EXPENSE_COLS = `e.id, ${D('e.date')} as date, e.category, e.description, e.amount, e.vendor, e.product_id as "productId", p.name as "productName", e.note,
  (select r.id from restocks r where r.expense_id = e.id limit 1) as "restockId"`;

export async function listExpenses(q: Q, params: URLSearchParams) {
  const args: unknown[] = [];
  const where = period(params, 'e.date', args);
  const cat = params.get('category');
  if (cat && (EXPENSE_CATEGORIES as readonly string[]).includes(cat)) { args.push(cat); where.push(`e.category = $${args.length}`); }
  return q(`select ${EXPENSE_COLS} from expenses e left join products p on p.id = e.product_id ${where.length ? 'where ' + where.join(' and ') : ''} order by e.date desc, e.id desc limit 5000`, args);
}

export async function saveExpense(q: Q, body: unknown, id?: number) {
  const o = obj(body);
  const vals = [
    date(o, 'date')!, oneOf(o, 'category', EXPENSE_CATEGORIES), str(o, 'description', { required: true, max: 200 }),
    int(o, 'amount', { required: true, min: 1, max: 10_000_000_000 }), str(o, 'vendor', { max: 120 }), optInt(o, 'productId', { min: 1 }),
    str(o, 'note', { max: 500 }),
  ];
  if (id) {
    const [row] = await q(`update expenses set date=$1, category=$2, description=$3, amount=$4, vendor=$5, product_id=$6, note=$7 where id=$8 returning id`, [...vals, id]);
    if (!row) throw new NotFound('Expense');
    return row;
  }
  const [row] = await q(`insert into expenses (date, category, description, amount, vendor, product_id, note) values ($1,$2,$3,$4,$5,$6,$7) returning id`, vals);
  return row;
}

export async function deleteExpense(q: Q, id: number) {
  const [row] = await q(`delete from expenses where id = $1 returning id`, [id]);
  if (!row) throw new NotFound('Expense');
}

// ---------- restocks ----------

export async function listRestocks(q: Q) {
  return q(`select r.id, r.product_id as "productId", p.name as "productName", ${D('r.date')} as date, r.size, r.qty, r.unit_cost as "unitCost",
              r.supplier, r.status, ${D('r.expected_date')} as "expectedDate", r.note, r.expense_id as "expenseId"
            from restocks r join products p on p.id = r.product_id order by r.date desc, r.id desc limit 2000`);
}

type RestockLike = { productId: number; size: string; qty: number; status: string };
const restockAdds = (r: RestockLike) => r.status === 'received' && !!r.size;

export async function saveRestock(db: Db, body: unknown, id?: number) {
  const o = obj(body);
  const r = {
    productId: int(o, 'productId', { required: true, min: 1 }), date: date(o, 'date')!, size: str(o, 'size', { required: true, max: 24 }),
    qty: int(o, 'qty', { required: true, min: 1, max: 1_000_000 }), unitCost: optInt(o, 'unitCost', { min: 0, max: 1_000_000_000 }),
    supplier: str(o, 'supplier', { max: 120 }), status: oneOf(o, 'status', RESTOCK_STATUSES, 'received'),
    expectedDate: date(o, 'expectedDate', { required: false }), note: str(o, 'note', { max: 500 }), recordExpense: bool(o, 'recordExpense'),
  };
  return db.tx(async (q) => {
    const [p] = await q<{ name: string }>(`select name from products where id = $1`, [r.productId]);
    if (!p) throw new InputError('productId', 'That product no longer exists.');
    let expenseId: number | null = null;
    if (id) {
      const [old] = await q<RestockLike & { expenseId: number | null }>(`select product_id as "productId", size, qty, status, expense_id as "expenseId" from restocks where id = $1 for update`, [id]);
      if (!old) throw new NotFound('Restock');
      if (restockAdds(old)) await adjustStock(q, old.productId, old.size, -old.qty);
      expenseId = old.expenseId;
    }
    const amount = r.unitCost !== null ? r.unitCost * r.qty : 0;
    const description = `Restock: ${p.name} (${r.size}) x${r.qty}`;
    if (r.recordExpense && amount > 0) {
      if (expenseId) await q(`update expenses set date=$1, amount=$2, description=$3, vendor=$4, product_id=$5 where id=$6`, [r.date, amount, description, r.supplier, r.productId, expenseId]);
      else [{ id: expenseId }] = await q<{ id: number }>(`insert into expenses (date, category, description, amount, vendor, product_id) values ($1,'acquisition',$2,$3,$4,$5) returning id`, [r.date, description, amount, r.supplier, r.productId]);
    } else if (expenseId) {
      await q(`delete from expenses where id = $1`, [expenseId]);
      expenseId = null;
    }
    const vals = [r.productId, r.date, r.size, r.qty, r.unitCost, r.supplier, r.status, r.expectedDate, r.note, expenseId];
    if (id) await q(`update restocks set product_id=$1, date=$2, size=$3, qty=$4, unit_cost=$5, supplier=$6, status=$7, expected_date=$8, note=$9, expense_id=$10 where id=$11`, [...vals, id]);
    else [{ id }] = await q<{ id: number }>(`insert into restocks (product_id, date, size, qty, unit_cost, supplier, status, expected_date, note, expense_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`, vals);
    if (restockAdds(r)) await adjustStock(q, r.productId, r.size, r.qty);
    return { id };
  });
}

export async function deleteRestock(db: Db, id: number) {
  return db.tx(async (q) => {
    const [old] = await q<RestockLike & { expenseId: number | null }>(`delete from restocks where id = $1 returning product_id as "productId", size, qty, status, expense_id as "expenseId"`, [id]);
    if (!old) throw new NotFound('Restock');
    if (restockAdds(old)) await adjustStock(q, old.productId, old.size, -old.qty);
    if (old.expenseId) await q(`delete from expenses where id = $1`, [old.expenseId]);
  });
}

// ---------- inventory ----------

export async function inventory(q: Q) {
  return q(`select p.id as "productId", p.name, p.sku, b.name as brand, p.category, p.status, p.preorder, p.restock_note as "restockNote",
              s.size, s.qty,
              (select ${D('min(r.expected_date)')} from restocks r where r.product_id = p.id and r.status = 'ordered') as "nextRestock",
              (select coalesce(sum(r.qty),0)::int from restocks r where r.product_id = p.id and r.status = 'ordered' and r.size = s.size) as "onOrder"
            from products p left join brands b on b.id = p.brand_id left join stock s on s.product_id = p.id
            order by lower(p.name), s.sort, s.size`);
}

// ---------- finance ----------

export async function years(q: Q): Promise<number[]> {
  const rows = await q<{ y: number }>(`select distinct extract(year from order_date)::int as y from sales
                                       union select distinct extract(year from date)::int from expenses order by 1 desc`);
  return rows.map((r) => r.y);
}

type MonthRow = { m: number; revenue: number; orders: number; units: number; discounts: number; pending: number };

export async function summary(q: Q, year: number) {
  const sales = await q<MonthRow>(
    `select extract(month from order_date)::int as m,
            coalesce(sum(qty::bigint * unit_price - discount) filter (where status in (${REV})), 0)::float8 as revenue,
            count(*) filter (where status in (${REV}))::int as orders,
            coalesce(sum(qty) filter (where status in (${REV})), 0)::int as units,
            coalesce(sum(discount) filter (where status in (${REV})), 0)::float8 as discounts,
            coalesce(sum(qty::bigint * unit_price - discount) filter (where status = 'pending'), 0)::float8 as pending
       from sales where extract(year from order_date)::int = $1 group by 1`,
    [year],
  );
  const exp = await q<{ m: number; category: string; amount: number }>(
    `select extract(month from date)::int as m, category, sum(amount)::float8 as amount from expenses
      where extract(year from date)::int = $1 group by 1, 2`,
    [year],
  );
  const months = Array.from({ length: 12 }, (_, i) => {
    const s = sales.find((r) => r.m === i + 1);
    const byCat = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, exp.find((e) => e.m === i + 1 && e.category === c)?.amount ?? 0])) as Record<string, number>;
    return finance(i + 1, s, byCat);
  });
  const total = finance(0, {
    m: 0,
    revenue: sum(months, 'revenue'), orders: sum(months, 'orders'), units: sum(months, 'units'), discounts: sum(months, 'discounts'), pending: sum(months, 'pending'),
  }, Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, months.reduce((n, m) => n + m.expenses[c], 0)])));
  const top = await q(
    `select coalesce(p.name, s.product_name) as name, coalesce(b.name, s.brand) as brand, sum(s.qty)::int as units,
            sum(s.qty::bigint * s.unit_price - s.discount)::float8 as revenue
       from sales s left join products p on p.id = s.product_id left join brands b on b.id = p.brand_id
      where extract(year from s.order_date)::int = $1 and s.status in (${REV}) group by 1, 2 order by revenue desc limit 8`,
    [year],
  );
  const [counts] = await q<{ pending: number; lowStock: number; outOfStock: number; onOrder: number }>(
    `select (select count(*)::int from sales where status = 'pending') as pending,
            (select count(*)::int from stock where qty > 0 and qty <= ${LOW_STOCK}) as "lowStock",
            (select count(*)::int from stock where qty <= 0) as "outOfStock",
            (select count(*)::int from restocks where status = 'ordered') as "onOrder"`,
  );
  return { year, months, total, top, counts };
}

function sum<T>(rows: T[], key: keyof T) {
  return rows.reduce((n, r) => n + Number(r[key] ?? 0), 0);
}

function finance(month: number, s: MonthRow | undefined, expenses: Record<string, number>) {
  const revenue = s?.revenue ?? 0;
  const acquisition = expenses.acquisition ?? 0;
  const totalExpenses = Object.values(expenses).reduce((n, v) => n + v, 0);
  const grossProfit = revenue - acquisition;
  const netProfit = revenue - totalExpenses;
  return {
    month, revenue, orders: s?.orders ?? 0, units: s?.units ?? 0, discounts: s?.discounts ?? 0, pending: s?.pending ?? 0,
    expenses, totalExpenses, grossProfit, netProfit,
    grossMargin: revenue > 0 ? grossProfit / revenue : null,
    netMargin: revenue > 0 ? netProfit / revenue : null,
  };
}

export async function yearly(q: Q) {
  const ys = await years(q);
  const out = [];
  for (const y of ys.slice().sort()) out.push({ ...(await summary(q, y)).total, year: y });
  return out;
}

// ---------- subscribers ----------

export async function addSubscriber(q: Q, email: string, lang: string) {
  await q(`insert into subscribers (email, lang) values (lower($1), $2) on conflict (email) do nothing`, [email, lang === 'en' ? 'en' : 'id']);
}

export async function listSubscribers(q: Q) {
  return q(`select id, email, lang, ${TS('created_at')} as "createdAt" from subscribers order by created_at desc`);
}

export async function deleteSubscriber(q: Q, id: number) {
  await q(`delete from subscribers where id = $1`, [id]);
}

// ---------- media ----------

export async function putMedia(q: Q, mime: string, bytes: Uint8Array) {
  const id = randomUUID().replace(/-/g, '');
  // A Buffer is what postgres.js sends as bytea (PGlite accepts it too).
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  await q(`insert into media (id, mime, bytes, size) values ($1, $2, $3, $4)`, [id, mime, buf, buf.byteLength]);
  return { id, url: `/api/media/${id}` };
}

export async function getMedia(q: Q, id: string) {
  const [row] = await q<{ mime: string; bytes: Uint8Array }>(`select mime, bytes from media where id = $1`, [id]);
  return row ?? null;
}
