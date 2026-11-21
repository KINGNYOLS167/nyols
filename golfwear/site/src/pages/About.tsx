import { useRef } from 'react';
import { STORE } from '../config';
import credits from '../../public/photos/credits.json';
import { useReveal } from '../lib/motion';
import { useLang, type Key } from '../i18n';
import { BrandMoment } from '../components/BrandMoment';
import { Arrow, FlagIcon, Photo } from '../components/ui';

export default function About() {
  const { t, num, lang } = useLang();
  const root = useRef<HTMLDivElement>(null);
  useReveal(root, [lang]);
  const steps: Key[] = ['order1', 'order2', 'order3'];
  const faq: [Key, Key][] = [['q1', 'a1'], ['q2', 'a2'], ['q3', 'a3'], ['q4', 'a4']];
  return (
    <div ref={root} className="bg-ivory">
      <section className="wrap grid gap-12 pb-24 pt-[160px] lg:grid-cols-12">
        <div className="lg:col-span-6">
          <h1 className="display text-pine" data-reveal="text">{t('aboutTitle')}</h1>
          <p className="lede mt-8 max-w-[46ch] text-stone" data-reveal="fade">{t('about1')}</p>
          <p className="mt-5 max-w-[50ch] text-stone" data-reveal="fade">{t('about2')}</p>
          <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" data-cursor="buy" className="btn btn-forest mt-10"><FlagIcon /> {t('heroStore')}</a>
          <p className="small mt-4 text-stone">{t('trust', { rating: num(STORE.stats.rating), reviews: num(STORE.stats.reviews), sold: num(STORE.stats.sold) })}</p>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <div data-reveal="image" className="relative aspect-[3/4] overflow-hidden">
            <div data-parallax="0.1" className="absolute -inset-y-[6%] inset-x-0"><Photo name="forest-flag" alt="" sizes="(min-width: 1024px) 40vw, 100vw" className="h-full w-full object-cover" /></div>
          </div>
        </div>
      </section>

      <BrandMoment withLink={false} />

      <section id="order" className="wrap scroll-mt-28 py-24">
        <h2 className="h2 text-pine" data-reveal="text">{t('helpTitle')}</h2>
        <ol className="mt-12 grid gap-px overflow-hidden border border-hair bg-hair md:grid-cols-3" data-reveal="stagger">
          {steps.map((k, i) => (
            <li key={k} className="bg-ivory p-8 lg:p-10">
              <span className="text-[2.6rem] font-light leading-none text-champagne tnum">{i + 1}</span>
              <p className="mt-6 max-w-[30ch] text-[1.08rem]">{t(k)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="faq" className="wrap grid scroll-mt-28 gap-10 border-t border-hair pb-24 pt-20 lg:grid-cols-12">
        <h2 className="h2 text-pine lg:col-span-4" data-reveal="text">{t('faqTitle')}</h2>
        <div className="lg:col-span-8">
          {faq.map(([q, a]) => (
            <details key={q} className="group border-b border-hair">
              <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-6 py-4 text-[1.12rem]">
                {t(q)}
                <span aria-hidden className="relative h-4 w-4 shrink-0">
                  <span className="absolute left-0 top-1/2 h-px w-4 bg-charcoal" />
                  <span className="absolute left-1/2 top-0 h-4 w-px bg-charcoal transition-transform duration-300 group-open:scale-y-0" />
                </span>
              </summary>
              <p className="max-w-[60ch] pb-6 text-stone">{t(a)}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="credits" className="wrap scroll-mt-28 border-t border-hair pb-24 pt-14">
        <h2 className="h3 text-pine">{t('creditsTitle')}</h2>
        <p className="mt-2 text-stone">{t('creditsBody')}</p>
        <ul className="small mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {credits.map((c) => <li key={c.file}><a href={c.source} target="_blank" rel="noopener" className="link-line inline-flex items-center gap-1.5">{c.file.replace(/-/g, ' ')} <Arrow className="h-3 w-3" /></a></li>)}
        </ul>
      </section>
    </div>
  );
}
