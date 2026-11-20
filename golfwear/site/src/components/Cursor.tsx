import { useEffect, useRef, useState } from 'react';
import { finePointer, gsap, prefersReducedMotion } from '../lib/motion';
import { useLang } from '../i18n';

type Mode = 'hidden' | 'default' | 'link' | 'view' | 'buy' | 'drag';

function modeFor(target: EventTarget | null): Mode {
  if (!(target instanceof Element)) return 'default';
  const tagged = target.closest<HTMLElement>('[data-cursor]');
  if (tagged) return tagged.dataset.cursor as Mode;
  if (target.closest('input, textarea, select')) return 'hidden';
  if (target.closest('a, button, summary, label, [role="button"]')) return 'link';
  return 'default';
}

const RING: Record<Mode, string> = {
  hidden: 'h-8 w-8 opacity-0',
  default: 'h-8 w-8 border-[1.5px] border-brass',
  link: 'h-14 w-14 border-[1.5px] border-brass bg-brass/15',
  view: 'h-[86px] w-[86px] bg-fairway text-ivory',
  buy: 'h-[86px] w-[86px] bg-brass text-fairway',
  drag: 'h-[86px] w-[86px] border-[1.5px] border-ivory/80 text-ivory backdrop-blur-[2px]',
};

/** A golf-ball dot with a brass ring that changes with what's under it: View, Buy, Spin. Mouse only. */
export function Cursor() {
  const { t } = useLang();
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<Mode>('hidden');

  useEffect(() => {
    const check = () => setEnabled(finePointer() && !prefersReducedMotion());
    check();
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    mq.addEventListener('change', check);
    return () => mq.removeEventListener('change', check);
  }, []);

  useEffect(() => {
    if (!enabled || !dot.current || !ring.current) return;
    const root = document.documentElement;
    root.classList.add('has-cursor');
    gsap.set([dot.current, ring.current], { xPercent: -50, yPercent: -50 });
    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.08, ease: 'power3' });
    const dy = gsap.quickTo(dot.current, 'y', { duration: 0.08, ease: 'power3' });
    const rx = gsap.quickTo(ring.current, 'x', { duration: 0.42, ease: 'power3' });
    const ry = gsap.quickTo(ring.current, 'y', { duration: 0.42, ease: 'power3' });
    let shown = false;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      if (!shown) {
        gsap.set([dot.current, ring.current], { x: e.clientX, y: e.clientY });
        shown = true;
        setMode(modeFor(e.target));
      }
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    };
    const over = (e: PointerEvent) => { if (e.pointerType === 'mouse') setMode(modeFor(e.target)); };
    const out = (e: PointerEvent) => { if (!e.relatedTarget) { shown = false; setMode('hidden'); } };
    const down = () => gsap.to(ring.current, { scale: 0.85, duration: 0.15 });
    const up = () => gsap.to(ring.current, { scale: 1, duration: 0.3, ease: 'back.out(3)' });
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerover', over);
    document.addEventListener('pointerout', out);
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    return () => {
      root.classList.remove('has-cursor');
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerout', out);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
    };
  }, [enabled]);

  if (!enabled) return null;
  const big = mode === 'view' || mode === 'buy' || mode === 'drag';
  const label = mode === 'view' ? t('cursorView') : mode === 'buy' ? t('cursorBuy') : mode === 'drag' ? t('cursorSpin') : '';
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100]">
      <div
        ref={ring}
        className={`fixed left-0 top-0 flex items-center justify-center rounded-full text-[0.82rem] font-medium tracking-wide transition-[width,height,background-color,border-color,opacity] duration-300 ease-[var(--ease-quint)] ${RING[mode]}`}
      >
        <span className={`flex items-center gap-1.5 transition-opacity duration-200 ${big ? 'opacity-100' : 'opacity-0'}`}>
          {mode === 'buy' && (
            <svg viewBox="0 0 12 14" className="h-3.5 w-3" aria-hidden><path d="M1 0v14" stroke="currentColor" strokeWidth="1.6" /><path d="M1.8 1 11 3.8 1.8 6.6z" fill="currentColor" /></svg>
          )}
          {mode === 'drag' && <span aria-hidden>‹</span>}
          {label}
          {mode === 'drag' && <span aria-hidden>›</span>}
        </span>
      </div>
      <div
        ref={dot}
        className={`fixed left-0 top-0 h-[7px] w-[7px] rounded-full bg-brass shadow-[0_0_0_1.5px_rgb(244_239_228/0.7)] transition-opacity duration-200 ${mode === 'hidden' || big ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
}
