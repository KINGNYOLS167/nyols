const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('id-ID');

export const rupiah = (n) => idr.format(n).replace(/ /g, ' ');
export const count = (n) => num.format(n);
export const pad2 = (n) => String(n).padStart(2, '0');

/** Escape text before putting it in an HTML template string. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
