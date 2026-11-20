import { useEffect, useRef, useState } from 'react';
import { buyUrl, formatPrice, imageFor, whatsappLink, type Product } from '../data/products';
import { useLenis } from '../lib/motion';
import { useLang } from '../i18n';

export interface QuickViewState { product: Product; colour: number }

/** Product details in a native <dialog>: focus is trapped, Esc closes, the page behind stops scrolling. */
export function QuickView({ state, onClose }: { state: QuickViewState | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const lenis = useLenis();
  const [shown, setShown] = useState<QuickViewState | null>(state);
  const [colour, setColour] = useState(0);
  const [size, setSize] = useState('');

  useEffect(() => {
    const dialog = ref.current!;
    if (state) {
      setShown(state);
      setColour(state.colour);
      setSize('');
      if (!dialog.open) dialog.showModal();
      lenis?.stop();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [state, lenis]);

  const onDialogClose = () => { lenis?.start(); onClose(); };

  return (
    <dialog
      ref={ref}
      className="qv m-auto max-h-[calc(100svh-24px)] w-[min(1080px,calc(100vw-24px))] overflow-y-auto overscroll-contain rounded-[8px] bg-chalk p-0 text-ink max-sm:mb-0 max-sm:max-h-[94svh] max-sm:w-full max-sm:max-w-full max-sm:rounded-b-none"
      data-lenis-prevent
      onClose={onDialogClose}
      onClick={(e) => { if (e.target === e.currentTarget) ref.current?.close(); }}
      aria-labelledby="qv-title"
    >
      {shown && <Details state={shown} colour={colour} setColour={setColour} size={size} setSize={setSize} close={() => ref.current?.close()} />}
    </dialog>
  );
}

function Details({ state, colour, setColour, size, setSize, close }: {
  state: QuickViewState; colour: number; setColour: (i: number) => void; size: string; setSize: (s: string) => void; close: () => void;
}) {
  const { t, pick, specs } = useLang();
  const p = state.product;
  const c = p.colors[Math.min(colour, p.colors.length - 1)];
  const wa = whatsappLink(t('askText', { product: pick(p.name), colour: pick(c.name), size: size || '-' }));

  return (
    <div className="relative grid md:grid-cols-[1.08fr_1fr]">
      <button type="button" onClick={close} aria-label={t('close')} className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-chalk/95 hover:border-fairway">
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
      <div className="bg-sand p-3 md:p-4">
        <div className="relative aspect-square overflow-hidden rounded-[4px] sm:aspect-[4/5]">
          {p.colors.map((col, i) => (
            <img key={col.key} src={imageFor(p, col)} alt={i === colour ? `${pick(p.name)}, ${pick(col.name)}` : ''} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${i === colour ? 'opacity-100' : 'opacity-0'}`} />
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          {p.colors.map((col, i) => (
            <button key={col.key} type="button" onClick={() => setColour(i)} aria-label={t('colourOf', { name: pick(col.name) })} aria-pressed={i === colour}
              className={`w-12 overflow-hidden rounded-[3px] ring-2 transition sm:w-16 ${i === colour ? 'ring-fairway' : 'ring-transparent hover:ring-line'}`}>
              <img src={imageFor(p, col)} alt="" className="aspect-[4/5] w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col p-6 sm:p-8 lg:p-10">
        <h2 id="qv-title" className="pr-12 text-[1.75rem] font-normal leading-tight tracking-[-0.01em] text-fairway sm:text-[2rem]">{pick(p.name)}</h2>
        <p className="mt-2 text-[1.2rem] tnum">
          {formatPrice(p.price)}
          {p.category === 'sleeves' && <span className="ml-2 text-[0.9rem] text-stone">{t('pair')}</span>}
        </p>
        <p className="mt-4 max-w-[48ch] text-stone">{pick(p.blurb)}</p>

        <fieldset className="mt-7">
          <legend className="text-[0.95rem] font-medium">{t('colour')}: <span className="font-normal text-stone">{pick(c.name)}</span></legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.colors.map((col, i) => (
              <button key={col.key} type="button" onClick={() => setColour(i)} aria-pressed={i === colour} aria-label={pick(col.name)}
                className={`flex h-10 w-10 items-center justify-center rounded-full ring-1 transition ${i === colour ? 'ring-fairway' : 'ring-line hover:ring-stone'}`}>
                <span className="h-6 w-6 rounded-full ring-1 ring-black/15" style={{ background: col.stripe ? `repeating-linear-gradient(0deg, ${col.hex} 0 4px, ${col.stripe} 4px 7px)` : col.hex }} />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-[0.95rem] font-medium">{t('size')}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.sizes.map((s) => (
              <button key={s} type="button" className="chip min-w-[52px] justify-center" aria-pressed={size === s} onClick={() => setSize(size === s ? '' : s)}>{s}</button>
            ))}
          </div>
          <p className="mt-2 text-[0.88rem] text-stone">{t('sizeNote')}</p>
        </fieldset>

        {/* Spec card, laid out like a golf scorecard */}
        <div className="mt-7 overflow-hidden rounded-[3px] border border-fairway/70">
          <p className="bg-fairway px-4 py-2 text-[0.88rem] font-medium text-ivory">{t('specCard')}</p>
          <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] text-[0.95rem]">
            {specs(p.specs).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="border-t border-fairway/20 bg-sand/70 px-4 py-2.5 text-stone">{k}</dt>
                <dd className="border-l border-t border-fairway/20 px-4 py-2.5">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href={buyUrl(p)} target="_blank" rel="noopener" data-cursor="buy" className="btn btn-brass flex-1">
            <svg viewBox="0 0 12 14" className="h-4 w-3.5" aria-hidden><path d="M1 0v14" stroke="currentColor" strokeWidth="1.6" /><path d="M1.8 1 11 3.8 1.8 6.6z" fill="currentColor" /></svg>
            {t('buy')}
          </a>
          {wa && <a href={wa} target="_blank" rel="noopener" className="btn btn-green flex-1">{t('ask')}</a>}
        </div>
        <p className="mt-3 text-[0.88rem] text-stone">{t('payNote')}</p>
      </div>
    </div>
  );
}
