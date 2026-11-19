---
name: gsap
description: Use when writing or debugging web animation with GSAP (GreenSock) - tweens, timelines, ScrollTrigger scroll animations, SplitText, Flip, Draggable, MorphSVG, DrawSVG, MotionPath, ScrollSmoother, or GSAP in React via useGSAP. Triggers on "gsap", "greensock", "ScrollTrigger", "timeline", "animate on scroll", "text split animation", "pin section", "scrub".
---

# GSAP (GreenSock Animation Platform)

Source: https://github.com/greensock/GSAP (verified against v3.15.1). Docs: https://gsap.com/docs. Cheat sheet: https://gsap.com/cheatsheet.
**100% free incl. all plugins** (SplitText, MorphSVG, DrawSVG, ScrollSmoother, Inertia...), commercial use allowed. Zero dependencies.

## Install & register

```bash
npm install gsap          # React: npm install @gsap/react
```
```js
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";   // or: import { gsap, ScrollTrigger, Flip } from "gsap/all"
gsap.registerPlugin(ScrollTrigger);                    // REQUIRED for every plugin except core/CSS
```
CDN: `<script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/gsap.min.js"></script>` (plugins: `dist/ScrollTrigger.min.js`, etc.).

## Core API

```js
gsap.to(".box", { x: 200, rotation: 360, duration: 1, ease: "power2.out" });
gsap.from(".box", { opacity: 0, y: 50 });                 // animate FROM values to current
gsap.fromTo(".box", { opacity: 0 }, { opacity: 1 });
gsap.set(".box", { x: 0 });                               // instant
```
- Use transform shorthands (`x`, `y`, `scale`, `rotation`, `xPercent`), not `left/top`/`transform` strings.
- Common vars: `duration`, `delay`, `ease`, `stagger` (number or `{each, from, amount}`), `repeat` (-1 = infinite), `yoyo`, `paused`, `overwrite`, `onComplete`/`onUpdate`/`onStart`, `immediateRender`, `defaults`.
- Eases: `"power1-4.in|out|inOut"`, `"back.out(1.7)"`, `"elastic.out(1,0.3)"`, `"expo"`, `"sine"`, `"bounce"`, `"steps(12)"`. Visualizer: https://gsap.com/docs/v3/Eases
- Function-based values: `x: (i, target) => i * 50`. Relative: `x: "+=100"`. CSS vars: `"--hue": 180`.
- Control: `tween.play() / pause() / reverse() / restart() / progress(0.5) / timeScale(2) / kill()`.
- `gsap.matchMedia()` for responsive / reduced-motion; `gsap.context()` for scoped cleanup (`ctx.revert()`).
- `gsap.quickTo(el, "x", {duration:.4})` / `gsap.quickSetter` for high-frequency updates (mouse followers).
- Utilities: `gsap.utils.{toArray, mapRange, clamp, wrap, interpolate, random, snap, distribute, pipe, shuffle, normalize}`. `gsap.registerEffect()`, `gsap.ticker.add(fn)`.

## Timelines (sequencing)

```js
const tl = gsap.timeline({ defaults: { duration: 0.6, ease: "power2.out" }, repeat: -1, yoyo: true });
tl.from(".a", { y: 40, opacity: 0 })
  .to(".b", { x: 100 }, "-=0.3")          // 0.3s before previous ends
  .to(".c", { scale: 2 }, "<")            // same start as previous ("<0.2" offset)
  .to(".d", { rotation: 90 }, "label")    // tl.addLabel("label", 2)
  .add(() => console.log("hi"));          // callbacks / nested timelines
```
Position param: absolute `2`, relative `"+=1"`/`"-=1"`, `"<"` prev start, `">"` prev end, labels.

## ScrollTrigger (most-used plugin)

```js
gsap.registerPlugin(ScrollTrigger);
gsap.to(".box", {
  x: 500,
  scrollTrigger: {
    trigger: ".box",
    start: "top 80%",        // "<trigger pos> <viewport pos>"
    end: "bottom 20%",       // or "+=500"
    scrub: true,             // or number = seconds of smoothing; ties progress to scroll
    pin: true,               // pin trigger (or element) during scroll
    toggleActions: "play none none reverse",  // onEnter onLeave onEnterBack onLeaveBack
    markers: true,           // DEV ONLY - remove for prod
    snap: 1 / 3, anticipatePin: 1, invalidateOnRefresh: true,
  },
});
// Standalone: ScrollTrigger.create({ trigger, start, end, onEnter, onUpdate: self => self.progress })
// Batch many elements: ScrollTrigger.batch(".card", { onEnter: els => gsap.to(els, {opacity:1, stagger:.1}) })
// Responsive: ScrollTrigger.matchMedia / gsap.matchMedia().
```
Rules: create triggers in page order (or set `refreshPriority`); put `scrollTrigger` on a timeline (not on its child tweens); call `ScrollTrigger.refresh()` after layout changes (images/fonts load); `ScrollTrigger.killAll()`/`ctx.revert()` on teardown. Don't pin an element that's inside another pinned/transformed parent.

## React (`@gsap/react`)

```jsx
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP, ScrollTrigger);

function Box() {
  const container = useRef();
  useGSAP(() => {
    gsap.to(".box", { x: 200 });                    // selectors scoped to container
  }, { scope: container, dependencies: [], revertOnUpdate: false });
  const { contextSafe } = useGSAP({ scope: container });
  const onClick = contextSafe(() => gsap.to(".box", { rotation: "+=90" }));  // event handlers
  return <div ref={container}><div className="box" onClick={onClick} /></div>;
}
```
`useGSAP` = drop-in for `useEffect`/`useLayoutEffect` with automatic cleanup (reverts all animations/ScrollTriggers). Always give `scope`; never animate inside bare `useEffect` without `gsap.context()`. In Next.js add `"use client"`.

## Plugins (all free) - see [plugins.md](plugins.md) for usage snippets
ScrollTrigger, ScrollSmoother, ScrollToPlugin, **SplitText**, Flip, Draggable, InertiaPlugin, Observer, MotionPathPlugin, MotionPathHelper, MorphSVGPlugin, DrawSVGPlugin, TextPlugin, ScrambleTextPlugin, CustomEase, CustomBounce, CustomWiggle, EasePack (RoughEase/SlowMo/ExpoScaleEase), Physics2DPlugin, PhysicsPropsPlugin, PixiPlugin, EaselPlugin, CSSRulePlugin, GSDevTools.

## Common mistakes
| Mistake | Fix |
|---|---|
| Plugin does nothing | `gsap.registerPlugin(...)` missing |
| Animating `left`/`top`/`width` for motion | use `x`/`y`/`scale` (GPU transforms) |
| Competing tweens fight on same property | `overwrite: "auto"` or kill earlier tween |
| `from()` flashes final state before start | use `fromTo()`, or `immediateRender`/`autoAlpha` |
| ScrollTrigger positions wrong after images load | `ScrollTrigger.refresh()` / `invalidateOnRefresh` |
| Memory leaks / double animations in SPA/React | `useGSAP` / `gsap.context()` + `revert()` |
| Using CSS `transition` + GSAP on same prop | remove the CSS transition |
| Smooth-scroll lib (Lenis) jitters ScrollTrigger | see `lenis` skill - sync via `gsap.ticker`, `lagSmoothing(0)` |
| Left `markers: true` in production | remove |
| Hiding elements with `opacity:0` + `visibility` manually | use `autoAlpha` |

## Pairing with Lenis smooth scroll
```js
const lenis = new Lenis();
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));   // gsap time is seconds, Lenis wants ms
gsap.ticker.lagSmoothing(0);
```
Use Lenis OR ScrollSmoother, not both.
