import { isBestSeller, isNew, isOnSale, discountPct } from '../lib/catalog.js';
import { count, esc, pad2, rupiah } from '../lib/format.js';
import { productMedia } from '../lib/garments.js';
import { BAG_ICON, linkAttrs, productUrl } from '../lib/tokopedia.js';

export const productHref = (p) => `product.html?id=${encodeURIComponent(p.id)}`;

export function priceHTML(p) {
  return `<span class="price${isOnSale(p) ? ' price--sale' : ''}">${rupiah(p.price)}</span>${
    isOnSale(p) ? ` <s class="price-was" aria-label="Was ${rupiah(p.compareAt)}">${rupiah(p.compareAt)}</s>` : ''
  }`;
}

export function badgesHTML(p) {
  const out = [];
  if (isBestSeller(p)) out.push(`<span class="badge badge--best">Best Seller</span>`);
  if (isNew(p)) out.push(`<span class="badge badge--new">New</span>`);
  if (isOnSale(p)) out.push(`<span class="badge badge--sale">−${discountPct(p)}%</span>`);
  return out.join('');
}

export function swatchesHTML(p, max = 4) {
  const shown = p.colors.slice(0, max);
  const more = p.colors.length - shown.length;
  return `<ul class="swatches" aria-label="${p.colors.length} colour${p.colors.length > 1 ? 's' : ''}">${shown
    .map((c) => `<li class="swatch" style="--swatch:${c.hex}" title="${esc(c.name)}"><span class="sr-only">${esc(c.name)}</span></li>`)
    .join('')}${more > 0 ? `<li class="swatch-more">+${more}</li>` : ''}</ul>`;
}

/** Product tile. `showRank` adds the large "No. 01" numeral used in best-seller rails. */
export function productCard(p, { showRank = false, eager = false } = {}) {
  return `<article class="card" data-reveal>
    <div class="card__media">
      <div class="card__badges">${badgesHTML(p)}</div>
      ${showRank ? `<span class="card__rank" aria-label="Rank ${p.rank}">${pad2(p.rank)}</span>` : ''}
      ${productMedia(p, 0, { eager })}
    </div>
    <div class="card__body">
      <p class="card__brand">${esc(p.brandName)}</p>
      <h3 class="card__title"><a class="card__link" href="${productHref(p)}">${esc(p.name)}</a></h3>
      ${swatchesHTML(p)}
      <p class="card__price">${priceHTML(p)}</p>
      <p class="card__sold">${count(p.sold)} sold</p>
    </div>
    <a class="card__buy" href="${productUrl(p)}" ${linkAttrs} aria-label="Buy ${esc(p.name)} on Tokopedia (opens new tab)">${BAG_ICON}<span>Buy on Tokopedia</span></a>
  </article>`;
}
