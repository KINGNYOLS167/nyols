// Scroll-driven motion, declared in markup and run once per section:
//   .reveal-lines   heading rises line by line from behind a mask
//   .reveal-img     image uncovers from the bottom while settling from a slight zoom
//   [data-parallax] element drifts by the given % of its height while it crosses the screen
import { createElement, useRef, type ReactNode, type RefObject } from 'react';
import { useLang } from '../i18n';
import { gsap, prefersReducedMotion, ScrollTrigger, SplitText, useGSAP } from './motion';

export function useScrollMotion<T extends HTMLElement>(deps: unknown[] = []): RefObject<T | null> {
  const scope = useRef<T>(null);
  const { lang } = useLang();
  useGSAP(() => {
    const root = scope.current;
    if (!root || prefersReducedMotion()) return;
    const splits: SplitText[] = [];
    root.querySelectorAll<HTMLElement>('.reveal-lines').forEach((el) => {
      const split = SplitText.create(el, { type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, {
          yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }),
      });
      splits.push(split);
    });
    root.querySelectorAll<HTMLElement>('.reveal-img').forEach((el) => {
      const img = el.querySelector('img');
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
      tl.fromTo(el, { clipPath: 'inset(18% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.out' });
      if (img) tl.fromTo(img, { scale: 1.16 }, { scale: 1, duration: 1.6, ease: 'expo.out' }, 0);
    });
    root.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
      const amount = Number(el.dataset.parallax) || 10;
      gsap.fromTo(el, { yPercent: -amount / 2 }, {
        yPercent: amount / 2, ease: 'none',
        scrollTrigger: { trigger: el.parentElement ?? el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
    requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => splits.forEach((s) => s.revert());
  }, { scope, dependencies: [lang, ...deps], revertOnUpdate: true });
  return scope;
}

/**
 * A heading that rises line by line. SplitText rewrites the element's DOM, so the element is
 * keyed on its language and text: React mounts a fresh one whenever the words change.
 */
export function RevealText({ as = 'h2', id, className = '', children }: { as?: 'h1' | 'h2' | 'p'; id?: string; className?: string; children: string }) {
  const { lang } = useLang();
  return createElement(as, { key: `${lang}:${children}`, id, className: `reveal-lines ${className}` }, children as ReactNode);
}

/** The intro loader signals when it has lifted, so the hero can start its own entrance. */
export const intro = {
  done: false,
  wait(cb: () => void) {
    if (this.done) { cb(); return () => {}; }
    const on = () => cb();
    window.addEventListener('gw:intro', on, { once: true });
    return () => window.removeEventListener('gw:intro', on);
  },
  finish() {
    this.done = true;
    window.dispatchEvent(new Event('gw:intro'));
  },
};
