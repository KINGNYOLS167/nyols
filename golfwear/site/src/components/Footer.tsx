import { useState, type FormEvent } from 'react';
import { STORE } from '../config';
import { LIVE_COLLECTIONS } from '../data/collections';
import { useLang } from '../i18n';
import { Link } from '../router';
import { Logo, Tagline } from './Logo';
import { Arrow } from './ui';

type State = 'idle' | 'sending' | 'done' | 'invalid' | 'closed' | 'error';

/** Newsletter sign-up: posts to /api/subscribe, which stores the address in the database. No fake success. */
function Newsletter() {
  const { t, lang } = useLang();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setState('invalid'); return; }
    setState('sending');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), lang, website: form.get('website') ?? '' }),
      });
      if (res.ok) { setState('done'); setEmail(''); return; }
      setState(res.status === 400 ? 'invalid' : res.status === 503 ? 'closed' : 'error');
    } catch { setState('error'); }
  };
  const msg = { done: t('newsDone'), invalid: t('newsInvalid'), closed: t('newsClosed'), error: t('newsError'), idle: '', sending: '' }[state];
  return (
    <form onSubmit={submit} noValidate className="max-w-xl">
      <h2 className="h2 text-ivory" data-reveal="text">{t('newsTitle')}</h2>
      <p className="mt-3 text-mist">{t('newsBody')}</p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="news-email" className="sr-only">{t('newsPlaceholder')}</label>
        <input id="news-email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => { setEmail(e.target.value); if (state !== 'sending') setState('idle'); }}
          placeholder={t('newsPlaceholder')} aria-invalid={state === 'invalid'} aria-describedby="news-msg"
          className="h-[54px] min-w-0 flex-1 rounded-full border border-ivory/25 bg-transparent px-6 text-ivory placeholder:text-mist focus:border-champagne focus:outline-none" />
        {/* honeypot for bots */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <button type="submit" disabled={state === 'sending'} className="btn btn-champagne disabled:opacity-70">{state === 'sending' ? t('newsSending') : t('newsSubmit')}</button>
      </div>
      <p id="news-msg" role="status" className={`mt-3 min-h-[1.5em] text-[0.92rem] ${state === 'done' ? 'text-champagne' : 'text-ivory/80'}`}>{msg}</p>
    </form>
  );
}

export function Footer() {
  const { t, pick } = useLang();
  const social = [STORE.instagram && { href: `https://instagram.com/${STORE.instagram}`, label: 'Instagram' }].filter(Boolean) as { href: string; label: string }[];
  return (
    <footer className="grain bg-pine text-ivory">
      <div className="wrap py-20 lg:py-28">
        <Newsletter />
        <div className="mt-20 grid gap-10 border-t border-ivory/10 pt-14 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo tone="dark" className="h-8 w-auto" />
            <Tagline className="mt-5" />
            <p className="mt-6 max-w-sm text-mist">{t('footerAbout')}</p>
          </div>
          <div className="lg:col-span-2 lg:col-start-6">
            <p className="small text-mist">{t('footerShop')}</p>
            <ul className="mt-4 space-y-2.5">
              <li><Link to="/shop" className="link-line">{t('megaAll')}</Link></li>
              {LIVE_COLLECTIONS.slice(0, 5).map((c) => <li key={c.slug}><Link to={`/collections/${c.slug}`} className="link-line">{pick(c.name)}</Link></li>)}
            </ul>
          </div>
          <div className="lg:col-span-3">
            <p className="small text-mist">{t('footerHelp')}</p>
            <ul className="mt-4 space-y-2.5">
              <li><Link to="/about#order" className="link-line">{t('helpTitle')}</Link></li>
              <li><Link to="/about#faq" className="link-line">{t('faqTitle')}</Link></li>
              <li><a href={STORE.tokopediaUrl} target="_blank" rel="noopener" className="link-line">{t('supportChat')}</a></li>
              {STORE.whatsapp && <li><a href={`https://wa.me/${STORE.whatsapp}`} target="_blank" rel="noopener" className="link-line">WhatsApp</a></li>}
            </ul>
          </div>
          <div className="lg:col-span-3">
            <p className="small text-mist">{t('footerFollow')}</p>
            <ul className="mt-4 space-y-2.5">
              <li><a href={STORE.tokopediaUrl} target="_blank" rel="noopener" className="link-line inline-flex items-center gap-2">tokopedia.com/golfwear <Arrow /></a></li>
              {social.map((s) => <li key={s.href}><a href={s.href} target="_blank" rel="noopener" className="link-line">{s.label}</a></li>)}
            </ul>
            <p className="small mt-8 text-mist">{STORE.location}</p>
          </div>
        </div>
        <div className="mt-14 flex flex-wrap justify-between gap-4 text-[0.82rem] text-mist/80">
          <p>© {new Date().getFullYear()} {STORE.name}</p>
          <Link to="/about#credits" className="link-line">{t('creditsTitle')}: Unsplash</Link>
        </div>
      </div>
    </footer>
  );
}
