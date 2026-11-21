// Database access. Production: Postgres from DATABASE_URL (or POSTGRES_URL, as set by the Vercel
// Neon integration) through postgres.js. Local development and tests: an embedded Postgres
// (PGlite) when GW_LOCAL_DB is set. Both speak the same SQL, so there is one schema and one set
// of queries. Every date and aggregate is cast in SQL so both drivers return the same shapes.

export type Row = Record<string, any>;

export interface Db {
  query<T extends Row = Row>(text: string, params?: unknown[]): Promise<T[]>;
  tx<T>(fn: (q: Db['query']) => Promise<T>): Promise<T>;
}

export type DbState =
  | { ok: true; db: Db }
  | { ok: false; reason: 'not_configured' | 'unreachable'; message: string };

const SCHEMA = `
create table if not exists brands (
  id serial primary key,
  slug text not null unique,
  name text not null,
  description text not null default '',
  logo_url text not null default '',
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists products (
  id serial primary key,
  slug text not null unique,
  sku text not null default '',
  name text not null,
  brand_id int references brands(id) on delete set null,
  category text not null default 'polo',
  sleeve text not null default '',
  gender text not null default 'unisex',
  description text not null default '',
  specs jsonb not null default '[]',
  colors jsonb not null default '[]',
  images jsonb not null default '[]',
  price int not null default 0,
  sale_price int,
  cost_price int,
  tokopedia_url text not null default '',
  tokopedia_sold int not null default 0,
  preorder boolean not null default false,
  preorder_days int,
  featured boolean not null default false,
  is_new boolean not null default false,
  status text not null default 'draft',
  restock_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_brand_idx on products(brand_id);
create table if not exists stock (
  product_id int not null references products(id) on delete cascade,
  size text not null,
  qty int not null default 0,
  sort int not null default 0,
  primary key (product_id, size)
);
create table if not exists expenses (
  id serial primary key,
  date date not null,
  category text not null,
  description text not null default '',
  amount int not null,
  vendor text not null default '',
  product_id int references products(id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists expenses_date_idx on expenses(date);
create table if not exists restocks (
  id serial primary key,
  product_id int not null references products(id) on delete cascade,
  date date not null,
  size text not null default '',
  qty int not null,
  unit_cost int,
  supplier text not null default '',
  status text not null default 'received',
  expected_date date,
  note text not null default '',
  expense_id int references expenses(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists sales (
  id serial primary key,
  order_date date not null,
  product_id int references products(id) on delete set null,
  product_name text not null,
  brand text not null default '',
  size text not null default '',
  qty int not null default 1,
  unit_price int not null default 0,
  discount int not null default 0,
  status text not null default 'completed',
  marketplace text not null default 'Tokopedia',
  marketplace_ref text not null default '',
  note text not null default '',
  deduct_stock boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists sales_date_idx on sales(order_date);
create table if not exists subscribers (
  id serial primary key,
  email text not null unique,
  lang text not null default 'id',
  created_at timestamptz not null default now()
);
create table if not exists settings (
  key text primary key,
  value jsonb not null
);
create table if not exists media (
  id text primary key,
  mime text not null,
  bytes bytea not null,
  size int not null,
  created_at timestamptz not null default now()
);
create table if not exists login_attempts (
  id serial primary key,
  ip text not null,
  ok boolean not null,
  at timestamptz not null default now()
);
`;

function connectionString() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

async function open(): Promise<DbState> {
  const url = connectionString();
  let db: Db;
  if (url) {
    const { default: postgres } = await import('postgres');
    const sql = postgres(url, { max: 3, idle_timeout: 20, connect_timeout: 10, prepare: false, onnotice: () => {} });
    db = {
      query: async (text, params = []) => (await sql.unsafe(text, params as any[])) as any,
      tx: (fn) => sql.begin((t) => fn(async (text, params = []) => (await t.unsafe(text, params as any[])) as any)) as any,
    };
  } else if (process.env.GW_LOCAL_DB) {
    // Embedded Postgres for local development and tests; never bundled into the deployed function.
    const name = '@electric-sql/pglite';
    const { PGlite } = await import(/* @vite-ignore */ name);
    const dir = process.env.GW_LOCAL_DB === 'memory' ? undefined : process.env.GW_LOCAL_DB;
    const pg = new PGlite(dir);
    db = {
      query: async (text, params = []) => (await pg.query(text, params)).rows as any,
      tx: (fn) => pg.transaction(async (t: any) => fn(async (text, params = []) => (await t.query(text, params)).rows)),
    };
  } else {
    return { ok: false, reason: 'not_configured', message: 'No database connection is configured (DATABASE_URL).' };
  }
  try {
    for (const statement of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) await db.query(statement);
  } catch (err) {
    console.error('[db] schema setup failed', err);
    return { ok: false, reason: 'unreachable', message: 'The database could not be reached.' };
  }
  return { ok: true, db };
}

// Kept on globalThis so the dev server's module reloads reuse one connection.
const shared = globalThis as typeof globalThis & { __gwDb?: Promise<DbState> | null };

/** The shared connection, opened and migrated on first use. A failed attempt is retried next time. */
export async function getDb(): Promise<DbState> {
  if (!shared.__gwDb) shared.__gwDb = open();
  const state = await shared.__gwDb;
  if (!state.ok) shared.__gwDb = null;
  return state;
}
