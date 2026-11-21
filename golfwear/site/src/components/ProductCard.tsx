import { buyUrl, hasDirectLink, type PublicProduct } from '../lib/catalog';
import { Link } from '../lib/router';
import { useLang } from '../i18n';
import { ProductImage } from './Media';
import { Availability, Price } from './Price';

interface Props {
  product: PublicProduct;
  rank?: number;
  large?: boolean;
  sizes?: string;
  onQuickView?: (p: PublicProduct) => void;
  eager?: boolean;
}

export function ProductCard({ product: p, rank, large = false, sizes = '(min-width: 1024px) 25vw, 50vw', onQuickView, eager }: Props) {
  const { t, num } = useLang();
  const href = `/product/${p.slug}`;
  return (
    <article className="group relative flex flex-col">
      <div className={`relative overflow-hidden bg-ivory-2 ${large ? 'aspect-[4/5] lg:aspect-[5/6]' : 'aspect-[4/5]'}`}>
        <Link to={href} data-cursor="view" className="absolute inset-0 block" aria-label={p.name} tabIndex={-1}>
          <ProductImage product={p} sizes={sizes} eager={eager} className="absolute inset-0 h-full w-full transition-transform duration-[1.4s] ease-[var(--ease-expo)] group-hover:scale-[1.035]" />
          {p.images[1] && (
            <span className="absolute inset-0 opacity-0 transition-opacity duration-700 ease-[var(--ease-quint)] group-hover:opacity-100">
              <ProductImage product={p} index={1} sizes={sizes} alt="" className="h-full w-full" />
            </span>
          )}
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {p.isNew && <span className="t-micro rounded-[2px] bg-ivory px-2 py-1 font-medium text-forest">{t('newBadge')}</span>}
          {(p.availability === 'sold_out' || p.availability === 'preorder') && (
            <span className="t-micro rounded-[2px] bg-pine/85 px-2 py-1 text-ivory">{t(`avail.${p.availability}`)}</span>
          )}
        </div>
        {/* Hover actions for mouse users; touch users tap through to the product page. */}
        <div className="absolute inset-x-3 bottom-3 hidden translate-y-3 gap-2 opacity-0 transition-[opacity,transform] duration-500 ease-[var(--ease-quint)] group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:hover)]:flex">
          {onQuickView && (
            <button type="button" onClick={() => onQuickView(p)} className="btn btn-sm flex-1 bg-ivory/95 text-pine backdrop-blur before:bg-white">
              {t('quickView')}
            </button>
          )}
          <a href={buyUrl(p)} target="_blank" rel="noopener" data-cursor="buy" className="btn btn-sm btn-forest flex-1">
            {hasDirectLink(p) ? t('buyTokopedia') : t('tokopediaStore')}
            <span className="sr-only">{t('newTab')}</span>
          </a>
        </div>
      </div>
      <div className="mt-4 flex items-start gap-4">
        {rank !== undefined && (
          <span className="tnum -mt-1 text-[2.4rem] font-light leading-none text-champagne-ink" aria-label={t('rank', { n: rank })}>
            {rank}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {p.brand && <p className="t-small text-stone">{p.brand.name}</p>}
          <h3 className={`mt-0.5 leading-snug ${large ? 'text-[1.25rem] font-light' : 'text-[1rem]'}`}>
            <Link to={href} className="line-clamp-2 hover:underline hover:decoration-1 hover:underline-offset-4">{p.name}</Link>
          </h3>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <Price product={p} />
            {rank !== undefined && p.sold > 0 ? (
              <span className="t-small text-stone">{t('soldCount', { n: num(p.sold) })}</span>
            ) : (
              p.availability !== 'sold_out' && p.availability !== 'preorder' && <Availability product={p} />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton({ large = false }: { large?: boolean }) {
  return (
    <div aria-hidden>
      <div className={`skeleton ${large ? 'aspect-[5/6]' : 'aspect-[4/5]'}`} />
      <div className="skeleton mt-4 h-3 w-1/3" />
      <div className="skeleton mt-2 h-4 w-3/4" />
      <div className="skeleton mt-3 h-3 w-1/4" />
    </div>
  );
}
