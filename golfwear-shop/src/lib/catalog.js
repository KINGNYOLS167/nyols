import data from '../data/catalog.json';
import { STORE } from '../config.js';

export const brands = data.brands;
export const categories = data.categories;

const brandById = new Map(brands.map((b) => [b.id, b]));
const categoryById = new Map(categories.map((c) => [c.id, c]));

// Rank every product by units sold once; rank 1 = best seller.
const ranked = [...data.products].sort((a, b) => b.sold - a.sold || a.name.localeCompare(b.name));
const rankById = new Map(ranked.map((p, i) => [p.id, i + 1]));

export const products = data.products.map((p) => ({
  ...p,
  rank: rankById.get(p.id),
  brandName: brandById.get(p.brand)?.name ?? p.brand,
  categoryName: categoryById.get(p.category)?.name ?? p.category,
  shape: p.shape ?? categoryById.get(p.category)?.shape ?? 'polo',
}));

export const getBrand = (id) => brandById.get(id);
export const getCategory = (id) => categoryById.get(id);
export const getProduct = (id) => products.find((p) => p.id === id);

export const isBestSeller = (p) => p.rank <= STORE.bestSellerCount;
export const isOnSale = (p) => Boolean(p.compareAt && p.compareAt > p.price);
export const isNew = (p) => p.tags.includes('new');
export const discountPct = (p) => (isOnSale(p) ? Math.round((1 - p.price / p.compareAt) * 100) : 0);

export function bestSellers(limit = STORE.bestSellerCount, filter = () => true) {
  return products.filter(filter).sort((a, b) => a.rank - b.rank).slice(0, limit);
}

export const countBy = (key, list = products) =>
  list.reduce((acc, p) => acc.set(p[key], (acc.get(p[key]) ?? 0) + 1), new Map());

export const minPriceBy = (key, value) =>
  Math.min(...products.filter((p) => p[key] === value).map((p) => p.price));

export const SORTS = {
  bestselling: { label: 'Best selling', fn: (a, b) => a.rank - b.rank },
  newest: { label: 'Newest', fn: (a, b) => b.addedAt.localeCompare(a.addedAt) || a.rank - b.rank },
  'price-asc': { label: 'Price: low to high', fn: (a, b) => a.price - b.price },
  'price-desc': { label: 'Price: high to low', fn: (a, b) => b.price - a.price },
  name: { label: 'Name A–Z', fn: (a, b) => a.name.localeCompare(b.name) },
};

export const PRICE_BANDS = [
  { id: 'u300', label: 'Under Rp 300rb', min: 0, max: 299999 },
  { id: '300-1000', label: 'Rp 300rb – 1jt', min: 300000, max: 999999 },
  { id: '1000-1500', label: 'Rp 1jt – 1,5jt', min: 1000000, max: 1499999 },
  { id: 'o1500', label: 'Above Rp 1,5jt', min: 1500000, max: Infinity },
];

export const GENDERS = [
  { id: 'men', label: 'Men' },
  { id: 'women', label: 'Women' },
  { id: 'unisex', label: 'Unisex' },
];

export function searchProducts(query, list = products) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return list;
  return list.filter((p) => {
    const hay = `${p.name} ${p.brandName} ${p.categoryName} ${p.sku} ${p.colors.map((c) => c.name).join(' ')}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}
