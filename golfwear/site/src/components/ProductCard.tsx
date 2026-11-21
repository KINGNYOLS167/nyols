import { useState } from 'react';
import { imageFor, type Product } from '../data/products';
import { useLang } from '../i18n';
import { Link } from '../router';
import { AvailabilityTag, Price, swatchBg } from './ui';

/**
 * Editorial product card: tall image that swaps to the next colour on hover, quick view on
 * hover (or the button below on touch), then brand, name, price, category and availability.
 */
export function ProductCard({ product: p, onQuickView, size = 'md', hidden = false }: {
  product: Product; onQuickView?: (p: Product, colour: number) => void; size?: 'md' | 'lg'; hidden?: boolean;
}) {
  const { t, pick } = useLang();
  const [colour, setColour] = useState(0);
  const [hover, setHover] = useState(false);
  const shown = hover && p.colors.length > 1 ? (colour + 1) % p.colors.length : colour;
  const href = `/product/${p.id}`;
  return (
    <article data-flip={p.id} hidden={hidden} className="group relative" onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)} onPointerLeave={() => setHover(false)}>
      <div className={`relative overflow-hidden bg-linen ${size === 'lg' ? 'aspect-[4/5] rounded-[2px]' : 'aspect-[4/5] rounded-[2px]'}`}>
        {p.colors.map((c, i) => (
          <img
            key={c.key}
            src={imageFor(p, c)}
            alt={i === shown ? `${pick(p.name)}, ${pick(c.name)}` : ''}
            width={900}
            height={1125}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-[var(--ease-quint)] group-hover:scale-[1.035] ${i === shown ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
        <div className="absolute left-3 top-3 flex gap-1.5 text-[0.72rem] font-medium">
          {p.isNew && <span className="rounded-full bg-ivory px-2.5 py-1 text-pine">{t('newBadge')}</span>}
          {p.salePrice && p.salePrice < p.price && <span className="rounded-full bg-champagne px-2.5 py-1 text-pine">{t('saleBadge')}</span>}
        </div>
        {onQuickView && (
          <button
            type="button"
            onClick={() => onQuickView(p, colour)}
            className="absolute inset-x-3 bottom-3 z-10 hidden min-h-[44px] translate-y-3 rounded-full bg-ivory/95 text-[0.9rem] font-medium text-pine opacity-0 backdrop-blur transition-[opacity,transform] duration-500 ease-[var(--ease-quint)] group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 md:block"
          >
            {t('quickView')}
          </button>
        )}
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.72rem] font-medium tracking-[0.18em] text-stone">{p.brand}</p>
          <h3 className={`mt-1 leading-snug ${size === 'lg' ? 'text-[1.25rem]' : 'text-[1.02rem]'}`}>
            <Link to={href} data-cursor="view" className="after:absolute after:inset-0 after:content-['']">{pick(p.name)}</Link>
          </h3>
        </div>
        <Price product={p} className="shrink-0 text-right text-[0.98rem]" />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[0.82rem] text-stone">
        <span>{t(`cat.${p.category}`)}</span>
        <AvailabilityTag value={p.availability} />
      </div>
      <div className="relative z-10 mt-2.5 flex w-max gap-0.5">
        {p.colors.map((c, i) => (
          <button
            key={c.key}
            type="button"
            aria-label={t('colourOf', { name: pick(c.name) })}
            aria-pressed={i === colour}
            onClick={() => setColour(i)}
            onPointerEnter={() => setColour(i)}
            className={`flex h-7 w-7 items-center justify-center rounded-full ring-1 transition ${i === colour ? 'ring-charcoal' : 'ring-transparent hover:ring-hair'}`}
          >
            <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/15" style={{ background: swatchBg(c) }} />
          </button>
        ))}
      </div>
    </article>
  );
}
