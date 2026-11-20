import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang, SpecSet, Text } from './data/products';

const T = {
  skip: { id: 'Langsung ke produk', en: 'Skip to products' },
  preview: {
    id: 'Pratinjau: produk di halaman ini masih contoh. Ganti dengan produk GOLFWEAR asli di src/data/catalog.json sebelum diluncurkan.',
    en: 'Preview: the products on this page are samples. Replace them with your real GOLFWEAR products in src/data/catalog.json before launch.',
  },
  previewShort: { id: 'Pratinjau: produk masih contoh.', en: 'Preview: these are sample products.' },
  categories: { id: 'Kategori', en: 'Categories' },
  navBest: { id: 'Paling laris', en: 'Best sellers' },
  navShop: { id: 'Semua produk', en: 'All products' },
  navStory: { id: 'Tentang', en: 'About' },
  navOrder: { id: 'Cara pesan', en: 'How to order' },
  menu: { id: 'Menu', en: 'Menu' },
  storeShort: { id: 'Toko Tokopedia', en: 'Tokopedia store' },
  langLabel: { id: 'Bahasa', en: 'Language' },
  heroTitle: { id: 'Main tetap sejuk di bawah terik Jakarta.', en: 'Play cool in the Jakarta heat.' },
  heroBody: {
    id: 'Arm sleeve UV dan polo golf yang menahan matahari, bukan ayunanmu. Pilih di sini, lalu checkout di Tokopedia.',
    en: 'UV arm sleeves and golf polos that block the sun, not your swing. Choose here, then check out on Tokopedia.',
  },
  heroBest: { id: 'Lihat yang paling laris', en: 'See best sellers' },
  heroStore: { id: 'Buka toko Tokopedia', en: 'Open our Tokopedia store' },
  heroTrust: {
    id: 'Toko kami di Tokopedia: rating {rating} dari {reviews} ulasan, lebih dari {sold} produk terjual.',
    en: 'Our Tokopedia store: rated {rating} from {reviews} reviews, more than {sold} items sold.',
  },
  ballHint: { id: 'Geser untuk memutar bola', en: 'Drag to spin the ball' },
  ballLabel: {
    id: 'Bola golf 3D dengan logo GOLFWEAR. Geser atau pakai tombol panah untuk memutar, Enter untuk memantulkan.',
    en: '3D golf ball with the GOLFWEAR mark. Drag or use the arrow keys to spin it, Enter to bounce it.',
  },
  boardTitle: { id: 'Paling laris', en: 'Best sellers' },
  boardSub: { id: 'Peringkat dari penjualan di toko Tokopedia kami.', en: 'Ranked by sales on our Tokopedia store.' },
  boardPos: { id: 'Pos.', en: 'Pos.' },
  boardProduct: { id: 'Produk', en: 'Product' },
  boardColours: { id: 'Warna', en: 'Colours' },
  boardPrice: { id: 'Harga', en: 'Price' },
  view: { id: 'Lihat produk', en: 'View product' },
  shopTitle: { id: 'Semua produk', en: 'All products' },
  shopCount: { id: '{n} produk', en: '{n} products' },
  all: { id: 'Semua', en: 'All' },
  'cat.sleeves': { id: 'Arm sleeve', en: 'Arm sleeves' },
  'cat.polo-men': { id: 'Polo pria', en: "Men's polos" },
  'cat.polo-women': { id: 'Polo wanita', en: "Women's polos" },
  sortLabel: { id: 'Urutkan', en: 'Sort by' },
  sortBest: { id: 'Paling laris', en: 'Best selling' },
  sortLow: { id: 'Harga terendah', en: 'Price: low to high' },
  sortHigh: { id: 'Harga tertinggi', en: 'Price: high to low' },
  sortNew: { id: 'Terbaru', en: 'Newest' },
  search: { id: 'Cari produk', en: 'Search products' },
  emptyTitle: { id: 'Tidak ada produk untuk "{q}".', en: 'No products match "{q}".' },
  emptyBody: { id: 'Coba kata lain, atau lihat semua produk.', en: 'Try another word, or see every product.' },
  clearSearch: { id: 'Lihat semua produk', en: 'See every product' },
  bestBadge: { id: 'Terlaris', en: 'Best seller' },
  newBadge: { id: 'Baru', en: 'New' },
  pair: { id: 'per pasang', en: 'per pair' },
  colourOf: { id: 'Warna {name}', en: '{name} colour' },
  close: { id: 'Tutup', en: 'Close' },
  colour: { id: 'Warna', en: 'Colour' },
  size: { id: 'Ukuran', en: 'Size' },
  sizeNote: { id: 'Ukuran dipilih lagi saat checkout di Tokopedia.', en: "You'll confirm the size at checkout on Tokopedia." },
  buy: { id: 'Beli di Tokopedia', en: 'Buy on Tokopedia' },
  ask: { id: 'Tanya via WhatsApp', en: 'Ask on WhatsApp' },
  askText: {
    id: 'Halo GOLFWEAR, saya mau tanya {product}, warna {colour}, ukuran {size}.',
    en: 'Hi GOLFWEAR, I have a question about the {product} in {colour}, size {size}.',
  },
  payNote: { id: 'Pembayaran dan pengiriman diproses oleh Tokopedia.', en: 'Payment and delivery are handled by Tokopedia.' },
  specCard: { id: 'Kartu spesifikasi', en: 'Spec card' },
  storyTitle: { id: 'Bendera di dalam G', en: 'The flag in the G' },
  story1: {
    id: 'Logo kami adalah huruf G berbentuk ring, dengan bendera pin yang berkibar keluar dari celahnya: detik saat bola masuk ke hole.',
    en: 'Our mark is a G drawn as a ring, with the flag on the pin flying out through its opening: the moment the ball drops.',
  },
  story2: {
    id: 'Kami memasangnya pada perlengkapan untuk ronde panjang di cuaca tropis: ringan, cepat kering, dan menutup kulit dari matahari.',
    en: 'We put it on gear for long rounds in tropical weather: light, quick to dry, and covering skin from the sun.',
  },
  orderTitle: { id: 'Cara pesan', en: 'How to order' },
  order1: { id: 'Pilih produk dan warna di sini.', en: 'Choose a product and colour here.' },
  order2: { id: 'Ketuk Beli di Tokopedia. Listing-nya terbuka di aplikasi atau browser.', en: 'Tap Buy on Tokopedia. The listing opens in the app or your browser.' },
  order3: { id: 'Pilih ukuran, bayar, dan lacak pengiriman di Tokopedia.', en: 'Pick your size, pay, and track delivery in Tokopedia.' },
  faqTitle: { id: 'Pertanyaan', en: 'Questions' },
  q1: { id: 'Kenapa checkout di Tokopedia?', en: 'Why do I check out on Tokopedia?' },
  a1: {
    id: 'Pembayaran dan pengiriman diproses Tokopedia, jadi kamu bisa pakai metode bayar dan voucher yang biasa kamu pakai di sana.',
    en: 'Payment and delivery run through Tokopedia, so you can use the payment methods and vouchers you already use there.',
  },
  q2: { id: 'Bagaimana memilih ukuran?', en: 'How do I choose my size?' },
  a2: {
    id: 'Setiap listing di Tokopedia punya tabel ukuran. Kalau ragu di antara dua ukuran, chat kami di Tokopedia sebelum memesan.',
    en: "Every listing on Tokopedia has a size chart. If you're between sizes, chat with us on Tokopedia before you order.",
  },
  q3: { id: 'Apakah arm sleeve dijual sepasang?', en: 'Are arm sleeves sold as a pair?' },
  a3: { id: 'Ya. Satu pesanan berisi satu pasang, kiri dan kanan.', en: 'Yes. One order is one pair, left and right.' },
  q4: { id: 'Berapa lama pengirimannya?', en: 'How long does delivery take?' },
  a4: {
    id: 'Pilihan kurir dan perkiraan waktu tiba muncul saat checkout di Tokopedia, sesuai alamatmu.',
    en: 'Courier options and estimated arrival times show at checkout on Tokopedia, based on your address.',
  },
  footerNote: { id: 'Belanja di sini, checkout di Tokopedia.', en: 'Browse here, check out on Tokopedia.' },
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
  const value = useMemo<Ctx>(() => ({
    lang,
    setLang,
    t: (key, vars) => {
      let s: string = T[key][lang];
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
      return s;
    },
    pick: (text) => text[lang],
    specs: (set) => SPECS[set].map(([k, v]) => [k[lang], v[lang]]),
  }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang outside LangProvider');
  return ctx;
}
