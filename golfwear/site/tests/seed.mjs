// LOCAL TEST DATA ONLY. Fills a throwaway local database through the API so the storefront and
// dashboard can be exercised. Never run this against the live store: none of it is real.
//   node tests/seed.mjs http://localhost:4180 <admin password>
const [base = 'http://localhost:4180', password = 'test-password-123'] = process.argv.slice(2);
if (/vercel\.app|golfwear\./.test(base)) throw new Error('Refusing to seed a live site.');
let cookie = '';
async function api(method, path, body) {
  const r = await fetch(base + '/api' + path, {
    method,
    headers: { 'content-type': 'application/json', 'x-gw-admin': '1', cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = r.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(data)}`);
  return data;
}
await api('POST', '/admin/login', { password });
const brandA = (await api('POST', '/admin/brands', { name: 'Test Brand Alpha', description: 'Local test brand for QA.' })).id;
const brandB = (await api('POST', '/admin/brands', { name: 'Test Brand Bravo', description: 'Second local test brand.' })).id;
const img = (n) => [`/campaign/${n}-${['flag', 'aerial'].includes(n) ? 960 : n === 'hero-portrait' ? 600 : 640}.webp`];
const products = [
  { name: 'QA Polo Short Sleeve', brandId: brandA, category: 'polo', sleeve: 'short', gender: 'men', price: 350000, salePrice: 299000, images: ['/campaign/collar-640.webp', '/campaign/hero-portrait-600.webp'], featured: true, isNew: true, stock: [{ size: 'S', qty: 4 }, { size: 'M', qty: 2 }, { size: 'L', qty: 0 }, { size: 'XL', qty: 6 }], tokopediaUrl: 'https://www.tokopedia.com/golfwear/qa-test-polo', description: 'Local QA product.', specs: [{ label: 'Fabric', value: 'Test fabric' }], colors: [{ name: 'Forest', hex: '#173D32' }] },
  { name: 'QA Long Sleeve Polo', brandId: brandA, category: 'polo', sleeve: 'long', gender: 'women', price: 395000, images: img('fairway-walk'), stock: [{ size: 'S', qty: 1 }, { size: 'M', qty: 1 }] },
  { name: 'QA Golf Trousers', brandId: brandB, category: 'trousers', gender: 'men', price: 450000, images: img('hero-portrait'), preorder: true, preorderDays: 14, stock: [{ size: '30', qty: 0 }, { size: '32', qty: 0 }] },
  { name: 'QA Arm Sleeve', brandId: brandB, category: 'accessories', gender: 'unisex', price: 95000, images: [], stock: [] },
  { name: 'QA Golf Shorts', brandId: brandB, category: 'shorts', gender: 'men', price: 320000, images: img('aerial'), stock: [{ size: 'M', qty: 0 }] },
  { name: 'QA Outer Layer', brandId: brandA, category: 'outerwear', sleeve: 'long', gender: 'unisex', price: 650000, images: img('flag'), stock: [{ size: 'L', qty: 8 }] },
];
const ids = [];
for (const p of products) ids.push((await api('POST', '/admin/products', { status: 'published', ...p })).id);
await api('POST', '/admin/sales', { orderDate: '2026-10-12', productId: ids[0], size: 'S', qty: 3, unitPrice: 299000, status: 'completed', marketplaceRef: 'INV/QA/1' });
await api('POST', '/admin/sales', { orderDate: '2026-11-02', productId: ids[1], size: 'M', qty: 1, unitPrice: 395000, status: 'shipped', marketplaceRef: 'INV/QA/2' });
await api('POST', '/admin/sales', { orderDate: '2026-11-15', productId: ids[5], size: 'L', qty: 2, unitPrice: 650000, discount: 50000, status: 'completed' });
await api('POST', '/admin/sales', { orderDate: '2026-11-18', productName: 'QA manual item', qty: 1, unitPrice: 100000, status: 'pending' });
await api('POST', '/admin/expenses', { date: '2026-10-01', category: 'acquisition', description: 'QA stock purchase', amount: 900000 });
await api('POST', '/admin/expenses', { date: '2026-11-05', category: 'marketing', description: 'QA ads', amount: 150000 });
await api('POST', '/admin/expenses', { date: '2026-11-06', category: 'shipping', description: 'QA courier', amount: 45000 });
await api('POST', '/admin/restocks', { productId: ids[2], date: '2026-11-19', size: '32', qty: 5, unitCost: 200000, status: 'ordered', expectedDate: '2026-12-03' });
console.log(`Seeded ${ids.length} test products, 4 sales, 3 expenses, 1 restock at ${base}`);
