import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { gsap, prefersReducedMotion, SplitText, useGSAP } from '../lib/motion';
import { useLang } from '../i18n';
import { STORE } from '../config';
import { Mark, Tagline } from './Logo';
import { Magnetic } from './Magnetic';

const GolfBall = lazy(() => import('./GolfBall'));

/** Shown only if WebGL is missing or the 3D ball is slow to load. */
function BallFallback() {
  return (
    <div
      aria-hidden
      className="absolute left-1/2 top-1/2 aspect-square w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        backgroundImage:
          'radial-gradient(circle at 34% 30%, rgb(255 255 255 / 0.95), rgb(255 255 255 / 0) 42%), radial-gradient(circle, rgb(0 0 0 / 0.07) 34%, transparent 37%), radial-gradient(circle at 50% 50%, #f4f2ec 0%, #e3dfd4 64%, #b8b3a6 100%)',
        backgroundSize: '100% 100%, 13px 13px, 100% 100%',
        boxShadow: 'inset -16px -20px 40px rgb(0 0 0 / 0.16)',
      }}
    >
      <Mark className="absolute left-1/2 top-[46%] w-[24%] -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
}

export function Hero() {
  const { t, lang } = useLang();
  const root = useRef<HTMLElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const [reduced] = useState(prefersReducedMotion);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), 1600);
    return () => window.clearTimeout(id);
  }, []);
  const showFallback = failed || (slow && !ready);
  const num = (n: number) => n.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US');

  // The page's one orchestrated moment: the headline rises line by line while the ball drops.
  useGSAP(() => {
    if (reduced) return;
    const split = SplitText.create('.hero-title', {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.1, delay: 0.1, onComplete: () => self.revert() }),
    });
    gsap.from('.hero-rise', { autoAlpha: 0, y: 16, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.5 });
    return () => split.revert();
  }, { scope: root, dependencies: [lang], revertOnUpdate: true });

  return (
    <section id="top" ref={root} className="mow relative overflow-hidden text-ivory">
      <div className="wrap grid min-h-[100svh] grid-cols-1 gap-x-10 pb-16 pt-[128px] lg:grid-cols-12 lg:grid-rows-[1fr_auto_1fr] lg:pb-14 lg:pt-[118px]">
        <div className="relative z-10 lg:col-span-6 lg:row-start-1 lg:self-end">
          <Tagline className="hero-rise" />
          <h1 key={lang} className="hero-title display mt-7 max-w-[11ch]">{t('heroTitle')}</h1>
        </div>

        <div className="relative mx-auto -mb-4 -mt-2 aspect-square w-[min(80vw,380px)] lg:col-span-6 lg:col-start-7 lg:row-span-3 lg:row-start-1 lg:mt-0 lg:w-full lg:max-w-[660px] lg:self-center">
          <div
            ref={shadow}
            aria-hidden
            className="absolute left-1/2 top-[80%] h-[9%] w-[52%] rounded-[50%]"
            style={{ background: 'radial-gradient(closest-side, rgb(4 18 12 / 0.6), transparent)', opacity: showFallback ? 0.75 : 0, transform: 'translateX(-50%)' }}
          />
          {showFallback && <BallFallback />}
          {!failed && (
            <Suspense fallback={null}>
              <GolfBall shadow={shadow} label={t('ballLabel')} reduced={reduced} onReady={() => setReady(true)} onFail={() => setFailed(true)} />
            </Suspense>
          )}
          {ready && (
            <p className="pointer-events-none absolute bottom-[2%] left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap text-[0.85rem] text-moss">
              <svg viewBox="0 0 24 12" className="h-3 w-6" aria-hidden><path d="M1 6h22M5 2 1 6l4 4M19 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
              {t('ballHint')}
            </p>
          )}
        </div>

        <div className="relative z-10 lg:col-span-6 lg:row-start-2">
          <p className="hero-rise lede mt-6 max-w-[38ch] text-ivory/80 lg:mt-8">{t('heroBody')}</p>
          <div className="hero-rise mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Magnetic><a href="#best" className="btn btn-brass w-full sm:w-auto">{t('heroBest')}</a></Magnetic>
            <Magnetic>
              <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" data-cursor="buy" className="btn btn-line-light w-full sm:w-auto">{t('heroStore')}</a>
            </Magnetic>
          </div>
        </div>

        <p className="hero-rise relative z-10 mt-10 flex max-w-[46ch] items-start gap-2.5 text-[0.95rem] leading-snug text-moss lg:col-span-6 lg:row-start-3 lg:mt-12 lg:self-start">
          <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-brass" aria-hidden><path fill="currentColor" d="m10 1.5 2.6 5.5 6 .7-4.4 4.1 1.2 5.9L10 14.8l-5.4 2.9 1.2-5.9L1.4 7.7l6-.7z" /></svg>
          <span>{t('heroTrust', { rating: num(STORE.stats.rating), reviews: num(STORE.stats.reviews), sold: num(STORE.stats.sold) })}</span>
        </p>
      </div>
    </section>
  );
}
