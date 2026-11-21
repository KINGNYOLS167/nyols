// The storefront's view of the catalogue, loaded from /api/catalog.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  COLLECTIONS, DEFAULT_ANNOUNCEMENTS, DEFAULT_STORE, effectivePrice, inCollection,
  type CatalogPayload, type CollectionSlug, type PublicProduct,
} from '../../shared/domain';
import { STORE } from '../config';

export type { PublicProduct, PublicBrand, CollectionSlug } from '../../shared/domain';
export { COLLECTIONS, effectivePrice, inCollection };

type Status = 'loading' | 'ready' | 'error';
interface Ctx extends CatalogPayload {
  status: Status;
  retry: () => void;
}

const EMPTY: CatalogPayload = {
  products: [],
  brands: [],
  ranking: 'featured',
  settings: { announcements: DEFAULT_ANNOUNCEMENTS, store: DEFAULT_STORE },
  updatedAt: '',
};

const CatalogContext = createContext<Ctx | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CatalogPayload>(EMPTY);
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setStatus('loading');
    fetch('/api/catalog', { headers: { accept: 'application/json' } })
      .then(async (r) => {
        // No database connected yet: the store simply has no products listed here, which is not an error.
        if (r.status === 503 && (await r.clone().json().catch(() => ({})))?.reason === 'not_configured') return EMPTY;
        if (!r.ok) throw new Error(String(r.status));
        return (await r.json()) as CatalogPayload;
      })
      .then((payload) => {
        if (!live) return;
        setData(payload);
        setStatus('ready');
      })
      .catch(() => live && setStatus('error'));
    return () => { live = false; };
  }, [attempt]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const value = useMemo(() => ({ ...data, status, retry }), [data, status, retry]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog outside CatalogProvider');
  return ctx;
}

export const buyUrl = (p: PublicProduct) => p.tokopediaUrl || STORE.tokopediaUrl;
export const hasDirectLink = (p: PublicProduct) => !!p.tokopediaUrl;
export const onSale = (p: PublicProduct) => effectivePrice(p) < p.price;

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
export const formatPrice = (n: number) => rupiah.format(n).replace(/\u00a0/g, ' ');

/** Best sellers when real sales exist, otherwise the owner's featured picks (then newest). */
export function topProducts(products: PublicProduct[], ranking: CatalogPayload['ranking'], n = 5) {
  if (ranking === 'sales') return products.filter((p) => p.sold > 0).sort((a, b) => b.sold - a.sold).slice(0, n);
  const featured = products.filter((p) => p.featured);
  const rest = products.filter((p) => !p.featured);
  return [...featured, ...rest].slice(0, n);
}

// ---------- filtering and sorting ----------

export type Sort = 'popular' | 'newest' | 'price-asc' | 'price-desc';
export const SORTS: Sort[] = ['popular', 'newest', 'price-asc', 'price-desc'];

export interface Filters {
  q: string;
  collection: CollectionSlug | '';
  brands: string[];
  genders: string[];
  sizes: string[];
  min: number | null;
  max: number | null;
  inStock: boolean;
  sale: boolean;
  sort: Sort;
}

export function readFilters(search: URLSearchParams, preset: Partial<Filters> = {}): Filters {
  const list = (k: string) => (search.get(k) ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const num = (k: string) => {
    const v = Number(search.get(k));
    return search.get(k) && Number.isFinite(v) && v >= 0 ? v : null;
  };
  const sort = search.get('sort') as Sort;
  const collection = search.get('collection') as CollectionSlug;
  return {
    q: search.get('q') ?? '',
    collection: (COLLECTIONS as readonly string[]).includes(collection) ? collection : '',
    brands: list('brand'),
    genders: list('gender'),
    sizes: list('size'),
    min: num('min'),
    max: num('max'),
    inStock: search.get('stock') === '1',
    sale: search.get('sale') === '1',
    sort: SORTS.includes(sort) ? sort : 'popular',
    ...preset,
  };
}

/** Query string for filters, leaving out whatever the page itself fixes (a brand page's brand, etc.). */
export function writeFilters(f: Filters, fixed: Partial<Record<keyof Filters, unknown>> = {}) {
  const s = new URLSearchParams();
  if (f.q) s.set('q', f.q);
  if (f.collection && !fixed.collection) s.set('collection', f.collection);
  if (f.brands.length && !fixed.brands) s.set('brand', f.brands.join(','));
  if (f.genders.length) s.set('gender', f.genders.join(','));
  if (f.sizes.length) s.set('size', f.sizes.join(','));
  if (f.min !== null) s.set('min', String(f.min));
  if (f.max !== null) s.set('max', String(f.max));
  if (f.inStock) s.set('stock', '1');
  if (f.sale) s.set('sale', '1');
  if (f.sort !== 'popular') s.set('sort', f.sort);
  const str = s.toString();
  return str ? `?${str}` : '';
}

const norm = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function matchesQuery(p: PublicProduct, q: string) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = norm([p.name, p.brand?.name ?? '', p.category, p.sleeve, p.gender, p.sku, p.colors.map((c) => c.name).join(' ')].join(' '));
  return words.every((w) => hay.includes(w));
}

export function applyFilters(products: PublicProduct[], f: Filters) {
  const out = products.filter((p) => {
    if (f.q && !matchesQuery(p, f.q)) return false;
    if (f.collection && !inCollection(p, f.collection)) return false;
    if (f.brands.length && !(p.brand && f.brands.includes(p.brand.slug))) return false;
    if (f.genders.length && !f.genders.includes(p.gender)) return false;
    if (f.sizes.length && !p.sizes.some((s) => s.available && f.sizes.includes(s.size))) return false;
    const price = effectivePrice(p);
    if (f.min !== null && price < f.min) return false;
    if (f.max !== null && price > f.max) return false;
    if (f.inStock && !(p.availability === 'in_stock' || p.availability === 'low_stock' || p.availability === 'preorder')) return false;
    if (f.sale && !onSale(p)) return false;
    return true;
  });
  const by: Record<Sort, (a: PublicProduct, b: PublicProduct) => number> = {
    popular: (a, b) => b.sold - a.sold || Number(b.featured) - Number(a.featured) || Date.parse(b.createdAt) - Date.parse(a.createdAt),
    newest: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    'price-asc': (a, b) => effectivePrice(a) - effectivePrice(b),
    'price-desc': (a, b) => effectivePrice(b) - effectivePrice(a),
  };
  return out.sort(by[f.sort]);
}

/** Sizes in a sensible order: XS..4XL first, then numbers, then anything else. */
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', '4XL', '5XL', 'ALL SIZE', 'FREE SIZE'];
export function sortSizes(sizes: string[]) {
  const rank = (s: string) => {
    const i = SIZE_ORDER.indexOf(s.toUpperCase());
    if (i >= 0) return i;
    const n = parseFloat(s);
    return Number.isFinite(n) ? 100 + n : 1000;
  };
  return [...new Set(sizes)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
