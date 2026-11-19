import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export let lenis = null;

export function initSmoothScroll() {
  if (reducedMotion || lenis) return lenis;
  lenis = new Lenis({ anchors: { offset: -96 }, allowNestedScroll: true, stopInertiaOnNavigate: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export const lockScroll = (locked) => {
  document.documentElement.classList.toggle('is-locked', locked);
  if (lenis) (locked ? lenis.stop() : lenis.start());
};

/** Fade-up reveal for anything marked [data-reveal] inside `root`. Content stays visible without JS or with reduced motion. */
export function reveal(root = document) {
  if (reducedMotion) return;
  const items = [...root.querySelectorAll('[data-reveal]:not([data-revealed])')];
  if (!items.length) return;
  items.forEach((el) => el.setAttribute('data-revealed', ''));
  gsap.set(items, { autoAlpha: 0, y: 24 });
  ScrollTrigger.batch(items, {
    start: 'top 92%',
    once: true,
    onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06, overwrite: true }),
  });
}

export function heroIntro(scope) {
  if (reducedMotion || !scope) return;
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from(scope.querySelectorAll('[data-hero-line]'), { y: 32, autoAlpha: 0, duration: 0.9, stagger: 0.08 })
    .from(scope.querySelectorAll('[data-hero-card]'), { y: 40, autoAlpha: 0, duration: 1 }, '-=0.6')
    .from(scope.querySelectorAll('[data-hero-art] .garment'), { scale: 0.92, rotate: -3, autoAlpha: 0, duration: 1.1 }, '-=0.8');
}

export const refreshScroll = () => ScrollTrigger.refresh();
export { gsap, ScrollTrigger };
