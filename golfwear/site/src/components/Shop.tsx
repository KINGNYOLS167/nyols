import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, PRODUCTS, type Category, type Product } from '../data/products';
import { Flip, gsap, prefersReducedMotion } from '../lib/motion';
import { useLang } from '../i18n';
import { ProductCard } from './ProductCard';

type Sort = 'best' | 'low' | 'high' | 'new';

export function Shop({ onOpen }: { onOpen: (p: Product, colour?: number) => void }) {
  const { t } = useLang();
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [sort, setSort] = useState<Sort>('best');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const grid = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);

  // Remember where every card is, so the change can animate from there (GSAP Flip).
  const capture = () => {
    if (grid.current && !prefersReducedMotion()) flipState.current = Flip.getState(grid.current.querySelectorAll('[data-flip]'));
  };
  const change = <T,>(set: (v: T) => void) => (v: T) => { capture(); set(v); };

  useEffect(() => {
    const id = window.setTimeout(() => { if (input !== query) { capture(); setQuery(input); } }, 220);
    return () => window.clearTimeout(id);
  }, [input, query]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    const match = (p: Product) =>
      (category === 'all' || p.category === category) &&
      (!q || `${p.name.id} ${p.name.en} ${p.colors.map((c) => `${c.name.id} ${c.name.en}`).join(' ')}`.toLowerCase().includes(q));
    return new Set(PRODUCTS.filter(match).map((p) => p.id));
  }, [category, q]);

  const ordered = useMemo(() => {
    const list = PRODUCTS.slice();
    if (sort === 'low') list.sort((a, b) => a.price - b.price || a.rank - b.rank);
    if (sort === 'high') list.sort((a, b) => b.price - a.price || a.rank - b.rank);
    if (sort === 'new') list.sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew) || a.rank - b.rank);
    return list;
  }, [sort]);

  useLayoutEffect(() => {
    const state = flipState.current;
    if (!state) return;
    flipState.current = null;
    Flip.from(state, {
      duration: 0.6,
      ease: 'power3.inOut',
      absolute: true,
      nested: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.45, delay: 0.15 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.94, duration: 0.3 }),
    });
  }, [category, sort, query]);

  const count = (c: Category | 'all') => (c === 'all' ? PRODUCTS.length : PRODUCTS.filter((p) => p.category === c).length);

  return (
    <section id="shop" className="bg-ivory">
      <div className="wrap py-20 lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
          <h2 className="h2 text-fairway">{t('shopTitle')}</h2>
          <p className="text-stone" aria-live="polite">{t('shopCount', { n: visible.size })}</p>
        </div>

        <div className="mt-9 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0" role="group" aria-label={t('categories')}>
            {(['all', ...CATEGORIES] as const).map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => category !== c && change(setCategory)(c)}>
                {c === 'all' ? t('all') : t(`cat.${c}`)}
                <span className="text-[0.8rem] opacity-60 tnum">{count(c)}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <label className="relative flex-1 lg:w-64 lg:flex-none">
              <span className="sr-only">{t('search')}</span>
              <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" aria-hidden><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.6" /></svg>
              <input
                type="search"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('search')}
                className="h-[42px] w-full rounded-full border-[1.5px] border-line bg-chalk pl-10 pr-4 text-[0.95rem] placeholder:text-stone focus:border-fairway focus:outline-none"
              />
            </label>
            <label className="relative">
              <span className="sr-only">{t('sortLabel')}</span>
              <select
                value={sort}
                onChange={(e) => change(setSort)(e.target.value as Sort)}
                className="h-[42px] appearance-none rounded-full border-[1.5px] border-line bg-chalk pl-4 pr-10 text-[0.95rem] focus:border-fairway focus:outline-none"
              >
                <option value="best">{t('sortBest')}</option>
                <option value="low">{t('sortLow')}</option>
                <option value="high">{t('sortHigh')}</option>
                <option value="new">{t('sortNew')}</option>
              </select>
              <svg viewBox="0 0 12 8" className="pointer-events-none absolute right-4 top-1/2 h-2 w-3 -translate-y-1/2" aria-hidden><path d="m1 1 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
            </label>
          </div>
        </div>

        <div ref={grid} className="relative mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
          {ordered.map((p) => (
            <ProductCard key={p.id} product={p} hidden={!visible.has(p.id)} onOpen={onOpen} />
          ))}
        </div>

        {visible.size === 0 && (
          <div className="mt-6 rounded-[4px] border border-line bg-chalk p-8">
            <p className="text-[1.1rem]">{t('emptyTitle', { q: input.trim() })}</p>
            <p className="mt-1 text-stone">{t('emptyBody')}</p>
            <button type="button" className="btn btn-green mt-5" onClick={() => { capture(); setInput(''); setQuery(''); setCategory('all'); }}>
              {t('clearSearch')}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
