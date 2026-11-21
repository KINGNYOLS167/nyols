import { createContext, useContext, useEffect, useState, type ReactNode, type RefObject } from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';

gsap.registerPlugin(useGSAP, Flip, ScrollTrigger, SplitText);
export { gsap, Flip, ScrollTrigger, SplitText, useGSAP };

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export const HEADER_OFFSET = 96;

const LenisContext = createContext<Lenis | null>(null);
export const useLenis = () => useContext(LenisContext);

/** Lenis smooth scrolling, driven by GSAP's ticker and kept in sync with ScrollTrigger. Off for reduced motion. */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  useEffect(() => {
    const instance = new Lenis({ lerp: 0.11, anchors: { offset: -HEADER_OFFSET }, autoRaf: false });
    instance.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    setLenis(instance);
    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
    };
  }, []);
  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}

/**
 * Declarative scroll reveals inside `scope`:
 *   data-reveal="text"   lines rise out of a mask
 *   data-reveal="image"  the frame opens from the bottom while the photo settles
 *   data-reveal="fade"   soft rise
 *   data-reveal="stagger" children rise one after another
 *   data-parallax="0.15" the element drifts against the scroll
 * Everything plays once and is skipped for reduced motion.
 */
export function useReveal(scope: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useGSAP(() => {
    const root = scope.current;
    if (!root || prefersReducedMotion()) return;
    const once = (trigger: Element) => ({ trigger, start: 'top 86%', once: true });
    const splits: SplitText[] = [];
    root.querySelectorAll<HTMLElement>('[data-reveal="text"]').forEach((el) => {
      const split = SplitText.create(el, { type: 'lines', mask: 'lines' });
      splits.push(split);
      gsap.from(split.lines, { yPercent: 110, duration: 1.05, ease: 'expo.out', stagger: 0.08, scrollTrigger: once(el), onComplete: () => split.revert() });
    });
    root.querySelectorAll<HTMLElement>('[data-reveal="image"]').forEach((el) => {
      const img = el.querySelector('img');
      gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut', scrollTrigger: once(el) });
      if (img) gsap.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.6, ease: 'expo.out', scrollTrigger: once(el) });
    });
    root.querySelectorAll<HTMLElement>('[data-reveal="fade"]').forEach((el) => {
      gsap.from(el, { autoAlpha: 0, y: 28, duration: 1, ease: 'power3.out', scrollTrigger: once(el) });
    });
    root.querySelectorAll<HTMLElement>('[data-reveal="stagger"]').forEach((el) => {
      gsap.from(el.children, { autoAlpha: 0, y: 36, duration: 0.95, ease: 'power3.out', stagger: 0.09, scrollTrigger: once(el) });
    });
    root.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
      const amount = parseFloat(el.dataset.parallax || '0.12');
      gsap.fromTo(el, { yPercent: -amount * 50 }, { yPercent: amount * 50, ease: 'none', scrollTrigger: { trigger: el.parentElement ?? el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    return () => { window.removeEventListener('load', refresh); splits.forEach((s) => s.revert()); };
  }, { scope, dependencies: deps, revertOnUpdate: true });
}
