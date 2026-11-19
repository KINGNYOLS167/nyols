import { useCallback, useState } from 'react';
import { LangProvider, useLang } from './i18n';
import { SmoothScroll } from './lib/motion';
import type { Product } from './data/products';
import { Cursor } from './components/Cursor';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Leaderboard } from './components/Leaderboard';
import { Shop } from './components/Shop';
import { QuickView, type QuickViewState } from './components/QuickView';
import { Faq, Footer, HowToOrder, Story } from './components/Sections';

function Page() {
  const { t } = useLang();
  const [quick, setQuick] = useState<QuickViewState | null>(null);
  const open = useCallback((product: Product, colour = 0) => setQuick({ product, colour }), []);
  return (
    <>
      <a href="#shop" className="sr-only z-[60] rounded-full bg-brass px-5 py-3 text-fairway focus:not-sr-only focus:fixed focus:left-4 focus:top-4">{t('skip')}</a>
      <Cursor />
      <Header />
      <main>
        <Hero />
        <Leaderboard onOpen={open} />
        <Shop onOpen={open} />
        <Story />
        <HowToOrder />
        <Faq />
      </main>
      <Footer />
      <QuickView state={quick} onClose={() => setQuick(null)} />
    </>
  );
}

export default function App() {
  return (
    <LangProvider>
      <SmoothScroll>
        <Page />
      </SmoothScroll>
    </LangProvider>
  );
}
