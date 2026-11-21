import { useEffect, useRef, useState } from 'react';
import { STORE } from '../config';
import { PRODUCTS, imagesFor, productById, whatsappLink, type Product as P } from '../data/products';
import { gsap, prefersReducedMotion, useReveal } from '../lib/motion';
import { useLang } from '../i18n';
import { Link } from '../router';
import { ProductCard } from '../components/ProductCard';
import { Arrow, AvailabilityTag, BuyButton, Price, swatchBg } from '../components/ui';
import NotFound from './NotFound';

export default function Product({ id, onQuickView }: { id: string; onQuickView: (p: P, c: number) => void }) {
  const p = productById(id);
  const { t, pick, specs } = useLang();
  const root = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLDivElement>(null);
  const [colour, setColour] = useState(0);
  const [size, setSize] = useState('');
  useReveal(root, [id]);
  useEffect(() => { setColour(0); setSize(''); }, [id]);
  useEffect(() => { if (p) document.title = `${pick(p.name)} | GOLFWEAR`; }, [p, pick]);

  const choose = (i: number) => {
    if (i === colour) return;
    if (main.current && !prefersReducedMotion()) gsap.fromTo(main.current, { opacity: 0.4 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
    setColour(i);
  };

  if (!p) return <NotFound />;
  const c = p.colors[colour];
  const related = PRODUCTS.filter((x) => x.id !== p.id && x.category === p.category).concat(PRODUCTS.filter((x) => x.id !== p.id && x.category !== p.category)).slice(0, 4);
  const wa = whatsappLink(t('askText', { product: pick(p.name), colour: pick(c.name), size: size || '-' }));

  return (
    <div ref={root} className="bg-ivory">
      <div className="wrap pb-24 pt-[128px]">
        <nav aria-label="Breadcrumb" className="small flex flex-wrap gap-2 text-stone">
          <Link to="/shop" className="link-line">{t('navShop')}</Link><span aria-hidden>/</span>
          <span>{t(`cat.${p.category}`)}</span><span aria-hidden>/</span>
          <span className="text-charcoal" aria-current="page">{pick(p.name)}</span>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Gallery: the chosen colour large, every colour as a thumbnail */}
          <div className="lg:col-span-7">
            <div ref={main} className="relative aspect-[4/5] overflow-hidden bg-linen" data-reveal="image">
              <img src={imagesFor(p, c)[0]} alt={`${pick(p.name)}, ${pick(c.name)}`} width={900} height={1125} className="h-full w-full object-cover" />
              {p.isNew && <span className="absolute left-4 top-4 rounded-full bg-ivory px-3 py-1 text-[0.78rem] font-medium text-pine">{t('newBadge')}</span>}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {p.colors.map((col, i) => (
                <button key={col.key} type="button" onClick={() => choose(i)} aria-label={t('colourOf', { name: pick(col.name) })} aria-pressed={i === colour}
                  className={`aspect-[4/5] overflow-hidden bg-linen ring-1 ring-offset-2 ring-offset-ivory transition ${i === colour ? 'ring-charcoal' : 'ring-transparent hover:ring-hair'}`}>
                  <img src={imagesFor(p, col)[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <p className="text-[0.78rem] font-medium tracking-[0.2em] text-stone">{p.brand}</p>
              <h1 className="display mt-3 !text-[clamp(2.3rem,1.5rem+2.6vw,3.8rem)] text-pine">{pick(p.name)}</h1>
              <Price product={p} className="mt-4 text-[1.3rem]" />
              <AvailabilityTag value={p.availability} className="mt-2 text-stone" />
              {p.sample && <p className="small mt-4 border-l-2 border-champagne pl-3 text-stone">{t('sampleNotice')}</p>}
              <p className="lede mt-6 text-stone">{pick(p.blurb)}</p>

              <fieldset className="mt-8">
                <legend className="text-[0.95rem]">{t('colour')}: <span className="text-stone">{pick(c.name)}</span></legend>
                <div className="mt-3 flex gap-1.5">
                  {p.colors.map((col, i) => (
                    <button key={col.key} type="button" onClick={() => choose(i)} aria-pressed={i === colour} aria-label={pick(col.name)}
                      className={`flex h-11 w-11 items-center justify-center rounded-full ring-1 ${i === colour ? 'ring-charcoal' : 'ring-hair hover:ring-stone'}`}>
                      <span className="h-7 w-7 rounded-full ring-1 ring-black/15" style={{ background: swatchBg(col, 4) }} />
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="mt-6">
                <legend className="text-[0.95rem]">{t('size')}</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.sizes.map((s) => <button key={s} type="button" className="chip min-w-[52px] justify-center" aria-pressed={size === s} onClick={() => setSize(size === s ? '' : s)}>{s}</button>)}
                </div>
                <p className="small mt-2 text-stone">{t('sizeNote')}</p>
              </fieldset>

              <BuyButton product={p} className="mt-8" />
              {wa && <a href={wa} target="_blank" rel="noopener" className="btn btn-ghost mt-3 w-full">{t('ask')}</a>}

              <div className="mt-10 border-t border-hair pt-6">
                <p className="text-[0.95rem] font-medium">{t('specCard')}</p>
                {/* Spec card laid out like a golf scorecard */}
                <dl className="mt-3 grid grid-cols-[minmax(7rem,auto)_1fr] overflow-hidden rounded-[2px] border border-forest/60 text-[0.95rem]">
                  {specs(p.specs).map(([k, v], i) => (
                    <div key={k} className="contents">
                      <dt className={`bg-forest/[0.06] px-4 py-2.5 text-stone ${i ? 'border-t border-forest/20' : ''}`}>{k}</dt>
                      <dd className={`border-l border-forest/20 px-4 py-2.5 ${i ? 'border-t' : ''}`}>{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="small mt-6 text-stone">{t('a1')} <Link to="/about#order" className="link-line text-charcoal">{t('helpTitle')}</Link></p>
                <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" className="link-line small mt-3 inline-flex items-center gap-2">{t('supportChat')} <Arrow /></a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="border-t border-hair">
        <div className="wrap py-20">
          <h2 className="h2 text-pine" data-reveal="text">{t('related')}</h2>
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4" data-reveal="stagger">
            {related.map((r) => <ProductCard key={r.id} product={r} onQuickView={onQuickView} />)}
          </div>
        </div>
      </section>
    </div>
  );
}
