import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { collectionBySlug } from '../data/collections';
import { BRANDS, HAS_SAMPLES, PRODUCTS, RANK_SOURCE, allSizes, effectivePrice, type Availability, type Category, type Product } from '../data/products';
import { Flip, gsap, prefersReducedMotion, useLenis, useReveal } from '../lib/motion';
import { useLang, type Key } from '../i18n';
import { navigate, useLocation } from '../router';
import { ProductCard } from '../components/ProductCard';
import { matches } from '../components/SearchOverlay';
import { CloseIcon, Photo } from '../components/ui';
import NotFound from './NotFound';

type Sort = 'featured' | 'new' | 'low' | 'high';
const PRICES: { key: string; label: Key; test: (n: number) => boolean }[] = [
  { key: 'u100', label: 'priceUnder100', test: (n) => n < 100000 },
  { key: '100-350', label: 'price100to350', test: (n) => n >= 100000 && n <= 350000 },
  { key: 'o350', label: 'priceOver350', test: (n) => n > 350000 },
];
const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-hair py-5">
      <legend className="float-left mb-3 w-full text-[0.92rem] font-medium">{title}</legend>
      <div className="clear-both flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

export default function Shop({ slug, onQuickView }: { slug?: string; onQuickView: (p: Product, c: number) => void }) {
  const { t, pick, availability } = useLang();
  const { search, path } = useLocation();
  const lenis = useLenis();
  const collection = slug ? collectionBySlug(slug) : undefined;
  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const [drawer, setDrawer] = useState(false);
  useReveal(root, [slug]);

  // Filters live in the URL so a filtered view can be shared or bookmarked.
  const q = search.get('q') ?? '';
  const cats = list(search.get('cat')) as Category[];
  const brands = list(search.get('brand'));
  const sizes = list(search.get('size'));
  const prices = list(search.get('price'));
  const avs = list(search.get('av')) as Availability[];
  const sort = (search.get('sort') as Sort) || 'featured';

  const update = (key: string, value: string[] | string) => {
    if (grid.current && !prefersReducedMotion()) flipState.current = Flip.getState(grid.current.querySelectorAll('[data-flip]'));
    const next = new URLSearchParams(search);
    const v = Array.isArray(value) ? value.join(',') : value;
    if (v) next.set(key, v); else next.delete(key);
    if (key === 'sort' && v === 'featured') next.delete('sort');
    navigate(`${path}${next.size ? `?${next}` : ''}`, { replace: true });
  };
  const toggle = (key: string, current: string[], v: string) => update(key, current.includes(v) ? current.filter((x) => x !== v) : [...current, v]);
  const clearAll = () => {
    if (grid.current && !prefersReducedMotion()) flipState.current = Flip.getState(grid.current.querySelectorAll('[data-flip]'));
    navigate(path, { replace: true });
  };

  const base = useMemo(() => PRODUCTS.filter((p) => !collection || collection.match(p)), [collection]);
  const visible = useMemo(() => new Set(base.filter((p) =>
    (!q || matches(p, q)) &&
    (!cats.length || cats.includes(p.category)) &&
    (!brands.length || brands.includes(p.brand)) &&
    (!sizes.length || p.sizes.some((s) => sizes.includes(s))) &&
    (!prices.length || PRICES.some((r) => prices.includes(r.key) && r.test(effectivePrice(p)))) &&
    (!avs.length || avs.includes(p.availability)),
  ).map((p) => p.id)), [base, q, cats, brands, sizes, prices, avs]);
  const ordered = useMemo(() => {
    const l = base.slice();
    if (sort === 'low') l.sort((a, b) => effectivePrice(a) - effectivePrice(b) || a.rank - b.rank);
    if (sort === 'high') l.sort((a, b) => effectivePrice(b) - effectivePrice(a) || a.rank - b.rank);
    if (sort === 'new') l.sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew) || a.rank - b.rank);
    return l;
  }, [base, sort]);

  useLayoutEffect(() => {
    const state = flipState.current;
    if (!state) return;
    flipState.current = null;
    Flip.from(state, {
      duration: 0.6, ease: 'power3.inOut', absolute: true, nested: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.45, delay: 0.15 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.95, duration: 0.3 }),
    });
  }, [search]);
  useEffect(() => { if (drawer) lenis?.stop(); else lenis?.start(); }, [drawer, lenis]);

  if (slug && !collection) return <NotFound />;

  const presentCats = [...new Set(base.map((p) => p.category))];
  const sizeOrder = allSizes();
  const presentSizes = sizeOrder.filter((s) => base.some((p) => p.sizes.includes(s)));
  const presentAv = [...new Set(base.map((p) => p.availability))];
  const active = cats.length + brands.length + sizes.length + prices.length + avs.length + (q ? 1 : 0);

  const filters = (
    <div>
      {presentCats.length > 1 && (
        <Group title={t('fCategory')}>
          {presentCats.map((c) => <button key={c} type="button" className="chip" aria-pressed={cats.includes(c)} onClick={() => toggle('cat', cats, c)}>{t(`cat.${c}` as Key)}</button>)}
        </Group>
      )}
      {BRANDS.length > 1 && (
        <Group title={t('fBrand')}>
          {BRANDS.map((b) => <button key={b} type="button" className="chip" aria-pressed={brands.includes(b)} onClick={() => toggle('brand', brands, b)}>{b}</button>)}
        </Group>
      )}
      <Group title={t('fSize')}>
        {presentSizes.map((s) => <button key={s} type="button" className="chip min-w-[48px] justify-center" aria-pressed={sizes.includes(s)} onClick={() => toggle('size', sizes, s)}>{s}</button>)}
      </Group>
      <Group title={t('fPrice')}>
        {PRICES.map((r) => <button key={r.key} type="button" className="chip" aria-pressed={prices.includes(r.key)} onClick={() => toggle('price', prices, r.key)}>{t(r.label)}</button>)}
      </Group>
      {presentAv.length > 1 && (
        <Group title={t('fAvailability')}>
          {presentAv.map((a) => <button key={a} type="button" className="chip" aria-pressed={avs.includes(a)} onClick={() => toggle('av', avs, a)}>{availability(a)}</button>)}
        </Group>
      )}
      {active > 0 && <button type="button" onClick={clearAll} className="link-line mt-4 text-[0.92rem]">{t('clearAll')}</button>}
    </div>
  );

  return (
    <div ref={root} className="bg-ivory">
      {collection?.photo ? (
        <section className="relative h-[52svh] min-h-[380px] overflow-hidden bg-pine text-ivory">
          <div data-parallax="0.18" className="absolute -inset-y-[10%] inset-x-0"><Photo name={collection.photo} alt="" sizes="100vw" priority className="h-full w-full object-cover" /></div>
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgb(16_43_37/0.5),rgb(16_43_37/0.15)_45%,rgb(16_43_37/0.8))]" />
          <div className="wrap relative flex h-full flex-col justify-end pb-10">
            <h1 className="display" data-reveal="text">{pick(collection.name)}</h1>
            <p className="lede mt-4 max-w-[46ch] text-ivory/85">{pick(collection.description)}</p>
          </div>
        </section>
      ) : (
        <section className="wrap pb-6 pt-[160px]">
          <h1 className="display text-pine" data-reveal="text">{collection ? pick(collection.name) : t('shopTitle')}</h1>
          <p className="lede mt-4 max-w-[52ch] text-stone">{collection ? pick(collection.description) : t('shopIntro')}</p>
        </section>
      )}

      <div className="wrap pb-28 pt-10">
        <div className="sticky top-[72px] z-20 -mx-[clamp(18px,4.2vw,56px)] flex items-center justify-between gap-4 bg-ivory/95 px-[clamp(18px,4.2vw,56px)] py-3 backdrop-blur lg:static lg:mx-0 lg:bg-transparent lg:px-0">
          <p className="sr-only" aria-live="polite">{t('count', { n: visible.size })}</p>
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setDrawer(true)} className="chip shrink-0 lg:hidden">{t('filters')}{active > 0 && <span className="tnum rounded-full bg-forest px-1.5 text-[0.75rem] text-ivory">{active}</span>}</button>
            <p aria-hidden className="hidden whitespace-nowrap text-stone sm:block">{t('count', { n: visible.size })}</p>
            {q && <button type="button" onClick={() => update('q', '')} className="chip hidden max-w-[16ch] truncate sm:inline-flex">"{q}" <CloseIcon className="h-3 w-3 shrink-0" /></button>}
          </div>
          <label className="relative min-w-0 flex-1 sm:max-w-[240px] sm:flex-none">
            <span className="sr-only">{t('sortLabel')}</span>
            <select value={sort} onChange={(e) => update('sort', e.target.value)} className="field h-[42px] w-full appearance-none pr-10 sm:w-auto">
              <option value="featured">{RANK_SOURCE === 'sales' ? t('sortPopular') : t('sortFeatured')}</option>
              <option value="new">{t('sortNew')}</option>
              <option value="low">{t('sortLow')}</option>
              <option value="high">{t('sortHigh')}</option>
            </select>
            <svg viewBox="0 0 12 8" className="pointer-events-none absolute right-4 top-1/2 h-2 w-3 -translate-y-1/2" aria-hidden><path d="m1 1 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          </label>
        </div>

        <div aria-hidden className="mt-4 flex flex-wrap items-center gap-3 sm:hidden">
          <p className="text-stone">{t('count', { n: visible.size })}</p>
          {q && <button type="button" tabIndex={-1} onClick={() => update('q', '')} className="chip max-w-[60vw] truncate">"{q}" <CloseIcon className="h-3 w-3 shrink-0" /></button>}
        </div>
        {HAS_SAMPLES && <p className="small mt-4 border-l-2 border-champagne pl-3 text-stone sm:hidden">{t('previewShort')}</p>}
        <div className="mt-6 grid gap-10 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block" aria-label={t('filters')}><div className="sticky top-28">{filters}</div></aside>
          <div className="lg:col-span-9">
            <div ref={grid} className="relative grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 md:grid-cols-3">
              {ordered.map((p) => <ProductCard key={p.id} product={p} hidden={!visible.has(p.id)} onQuickView={onQuickView} />)}
            </div>
            {visible.size === 0 && (
              <div className="border border-hair bg-white/60 p-8">
                <p className="h3 text-pine">{t('emptyTitle')}</p>
                <p className="mt-2 text-stone">{t('emptyBody')}</p>
                <button type="button" onClick={clearAll} className="btn btn-forest mt-6">{t('clearAll')}</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={t('filters')}>
          <button type="button" aria-label={t('close')} onClick={() => setDrawer(false)} className="absolute inset-0 bg-pine/60" />
          <div className="absolute inset-x-0 bottom-0 max-h-[85svh] overflow-y-auto rounded-t-[10px] bg-ivory px-5 pb-6 pt-5" data-lenis-prevent>
            <div className="flex items-center justify-between pb-3">
              <p className="h3">{t('filters')}</p>
              <button type="button" onClick={() => setDrawer(false)} aria-label={t('close')} className="flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-hair"><CloseIcon /></button>
            </div>
            {filters}
            <button type="button" onClick={() => setDrawer(false)} className="btn btn-forest mt-6 w-full">{t('showResults', { n: visible.size })}</button>
          </div>
        </div>
      )}
    </div>
  );
}
