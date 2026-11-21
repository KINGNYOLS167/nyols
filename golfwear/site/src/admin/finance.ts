// Money maths and spreadsheet export for the admin dashboard. Everything comes from entered records.
export interface Sale { id: number; order_date: string; product: string; brand: string; sku: string | null; size: string | null; quantity: number; unit_price: number; discount: number; platform_fee: number; status: string; marketplace_ref: string | null; notes: string | null }
export interface Expense { id: number; expense_date: string; category: string; description: string; amount: number }
export interface Item { id: number; product: string; brand: string; sku: string; sizes: string; stock: number; unit_cost: number; restock_level: number; restock_note: string; updated_at: string }
export interface Subscriber { id: number; email: string; lang: string; source: string; created_at: string }
export interface Data { sales: Sale[]; expenses: Expense[]; inventory: Item[]; subscribers: Subscriber[] }

export const STATUSES = ['completed', 'processing', 'cancelled', 'returned'] as const;
export const CATEGORIES = { acquisition: 'Product acquisition', shipping: 'Shipping', operations: 'Operations', marketing: 'Marketing', other: 'Other' } as const;

export const revenueOf = (s: Sale) => s.quantity * s.unit_price - s.discount;
const counted = (s: Sale) => s.status === 'completed';

export interface Summary { orders: number; units: number; revenue: number; platformFees: number; costOfGoods: number; operating: number; totalExpenses: number; grossProfit: number; netProfit: number; grossMargin: number | null; netMargin: number | null }

/** Revenue = completed sales (qty x price - discount). Cost of goods = "Product acquisition" expenses.
 *  Operating = all other expenses + marketplace fees. Gross = revenue - cost of goods. Net = gross - operating. */
export function summarise(sales: Sale[], expenses: Expense[]): Summary {
  const done = sales.filter(counted);
  const revenue = done.reduce((a, s) => a + revenueOf(s), 0);
  const platformFees = done.reduce((a, s) => a + s.platform_fee, 0);
  const costOfGoods = expenses.filter((e) => e.category === 'acquisition').reduce((a, e) => a + e.amount, 0);
  const operating = expenses.filter((e) => e.category !== 'acquisition').reduce((a, e) => a + e.amount, 0) + platformFees;
  const grossProfit = revenue - costOfGoods;
  const netProfit = grossProfit - operating;
  return {
    orders: new Set(done.map((s) => s.marketplace_ref || `#${s.id}`)).size,
    units: done.reduce((a, s) => a + s.quantity, 0),
    revenue, platformFees, costOfGoods, operating, totalExpenses: costOfGoods + operating, grossProfit, netProfit,
    grossMargin: revenue ? grossProfit / revenue : null,
    netMargin: revenue ? netProfit / revenue : null,
  };
}

export const years = (d: Data) => {
  const ys = new Set<number>([new Date().getFullYear()]);
  d.sales.forEach((s) => ys.add(+s.order_date.slice(0, 4)));
  d.expenses.forEach((e) => ys.add(+e.expense_date.slice(0, 4)));
  return [...ys].sort((a, b) => b - a);
};
export const inYear = <T,>(rows: T[], key: keyof T, y: number) => rows.filter((r) => String(r[key]).startsWith(`${y}-`));
export function monthly(d: Data, y: number) {
  return Array.from({ length: 12 }, (_, m) => {
    const p = `${y}-${String(m + 1).padStart(2, '0')}`;
    return { month: p, ...summarise(d.sales.filter((s) => s.order_date.startsWith(p)), d.expenses.filter((e) => e.expense_date.startsWith(p))) };
  });
}
export function yearly(d: Data) {
  return years(d).map((y) => ({ year: y, ...summarise(inYear(d.sales, 'order_date', y), inYear(d.expenses, 'expense_date', y)) }));
}

const rp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
export const money = (n: number) => rp.format(n);
export const pct = (n: number | null) => (n === null ? '–' : `${(n * 100).toFixed(1)}%`);

// ---------- CSV ----------
const cell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n;]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"` : s;
};
export const toCsv = (header: string[], rows: unknown[][]) => [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
export function download(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const SUMMARY_HEAD = ['Orders', 'Units', 'Revenue (IDR)', 'Cost of goods (IDR)', 'Gross profit (IDR)', 'Marketplace fees (IDR)', 'Operating expenses (IDR)', 'Total expenses (IDR)', 'Net profit (IDR)', 'Gross margin', 'Net margin'];
const summaryCells = (s: Summary) => [s.orders, s.units, s.revenue, s.costOfGoods, s.grossProfit, s.platformFees, s.operating, s.totalExpenses, s.netProfit, pct(s.grossMargin), pct(s.netMargin)];
export const exporters = {
  sales: (d: Data) => toCsv(['Date', 'Product', 'Brand', 'SKU', 'Size', 'Quantity', 'Unit price (IDR)', 'Discount (IDR)', 'Revenue (IDR)', 'Marketplace fee (IDR)', 'Status', 'Marketplace reference', 'Notes'],
    d.sales.map((s) => [s.order_date, s.product, s.brand, s.sku, s.size, s.quantity, s.unit_price, s.discount, revenueOf(s), s.platform_fee, s.status, s.marketplace_ref, s.notes])),
  expenses: (d: Data) => toCsv(['Date', 'Category', 'Description', 'Amount (IDR)'], d.expenses.map((e) => [e.expense_date, CATEGORIES[e.category as keyof typeof CATEGORIES] ?? e.category, e.description, e.amount])),
  inventory: (d: Data) => toCsv(['Product', 'Brand', 'SKU', 'Sizes', 'Stock', 'Unit cost (IDR)', 'Stock value (IDR)', 'Restock at', 'Restock note'],
    d.inventory.map((i) => [i.product, i.brand, i.sku, i.sizes, i.stock, i.unit_cost, i.stock * i.unit_cost, i.restock_level, i.restock_note])),
  subscribers: (d: Data) => toCsv(['Email', 'Language', 'Signed up'], d.subscribers.map((s) => [s.email, s.lang, s.created_at.slice(0, 10)])),
  monthly: (d: Data, y: number) => toCsv(['Month', ...SUMMARY_HEAD], monthly(d, y).map((m) => [m.month, ...summaryCells(m)])),
  yearly: (d: Data) => toCsv(['Year', ...SUMMARY_HEAD], yearly(d).map((y) => [y.year, ...summaryCells(y)])),
};

// ---------- Tokopedia order import ----------
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const first = clean.split(/\r?\n/, 1)[0] ?? '';
  const delim = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ';' : first.includes('\t') && !first.includes(',') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

export const IMPORT_FIELDS = [
  { key: 'order_date', label: 'Order date', required: true, hints: ['tanggal pembayaran', 'tanggal pesanan', 'payment date', 'order date', 'tanggal', 'date'] },
  { key: 'product', label: 'Product', required: true, hints: ['nama produk', 'product name', 'produk', 'product'] },
  { key: 'quantity', label: 'Quantity', required: true, hints: ['jumlah produk', 'jumlah', 'quantity', 'qty'] },
  { key: 'unit_price', label: 'Unit price', required: true, hints: ['harga jual', 'harga satuan', 'harga awal', 'unit price', 'price', 'harga'] },
  { key: 'discount', label: 'Discount', required: false, hints: ['diskon', 'discount', 'potongan'] },
  { key: 'platform_fee', label: 'Marketplace fee', required: false, hints: ['biaya layanan', 'biaya admin', 'komisi', 'service fee', 'fee'] },
  { key: 'size', label: 'Size / variant', required: false, hints: ['variasi', 'variant', 'ukuran', 'size'] },
  { key: 'marketplace_ref', label: 'Invoice / order no.', required: false, hints: ['nomor invoice', 'invoice', 'no. pesanan', 'order id', 'order number', 'nomor pesanan'] },
  { key: 'status', label: 'Status', required: false, hints: ['status terakhir', 'status pesanan', 'status'] },
] as const;
export type ImportKey = typeof IMPORT_FIELDS[number]['key'];

export function guessMapping(header: string[]): Partial<Record<ImportKey, number>> {
  const lower = header.map((h) => h.trim().toLowerCase());
  const used = new Set<number>();
  const map: Partial<Record<ImportKey, number>> = {};
  for (const f of IMPORT_FIELDS) {
    for (const hint of f.hints) {
      const i = lower.findIndex((h, idx) => !used.has(idx) && h.includes(hint));
      if (i >= 0) { map[f.key] = i; used.add(i); break; }
    }
  }
  return map;
}

/** "Rp79.000", "79.000,00", "79,000" -> 79000 */
export function parseMoney(v: string) {
  let s = (v ?? '').replace(/rp|idr|\s/gi, '');
  if (/,\d{1,2}$/.test(s)) s = s.replace(/,\d{1,2}$/, '');
  else if (/\.\d{1,2}$/.test(s) && !/\.\d{3}/.test(s)) s = s.replace(/\.\d{1,2}$/, '');
  const n = Number(s.replace(/[.,]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}
/** "2026-11-19", "19-11-2026 14:03", "19/11/2026", "19 Nov 2026" -> "2026-11-19" */
export function parseDate(v: string) {
  const s = (v ?? '').trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'mei|may', 'jun', 'jul', 'agu|aug', 'sep', 'okt|oct', 'nov', 'des|dec'];
  m = s.match(/^(\d{1,2})\s+([a-z]+)\w*\s+(\d{4})/i);
  if (m) {
    const mi = MONTHS.findIndex((k) => k.split('|').some((x) => m![2].toLowerCase().startsWith(x)));
    if (mi >= 0) return `${m[3]}-${String(mi + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return '';
}
export function mapStatus(v: string) {
  const s = (v ?? '').toLowerCase();
  if (!s || /selesai|complete|delivered|diterima|done/.test(s)) return 'completed';
  if (/batal|cancel|tolak|reject/.test(s)) return 'cancelled';
  if (/retur|return|refund|komplain/.test(s)) return 'returned';
  return 'processing';
}
