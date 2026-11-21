import { useState, type CSSProperties } from 'react';
import type { CollectionSlug, PublicProduct } from '../lib/catalog';
import { useLang } from '../i18n';
import { Mark } from './Logo';

/** Campaign photography in /public/campaign, as AVIF and WebP at two widths each. */
export const CAMPAIGN = {
  hero: { widths: [960, 1536], w: 1536, h: 864 },
  'hero-portrait': { widths: [600, 864], w: 864, h: 1536 },
  collar: { widths: [640, 1024], w: 1024, h: 1280 },
  'fairway-walk': { widths: [640, 1024], w: 1024, h: 1280 },
  flag: { widths: [960, 1536], w: 1536, h: 1024 },
  aerial: { widths: [960, 1536], w: 1536, h: 1024 },
} as const;
export type CampaignName = keyof typeof CAMPAIGN;

const set = (name: CampaignName, ext: 'avif' | 'webp') => CAMPAIGN[name].widths.map((w) => `/campaign/${name}-${w}.${ext} ${w}w`).join(', ');

interface PictureProps {
  name: CampaignName;
  alt: string;
  sizes: string;
  className?: string;
  imgClassName?: string;
  style?: CSSProperties;
  eager?: boolean;
  /** Art direction: a different image below 768px wide (portrait screens). */
  mobile?: CampaignName;
}

export function CampaignPicture({ name, alt, sizes, className, imgClassName, style, eager, mobile }: PictureProps) {
  const c = CAMPAIGN[name];
  const largest = c.widths[c.widths.length - 1];
  return (
    <picture className={className}>
      {mobile && <source media="(max-width: 767px) and (orientation: portrait)" type="image/avif" srcSet={set(mobile, 'avif')} sizes="100vw" />}
      {mobile && <source media="(max-width: 767px) and (orientation: portrait)" type="image/webp" srcSet={set(mobile, 'webp')} sizes="100vw" />}
      <source type="image/avif" srcSet={set(name, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set(name, 'webp')} sizes={sizes} />
      <img
        src={`/campaign/${name}-${largest}.webp`}
        alt={alt}
        width={c.w}
        height={c.h}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        decoding={eager ? 'sync' : 'async'}
        className={imgClassName}
        style={style}
      />
    </picture>
  );
}

/** Fallback photography for collections that have no product photos yet. */
export const COLLECTION_IMAGE: Record<CollectionSlug, CampaignName> = {
  'polo-shirts': 'collar',
  'short-sleeve': 'hero',
  'long-sleeve': 'fairway-walk',
  trousers: 'hero-portrait',
  shorts: 'fairway-walk',
  outerwear: 'aerial',
  accessories: 'flag',
  'new-arrivals': 'aerial',
};

/** The smallest stored width that covers `width` (or the largest there is). */
export const campaignSrc = (name: CampaignName, width = 0) => {
  const widths: readonly number[] = CAMPAIGN[name].widths;
  const w = widths.find((x) => x >= width) ?? widths[widths.length - 1];
  return `/campaign/${name}-${w}.webp`;
};

/** A product photo with a quiet placeholder while it loads and a drawn fallback when there is none. */
export function ProductImage({ product, index = 0, className = '', sizes, eager, alt }: { product: PublicProduct; index?: number; className?: string; sizes?: string; eager?: boolean; alt?: string }) {
  const { t } = useLang();
  const src = product.images[index];
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 bg-ivory-2 text-stone ${className}`} role="img" aria-label={`${product.name}: ${t('noImage')}`}>
        <Mark className="w-12 opacity-40" />
        <span className="t-micro">{t('noImage')}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt ?? product.name}
      sizes={sizes}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={`bg-ivory-2 object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  );
}
