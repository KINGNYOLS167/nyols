import { useEffect, useMemo, useRef, useState } from 'react';
import { PRODUCTS, imageFor, type Product } from '../data/products';
import { useLenis } from '../lib/motion';
import { useLang } from '../i18n';
import { Link, navigate } from '../router';
import { Arrow, CloseIcon, Price, SearchIcon } from './ui';

export const searchText = (p: Product) =>
  [p.name.id, p.name.en, p.brand, p.category, ...p.colors.flatMap((c) => [c.name.id, c.name.en]), p.blurb.en, p.blurb.id].join(' ').toLowerCase();
export const matches = (p: Product, q: string) => q.trim().toLowerCase().split(/\s+/).every((w) => searchText(p).includes(w));

/** Search panel: live results as you type, Enter for the full results page. */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, pick } = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const lenis = useLenis();
  const [q, setQ] = useState('');
  const results = useMemo(() => (q.trim() ? PRODUCTS.filter((p) => matches(p, q)).slice(0, 6) : []), [q]);

  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) { d.showModal(); lenis?.stop(); window.setTimeout(() => input.current?.focus(), 30); }
    if (!open && d.open) d.close();
  }, [open, lenis]);

  const go = (to: string) => { ref.current?.close(); navigate(to); };

  return (
    <dialog ref={ref} className="sheet m-0 mx-auto mt-0 w-full max-w-none bg-ivory p-0 text-charcoal" data-lenis-prevent
      onClose={() => { lenis?.start(); setQ(''); onClose(); }} onClick={(e) => { if (e.target === e.currentTarget) ref.current?.close(); }} aria-label={t('search')}>
      <div className="wrap py-6 sm:py-10">
        <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(`/shop?q=${encodeURIComponent(q.trim())}`); }} className="flex items-center gap-4 border-b border-charcoal pb-3">
          <SearchIcon className="h-6 w-6 shrink-0 text-stone" />
          <label className="sr-only" htmlFor="site-search">{t('search')}</label>
          <input id="site-search" ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchPlaceholder')} autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-2 text-[clamp(1.4rem,4vw,2.6rem)] font-light outline-none placeholder:text-stone/70" />
          <button type="button" onClick={() => ref.current?.close()} aria-label={t('close')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 ring-hair hover:ring-charcoal"><CloseIcon /></button>
        </form>
        <div className="min-h-[120px] pt-6" aria-live="polite">
          {!q.trim() && <p className="small text-stone">{t('searchHint')}</p>}
          {q.trim() && results.length === 0 && <p className="text-stone">{t('searchNone', { q: q.trim() })}</p>}
          {results.length > 0 && (
            <>
              <ul className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
                {results.map((p) => (
                  <li key={p.id}>
                    <Link to={`/product/${p.id}`} onClick={() => ref.current?.close()} className="group block">
                      <div className="aspect-[4/5] overflow-hidden bg-linen"><img src={imageFor(p)} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /></div>
                      <p className="mt-2 text-[0.95rem] leading-snug">{pick(p.name)}</p>
                      <Price product={p} className="small text-stone" />
                    </Link>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => go(`/shop?q=${encodeURIComponent(q.trim())}`)} className="link-line mt-8 inline-flex items-center gap-2">{t('searchAll')} <Arrow /></button>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
