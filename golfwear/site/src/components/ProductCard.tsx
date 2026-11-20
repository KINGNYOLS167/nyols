import { useState } from 'react';
import { formatPrice, imageFor, type Product } from '../data/products';
import { useLang } from '../i18n';

export function ProductCard({ product: p, hidden, onOpen }: { product: Product; hidden: boolean; onOpen: (p: Product, colour: number) => void }) {
  const { t, pick } = useLang();
  const [colour, setColour] = useState(0);
  return (
    <article data-flip={p.id} hidden={hidden} className="relative">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-sand">
        {p.colors.map((c, i) => (
          <img
            key={c.key}
            src={imageFor(p, c)}
            alt={i === colour ? `${pick(p.name)}, ${pick(c.name)}` : ''}
            width={900}
            height={1125}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${i === colour ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {p.rank <= 3 && <span className="rounded-full bg-fairway px-2.5 py-1 text-[0.75rem] font-medium text-ivory">{t('bestBadge')}</span>}
          {p.isNew && <span className="rounded-full bg-chalk px-2.5 py-1 text-[0.75rem] font-medium text-fairway">{t('newBadge')}</span>}
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <h3 className="text-[1.04rem] font-medium leading-snug">
          {/* the button's ::after covers the whole card, so the card opens the quick view */}
          <button type="button" data-cursor="view" onClick={() => onOpen(p, colour)} className="text-left after:absolute after:inset-0 after:content-['']">
            {pick(p.name)}
          </button>
        </h3>
        <p className="shrink-0 text-right tnum">
          {formatPrice(p.price)}
          {p.category === 'sleeves' && <span className="block text-[0.8rem] text-stone">{t('pair')}</span>}
        </p>
      </div>
      <div className="relative z-10 mt-2 flex w-max gap-1">
        {p.colors.map((c, i) => (
          <button
            key={c.key}
            type="button"
            aria-label={t('colourOf', { name: pick(c.name) })}
            aria-pressed={i === colour}
            onClick={() => setColour(i)}
            onPointerEnter={() => setColour(i)}
            className={`flex h-8 w-8 items-center justify-center rounded-full ring-1 transition ${i === colour ? 'ring-fairway' : 'ring-transparent hover:ring-line'}`}
          >
            <span className="h-4 w-4 rounded-full ring-1 ring-black/15" style={{ background: c.stripe ? `repeating-linear-gradient(0deg, ${c.hex} 0 3px, ${c.stripe} 3px 5px)` : c.hex }} />
          </button>
        ))}
      </div>
    </article>
  );
}
