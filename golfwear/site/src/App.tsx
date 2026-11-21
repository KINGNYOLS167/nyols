import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { LangProvider, useLang } from './i18n';
import { gsap, prefersReducedMotion, ScrollTrigger, SmoothScroll, useLenis } from './lib/motion';
import { HAS_SAMPLES, productById, type Product as P } from './data/products';
import { collectionBySlug } from './data/collections';
import { match, useLocation } from './router';
import { Cursor } from './components/Cursor';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Loader } from './components/Loader';
import { QuickView, type QuickViewState } from './components/QuickView';
import { SearchOverlay } from './components/SearchOverlay';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Product from './pages/Product';
import Collections from './pages/Collections';
import About from './pages/About';
import NotFound from './pages/NotFound';

const Admin = lazy(() => import('./admin/Admin'));

function Page({ onQuickView }: { onQuickView: (p: P, c: number) => void }) {
  const { path } = useLocation();
  let m: Record<string, string> | null;
  if (path === '/') return <Home onQuickView={onQuickView} />;
  if (path === '/shop') return <Shop onQuickView={onQuickView} />;
  if (path === '/collections') return <Collections />;
  if ((m = match('/collections/:slug', path))) return <Shop key={m.slug} slug={m.slug} onQuickView={onQuickView} />;
  if ((m = match('/product/:id', path))) return <Product id={m.id} onQuickView={onQuickView} />;
  if (path === '/about') return <About />;
  return <NotFound />;
}

function useDocumentTitle() {
  const { path } = useLocation();
  const { t, pick } = useLang();
  useEffect(() => {
    let m: Record<string, string> | null;
    const base = 'GOLFWEAR';
    if (path === '/') document.title = `${base} | Beyond the game`;
    else if (path === '/shop') document.title = `${t('shopTitle')} | ${base}`;
    else if (path === '/collections') document.title = `${t('collectionsTitle')} | ${base}`;
    else if ((m = match('/collections/:slug', path)) && collectionBySlug(m.slug)) document.title = `${pick(collectionBySlug(m.slug)!.name)} | ${base}`;
    else if (path === '/about') document.title = `${t('navAbout')} | ${base}`;
    else if ((m = match('/product/:id', path)) && productById(m.id)) return; // the product page sets its own
  }, [path, t, pick]);
}

function Site() {
  const { t } = useLang();
  const { path, href } = useLocation();
  const lenis = useLenis();
  const main = useRef<HTMLElement>(null);
  const [quick, setQuick] = useState<QuickViewState | null>(null);
  const [search, setSearch] = useState(false);
  const onQuickView = useCallback((product: P, colour = 0) => setQuick({ product, colour }), []);
  useDocumentTitle();

  // New page: start at the top (or at the #anchor) and let the content settle in.
  const first = useRef(true);
  useEffect(() => {
    const hash = location.hash;
    const target = hash ? document.querySelector(hash) : null;
    if (target) window.setTimeout(() => lenis ? lenis.scrollTo(target as HTMLElement, { offset: -100 }) : target.scrollIntoView(), 60);
    else if (lenis) lenis.scrollTo(0, { immediate: true, force: true }); else window.scrollTo(0, 0);
    if (!first.current && main.current && !prefersReducedMotion()) {
      gsap.fromTo(main.current, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
    }
    first.current = false;
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, href.includes('#') ? href : path]);

  return (
    <>
      <a href="#main" className="sr-only z-[95] rounded-full bg-champagne px-5 py-3 text-pine focus:not-sr-only focus:fixed focus:left-4 focus:top-4">{t('skip')}</a>
      <Loader />
      <Cursor />
      <Header onSearch={() => setSearch(true)} />
      <main id="main" ref={main}><Page onQuickView={onQuickView} /></main>
      <Footer />
      <QuickView state={quick} onClose={() => setQuick(null)} />
      <SearchOverlay open={search} onClose={() => setSearch(false)} />
      {HAS_SAMPLES && (
        <p title={t('preview')} className="pointer-events-none fixed bottom-4 left-4 z-40 hidden max-w-[calc(100vw-2rem)] rounded-full sm:block bg-champagne px-3.5 py-1.5 text-[0.75rem] font-medium text-pine shadow-[0_6px_24px_rgb(16_43_37/0.25)]">
          {t('previewShort')}
        </p>
      )}
    </>
  );
}

export default function App() {
  const { path } = useLocation();
  if (path === '/admin' || path.startsWith('/admin/')) {
    return <Suspense fallback={<p className="p-8">Loading…</p>}><Admin /></Suspense>;
  }
  return (
    <LangProvider>
      <SmoothScroll>
        <Site />
      </SmoothScroll>
    </LangProvider>
  );
}
