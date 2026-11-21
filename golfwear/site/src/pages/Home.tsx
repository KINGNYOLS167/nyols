import { useRef } from 'react';
import { STORE } from '../config';
import { LIVE_COLLECTIONS, countIn } from '../data/collections';
import { HAS_SAMPLES, PRODUCTS, RANK_SOURCE, type Product } from '../data/products';
import { gsap, prefersReducedMotion, ScrollTrigger, SplitText, useGSAP, useReveal } from '../lib/motion';
import { useLang } from '../i18n';
import { Link } from '../router';
import { BrandMoment } from '../components/BrandMoment';
import { INTRO_PLAYING } from '../components/Loader';
import { Tagline } from '../components/Logo';
import { Magnetic } from '../components/Magnetic';
import { ProductCard } from '../components/ProductCard';
import { Arrow, FlagIcon, Photo, SectionHead } from '../components/ui';

function Hero() {
  const { t, lang } = useLang();
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const delay = INTRO_PLAYING ? 1.55 : 0.1;
    const split = SplitText.create('.hero-title', { type: 'words,chars', mask: 'chars' });
    const tl = gsap.timeline({ delay });
    tl.from('.hero-photo', { scale: 1.12, duration: 2.2, ease: 'expo.out' }, 0)
      .from(split.chars, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.035 }, 0.15)
      .from('.hero-rise', { autoAlpha: 0, y: 18, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, 0.55);
    gsap.to('.hero-photo-wrap', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-copy', { yPercent: -18, autoAlpha: 0.2, ease: 'none', scrollTrigger: { trigger: root.current, start: 'center center', end: 'bottom top', scrub: true } });
    return () => split.revert();
  }, { scope: root, dependencies: [lang], revertOnUpdate: true });

  return (
    <section ref={root} className="relative h-[100svh] min-h-[640px] overflow-hidden bg-pine text-ivory">
      <div className="hero-photo-wrap absolute inset-0 will-change-transform">
        <Photo name="sunset-swing" alt="" sizes="100vw" priority className="hero-photo h-full w-full object-cover object-[50%_40%]" />
      </div>
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgb(16_43_37/0.55)_0%,rgb(16_43_37/0.05)_38%,rgb(16_43_37/0.25)_62%,rgb(16_43_37/0.92)_100%)]" />
      <div className="hero-copy wrap relative flex h-full flex-col justify-end pb-10 pt-[140px] sm:pb-14">
        <Tagline className="hero-rise mb-auto" />
        <h1 key={lang} className="hero-title display-xl -ml-[0.04em]">{t('heroTitle')}</h1>
        <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <p className="hero-rise lede max-w-[38ch] text-ivory/85">{t('heroBody')}</p>
          <div className="hero-rise flex flex-col gap-3 sm:flex-row">
            <Magnetic><Link to="/shop" className="btn btn-light w-full sm:w-auto">{t('heroShop')} <Arrow /></Link></Magnetic>
            <Magnetic><a href={STORE.tokopediaUrl} target="_blank" rel="noopener" data-cursor="buy" className="btn btn-ghost-light w-full sm:w-auto"><FlagIcon /> {t('heroStore')}</a></Magnetic>
          </div>
        </div>
      </div>
    </section>
  );
}

function Featured({ onQuickView }: { onQuickView: (p: Product, c: number) => void }) {
  const { t } = useLang();
  const top = PRODUCTS.slice(0, 5);
  const best = RANK_SOURCE === 'sales';
  return (
    <section className="bg-ivory">
      <div className="wrap py-24 lg:py-32">
        <SectionHead
          title={best ? t('bestTitle') : t('featuredTitle')}
          note={best ? t('bestNote') : t('featuredNote')}
          action={<Link to="/shop" className="link-line inline-flex items-center gap-2">{t('shopAll')} <Arrow /></Link>}
        />
        {HAS_SAMPLES && <p className="small mt-6 border-l-2 border-champagne pl-3 text-stone sm:hidden">{t('previewShort')}</p>}
        <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-12 lg:gap-y-16" data-reveal="stagger">
          {top.map((p, i) => (
            <div key={p.id} className={i === 0 ? 'col-span-2 lg:col-span-6 lg:row-span-2' : 'lg:col-span-3'}>
              <ProductCard product={p} onQuickView={onQuickView} size={i === 0 ? 'lg' : 'md'} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Categories() {
  const { t, pick } = useLang();
  const tiles = LIVE_COLLECTIONS.filter((c) => c.photo).slice(0, 5);
  const spans = ['md:col-span-7 md:row-span-2 aspect-[4/5] md:aspect-auto', 'md:col-span-5 aspect-[16/11]', 'md:col-span-5 aspect-[16/11]', 'md:col-span-6 aspect-[16/10]', 'md:col-span-6 aspect-[16/10]'];
  return (
    <section className="bg-ivory">
      <div className="wrap pb-24 lg:pb-32">
        <SectionHead title={t('categoriesTitle')} action={<Link to="/collections" className="link-line inline-flex items-center gap-2">{t('navCollections')} <Arrow /></Link>} />
        <div className="mt-12 grid gap-4 md:grid-cols-12 md:gap-5">
          {tiles.map((c, i) => (
            <Link key={c.slug} to={`/collections/${c.slug}`} className={`group relative block overflow-hidden bg-pine text-ivory ${spans[i]}`}>
              <div data-reveal="image" className="absolute inset-0">
                <Photo name={c.photo!} alt="" sizes={i === 0 ? '(min-width: 768px) 58vw, 100vw' : '(min-width: 768px) 42vw, 100vw'} className="h-full w-full object-cover transition-transform duration-[1.4s] ease-[var(--ease-quint)] group-hover:scale-[1.06]" />
              </div>
              <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgb(16_43_37/0.75))]" />
              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 sm:inset-x-7 sm:bottom-6">
                <div>
                  <p className={i === 0 ? 'h2' : 'h3'}>{pick(c.name)}</p>
                  <p className="small mt-1 text-ivory/75">{t('count', { n: countIn(c) })}</p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 ring-ivory/50 transition-colors duration-500 group-hover:bg-ivory group-hover:text-pine"><Arrow /></span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Editorial() {
  const { t } = useLang();
  return (
    <section className="overflow-hidden bg-linen">
      <div className="wrap grid gap-10 py-24 md:grid-cols-12 lg:py-36">
        <figure className="md:col-span-7">
          <div data-reveal="image" className="relative aspect-[4/5] overflow-hidden md:aspect-[5/6]">
            <div data-parallax="0.12" className="absolute -inset-y-[8%] inset-x-0"><Photo name="evening-green" alt="" sizes="(min-width: 768px) 58vw, 100vw" className="h-full w-full object-cover" /></div>
          </div>
          <figcaption className="small mt-3 text-stone">{t('editorialCaption1')}</figcaption>
        </figure>
        <div className="flex flex-col md:col-span-4 md:col-start-9">
          <h2 className="display text-pine" data-reveal="text">{t('editorialTitle')}</h2>
          <p className="lede mt-8 text-stone" data-reveal="fade">{t('editorialBody')}</p>
          <Link to="/collections/long-sleeve" className="link-line mt-8 inline-flex w-max items-center gap-2" data-reveal="fade">{t('editorialCta')} <Arrow /></Link>
          <figure className="mt-auto pt-14">
            <div data-reveal="image" className="relative aspect-[4/3] overflow-hidden"><Photo name="aerial-course" alt="" sizes="(min-width: 768px) 30vw, 100vw" className="h-full w-full object-cover" /></div>
            <figcaption className="small mt-3 text-stone">{t('editorialCaption2')}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

function StoreBand() {
  const { t, num } = useLang();
  return (
    <section className="bg-ivory">
      <div className="wrap flex flex-col items-start justify-between gap-8 border-t border-hair py-16 md:flex-row md:items-center">
        <p className="h3 max-w-[34ch] text-pine">{t('trust', { rating: num(STORE.stats.rating), reviews: num(STORE.stats.reviews), sold: num(STORE.stats.sold) })}</p>
        <Magnetic><a href={STORE.tokopediaUrl} target="_blank" rel="noopener" data-cursor="buy" className="btn btn-forest"><FlagIcon /> {t('heroStore')}</a></Magnetic>
      </div>
    </section>
  );
}

export default function Home({ onQuickView }: { onQuickView: (p: Product, c: number) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const { lang } = useLang();
  useReveal(root, [lang]);
  useGSAP(() => { const id = window.setTimeout(() => ScrollTrigger.refresh(), 600); return () => window.clearTimeout(id); }, { scope: root });
  return (
    <div ref={root}>
      <Hero />
      <Featured onQuickView={onQuickView} />
      <Categories />
      <Editorial />
      <BrandMoment />
      <StoreBand />
    </div>
  );
}
