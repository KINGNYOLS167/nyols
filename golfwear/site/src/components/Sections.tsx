import { STORE } from '../config';
import { useLang, type Key } from '../i18n';
import { Logo, Mark, Tagline } from './Logo';
import { Magnetic } from './Magnetic';

export function Story() {
  const { t } = useLang();
  return (
    <section id="story" className="mow text-ivory">
      <div className="wrap grid items-center gap-14 py-24 md:grid-cols-12 lg:py-32">
        <div className="mark-hover md:col-span-5">
          <Mark tone="dark" flutter className="mx-auto w-[min(62vw,340px)] md:mx-0" title="GOLFWEAR" />
        </div>
        <div className="md:col-span-6 md:col-start-7">
          <h2 className="h2">{t('storyTitle')}</h2>
          <p className="lede mt-6 max-w-[46ch] text-ivory/85">{t('story1')}</p>
          <p className="mt-4 max-w-[52ch] text-moss">{t('story2')}</p>
        </div>
      </div>
    </section>
  );
}

export function HowToOrder() {
  const { t } = useLang();
  const steps: Key[] = ['order1', 'order2', 'order3'];
  return (
    <section id="order" className="bg-ivory">
      <div className="wrap py-20 lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="h2 text-fairway">{t('orderTitle')}</h2>
          <Magnetic>
            <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" data-cursor="buy" className="btn btn-green">{t('heroStore')}</a>
          </Magnetic>
        </div>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-[4px] border border-line bg-line md:grid-cols-3">
          {steps.map((key, i) => (
            <li key={key} className="bg-chalk p-7 lg:p-9">
              <span className="text-[2.6rem] font-light leading-none text-brass tnum">{i + 1}</span>
              <p className="mt-6 max-w-[30ch] text-[1.08rem] leading-snug">{t(key)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Faq() {
  const { t } = useLang();
  const items: [Key, Key][] = [['q1', 'a1'], ['q2', 'a2'], ['q3', 'a3'], ['q4', 'a4']];
  return (
    <section id="faq" className="bg-ivory">
      <div className="wrap pb-24 lg:pb-32">
        <div className="grid gap-10 border-t border-line pt-20 lg:grid-cols-12">
        <h2 className="h2 text-fairway lg:col-span-4">{t('faqTitle')}</h2>
        <div className="lg:col-span-8">
          {items.map(([q, a]) => (
            <details key={q} className="group border-b border-line">
              <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-6 py-4 text-[1.12rem]">
                {t(q)}
                <span aria-hidden className="relative h-4 w-4 shrink-0">
                  <span className="absolute left-0 top-1/2 h-[1.5px] w-4 -translate-y-1/2 bg-fairway" />
                  <span className="absolute left-1/2 top-0 h-4 w-[1.5px] -translate-x-1/2 bg-fairway transition-transform duration-300 group-open:scale-y-0" />
                </span>
              </summary>
              <p className="max-w-[60ch] pb-6 text-stone">{t(a)}</p>
            </details>
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const { t } = useLang();
  const links = [
    { href: STORE.tokopediaUrl, label: t('storeShort') },
    STORE.whatsapp && { href: `https://wa.me/${STORE.whatsapp}`, label: 'WhatsApp' },
    STORE.instagram && { href: `https://instagram.com/${STORE.instagram}`, label: 'Instagram' },
  ].filter(Boolean) as { href: string; label: string }[];
  return (
    <footer className="bg-rough text-ivory">
      <div className="wrap flex flex-col gap-10 py-16 md:flex-row md:items-end md:justify-between">
        <div>
          <Logo tone="dark" className="h-9 w-auto" />
          <Tagline className="mt-5" />
          <p className="mt-6 text-moss">{t('footerNote')}</p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <ul className="flex flex-wrap gap-x-7 gap-y-2">
            {links.map((l) => (
              <li key={l.href}><a href={l.href} target="_blank" rel="noopener" className="underline-offset-4 hover:underline">{l.label}</a></li>
            ))}
          </ul>
          <p className="text-[0.9rem] text-moss">{STORE.location}</p>
          <p className="text-[0.85rem] text-moss/80">© {new Date().getFullYear()} {STORE.name}</p>
        </div>
      </div>
    </footer>
  );
}
