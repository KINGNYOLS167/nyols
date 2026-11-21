import { effectivePrice, formatPrice, onSale, type PublicProduct } from '../lib/catalog';
import { useLang } from '../i18n';

export function Price({ product, size = 'md', tone = 'light' }: { product: PublicProduct; size?: 'md' | 'lg'; tone?: 'light' | 'dark' }) {
  const { t } = useLang();
  const now = effectivePrice(product);
  const sale = onSale(product);
  const big = size === 'lg' ? 'text-[1.6rem] font-light' : 'text-[0.98rem]';
  const muted = tone === 'dark' ? 'text-mist' : 'text-stone';
  return (
    <p className={`tnum flex flex-wrap items-baseline gap-x-2.5 ${big}`}>
      {sale ? (
        <>
          <span className="sr-only">{t('priceNow')}</span>
          <span className={tone === 'dark' ? 'text-ivory' : 'font-medium text-forest'}>{formatPrice(now)}</span>
          <span className="sr-only">{t('priceWas')}</span>
          <s className={`${muted} ${size === 'lg' ? 'text-[1.05rem]' : 'text-[0.85rem]'}`}>{formatPrice(product.price)}</s>
          <span className={`t-micro rounded-[2px] px-1.5 py-0.5 font-medium ${tone === 'dark' ? 'bg-champagne text-pine' : 'bg-forest text-ivory'}`}>
            −{Math.round((1 - now / product.price) * 100)}%
          </span>
        </>
      ) : (
        <span>{formatPrice(now)}</span>
      )}
    </p>
  );
}

const DOT: Record<PublicProduct['availability'], string> = {
  in_stock: 'bg-forest',
  low_stock: 'bg-champagne-ink',
  sold_out: 'bg-stone/50',
  preorder: 'bg-champagne',
  unknown: 'bg-stone/40',
};

export function Availability({ product, detail = false }: { product: PublicProduct; detail?: boolean }) {
  const { t } = useLang();
  const a = product.availability;
  const label = detail && a === 'preorder' && product.preorderDays ? t('preorderDays', { n: product.preorderDays }) : t(`avail.${a}`);
  return (
    <span className="t-small inline-flex items-center gap-2 text-stone">
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOT[a]}`} />
      {label}
    </span>
  );
}
