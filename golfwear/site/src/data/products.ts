import catalog from './catalog.json';
import { STORE } from '../config';

export type Lang = 'id' | 'en';
export type Text = Record<Lang, string>;
export type Category = 'sleeves' | 'polo-men' | 'polo-women' | 'trousers' | 'shorts' | 'outerwear' | 'accessories';
export type SpecSet = 'sleeve' | 'polo' | 'pique';
export type Availability = 'in_stock' | 'preorder' | 'sold_out' | 'coming_soon';

export interface Colour {
  key: string;
  name: Text;
  hex: string;
  stripe?: string;
  /** Optional photo paths; the first is the main one. Defaults to /products/<id>-<colour key>.webp */
  images?: string[];
}

export interface Product {
  id: string;
  /** true while the product is placeholder content */
  sample?: boolean;
  /** Order in "Featured" (or "Best sellers" when the catalogue's rankSource is "sales"). 1 comes first. */
  rank: number;
  isNew?: boolean;
  brand: string;
  category: Category;
  sleeve?: 'arm' | 'short' | 'long';
  kind: string;
  name: Text;
  blurb: Text;
  price: number;
  /** Sale price, when lower than price */
  salePrice?: number;
  availability: Availability;
  colors: Colour[];
  sizes: string[];
  specs: SpecSet;
  /** The exact Tokopedia listing. Until it's set, buttons open the store page and say so. */
  tokopediaUrl?: string;
}

const raw = catalog as unknown as { rankSource: 'featured' | 'sales'; products: Product[] };
export const RANK_SOURCE = raw.rankSource;
export const PRODUCTS: Product[] = raw.products.slice().sort((a, b) => a.rank - b.rank);
export const HAS_SAMPLES = PRODUCTS.some((p) => p.sample);
export const productById = (id: string) => PRODUCTS.find((p) => p.id === id);

const BASE = import.meta.env.BASE_URL;
export const imagesFor = (p: Product, c: Colour = p.colors[0]) => c.images?.length ? c.images : [`${BASE}products/${p.id}-${c.key}.webp`];
export const imageFor = (p: Product, c: Colour = p.colors[0]) => imagesFor(p, c)[0];
/** Product listing if known, otherwise the store, plus whether it's the exact listing. */
export const buyLink = (p: Product) => ({ url: p.tokopediaUrl || STORE.tokopediaUrl, exact: !!p.tokopediaUrl });
export const effectivePrice = (p: Product) => (p.salePrice && p.salePrice < p.price ? p.salePrice : p.price);
export const allSizes = () => [...new Set(PRODUCTS.flatMap((p) => p.sizes))];
export const BRANDS = [...new Set(PRODUCTS.map((p) => p.brand))];

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
export const formatPrice = (n: number) => rupiah.format(n);

export function whatsappLink(text: string) {
  return STORE.whatsapp ? `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(text)}` : '';
}
