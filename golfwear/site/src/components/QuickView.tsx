import { useEffect, useRef, useState } from 'react';
import { buyUrl, hasDirectLink, type PublicProduct } from '../lib/catalog';
import { Link } from '../lib/router';
import { useLenis } from '../lib/motion';
import { useLang } from '../i18n';
import { ProductImage } from './Media';
import { Availability, Price } from './Price';

/** Quick product details in a dialog, opened from product cards. */
export function QuickView({ product, onClose }: { product: PublicProduct | null; onClose: () => void }) {
  const { t } = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  const lenis = useLenis();
  const [image, setImage] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (product && !d.open) {
      setImage(0);
      d.showModal();
      lenis?.stop();
    } else if (!product && d.open) d.close();
  }, [product, lenis]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const closed = () => { lenis?.start(); onClose(); };
    d.addEventListener('close', closed);
    return () => d.removeEventListener('close', closed);
  }, [onClose, lenis]);

  const p = product;
  return (
    <dialog
      ref={ref}
      aria-labelledby="qv-title"
      className="sheet m-auto w-[min(980px,calc(100vw-24px))] max-w-none overflow-hidden rounded-[2px] bg-ivory p-0 text-charcoal backdrop:bg-transparent"
      onClick={(e) => { if (e.target === e.currentTarget) ref.current?.close(); }}
    >
      {p && (
        <div className="grid max-h-[88svh] overflow-y-auto md:grid-cols-2" data-lenis-prevent>
          <div className="relative bg-ivory-2">
            <ProductImage product={p} index={image} sizes="(min-width: 768px) 490px, 100vw" className="aspect-[4/5] h-full w-full" eager />
            {p.images.length > 1 && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
                {p.images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={t('showImage', { n: i + 1 })}
                    aria-pressed={image === i}
                    onClick={() => setImage(i)}
                    className={`h-2 rounded-full transition-all ${image === i ? 'w-6 bg-pine' : 'w-2 bg-pine/35'}`}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col p-6 sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <div>
                {p.brand && <p className="t-small text-stone">{p.brand.name}</p>}
                <h2 id="qv-title" className="t-h3 mt-1">{p.name}</h2>
              </div>
              <button type="button" onClick={() => ref.current?.close()} aria-label={t('close')} className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-ivory-2">
                <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.4" /></svg>
              </button>
            </div>
            <div className="mt-4"><Price product={p} size="lg" /></div>
            <div className="mt-2"><Availability product={p} detail /></div>
            {p.sizes.length > 0 && (
              <div className="mt-6">
                <p className="t-small text-stone">{t('selectSize')}</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {p.sizes.map((s) => (
                    <li key={s.size} className={`t-small min-w-11 rounded-[2px] border px-3 py-2 text-center ${s.available ? 'border-line' : 'border-line text-stone/60 line-through'}`}>
                      <span className="sr-only">{s.available ? '' : t('soldOutSize', { size: s.size })}</span>
                      <span aria-hidden={!s.available}>{s.size}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {p.description && <p className="mt-6 line-clamp-5 whitespace-pre-line text-stone">{p.description}</p>}
            <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row">
              <a href={buyUrl(p)} target="_blank" rel="noopener" data-cursor="buy" className="btn btn-forest flex-1">
                {hasDirectLink(p) ? t('buyTokopedia') : t('findTokopedia')}<span className="sr-only">{t('newTab')}</span>
              </a>
              <Link to={`/product/${p.slug}`} onClick={() => ref.current?.close()} className="btn btn-outline flex-1">{t('viewProduct')}</Link>
            </div>
            <p className="t-micro mt-4 text-stone">{t('payNote')}</p>
          </div>
        </div>
      )}
    </dialog>
  );
}
