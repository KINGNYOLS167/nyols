import { useEffect, useRef, useState } from 'react';
import { imageFor, type Product } from '../data/products';
import { useLenis } from '../lib/motion';
import { useLang } from '../i18n';
import { Link } from '../router';
import { Arrow, AvailabilityTag, BuyButton, CloseIcon, Price, swatchBg } from './ui';

export interface QuickViewState { product: Product; colour: number }

/** Quick details in a native <dialog> (focus trapped, Esc closes, page scroll paused). */
export function QuickView({ state, onClose }: { state: QuickViewState | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const lenis = useLenis();
  const [shown, setShown] = useState<QuickViewState | null>(state);
  const [colour, setColour] = useState(0);

  useEffect(() => {
    const dialog = ref.current!;
    if (state) {
      setShown(state);
      setColour(state.colour);
      if (!dialog.open) dialog.showModal();
      lenis?.stop();
    } else if (dialog.open) dialog.close();
  }, [state, lenis]);

  return (
    <dialog
      ref={ref}
      className="sheet m-auto max-h-[calc(100svh-24px)] w-[min(980px,calc(100vw-24px))] overflow-y-auto overscroll-contain rounded-[4px] bg-ivory p-0 text-charcoal max-sm:mb-0 max-sm:max-h-[92svh] max-sm:w-full max-sm:max-w-full max-sm:rounded-b-none"
      data-lenis-prevent
      onClose={() => { lenis?.start(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) ref.current?.close(); }}
      aria-labelledby="qv-title"
    >
      {shown && <Body p={shown.product} colour={colour} setColour={setColour} close={() => ref.current?.close()} />}
    </dialog>
  );
}

function Body({ p, colour, setColour, close }: { p: Product; colour: number; setColour: (i: number) => void; close: () => void }) {
  const { t, pick } = useLang();
  const c = p.colors[Math.min(colour, p.colors.length - 1)];
  return (
    <div className="relative grid md:grid-cols-[1fr_1fr]">
      <button type="button" onClick={close} aria-label={t('close')} className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-ivory/95 ring-1 ring-hair hover:ring-charcoal">
        <CloseIcon />
      </button>
      <div className="relative aspect-square bg-linen sm:aspect-[4/5]">
        {p.colors.map((col, i) => (
          <img key={col.key} src={imageFor(p, col)} alt={i === colour ? `${pick(p.name)}, ${pick(col.name)}` : ''} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${i === colour ? 'opacity-100' : 'opacity-0'}`} />
        ))}
      </div>
      <div className="flex flex-col p-6 sm:p-9">
        <p className="text-[0.75rem] font-medium tracking-[0.18em] text-stone">{p.brand}</p>
        <h2 id="qv-title" className="h3 mt-2 pr-10 text-pine">{pick(p.name)}</h2>
        <Price product={p} className="mt-2 text-[1.1rem]" />
        <AvailabilityTag value={p.availability} className="small mt-2 text-stone" />
        <p className="mt-5 text-stone">{pick(p.blurb)}</p>
        <p className="mt-6 text-[0.92rem]">{t('colour')}: <span className="text-stone">{pick(c.name)}</span></p>
        <div className="mt-2 flex gap-1.5">
          {p.colors.map((col, i) => (
            <button key={col.key} type="button" onClick={() => setColour(i)} aria-pressed={i === colour} aria-label={pick(col.name)}
              className={`flex h-10 w-10 items-center justify-center rounded-full ring-1 ${i === colour ? 'ring-charcoal' : 'ring-hair hover:ring-stone'}`}>
              <span className="h-6 w-6 rounded-full ring-1 ring-black/15" style={{ background: swatchBg(col, 4) }} />
            </button>
          ))}
        </div>
        <p className="mt-5 text-[0.92rem]">{t('size')}: <span className="text-stone">{p.sizes.join(' · ')}</span></p>
        <BuyButton product={p} className="mt-auto pt-8" />
        <Link to={`/product/${p.id}`} onClick={close} className="link-line mt-5 inline-flex w-max items-center gap-2 text-[0.95rem]">{t('viewProduct')} <Arrow /></Link>
      </div>
    </div>
  );
}
