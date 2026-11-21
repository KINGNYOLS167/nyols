// Vocabulary shared by the storefront, the dashboard and the API.

export const CATEGORIES = ['polo', 'top', 'trousers', 'shorts', 'skirt', 'outerwear', 'accessories'] as const;
export type Category = (typeof CATEGORIES)[number];

export const SLEEVES = ['', 'short', 'long', 'sleeveless'] as const;
export type Sleeve = (typeof SLEEVES)[number];

export const GENDERS = ['men', 'women', 'unisex'] as const;
export type Gender = (typeof GENDERS)[number];

export const PRODUCT_STATUSES = ['published', 'draft'] as const;

/** Storefront collections. Each is a rule over the product fields above. */
export const COLLECTIONS = [
  'polo-shirts',
  'short-sleeve',
  'long-sleeve',
  'trousers',
  'shorts',
  'outerwear',
  'accessories',
  'new-arrivals',
] as const;
export type CollectionSlug = (typeof COLLECTIONS)[number];

export const SALE_STATUSES = ['pending', 'processing', 'shipped', 'completed', 'cancelled', 'returned'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];
/** Orders that count toward revenue. */
export const REVENUE_STATUSES: readonly SaleStatus[] = ['processing', 'shipped', 'completed'];
/** Orders that take units out of stock. */
export const STOCK_STATUSES: readonly SaleStatus[] = ['pending', 'processing', 'shipped', 'completed'];

export const EXPENSE_CATEGORIES = ['acquisition', 'shipping', 'operational', 'marketing', 'other'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const RESTOCK_STATUSES = ['ordered', 'received'] as const;

export const LOW_STOCK = 3;

export interface StoreSettings {
  whatsapp: string;
  instagram: string;
  tiktok: string;
  email: string;
  rating: number | null;
  reviews: number | null;
  sold: number | null;
  statsDate: string;
}

export interface Announcement {
  id: string;
  en: string;
  href?: string;
}

export const DEFAULT_STORE: StoreSettings = {
  whatsapp: '',
  instagram: '',
  tiktok: '',
  email: '',
  // Read from tokopedia.com/golfwear on 19 Nov 2026 by an earlier session; update in the dashboard.
  rating: 4.8,
  reviews: 21100,
  sold: 64000,
  statsDate: '2026-11-19',
};

export const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  { id: 'Belanja di sini, checkout aman di Tokopedia.', en: 'Browse here, check out securely on Tokopedia.' },
  { id: 'Pembayaran, voucher dan pengiriman diproses oleh Tokopedia.', en: 'Payment, vouchers and delivery are handled by Tokopedia.' },
];

// ---------- public catalog payload ----------

export type Availability = 'in_stock' | 'low_stock' | 'sold_out' | 'preorder' | 'unknown';

export interface PublicSize {
  size: string;
  available: boolean;
  /** Units left, only when the size is running low. */
  low: number | null;
}

export interface PublicProduct {
  id: number;
  slug: string;
  sku: string;
  name: string;
  brand: { slug: string; name: string } | null;
  category: Category;
  sleeve: Sleeve;
  gender: Gender;
  description: string;
  specs: { label: string; value: string }[];
  colors: { name: string; hex: string }[];
  images: string[];
  price: number;
  salePrice: number | null;
  tokopediaUrl: string;
  preorder: boolean;
  preorderDays: number | null;
  featured: boolean;
  isNew: boolean;
  createdAt: string;
  sizes: PublicSize[];
  availability: Availability;
  /** Units sold: recorded sales plus the Tokopedia sold count entered by the owner. */
  sold: number;
}

export interface PublicBrand {
  slug: string;
  name: string;
  description: string;
  logoUrl: string;
  count: number;
}

export interface CatalogPayload {
  products: PublicProduct[];
  brands: PublicBrand[];
  /** 'sales' when real sales exist to rank by; otherwise the owner's featured picks. */
  ranking: 'sales' | 'featured';
  settings: { announcements: Announcement[]; store: StoreSettings };
  updatedAt: string;
}

export const effectivePrice = (p: Pick<PublicProduct, 'price' | 'salePrice'>) =>
  p.salePrice !== null && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price;

export function inCollection(p: PublicProduct, slug: CollectionSlug): boolean {
  switch (slug) {
    case 'polo-shirts': return p.category === 'polo';
    case 'short-sleeve': return p.sleeve === 'short';
    case 'long-sleeve': return p.sleeve === 'long';
    case 'trousers': return p.category === 'trousers';
    case 'shorts': return p.category === 'shorts' || p.category === 'skirt';
    case 'outerwear': return p.category === 'outerwear';
    case 'accessories': return p.category === 'accessories';
    case 'new-arrivals': return p.isNew;
  }
}
