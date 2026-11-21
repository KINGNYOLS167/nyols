import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/motion';
import { useLang } from '../i18n';
import { Link } from '../router';
import { Mark } from './Logo';
import { Arrow } from './ui';

const GolfBall = lazy(() => import('./GolfBall'));

/** The interactive 3D ball with the G printed on it. Loads three.js only when it nears the screen. */
export function BallStage() {
  const { t } = useLang();
  const host = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: '400px' });
    if (host.current) io.observe(host.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={host} className="relative mx-auto aspect-square w-[min(84vw,520px)]">
      <div ref={shadow} aria-hidden className="absolute left-1/2 top-[80%] h-[9%] w-[52%] rounded-[50%]"
        style={{ background: 'radial-gradient(closest-side, rgb(4 18 12 / 0.6), transparent)', opacity: failed ? 0.75 : 0, transform: 'translateX(-50%)' }} />
      {failed && (
        <div aria-hidden className="absolute left-1/2 top-1/2 flex aspect-square w-[68%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
          style={{ background: 'radial-gradient(circle at 34% 30%, #fff, #e4e0d5 64%, #b8b3a6)' }}>
          <Mark className="w-[24%]" />
        </div>
      )}
      {near && !failed && (
        <Suspense fallback={null}>
          <GolfBall shadow={shadow} label={t('ballLabel')} reduced={reduced} onReady={() => setReady(true)} onFail={() => setFailed(true)} />
        </Suspense>
      )}
      {ready && (
        <p className="pointer-events-none absolute bottom-[2%] left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap text-[0.85rem] text-mist">
          <svg viewBox="0 0 24 12" className="h-3 w-6" aria-hidden><path d="M1 6h22M5 2 1 6l4 4M19 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
          {t('ballHint')}
        </p>
      )}
    </div>
  );
}

export function BrandMoment({ withLink = true }: { withLink?: boolean }) {
  const { t } = useLang();
  return (
    <section className="grain mow overflow-hidden bg-forest text-ivory">
      <div className="wrap grid items-center gap-12 py-24 md:grid-cols-12 lg:py-32">
        <div className="md:col-span-5">
          <div className="mark-hover w-20"><Mark tone="dark" flutter className="w-20" title="GOLFWEAR" /></div>
          <h2 className="h2 mt-8" data-reveal="text">{t('brandTitle')}</h2>
          <p className="lede mt-6 max-w-[40ch] text-ivory/80" data-reveal="fade">{t('brandBody')}</p>
          {withLink && <Link to="/about" className="link-line mt-8 inline-flex items-center gap-2">{t('brandCta')} <Arrow /></Link>}
        </div>
        <div className="md:col-span-7"><BallStage /></div>
      </div>
    </section>
  );
}
