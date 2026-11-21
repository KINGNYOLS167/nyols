import { useEffect, useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '../lib/motion';
import { intro } from '../lib/reveal';
import { Mark } from './Logo';

/**
 * First-visit intro: the G mark draws itself open, the flag rises, then the panel lifts away.
 * Shown once per browser session, never with reduced motion, and never for longer than ~1.4s.
 */
export function Loader() {
  const [show] = useState(() => {
    if (prefersReducedMotion()) return false;
    try { return !sessionStorage.getItem('gw-intro'); } catch { return false; }
  });
  const root = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(!show);

  useEffect(() => {
    if (!show) { intro.finish(); return; }
    try { sessionStorage.setItem('gw-intro', '1'); } catch { /* storage unavailable */ }
    const el = root.current!;
    document.documentElement.style.overflow = 'hidden';
    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.style.overflow = '';
        setGone(true);
      },
    });
    tl.fromTo(el.querySelector('.ld-mark'), { clipPath: 'circle(0% at 50% 50%)', rotate: -40 }, { clipPath: 'circle(75% at 50% 50%)', rotate: 0, duration: 0.9, ease: 'expo.out' })
      .fromTo(el.querySelector('.ld-word'), { autoAlpha: 0, letterSpacing: '0.6em' }, { autoAlpha: 1, letterSpacing: '0.42em', duration: 0.7, ease: 'power3.out' }, 0.25)
      .to(el.querySelector('.ld-inner'), { autoAlpha: 0, y: -20, duration: 0.35, ease: 'power2.in' }, 1.0)
      .to(el, { yPercent: -100, duration: 0.8, ease: 'expo.inOut', onStart: () => intro.finish() }, 1.1);
    return () => { tl.kill(); document.documentElement.style.overflow = ''; };
  }, [show]);

  if (gone) return null;
  return (
    <div ref={root} aria-hidden className="contours fixed inset-0 z-[90] flex items-center justify-center bg-pine">
      <div className="ld-inner flex flex-col items-center gap-6">
        <div className="ld-mark w-20"><Mark tone="dark" className="h-auto w-full" /></div>
        <p className="ld-word pl-[0.42em] text-[0.8rem] font-medium tracking-[0.42em] text-ivory/85">GOLFWEAR</p>
      </div>
    </div>
  );
}
