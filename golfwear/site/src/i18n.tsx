import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'id' | 'en';
export type Text = Record<Lang, string>;

const T = {
  skip: { id: 'Langsung ke konten', en: 'Skip to content' },
  menu: { id: 'Menu', en: 'Menu' },
  close: { id: 'Tutup', en: 'Close' },
  langLabel: { id: 'Bahasa', en: 'Language' },
  announcements: { id: 'Pengumuman toko', en: 'Store announcements' },

  navHome: { id: 'Beranda', en: 'Home' },
  navShop: { id: 'Belanja', en: 'Shop' },
  navBrands: { id: 'Merek', en: 'Brands' },
  navCollections: { id: 'Koleksi', en: 'Collections' },
  navAbout: { id: 'Tentang', en: 'About' },
  search: { id: 'Cari', en: 'Search' },
  searchLabel: { id: 'Cari produk', en: 'Search products' },
  searchPlaceholder: { id: 'Cari polo, merek, warna…', en: 'Search polos, brands, colours…' },
  searchEmpty: { id: 'Tidak ada produk untuk "{q}".', en: 'No products match "{q}".' },
  searchSeeAll: { id: 'Lihat semua {n} hasil', en: 'See all {n} results' },
  searchCollections: { id: 'Koleksi', en: 'Collections' },
  searchProducts: { id: 'Produk', en: 'Products' },
  tokopedia: { id: 'Tokopedia', en: 'Tokopedia' },
  tokopediaStore: { id: 'Toko Tokopedia', en: 'Tokopedia store' },
  bagLabel: { id: 'Belanja di toko Tokopedia kami (membuka Tokopedia)', en: 'Shop our Tokopedia store (opens Tokopedia)' },
  newTab: { id: '(tab baru)', en: '(new tab)' },

  megaCategories: { id: 'Kategori', en: 'Categories' },
  megaShopBy: { id: 'Belanja untuk', en: 'Shop for' },
  megaAll: { id: 'Lihat semua produk', en: 'Shop everything' },
  megaAllBrands: { id: 'Semua merek', en: 'All brands' },
  megaBrandsEmpty: {
    id: 'Koleksi per merek muncul di sini begitu produknya kami tampilkan. Sementara itu, semua produk ada di Tokopedia.',
    en: 'Brand collections appear here as products are listed. Meanwhile, the full range is on Tokopedia.',
  },
  'gender.men': { id: 'Pria', en: 'Men' },
  'gender.women': { id: 'Wanita', en: 'Women' },
  'gender.unisex': { id: 'Unisex', en: 'Unisex' },
  sale: { id: 'Diskon', en: 'Sale' },

  'col.polo-shirts': { id: 'Kaos polo', en: 'Polo shirts' },
  'col.short-sleeve': { id: 'Lengan pendek', en: 'Short sleeve' },
  'col.long-sleeve': { id: 'Lengan panjang', en: 'Long sleeve' },
  'col.trousers': { id: 'Celana panjang golf', en: 'Golf trousers' },
  'col.shorts': { id: 'Celana pendek golf', en: 'Golf shorts' },
  'col.outerwear': { id: 'Outerwear', en: 'Outerwear' },
  'col.accessories': { id: 'Aksesori', en: 'Accessories' },
  'col.new-arrivals': { id: 'Produk baru', en: 'New arrivals' },
  'colBlurb.polo-shirts': { id: 'Atasan golf yang wajib ada: berkerah, bernapas, pantas sampai clubhouse.', en: 'The essential golf top: collared, breathable, right for the clubhouse.' },
  'colBlurb.short-sleeve': { id: 'Ringan dan sejuk untuk ronde di siang terik.', en: 'Light and cool for rounds in the midday heat.' },
  'colBlurb.long-sleeve': { id: 'Menutup kulit dari matahari, dari tee pertama sampai green terakhir.', en: 'Sun cover from the first tee to the last green.' },
  'colBlurb.trousers': { id: 'Potongan rapi dengan ruang untuk mengayun.', en: 'Clean lines with room to swing.' },
  'colBlurb.shorts': { id: 'Celana pendek dan rok untuk hari yang hangat.', en: 'Shorts and skirts for warm days on the course.' },
  'colBlurb.outerwear': { id: 'Lapisan untuk tee time pagi dan hujan di tengah ronde.', en: 'Layers for early tee times and rain delays.' },
  'colBlurb.accessories': { id: 'Arm sleeve, sarung tangan, topi, dan detail pelengkap.', en: 'Arm sleeves, gloves, caps and the finishing details.' },
  'colBlurb.new-arrivals': { id: 'Tambahan terbaru di koleksi kami.', en: 'The latest additions to the range.' },

  'cat.polo': { id: 'Polo', en: 'Polo' },
  'cat.top': { id: 'Atasan', en: 'Top' },
  'cat.trousers': { id: 'Celana panjang', en: 'Trousers' },
  'cat.shorts': { id: 'Celana pendek', en: 'Shorts' },
  'cat.skirt': { id: 'Rok', en: 'Skirt' },
  'cat.outerwear': { id: 'Outerwear', en: 'Outerwear' },
  'cat.accessories': { id: 'Aksesori', en: 'Accessories' },
  'sleeve.short': { id: 'Lengan pendek', en: 'Short sleeve' },
  'sleeve.long': { id: 'Lengan panjang', en: 'Long sleeve' },
  'sleeve.sleeveless': { id: 'Tanpa lengan', en: 'Sleeveless' },

  heroBody: {
    id: 'Temukan pakaian golf yang dirancang untuk performa, rasa percaya diri, dan gaya sehari-hari yang berkelas.',
    en: 'Discover golf apparel designed for performance, confidence, and everyday sophistication.',
  },
  heroShop: { id: 'Belanja koleksi', en: 'Shop the collection' },
  heroStore: { id: 'Kunjungi toko Tokopedia', en: 'Visit our Tokopedia store' },
  heroRating: { id: 'rating toko', en: 'store rating' },
  heroReviews: { id: 'ulasan', en: 'reviews' },
  heroSold: { id: 'produk terjual', en: 'items sold' },
  heroStatsSource: { id: 'Di Tokopedia, per {date}', en: 'On Tokopedia, as of {date}' },
  heroImageAlt: { id: 'Pegolf menahan finish setelah drive di tee yang tinggi saat fajar, kabut di lembah.', en: 'A golfer holds his finish on an elevated tee at dawn, mist in the valley below.' },

  bestTitle: { id: 'Paling laris', en: 'Best sellers' },
  bestNote: { id: 'Diurutkan dari jumlah terjual.', en: 'Ranked by units sold.' },
  featuredTitle: { id: 'Pilihan', en: 'Featured' },
  featuredNote: { id: 'Pilihan dari koleksi saat ini.', en: 'Selected pieces from the current range.' },
  viewAll: { id: 'Lihat semua', en: 'View all' },
  emptyRangeTitle: { id: 'Semua koleksi kami ada di Tokopedia.', en: 'Our full range is on Tokopedia.' },
  emptyRangeBody: {
    id: 'Katalog sedang kami tampilkan di situs ini. Sementara itu, lihat dan pesan semua produk di toko Tokopedia kami.',
    en: "We're bringing the catalogue to this site. Until then, browse and order every piece on our Tokopedia store.",
  },
  loadingProducts: { id: 'Memuat produk…', en: 'Loading products…' },
  errorTitle: { id: 'Katalog tidak berhasil dimuat.', en: "The catalogue didn't load." },
  errorBody: { id: 'Periksa koneksi lalu coba lagi, atau belanja langsung di Tokopedia.', en: 'Check your connection and try again, or shop directly on Tokopedia.' },
  retry: { id: 'Coba lagi', en: 'Try again' },

  quickView: { id: 'Lihat cepat', en: 'Quick view' },
  viewProduct: { id: 'Lihat produk', en: 'View product' },
  buyTokopedia: { id: 'Beli di Tokopedia', en: 'Buy on Tokopedia' },
  findTokopedia: { id: 'Cari di toko Tokopedia', en: 'Find it on our Tokopedia store' },
  'avail.in_stock': { id: 'Tersedia', en: 'In stock' },
  'avail.low_stock': { id: 'Stok terbatas', en: 'Low stock' },
  'avail.sold_out': { id: 'Habis', en: 'Sold out' },
  'avail.preorder': { id: 'Pre-order', en: 'Pre-order' },
  'avail.unknown': { id: 'Cek stok di Tokopedia', en: 'Check stock on Tokopedia' },
  preorderDays: { id: 'Pre-order, dikirim sekitar {n} hari', en: 'Pre-order, ships in about {n} days' },
  onlyLeft: { id: 'Sisa {n}', en: 'Only {n} left' },
  newBadge: { id: 'Baru', en: 'New' },
  soldCount: { id: '{n} terjual', en: '{n} sold' },
  rank: { id: 'Peringkat {n}', en: 'Rank {n}' },
  priceWas: { id: 'Harga normal', en: 'Was' },
  priceNow: { id: 'Harga sekarang', en: 'Now' },

  catTitle: { id: 'Belanja per kategori', en: 'Shop by category' },
  catCount: { id: '{n} produk', en: '{n} pieces' },
  catCountOne: { id: '1 produk', en: '1 piece' },
  catSoon: { id: 'Di Tokopedia', en: 'On Tokopedia' },

  brandsTitle: { id: 'Belanja per merek', en: 'Shop by brand' },
  brandsBody: { id: 'Setiap merek yang kami jual, masing-masing dengan koleksinya sendiri.', en: 'Every brand we carry, each with its own collection.' },
  brandsIndexTitle: { id: 'Merek', en: 'Brands' },
  brandCount: { id: '{n} produk', en: '{n} products' },
  brandCountOne: { id: '1 produk', en: '1 product' },
  brandsEmptyTitle: { id: 'Belum ada merek yang ditampilkan.', en: 'No brands are listed yet.' },
  allBrands: { id: 'Semua merek', en: 'All brands' },

  edTitle: { id: 'Siap untuk ronde panjang.', en: 'Dressed for the long round.' },
  edBody: {
    id: 'Tee time pagi, panas tropis, delapan belas hole berjalan kaki. Pilih pakaian yang bernapas, tetap rapi bentuknya, dan tetap tampil tenang di green ke-18.',
    en: 'Early tee times, tropical heat, eighteen holes on foot. Choose pieces that breathe, hold their shape and still look composed on the eighteenth green.',
  },
  edCta: { id: 'Belanja kaos polo', en: 'Shop polo shirts' },
  edCaption1: { id: 'Kerah yang tetap rapi, cahaya pagi.', en: 'A collar that keeps its shape, morning light.' },
  edCaption2: { id: 'Berjalan menuju pukulan kedua.', en: 'The walk to the second shot.' },
  edAerial: { id: 'Setiap lapangan punya bentuknya. Begitu juga cara kamu bermain di atasnya.', en: 'Every course has a shape. So does the way you play it.' },
  edAlt1: { id: 'Tangan merapikan kerah polo hijau tua, satu tangan bersarung tangan golf.', en: 'Hands adjusting the collar of a deep green polo, one hand in a golf glove.' },
  edAlt2: { id: 'Pegolf wanita berjalan di fairway berkabut sambil memanggul stik.', en: 'A woman golfer walks a misty fairway with a club over her shoulder.' },
  edAlt3: { id: 'Foto udara fairway dengan garis potong rumput dan bunker pasir.', en: 'Aerial view of a fairway with mowing stripes and a sand bunker.' },
  edAlt4: { id: 'Bendera pin di green saat golden hour, bola di dekat hole.', en: 'A flagstick on the green at golden hour, a ball near the cup.' },

  orderTitle: { id: 'Cara pesan', en: 'How ordering works' },
  order1: { id: 'Pilih produk, warna, dan ukuran di sini.', en: 'Choose a product, colour and size here.' },
  order2: { id: 'Ketuk Beli di Tokopedia. Listing-nya terbuka di aplikasi atau browser.', en: 'Tap Buy on Tokopedia. The listing opens in the app or your browser.' },
  order3: { id: 'Bayar, pilih kurir, dan lacak pengiriman di Tokopedia.', en: 'Pay, choose a courier and track delivery on Tokopedia.' },
  orderNote: {
    id: 'Checkout tidak dilakukan di situs ini: pembayaran, voucher, dan pengiriman diproses oleh Tokopedia.',
    en: "Checkout doesn't happen on this site: payment, vouchers and delivery are handled by Tokopedia.",
  },

  nlTitle: { id: 'Produk baru, lebih dulu.', en: 'New arrivals, first.' },
  nlBody: { id: 'Email sesekali tentang produk baru dan restock.', en: 'Occasional emails about new pieces and restocks.' },
  nlLabel: { id: 'Alamat email', en: 'Email address' },
  nlButton: { id: 'Berlangganan', en: 'Subscribe' },
  nlSending: { id: 'Mendaftarkan…', en: 'Subscribing…' },
  nlDone: { id: 'Terima kasih, kamu sudah terdaftar.', en: "Thanks, you're on the list." },
  nlInvalid: { id: 'Masukkan alamat email yang valid.', en: 'Enter a valid email address.' },
  nlError: { id: 'Pendaftaran belum bisa dilakukan sekarang. Coba lagi nanti.', en: "Sign-up isn't available right now. Try again later." },
  nlPrivacy: { id: 'Email kamu hanya dipakai untuk kabar dari GOLFWEAR.', en: 'We only use your email for GOLFWEAR news.' },

  footAbout: { id: 'Pakaian golf dari Jakarta. Pilih di sini, checkout di Tokopedia.', en: 'Golf apparel from Jakarta. Browse here, check out on Tokopedia.' },
  footShop: { id: 'Belanja', en: 'Shop' },
  footHelp: { id: 'Bantuan', en: 'Help' },
  footFollow: { id: 'Ikuti & hubungi', en: 'Follow & contact' },
  footHowTo: { id: 'Cara pesan', en: 'How to order' },
  footSizing: { id: 'Memilih ukuran', en: 'Choosing a size' },
  footDelivery: { id: 'Pembayaran & pengiriman', en: 'Payment & delivery' },
  footFaq: { id: 'Pertanyaan', en: 'Questions' },
  footChat: { id: 'Chat kami di Tokopedia', en: 'Chat with us on Tokopedia' },
  footRights: { id: 'Hak cipta dilindungi.', en: 'All rights reserved.' },

  shopTitle: { id: 'Semua produk', en: 'All products' },
  resultCount: { id: '{n} produk', en: '{n} products' },
  resultOne: { id: '1 produk', en: '1 product' },
  filters: { id: 'Filter', en: 'Filters' },
  filterCategory: { id: 'Kategori', en: 'Category' },
  filterBrand: { id: 'Merek', en: 'Brand' },
  filterGender: { id: 'Untuk', en: 'For' },
  filterSize: { id: 'Ukuran', en: 'Size' },
  filterPrice: { id: 'Harga (Rp)', en: 'Price (IDR)' },
  filterMin: { id: 'Minimum', en: 'Minimum' },
  filterMax: { id: 'Maksimum', en: 'Maximum' },
  filterAvailability: { id: 'Ketersediaan', en: 'Availability' },
  filterInStock: { id: 'Bisa dipesan sekarang', en: 'Available to order' },
  filterSale: { id: 'Sedang diskon', en: 'On sale' },
  filterAll: { id: 'Semua', en: 'All' },
  clearAll: { id: 'Hapus semua filter', en: 'Clear all filters' },
  showResults: { id: 'Tampilkan {n} produk', en: 'Show {n} products' },
  sortLabel: { id: 'Urutkan', en: 'Sort by' },
  'sort.popular': { id: 'Terpopuler', en: 'Most popular' },
  'sort.newest': { id: 'Terbaru', en: 'Newest' },
  'sort.price-asc': { id: 'Harga terendah', en: 'Price: low to high' },
  'sort.price-desc': { id: 'Harga tertinggi', en: 'Price: high to low' },
  noResults: { id: 'Tidak ada produk yang cocok.', en: 'No products match.' },
  noResultsBody: { id: 'Hapus salah satu filter atau cari kata lain.', en: 'Remove a filter or search for something else.' },
  emptyCollection: { id: 'Belum ada {name} di sini.', en: 'No {name} listed here yet.' },
  emptyCollectionBody: { id: 'Semua koleksi kami tersedia di toko Tokopedia.', en: 'Our full range is available on our Tokopedia store.' },
  resultsFor: { id: 'Hasil untuk "{q}"', en: 'Results for "{q}"' },
  removeFilter: { id: 'Hapus filter {name}', en: 'Remove filter {name}' },

  breadcrumb: { id: 'Navigasi lokasi', en: 'Breadcrumb' },
  selectSize: { id: 'Pilih ukuran', en: 'Choose a size' },
  soldOutSize: { id: '{size}, habis', en: '{size}, sold out' },
  colours: { id: 'Warna', en: 'Colours' },
  description: { id: 'Deskripsi', en: 'Description' },
  specs: { id: 'Spesifikasi', en: 'Specifications' },
  specBrand: { id: 'Merek', en: 'Brand' },
  specCategory: { id: 'Kategori', en: 'Category' },
  specFor: { id: 'Untuk', en: 'For' },
  specSku: { id: 'SKU', en: 'SKU' },
  payNote: { id: 'Pembayaran dan pengiriman diproses oleh Tokopedia.', en: 'Payment and delivery are handled by Tokopedia.' },
  sizeNote: { id: 'Ukuran dipilih lagi saat checkout di Tokopedia.', en: "You'll confirm the size at checkout on Tokopedia." },
  fallbackNote: {
    id: 'Produk ini belum punya link langsung, jadi tombolnya membuka toko Tokopedia kami. Cari "{name}" di sana.',
    en: 'This product has no direct link yet, so the button opens our Tokopedia store. Search for "{name}" there.',
  },
  askWhatsapp: { id: 'Tanya via WhatsApp', en: 'Ask on WhatsApp' },
  askText: { id: 'Halo GOLFWEAR, saya mau tanya tentang {product}{size}.', en: 'Hi GOLFWEAR, I have a question about the {product}{size}.' },
  askSize: { id: ', ukuran {size}', en: ', size {size}' },
  related: { id: 'Mungkin kamu suka', en: 'You may also like' },
  moreFrom: { id: 'Lainnya dari {brand}', en: 'More from {brand}' },
  imageOf: { id: '{name}, foto {n} dari {total}', en: '{name}, image {n} of {total}' },
  showImage: { id: 'Tampilkan foto {n}', en: 'Show image {n}' },
  noImage: { id: 'Belum ada foto', en: 'No photo yet' },
  productMissing: { id: 'Produk ini tidak tersedia di sini.', en: "This product isn't available here." },
  productMissingBody: { id: 'Mungkin sudah tidak dijual atau link-nya berubah.', en: 'It may no longer be listed, or the link has changed.' },
  backToShop: { id: 'Kembali belanja', en: 'Back to the shop' },
  notFoundTitle: { id: 'Halaman tidak ditemukan', en: 'Page not found' },
  notFoundBody: { id: 'Halaman yang kamu cari sudah pindah atau tidak ada.', en: "The page you're looking for has moved or doesn't exist." },

  aboutTitle: { id: 'Tentang GOLFWEAR', en: 'About GOLFWEAR' },
  aboutLede: {
    id: 'GOLFWEAR adalah toko pakaian golf dari Jakarta Barat. Kami memilih pakaian untuk ronde panjang di cuaca tropis, dan menjualnya lewat toko Tokopedia kami.',
    en: 'GOLFWEAR is a golf apparel store from West Jakarta. We choose clothing for long rounds in tropical weather, and sell it through our Tokopedia store.',
  },
  storyTitle: { id: 'Bendera di dalam G', en: 'The flag in the G' },
  story1: {
    id: 'Logo kami adalah huruf G berbentuk ring, dengan bendera pin yang berkibar keluar dari celahnya: detik saat bola masuk ke hole.',
    en: 'Our mark is a G drawn as a ring, with the flag on the pin flying out through its opening: the moment the ball drops.',
  },
  story2: {
    id: 'Kami memasangnya pada perlengkapan untuk ronde panjang di cuaca tropis: ringan, cepat kering, dan menutup kulit dari matahari.',
    en: 'We put it on gear for long rounds in tropical weather: light, quick to dry, and covering skin from the sun.',
  },
  ballHint: { id: 'Geser untuk memutar bola', en: 'Drag to spin the ball' },
  ballLabel: {
    id: 'Bola golf 3D dengan logo GOLFWEAR. Geser atau pakai tombol panah untuk memutar, Enter untuk memantulkan.',
    en: '3D golf ball with the GOLFWEAR mark. Drag or use the arrow keys to spin it, Enter to bounce it.',
  },
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
  q3: { id: 'Apa artinya pre-order?', en: 'What does pre-order mean?' },
  a3: {
    id: 'Produk pre-order disiapkan setelah kamu memesan. Lama prosesnya tertulis di listing Tokopedia dan di halaman produk di sini.',
    en: 'Pre-order pieces are prepared after you order. The processing time is shown on the Tokopedia listing and on the product page here.',
  },
  q5: { id: 'Apakah arm sleeve dijual sepasang?', en: 'Are arm sleeves sold as a pair?' },
  a5: { id: 'Ya. Satu pesanan berisi satu pasang, kiri dan kanan.', en: 'Yes. One order is one pair, left and right.' },
  q4: { id: 'Berapa lama pengirimannya?', en: 'How long does delivery take?' },
  a4: {
    id: 'Pilihan kurir dan perkiraan waktu tiba muncul saat checkout di Tokopedia, sesuai alamatmu.',
    en: 'Courier options and estimated arrival times show at checkout on Tokopedia, based on your address.',
  },
  cursorView: { id: 'Lihat', en: 'View' },
  cursorBuy: { id: 'Beli', en: 'Buy' },
  cursorSpin: { id: 'Putar', en: 'Spin' },
} satisfies Record<string, Text>;

export type Key = keyof typeof T;

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
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
    const fmt = new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-US');
    return {
      lang,
      setLang,
      t: (key, vars) => {
        let s: string = T[key]?.[lang] ?? String(key);
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
        return s;
      },
      num: (n) => fmt.format(n),
    };
  }, [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang outside LangProvider');
  return ctx;
}
