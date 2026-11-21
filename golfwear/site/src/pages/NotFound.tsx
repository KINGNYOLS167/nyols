import { Link } from '../lib/router';
import { useLang } from '../i18n';
import { usePageMeta } from '../lib/meta';

export function NotFound() {
  const { t } = useLang();
  usePageMeta(t('notFoundTitle'));
  return (
    <div className="wrap pb-32 pt-[200px]">
      <p className="tnum text-[clamp(5rem,18vw,14rem)] font-light leading-none tracking-[-0.05em] text-champagne-ink" aria-hidden>404</p>
      <h1 className="t-h2 mt-6 text-forest">{t('notFoundTitle')}</h1>
      <p className="mt-4 max-w-[44ch] text-stone">{t('notFoundBody')}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/" className="btn btn-forest">{t('navHome')}</Link>
        <Link to="/shop" className="btn btn-outline">{t('shopTitle')}</Link>
      </div>
    </div>
  );
}
