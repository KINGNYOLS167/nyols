import { useRef } from 'react';
import { LIVE_COLLECTIONS, countIn } from '../data/collections';
import { PRODUCTS, imageFor } from '../data/products';
import { useReveal } from '../lib/motion';
import { useLang } from '../i18n';
import { Link } from '../router';
import { Arrow, Photo } from '../components/ui';

export default function Collections() {
  const { t, pick, lang } = useLang();
  const root = useRef<HTMLDivElement>(null);
  useReveal(root, [lang]);
  return (
    <div ref={root} className="bg-ivory">
      <section className="wrap pb-10 pt-[160px]">
        <h1 className="display text-pine" data-reveal="text">{t('collectionsTitle')}</h1>
        <p className="lede mt-4 max-w-[52ch] text-stone">{t('collectionsIntro')}</p>
      </section>
      <section className="wrap grid gap-x-6 gap-y-14 pb-28 sm:grid-cols-2 lg:grid-cols-3" data-reveal="stagger">
        {LIVE_COLLECTIONS.map((c) => {
          const first = PRODUCTS.find(c.match)!;
          return (
            <Link key={c.slug} to={`/collections/${c.slug}`} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden bg-linen">
                {c.photo
                  ? <Photo name={c.photo} alt="" sizes="(min-width: 1024px) 31vw, (min-width: 640px) 48vw, 100vw" className="h-full w-full object-cover transition-transform duration-[1.4s] ease-[var(--ease-quint)] group-hover:scale-[1.05]" />
                  : <img src={imageFor(first)} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="h3 text-pine">{pick(c.name)}</h2>
                  <p className="small mt-1 text-stone">{pick(c.description)}</p>
                </div>
                <span className="flex shrink-0 items-center gap-2 text-stone">{t('count', { n: countIn(c) })} <Arrow /></span>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
