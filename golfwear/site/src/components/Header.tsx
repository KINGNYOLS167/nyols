import { useEffect, useState } from 'react';
import { Logo } from './Logo';
import { useLang, type Key } from '../i18n';
import { STORE } from '../config';
import { HAS_SAMPLES } from '../data/products';

const LINKS: [string, Key][] = [['#best', 'navBest'], ['#shop', 'navShop'], ['#story', 'navStory'], ['#order', 'navOrder']];

function LangToggle() {
  const { lang, setLang, t } = useLang();
  return (
    <div role="group" aria-label={t('langLabel')} className="flex rounded-full border border-ivory/25 p-0.5 text-[0.8rem] font-medium">
      {(['id', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={`min-h-[34px] min-w-[38px] rounded-full px-2.5 transition-colors ${lang === l ? 'bg-ivory text-fairway' : 'text-ivory/75 hover:text-ivory'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300 ${scrolled || open ? 'bg-fairway/95 shadow-[0_1px_0_rgb(244_239_228/0.08)] backdrop-blur-md' : ''}`}>
      {HAS_SAMPLES && (
        <p className="bg-brass px-4 py-1.5 text-center text-[0.8rem] leading-snug text-fairway">
          <span className="sm:hidden">{t('previewShort')}</span>
          <span className="hidden sm:inline">{t('preview')}</span>
        </p>
      )}
      <div className="wrap flex h-[68px] items-center gap-5">
        <a href="#top" className="shrink-0" aria-label="GOLFWEAR">
          <Logo tone="dark" className="h-[26px] w-auto sm:h-[30px]" />
        </a>
        <nav aria-label="Main" className="ml-auto hidden items-center gap-7 text-[0.95rem] text-ivory/80 lg:flex">
          {LINKS.map(([href, key]) => (
            <a key={href} href={href} className="transition-colors hover:text-ivory">{t(key)}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 lg:ml-4">
          <LangToggle />
          <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" data-cursor="buy" className="btn btn-brass hidden !min-h-[42px] !px-5 !text-[0.92rem] sm:inline-flex">
            {t('storeShort')}
          </a>
          <button
            type="button"
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-ivory/25 text-ivory lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={t('menu')}
            onClick={() => setOpen((o) => !o)}
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
              {open ? <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.6" /> : <path d="M3 7h14M3 13h14" stroke="currentColor" strokeWidth="1.6" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="wrap flex flex-col pb-6 lg:hidden">
          {LINKS.map(([href, key]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="border-t border-ivory/10 py-4 text-lg text-ivory">{t(key)}</a>
          ))}
          <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" className="btn btn-brass mt-4">{t('storeShort')}</a>
        </nav>
      )}
    </header>
  );
}
