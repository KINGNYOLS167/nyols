import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Availability, Lang, SpecSet, Text } from './data/products';

const T = {
  skip: { id: 'Langsung ke konten', en: 'Skip to content' },
  previewShort: { id: 'Pratinjau: produk masih contoh.', en: 'Preview: these are sample products.' },
  preview: {
    id: 'Pratinjau: produk di situs ini masih contoh dan ditandai "Segera hadir". Ganti di src/data/catalog.json sebelum diluncurkan.',
    en: 'Preview: the products on this site are samples, marked "Coming soon". Replace them in src/data/catalog.json before launch.',
  },
  navHome: { id: 'Beranda', en: 'Home' },
  navShop: { id: 'Belanja', en: 'Shop' },
  navCollections: { id: 'Koleksi', en: 'Collections' },
  navAbout: { id: 'Tentang', en: 'About' },
  search: { id: 'Cari', en: 'Search' },
  searchPlaceholder: { id: 'Cari polo, arm sleeve, warna...', en: 'Search polos, arm sleeves, colours...' },
  searchNone: { id: 'Tidak ada produk untuk "{q}".', en: 'No products match "{q}".' },
  searchAll: { id: 'Lihat semua hasil', en: 'See all results' },
  searchHint: { id: 'Ketik untuk mencari. Enter untuk lihat semua hasil.', en: 'Type to search. Press Enter to see all results.' },
  close: { id: 'Tutup', en: 'Close' },
  menu: { id: 'Menu', en: 'Menu' },
  langLabel: { id: 'Bahasa', en: 'Language' },
  bag: { id: 'Belanja di Tokopedia', en: 'Shop on Tokopedia' },
  storeShort: { id: 'Toko Tokopedia', en: 'Tokopedia store' },
  megaCategories: { id: 'Kategori', en: 'Categories' },
  megaAll: { id: 'Semua produk', en: 'All products' },
  megaFeatureTitle: { id: 'Koleksi GOLFWEAR', en: 'The GOLFWEAR collection' },
  megaFeatureBody: { id: 'Arm sleeve dan polo dengan logo G.', en: 'Arm sleeves and polos carrying the G.' },
  count: { id: '{n} produk', en: '{n} products' },

  heroTitle: { id: 'BEYOND THE GAME.', en: 'BEYOND THE GAME.' },
  heroBody: {
    id: 'Pakaian golf untuk performa, rasa percaya diri, dan gaya sehari-hari yang rapi.',
    en: 'Discover golf apparel designed for performance, confidence, and everyday sophistication.',
  },
  heroShop: { id: 'Lihat koleksi', en: 'Shop the collection' },
  heroStore: { id: 'Kunjungi toko Tokopedia', en: 'Visit our Tokopedia store' },
  heroScroll: { id: 'Gulir', en: 'Scroll' },
  trust: {
    id: 'Toko kami di Tokopedia: rating {rating} dari {reviews} ulasan, lebih dari {sold} produk terjual.',
    en: 'Our Tokopedia store: rated {rating} from {reviews} reviews, more than {sold} items sold.',
  },

  featuredTitle: { id: 'Pilihan kami', en: 'Featured' },
  featuredNote: { id: 'Pilihan dari koleksi GOLFWEAR. Bukan peringkat penjualan.', en: 'Picks from the GOLFWEAR range, not a sales ranking.' },
  bestTitle: { id: 'Paling laris', en: 'Best sellers' },
  bestNote: { id: 'Peringkat dari penjualan di toko Tokopedia kami.', en: 'Ranked by sales on our Tokopedia store.' },
  quickView: { id: 'Lihat cepat', en: 'Quick view' },
  viewProduct: { id: 'Lihat detail produk', en: 'View product details' },
  shopAll: { id: 'Lihat semua produk', en: 'Shop all products' },

  categoriesTitle: { id: 'Belanja per kategori', en: 'Shop by category' },
  editorialTitle: { id: 'Tee pertama, cahaya pertama.', en: 'First tee, first light.' },
  editorialBody: {
    id: 'Ronde terbaik di Jakarta dimulai sebelum matahari tinggi. Kami membuat pakaian untuk jam-jam itu: ringan, cepat kering, dan menutup kulit dari matahari yang datang setelahnya.',
    en: "Jakarta's best rounds start before the sun is high. We make clothes for those hours: light, quick to dry, and covering skin from the sun that follows.",
  },
  editorialCaption1: { id: 'Green di sore hari', en: 'The green, late afternoon' },
  editorialCaption2: { id: 'Fairway dari udara', en: 'The fairway from above' },
  editorialCta: { id: 'Lihat lengan panjang', en: 'Shop long sleeve' },

  brandTitle: { id: 'Bendera di dalam G', en: 'The flag in the G' },
  brandBody: {
    id: 'Logo kami adalah huruf G berbentuk ring, dengan bendera pin yang berkibar keluar dari celahnya: detik saat bola masuk ke hole.',
    en: 'Our mark is a G drawn as a ring, with the flag on the pin flying out through its opening: the moment the ball drops.',
  },
  brandCta: { id: 'Cerita kami', en: 'Our story' },
  ballHint: { id: 'Geser untuk memutar bola', en: 'Drag to spin the ball' },
  ballLabel: {
    id: 'Bola golf 3D dengan logo GOLFWEAR. Geser atau pakai tombol panah untuk memutar, Enter untuk memantulkan.',
    en: '3D golf ball with the GOLFWEAR mark. Drag or use the arrow keys to spin it, Enter to bounce it.',
  },

  shopTitle: { id: 'Semua produk', en: 'All products' },
  shopIntro: { id: 'Pilih di sini, lalu selesaikan pembelian di Tokopedia.', en: 'Choose here, then complete your purchase on Tokopedia.' },
  filters: { id: 'Filter', en: 'Filters' },
  showResults: { id: 'Tampilkan {n} produk', en: 'Show {n} products' },
  fCategory: { id: 'Kategori', en: 'Category' },
  fBrand: { id: 'Merek', en: 'Brand' },
  fSize: { id: 'Ukuran', en: 'Size' },
  fPrice: { id: 'Harga', en: 'Price' },
  fAvailability: { id: 'Ketersediaan', en: 'Availability' },
  priceUnder100: { id: 'Di bawah Rp 100.000', en: 'Under Rp 100.000' },
  price100to350: { id: 'Rp 100.000 – 350.000', en: 'Rp 100.000 – 350.000' },
  priceOver350: { id: 'Di atas Rp 350.000', en: 'Over Rp 350.000' },
  clearAll: { id: 'Hapus semua filter', en: 'Clear all filters' },
  sortLabel: { id: 'Urutkan', en: 'Sort by' },
  sortFeatured: { id: 'Pilihan kami', en: 'Featured' },
  sortPopular: { id: 'Paling laris', en: 'Best selling' },
  sortNew: { id: 'Terbaru', en: 'Newest' },
  sortLow: { id: 'Harga terendah', en: 'Price: low to high' },
  sortHigh: { id: 'Harga tertinggi', en: 'Price: high to low' },
  emptyTitle: { id: 'Tidak ada produk yang cocok.', en: 'No products match these filters.' },
  emptyBody: { id: 'Hapus satu filter atau coba kata lain.', en: 'Remove a filter or try another search.' },
  newBadge: { id: 'Baru', en: 'New' },
  saleBadge: { id: 'Diskon', en: 'Sale' },
  pair: { id: 'per pasang', en: 'per pair' },
  colourOf: { id: 'Warna {name}', en: '{name} colour' },
  colours: { id: '{n} warna', en: '{n} colours' },

  'av.in_stock': { id: 'Tersedia', en: 'In stock' },
  'av.preorder': { id: 'Pre-order', en: 'Pre-order' },
  'av.sold_out': { id: 'Habis', en: 'Sold out' },
  'av.coming_soon': { id: 'Segera hadir', en: 'Coming soon' },

  'cat.sleeves': { id: 'Arm sleeve', en: 'Arm sleeves' },
  'cat.polo-men': { id: 'Polo pria', en: "Men's polos" },
  'cat.polo-women': { id: 'Polo wanita', en: "Women's polos" },
  'cat.trousers': { id: 'Celana panjang', en: 'Trousers' },
  'cat.shorts': { id: 'Celana pendek', en: 'Shorts' },
  'cat.outerwear': { id: 'Outerwear', en: 'Outerwear' },
  'cat.accessories': { id: 'Aksesori', en: 'Accessories' },

  colour: { id: 'Warna', en: 'Colour' },
  size: { id: 'Ukuran', en: 'Size' },
  sizeNote: { id: 'Ukuran dipilih lagi saat checkout di Tokopedia.', en: "You'll confirm the size at checkout on Tokopedia." },
  buy: { id: 'Beli di Tokopedia', en: 'Buy on Tokopedia' },
  buyStore: { id: 'Kunjungi toko Tokopedia', en: 'Visit our Tokopedia store' },
  buyNoteExact: { id: 'Membuka produk ini di Tokopedia. Pembayaran dan pengiriman diproses Tokopedia.', en: 'Opens this product on Tokopedia. Payment and delivery are handled by Tokopedia.' },
  buyNoteStore: { id: 'Produk ini belum ada di Tokopedia. Tombol ini membuka toko kami.', en: "This product isn't on Tokopedia yet. The button opens our store." },
  ask: { id: 'Tanya via WhatsApp', en: 'Ask on WhatsApp' },
  askText: {
    id: 'Halo GOLFWEAR, saya mau tanya {product}, warna {colour}, ukuran {size}.',
    en: 'Hi GOLFWEAR, I have a question about the {product} in {colour}, size {size}.',
  },
  details: { id: 'Detail', en: 'Details' },
  specCard: { id: 'Kartu spesifikasi', en: 'Spec card' },
  related: { id: 'Mungkin kamu suka', en: 'You may also like' },
  sampleNotice: { id: 'Produk contoh: versi aslinya segera hadir.', en: 'Sample product: the real one is coming soon.' },
  notFoundTitle: { id: 'Halaman tidak ditemukan.', en: "We couldn't find that page." },
  notFoundBody: { id: 'Mungkin sudah dipindah. Coba mulai dari toko.', en: 'It may have moved. Try starting from the shop.' },

  collectionsTitle: { id: 'Koleksi', en: 'Collections' },
  collectionsIntro: { id: 'Setiap koleksi adalah cara lain melihat lini GOLFWEAR.', en: 'Each collection is another way into the GOLFWEAR range.' },

  aboutTitle: { id: 'Dibuat untuk lapangan di Jakarta.', en: 'Made for the courses around Jakarta.' },
  about1: {
    id: 'GOLFWEAR berawal sebagai toko golf di Jakarta Barat, melayani pegolf lewat Tokopedia. Kini kami membangun lini sendiri: arm sleeve UV dan polo golf dengan logo G.',
    en: 'GOLFWEAR started as a golf store in Jakarta Barat, serving golfers through Tokopedia. Now we are building our own range: UV arm sleeves and golf polos carrying the G.',
  },
  about2: {
    id: 'Iklimnya menentukan pilihan kami: bahan ringan yang cepat kering, perlindungan dari matahari, dan potongan yang tidak menahan ayunan.',
    en: 'The climate makes our choices: light fabric that dries fast, cover from the sun, and cuts that never hold back a swing.',
  },
  helpTitle: { id: 'Cara pesan', en: 'How to order' },
  order1: { id: 'Pilih produk dan warna di sini.', en: 'Choose a product and colour here.' },
  order2: { id: 'Ketuk Beli di Tokopedia. Listing-nya terbuka di aplikasi atau browser.', en: 'Tap Buy on Tokopedia. The listing opens in the app or your browser.' },
  order3: { id: 'Pilih ukuran, bayar, dan lacak pengiriman di Tokopedia.', en: 'Pick your size, pay, and track delivery in Tokopedia.' },
  faqTitle: { id: 'Pertanyaan', en: 'Questions' },
  q1: { id: 'Kenapa checkout di Tokopedia?', en: 'Why do I check out on Tokopedia?' },
  a1: { id: 'Pembayaran dan pengiriman diproses Tokopedia, jadi kamu bisa pakai metode bayar dan voucher yang biasa kamu pakai di sana.', en: 'Payment and delivery run through Tokopedia, so you can use the payment methods and vouchers you already use there.' },
  q2: { id: 'Bagaimana memilih ukuran?', en: 'How do I choose my size?' },
  a2: { id: 'Setiap listing di Tokopedia punya tabel ukuran. Kalau ragu di antara dua ukuran, chat kami di Tokopedia sebelum memesan.', en: "Every listing on Tokopedia has a size chart. If you're between sizes, chat with us on Tokopedia before you order." },
  q3: { id: 'Apakah arm sleeve dijual sepasang?', en: 'Are arm sleeves sold as a pair?' },
  a3: { id: 'Ya. Satu pesanan berisi satu pasang, kiri dan kanan.', en: 'Yes. One order is one pair, left and right.' },
  q4: { id: 'Berapa lama pengirimannya?', en: 'How long does delivery take?' },
  a4: { id: 'Pilihan kurir dan perkiraan waktu tiba muncul saat checkout di Tokopedia, sesuai alamatmu.', en: 'Courier options and estimated arrival times show at checkout on Tokopedia, based on your address.' },
  creditsTitle: { id: 'Foto', en: 'Photography' },
  creditsBody: { id: 'Foto lapangan dari Unsplash, dipakai dengan Unsplash License.', en: 'Course photography from Unsplash, used under the Unsplash License.' },

  newsTitle: { id: 'Kabar pertama soal koleksi baru.', en: 'Hear first about new drops.' },
  newsBody: { id: 'Email sesekali saat produk baru masuk Tokopedia. Tanpa spam.', en: 'An occasional email when new pieces land on Tokopedia. No spam.' },
  newsPlaceholder: { id: 'Alamat email', en: 'Email address' },
  newsSubmit: { id: 'Daftar', en: 'Subscribe' },
  newsSending: { id: 'Mengirim...', en: 'Sending...' },
  newsDone: { id: 'Terima kasih, kamu sudah terdaftar.', en: "Thanks, you're on the list." },
  newsInvalid: { id: 'Periksa lagi alamat emailnya.', en: 'Check the email address and try again.' },
  newsClosed: { id: 'Pendaftaran belum dibuka. Coba lagi nanti.', en: "Sign-ups aren't open yet. Please try again later." },
  newsError: { id: 'Tidak bisa terhubung. Coba lagi sebentar lagi.', en: "We couldn't connect. Please try again in a moment." },
  footerAbout: { id: 'GOLFWEAR adalah toko pakaian golf dari Jakarta Barat. Belanja di sini, checkout di Tokopedia.', en: 'GOLFWEAR is a golf apparel store from Jakarta Barat. Browse here, check out on Tokopedia.' },
  footerShop: { id: 'Belanja', en: 'Shop' },
  footerHelp: { id: 'Bantuan', en: 'Help' },
  footerFollow: { id: 'Ikuti', en: 'Follow' },
  supportChat: { id: 'Chat di Tokopedia', en: 'Chat on Tokopedia' },
  cursorView: { id: 'Lihat', en: 'View' },
  cursorBuy: { id: 'Beli', en: 'Buy' },
  cursorSpin: { id: 'Putar', en: 'Spin' },
} satisfies Record<string, Text>;

export type Key = keyof typeof T;

const SPECS: Record<SpecSet, [Text, Text][]> = {
  sleeve: [
    [{ id: 'Bahan', en: 'Fabric' }, { id: 'Polyester dan spandex', en: 'Polyester and spandex' }],
    [{ id: 'UV', en: 'UV' }, { id: 'UPF 50+', en: 'UPF 50+' }],
    [{ id: 'Stretch', en: 'Stretch' }, { id: '4 arah', en: '4-way' }],
    [{ id: 'Isi', en: 'Contents' }, { id: '1 pasang, kiri dan kanan', en: '1 pair, left and right' }],
    [{ id: 'Perawatan', en: 'Care' }, { id: 'Cuci tangan, jemur di tempat teduh', en: 'Hand wash, dry in the shade' }],
  ],
  polo: [
    [{ id: 'Bahan', en: 'Fabric' }, { id: 'Jersey polyester-spandex', en: 'Polyester-spandex jersey' }],
    [{ id: 'Rasa', en: 'Feel' }, { id: 'Cepat kering, stretch 4 arah', en: 'Quick-dry, 4-way stretch' }],
    [{ id: 'Kerah', en: 'Collar' }, { id: 'Rib, tidak mudah melengkung', en: 'Rib knit, holds its shape' }],
    [{ id: 'Perawatan', en: 'Care' }, { id: 'Cuci dingin, jangan diperas', en: 'Wash cold, hang dry' }],
  ],
  pique: [
    [{ id: 'Bahan', en: 'Fabric' }, { id: 'Piqué katun-poliester', en: 'Cotton-polyester piqué' }],
    [{ id: 'Rasa', en: 'Feel' }, { id: 'Bertekstur, bernapas', en: 'Textured, breathable' }],
    [{ id: 'Kerah', en: 'Collar' }, { id: 'Rib, tidak mudah melengkung', en: 'Rib knit, holds its shape' }],
    [{ id: 'Perawatan', en: 'Care' }, { id: 'Cuci dingin, jangan diperas', en: 'Wash cold, hang dry' }],
  ],
};

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
  pick: (text: Text) => string;
  specs: (set: SpecSet) => [string, string][];
  availability: (a: Availability) => string;
  num: (n: number) => string;
}
const LangContext = createContext<Ctx | null>(null);

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('gw-lang');
    if (saved === 'id' || saved === 'en') return saved;
  } catch { /* storage unavailable */ }
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'id';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('gw-lang', l); } catch { /* storage unavailable */ }
  }, []);
  const value = useMemo<Ctx>(() => {
    const t: Ctx['t'] = (key, vars) => {
      let s: string = T[key][lang];
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
      return s;
    };
    return {
      lang,
      setLang,
      t,
      pick: (text) => text[lang],
      specs: (set) => SPECS[set].map(([k, v]) => [k[lang], v[lang]]),
      availability: (a) => t(`av.${a}` as Key),
      num: (n) => n.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US'),
    };
  }, [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang outside LangProvider');
  return ctx;
}
