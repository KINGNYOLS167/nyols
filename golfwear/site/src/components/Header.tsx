import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { COLLECTIONS, inCollection, onSale, useCatalog, type CollectionSlug } from '../lib/catalog';
import { Link, useRouter } from '../lib/router';
import { gsap, prefersReducedMotion, useLenis } from '../lib/motion';
import { useLang, type Key } from '../i18n';
import { STORE } from '../config';
import { Logo } from './Logo';
import { CampaignPicture, COLLECTION_IMAGE, type CampaignName } from './Media';
import { SearchOverlay } from './SearchOverlay';

type Menu = 'shop' | 'brands' | 'collections';

// ---------- announcement bar ----------

function AnnouncementBar() {
  const { settings } = useCatalog();
  const { lang, t } = useLang();
  const items = settings.announcements.map((a) => ({ text: a[lang] || a.id, href: a.href }));
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const line = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (items.length < 2 || paused) return;
    const id = window.setInterval(() => {
      const el = line.current;
      if (!el || prefersReducedMotion()) { setI((n) => (n + 1) % items.length); return; }
      gsap.to(el, {
        yPercent: -100, autoAlpha: 0, duration: 0.45, ease: 'power2.in',
        onComplete: () => {
          setI((n) => (n + 1) % items.length);
          gsap.fromTo(el, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.6, ease: 'expo.out' });
        },
      });
    }, 5200);
    return () => window.clearInterval(id);
  }, [items.length, paused]);
  if (!items.length) return null;
  const current = items[i % items.length];
  const inner = <span ref={line} className="inline-block">{current.text}</span>;
  return (
    <div
      role="region"
      aria-label={t('announcements')}
      className="relative z-[2] flex h-9 items-center justify-center overflow-hidden bg-pine px-4 text-center text-[0.8rem] tracking-[0.01em] text-ivory/90"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <ul className="sr-only">{items.map((a) => <li key={a.text}>{a.text}</li>)}</ul>
      <p aria-hidden className="truncate">
        {current.href ? (
          current.href.startsWith('/') ? <Link to={current.href} tabIndex={-1} className="link-under">{inner}</Link>
            : <a href={current.href} target="_blank" rel="noopener" tabIndex={-1} className="link-under">{inner}</a>
        ) : inner}
      </p>
    </div>
  );
}

// ---------- language toggle ----------

export function LangToggle({ tone }: { tone: 'light' | 'dark' }) {
  const { lang, setLang, t } = useLang();
  return (
    <div role="group" aria-label={t('langLabel')} className="flex items-center text-[0.8rem] font-medium">
      {(['id', 'en'] as const).map((l, n) => (
        <span key={l} className="flex items-center">
          {n > 0 && <span aria-hidden className={`mx-1 h-3 w-px ${tone === 'dark' ? 'bg-ivory/30' : 'bg-charcoal/25'}`} />}
          <button
            type="button"
            aria-pressed={lang === l}
            onClick={() => setLang(l)}
            className={`min-h-9 min-w-8 px-1 transition-opacity ${lang === l ? 'opacity-100' : 'opacity-55 hover:opacity-100'}`}
          >
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}

// ---------- mega menu ----------

function useCollectionCounts() {
  const { products } = useCatalog();
  return useMemo(() => Object.fromEntries(COLLECTIONS.map((c) => [c, products.filter((p) => inCollection(p, c)).length])) as Record<CollectionSlug, number>, [products]);
}

function MegaPanel({ menu, close }: { menu: Menu; close: () => void }) {
  const { t, num } = useLang();
  const { brands, products } = useCatalog();
  const counts = useCollectionCounts();
  const hasSale = products.some(onSale);
  const count = (n: number) => (n ? num(n) : '');
  const card = (name: CampaignName, title: string, to: string, sub?: string) => (
    <Link to={to} onClick={close} className="group/card block" data-cursor="view">
      <div className="relative aspect-[4/5] overflow-hidden bg-ivory-2">
        <CampaignPicture name={name} alt="" sizes="22vw" imgClassName="h-full w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-expo)] group-hover/card:scale-[1.04]" />
      </div>
      <p className="mt-3 text-[1.02rem]">{title}</p>
      {sub && <p className="t-small text-stone">{sub}</p>}
    </Link>
  );
  if (menu === 'shop') {
    const cats = COLLECTIONS.filter((c) => c !== 'new-arrivals');
    return (
      <div className="wrap grid grid-cols-12 gap-8 py-10">
        <div className="col-span-4">
          <p className="t-small text-stone">{t('megaCategories')}</p>
          <ul className="mt-4 space-y-1">
            {cats.map((c) => (
              <li key={c}>
                <Link to={`/collections/${c}`} onClick={close} className="group/l flex items-baseline justify-between gap-4 py-1.5 text-[1.3rem] font-light">
                  <span className="link-line">{t(`col.${c}` as Key)}</span>
                  <span className="t-small tnum text-stone">{count(counts[c])}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="col-span-3">
          <p className="t-small text-stone">{t('megaShopBy')}</p>
          <ul className="mt-4 space-y-1 text-[1.05rem]">
            {(['men', 'women'] as const).map((g) => (
              <li key={g}><Link to={`/shop?gender=${g}`} onClick={close} className="link-line inline-block py-1.5">{t(`gender.${g}`)}</Link></li>
            ))}
            <li><Link to="/collections/new-arrivals" onClick={close} className="link-line inline-block py-1.5">{t('col.new-arrivals')}</Link></li>
            {hasSale && <li><Link to="/shop?sale=1" onClick={close} className="link-line inline-block py-1.5">{t('sale')}</Link></li>}
            <li className="pt-4"><Link to="/shop" onClick={close} className="link-under inline-block py-1.5 font-medium text-forest">{t('megaAll')}</Link></li>
          </ul>
        </div>
        <div className="col-span-5 grid grid-cols-2 gap-5">
          {card('fairway-walk', t('col.long-sleeve'), '/collections/long-sleeve', t('colBlurb.long-sleeve'))}
          {card('collar', t('col.polo-shirts'), '/collections/polo-shirts', t('colBlurb.polo-shirts'))}
        </div>
      </div>
    );
  }
  if (menu === 'brands') {
    return (
      <div className="wrap grid grid-cols-12 gap-8 py-10">
        <div className="col-span-8">
          {brands.length ? (
            <>
              <ul className="columns-3 gap-8">
                {brands.slice(0, 30).map((b) => (
                  <li key={b.slug} className="break-inside-avoid">
                    <Link to={`/brands/${b.slug}`} onClick={close} className="flex items-baseline gap-2 py-1.5 text-[1.12rem]">
                      <span className="link-line">{b.name}</span>
                      <span className="t-micro tnum text-stone">{num(b.count)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link to="/brands" onClick={close} className="link-under mt-6 inline-block font-medium text-forest">{t('megaAllBrands')}</Link>
            </>
          ) : (
            <div className="max-w-[46ch]">
              <p className="t-lede text-stone">{t('megaBrandsEmpty')}</p>
              <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" data-cursor="buy" className="btn btn-forest mt-6">{t('tokopediaStore')}<span className="sr-only">{t('newTab')}</span></a>
            </div>
          )}
        </div>
        <div className="col-span-4">{card('flag', t('megaAllBrands'), '/brands')}</div>
      </div>
    );
  }
  const tiles: CollectionSlug[] = ['new-arrivals', 'polo-shirts', 'long-sleeve', 'accessories'];
  return (
    <div className="wrap grid grid-cols-4 gap-5 py-10">
      {tiles.map((c) => (
        <div key={c}>{card(COLLECTION_IMAGE[c], t(`col.${c}` as Key), `/collections/${c}`, counts[c] ? (counts[c] === 1 ? t('catCountOne') : t('catCount', { n: num(counts[c]) })) : t(`colBlurb.${c}` as Key))}</div>
      ))}
    </div>
  );
}

// ---------- mobile menu ----------

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, num } = useLang();
  const { brands } = useCatalog();
  const counts = useCollectionCounts();
  const ref = useRef<HTMLDialogElement>(null);
  const lenis = useLenis();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); lenis?.stop(); }
    if (!open && d.open) d.close();
  }, [open, lenis]);
  useEffect(() => {
    const d = ref.current;
    const closed = () => { lenis?.start(); onClose(); };
    d?.addEventListener('close', closed);
    return () => d?.removeEventListener('close', closed);
  }, [onClose, lenis]);
  const close = () => ref.current?.close();
  const group = (title: string, children: ReactNode) => (
    <details className="group border-b border-line-dark">
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between text-[1.6rem] font-light">
        {title}
        <span aria-hidden className="relative h-3.5 w-3.5">
          <span className="absolute left-0 top-1/2 h-px w-3.5 bg-ivory" />
          <span className="absolute left-1/2 top-0 h-3.5 w-px bg-ivory transition-transform duration-300 group-open:scale-y-0" />
        </span>
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  );
  return (
    <dialog ref={ref} id="mobile-menu" aria-label={t('menu')} className="sheet m-0 h-[100dvh] max-h-none w-full max-w-none bg-pine p-0 text-ivory backdrop:bg-transparent">
      <div className="contours flex h-full flex-col overflow-y-auto" data-lenis-prevent>
        <div className="wrap flex h-[72px] shrink-0 items-center justify-between">
          <Link to="/" onClick={close} aria-label="GOLFWEAR, home"><Logo tone="dark" className="h-[24px] w-auto" /></Link>
          <button type="button" onClick={close} aria-label={t('close')} className="-mr-2 flex h-11 w-11 items-center justify-center">
            <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.4" /></svg>
          </button>
        </div>
        <nav aria-label={t('menu')} className="wrap mt-4 flex-1">
          <Link to="/" onClick={close} className="flex min-h-16 items-center border-b border-line-dark text-[1.6rem] font-light">{t('navHome')}</Link>
          {group(t('navShop'), (
            <ul className="space-y-1">
              <li><Link to="/shop" onClick={close} className="block py-2 text-mist">{t('megaAll')}</Link></li>
              {COLLECTIONS.map((c) => (
                <li key={c}>
                  <Link to={`/collections/${c}`} onClick={close} className="flex justify-between py-2 text-[1.1rem]">
                    {t(`col.${c}` as Key)}<span className="t-small tnum text-mist">{counts[c] ? num(counts[c]) : ''}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
          {group(t('navBrands'), brands.length ? (
            <ul className="space-y-1">
              <li><Link to="/brands" onClick={close} className="block py-2 text-mist">{t('megaAllBrands')}</Link></li>
              {brands.map((b) => <li key={b.slug}><Link to={`/brands/${b.slug}`} onClick={close} className="block py-2 text-[1.1rem]">{b.name}</Link></li>)}
            </ul>
          ) : <p className="max-w-[40ch] text-mist">{t('megaBrandsEmpty')}</p>)}
          <Link to="/about" onClick={close} className="flex min-h-16 items-center border-b border-line-dark text-[1.6rem] font-light">{t('navAbout')}</Link>
        </nav>
        <div className="wrap flex shrink-0 items-center justify-between gap-4 py-6">
          <LangToggle tone="dark" />
          <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" className="btn btn-champagne btn-sm">{t('tokopediaStore')}<span className="sr-only">{t('newTab')}</span></a>
        </div>
      </div>
    </dialog>
  );
}

// ---------- header ----------

/** `overlay`: the page starts with a dark full-bleed image, so the header starts transparent. */
export function Header({ overlay }: { overlay: boolean }) {
  const { t } = useLang();
  const { path } = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const timer = useRef<number>(0);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { setMenu(null); }, [path]);
  useEffect(() => {
    if (!menu) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [menu]);
  useEffect(() => {
    const el = panel.current;
    if (!el || !menu || prefersReducedMotion()) return;
    gsap.fromTo(el.children, { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'expo.out' });
  }, [menu]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable]');
      if (e.key === '/' && !typing) { e.preventDefault(); setSearch(true); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const solid = !overlay || scrolled || !!menu;
  const tone: 'light' | 'dark' = solid ? 'light' : 'dark';
  const openSoon = (m: Menu) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setMenu(m), menu ? 0 : 120); };
  const closeSoon = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setMenu(null), 180); };
  const closeMenu = useCallback(() => setMenu(null), []);
  const closeSearch = useCallback(() => setSearch(false), []);
  const closeMobile = useCallback(() => setMobile(false), []);

  const navItem = (key: Key, to: string, m?: Menu) => {
    if (!m) return <Link to={to} className="link-line py-2">{t(key)}</Link>;
    return (
      <span className="flex items-center" onMouseEnter={() => openSoon(m)} onMouseLeave={closeSoon}>
        <Link to={to} className="link-line py-2" aria-current={path.startsWith(to) ? 'page' : undefined}>{t(key)}</Link>
        <button
          type="button"
          aria-expanded={menu === m}
          aria-controls="mega"
          aria-label={`${t(key)}: ${t('menu')}`}
          onClick={() => setMenu(menu === m ? null : m)}
          className="ml-0.5 flex h-8 w-6 items-center justify-center"
        >
          <svg viewBox="0 0 10 6" className={`h-1.5 w-2.5 transition-transform duration-300 ${menu === m ? 'rotate-180' : ''}`} aria-hidden><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
        </button>
      </span>
    );
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50" onMouseLeave={closeSoon}>
        <AnnouncementBar />
        <div
          className={`relative transition-[background-color,color,box-shadow] duration-500 ease-[var(--ease-quint)] ${
            solid ? 'bg-ivory/95 text-charcoal shadow-[0_1px_0_var(--color-line)] backdrop-blur-md' : 'bg-transparent text-ivory'
          }`}
        >
          <div className="wrap grid h-[72px] grid-cols-[1fr_auto_1fr] items-center gap-4">
            <nav aria-label="Main" className="hidden items-center gap-7 text-[0.95rem] lg:flex">
              {navItem('navShop', '/shop', 'shop')}
              {navItem('navBrands', '/brands', 'brands')}
              {navItem('navCollections', '/collections/new-arrivals', 'collections')}
              {navItem('navAbout', '/about')}
            </nav>
            <button
              type="button"
              className="-ml-2 flex h-11 w-11 items-center justify-center lg:hidden"
              aria-expanded={mobile}
              aria-controls="mobile-menu"
              aria-label={t('menu')}
              onClick={() => setMobile(true)}
            >
              <svg viewBox="0 0 22 14" className="h-3.5 w-5.5" aria-hidden><path d="M0 1h22M0 7h22M0 13h14" stroke="currentColor" strokeWidth="1.4" /></svg>
            </button>
            <Link to="/" aria-label="GOLFWEAR, home" className="justify-self-center">
              <Logo tone={tone} className="h-[24px] w-auto sm:h-[28px]" />
            </Link>
            <div className="flex items-center justify-end gap-1 sm:gap-3">
              <button type="button" onClick={() => setSearch(true)} aria-label={t('searchLabel')} className="flex h-11 items-center gap-2 px-2 text-[0.95rem]">
                <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" aria-hidden><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="m13 13 5 5" stroke="currentColor" strokeWidth="1.4" /></svg>
                <span className="hidden xl:inline">{t('search')}</span>
              </button>
              <span className="hidden lg:block"><LangToggle tone={tone} /></span>
              <a
                href={STORE.tokopediaUrl}
                target="_blank"
                rel="noopener"
                data-cursor="buy"
                aria-label={t('bagLabel')}
                className={`flex h-11 items-center gap-2 px-2 text-[0.95rem] sm:rounded-[2px] sm:border sm:px-3.5 ${solid ? 'sm:border-forest/30' : 'sm:border-ivory/40'}`}
              >
                <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" aria-hidden><path d="M4 6.5h12l-1 11H5l-1-11Z" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M7 8V5.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
                <span className="hidden sm:inline">{t('tokopedia')}</span>
              </a>
            </div>
          </div>
          <div
            id="mega"
            ref={panel}
            onMouseEnter={() => window.clearTimeout(timer.current)}
            className={`absolute inset-x-0 top-full hidden border-t border-line bg-ivory text-charcoal shadow-[0_30px_60px_-30px_rgb(16_43_37/0.35)] ${menu ? 'lg:block' : ''}`}
          >
            {menu && <MegaPanel menu={menu} close={closeMenu} />}
          </div>
        </div>
      </header>
      {menu && <div aria-hidden className="fixed inset-0 z-40 bg-pine/25 backdrop-blur-[2px]" onMouseEnter={closeSoon} onClick={closeMenu} />}
      <MobileMenu open={mobile} onClose={closeMobile} />
      <SearchOverlay open={search} onClose={closeSearch} />
    </>
  );
}
