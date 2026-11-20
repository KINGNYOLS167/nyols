import '../styles/base.css';
import '../styles/pages.css';
import { STORE } from '../config.js';
import { mountLayout } from '../components/layout.js';
import { badgesHTML, priceHTML, productCard } from '../components/productCard.js';
import { discountPct, getProduct, isBestSeller, isOnSale, products } from '../lib/catalog.js';
import { count, esc } from '../lib/format.js';
import { productMedia } from '../lib/garments.js';
import { reveal } from '../lib/motion.js';
import { BAG_ICON, linkAttrs, productUrl, shopUrl } from '../lib/tokopedia.js';

mountLayout();
const $ = (sel) => document.querySelector(sel);
const root = $('[data-product]');
const product = getProduct(new URLSearchParams(location.search).get('id'));

// General size guide by product type. Brand charts vary — the listing on Tokopedia is the final reference.
const SIZE_GUIDES = {
  men: { head: ['Size', 'Chest (cm)', 'Length (cm)'], rows: [['S', '96–101', '70'], ['M', '101–106', '72'], ['L', '106–111', '74'], ['XL', '111–117', '76'], ['XXL', '117–122', '78']] },
  women: { head: ['Size', 'Bust (cm)', 'Waist (cm)'], rows: [['XS', '80–84', '62–66'], ['S', '84–88', '66–70'], ['M', '88–92', '70–74'], ['L', '92–97', '74–79'], ['XL', '97–102', '79–84']] },
  pants: { head: ['Size', 'Waist (cm)', 'Inseam (cm)'], rows: [['30', '76', '81'], ['32', '81', '81'], ['34', '86', '81'], ['36', '91', '81'], ['38', '97', '81']] },
  sleeves: { head: ['Size', 'Bicep (cm)', 'Length (cm)'], rows: [['S/M', '24–30', '45'], ['L/XL', '30–36', '48']] },
  gloves: { head: ['Size', 'Hand around knuckles (cm)'], rows: [['S', '18–19'], ['M', '19–20'], ['ML', '20–21'], ['L', '21–22'], ['XL', '22–23']] },
  headwear: { head: ['Size', 'Head circumference (cm)'], rows: [['Adjustable', '55–60']] },
};
function sizeGuide(p) {
  if (p.category === 'sleeves') return SIZE_GUIDES.sleeves;
  if (p.category === 'gloves') return SIZE_GUIDES.gloves;
  if (p.category === 'headwear') return SIZE_GUIDES.headwear;
  if (p.category === 'bottoms' && p.gender === 'men') return SIZE_GUIDES.pants;
  return p.gender === 'women' ? SIZE_GUIDES.women : SIZE_GUIDES.men;
}

function notFound() {
  document.title = 'Product not found';
  root.innerHTML = `<div class="empty empty--page"><h1>We couldn't find that product</h1><p>It may have sold out or moved.</p>
    <div class="empty__ctas"><a class="btn" href="shop.html">Browse all products</a><a class="btn btn--ghost" href="shop.html?sort=bestselling">Best sellers</a></div></div>`;
  $('[data-related-section]').hidden = true;
}

function stockLine(p) {
  if (p.stock <= 0) return '<p class="stock stock--out">Out of stock — check Tokopedia for restock</p>';
  if (p.stock <= STORE.lowStockThreshold) return `<p class="stock stock--low">Only ${p.stock} left</p>`;
  return '<p class="stock stock--in">In stock, ready to ship</p>';
}

function render(p) {
  document.title = `${p.brandName} ${p.name} — ${STORE.name}`;
  document.querySelector('meta[name="description"]').setAttribute('content', p.description);
  const guide = sizeGuide(p);
  const askHref = STORE.whatsapp
    ? `https://wa.me/${encodeURIComponent(STORE.whatsapp)}?text=${encodeURIComponent(`Hi, I'd like to ask about ${p.brandName} ${p.name} (${p.sku}).`)}`
    : shopUrl();

  root.innerHTML = `
    <nav class="crumbs" aria-label="Breadcrumb"><ol>
      <li><a href="./">Home</a></li><li><a href="shop.html?category=${p.category}">${esc(p.categoryName)}</a></li>
      <li><a href="shop.html?brand=${p.brand}">${esc(p.brandName)}</a></li><li aria-current="page">${esc(p.name)}</li>
    </ol></nav>
    <div class="pdp">
      <div class="pdp__gallery">
        <div class="pdp__stage">
          <div class="card__badges">${badgesHTML(p)}</div>
          <div class="pdp__media" data-media>${productMedia(p, 0, { eager: true })}</div>
        </div>
        ${p.colors.length > 1 ? `<div class="pdp__thumbs" aria-hidden="true">${p.colors.map((c, i) => `<button type="button" tabindex="-1" class="pdp__thumb${i === 0 ? ' is-active' : ''}" data-thumb="${i}">${productMedia(p, i)}</button>`).join('')}</div>` : ''}
      </div>

      <div class="pdp__info">
        <a class="pdp__brand" href="shop.html?brand=${p.brand}">${esc(p.brandName)}</a>
        <h1 class="pdp__title">${esc(p.name)}</h1>
        <p class="pdp__price">${priceHTML(p)}${isOnSale(p) ? ` <span class="badge badge--sale">Save ${discountPct(p)}%</span>` : ''}</p>
        <p class="pdp__social">${isBestSeller(p) ? `<span class="pdp__rank">No. ${p.rank} best seller</span> · ` : ''}${count(p.sold)} sold</p>
        ${stockLine(p)}

        <fieldset class="option">
          <legend>Colour: <strong data-color-name>${esc(p.colors[0].name)}</strong></legend>
          <div class="option__row" role="radiogroup" aria-label="Colour">
            ${p.colors.map((c, i) => `<button type="button" role="radio" class="swatch-btn swatch-btn--lg" style="--swatch:${c.hex}" aria-checked="${i === 0}" data-color="${i}" aria-label="${esc(c.name)}"></button>`).join('')}
          </div>
        </fieldset>

        <fieldset class="option">
          <legend>Size: <strong data-size-name>${p.sizes.length === 1 ? esc(p.sizes[0]) : 'Select'}</strong></legend>
          <div class="option__row" role="radiogroup" aria-label="Size">
            ${p.sizes.map((s) => `<button type="button" role="radio" class="size-btn" aria-checked="${p.sizes.length === 1}" data-size="${esc(s)}">${esc(s)}</button>`).join('')}
          </div>
        </fieldset>

        <div class="pdp__buy">
          <a class="btn btn--tokopedia btn--lg btn--block" href="${productUrl(p)}" ${linkAttrs}>${BAG_ICON}<span>Buy on Tokopedia</span></a>
          <p class="pdp__note" data-buy-note>Choose <strong>${esc(p.colors[0].name)}</strong>${p.sizes.length === 1 ? '' : ' and your size'} on the Tokopedia listing. Checkout opens in a new tab.</p>
          <a class="btn btn--ghost btn--block" href="${askHref}" ${linkAttrs}>${STORE.whatsapp ? 'Ask about sizing on WhatsApp' : 'Ask us on Tokopedia chat'}</a>
        </div>

        <div class="accordion">
          <details open><summary>Details</summary>
            <div class="accordion__body"><p>${esc(p.description)}</p><ul class="ticks">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
            <p class="muted small">SKU ${esc(p.sku)} · ${esc(p.categoryName)} · ${p.gender === 'unisex' ? 'Unisex' : p.gender === 'men' ? 'Men' : 'Women'}</p></div>
          </details>
          <details><summary>Size guide</summary>
            <div class="accordion__body">
              <div class="table-wrap"><table class="size-table"><thead><tr>${guide.head.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead>
              <tbody>${guide.rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>
              <p class="muted small">General guide. Brand fits vary — check the size chart on the Tokopedia listing or ask us before ordering.</p>
            </div>
          </details>
          <details><summary>Delivery &amp; returns</summary>
            <div class="accordion__body"><p>Orders are placed and paid on Tokopedia. Pick your courier at checkout and track the parcel in the Tokopedia app. Returns and complaints follow Tokopedia's buyer-protection process — open a complaint from your order page before confirming receipt.</p></div>
          </details>
        </div>
      </div>
    </div>`;

  const media = root.querySelector('[data-media]');
  const note = root.querySelector('[data-buy-note]');
  let color = 0;
  let size = p.sizes.length === 1 ? p.sizes[0] : '';
  const setNote = () => {
    note.innerHTML = `Choose <strong>${esc(p.colors[color].name)}</strong>${size ? `, size <strong>${esc(size)}</strong>` : ' and your size'} on the Tokopedia listing. Checkout opens in a new tab.`;
  };
  const setColor = (i) => {
    color = i;
    media.innerHTML = productMedia(p, i, { eager: true });
    root.querySelector('[data-color-name]').textContent = p.colors[i].name;
    root.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.color) === i)));
    root.querySelectorAll('[data-thumb]').forEach((b) => b.classList.toggle('is-active', Number(b.dataset.thumb) === i));
    setNote();
  };
  root.addEventListener('click', (e) => {
    const c = e.target.closest('[data-color], [data-thumb]');
    if (c) setColor(Number(c.dataset.color ?? c.dataset.thumb));
    const s = e.target.closest('[data-size]');
    if (s) {
      size = s.dataset.size;
      root.querySelector('[data-size-name]').textContent = size;
      root.querySelectorAll('[data-size]').forEach((b) => b.setAttribute('aria-checked', String(b === s)));
      setNote();
    }
  });

  // Structured data so search engines can show price and availability.
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${p.brandName} ${p.name}`,
    sku: p.sku,
    brand: { '@type': 'Brand', name: p.brandName },
    description: p.description,
    offers: { '@type': 'Offer', priceCurrency: 'IDR', price: p.price, availability: `https://schema.org/${p.stock > 0 ? 'InStock' : 'OutOfStock'}`, url: productUrl(p) },
  });
  document.head.append(ld);
}

function renderRelated(p) {
  const sameBrand = products.filter((x) => x.brand === p.brand && x.category !== p.category).sort((a, b) => a.rank - b.rank);
  const sameCat = products.filter((x) => x.category === p.category && x.id !== p.id).sort((a, b) => a.rank - b.rank);
  const picks = [...new Map([...sameBrand, ...sameCat].map((x) => [x.id, x])).values()].slice(0, 4);
  $('[data-related-eyebrow]').textContent = sameBrand.length ? `More from ${p.brandName}` : 'Similar styles';
  $('[data-related-title]').textContent = 'Complete the look';
  $('[data-related]').innerHTML = picks.map((x) => productCard(x)).join('');
}

if (product) {
  render(product);
  renderRelated(product);
  reveal();
} else {
  notFound();
}
