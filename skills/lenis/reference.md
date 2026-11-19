# Lenis settings reference (v1.3.x)

| Option | Type | Default | Notes |
|---|---|---|---|
| wrapper | HTMLElement/Window | window | scroll container |
| content | HTMLElement | document.documentElement | usually wrapper's direct child |
| eventsTarget | HTMLElement/Window | wrapper | listens wheel/touch |
| lerp | number | 0.1 | 0-1; when set, `duration`/`easing` are ignored |
| duration | number | 1.2 | seconds |
| easing | fn | t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) | |
| orientation | 'vertical'/'horizontal' | vertical | |
| gestureOrientation | 'vertical'/'horizontal'/'both' | vertical | |
| smoothWheel | boolean | true | |
| syncTouch | boolean | false | mimic touch inertia; unstable iOS<16 |
| syncTouchLerp | number | 0.075 | |
| touchInertiaExponent | number | 1.7 | |
| touchMultiplier / wheelMultiplier | number | 1 | |
| infinite | boolean | false | needs `syncTouch: true` on touch |
| anchors | boolean/ScrollToOptions | false | smooth anchor links |
| autoRaf | boolean | false | built-in rAF loop |
| autoResize | boolean | true | ResizeObserver; else call `.resize()` |
| autoToggle | boolean | false | start/stop from wrapper `overflow`; needs lenis.css; Safari>17.3, Chrome>116, FF>128 |
| allowNestedScroll | boolean | false | perf cost: DOM check per event |
| prevent | (node)=>boolean | undefined | true => don't smooth |
| virtualScroll | (e)=>boolean/void | undefined | mutate events; `false` => don't smooth, e.g. `({event}) => !event.shiftKey` |
| overscroll | boolean | true | like overscroll-behavior |
| naiveDimensions | boolean | false | perf impact |
| stopInertiaOnNavigate | boolean | false | stop inertia on internal link click |
| respectReducedMotion | boolean | true | keep true |

Events: `scroll` (Lenis instance), `virtual-scroll` ({deltaX, deltaY, event}).
Methods: destroy, on, raf(ms), resize, scrollTo, start, stop.
Props: actualScroll, animatedScroll, className, dimensions, direction, isHorizontal, isScrolling, isStopped, lastVelocity, limit, options, prefersReducedMotion, progress, rootElement, scroll, targetScroll, time, velocity.

## Recommended CSS (lenis.css)
```css
html.lenis, html.lenis body { height: auto; }
.lenis:not(.lenis-autoToggle).lenis-stopped { overflow: clip; }
.lenis [data-lenis-prevent], .lenis [data-lenis-prevent-wheel], .lenis [data-lenis-prevent-touch],
.lenis [data-lenis-prevent-vertical], .lenis [data-lenis-prevent-horizontal] { overscroll-behavior: contain; }
.lenis.lenis-smooth iframe { pointer-events: none; }
.lenis.lenis-autoToggle { transition-property: overflow; transition-duration: 1ms; transition-behavior: allow-discrete; }
```

## Snap options
type (`proximity` default | `mandatory` | `lock`), distanceThreshold ('50%'), debounce (500), onSnapStart, onSnapComplete, lerp, easing, duration.
Methods: add, addElement, addElements, next, previous, goTo, start, stop, resize.
