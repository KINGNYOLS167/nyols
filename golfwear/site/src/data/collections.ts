import { PRODUCTS, type Product, type Text } from './products';

export interface Collection {
  slug: string;
  name: Text;
  description: Text;
  /** Photo (from /public/photos, without size suffix) or a product image used as the cover */
  photo?: string;
  match: (p: Product) => boolean;
}

/**
 * Collections are filters over the catalogue. A collection with no products is hidden
 * everywhere, so trousers, shorts, outerwear and accessories appear by themselves once you
 * add products in those categories.
 */
export const COLLECTIONS: Collection[] = [
  {
    slug: 'new-arrivals',
    name: { id: 'Baru datang', en: 'New arrivals' },
    description: { id: 'Tambahan terbaru di koleksi GOLFWEAR.', en: 'The latest additions to the GOLFWEAR range.' },
    photo: 'morning-fairway',
    match: (p) => !!p.isNew,
  },
  {
    slug: 'polo-shirts',
    name: { id: 'Polo', en: 'Polo shirts' },
    description: { id: 'Polo golf pria dan wanita, lengan pendek dan panjang.', en: "Men's and women's golf polos, short and long sleeve." },
    photo: 'striped-green',
    match: (p) => p.category === 'polo-men' || p.category === 'polo-women',
  },
  {
    slug: 'short-sleeve',
    name: { id: 'Lengan pendek', en: 'Short sleeve' },
    description: { id: 'Untuk siang yang panas di lapangan.', en: 'For hot afternoons on the course.' },
    photo: 'evening-green',
    match: (p) => p.sleeve === 'short',
  },
  {
    slug: 'long-sleeve',
    name: { id: 'Lengan panjang', en: 'Long sleeve' },
    description: { id: 'Perlindungan matahari penuh, dari tee pagi sampai sore.', en: 'Full sun cover, from early tee times to late rounds.' },
    photo: 'sunrise-course',
    match: (p) => p.sleeve === 'long',
  },
  {
    slug: 'arm-sleeves',
    name: { id: 'Arm sleeve', en: 'Arm sleeves' },
    description: { id: 'Pelindung lengan UV, dijual per pasang.', en: 'UV arm sleeves, sold in pairs.' },
    photo: 'aerial-course',
    match: (p) => p.category === 'sleeves',
  },
  {
    slug: 'womens',
    name: { id: 'Wanita', en: "Women's" },
    description: { id: 'Potongan yang lebih pas badan untuk pegolf wanita.', en: 'Closer cuts for women golfers.' },
    photo: 'forest-flag',
    match: (p) => p.category === 'polo-women',
  },
  {
    slug: 'trousers',
    name: { id: 'Celana panjang golf', en: 'Golf trousers' },
    description: { id: 'Celana golf.', en: 'Golf trousers.' },
    match: (p) => p.category === 'trousers',
  },
  {
    slug: 'shorts',
    name: { id: 'Celana pendek golf', en: 'Golf shorts' },
    description: { id: 'Celana pendek golf.', en: 'Golf shorts.' },
    match: (p) => p.category === 'shorts',
  },
  {
    slug: 'outerwear',
    name: { id: 'Outerwear', en: 'Outerwear' },
    description: { id: 'Lapisan luar untuk pagi yang sejuk.', en: 'Layers for cool mornings.' },
    match: (p) => p.category === 'outerwear',
  },
  {
    slug: 'accessories',
    name: { id: 'Aksesori', en: 'Accessories' },
    description: { id: 'Aksesori golf.', en: 'Golf accessories.' },
    match: (p) => p.category === 'accessories',
  },
];

export const countIn = (c: Collection) => PRODUCTS.filter(c.match).length;
export const LIVE_COLLECTIONS = COLLECTIONS.filter((c) => countIn(c) > 0);
export const collectionBySlug = (slug: string) => LIVE_COLLECTIONS.find((c) => c.slug === slug);

const BASE = import.meta.env.BASE_URL;
/** srcset for a photo in /public/photos (made at 800, 1400 and 2400 px wide where the original allowed). */
export const photoSrc = (name: string, widths = [800, 1400, 2400]) => ({
  src: `${BASE}photos/${name}-1400.webp`,
  srcSet: widths.map((w) => `${BASE}photos/${name}-${w}.webp ${w}w`).join(', '),
});
