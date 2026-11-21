import { useEffect } from 'react';

const SITE = 'GOLFWEAR';
const DEFAULT_TITLE = 'GOLFWEAR | Golf apparel from Jakarta';
const DEFAULT_DESC = 'Golf apparel from Jakarta. Browse here, check out on Tokopedia.';

/** Page title and meta description for the current route. */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE}` : DEFAULT_TITLE;
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute('content', (description || DEFAULT_DESC).replace(/\s+/g, ' ').slice(0, 160));
  }, [title, description]);
}
