import { STORE } from '../config.js';

const searchUrl = (term) => `${STORE.tokopediaSearchUrl}${encodeURIComponent(term)}`;

/** Store front on Tokopedia; falls back to a golfwear search until the shop URL is set. */
export const shopUrl = () => STORE.tokopediaShopUrl || searchUrl(STORE.defaultSearchTerm);

/** Listing for one product; falls back to a Tokopedia search for brand + name. */
export const productUrl = (p) => p.tokopediaUrl || searchUrl(`${p.brandName} ${p.name}`);

export const linkAttrs = 'target="_blank" rel="noopener noreferrer"';

export const BAG_ICON = `<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l-1 13H7L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>`;
