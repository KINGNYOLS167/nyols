import { useState } from 'react';
import { PRODUCTS, formatPrice, imageFor, type Product } from '../data/products';
import { useLang } from '../i18n';

/** Best sellers set as a tournament leaderboard: position, product, colours, price. */
export function Leaderboard({ onOpen }: { onOpen: (p: Product) => void }) {
  const { t, pick } = useLang();
  const top = PRODUCTS.slice(0, 5);
  const [active, setActive] = useState(0);
  const current = top[active];

  return (
    <section id="best" className="bg-fairway text-ivory">
      <div className="wrap py-20 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="h2">{t('boardTitle')}</h2>
            <p className="mt-3 max-w-[48ch] text-moss">{t('boardSub')}</p>

            <table className="mt-10 w-full border-collapse text-left">
              <thead>
                <tr className="text-[0.85rem] text-moss">
                  <th scope="col" className="w-14 pb-3 font-normal">{t('boardPos')}</th>
                  <th scope="col" className="pb-3 font-normal">{t('boardProduct')}</th>
                  <th scope="col" className="hidden pb-3 font-normal sm:table-cell">{t('boardColours')}</th>
                  <th scope="col" className="pb-3 text-right font-normal">{t('boardPrice')}</th>
                </tr>
              </thead>
              <tbody>
                {top.map((p, i) => (
                  <tr
                    key={p.id}
                    onPointerEnter={() => setActive(i)}
                    onClick={() => onOpen(p)}
                    className={`group cursor-pointer border-t border-ivory/12 transition-colors ${i === active ? 'bg-stripe' : 'hover:bg-stripe/60'}`}
                  >
                    <td className="py-5 pl-3 align-middle text-[1.6rem] font-medium leading-none text-brass tnum sm:pl-4">{p.rank}</td>
                    <td className="py-5 align-middle">
                      <div className="flex items-center gap-4">
                        <img src={imageFor(p)} alt="" width={56} height={70} loading="lazy" className="h-[70px] w-14 shrink-0 rounded-[3px] bg-sand object-cover lg:hidden" />
                        <button
                          type="button"
                          data-cursor="view"
                          onFocus={() => setActive(i)}
                          onClick={(e) => { e.stopPropagation(); onOpen(p); }}
                          className="text-left text-[1.08rem] leading-snug sm:text-[1.22rem]"
                        >
                          {pick(p.name)}
                        </button>
                      </div>
                    </td>
                    <td className="hidden py-5 align-middle sm:table-cell">
                      <span className="flex gap-1.5" aria-label={p.colors.map((c) => pick(c.name)).join(', ')}>
                        {p.colors.map((c) => (
                          <span key={c.key} className="h-3.5 w-3.5 rounded-full ring-1 ring-ivory/30" style={{ background: c.hex }} />
                        ))}
                      </span>
                    </td>
                    <td className="py-5 pr-3 text-right align-middle text-[1.02rem] tnum sm:pr-4">{formatPrice(p.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside aria-hidden className="hidden lg:col-span-5 lg:block">
            <div className="sticky top-28">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-sand">
                {top.map((p, i) => (
                  <img
                    key={p.id}
                    src={imageFor(p)}
                    alt=""
                    loading="lazy"
                    className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-[var(--ease-quint)] ${i === active ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0'}`}
                  />
                ))}
                <span className="absolute left-5 top-4 text-[4.5rem] font-light leading-none text-fairway/85 tnum">{current.rank}</span>
              </div>
              <div className="mt-5 flex items-baseline justify-between gap-6">
                <p className="text-[1.15rem]">{pick(current.name)}</p>
                <p className="text-moss tnum">{formatPrice(current.price)}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
