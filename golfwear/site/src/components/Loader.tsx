import { useEffect, useRef, useState } from 'react';
import paths from '../brand/paths.json';
import { gsap, prefersReducedMotion } from '../lib/motion';

/**
 * First-visit intro: the G is drawn, the flag rises, then the curtain lifts. About 1.6 s,
 * once per browser session, skipped for reduced motion.
 */
/** Read once at start-up, so the hero can wait for the intro to finish. */
export const INTRO_PLAYING = (() => {
  try { return !prefersReducedMotion() && !sessionStorage.getItem('gw-intro'); } catch { return false; }
})();

export function Loader() {
  const [show, setShow] = useState(INTRO_PLAYING);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!show || !root.current) return;
    try { sessionStorage.setItem('gw-intro', '1'); } catch { /* storage unavailable */ }
    const el = root.current;
    const ring = el.querySelector<SVGPathElement>('.ring')!;
    const len = ring.getTotalLength();
    const tl = gsap.timeline({ onComplete: () => setShow(false) });
    tl.set(ring, { strokeDasharray: len, strokeDashoffset: len })
      .to(ring, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' })
      .to(el.querySelector('.fill'), { opacity: 1, duration: 0.3 }, '-=0.15')
      .from(el.querySelector('.flag'), { scaleX: 0, transformOrigin: '0% 50%', duration: 0.45, ease: 'back.out(2)' }, '-=0.1')
      .to(el.querySelector('svg'), { scale: 0.92, opacity: 0, duration: 0.35, ease: 'power2.in' }, '+=0.15')
      .to(el, { yPercent: -100, duration: 0.8, ease: 'expo.inOut' }, '-=0.1');
    return () => { tl.kill(); };
  }, [show]);
  if (!show) return null;
  return (
    <div ref={root} aria-hidden className="fixed inset-0 z-[90] flex items-center justify-center bg-pine">
      <svg viewBox="-2 -2 106 104" className="h-20 w-20">
        <path className="ring" d={paths.mark.g} fill="none" stroke="#F5F2EA" strokeWidth="1.2" />
        <path className="fill" d={paths.mark.g} fill="#F5F2EA" opacity="0" />
        <path className="flag" d={paths.mark.flag} fill="#C7B58A" style={{ transformBox: 'fill-box' }} />
      </svg>
    </div>
  );
}
