import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useCatalog } from '../lib/catalog';
import { prefersReducedMotion } from '../lib/motion';
import { RevealText, useScrollMotion } from '../lib/reveal';
import { useLang, type Key } from '../i18n';
import { STORE } from '../config';
import { Mark } from '../components/Logo';
import { CampaignPicture } from '../components/Media';
import { OrderSteps } from './Home';

const GolfBall = lazy(() => import('../components/GolfBall'));

/** The interactive 3D ball from the original site, loaded only when it scrolls into view. */
function BallStage() {
  const { t } = useLang();
  const host = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={host} className="relative mx-auto aspect-square w-[min(84vw,520px)]">
      <div ref={shadow} aria-hidden className="absolute left-1/2 top-[80%] h-[9%] w-[52%] -translate-x-1/2 rounded-[50%]" style={{ background: 'radial-gradient(closest-side, rgb(4 18 12 / 0.6), transparent)', opacity: 0 }} />
      {(failed || (!ready && !visible)) && (
        <div className="mark-hover absolute inset-[18%] flex items-center justify-center"><Mark tone="dark" flutter className="h-auto w-full" title="GOLFWEAR" /></div>
      )}
      {visible && !failed && (
        <Suspense fallback={null}>
          <GolfBall shadow={shadow} label={t('ballLabel')} reduced={prefersReducedMotion()} onReady={() => setReady(true)} onFail={() => setFailed(true)} />
        </Suspense>
      )}
      {ready && <p className="t-small pointer-events-none absolute bottom-[2%] left-1/2 -translate-x-1/2 whitespace-nowrap text-mist">{t('ballHint')}</p>}
    </div>
  );
}

export function About() {
  const { t, num, lang } = useLang();
  const { settings } = useCatalog();
  const scope = useScrollMotion<HTMLDivElement>();
  const s = settings.store;
  const faq: [Key, Key][] = [['q1', 'a1'], ['q2', 'a2'], ['q3', 'a3'], ['q5', 'a5'], ['q4', 'a4']];
  useEffect(() => {
    // Land on #order / #faq when arriving from the footer.
    const id = window.location.hash.slice(1);
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }, []);
  return (
    <div ref={scope}>
      <section aria-labelledby="about-title" className="relative overflow-hidden bg-pine text-ivory">
        <div data-parallax="14" className="absolute inset-x-0 -top-[8%] h-[116%]">
          <CampaignPicture name="flag" alt="" sizes="100vw" eager className="grain absolute inset-0 block" imgClassName="h-full w-full object-cover" />
        </div>
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(11_32_27/0.9),rgb(11_32_27/0.35)_55%,rgb(11_32_27/0.5))]" />
        <div className="wrap relative flex min-h-[86svh] flex-col justify-end pb-16 pt-44">
          <RevealText as="h1" id="about-title" className="t-display max-w-[14ch]">{t('aboutTitle')}</RevealText>
          <p className="t-lede mt-8 max-w-[52ch] text-ivory/85">{t('aboutLede')}</p>
          {s.rating !== null && (
            <p className="t-small mt-6 text-mist">
              {[`${num(s.rating)}/5 ${t('heroRating')}`, s.reviews !== null && `${num(s.reviews)} ${t('heroReviews')}`, s.sold !== null && `${num(s.sold)}+ ${t('heroSold')}`].filter(Boolean).join(', ')}
              {s.statsDate && ` (${t('heroStatsSource', { date: new Date(s.statsDate + 'T00:00:00').toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { month: 'long', year: 'numeric' }) })})`}
            </p>
          )}
        </div>
      </section>

      <section id="story" aria-labelledby="story-title" className="contours bg-pine text-ivory">
        <div className="wrap grid items-center gap-14 py-24 md:grid-cols-12 lg:py-32">
          <div className="md:col-span-6"><BallStage /></div>
          <div className="md:col-span-5 md:col-start-8">
            <RevealText id="story-title" className="t-h2">{t('storyTitle')}</RevealText>
            <p className="t-lede mt-6 max-w-[46ch] text-ivory/85">{t('story1')}</p>
            <p className="mt-4 max-w-[52ch] text-mist">{t('story2')}</p>
          </div>
        </div>
      </section>

      <OrderSteps id="order" />

      <section id="faq" aria-labelledby="faq-title" className="bg-ivory">
        <div className="wrap grid gap-10 py-24 lg:grid-cols-12 lg:py-32">
          <RevealText id="faq-title" className="t-h2 text-forest lg:col-span-4">{t('faqTitle')}</RevealText>
          <div className="border-t border-line lg:col-span-8">
            {faq.map(([q, a]) => (
              <details key={q} className="group border-b border-line">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-4 text-[1.12rem]">
                  {t(q)}
                  <span aria-hidden className="relative h-4 w-4 shrink-0">
                    <span className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-forest" />
                    <span className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-forest transition-transform duration-300 group-open:scale-y-0" />
                  </span>
                </summary>
                <p className="max-w-[60ch] pb-6 text-stone">{t(a)}</p>
              </details>
            ))}
            <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" className="btn btn-forest mt-10">{t('footChat')}<span className="sr-only">{t('newTab')}</span></a>
          </div>
        </div>
      </section>
    </div>
  );
}
