import { useEffect, useMemo, useRef, useState } from 'react';
import { buyUrl, effectivePrice, hasDirectLink, useCatalog, type PublicProduct } from '../lib/catalog';
import { Link } from '../lib/router';
import { useLang, type Key } from '../i18n';
import { usePageMeta } from '../lib/meta';
import { STORE } from '../config';
import { ProductImage } from '../components/Media';
import { Availability, Price } from '../components/Price';
import { ProductCard } from '../components/ProductCard';
import { useQuickView } from '../components/QuickViewContext';
import { CatalogUnavailable } from './Home';

const collectionFor = (p: PublicProduct) =>
  p.category === 'polo' ? 'polo-shirts' : p.category === 'skirt' ? 'shorts' : p.category === 'top' ? (p.sleeve === 'long' ? 'long-sleeve' : 'short-sleeve') : p.category;

export function ProductPage({ slug }: { slug: string }) {
  const { t } = useLang();
  const { products, status } = useCatalog();
  const product = products.find((p) => p.slug === slug);
  usePageMeta(product ? `${product.name}${product.brand ? ` | ${product.brand.name}` : ''}` : undefined, product?.description);
  if (status === 'loading') return <ProductSkeleton />;
  if (status === 'error') return <div className="wrap pb-24 pt-[180px]"><CatalogUnavailable /></div>;
  if (!product) {
    return (
      <div className="wrap pb-28 pt-[180px]">
        <h1 className="t-display text-forest">{t('productMissing')}</h1>
        <p className="mt-6 max-w-[44ch] text-stone">{t('productMissingBody')}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/shop" className="btn btn-forest">{t('backToShop')}</Link>
          <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" className="btn btn-outline">{t('tokopediaStore')}<span className="sr-only">{t('newTab')}</span></a>
        </div>
      </div>
    );
  }
  return <ProductDetail key={product.id} p={product} all={products} />;
}

function ProductSkeleton() {
  return (
    <div className="wrap grid gap-10 pb-24 pt-[150px] lg:grid-cols-12" aria-busy="true">
      <div className="skeleton aspect-[4/5] lg:col-span-7" />
      <div className="space-y-4 lg:col-span-4 lg:col-start-9">
        <div className="skeleton h-4 w-1/3" /><div className="skeleton h-10 w-full" /><div className="skeleton h-6 w-1/2" /><div className="skeleton mt-10 h-14 w-full" />
      </div>
    </div>
  );
}

function Gallery({ p }: { p: PublicProduct }) {
  const { t } = useLang();
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = Math.max(1, p.images.length);
  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };
  return (
    <div>
      {/* phones and tablets: swipeable */}
      <div className="relative lg:hidden">
        <div
          ref={track}
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
          aria-roledescription="carousel"
          aria-label={p.name}
        >
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-ivory-2" aria-label={t('imageOf', { name: p.name, n: i + 1, total: count })} role="group">
              <ProductImage product={p} index={i} sizes="100vw" eager={i === 0} className="absolute inset-0 h-full w-full" alt={t('imageOf', { name: p.name, n: i + 1, total: count })} />
            </div>
          ))}
        </div>
        {count > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
            {Array.from({ length: count }, (_, i) => (
              <button key={i} type="button" aria-label={t('showImage', { n: i + 1 })} aria-pressed={index === i} onClick={() => go(i)} className={`h-2 rounded-full transition-all ${index === i ? 'w-6 bg-pine' : 'w-2 bg-pine/35'}`} />
            ))}
          </div>
        )}
      </div>
      {/* desktop: every image, editorial stack */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-2">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={`relative overflow-hidden bg-ivory-2 ${i === 0 || count === 2 ? 'col-span-2 aspect-[4/5]' : 'aspect-[4/5]'}`}>
            <ProductImage product={p} index={i} sizes="(min-width: 1024px) 55vw" eager={i === 0} className="absolute inset-0 h-full w-full" alt={t('imageOf', { name: p.name, n: i + 1, total: count })} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductDetail({ p, all }: { p: PublicProduct; all: PublicProduct[] }) {
  const { t, num } = useLang();
  const { settings } = useCatalog();
  const openQuick = useQuickView();
  const [size, setSize] = useState<string | null>(null);
  const chosen = p.sizes.find((s) => s.size === size);
  const collection = collectionFor(p);
  const related = useMemo(() => {
    const same = all.filter((x) => x.id !== p.id && (x.brand?.slug === p.brand?.slug || x.category === p.category));
    return same.sort((a, b) => Number(b.brand?.slug === p.brand?.slug) - Number(a.brand?.slug === p.brand?.slug) || b.sold - a.sold).slice(0, 4);
  }, [all, p]);
  const wa = settings.store.whatsapp;
  const waText = t('askText', { product: p.name, size: size ? t('askSize', { size }) : '' });

  useEffect(() => {
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      sku: p.sku || undefined,
      image: p.images.map((src) => new URL(src, location.origin).toString()),
      description: p.description || undefined,
      brand: p.brand ? { '@type': 'Brand', name: p.brand.name } : undefined,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'IDR',
        price: effectivePrice(p),
        url: buyUrl(p),
        availability: `https://schema.org/${p.availability === 'sold_out' ? 'OutOfStock' : p.availability === 'preorder' ? 'PreOrder' : 'InStock'}`,
      },
    });
    document.head.appendChild(ld);
    return () => ld.remove();
  }, [p]);

  const specs: [string, string][] = [
    ...(p.brand ? [[t('specBrand'), p.brand.name] as [string, string]] : []),
    [t('specCategory'), [t(`cat.${p.category}` as Key), p.sleeve ? t(`sleeve.${p.sleeve}` as Key) : ''].filter(Boolean).join(', ')],
    [t('specFor'), t(`gender.${p.gender}` as Key)],
    ...p.specs.map((s) => [s.label, s.value] as [string, string]),
    ...(p.sku ? [[t('specSku'), p.sku] as [string, string]] : []),
  ];

  return (
    <>
      <div className="wrap pt-[124px] lg:pt-[140px]">
        <nav aria-label={t('breadcrumb')} className="t-small py-4 text-stone">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link to="/" className="link-line">{t('navHome')}</Link></li>
            <li aria-hidden>/</li>
            <li><Link to={`/collections/${collection}`} className="link-line">{t(`col.${collection}` as Key)}</Link></li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="line-clamp-1 text-charcoal">{p.name}</li>
          </ol>
        </nav>
      </div>
      <div className="wrap grid gap-10 pb-20 lg:grid-cols-12 lg:gap-12">
        <div className="-mx-[clamp(16px,4vw,56px)] lg:col-span-7 lg:mx-0"><Gallery p={p} /></div>
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-[132px]">
            {p.brand && <Link to={`/brands/${p.brand.slug}`} className="t-small link-line text-stone">{p.brand.name}</Link>}
            <h1 className="mt-2 text-[clamp(1.8rem,1.4rem+1.6vw,2.7rem)] font-light leading-[1.08] tracking-[-0.02em]">{p.name}</h1>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <Price product={p} size="lg" />
              {p.sold > 0 && <span className="t-small text-stone">{t('soldCount', { n: num(p.sold) })}</span>}
            </div>
            <div className="mt-3"><Availability product={p} detail /></div>

            {p.colors.length > 0 && (
              <div className="mt-8">
                <p className="t-small text-stone">{t('colours')}</p>
                <ul className="mt-3 flex flex-wrap gap-4">
                  {p.colors.map((c) => (
                    <li key={c.name + c.hex} className="flex items-center gap-2">
                      {c.hex && <span aria-hidden className="h-5 w-5 rounded-full border border-line" style={{ background: c.hex }} />}
                      <span className="t-small">{c.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {p.sizes.length > 0 && (
              <fieldset className="mt-8">
                <legend className="t-small text-stone">{t('selectSize')}</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.sizes.map((s) => (
                    <label key={s.size} className={`relative ${s.available ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                      <input type="radio" name="size" value={s.size} disabled={!s.available} checked={size === s.size} onChange={() => setSize(s.size)} className="peer sr-only" />
                      <span className={`flex min-h-12 min-w-14 items-center justify-center rounded-[2px] border px-4 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest ${
                        size === s.size ? 'border-forest bg-forest text-ivory' : s.available ? 'border-line hover:border-forest' : 'border-line text-stone/50 line-through'
                      }`}>
                        {s.size}
                        {!s.available && <span className="sr-only"> {t('avail.sold_out')}</span>}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="t-small mt-3 min-h-5 text-stone" aria-live="polite">{chosen?.low ? t('onlyLeft', { n: chosen.low }) : ''}</p>
              </fieldset>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <a href={buyUrl(p)} target="_blank" rel="noopener" data-cursor="buy" className="btn btn-forest w-full">
                {hasDirectLink(p) ? t('buyTokopedia') : t('findTokopedia')}<span className="sr-only">{t('newTab')}</span>
              </a>
              {wa && (
                <a href={`https://wa.me/${wa}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener" className="btn btn-outline w-full">
                  {t('askWhatsapp')}<span className="sr-only">{t('newTab')}</span>
                </a>
              )}
            </div>
            <p className="t-small mt-4 text-stone">{hasDirectLink(p) ? `${t('payNote')} ${p.sizes.length ? t('sizeNote') : ''}` : t('fallbackNote', { name: p.name })}</p>

            <div className="mt-10 border-t border-line">
              {p.description && (
                <details open className="group border-b border-line">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between font-medium">{t('description')}<Chevron /></summary>
                  <p className="whitespace-pre-line pb-6 text-stone">{p.description}</p>
                </details>
              )}
              <details open={!p.description} className="group border-b border-line">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between font-medium">{t('specs')}<Chevron /></summary>
                <dl className="grid grid-cols-[minmax(110px,40%)_1fr] gap-x-4 pb-6">
                  {specs.map(([k, v]) => (
                    <div key={k + v} className="contents">
                      <dt className="border-t border-line py-2.5 text-stone">{k}</dt>
                      <dd className="border-t border-line py-2.5">{v}</dd>
                    </div>
                  ))}
                </dl>
              </details>
              <details className="group border-b border-line">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between font-medium">{t('footDelivery')}<Chevron /></summary>
                <div className="space-y-3 pb-6 text-stone">
                  <p>{t('orderNote')}</p>
                  <p>{t('a4')}</p>
                  {p.preorder && <p>{t('a3')}</p>}
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section aria-labelledby="related-title" className="border-t border-line bg-ivory">
          <div className="wrap py-20">
            <h2 id="related-title" className="t-h2 text-forest">{p.brand && related.every((r) => r.brand?.slug === p.brand?.slug) ? t('moreFrom', { brand: p.brand.name }) : t('related')}</h2>
            <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-4 lg:gap-x-6">
              {related.map((r) => <li key={r.id}><ProductCard product={r} onQuickView={openQuick} /></li>)}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}

function Chevron() {
  return <svg viewBox="0 0 10 6" className="h-1.5 w-2.5 transition-transform duration-300 group-open:rotate-180" aria-hidden><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

