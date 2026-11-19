import paths from '../brand/paths.json';

const C = paths.colors;
const W = paths.wordmark;
// Horizontal lockup, same proportions as the brand kit: wordmark cap height = 42% of the mark, 30-unit gap.
const CAP = 42;
const K = CAP / W.capHeight;
const WORD_X = 130 - W.box.x1 * K;
const WIDTH = 130 + (W.box.x2 - W.box.x1) * K;

type Tone = 'light' | 'dark';
const colours = (tone: Tone) =>
  tone === 'dark' ? { g: C.ivory, flag: C.brass, text: C.ivory } : { g: C.green, flag: C.brass, text: C.green };

/** The G mark. `flutter` makes the flag wave on hover (used once, in the story section). */
export function Mark({ tone = 'light', className, flutter = false, title }: { tone?: Tone; className?: string; flutter?: boolean; title?: string }) {
  const c = colours(tone);
  return (
    <svg viewBox="-1 -1 103 102" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path d={paths.mark.g} fill={c.g} />
      <path d={paths.mark.flag} fill={c.flag} className={flutter ? 'flag-flutter' : undefined} />
    </svg>
  );
}

/** Mark + wordmark. */
export function Logo({ tone = 'light', className }: { tone?: Tone; className?: string }) {
  const c = colours(tone);
  return (
    <svg viewBox={`-1 -1 ${WIDTH + 2} 102`} className={className} role="img">
      <title>GOLFWEAR</title>
      <path d={paths.mark.g} fill={c.g} />
      <path d={paths.mark.flag} fill={c.flag} />
      <path transform={`translate(${WORD_X.toFixed(2)} ${50 + CAP / 2}) scale(${K.toFixed(4)})`} d={W.d} fill={c.text} />
    </svg>
  );
}

/** The chosen tagline, set as in the brand kit banner. */
export function Tagline({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-center gap-4 text-[0.8rem] font-medium tracking-[0.32em] text-brass ${className}`}>
      <span aria-hidden className="h-px w-9 bg-brass/70" />
      <span>GOLF APPAREL · JAKARTA</span>
    </p>
  );
}
