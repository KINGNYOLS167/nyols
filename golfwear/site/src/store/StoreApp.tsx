import { useCallback, useRef } from 'react';
import { CatalogProvider, COLLECTIONS, type CollectionSlug } from '../lib/catalog';
import { match, RouterProvider, useRouter, navigate } from '../lib/router';
import { gsap, prefersReducedMotion, scrollToTop, ScrollTrigger, SmoothScroll, useGSAP, useLenis } from '../lib/motion';
import { usePageMeta } from '../lib/meta';
import { LangProvider, useLang, type Key } from '../i18n';
import { Cursor } from '../components/Cursor';
import { Footer, Newsletter } from '../components/Footer';
import { Header } from '../components/Header';
import { Loader } from '../components/Loader';
import { QuickViewProvider } from '../components/QuickViewContext';
import { Home } from '../pages/Home';
import { Catalog } from '../pages/Catalog';
import { Brands } from '../pages/Brands';
import { ProductPage } from '../pages/Product';
import { About } from '../pages/About';
import { NotFound } from '../pages/NotFound';

interface Route {
  page: React.ReactNode;
  /** The page opens on a dark full-bleed image, so the header starts transparent over it. */
  overlay?: boolean;
  title?: string;
}

function useRoute(): Route {
  const { path, search } = useRouter();
  const { t } = useLang();
  if (path === '/') return { page: <Home />, overlay: true };
  if (path === '/shop') return { page: <Catalog />, title: search.get('q') ? t('resultsFor', { q: search.get('q')! }) : t('shopTitle') };
  if (path === '/search') {
    queueMicrotask(() => navigate(`/shop?q=${encodeURIComponent(search.get('q') ?? '')}`, { replace: true }));
    return { page: null };
  }
  if (path === '/brands') return { page: <Brands />, title: t('brandsIndexTitle') };
  if (path === '/about') return { page: <About />, overlay: true, title: t('aboutTitle') };
  let m = match('/collections/:slug', path);
  if (m) {
    const slug = m.slug as CollectionSlug;
    if (!(COLLECTIONS as readonly string[]).includes(slug)) return { page: <NotFound /> };
    return { page: <Catalog key={slug} collection={slug} />, title: t(`col.${slug}` as Key) };
  }
  m = match('/brands/:slug', path);
  if (m) return { page: <Catalog key={m.slug} brandSlug={m.slug} /> };
  m = match('/product/:slug', path);
  if (m) return { page: <ProductPage slug={m.slug} /> };
  return { page: <NotFound /> };
}

function Shell() {
  const { t } = useLang();
  const { path } = useRouter();
  const route = useRoute();
  const main = useRef<HTMLElement>(null);
  usePageMeta(route.title);

  // Page transition: each new page settles in from a slight offset.
  useGSAP(() => {
    if (prefersReducedMotion() || !main.current) return;
    gsap.fromTo(main.current, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out', clearProps: 'transform,opacity,visibility' });
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, { dependencies: [path] });

  return (
    <>
      <a href="#main" className="sr-only z-[95] bg-champagne px-5 py-3 text-pine focus:not-sr-only focus:fixed focus:left-4 focus:top-4">{t('skip')}</a>
      <Loader />
      <Cursor />
      <Header overlay={!!route.overlay} />
      <main id="main" ref={main} tabIndex={-1} className="outline-none">
        {route.page}
      </main>
      <Newsletter />
      <Footer />
    </>
  );
}

function Routed() {
  const lenis = useLenis();
  const onNavigate = useCallback((scroll: boolean) => {
    if (scroll) scrollToTop(lenis);
  }, [lenis]);
  return (
    <RouterProvider onNavigate={onNavigate}>
      <QuickViewProvider>
        <Shell />
      </QuickViewProvider>
    </RouterProvider>
  );
}

export default function StoreApp() {
  return (
    <LangProvider>
      <CatalogProvider>
        <SmoothScroll>
          <Routed />
        </SmoothScroll>
      </CatalogProvider>
    </LangProvider>
  );
}
