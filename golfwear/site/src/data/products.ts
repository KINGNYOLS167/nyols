import catalog from './catalog.json';
import { STORE } from '../config';

export type Lang = 'id' | 'en';
export type Text = Record<Lang, string>;
export type Category = 'sleeves' | 'polo-men' | 'polo-women';
export type SpecSet = 'sleeve' | 'polo' | 'pique';

export interface Colour {
  key: string;
  name: Text;
  hex: string;
  stripe?: string;
  /** Optional photo path; defaults to /products/<product id>-<colour key>.webp */
  image?: string;
}

export interface Product {
  id: string;
  /** true while the product is placeholder content */
  sample?: boolean;
  /** 1 = best seller. Drives the leaderboard and the default sort. */
  rank: number;
  isNew?: boolean;
  category: Category;
  sleeve: 'arm' | 'short' | 'long';
  kind: string;
  name: Text;
  blurb: Text;
  price: number;
  compareAt?: number;
  colors: Colour[];
  sizes: string[];
  specs: SpecSet;
  /** The exact Tokopedia listing. Until it's set, buttons open the store page. */
  tokopediaUrl?: string;
}

export const PRODUCTS: Product[] = (catalog.products as unknown as Product[]).slice().sort((a, b) => a.rank - b.rank);
export const HAS_SAMPLES = PRODUCTS.some((p) => p.sample);
export const CATEGORIES: Category[] = ['sleeves', 'polo-men', 'polo-women'];

export const imageFor = (p: Product, c: Colour = p.colors[0]) => c.image ?? `/products/${p.id}-${c.key}.webp`;
export const buyUrl = (p: Product) => p.tokopediaUrl || STORE.tokopediaUrl;

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
export const formatPrice = (n: number) => rupiah.format(n);

export function whatsappLink(text: string) {
  return STORE.whatsapp ? `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(text)}` : '';
}
