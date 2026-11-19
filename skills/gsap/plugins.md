# GSAP plugin snippets (all free, `gsap.registerPlugin(...)` first)

```js
// SplitText - split into chars/words/lines for staggered text animation
import { SplitText } from "gsap/SplitText";
const split = SplitText.create(".headline", { type: "chars,words,lines", mask: "lines", autoSplit: true,
  onSplit(self) { return gsap.from(self.lines, { yPercent: 100, stagger: 0.08 }); } });  // returning tween -> auto-reverts/re-runs on resize
// split.revert() to restore original DOM. Fonts: await document.fonts.ready before splitting if not using autoSplit.

// Flip - animate between layout states
import { Flip } from "gsap/Flip";
const state = Flip.getState(".item");  /* change DOM/classes */  Flip.from(state, { duration: .6, ease: "power1.inOut", absolute: true, stagger: .05 });

// Draggable (+ InertiaPlugin for momentum)
Draggable.create(".box", { type: "x,y", bounds: "#container", inertia: true, onDrag() { console.log(this.x); } });

// Observer - unified wheel/touch/pointer intent detection
Observer.create({ target: window, type: "wheel,touch,pointer", onUp: () => prev(), onDown: () => next(), tolerance: 10, preventDefault: true });

// MotionPath - animate along an SVG path
gsap.to(".dot", { motionPath: { path: "#path", align: "#path", autoRotate: true, alignOrigin: [0.5, 0.5] }, duration: 5 });

// DrawSVG - stroke draw-on
gsap.from("#path", { drawSVG: 0, duration: 2 });         // also "20% 80%", "0% 100%"

// MorphSVG - shape morph
gsap.to("#from", { morphSVG: "#to", duration: 1 });      // morphSVG: { shape: "#to", shapeIndex: "auto" }

// ScrollToPlugin
gsap.to(window, { scrollTo: { y: "#section", offsetY: 70 }, duration: 1 });

// TextPlugin / ScrambleTextPlugin
gsap.to(".t", { text: "New text", duration: 2 });
gsap.to(".t", { scrambleText: { text: "Hello", chars: "upperAndLowerCase", speed: .5 }, duration: 1.5 });

// CustomEase
CustomEase.create("hop", "M0,0 C0.2,0 0.2,1 1,1");  gsap.to(".x", { x: 100, ease: "hop" });

// ScrollSmoother (needs ScrollTrigger; DOM: #smooth-wrapper > #smooth-content)
ScrollSmoother.create({ wrapper: "#smooth-wrapper", content: "#smooth-content", smooth: 1.2, effects: true });
// then <img data-speed="0.8"> / data-lag="0.5" for parallax. Don't combine with Lenis.

// GSDevTools - dev scrubber UI:  GSDevTools.create({ animation: tl })  (remove for prod)
```
Types for TypeScript ship in the package (`gsap/types`). Docs per plugin: https://gsap.com/docs/v3/Plugins
