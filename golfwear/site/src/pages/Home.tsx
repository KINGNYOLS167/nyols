import { useEffect, useMemo, useRef, useState } from 'react';
import { COLLECTIONS, inCollection, topProducts, useCatalog, type CollectionSlug, type PublicProduct } from '../lib/catalog';
import { Link } from '../lib/router';
import { finePointer, gsap, prefersReducedMotion } from '../lib/motion';
import { RevealText, useScrollMotion } from '../lib/reveal';
import { useLang, type Key } from '../i18n';
import { STORE } from '../config';
import { Hero } from '../components/Hero';
import { CampaignPicture, campaignSrc, COLLECTION_IMAGE } from '../components/Media';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { useQuickView } from '../components/QuickViewContext';

export function Home() {
  return (
    <>
      <Hero />
      <TopProducts />
      <CategoryIndex />
      <BrandIndex />
      <Editorial />
      <OrderSteps />
    </>
  );
}

// ---------- best sellers / featured ----------

export function CatalogUnavailable({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { t } = useLang();
  const { retry } = useCatalog();
  return (
    <div role="alert" className={`flex flex-col items-start gap-5 border-t py-10 ${tone === 'dark' ? 'border-line-dark' : 'border-line'}`}>
      <p className="t-h3">{t('errorTitle')}</p>
      <p className={tone === 'dark' ? 'text-mist' : 'text-stone'}>{t('errorBody')}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={retry} className="btn btn-forest btn-sm">{t('retry')}</button>
        <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" className="btn btn-outline btn-sm">{t('tokopediaStore')}<span className="sr-only">{t('newTab')}</span></a>
      </div>
    </div>
  );
}

function RangeOnTokopedia() {
  const { t } = useLang();
  return (
    <div className="grid items-center gap-10 md:grid-cols-12">
      <div className="reveal-img relative overflow-hidden md:col-span-6">
        <CampaignPicture name="flag" alt={t('edAlt4')} sizes="(min-width: 768px) 50vw, 100vw" imgClassName="aspect-[3/2] w-full object-cover" />
      </div>
      <div className="md:col-span-5 md:col-start-8">
        <h2 className="t-h2 text-forest">{t('emptyRangeTitle')}</h2>
        <p className="mt-5 max-w-[42ch] text-stone">{t('emptyRangeBody')}</p>
        <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" data-cursor="buy" className="btn btn-forest mt-8">{t('heroStore')}<span className="sr-only">{t('newTab')}</span></a>
      </div>
    </div>
  );
}

function TopProducts() {
  const { t } = useLang();
  const { products, ranking, status } = useCatalog();
  const open = useQuickView();
  const top = useMemo(() => topProducts(products, ranking, 5), [products, ranking]);
  const scope = useScrollMotion<HTMLElement>([status, ranking]);
  const sales = ranking === 'sales';
  return (
    <section ref={scope} aria-labelledby={status === 'ready' && top.length === 0 ? undefined : 'top-title'} className="bg-ivory">
      <div className="wrap py-20 lg:py-32">
        {/* With nothing listed yet there is no selection to title: the Tokopedia panel stands alone. */}
        {!(status === 'ready' && top.length === 0) && <div className="mb-10 flex flex-wrap items-end justify-between gap-6 lg:mb-14">
          <div>
            <RevealText id="top-title" className="t-display text-forest">{sales ? t('bestTitle') : t('featuredTitle')}</RevealText>
            <p className="mt-4 text-stone">{sales ? t('bestNote') : t('featuredNote')}</p>
          </div>
          {top.length > 0 && <Link to={sales ? '/shop?sort=popular' : '/shop'} className="link-under font-medium text-forest">{t('viewAll')}</Link>}
        </div>}
        {status === 'loading' ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-12 lg:gap-x-6" aria-busy="true" aria-label={t('loadingProducts')}>
            <div className="col-span-2 lg:col-span-6 lg:row-span-2"><ProductCardSkeleton large /></div>
            {[0, 1, 2, 3].map((i) => <div key={i} className="lg:col-span-3"><ProductCardSkeleton /></div>)}
          </div>
        ) : status === 'error' ? (
          <CatalogUnavailable />
        ) : top.length === 0 ? (
          <RangeOnTokopedia />
        ) : (
          top.length >= 5 ? (
            // A full set: the leader large, the next four beside it.
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-12 lg:gap-x-6">
              {top.map((p, i) => (
                <div key={p.id} className={i === 0 ? 'col-span-2 lg:col-span-6 lg:row-span-2' : 'lg:col-span-3'}>
                  <ProductCard
                    product={p}
                    rank={sales ? i + 1 : undefined}
                    large={i === 0}
                    sizes={i === 0 ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, 50vw'}
                    onQuickView={open}
                  />
                </div>
              ))}
            </div>
          ) : (
            // Fewer pieces: an even row, so nothing sits next to an empty gap.
            <div className={`grid grid-cols-2 gap-x-4 gap-y-12 lg:gap-x-6 ${top.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
              {top.map((p, i) => (
                <div key={p.id} className={top.length === 1 ? 'col-span-2 lg:col-span-1' : top.length === 3 && i === 0 ? 'col-span-2 lg:col-span-1' : ''}>
                  <ProductCard product={p} rank={sales ? i + 1 : undefined} sizes="(min-width: 1024px) 33vw, 50vw" onQuickView={open} />
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </section>
  );
}

// ---------- category index: big type, a photo that follows the pointer ----------

function collectionImage(products: PublicProduct[], c: CollectionSlug) {
  const hit = products.find((p) => inCollection(p, c) && p.images[0]);
  return hit?.images[0] ?? campaignSrc(COLLECTION_IMAGE[c], 640);
}

function CategoryIndex() {
  const { t, num } = useLang();
  const { products } = useCatalog();
  const scope = useScrollMotion<HTMLElement>();
  const preview = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<CollectionSlug | null>(null);
  const rows = COLLECTIONS.map((c) => ({ c, n: products.filter((p) => inCollection(p, c)).length, img: collectionImage(products, c) }));

  useEffect(() => {
    const el = preview.current;
    const section = scope.current;
    if (!el || !section || !finePointer() || prefersReducedMotion()) return;
    const x = gsap.quickTo(el, 'x', { duration: 0.55, ease: 'power3' });
    const y = gsap.quickTo(el, 'y', { duration: 0.55, ease: 'power3' });
    const move = (e: PointerEvent) => {
      const r = section.getBoundingClientRect();
      x(e.clientX - r.left + 28);
      y(e.clientY - r.top - el.offsetHeight / 2);
    };
    section.addEventListener('pointermove', move);
    return () => section.removeEventListener('pointermove', move);
  }, [scope]);

  return (
    <section ref={scope} aria-labelledby="cat-title" className="contours relative overflow-hidden bg-pine text-ivory" onPointerLeave={() => setActive(null)}>
      <div className="wrap py-20 lg:py-32">
        <div className="grid gap-6 lg:grid-cols-12">
          <RevealText id="cat-title" className="t-display lg:col-span-7">{t('catTitle')}</RevealText>
        </div>
        <ul className="mt-12 border-t border-line-dark lg:mt-16">
          {rows.map(({ c, n, img }) => (
            <li key={c} className="border-b border-line-dark">
              <Link
                to={`/collections/${c}`}
                data-cursor="view"
                onPointerEnter={() => setActive(c)}
                onFocus={() => setActive(c)}
                className="group flex items-center gap-5 py-5 lg:py-6"
              >
                <span className="text-[clamp(1.75rem,1.1rem+3.4vw,4.4rem)] font-light leading-[1.05] tracking-[-0.03em] transition-[transform,color] duration-500 ease-[var(--ease-expo)] group-hover:translate-x-3 group-hover:text-champagne">
                  {t(`col.${c}` as Key)}
                </span>
                <span className="t-small ml-auto hidden max-w-[30ch] text-right text-mist md:block">{t(`colBlurb.${c}` as Key)}</span>
                <span className="t-small tnum w-24 shrink-0 text-right text-mist">
                  {n ? (n === 1 ? t('catCountOne') : t('catCount', { n: num(n) })) : t('catSoon')}
                </span>
                <span className="relative h-16 w-13 shrink-0 overflow-hidden bg-forest md:hidden">
                  <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div
        ref={preview}
        aria-hidden
        className={`pointer-events-none absolute left-0 top-0 hidden aspect-[4/5] w-[min(22vw,300px)] overflow-hidden bg-forest transition-[opacity,clip-path] duration-500 ease-[var(--ease-expo)] [@media(hover:hover)]:md:block ${
          active ? 'opacity-100 [clip-path:inset(0_0_0_0)]' : 'opacity-0 [clip-path:inset(100%_0_0_0)]'
        }`}
      >
        {rows.map(({ c, img }) => (
          <img key={c} src={img} alt="" loading="lazy" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${active === c ? 'opacity-100' : 'opacity-0'}`} />
        ))}
      </div>
    </section>
  );
}

// ---------- brands ----------

function BrandIndex() {
  const { t, num } = useLang();
  const { brands } = useCatalog();
  const scope = useScrollMotion<HTMLElement>([brands.length]);
  if (!brands.length) return null;
  return (
    <section ref={scope} aria-labelledby="brand-title" className="bg-ivory">
      <div className="wrap py-20 lg:py-32">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <RevealText id="brand-title" className="t-display text-forest">{t('brandsTitle')}</RevealText>
            <p className="mt-4 max-w-[44ch] text-stone">{t('brandsBody')}</p>
          </div>
          <Link to="/brands" className="link-under font-medium text-forest">{t('allBrands')}</Link>
        </div>
        <ul className="mt-12 flex flex-wrap items-baseline gap-x-3 gap-y-2 lg:mt-16">
          {brands.map((b, i) => (
            <li key={b.slug} className="flex items-baseline gap-3">
              <Link to={`/brands/${b.slug}`} className="group inline-flex items-start gap-1.5 text-[clamp(1.9rem,1.2rem+3vw,4.2rem)] font-light leading-[1.1] tracking-[-0.03em] text-charcoal transition-colors duration-300 hover:text-forest">
                <span className="link-line">{b.name}</span>
                <sup className="t-micro tnum mt-2 text-stone">{num(b.count)}</sup>
              </Link>
              {i < brands.length - 1 && <span aria-hidden className="h-2 w-2 -translate-y-2 rounded-full bg-champagne" />}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------- editorial campaign ----------

function Editorial() {
  const { t } = useLang();
  const scope = useScrollMotion<HTMLElement>();
  return (
    <section ref={scope} aria-labelledby="ed-title" className="bg-ivory">
      <div className="relative h-[72svh] min-h-[440px] overflow-hidden bg-pine">
        <div data-parallax="16" className="absolute inset-x-0 -top-[10%] h-[120%]">
          <CampaignPicture name="aerial" alt={t('edAlt3')} sizes="100vw" className="grain absolute inset-0 block" imgClassName="h-full w-full object-cover" />
        </div>
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(11_32_27/0.75),transparent_55%)]" />
        <div className="wrap absolute inset-x-0 bottom-0 pb-10 lg:pb-16">
          <RevealText as="p" className="t-h2 max-w-[22ch] text-ivory">{t('edAerial')}</RevealText>
        </div>
      </div>
      <div className="wrap grid gap-y-14 py-20 md:grid-cols-12 md:gap-x-6 lg:py-32">
        <figure className="md:col-span-5">
          <div className="reveal-img relative overflow-hidden bg-ivory-2">
            <CampaignPicture name="collar" alt={t('edAlt1')} sizes="(min-width: 768px) 40vw, 100vw" imgClassName="aspect-[4/5] w-full object-cover" />
          </div>
          <figcaption className="t-small mt-3 text-stone">{t('edCaption1')}</figcaption>
        </figure>
        <div className="flex flex-col md:col-span-6 md:col-start-7">
          <RevealText id="ed-title" className="t-display text-forest">{t('edTitle')}</RevealText>
          <p className="t-lede mt-6 max-w-[40ch] text-stone">{t('edBody')}</p>
          <Link to="/collections/polo-shirts" className="btn btn-forest mt-8 self-start">{t('edCta')}</Link>
          <figure className="mt-14 md:ml-auto md:mt-auto md:w-[78%] md:pt-16">
            <div className="reveal-img relative overflow-hidden bg-ivory-2">
              <CampaignPicture name="fairway-walk" alt={t('edAlt2')} sizes="(min-width: 768px) 38vw, 100vw" imgClassName="aspect-[4/5] w-full object-cover" />
            </div>
            <figcaption className="t-small mt-3 text-stone">{t('edCaption2')}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

// ---------- how ordering works ----------

export function OrderSteps({ id }: { id?: string }) {
  const { t } = useLang();
  const steps: Key[] = ['order1', 'order2', 'order3'];
  return (
    <section id={id} aria-labelledby={`${id ?? 'home'}-order-title`} className="bg-ivory-2">
      <div className="wrap py-20 lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 id={`${id ?? 'home'}-order-title`} className="t-h2 text-forest">{t('orderTitle')}</h2>
          <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" data-cursor="buy" className="btn btn-outline btn-sm">{t('tokopediaStore')}<span className="sr-only">{t('newTab')}</span></a>
        </div>
        <ol className="mt-12 grid border-t border-line md:grid-cols-3">
          {steps.map((key, i) => (
            <li key={key} className="border-b border-line py-8 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0">
              <span className="tnum text-[3rem] font-light leading-none text-champagne-ink">{i + 1}</span>
              <p className="mt-6 max-w-[30ch] text-[1.08rem] leading-snug">{t(key)}</p>
            </li>
          ))}
        </ol>
        <p className="t-small mt-8 max-w-[60ch] text-stone">{t('orderNote')}</p>
      </div>
    </section>
  );
}
