import { useLang } from '../i18n';
import { Link } from '../router';
import { Arrow } from '../components/ui';

export default function NotFound() {
  const { t } = useLang();
  return (
    <section className="wrap min-h-[70svh] pb-24 pt-[180px]">
      <h1 className="display text-pine">{t('notFoundTitle')}</h1>
      <p className="lede mt-5 text-stone">{t('notFoundBody')}</p>
      <Link to="/shop" className="btn btn-forest mt-10">{t('shopAll')} <Arrow /></Link>
    </section>
  );
}
