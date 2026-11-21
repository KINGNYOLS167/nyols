import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  applyFilters, COLLECTIONS, inCollection, onSale, readFilters, sortSizes, SORTS, useCatalog, writeFilters,
  type CollectionSlug, type Filters, type PublicBrand, type Sort,
} from '../lib/catalog';
import { Link, useRouter } from '../lib/router';
import { useLenis } from '../lib/motion';
import { RevealText, useScrollMotion } from '../lib/reveal';
import { useLang, type Key } from '../i18n';
import { STORE } from '../config';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { useQuickView } from '../components/QuickViewContext';
import { CatalogUnavailable } from './Home';
import { NotFound } from './NotFound';

const PAGE = 24;

interface Props {
  collection?: CollectionSlug;
  brandSlug?: string;
}

export function Catalog({ collection, brandSlug }: Props) {
  const { t, num } = useLang();
  const { products, brands, status } = useCatalog();
  const { path, search, navigate } = useRouter();
  const openQuick = useQuickView();
  const [drawer, setDrawer] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const brand = brandSlug ? brands.find((b) => b.slug === brandSlug) : undefined;

  const fixed = { ...(collection ? { collection } : {}), ...(brandSlug ? { brands: [brandSlug] } : {}) };
  const filters = readFilters(search, fixed);
  const base = useMemo(
    () => products.filter((p) => (!collection || inCollection(p, collection)) && (!brandSlug || p.brand?.slug === brandSlug)),
    [products, collection, brandSlug],
  );
  const results = useMemo(() => applyFilters(base, filters), [base, search.toString()]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setLimit(PAGE), [path, search.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<Filters>) => navigate(path + writeFilters({ ...filters, ...patch }, fixed), { replace: true, scroll: false });
  const clear = () => navigate(path + writeFilters({ ...readFilters(new URLSearchParams()), sort: filters.sort }, fixed), { replace: true, scroll: false });
  const active = activeChips(filters, fixed, brands, t, update);

  if (brandSlug && status === 'ready' && !brand) return <NotFound />;

  const title = brand ? brand.name : collection ? t(`col.${collection}` as Key) : filters.q ? t('resultsFor', { q: filters.q }) : t('shopTitle');
  const blurb = brand ? brand.description : collection ? t(`colBlurb.${collection}` as Key) : '';
  const count = results.length === 1 ? t('resultOne') : t('resultCount', { n: num(results.length) });

  return (
    <>
      <PageHeader
        title={title}
        blurb={blurb}
        back={brand ? { to: '/brands', label: t('allBrands') } : undefined}
        logo={brand?.logoUrl}
      />
      <div className="sticky top-[108px] z-30 border-y border-line bg-ivory/95 backdrop-blur-md">
        <div className="wrap flex min-h-[60px] items-center gap-3">
          <button type="button" onClick={() => setDrawer(true)} className="chip lg:hidden" aria-haspopup="dialog">
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden><path d="M3 6h14M6 10h8M8.5 14h3" stroke="currentColor" strokeWidth="1.4" /></svg>
            {t('filters')}{active.length > 0 && <span className="tnum">({active.length})</span>}
          </button>
          <p className="t-small whitespace-nowrap text-stone" aria-live="polite">{status === 'ready' ? count : t('loadingProducts')}</p>
          <SearchField value={filters.q} onChange={(q) => update({ q })} />
          <label className="ml-auto flex items-center gap-2">
            <span className="t-small hidden text-stone sm:inline">{t('sortLabel')}</span>
            <select
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as Sort })}
              className="min-h-10 rounded-[2px] border border-line bg-transparent pl-3 pr-8 text-[0.9rem]"
            >
              {SORTS.map((s) => <option key={s} value={s}>{t(`sort.${s}`)}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="wrap grid gap-10 pb-24 pt-8 lg:grid-cols-12 lg:pt-10">
        <aside aria-label={t('filters')} className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-[190px] max-h-[calc(100svh-210px)] overflow-y-auto pr-4" data-lenis-prevent>
            <FilterPanel base={base} filters={filters} update={update} fixed={fixed} brands={brands} />
          </div>
        </aside>
        <div className="lg:col-span-9">
          {active.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {active}
              <button type="button" onClick={clear} className="t-small link-under ml-2 text-forest">{t('clearAll')}</button>
            </div>
          )}
          {status === 'loading' ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:gap-x-6" aria-busy="true" aria-label={t('loadingProducts')}>
              {Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : status === 'error' ? (
            <CatalogUnavailable />
          ) : base.length === 0 ? (
            <Empty title={collection || brand ? t('emptyCollection', { name: title.toLowerCase() }) : t('emptyRangeTitle')} body={t('emptyCollectionBody')} store />
          ) : results.length === 0 ? (
            <Empty title={t('noResults')} body={t('noResultsBody')} action={<button type="button" onClick={clear} className="btn btn-forest btn-sm">{t('clearAll')}</button>} />
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:gap-x-6">
                {results.slice(0, limit).map((p, i) => (
                  <li key={p.id}><ProductCard product={p} onQuickView={openQuick} eager={i < 3} sizes="(min-width: 1024px) 24vw, (min-width: 768px) 33vw, 50vw" /></li>
                ))}
              </ul>
              {results.length > limit && (
                <div className="mt-14 flex flex-col items-center gap-3">
                  <p className="t-small text-stone">{num(limit)} / {num(results.length)}</p>
                  <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="btn btn-outline">{t('viewAll')}</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <FilterDrawer open={drawer} onClose={() => setDrawer(false)} count={results.length}>
        <FilterPanel base={base} filters={filters} update={update} fixed={fixed} brands={brands} />
      </FilterDrawer>
    </>
  );
}

export function PageHeader({ title, blurb, meta, back, logo }: { title: string; blurb?: string; meta?: string; back?: { to: string; label: string }; logo?: string }) {
  const scope = useScrollMotion<HTMLElement>([title]);
  return (
    <header ref={scope} className="bg-ivory pt-[150px] lg:pt-[176px]">
      <div className="wrap grid gap-6 pb-10 lg:grid-cols-12 lg:pb-14">
        <div className="lg:col-span-8">
          {back && <Link to={back.to} className="t-small link-under mb-6 inline-block text-stone">{back.label}</Link>}
          {logo && <img src={logo} alt="" className="mb-6 h-12 w-auto object-contain" />}
          <RevealText as="h1" className="t-display break-words text-forest">{title}</RevealText>
        </div>
        <div className="flex flex-col justify-end gap-3 lg:col-span-4">
          {blurb && <p className="max-w-[46ch] whitespace-pre-line text-stone">{blurb}</p>}
          {meta && <p className="t-small tnum text-stone">{meta}</p>}
        </div>
      </div>
    </header>
  );
}

function Empty({ title, body, action, store }: { title: string; body: string; action?: ReactNode; store?: boolean }) {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-start gap-4 border-t border-line py-14">
      <p className="t-h3 first-letter:uppercase">{title}</p>
      <p className="max-w-[46ch] text-stone">{body}</p>
      <div className="mt-2 flex flex-wrap gap-3">
        {action}
        {store && <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" data-cursor="buy" className="btn btn-forest btn-sm">{t('heroStore')}<span className="sr-only">{t('newTab')}</span></a>}
        <Link to="/shop" className="btn btn-outline btn-sm">{t('shopTitle')}</Link>
      </div>
    </div>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const { t } = useLang();
  const [q, setQ] = useState(value);
  useEffect(() => setQ(value), [value]);
  useEffect(() => {
    if (q === value) return;
    const id = window.setTimeout(() => onChange(q.trim()), 250);
    return () => window.clearTimeout(id);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className="relative hidden flex-1 md:block md:max-w-xs">
      <span className="sr-only">{t('searchLabel')}</span>
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" aria-hidden><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="m13 13 5 5" stroke="currentColor" strokeWidth="1.4" /></svg>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchPlaceholder')} className="min-h-10 w-full rounded-[2px] border border-line bg-transparent pl-9 pr-3 text-[0.9rem]" />
    </label>
  );
}

function activeChips(f: Filters, fixed: Partial<Record<keyof Filters, unknown>>, brands: PublicBrand[], t: ReturnType<typeof useLang>['t'], update: (p: Partial<Filters>) => void) {
  const chip = (key: string, label: string, patch: Partial<Filters>) => (
    <button key={key} type="button" onClick={() => update(patch)} className="chip" aria-label={t('removeFilter', { name: label })}>
      {label}<svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden><path d="M1 1l8 8M9 1 1 9" stroke="currentColor" strokeWidth="1.3" /></svg>
    </button>
  );
  const out: ReactNode[] = [];
  if (f.q) out.push(chip('q', `"${f.q}"`, { q: '' }));
  if (f.collection && !fixed.collection) out.push(chip('c', t(`col.${f.collection}` as Key), { collection: '' }));
  if (!fixed.brands) for (const b of f.brands) out.push(chip(`b-${b}`, brands.find((x) => x.slug === b)?.name ?? b, { brands: f.brands.filter((x) => x !== b) }));
  for (const g of f.genders) out.push(chip(`g-${g}`, t(`gender.${g}` as Key), { genders: f.genders.filter((x) => x !== g) }));
  for (const s of f.sizes) out.push(chip(`s-${s}`, s, { sizes: f.sizes.filter((x) => x !== s) }));
  if (f.min !== null) out.push(chip('min', `≥ ${f.min.toLocaleString('id-ID')}`, { min: null }));
  if (f.max !== null) out.push(chip('max', `≤ ${f.max.toLocaleString('id-ID')}`, { max: null }));
  if (f.inStock) out.push(chip('stock', t('filterInStock'), { inStock: false }));
  if (f.sale) out.push(chip('sale', t('filterSale'), { sale: false }));
  return out;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group border-b border-line py-1">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-medium">
        {title}
        <svg viewBox="0 0 10 6" className="h-1.5 w-2.5 transition-transform duration-300 group-open:rotate-180" aria-hidden><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  );
}

function Check({ checked, onChange, label, count }: { checked: boolean; onChange: (v: boolean) => void; label: string; count?: number }) {
  const { num } = useLang();
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-forest" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="t-small tnum text-stone">{num(count)}</span>}
    </label>
  );
}

function FilterPanel({ base, filters: f, update, fixed, brands }: { base: ReturnType<typeof useCatalog>['products']; filters: Filters; update: (p: Partial<Filters>) => void; fixed: Partial<Record<keyof Filters, unknown>>; brands: PublicBrand[] }) {
  const { t } = useLang();
  const toggle = (list: string[], v: string, on: boolean) => (on ? [...list, v] : list.filter((x) => x !== v));
  const brandCounts = useMemo(() => {
    const m = new Map<string, number>();
    base.forEach((p) => p.brand && m.set(p.brand.slug, (m.get(p.brand.slug) ?? 0) + 1));
    return m;
  }, [base]);
  const genders = (['men', 'women', 'unisex'] as const).filter((g) => base.some((p) => p.gender === g));
  const sizes = sortSizes(base.flatMap((p) => p.sizes.map((s) => s.size)));
  const anySale = base.some(onSale);
  const [min, setMin] = useState(f.min?.toString() ?? '');
  const [max, setMax] = useState(f.max?.toString() ?? '');
  useEffect(() => { setMin(f.min?.toString() ?? ''); setMax(f.max?.toString() ?? ''); }, [f.min, f.max]);
  const applyPrice = () => {
    const n = (s: string) => (s.trim() === '' ? null : Math.max(0, Number(s.replace(/[^\d]/g, '')) || 0));
    update({ min: n(min), max: n(max) });
  };
  return (
    <div className="text-[0.95rem]">
      {!fixed.collection && (
        <Group title={t('filterCategory')}>
          <ul>
            <li>
              <label className="flex min-h-10 cursor-pointer items-center gap-3">
                <input type="radio" name="collection" checked={!f.collection} onChange={() => update({ collection: '' })} className="h-4 w-4 accent-forest" />
                {t('filterAll')}
              </label>
            </li>
            {COLLECTIONS.map((c) => {
              const n = base.filter((p) => inCollection(p, c)).length;
              return (
                <li key={c}>
                  <label className={`flex min-h-10 cursor-pointer items-center gap-3 ${n ? '' : 'text-stone/60'}`}>
                    <input type="radio" name="collection" checked={f.collection === c} onChange={() => update({ collection: c })} className="h-4 w-4 accent-forest" />
                    <span className="flex-1">{t(`col.${c}` as Key)}</span>
                    <span className="t-small tnum text-stone">{n}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Group>
      )}
      {!fixed.brands && brands.length > 0 && (
        <Group title={t('filterBrand')}>
          {brands.filter((b) => brandCounts.has(b.slug)).map((b) => (
            <Check key={b.slug} label={b.name} count={brandCounts.get(b.slug)} checked={f.brands.includes(b.slug)} onChange={(on) => update({ brands: toggle(f.brands, b.slug, on) })} />
          ))}
        </Group>
      )}
      {genders.length > 1 && (
        <Group title={t('filterGender')}>
          {genders.map((g) => <Check key={g} label={t(`gender.${g}`)} checked={f.genders.includes(g)} onChange={(on) => update({ genders: toggle(f.genders, g, on) })} />)}
        </Group>
      )}
      {sizes.length > 0 && (
        <Group title={t('filterSize')}>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button key={s} type="button" aria-pressed={f.sizes.includes(s)} onClick={() => update({ sizes: toggle(f.sizes, s, !f.sizes.includes(s)) })} className="chip min-w-12 justify-center">
                {s}
              </button>
            ))}
          </div>
        </Group>
      )}
      <Group title={t('filterPrice')}>
        <form onSubmit={(e) => { e.preventDefault(); applyPrice(); }} className="grid grid-cols-2 gap-3">
          <label className="t-small text-stone">{t('filterMin')}
            <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} onBlur={applyPrice} className="field mt-1 min-h-10 text-charcoal" placeholder="0" />
          </label>
          <label className="t-small text-stone">{t('filterMax')}
            <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} onBlur={applyPrice} className="field mt-1 min-h-10 text-charcoal" placeholder="1.000.000" />
          </label>
          <button type="submit" className="sr-only">{t('filterPrice')}</button>
        </form>
      </Group>
      <Group title={t('filterAvailability')}>
        <Check label={t('filterInStock')} checked={f.inStock} onChange={(on) => update({ inStock: on })} />
        {anySale && <Check label={t('filterSale')} checked={f.sale} onChange={(on) => update({ sale: on })} />}
      </Group>
    </div>
  );
}

function FilterDrawer({ open, onClose, count, children }: { open: boolean; onClose: () => void; count: number; children: ReactNode }) {
  const { t, num } = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  const lenis = useLenis();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); lenis?.stop(); }
    if (!open && d.open) d.close();
  }, [open, lenis]);
  useEffect(() => {
    const d = ref.current;
    const closed = () => { lenis?.start(); onClose(); };
    d?.addEventListener('close', closed);
    return () => d?.removeEventListener('close', closed);
  }, [onClose, lenis]);
  return (
    <dialog ref={ref} aria-label={t('filters')} className="sheet m-0 ml-auto h-[100dvh] max-h-none w-[min(420px,100vw)] max-w-none bg-ivory p-0 text-charcoal" onClick={(e) => { if (e.target === e.currentTarget) ref.current?.close(); }}>
      <div className="flex h-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
          <p className="font-medium">{t('filters')}</p>
          <button type="button" onClick={() => ref.current?.close()} aria-label={t('close')} className="-mr-2 flex h-11 w-11 items-center justify-center">
            <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.4" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5" data-lenis-prevent>{children}</div>
        <div className="shrink-0 border-t border-line p-5">
          <button type="button" onClick={() => ref.current?.close()} className="btn btn-forest w-full">{t('showResults', { n: num(count) })}</button>
        </div>
      </div>
    </dialog>
  );
}
