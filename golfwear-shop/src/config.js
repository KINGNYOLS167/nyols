/**
 * Store settings — edit these first.
 *
 * tokopediaShopUrl: your shop page, e.g. 'https://www.tokopedia.com/yourshopname'.
 *   Leave empty until your shop is live; buttons then fall back to a Tokopedia search.
 * whatsapp: international format without '+', e.g. '6281234567890'. Empty hides the link.
 */
export const STORE = {
  name: 'Nyols Golf',
  shortName: 'NYOLS',
  tagline: 'Curated golf apparel',
  location: 'Indonesia',
  tokopediaShopUrl: '',
  tokopediaSearchUrl: 'https://www.tokopedia.com/search?st=&q=',
  defaultSearchTerm: 'golfwear',
  whatsapp: '',
  instagram: '',
  email: '',
  // How many products count as "Best Sellers" (ranked by units sold).
  bestSellerCount: 10,
  // Products with stock at or below this show "Only N left".
  lowStockThreshold: 10,
};
