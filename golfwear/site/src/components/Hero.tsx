import { useEffect, useRef, useState } from 'react';
import { gsap, prefersReducedMotion, SplitText, useGSAP } from '../lib/motion';
import { intro } from '../lib/reveal';
import { Link } from '../lib/router';
import { useCatalog } from '../lib/catalog';
import { useLang } from '../i18n';
import { STORE } from '../config';
import { CampaignPicture } from './Media';
import { Magnetic } from './Magnetic';

/**
 * The ball's flight, drawn like a broadcast shot tracer, in each photo's own pixel space.
 * It fades in as it climbs, so the low part never crosses the copy or the golfer.
 */
const TRACER = {
  wide: { box: '0 0 1536 864', d: 'M1128 700 C1090 120, 700 40, 520 300', end: [520, 300], fade: [700, 470] },
  tall: { box: '0 0 864 1536', d: 'M420 1395 C400 420, 600 330, 680 690', end: [680, 690], fade: [780, 600] },
} as const;

function usePortrait() {
  const q = '(max-width: 767px) and (orientation: portrait)';
  const [portrait, setPortrait] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setPortrait(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return portrait;
}

export function Hero() {
  const { t, lang, num } = useLang();
  const { settings } = useCatalog();
  const root = useRef<HTMLElement>(null);
  const portrait = usePortrait();
  const tracer = portrait ? TRACER.tall : TRACER.wide;
  const s = settings.store;
  const statsDate = s.statsDate ? new Date(s.statsDate + 'T00:00:00').toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { month: 'long', year: 'numeric' }) : '';

  // The page's one orchestrated entrance: headline rises, the tracer draws the shot, the copy settles.
  useGSAP(() => {
    const el = root.current!;
    const path = el.querySelector<SVGPathElement>('.tracer-path');
    const dot = el.querySelector('.tracer-dot');
    if (prefersReducedMotion()) return;
    const split = SplitText.create(el.querySelectorAll('.hero-line'), { type: 'chars', mask: 'chars' });
    const len = path?.getTotalLength() ?? 0;
    gsap.set(split.chars, { yPercent: 110 });
    gsap.set('.hero-rise', { autoAlpha: 0, y: 18 });
    if (path) gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    gsap.set(dot, { autoAlpha: 0, scale: 0.3, transformOrigin: '50% 50%' });
    const play = () => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.to(split.chars, { yPercent: 0, duration: 1.25, stagger: 0.035 })
        .to(path, { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut' }, 0.15)
        .to(dot, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(3)' }, 2.05)
        .to('.hero-rise', { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08 }, 0.6);
    };
    const stop = intro.wait(play);

    // Parallax: the photo drifts slower than the page; the copy lifts away a little faster.
    gsap.to('.hero-media', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-copy', { y: -90, autoAlpha: 0.2, ease: 'none', scrollTrigger: { trigger: el, start: 'center center', end: 'bottom top', scrub: true } });
    return () => { stop(); split.revert(); };
  }, { scope: root, dependencies: [lang, portrait], revertOnUpdate: true });

  return (
    <section ref={root} aria-labelledby="hero-title" className="relative overflow-hidden bg-pine text-ivory md:h-[100svh] md:min-h-[620px]">
      {/* Phones: the photo carries the headline and the copy sits below it. Wider: copy over the photo. */}
      <div className="hero-media absolute inset-x-0 top-0 h-[86svh] md:-top-[6%] md:h-[112%]">
        <CampaignPicture
          name="hero"
          mobile="hero-portrait"
          alt={t('heroImageAlt')}
          sizes="100vw"
          eager
          className="grain absolute inset-0 block"
          imgClassName="h-full w-full object-cover"
        />
        <svg aria-hidden viewBox={tracer.box} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <filter id="tracer-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" /></filter>
            <linearGradient id="tracer-fade" gradientUnits="userSpaceOnUse" x1="0" y1={tracer.fade[0]} x2="0" y2={tracer.fade[1]}>
              <stop offset="0" stopColor="#F5F2EA" stopOpacity="0" />
              <stop offset="1" stopColor="#F5F2EA" stopOpacity="1" />
            </linearGradient>
            <mask id="tracer-mask" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="6000" height="6000">
              <rect x="-2000" y="-2000" width="6000" height="6000" fill="url(#tracer-fade)" />
            </mask>
          </defs>
          <path d={tracer.d} fill="none" stroke="#C7B58A" strokeOpacity="0.5" strokeWidth="5" filter="url(#tracer-glow)" className="tracer-path" mask="url(#tracer-mask)" />
          <path d={tracer.d} fill="none" stroke="url(#tracer-fade)" strokeWidth="1.6" strokeLinecap="round" className="tracer-path" />
          <g className="tracer-dot">
            <circle cx={tracer.end[0]} cy={tracer.end[1]} r="9" fill="#C7B58A" fillOpacity="0.35" />
            <circle cx={tracer.end[0]} cy={tracer.end[1]} r="3.5" fill="#F5F2EA" />
          </g>
        </svg>
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,var(--color-pine)_0%,rgb(16_43_37/0.55)_24%,transparent_52%),linear-gradient(to_bottom,rgb(11_32_27/0.6),transparent_24%)] md:hidden" />
      </div>
      <div aria-hidden className="absolute inset-0 hidden bg-[linear-gradient(to_top,rgb(11_32_27/0.92)_0%,rgb(11_32_27/0.55)_30%,rgb(11_32_27/0)_62%),linear-gradient(to_bottom,rgb(11_32_27/0.55),transparent_22%)] md:block" />

      <div className="hero-copy wrap relative flex flex-col pb-16 pt-[60svh] md:h-full md:justify-end md:pb-[clamp(28px,6vh,64px)] md:pt-36">
        <h1 id="hero-title" className="t-hero [text-shadow:0_2px_40px_rgb(11_32_27/0.3)]">
          <span className="hero-line block">Beyond</span>
          <span className="hero-line block md:pl-[1.15em]">the game.</span>
        </h1>
        <div className="mt-8 grid gap-8 md:mt-12 md:grid-cols-12 md:items-end">
          <div className="hero-rise md:order-2 md:col-span-6 md:col-start-7 lg:col-span-5 lg:col-start-8">
            <p className="t-lede max-w-[36ch] text-ivory/88">{t('heroBody')}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Magnetic strength={0.2}><Link to="/shop" className="btn btn-champagne w-full sm:w-auto">{t('heroShop')}</Link></Magnetic>
              <Magnetic strength={0.2}>
                <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" data-cursor="buy" className="btn btn-outline-light w-full sm:w-auto">
                  {t('heroStore')}<span className="sr-only">{t('newTab')}</span>
                </a>
              </Magnetic>
            </div>
          </div>
          {s.rating !== null && (
            <dl className="hero-rise grid max-w-md grid-cols-3 gap-6 border-t border-ivory/20 pt-5 md:order-1 md:col-span-5">
              <div><dt className="t-micro text-mist first-letter:uppercase">{t('heroRating')}</dt><dd className="tnum mt-1 text-[1.5rem] font-light">{num(s.rating)}<span className="text-[0.9rem] text-mist">/5</span></dd></div>
              {s.reviews !== null && <div><dt className="t-micro text-mist first-letter:uppercase">{t('heroReviews')}</dt><dd className="tnum mt-1 text-[1.5rem] font-light">{num(s.reviews)}</dd></div>}
              {s.sold !== null && <div><dt className="t-micro text-mist first-letter:uppercase">{t('heroSold')}</dt><dd className="tnum mt-1 text-[1.5rem] font-light">{num(s.sold)}+</dd></div>}
              {statsDate && <p className="t-micro col-span-3 -mt-3 text-mist/80">{t('heroStatsSource', { date: statsDate })}</p>}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
