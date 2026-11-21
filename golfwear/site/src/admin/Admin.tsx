import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { PRODUCTS } from '../data/products';
import { Logo } from '../components/Logo';
import {
  CATEGORIES, IMPORT_FIELDS, STATUSES, download, exporters, guessMapping, inYear, mapStatus, money, monthly, parseCsv, parseDate, parseMoney, pct, revenueOf, summarise, years,
  type Data, type Expense, type ImportKey, type Item, type Sale,
} from './finance';

type Table = 'sales' | 'expenses' | 'inventory' | 'subscribers';
class ApiError extends Error { constructor(public status: number, public code: string) { super(code); } }
async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api/admin/${path}`, {
    method, credentials: 'same-origin',
    headers: { 'x-requested-with': 'gw-admin', ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({ error: 'server_error' }));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'server_error');
  return data as T;
}
const ERRORS: Record<string, string> = {
  wrong_password: 'That password is not right.',
  too_many_attempts: 'Too many attempts from this connection. Wait 15 minutes and try again.',
  unauthorized: 'Your session has ended. Please log in again.',
  server_error: 'Something went wrong on the server. Try again in a moment.',
};
const explain = (e: unknown) => (e instanceof ApiError ? ERRORS[e.code] ?? e.code.replace(/_/g, ' ') : 'Could not reach the server. Check your connection.');
const today = () => new Date().toISOString().slice(0, 10);

const input = 'h-10 w-full rounded-[6px] border border-hair bg-white px-3 text-[0.95rem] focus:border-forest focus:outline-none';
const btn = 'inline-flex h-10 items-center justify-center whitespace-nowrap rounded-[6px] px-4 text-[0.92rem] font-medium';
const btnMain = `${btn} bg-forest text-ivory hover:bg-pine disabled:opacity-60`;
const btnQuiet = `${btn} border border-hair bg-white hover:border-charcoal`;

function Shell({ children, right }: { children: ReactNode; right?: ReactNode }) {
  useEffect(() => { document.title = 'Admin | GOLFWEAR'; }, []);
  return (
    <div className="admin min-h-screen bg-[#F3F1EB] text-charcoal">
      <header className="border-b border-hair bg-white">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-5">
          <Logo className="h-5 w-auto shrink-0 sm:h-6" /><span className="hidden rounded bg-linen px-2 py-0.5 text-[0.75rem] font-medium sm:inline">Admin</span>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">{right}</div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-5 py-8">{children}</main>
    </div>
  );
}

function Setup({ code }: { code: string }) {
  const db = code === 'database_not_configured';
  return (
    <Shell>
      <div className="max-w-2xl rounded-[8px] border border-hair bg-white p-8">
        <h1 className="text-[1.6rem]">{db ? 'Connect a database' : 'Finish setting up the dashboard'}</h1>
        <p className="mt-2 text-stone">The dashboard is installed but can't open yet. {db ? 'The database is missing.' : 'The admin password is missing.'} Both are set in Vercel, once, for free.</p>
        <ol className="mt-6 list-decimal space-y-3 pl-5">
          <li>Open the <b>golfwear</b> project on vercel.com and go to <b>Storage</b>. Choose <b>Create Database → Neon</b> (Postgres) on the free plan and connect it to the project. Vercel adds the <code>DATABASE_URL</code> setting by itself.</li>
          <li>Go to <b>Settings → Environment Variables</b> and add <code>ADMIN_PASSWORD</code> with a long password only you know (at least 10 characters).</li>
          <li>Go to <b>Deployments</b>, open the latest one and choose <b>Redeploy</b>. Then reload this page.</li>
        </ol>
        <p className="mt-6 text-[0.85rem] text-stone">Until then, nothing is stored and nobody can see or change your records.</p>
      </div>
    </Shell>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await api('login', 'POST', { password: pw }); onDone(); } catch (err) { setError(explain(err)); } finally { setBusy(false); }
  };
  return (
    <Shell>
      <form onSubmit={submit} className="mx-auto mt-16 max-w-sm rounded-[8px] border border-hair bg-white p-8">
        <h1 className="text-[1.5rem]">Log in</h1>
        <p className="mt-1 text-[0.92rem] text-stone">Private dashboard for the GOLFWEAR team.</p>
        <label className="mt-6 block text-[0.9rem]" htmlFor="pw">Password</label>
        <input id="pw" type="password" autoComplete="current-password" className={`${input} mt-1`} value={pw} onChange={(e) => setPw(e.target.value)} required />
        {error && <p role="alert" className="mt-3 text-[0.9rem] text-[#A3352B]">{error}</p>}
        <button className={`${btnMain} mt-6 w-full`} disabled={busy || !pw}>{busy ? 'Checking…' : 'Log in'}</button>
      </form>
    </Shell>
  );
}

export default function Admin() {
  const [state, setState] = useState<'loading' | 'login' | 'ready' | { setup: string } | { error: string }>('loading');
  const check = useCallback(async () => {
    try { await api('session'); setState('ready'); }
    catch (e) {
      if (e instanceof ApiError && e.status === 503) setState({ setup: e.code });
      else if (e instanceof ApiError && e.status === 401) setState('login');
      else setState({ error: explain(e) });
    }
  }, []);
  useEffect(() => { check(); }, [check]);
  if (state === 'loading') return <Shell><p className="text-stone">Loading…</p></Shell>;
  if (state === 'login') return <Login onDone={() => setState('ready')} />;
  if (typeof state === 'object' && 'setup' in state) return <Setup code={state.setup} />;
  if (typeof state === 'object') return <Shell><p role="alert">{state.error}</p><button className={`${btnQuiet} mt-4`} onClick={check}>Try again</button></Shell>;
  return <Dashboard onLogout={async () => { await api('logout', 'POST').catch(() => {}); setState('login'); }} onExpired={() => setState('login')} />;
}

// ---------------------------------------------------------------------------------------------
const TABS = ['Overview', 'Sales', 'Expenses', 'Inventory', 'Subscribers', 'Import & export'] as const;
type Tab = typeof TABS[number];

function Dashboard({ onLogout, onExpired }: { onLogout: () => void; onExpired: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('Overview');
  const [year, setYear] = useState(new Date().getFullYear());
  const load = useCallback(async () => {
    try { setData(await api<Data>('data')); setError(''); }
    catch (e) { if (e instanceof ApiError && e.status === 401) onExpired(); else setError(explain(e)); }
  }, [onExpired]);
  useEffect(() => { load(); }, [load]);
  const mutate = useCallback(async (fn: () => Promise<unknown>) => {
    try { await fn(); await load(); return true; }
    catch (e) { if (e instanceof ApiError && e.status === 401) onExpired(); else window.alert(explain(e)); return false; }
  }, [load, onExpired]);

  const right = (
    <>
      {data && (
        <label className="flex items-center gap-2 text-[0.9rem]"><span className="sr-only sm:not-sr-only">Year</span>
          <select aria-label="Year" className={`${input} w-[5.75rem]`} value={year} onChange={(e) => setYear(+e.target.value)}>{years(data).map((y) => <option key={y}>{y}</option>)}</select>
        </label>
      )}
      <button className={btnQuiet} onClick={onLogout}>Log out</button>
    </>
  );
  return (
    <Shell right={right}>
      <nav className="flex flex-wrap gap-1 border-b border-hair" aria-label="Dashboard sections">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} aria-current={tab === t ? 'page' : undefined}
            className={`-mb-px border-b-2 px-4 py-3 text-[0.95rem] ${tab === t ? 'border-forest font-medium text-forest' : 'border-transparent text-stone hover:text-charcoal'}`}>{t}</button>
        ))}
      </nav>
      {error && <p role="alert" className="mt-6 text-[#A3352B]">{error} <button className="underline" onClick={load}>Retry</button></p>}
      {!data && !error && <p className="mt-8 text-stone">Loading records…</p>}
      {data && (
        <div className="mt-8">
          {tab === 'Overview' && <Overview data={data} year={year} />}
          {tab === 'Sales' && <SalesTab data={data} year={year} mutate={mutate} />}
          {tab === 'Expenses' && <ExpensesTab data={data} year={year} mutate={mutate} />}
          {tab === 'Inventory' && <InventoryTab data={data} mutate={mutate} />}
          {tab === 'Subscribers' && <SubscribersTab data={data} mutate={mutate} />}
          {tab === 'Import & export' && <ImportExport data={data} year={year} mutate={mutate} />}
        </div>
      )}
    </Shell>
  );
}

type Mutate = (fn: () => Promise<unknown>) => Promise<boolean>;
const Card = ({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) => (
  <section className={`rounded-[8px] border border-hair bg-white p-5 ${className}`}>{title && <h2 className="mb-4 text-[1.1rem] font-medium">{title}</h2>}{children}</section>
);
const Stat = ({ label, value, note }: { label: string; value: string; note?: string }) => (
  <div className="rounded-[8px] border border-hair bg-white p-5"><p className="text-[0.85rem] text-stone">{label}</p><p className="mt-1 text-[1.45rem] tnum">{value}</p>{note && <p className="mt-1 text-[0.8rem] text-stone">{note}</p>}</div>
);
const Empty = ({ children }: { children: ReactNode }) => <p className="rounded-[6px] bg-[#F7F5F0] p-4 text-[0.92rem] text-stone">{children}</p>;

function Overview({ data, year }: { data: Data; year: number }) {
  const s = summarise(inYear(data.sales, 'order_date', year), inYear(data.expenses, 'expense_date', year));
  const months = monthly(data, year);
  const max = Math.max(1, ...months.map((m) => Math.max(m.revenue, Math.abs(m.netProfit))));
  const low = data.inventory.filter((i) => i.stock <= i.restock_level);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Revenue ${year}`} value={money(s.revenue)} note={`${s.orders} ${s.orders === 1 ? 'order' : 'orders'}, ${s.units} ${s.units === 1 ? 'unit' : 'units'} (completed)`} />
        <Stat label="Total expenses" value={money(s.totalExpenses)} note={`incl. ${money(s.platformFees)} marketplace fees`} />
        <Stat label="Gross profit" value={money(s.grossProfit)} note={`margin ${pct(s.grossMargin)}`} />
        <Stat label="Net profit" value={money(s.netProfit)} note={`margin ${pct(s.netMargin)}`} />
      </div>
      <Card title={`Month by month, ${year}`}>
        {s.revenue === 0 && s.totalExpenses === 0 ? <Empty>No sales or expenses recorded for {year} yet. Add them in Sales and Expenses, or import a Tokopedia order report.</Empty> : (
          <>
            <div className="flex h-44 items-end gap-2" role="img" aria-label="Revenue and net profit per month">
              {months.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <div className="flex h-36 w-full items-end justify-center gap-0.5">
                    <div className="w-1/2 rounded-t-sm bg-forest" style={{ height: `${(m.revenue / max) * 100}%` }} title={`Revenue ${money(m.revenue)}`} />
                    <div className={`w-1/2 rounded-t-sm ${m.netProfit < 0 ? 'bg-[#C2665A]' : 'bg-champagne'}`} style={{ height: `${(Math.abs(m.netProfit) / max) * 100}%` }} title={`Net profit ${money(m.netProfit)}`} />
                  </div>
                  <span className="text-[0.72rem] text-stone">{new Date(`${m.month}-01`).toLocaleString('en', { month: 'short' })}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 flex gap-5 text-[0.8rem] text-stone"><span><span className="mr-1.5 inline-block h-2.5 w-2.5 bg-forest" />Revenue</span><span><span className="mr-1.5 inline-block h-2.5 w-2.5 bg-champagne" />Net profit</span><span><span className="mr-1.5 inline-block h-2.5 w-2.5 bg-[#C2665A]" />Net loss</span></p>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-[0.88rem] tnum">
                <thead><tr className="text-left text-stone">{['Month', 'Revenue', 'Cost of goods', 'Gross profit', 'Operating', 'Net profit', 'Net margin'].map((h) => <th key={h} className="border-b border-hair py-2 pr-4 font-normal">{h}</th>)}</tr></thead>
                <tbody>{months.map((m) => (
                  <tr key={m.month} className="border-b border-hair/60"><td className="py-2 pr-4">{m.month}</td><td className="pr-4">{money(m.revenue)}</td><td className="pr-4">{money(m.costOfGoods)}</td><td className="pr-4">{money(m.grossProfit)}</td><td className="pr-4">{money(m.operating)}</td><td className={`pr-4 ${m.netProfit < 0 ? 'text-[#A3352B]' : ''}`}>{money(m.netProfit)}</td><td>{pct(m.netMargin)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}
        <p className="mt-4 text-[0.8rem] text-stone">Revenue counts completed sales only (quantity × price − discount). Cost of goods = expenses in “Product acquisition”. Operating = all other expenses plus marketplace fees.</p>
      </Card>
      <Card title="Restock alerts">
        {low.length ? <ul className="space-y-1.5">{low.map((i) => <li key={i.id}><b>{i.product}</b> ({i.sku}): {i.stock} left, restock at {i.restock_level}{i.restock_note && ` · ${i.restock_note}`}</li>)}</ul> : <Empty>Nothing is at or below its restock level.</Empty>}
      </Card>
    </div>
  );
}

// ---------- generic record editing ----------
type FieldDef = { key: string; label: string; type: 'date' | 'text' | 'number' | 'select'; options?: [string, string][]; required?: boolean; list?: string };
function RecordForm({ fields, initial, onSubmit, onCancel, submitLabel }: { fields: FieldDef[]; initial: Record<string, unknown>; onSubmit: (v: Record<string, unknown>) => Promise<boolean>; onCancel?: () => void; submitLabel: string }) {
  const [v, setV] = useState<Record<string, unknown>>(initial);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    const out: Record<string, unknown> = {};
    for (const f of fields) out[f.key] = f.type === 'number' ? (v[f.key] === '' || v[f.key] === undefined ? undefined : Number(v[f.key])) : v[f.key];
    if (await onSubmit(out)) if (!onCancel) setV(initial);
    setBusy(false);
  };
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {fields.map((f) => (
        <label key={f.key} className="text-[0.85rem] text-stone">{f.label}{f.required && ' *'}
          {f.type === 'select'
            ? <select className={`${input} mt-1 text-charcoal`} value={String(v[f.key] ?? '')} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}>{f.options!.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}</select>
            : <input className={`${input} mt-1 text-charcoal`} type={f.type} min={f.type === 'number' ? 0 : undefined} required={f.required} list={f.list} value={String(v[f.key] ?? '')} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />}
        </label>
      ))}
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <button className={btnMain} disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" className={btnQuiet} onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
function useEditor<T extends { id: number }>(table: Table, mutate: Mutate) {
  const [editing, setEditing] = useState<T | null>(null);
  return {
    editing, setEditing,
    create: (row: Record<string, unknown>) => mutate(async () => {
      const r = await api<{ inserted: number; skipped: number }>(table, 'POST', { rows: [row] });
      if (r.skipped) window.alert('Not added: a sale with the same Tokopedia invoice, product and size is already recorded.');
    }),
    update: (row: Record<string, unknown>) => mutate(() => api(`${table}/${editing!.id}`, 'PUT', row)).then((ok) => { if (ok) setEditing(null); return ok; }),
    remove: (id: number, what: string) => window.confirm(`Delete ${what}? This can't be undone.`) && mutate(() => api(`${table}/${id}`, 'DELETE')),
  };
}
const Th = ({ children }: { children?: ReactNode }) => <th className="whitespace-nowrap border-b border-hair py-2 pr-4 text-left font-normal text-stone">{children}</th>;
const Td = ({ children, className = '' }: { children?: ReactNode; className?: string }) => <td className={`whitespace-nowrap border-b border-hair/60 py-2 pr-4 ${className}`}>{children}</td>;
const RowActions = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
  <Td><button className="mr-3 underline" onClick={onEdit}>Edit</button><button className="text-[#A3352B] underline" onClick={onDelete}>Delete</button></Td>
);

const SALE_FIELDS: FieldDef[] = [
  { key: 'order_date', label: 'Order date', type: 'date', required: true }, { key: 'product', label: 'Product', type: 'text', required: true, list: 'gw-products' },
  { key: 'brand', label: 'Brand', type: 'text' }, { key: 'size', label: 'Size', type: 'text' },
  { key: 'quantity', label: 'Quantity', type: 'number', required: true }, { key: 'unit_price', label: 'Selling price per unit (Rp)', type: 'number', required: true },
  { key: 'discount', label: 'Discount (Rp)', type: 'number' }, { key: 'platform_fee', label: 'Tokopedia fee (Rp)', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: STATUSES.map((s) => [s, s[0].toUpperCase() + s.slice(1)]) },
  { key: 'marketplace_ref', label: 'Tokopedia invoice no.', type: 'text' }, { key: 'sku', label: 'SKU', type: 'text' }, { key: 'notes', label: 'Notes', type: 'text' },
];
function SalesTab({ data, year, mutate }: { data: Data; year: number; mutate: Mutate }) {
  const ed = useEditor<Sale>('sales', mutate);
  const [q, setQ] = useState('');
  const rows = inYear(data.sales, 'order_date', year).filter((s) => !q || `${s.product} ${s.marketplace_ref} ${s.status}`.toLowerCase().includes(q.toLowerCase()));
  const blank = useMemo(() => ({ order_date: today(), brand: 'GOLFWEAR', quantity: 1, status: 'completed' }), []);
  return (
    <div className="space-y-6">
      <datalist id="gw-products">{PRODUCTS.map((p) => <option key={p.id} value={p.name.en} />)}</datalist>
      <Card title={ed.editing ? `Edit sale #${ed.editing.id}` : 'Record a sale'}>
        <RecordForm key={ed.editing?.id ?? 'new'} fields={SALE_FIELDS} initial={ed.editing ?? blank} onSubmit={ed.editing ? ed.update : ed.create} onCancel={ed.editing ? () => ed.setEditing(null) : undefined} submitLabel={ed.editing ? 'Save changes' : 'Add sale'} />
      </Card>
      <Card title={`Sales in ${year} (${rows.length})`}>
        <input className={`${input} mb-4 max-w-xs`} placeholder="Search product, invoice, status" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search sales" />
        {rows.length === 0 ? <Empty>No sales recorded for {year}.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-[0.88rem] tnum">
            <thead><tr><Th>Date</Th><Th>Product</Th><Th>Brand</Th><Th>Qty</Th><Th>Price</Th><Th>Discount</Th><Th>Revenue</Th><Th>Status</Th><Th>Invoice</Th><Th /></tr></thead>
            <tbody>{rows.map((s) => (
              <tr key={s.id}><Td>{s.order_date}</Td><Td>{s.product}{s.size && <span className="text-stone"> · {s.size}</span>}</Td><Td>{s.brand}</Td><Td>{s.quantity}</Td><Td>{money(s.unit_price)}</Td><Td>{money(s.discount)}</Td><Td>{money(revenueOf(s))}</Td>
                <Td><span className={`rounded px-2 py-0.5 text-[0.78rem] ${s.status === 'completed' ? 'bg-[#E3EFE6] text-forest' : 'bg-linen'}`}>{s.status}</span></Td><Td>{s.marketplace_ref}</Td>
                <RowActions onEdit={() => { ed.setEditing(s); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onDelete={() => ed.remove(s.id, `the sale of ${s.product} on ${s.order_date}`)} /></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </div>
  );
}

const EXPENSE_FIELDS: FieldDef[] = [
  { key: 'expense_date', label: 'Date', type: 'date', required: true },
  { key: 'category', label: 'Category', type: 'select', options: Object.entries(CATEGORIES) },
  { key: 'description', label: 'Description', type: 'text' }, { key: 'amount', label: 'Amount (Rp)', type: 'number', required: true },
];
function ExpensesTab({ data, year, mutate }: { data: Data; year: number; mutate: Mutate }) {
  const ed = useEditor<Expense>('expenses', mutate);
  const rows = inYear(data.expenses, 'expense_date', year);
  const blank = useMemo(() => ({ expense_date: today(), category: 'acquisition' }), []);
  const byCat = Object.entries(CATEGORIES).map(([k, label]) => [label, rows.filter((e) => e.category === k).reduce((a, e) => a + e.amount, 0)] as const);
  return (
    <div className="space-y-6">
      <Card title={ed.editing ? `Edit expense #${ed.editing.id}` : 'Record an expense'}>
        <RecordForm key={ed.editing?.id ?? 'new'} fields={EXPENSE_FIELDS} initial={ed.editing ?? blank} onSubmit={ed.editing ? ed.update : ed.create} onCancel={ed.editing ? () => ed.setEditing(null) : undefined} submitLabel={ed.editing ? 'Save changes' : 'Add expense'} />
      </Card>
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">{byCat.map(([l, v]) => <Stat key={l} label={l} value={money(v)} />)}</div>
      <Card title={`Expenses in ${year} (${rows.length})`}>
        {rows.length === 0 ? <Empty>No expenses recorded for {year}.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-[0.88rem] tnum">
            <thead><tr><Th>Date</Th><Th>Category</Th><Th>Description</Th><Th>Amount</Th><Th /></tr></thead>
            <tbody>{rows.map((e) => (
              <tr key={e.id}><Td>{e.expense_date}</Td><Td>{CATEGORIES[e.category as keyof typeof CATEGORIES]}</Td><Td className="whitespace-normal">{e.description}</Td><Td>{money(e.amount)}</Td>
                <RowActions onEdit={() => { ed.setEditing(e); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onDelete={() => ed.remove(e.id, `this ${money(e.amount)} expense`)} /></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </div>
  );
}

const ITEM_FIELDS: FieldDef[] = [
  { key: 'product', label: 'Product', type: 'text', required: true, list: 'gw-products' }, { key: 'brand', label: 'Brand', type: 'text' },
  { key: 'sku', label: 'SKU', type: 'text', required: true }, { key: 'sizes', label: 'Sizes (e.g. M, L, XL)', type: 'text' },
  { key: 'stock', label: 'Stock', type: 'number' }, { key: 'unit_cost', label: 'Unit cost (Rp)', type: 'number' },
  { key: 'restock_level', label: 'Restock when stock is at', type: 'number' }, { key: 'restock_note', label: 'Restock note (supplier, lead time)', type: 'text' },
];
function InventoryTab({ data, mutate }: { data: Data; mutate: Mutate }) {
  const ed = useEditor<Item>('inventory', mutate);
  const blank = useMemo(() => ({ brand: 'GOLFWEAR', stock: 0, restock_level: 0 }), []);
  const value = data.inventory.reduce((a, i) => a + i.stock * i.unit_cost, 0);
  const adjust = (i: Item, d: number) => mutate(() => api(`inventory/${i.id}`, 'PUT', { stock: Math.max(0, i.stock + d) }));
  return (
    <div className="space-y-6">
      <datalist id="gw-products">{PRODUCTS.map((p) => <option key={p.id} value={p.name.en} />)}</datalist>
      <Card title={ed.editing ? `Edit ${ed.editing.sku}` : 'Add an item'}>
        <RecordForm key={ed.editing?.id ?? 'new'} fields={ITEM_FIELDS} initial={ed.editing ?? blank} onSubmit={ed.editing ? ed.update : ed.create} onCancel={ed.editing ? () => ed.setEditing(null) : undefined} submitLabel={ed.editing ? 'Save changes' : 'Add item'} />
      </Card>
      <Card title={`Inventory (${data.inventory.length} SKUs, stock value ${money(value)})`}>
        {data.inventory.length === 0 ? <Empty>No items yet. Add each product and colour as its own SKU.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-[0.88rem] tnum">
            <thead><tr><Th>Product</Th><Th>SKU</Th><Th>Sizes</Th><Th>Stock</Th><Th>Unit cost</Th><Th>Restock at</Th><Th>Note</Th><Th /></tr></thead>
            <tbody>{data.inventory.map((i) => (
              <tr key={i.id} className={i.stock <= i.restock_level ? 'bg-[#FBF1E4]' : ''}><Td>{i.product}<span className="text-stone"> · {i.brand}</span></Td><Td>{i.sku}</Td><Td>{i.sizes}</Td>
                <Td><span className="inline-flex items-center gap-2"><button className={`${btnQuiet} !h-7 !px-2`} aria-label={`One less ${i.sku}`} onClick={() => adjust(i, -1)}>−</button>{i.stock}<button className={`${btnQuiet} !h-7 !px-2`} aria-label={`One more ${i.sku}`} onClick={() => adjust(i, 1)}>+</button></span></Td>
                <Td>{money(i.unit_cost)}</Td><Td>{i.restock_level}{i.stock <= i.restock_level && <span className="ml-2 text-[0.78rem] font-medium text-[#8A5A1C]">Restock</span>}</Td><Td className="whitespace-normal">{i.restock_note}</Td>
                <RowActions onEdit={() => { ed.setEditing(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onDelete={() => ed.remove(i.id, i.sku)} /></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </div>
  );
}

function SubscribersTab({ data, mutate }: { data: Data; mutate: Mutate }) {
  return (
    <Card title={`Newsletter subscribers (${data.subscribers.length})`}>
      <button className={`${btnQuiet} mb-4`} disabled={!data.subscribers.length} onClick={() => download('golfwear-subscribers.csv', exporters.subscribers(data))}>Export CSV</button>
      {data.subscribers.length === 0 ? <Empty>No sign-ups yet. They arrive from the form at the bottom of every page.</Empty> : (
        <table className="w-full text-[0.88rem]"><thead><tr><Th>Email</Th><Th>Language</Th><Th>Signed up</Th><Th /></tr></thead>
          <tbody>{data.subscribers.map((s) => (
            <tr key={s.id}><Td>{s.email}</Td><Td>{s.lang.toUpperCase()}</Td><Td>{s.created_at.slice(0, 10)}</Td>
              <Td><button className="text-[#A3352B] underline" onClick={() => window.confirm(`Remove ${s.email}?`) && mutate(() => api(`subscribers/${s.id}`, 'DELETE'))}>Remove</button></Td></tr>
          ))}</tbody></table>
      )}
    </Card>
  );
}

function ImportExport({ data, year, mutate }: { data: Data; year: number; mutate: Mutate }) {
  const [rows, setRows] = useState<string[][] | null>(null);
  const [map, setMap] = useState<Partial<Record<ImportKey, number>>>({});
  const [result, setResult] = useState('');
  const onFile = async (file: File | undefined) => {
    setResult('');
    if (!file) return;
    const parsed = parseCsv(await file.text());
    if (parsed.length < 2) { setRows(null); setResult('That file has no data rows. Export the order report from Tokopedia Seller Center and save it as CSV.'); return; }
    setRows(parsed); setMap(guessMapping(parsed[0]));
  };
  const converted = useMemo(() => {
    if (!rows) return { good: [] as Record<string, unknown>[], bad: 0 };
    const get = (r: string[], k: ImportKey) => (map[k] === undefined ? '' : (r[map[k]!] ?? '').trim());
    const good: Record<string, unknown>[] = []; let bad = 0;
    for (const r of rows.slice(1)) {
      const row = {
        order_date: parseDate(get(r, 'order_date')), product: get(r, 'product'), quantity: Number(get(r, 'quantity').replace(/[^\d]/g, '')),
        unit_price: parseMoney(get(r, 'unit_price')), discount: map.discount === undefined ? 0 : parseMoney(get(r, 'discount')) || 0,
        platform_fee: map.platform_fee === undefined ? 0 : parseMoney(get(r, 'platform_fee')) || 0,
        size: get(r, 'size') || undefined, marketplace_ref: get(r, 'marketplace_ref') || undefined, status: mapStatus(get(r, 'status')), brand: 'GOLFWEAR',
      };
      if (!row.order_date || !row.product || !(row.quantity > 0) || !(row.unit_price >= 0)) bad++; else good.push(row);
    }
    return { good, bad };
  }, [rows, map]);
  const ready = IMPORT_FIELDS.every((f) => !f.required || map[f.key] !== undefined);
  const doImport = async () => {
    let inserted = 0, skipped = 0;
    const ok = await mutate(async () => {
      for (let i = 0; i < converted.good.length; i += 500) {
        const r = await api<{ inserted: number; skipped: number }>('sales', 'POST', { rows: converted.good.slice(i, i + 500) });
        inserted += r.inserted; skipped += r.skipped;
      }
    });
    if (ok) { setResult(`Imported ${inserted} sale lines. ${skipped} were already recorded and skipped. ${converted.bad} rows were unreadable and left out.`); setRows(null); }
  };
  const exports: [string, string, () => string][] = [
    ['Sales (all years)', 'golfwear-sales.csv', () => exporters.sales(data)],
    ['Expenses (all years)', 'golfwear-expenses.csv', () => exporters.expenses(data)],
    ['Inventory', 'golfwear-inventory.csv', () => exporters.inventory(data)],
    [`Monthly summary ${year}`, `golfwear-monthly-${year}.csv`, () => exporters.monthly(data, year)],
    ['Yearly summary', 'golfwear-yearly.csv', () => exporters.yearly(data)],
    ['Newsletter subscribers', 'golfwear-subscribers.csv', () => exporters.subscribers(data)],
  ];
  return (
    <div className="space-y-6">
      <Card title="Import orders from Tokopedia">
        <ol className="mb-4 list-decimal space-y-1 pl-5 text-[0.92rem] text-stone">
          <li>In Tokopedia Seller Center, download your order report (Pesanan → Download laporan).</li>
          <li>Open it in Excel or Google Sheets and save it as <b>CSV</b>.</li>
          <li>Choose the file below, check the columns, then import. Lines already imported (same invoice, product and size) are skipped.</li>
        </ol>
        <input type="file" accept=".csv,text/csv" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} className="text-[0.92rem]" aria-label="Tokopedia order report (CSV)" />
        {rows && (
          <div className="mt-6">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {IMPORT_FIELDS.map((f) => (
                <label key={f.key} className="text-[0.85rem] text-stone">{f.label}{f.required && ' *'}
                  <select className={`${input} mt-1 text-charcoal`} value={map[f.key] ?? ''} onChange={(e) => setMap({ ...map, [f.key]: e.target.value === '' ? undefined : +e.target.value })}>
                    <option value="">(not in file)</option>
                    {rows[0].map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <p className="mt-4 text-[0.92rem]">{converted.good.length} rows ready{converted.bad ? `, ${converted.bad} unreadable (missing date, product, quantity or price)` : ''}.</p>
            {converted.good.length > 0 && (
              <div className="mt-3 overflow-x-auto"><table className="w-full text-[0.85rem] tnum"><thead><tr><Th>Date</Th><Th>Product</Th><Th>Size</Th><Th>Qty</Th><Th>Price</Th><Th>Discount</Th><Th>Status</Th><Th>Invoice</Th></tr></thead>
                <tbody>{converted.good.slice(0, 5).map((r, i) => <tr key={i}><Td>{String(r.order_date)}</Td><Td>{String(r.product)}</Td><Td>{String(r.size ?? '')}</Td><Td>{String(r.quantity)}</Td><Td>{money(Number(r.unit_price))}</Td><Td>{money(Number(r.discount))}</Td><Td>{String(r.status)}</Td><Td>{String(r.marketplace_ref ?? '')}</Td></tr>)}</tbody></table></div>
            )}
            <button className={`${btnMain} mt-4`} disabled={!ready || !converted.good.length} onClick={doImport}>Import {converted.good.length} rows</button>
            {!ready && <p className="mt-2 text-[0.85rem] text-[#A3352B]">Match the four required columns first.</p>}
          </div>
        )}
        {result && <p role="status" className="mt-4 rounded-[6px] bg-[#E3EFE6] p-3 text-[0.92rem]">{result}</p>}
      </Card>
      <Card title="Download for Excel or Google Sheets">
        <div className="flex flex-wrap gap-2">{exports.map(([label, file, make]) => <button key={file} className={btnQuiet} onClick={() => download(file, make())}>{label}</button>)}</div>
        <p className="mt-3 text-[0.8rem] text-stone">CSV files open directly in Excel and Google Sheets. Amounts are in rupiah.</p>
      </Card>
    </div>
  );
}
