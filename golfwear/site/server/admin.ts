// /api/admin/*  (private). Everything except login needs the signed session cookie.
//   POST   /api/admin/login            { password }
//   POST   /api/admin/logout
//   GET    /api/admin/session
//   GET    /api/admin/data             all sales, expenses, inventory, subscribers
//   POST   /api/admin/{table}          { rows: [...] }  (insert one or many; duplicates by marketplace reference are skipped)
//   PUT    /api/admin/{table}/{id}     partial update
//   DELETE /api/admin/{table}/{id}
import { HttpError, checkPassword, clean, clearCookie, clientIp, fail, getDb, json, readJson, requireSession, sessionCookie, type Schema } from './core';

export const SALE_STATUSES = ['completed', 'processing', 'cancelled', 'returned'];
export const EXPENSE_CATEGORIES = ['acquisition', 'shipping', 'operations', 'marketing', 'other'];

const TABLES: Record<string, { schema: Schema; order: string; conflict?: string }> = {
  sales: {
    order: 'order_date DESC, id DESC',
    conflict: 'ON CONFLICT DO NOTHING',
    schema: {
      order_date: { type: 'date', required: true }, product: { type: 'text', required: true, max: 200 }, brand: { type: 'text', max: 80, def: 'GOLFWEAR' },
      sku: { type: 'text', max: 80 }, size: { type: 'text', max: 20 }, quantity: { type: 'int', required: true },
      unit_price: { type: 'money', required: true }, discount: { type: 'money', def: 0 }, platform_fee: { type: 'money', def: 0 },
      status: { type: 'enum', values: SALE_STATUSES, def: 'completed' }, marketplace_ref: { type: 'text', max: 80 }, notes: { type: 'text', max: 500 },
    },
  },
  expenses: {
    order: 'expense_date DESC, id DESC',
    schema: {
      expense_date: { type: 'date', required: true }, category: { type: 'enum', values: EXPENSE_CATEGORIES, required: true },
      description: { type: 'text', max: 300, def: '' }, amount: { type: 'money', required: true },
    },
  },
  inventory: {
    order: 'product ASC',
    schema: {
      product: { type: 'text', required: true, max: 200 }, brand: { type: 'text', max: 80, def: 'GOLFWEAR' }, sku: { type: 'text', required: true, max: 80 },
      sizes: { type: 'text', max: 120, def: '' }, stock: { type: 'int', def: 0 }, unit_cost: { type: 'money', def: 0 },
      restock_level: { type: 'int', def: 0 }, restock_note: { type: 'text', max: 300, def: '' },
    },
  },
  subscribers: { order: 'created_at DESC', schema: {} },
};
const MONEY = new Set(['unit_price', 'discount', 'platform_fee', 'amount', 'unit_cost']);
const normalise = (row: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (MONEY.has(k) || k === 'id' || k === 'quantity' || k === 'stock' || k === 'restock_level') out[k] = v === null ? null : Number(v);
    else if (v instanceof Date) out[k] = k.endsWith('_date') ? v.toISOString().slice(0, 10) : v.toISOString();
    else if (typeof v === 'string' && k.endsWith('_date')) out[k] = v.slice(0, 10);
    else out[k] = v;
  }
  return out;
};

async function login(req: Request) {
  const db = await getDb();
  const ip = clientIp(req);
  const rows = await db.query(`SELECT count(*)::int AS n FROM login_attempts WHERE ip = $1 AND at > now() - interval '15 minutes'`, [`login:${ip}`]);
  if (Number(rows[0]?.n ?? 0) >= 8) throw new HttpError(429, 'too_many_attempts');
  const { password = '' } = await readJson<{ password?: string }>(req, 2_000);
  if (!(await checkPassword(String(password)))) {
    await db.query(`INSERT INTO login_attempts (ip) VALUES ($1)`, [`login:${ip}`]);
    await db.query(`DELETE FROM login_attempts WHERE at < now() - interval '1 day'`);
    throw new HttpError(401, 'wrong_password');
  }
  return json({ ok: true }, 200, { 'set-cookie': await sessionCookie() });
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const parts = new URL(req.url).pathname.replace(/^\/api\/admin\/?/, '').split('/').filter(Boolean);
    const [resource, id] = parts;
    if (resource === 'login' && req.method === 'POST') return await login(req);
    if (resource === 'logout' && req.method === 'POST') return json({ ok: true }, 200, { 'set-cookie': clearCookie() });

    await requireSession(req);
    const db = await getDb();
    if (resource === 'session' && req.method === 'GET') return json({ ok: true });

    if (resource === 'data' && req.method === 'GET') {
      const out: Record<string, unknown[]> = {};
      for (const [name, t] of Object.entries(TABLES)) out[name] = (await db.query(`SELECT * FROM ${name} ORDER BY ${t.order}`)).map(normalise);
      return json(out);
    }

    const table = TABLES[resource];
    if (!table) throw new HttpError(404, 'not_found');

    if (req.method === 'POST' && !id && resource !== 'subscribers') {
      const { rows = [] } = await readJson<{ rows?: Record<string, unknown>[] }>(req);
      if (!Array.isArray(rows) || rows.length === 0 || rows.length > 1000) throw new HttpError(400, 'invalid_rows');
      const cleaned = rows.map((r, i) => {
        try { return clean(r, table.schema); } catch (e) { throw new HttpError(400, `row_${i + 1}_${(e as Error).message}`); }
      });
      const cols = Object.keys(table.schema);
      let inserted = 0;
      for (let i = 0; i < cleaned.length; i += 100) {
        const chunk = cleaned.slice(i, i + 100);
        const values: unknown[] = [];
        const tuples = chunk.map((r) => `(${cols.map((c) => { values.push(r[c]); return `$${values.length}`; }).join(', ')})`);
        const res = await db.query(`INSERT INTO ${resource} (${cols.join(', ')}) VALUES ${tuples.join(', ')} ${table.conflict ?? ''} RETURNING id`, values);
        inserted += res.length;
      }
      return json({ inserted, skipped: cleaned.length - inserted }, 201);
    }

    const rowId = Number(id);
    if (!Number.isInteger(rowId) || rowId <= 0) throw new HttpError(404, 'not_found');
    if (req.method === 'PUT' && resource !== 'subscribers') {
      const patch = clean(await readJson<Record<string, unknown>>(req, 20_000), table.schema, true);
      const cols = Object.keys(patch);
      if (!cols.length) throw new HttpError(400, 'nothing_to_update');
      const sets = cols.map((c, i) => `${c} = $${i + 1}`).concat(resource === 'inventory' ? ['updated_at = now()'] : []);
      const rows = await db.query(`UPDATE ${resource} SET ${sets.join(', ')} WHERE id = $${cols.length + 1} RETURNING *`, [...cols.map((c) => patch[c]), rowId]);
      if (!rows.length) throw new HttpError(404, 'not_found');
      return json(normalise(rows[0]));
    }
    if (req.method === 'DELETE') {
      const rows = await db.query(`DELETE FROM ${resource} WHERE id = $1 RETURNING id`, [rowId]);
      if (!rows.length) throw new HttpError(404, 'not_found');
      return json({ ok: true });
    }
    throw new HttpError(405, 'method_not_allowed');
  } catch (e) {
    return fail(e);
  }
}
