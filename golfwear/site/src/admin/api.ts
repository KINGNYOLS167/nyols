// Dashboard API client. Every write carries the x-gw-admin header the server requires.

export class ApiError extends Error {
  constructor(public status: number, message: string, public field?: string) {
    super(message);
  }
}

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

export async function api<T = any>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, credentials: 'same-origin', headers: { accept: 'application/json', 'x-gw-admin': '1' } };
  if (body instanceof Blob) {
    init.body = body;
    (init.headers as Record<string, string>)['content-type'] = body.type;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)['content-type'] = 'application/json';
  }
  let r: Response;
  try {
    r = await fetch('/api/admin' + path, init);
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== '/login') onUnauthorized();
  if (!r.ok) throw new ApiError(r.status, data?.error ?? `Request failed (${r.status}).`, data?.field);
  return data as T;
}

export const get = <T = any>(path: string) => api<T>('GET', path);

// ---------- types returned by the API ----------

export interface Brand { id: number; slug: string; name: string; description: string; logoUrl: string; sort: number; products: number; published: number }
export interface StockRow { size: string; qty: number }
export interface Product {
  id: number; slug: string; sku: string; name: string; brandId: number | null; brandName: string | null; brandSlug: string | null;
  category: string; sleeve: string; gender: string; description: string; specs: { label: string; value: string }[];
  colors: { name: string; hex: string }[]; images: string[]; price: number; salePrice: number | null; costPrice: number | null;
  tokopediaUrl: string; tokopediaSold: number; preorder: boolean; preorderDays: number | null; featured: boolean; isNew: boolean;
  status: 'published' | 'draft'; restockNote: string; createdAt: string; updatedAt: string; stock: StockRow[]; unitsSold?: number;
}
export interface Sale {
  id: number; orderDate: string; productId: number | null; productName: string; brand: string; size: string; qty: number;
  unitPrice: number; discount: number; status: string; marketplace: string; marketplaceRef: string; note: string; deductStock: boolean; revenue: number;
}
export interface Expense { id: number; date: string; category: string; description: string; amount: number; vendor: string; productId: number | null; productName: string | null; note: string; restockId: number | null }
export interface Restock { id: number; productId: number; productName: string; date: string; size: string; qty: number; unitCost: number | null; supplier: string; status: 'ordered' | 'received'; expectedDate: string | null; note: string; expenseId: number | null }
export interface InventoryRow { productId: number; name: string; sku: string; brand: string | null; category: string; status: string; preorder: boolean; restockNote: string; size: string | null; qty: number | null; nextRestock: string | null; onOrder: number }
export interface Finance {
  month: number; revenue: number; orders: number; units: number; discounts: number; pending: number;
  expenses: Record<string, number>; totalExpenses: number; grossProfit: number; netProfit: number; grossMargin: number | null; netMargin: number | null;
}
export interface Summary {
  years: number[]; year: number; months: Finance[]; total: Finance;
  top: { name: string; brand: string; units: number; revenue: number }[];
  counts: { pending: number; lowStock: number; outOfStock: number; onOrder: number };
}

// ---------- formatting ----------

const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
export const rp = (n: number | null | undefined) => (n === null || n === undefined ? '—' : idr.format(n).replace(/\u00a0/g, ' '));
const compactFmt = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
export const rpCompact = (n: number) => `Rp ${compactFmt.format(n)}`;
export const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`);
export const int = (n: number) => new Intl.NumberFormat('id-ID').format(n);
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const dateLabel = (d: string | null) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const CATEGORY_LABEL: Record<string, string> = {
  polo: 'Polo', top: 'Top', trousers: 'Trousers', shorts: 'Shorts', skirt: 'Skirt', outerwear: 'Outerwear', accessories: 'Accessories',
};
export const EXPENSE_LABEL: Record<string, string> = {
  acquisition: 'Product acquisition', shipping: 'Shipping', operational: 'Operational', marketing: 'Marketing', other: 'Other',
};
export const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', processing: 'Processing', shipped: 'Shipped', completed: 'Completed', cancelled: 'Cancelled', returned: 'Returned',
};
