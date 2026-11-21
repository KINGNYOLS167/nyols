import type { ReactNode } from 'react';
import { photoSrc } from '../data/collections';
import { buyLink, effectivePrice, formatPrice, type Availability, type Colour, type Product } from '../data/products';
import { useLang } from '../i18n';

/** A /public/photos image with srcset; `sizes` describes how wide it renders. */
export function Photo({ name, alt, sizes, className = '', priority = false }: { name: string; alt: string; sizes: string; className?: string; priority?: boolean }) {
  const { src, srcSet } = photoSrc(name);
  return <img src={src} srcSet={srcSet} sizes={sizes} alt={alt} className={className} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" />;
}

export function Price({ product: p, className = '' }: { product: Product; className?: string }) {
  const { t } = useLang();
  const sale = effectivePrice(p) < p.price;
  return (
    <p className={`tnum ${className}`}>
      <span className={sale ? 'text-forest' : ''}>{formatPrice(effectivePrice(p))}</span>
      {sale && <span className="ml-2 text-stone line-through decoration-1">{formatPrice(p.price)}</span>}
      {p.category === 'sleeves' && <span className="ml-1.5 text-[0.82em] text-stone">{t('pair')}</span>}
    </p>
  );
}

const AV_DOT: Record<Availability, string> = { in_stock: 'bg-[#4F8A62]', preorder: 'bg-champagne', sold_out: 'bg-stone', coming_soon: 'bg-champagne' };
export function AvailabilityTag({ value, className = '' }: { value: Availability; className?: string }) {
  const { availability } = useLang();
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${AV_DOT[value]}`} />
      {availability(value)}
    </span>
  );
}

export const swatchBg = (c: Colour, band = 3) =>
  c.stripe ? `repeating-linear-gradient(0deg, ${c.hex} 0 ${band}px, ${c.stripe} ${band}px ${band * 1.7}px)` : c.hex;

export function Arrow({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return <svg viewBox="0 0 16 16" className={className} aria-hidden><path d="M2 8h12M9 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;
}
export function FlagIcon({ className = 'h-4 w-3.5' }: { className?: string }) {
  return <svg viewBox="0 0 12 14" className={className} aria-hidden><path d="M1 0v14" stroke="currentColor" strokeWidth="1.6" /><path d="M1.8 1 11 3.8 1.8 6.6z" fill="currentColor" /></svg>;
}
export function BagIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden><path d="M5 8h14l-1 12H6L5 8Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;
}
export function SearchIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="1.5" /></svg>;
}
export function CloseIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return <svg viewBox="0 0 20 20" className={className} aria-hidden><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.6" /></svg>;
}

/** The purchase button. Says "Buy" only when it opens the exact listing; otherwise it says it opens the store. */
export function BuyButton({ product, className = '' }: { product: Product; className?: string }) {
  const { t } = useLang();
  const { url, exact } = buyLink(product);
  return (
    <div className={className}>
      <a href={url} target="_blank" rel="noopener" data-cursor="buy" className="btn btn-forest w-full">
        <FlagIcon /> {exact && product.availability !== 'coming_soon' ? t('buy') : t('buyStore')}
      </a>
      <p className="small mt-2.5 text-stone">{exact ? t('buyNoteExact') : t('buyNoteStore')}</p>
    </div>
  );
}

export function SectionHead({ title, note, action, dark = false }: { title: string; note?: string; action?: ReactNode; dark?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
      <div className="max-w-2xl">
        <h2 className={`h2 ${dark ? 'text-ivory' : 'text-pine'}`} data-reveal="text">{title}</h2>
        {note && <p className={`mt-3 ${dark ? 'text-mist' : 'text-stone'}`} data-reveal="fade">{note}</p>}
      </div>
      {action}
    </div>
  );
}
