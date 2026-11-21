import { useMemo } from 'react';
import { useCatalog } from '../lib/catalog';
import { Link } from '../lib/router';
import { useScrollMotion } from '../lib/reveal';
import { useLang } from '../i18n';
import { STORE } from '../config';
import { ProductImage } from '../components/Media';
import { CatalogUnavailable } from './Home';
import { PageHeader } from './Catalog';

export function Brands() {
  const { t, num } = useLang();
  const { brands, products, status } = useCatalog();
  const scope = useScrollMotion<HTMLDivElement>([brands.length]);
  const cover = useMemo(() => new Map(brands.map((b) => [b.slug, products.find((p) => p.brand?.slug === b.slug && p.images[0])])), [brands, products]);
  return (
    <>
      <PageHeader title={t('brandsIndexTitle')} blurb={t('brandsBody')} meta={status === 'ready' && brands.length ? `${num(brands.length)} ${t('navBrands').toLowerCase()}` : ''} />
      <div ref={scope} className="wrap pb-28">
        {status === 'error' ? (
          <CatalogUnavailable />
        ) : status === 'loading' ? (
          <div className="space-y-4" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}</div>
        ) : brands.length === 0 ? (
          <div className="flex flex-col items-start gap-4 border-t border-line py-14">
            <p className="t-h3">{t('brandsEmptyTitle')}</p>
            <p className="max-w-[46ch] text-stone">{t('megaBrandsEmpty')}</p>
            <a href={STORE.tokopediaUrl} target="_blank" rel="noopener" className="btn btn-forest btn-sm mt-2">{t('heroStore')}<span className="sr-only">{t('newTab')}</span></a>
          </div>
        ) : (
          <ul className="border-t border-line">
            {brands.map((b) => {
              const p = cover.get(b.slug);
              return (
                <li key={b.slug} className="border-b border-line">
                  <Link to={`/brands/${b.slug}`} data-cursor="view" className="group grid items-center gap-6 py-7 md:grid-cols-12">
                    <span className="md:col-span-5">
                      <span className="block text-[clamp(2rem,1.3rem+3vw,4rem)] font-light leading-none tracking-[-0.03em] transition-[color,transform] duration-500 ease-[var(--ease-expo)] group-hover:translate-x-2 group-hover:text-forest">{b.name}</span>
                    </span>
                    <span className="t-small max-w-[48ch] text-stone md:col-span-4">{b.description}</span>
                    <span className="flex items-center justify-between gap-4 md:col-span-3 md:justify-end">
                      <span className="t-small tnum text-stone">{b.count === 1 ? t('brandCountOne') : t('brandCount', { n: num(b.count) })}</span>
                      {p && (
                        <span className="relative block h-24 w-20 overflow-hidden bg-ivory-2">
                          <ProductImage product={p} sizes="80px" alt="" className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105" />
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
