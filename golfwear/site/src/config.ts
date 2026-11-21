// Store settings. Edit these; everything on the site reads from here.
import type { Text } from './data/products';

export const STORE = {
  name: 'GOLFWEAR',
  tokopediaUrl: 'https://www.tokopedia.com/golfwear',
  /** International format without "+", e.g. "6281234567890". Empty hides the WhatsApp buttons. */
  whatsapp: '',
  /** Instagram handle without "@". Empty hides the link. */
  instagram: '',
  location: 'Jakarta Barat, Indonesia',
  /** From the Tokopedia store page (19 Nov 2026); update them now and then. */
  stats: { rating: 4.8, reviews: 21100, sold: 64000 },
};

/** The rotating messages in the bar above the header. Keep each one short and true. */
export const ANNOUNCEMENTS: Text[] = [
  { id: 'Koleksi GOLFWEAR segera hadir di Tokopedia', en: 'The GOLFWEAR collection is coming to Tokopedia' },
  { id: 'Semua pembelian diselesaikan dengan aman di Tokopedia', en: 'Every purchase is completed securely on Tokopedia' },
  { id: 'Toko kami: rating 4,8 dari 21.100 ulasan di Tokopedia', en: 'Our store: rated 4.8 from 21,100 Tokopedia reviews' },
];
