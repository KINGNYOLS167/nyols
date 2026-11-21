import { useEffect, useMemo, useRef, useState } from 'react';
import { COLLECTIONS, matchesQuery, useCatalog } from '../lib/catalog';
import { Link, navigate } from '../lib/router';
import { useLenis } from '../lib/motion';
import { useLang, type Key } from '../i18n';
import { ProductImage } from './Media';
import { Price } from './Price';

/** Instant product search across the loaded catalogue. Press "/" anywhere to open it. */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const { products, status } = useCatalog();
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const lenis = useLenis();
  const [q, setQ] = useState('');

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      lenis?.stop();
      requestAnimationFrame(() => input.current?.focus());
    }
    if (!open && d.open) d.close();
  }, [open, lenis]);
  useEffect(() => {
    const d = ref.current;
    const closed = () => { lenis?.start(); onClose(); };
    d?.addEventListener('close', closed);
    return () => d?.removeEventListener('close', closed);
  }, [onClose, lenis]);

  const results = useMemo(() => (q.trim() ? products.filter((p) => matchesQuery(p, q)) : []), [products, q]);
  const cols = useMemo(() => {
    const s = q.trim().toLowerCase();
    return COLLECTIONS.filter((c) => !s || t(`col.${c}` as Key).toLowerCase().includes(s));
  }, [q, t]);
  const close = () => ref.current?.close();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    close();
    navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop');
  };

  return (
    <dialog
      ref={ref}
      aria-label={t('searchLabel')}
      className="sheet m-0 mt-0 max-h-[92dvh] w-full max-w-none overflow-hidden bg-ivory p-0 text-charcoal backdrop:bg-transparent"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="max-h-[92dvh] overflow-y-auto" data-lenis-prevent>
        <form role="search" onSubmit={submit} className="wrap flex items-center gap-4 border-b border-line py-5">
          <svg viewBox="0 0 20 20" className="h-6 w-6 shrink-0 text-stone" aria-hidden><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="m13 13 5 5" stroke="currentColor" strokeWidth="1.3" /></svg>
          <label htmlFor="site-search" className="sr-only">{t('searchLabel')}</label>
          <input
            id="site-search"
            ref={input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('searchPlaceholder')}
            autoComplete="off"
            className="min-h-14 w-full bg-transparent text-[clamp(1.4rem,1rem+2vw,2.4rem)] font-light outline-none placeholder:text-stone/60"
          />
          <button type="button" onClick={close} aria-label={t('close')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-ivory-2">
            <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.4" /></svg>
          </button>
        </form>
        <div className="wrap grid gap-10 py-8 md:grid-cols-12">
          <div className="md:col-span-4">
            {cols.length > 0 && (
              <>
                <p className="t-small text-stone">{t('searchCollections')}</p>
                <ul className="mt-3">
                  {cols.map((c) => (
                    <li key={c}><Link to={`/collections/${c}`} onClick={close} className="link-line inline-block py-1.5 text-[1.1rem]">{t(`col.${c}` as Key)}</Link></li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="md:col-span-8" aria-live="polite">
            {q.trim() && (
              <>
                <p className="t-small text-stone">{t('searchProducts')}</p>
                {results.length === 0 ? (
                  <p className="mt-3 text-[1.1rem]">{status === 'loading' ? t('loadingProducts') : t('searchEmpty', { q: q.trim() })}</p>
                ) : (
                  <ul className="mt-3 divide-y divide-line">
                    {results.slice(0, 6).map((p) => (
                      <li key={p.id}>
                        <Link to={`/product/${p.slug}`} onClick={close} className="group flex items-center gap-4 py-3">
                          <span className="relative block h-20 w-16 shrink-0 overflow-hidden bg-ivory-2">
                            <ProductImage product={p} sizes="64px" className="absolute inset-0 h-full w-full" />
                          </span>
                          <span className="min-w-0 flex-1">
                            {p.brand && <span className="t-small block text-stone">{p.brand.name}</span>}
                            <span className="line-clamp-1 group-hover:underline group-hover:underline-offset-4">{p.name}</span>
                          </span>
                          <Price product={p} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {results.length > 0 && (
                  <button type="button" onClick={submit} className="link-under mt-5 font-medium text-forest">{t('searchSeeAll', { n: results.length })}</button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
