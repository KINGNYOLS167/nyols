---
name: lenis
description: Use when adding smooth scrolling (inertia/lerp scroll, scroll-synced WebGL/parallax, anchor smooth-scroll, scroll snap) with Lenis by darkroom.engineering, in vanilla JS, React, Vue/Nuxt, or alongside GSAP ScrollTrigger. Triggers on "lenis", "smooth scroll", "smooth scrolling", "scroll hijack", "lenis/react", "ReactLenis", "scrollTo smooth", "nested scroll modal breaks".
---

# Lenis - smooth scroll

Source: https://github.com/darkroomengineering/lenis (README verified at v1.3.27). Lightweight, zero-dependency, runs on **native scroll** (sticky, anchors, a11y keep working). Package `lenis` includes `lenis/react`, `lenis/vue`, `lenis/snap`, `lenis/nuxt`.

## Install & minimum setup

```bash
npm i lenis
```
```js
import Lenis from "lenis";
import "lenis/dist/lenis.css";          // REQUIRED recommended CSS
const lenis = new Lenis({ autoRaf: true });
lenis.on("scroll", (e) => console.log(e.scroll, e.velocity, e.progress));
```
Manual loop (instead of `autoRaf`): `function raf(t){ lenis.raf(t); requestAnimationFrame(raf) } requestAnimationFrame(raf)`.

No-build: 
```html
<link rel="stylesheet" href="https://unpkg.com/lenis@1.3.27/dist/lenis.css">
<script src="https://unpkg.com/lenis@1.3.27/dist/lenis.min.js"></script>
<script>new Lenis({ autoRaf: true, autoToggle: true, anchors: true, allowNestedScroll: true, naiveDimensions: true, stopInertiaOnNavigate: true })</script>
```

## GSAP ScrollTrigger integration (most common pairing)
```js
const lenis = new Lenis();
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));   // seconds -> ms
gsap.ticker.lagSmoothing(0);
```
Do NOT also set `autoRaf: true` here (double loop). Don't combine with GSAP ScrollSmoother.

## Key options (full table: [reference.md](reference.md))
`lerp` (0.1; set => ignores duration/easing) · `duration` (1.2s) · `easing` · `smoothWheel` · `wheelMultiplier` · `touchMultiplier` · `syncTouch` (+`syncTouchLerp`) · `orientation` / `gestureOrientation` · `infinite` (needs `syncTouch` on touch) · `anchors` (true or scrollTo opts) · `autoRaf` · `autoResize` · `autoToggle` · `allowNestedScroll` · `prevent(node)` · `virtualScroll(e)` · `wrapper`/`content`/`eventsTarget` (custom scroll container) · `respectReducedMotion` (true, keep it) · `stopInertiaOnNavigate` · `overscroll` · `naiveDimensions`.

## Methods / props / events
- `lenis.scrollTo(target, { offset, duration, easing, lerp, immediate, lock, force, onComplete, userData })` - target = px number, selector, `"top"|"bottom"|...`, or Element.
- `lenis.stop()` / `lenis.start()` (e.g. while a modal is open or during page transition), `lenis.resize()`, `lenis.destroy()`, `lenis.raf(ms)`, `lenis.on('scroll'|'virtual-scroll', cb)`.
- Props: `scroll`, `animatedScroll`, `targetScroll`, `limit`, `progress` (0-1), `velocity`, `direction` (1/-1), `isScrolling` (`'smooth'|'native'|false`), `isStopped`, `prefersReducedMotion`.

## Nested scroll / modals
- Simplest: `new Lenis({ allowNestedScroll: true })` (checks DOM tree each scroll event - perf cost).
- Cheaper: HTML attrs `data-lenis-prevent` (`-wheel`, `-touch`, `-vertical`, `-horizontal` variants) on the inner scroller, or `prevent: (node) => node.id === "modal"`.
- Modal open: `lenis.stop()`; close: `lenis.start()`.

## React
```jsx
import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";
function App() {
  useLenis((lenis) => { /* every scroll */ });
  return <><ReactLenis root options={{ lerp: 0.1 }} />{/* content */}</>;
}
```
- `root` => instance on `<html>`, accessible app-wide via `useLenis`; `root="asChild"` for custom containers; without `root`, wraps children in a scroll div.
- `useLenis(callback, deps, priority)`; ref: `lenisRef.current.lenis`.
- With GSAP: `<ReactLenis root options={{ autoRaf: false }} ref={lenisRef} />` and in `useEffect`: `gsap.ticker.add(update)` where `update = t => lenisRef.current?.lenis?.raf(t*1000)`; cleanup with `gsap.ticker.remove(update)`.
- Framer Motion: `frame.update(data => lenis.raf(data.timestamp), true)`; cleanup `cancelFrame`.
- Next.js: component needs `"use client"`.

## Vue / Nuxt
`app.use(LenisVue)` (from `lenis/vue`) then `<vue-lenis root />` + `useLenis()` (returns ref); Nuxt: `modules: ['lenis/nuxt']`.

## Snap (`lenis/snap`)
```js
import Snap from "lenis/snap";
const snap = new Snap(lenis, { type: "proximity" /* | mandatory | lock */, distanceThreshold: "50%", debounce: 500 });
snap.add(500); snap.addElement(el, { align: ["start","end"] }); snap.addElements(document.querySelectorAll(".section"), { align: "center" });
// slideshow: { type: "lock", distanceThreshold: "100%", debounce: 0 }.  snap.next()/previous()/goTo(i)/start()/stop()/resize()
```
Native CSS scroll-snap is NOT supported with Lenis - use `lenis/snap`.

## Troubleshooting checklist
1. Imported `lenis/dist/lenis.css`? 2. Running a raf loop (`autoRaf: true` OR manual `lenis.raf`) - exactly one? 3. Page scrolls without Lenis? 4. Latest version? 5. GSAP: synced via ticker + `ScrollTrigger.update`. 6. Anchor links dead while smoothing -> `anchors: true`. 7. Inner scrollers/modals frozen -> `allowNestedScroll`/`data-lenis-prevent`. 8. `fixed` elements lag on pre-M1 Safari (known).

## Limitations
Safari capped at 60fps (30 in low-power mode); no smoothing over iframes (they swallow wheel events); `syncTouch` unstable on iOS < 16; honors `prefers-reduced-motion` by default (smoothing off, instant scrollTo) - leave it on.
