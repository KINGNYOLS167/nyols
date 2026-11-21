import { useEffect, useRef, useState } from 'react';
import { ANNOUNCEMENTS, STORE } from '../config';
import { LIVE_COLLECTIONS, countIn } from '../data/collections';
import { PRODUCTS } from '../data/products';
import { gsap, prefersReducedMotion, useLenis } from '../lib/motion';
import { useLang, type Key } from '../i18n';
import { Link, navigate, useLocation } from '../router';
import { Logo } from './Logo';
import { Arrow, BagIcon, CloseIcon, Photo, SearchIcon } from './ui';

function AnnouncementBar() {
  const { pick } = useLang();
  const [i, setI] = useState(0);
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (ANNOUNCEMENTS.length < 2) return;
    const id = window.setInterval(() => {
      if (prefersReducedMotion() || !ref.current) { setI((n) => (n + 1) % ANNOUNCEMENTS.length); return; }
      gsap.to(ref.current, { yPercent: -60, autoAlpha: 0, duration: 0.45, ease: 'power2.in', onComplete: () => {
        setI((n) => (n + 1) % ANNOUNCEMENTS.length);
        gsap.fromTo(ref.current, { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' });
      } });
    }, 5200);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="flex h-9 items-center justify-center overflow-hidden bg-pine px-4 text-center text-[0.8rem] tracking-[0.02em] text-ivory/85" aria-live="polite">
      <p ref={ref} className="truncate">{pick(ANNOUNCEMENTS[i])}</p>
    </div>
  );
}

function LangToggle({ dark }: { dark: boolean }) {
  const { lang, setLang, t } = useLang();
  return (
    <div role="group" aria-label={t('langLabel')} className={`flex rounded-full p-0.5 text-[0.78rem] font-medium ring-1 ${dark ? 'ring-ivory/30' : 'ring-hair'}`}>
      {(['id', 'en'] as const).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
          className={`min-h-[32px] min-w-[36px] rounded-full px-2 transition-colors ${lang === l ? (dark ? 'bg-ivory text-pine' : 'bg-forest text-ivory') : dark ? 'text-ivory/70 hover:text-ivory' : 'text-stone hover:text-charcoal'}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

const NAV: [string, Key][] = [['/', 'navHome'], ['/shop', 'navShop'], ['/collections', 'navCollections'], ['/about', 'navAbout']];

export function Header({ onSearch }: { onSearch: () => void }) {
  const { t, pick } = useLang();
  const { path } = useLocation();
  const lenis = useLenis();
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const closeTimer = useRef<number>(0);
  // Mouse: hovering opens the menu, clicking goes to the shop. Keyboard and touch: clicking toggles it.
  const lastPointer = useRef('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { setMega(false); setMobile(false); }, [path]);
  useEffect(() => {
    if (mobile) lenis?.stop(); else lenis?.start();
    document.documentElement.style.overflow = mobile ? 'hidden' : '';
  }, [mobile, lenis]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMega(false); setMobile(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const overHero = path === '/' && !scrolled && !mega && !mobile;
  const dark = overHero || mobile;
  const openMega = () => { window.clearTimeout(closeTimer.current); setMega(true); };
  const closeMega = () => { closeTimer.current = window.setTimeout(() => setMega(false), 160); };
  const isCurrent = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-transform duration-500 ease-[var(--ease-quint)] ${scrolled && !mobile ? '-translate-y-9' : ''}`}>
      <AnnouncementBar />
      <div className={`transition-[background-color,color,box-shadow] duration-500 ${dark ? (mobile ? 'bg-pine text-ivory' : 'text-ivory') : 'bg-ivory/95 text-charcoal shadow-[0_1px_0_var(--color-hair)] backdrop-blur-md'}`} onPointerLeave={closeMega}>
        <div className="wrap flex h-[72px] items-center gap-6">
          <Link to="/" aria-label="GOLFWEAR home" className="shrink-0"><Logo tone={dark ? 'dark' : 'light'} className="h-[26px] w-auto sm:h-[29px]" /></Link>
          <nav aria-label="Main" className="ml-10 hidden items-center gap-8 text-[0.95rem] lg:flex">
            {NAV.map(([href, key]) =>
              href === '/shop' ? (
                <button key={href} type="button" aria-expanded={mega} aria-controls="mega" onPointerEnter={openMega} onFocus={openMega}
                  onPointerDown={(e) => { lastPointer.current = e.pointerType; }}
                  onClick={() => { if (lastPointer.current === 'mouse') navigate('/shop'); else setMega((m) => !m); lastPointer.current = ''; }}
                  className="link-line flex items-center gap-1.5" aria-current={isCurrent(href) ? 'page' : undefined}>
                  {t(key)}
                  <svg viewBox="0 0 10 6" className={`h-1.5 w-2.5 transition-transform ${mega ? 'rotate-180' : ''}`} aria-hidden><path d="m1 1 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
                </button>
              ) : (
                <Link key={href} to={href} className="link-line" aria-current={isCurrent(href) ? 'page' : undefined} onPointerEnter={closeMega}>{t(key)}</Link>
              ),
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button type="button" onClick={onSearch} aria-label={t('search')} className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-current/10"><SearchIcon /></button>
            <div className="hidden sm:block"><LangToggle dark={dark} /></div>
            <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" data-cursor="buy" aria-label={t('bag')}
              className={`flex h-11 items-center gap-2 rounded-full px-3 text-[0.9rem] font-medium transition-colors sm:px-4 ${dark ? 'bg-ivory/10 hover:bg-ivory/20' : 'bg-forest text-ivory hover:bg-pine'}`}>
              <BagIcon /><span className="hidden md:inline">Tokopedia</span>
            </a>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full lg:hidden" aria-expanded={mobile} aria-controls="mobile-menu" aria-label={t('menu')} onClick={() => setMobile((m) => !m)}>
              {mobile ? <CloseIcon className="h-5 w-5" /> : <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden><path d="M2 7h16M2 13h16" stroke="currentColor" strokeWidth="1.5" /></svg>}
            </button>
          </div>
        </div>

        {/* Mega menu */}
        <div id="mega" hidden={!mega} onPointerEnter={openMega} className="hidden border-t border-hair bg-ivory text-charcoal lg:block">
          <div className="wrap grid grid-cols-12 gap-10 py-10">
            <div className="col-span-4">
              <p className="small text-stone">{t('megaCategories')}</p>
              <ul className="mt-4 space-y-1">
                <li><Link to="/shop" className="group flex items-baseline justify-between py-1.5 text-[1.4rem] font-light"><span className="link-line">{t('megaAll')}</span><span className="small text-stone tnum">{PRODUCTS.length}</span></Link></li>
                {LIVE_COLLECTIONS.map((c) => (
                  <li key={c.slug}><Link to={`/collections/${c.slug}`} className="flex items-baseline justify-between py-1.5 text-[1.4rem] font-light"><span className="link-line">{pick(c.name)}</span><span className="small text-stone tnum">{countIn(c)}</span></Link></li>
                ))}
              </ul>
            </div>
            <Link to="/collections/arm-sleeves" className="group col-span-4 col-start-6 block">
              <div className="aspect-[4/3] overflow-hidden bg-linen"><Photo name="aerial-course" alt="" sizes="30vw" className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-quint)] group-hover:scale-105" /></div>
              <p className="mt-3 flex items-center gap-2">{pick(LIVE_COLLECTIONS.find((c) => c.slug === 'arm-sleeves')?.name ?? { id: '', en: '' })} <Arrow /></p>
            </Link>
            <Link to="/shop" className="group col-span-3 block">
              <div className="aspect-[3/4] overflow-hidden bg-linen"><Photo name="striped-green" alt="" sizes="22vw" className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-quint)] group-hover:scale-105" /></div>
              <p className="mt-3">{t('megaFeatureTitle')}</p>
              <p className="small text-stone">{t('megaFeatureBody')}</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobile && (
        <nav id="mobile-menu" aria-label="Main" className="grain h-[calc(100svh-72px)] overflow-y-auto bg-pine px-5 pb-10 text-ivory lg:hidden" data-lenis-prevent>
          <ul className="border-b border-ivory/10 pb-6 pt-4">
            {NAV.map(([href, key]) => (
              <li key={href}><Link to={href} className="block py-2 text-[2.2rem] font-light leading-tight" aria-current={isCurrent(href) ? 'page' : undefined}>{t(key)}</Link></li>
            ))}
          </ul>
          <p className="small mt-6 text-mist">{t('megaCategories')}</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-4">
            {LIVE_COLLECTIONS.map((c) => (
              <li key={c.slug}><Link to={`/collections/${c.slug}`} className="block py-2.5 text-[1.05rem]">{pick(c.name)}</Link></li>
            ))}
          </ul>
          <div className="mt-8 flex items-center justify-between gap-4">
            <LangToggle dark />
            <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" className="btn btn-light !min-h-[48px]">{t('storeShort')}</a>
          </div>
        </nav>
      )}
    </header>
  );
}
