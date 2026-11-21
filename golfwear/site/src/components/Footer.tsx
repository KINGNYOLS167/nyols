import { useState } from 'react';
import { COLLECTIONS, useCatalog } from '../lib/catalog';
import { Link } from '../lib/router';
import { useLang, type Key } from '../i18n';
import { STORE } from '../config';
import { Logo } from './Logo';

export function Newsletter() {
  const { t, lang } = useLang();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'invalid' | 'error'>('idle');
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const honeypot = (new FormData(e.currentTarget).get('company') as string) || '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setState('invalid'); return; }
    setState('sending');
    try {
      const r = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), lang, company: honeypot }),
      });
      if (r.status === 400) { setState('invalid'); return; }
      if (!r.ok) throw new Error(String(r.status));
      setState('done');
      setEmail('');
    } catch {
      setState('error');
    }
  };
  const message = state === 'done' ? t('nlDone') : state === 'invalid' ? t('nlInvalid') : state === 'error' ? t('nlError') : '';
  return (
    <section aria-labelledby="nl-title" className="contours relative bg-pine text-ivory">
      <div className="wrap grid gap-10 py-20 lg:grid-cols-12 lg:py-28">
        <div className="lg:col-span-6">
          <h2 id="nl-title" className="t-display">{t('nlTitle')}</h2>
          <p className="t-lede mt-5 max-w-[38ch] text-mist">{t('nlBody')}</p>
        </div>
        <form onSubmit={submit} noValidate className="self-end lg:col-span-5 lg:col-start-8">
          <label htmlFor="nl-email" className="t-small text-mist">{t('nlLabel')}</label>
          <div className="mt-2 flex items-end gap-3 border-b border-ivory/40 focus-within:border-champagne">
            <input
              id="nl-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (state !== 'sending') setState('idle'); }}
              aria-invalid={state === 'invalid'}
              aria-describedby="nl-msg nl-privacy"
              className="min-h-14 w-full bg-transparent text-[1.25rem] font-light outline-none placeholder:text-ivory/40"
              placeholder={lang === 'id' ? 'nama@email.com' : 'name@email.com'}
            />
            <button type="submit" disabled={state === 'sending'} className="btn btn-champagne btn-sm mb-2 shrink-0">
              {state === 'sending' ? t('nlSending') : t('nlButton')}
            </button>
          </div>
          {/* Hidden from people; bots that fill every field get ignored. */}
          <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
          <p id="nl-msg" role="status" className={`t-small mt-3 min-h-6 ${state === 'done' ? 'text-champagne' : 'text-[#E8B4A6]'}`}>{message}</p>
          <p id="nl-privacy" className="t-micro text-mist">{t('nlPrivacy')}</p>
        </form>
      </div>
    </section>
  );
}

export function Footer() {
  const { t } = useLang();
  const { settings } = useCatalog();
  const s = settings.store;
  const follow = [
    { href: STORE.tokopediaUrl, label: t('tokopediaStore') },
    s.instagram && { href: `https://instagram.com/${s.instagram}`, label: 'Instagram' },
    s.tiktok && { href: `https://www.tiktok.com/@${s.tiktok}`, label: 'TikTok' },
    s.whatsapp && { href: `https://wa.me/${s.whatsapp}`, label: 'WhatsApp' },
    s.email && { href: `mailto:${s.email}`, label: s.email },
  ].filter(Boolean) as { href: string; label: string }[];
  const help: [string, Key][] = [['/about#order', 'footHowTo'], ['/about#faq', 'footSizing'], ['/about#faq', 'footDelivery'], ['/about#faq', 'footFaq']];
  return (
    <footer className="bg-pine-deep text-ivory">
      <div className="wrap grid gap-12 py-16 md:grid-cols-12 lg:py-20">
        <div className="md:col-span-4">
          <Logo tone="dark" className="h-8 w-auto" />
          <p className="mt-6 max-w-[34ch] text-mist">{t('footAbout')}</p>
          <p className="t-small mt-4 text-mist">{STORE.location}</p>
        </div>
        <nav aria-labelledby="f-shop" className="md:col-span-3 md:col-start-6">
          <h2 id="f-shop" className="t-small text-champagne">{t('footShop')}</h2>
          <ul className="mt-4 space-y-2">
            <li><Link to="/shop" className="link-line">{t('shopTitle')}</Link></li>
            {COLLECTIONS.map((c) => <li key={c}><Link to={`/collections/${c}`} className="link-line">{t(`col.${c}` as Key)}</Link></li>)}
            <li><Link to="/brands" className="link-line">{t('navBrands')}</Link></li>
          </ul>
        </nav>
        <nav aria-labelledby="f-help" className="md:col-span-2">
          <h2 id="f-help" className="t-small text-champagne">{t('footHelp')}</h2>
          <ul className="mt-4 space-y-2">
            {help.map(([to, key]) => <li key={key}><Link to={to} className="link-line">{t(key)}</Link></li>)}
            <li><a href={STORE.tokopediaUrl} target="_blank" rel="noopener" className="link-line">{t('footChat')}<span className="sr-only"> {t('newTab')}</span></a></li>
            <li><Link to="/about" className="link-line">{t('navAbout')}</Link></li>
          </ul>
        </nav>
        <nav aria-labelledby="f-follow" className="md:col-span-2">
          <h2 id="f-follow" className="t-small text-champagne">{t('footFollow')}</h2>
          <ul className="mt-4 space-y-2">
            {follow.map((l) => (
              <li key={l.href}><a href={l.href} target="_blank" rel="noopener" className="link-line break-all">{l.label}<span className="sr-only"> {t('newTab')}</span></a></li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="wrap flex flex-col gap-2 border-t border-line-dark py-6 text-[0.82rem] text-mist sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} {STORE.name}. {t('footRights')}</p>
        <p>{t('payNote')}</p>
      </div>
    </footer>
  );
}
