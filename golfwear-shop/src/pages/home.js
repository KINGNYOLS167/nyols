import '../styles/base.css';
import '../styles/pages.css';
import { mountLayout } from '../components/layout.js';
import { priceHTML, productCard, productHref } from '../components/productCard.js';
import { bestSellers, brands, categories, isNew, isOnSale, minPriceBy, products } from '../lib/catalog.js';
import { count, esc, rupiah } from '../lib/format.js';
import { garmentSVG, productMedia } from '../lib/garments.js';
import { heroIntro, reveal } from '../lib/motion.js';
import { BAG_ICON, linkAttrs, productUrl, shopUrl } from '../lib/tokopedia.js';

mountLayout();
const $ = (sel) => document.querySelector(sel);
document.querySelectorAll('[data-store-link]').forEach((a) => (a.href = shopUrl()));

// Product "type" groups used by the best-seller tabs and the brand explorer.
const TYPES = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'clothing', label: 'Clothing', test: (p) => ['polo', 'longsleeve', 'outerwear', 'bottoms'].includes(p.category) },
  { id: 'sleeves', label: 'Arm Sleeves', test: (p) => p.category === 'sleeves' },
  { id: 'headwear', label: 'Headwear', test: (p) => p.category === 'headwear' },
  { id: 'gloves', label: 'Gloves', test: (p) => p.category === 'gloves' },
];
const sumSold = (list) => list.reduce((n, p) => n + p.sold, 0);

/* ---------- Hero: the No. 1 best seller ---------- */
function renderHero() {
  const [top, ...next] = bestSellers(3);
  $('[data-hero-stats]').innerHTML = `
    <div><dt>Styles</dt><dd>${products.length}</dd></div>
    <div><dt>Brands</dt><dd>${brands.length}</dd></div>
    <div><dt>Pieces sold</dt><dd>${count(sumSold(products))}+</dd></div>`;
  $('[data-hero-feature]').innerHTML = `
    <article class="feature" data-hero-card>
      <div class="feature__tag"><span class="feature__rank">No. 1</span><span>Best Seller</span></div>
      <a class="feature__media" href="${productHref(top)}" data-hero-art aria-label="View ${esc(top.name)}">${productMedia(top, 0, { eager: true })}</a>
      <div class="feature__info">
        <div>
          <p class="card__brand">${esc(top.brandName)}</p>
          <h2 class="feature__name"><a href="${productHref(top)}">${esc(top.name)}</a></h2>
          <p class="feature__meta">${priceHTML(top)} <span class="dot" aria-hidden="true">·</span> <span class="muted">${count(top.sold)} sold</span></p>
        </div>
        <div class="feature__colors" role="radiogroup" aria-label="Preview colour">
          ${top.colors.map((c, i) => `<button type="button" role="radio" class="swatch-btn" style="--swatch:${c.hex}" aria-checked="${i === 0}" data-color="${i}"><span class="sr-only">${esc(c.name)}</span></button>`).join('')}
        </div>
        <div class="feature__ctas">
          <a class="btn btn--tokopedia" href="${productUrl(top)}" ${linkAttrs}>${BAG_ICON}<span>Buy on Tokopedia</span></a>
          <a class="btn btn--ghost" href="${productHref(top)}">Details</a>
        </div>
      </div>
    </article>
    <div class="trending" data-hero-card>
      <p class="trending__label">Also trending</p>
      ${next.map((p) => `<a class="trending__item" href="${productHref(p)}">
        <span class="trending__thumb">${productMedia(p)}</span>
        <span><span class="trending__rank">No. ${p.rank}</span><span class="trending__name">${esc(p.name)}</span><span class="trending__price">${rupiah(p.price)}</span></span>
      </a>`).join('')}
    </div>`;
  const media = $('.feature__media');
  $('.feature__colors').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-color]');
    if (!btn) return;
    media.innerHTML = productMedia(top, Number(btn.dataset.color));
    btn.parentElement.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
  });
}

/* ---------- Tabs helper (roving arrow-key focus) ---------- */
function tabs(container, items, current, onSelect, labelFn = (t) => t.label) {
  container.innerHTML = items
    .map((t) => `<button type="button" role="tab" class="chip" id="tab-${container.dataset.key}-${t.id}" aria-selected="${t.id === current}" tabindex="${t.id === current ? 0 : -1}" data-id="${t.id}">${labelFn(t)}</button>`)
    .join('');
  container.onclick = (e) => {
    const btn = e.target.closest('[role="tab"]');
    if (btn) onSelect(btn.dataset.id, true);
  };
  container.onkeydown = (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    const btns = [...container.querySelectorAll('[role="tab"]')];
    const i = btns.indexOf(document.activeElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? btns.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length;
    e.preventDefault();
    btns[next].focus();
    onSelect(btns[next].dataset.id, true);
  };
}

/* ---------- Best sellers ---------- */
function renderBest(typeId = 'all', keepFocus = false) {
  const type = TYPES.find((t) => t.id === typeId);
  const box = $('[data-best-tabs]');
  box.dataset.key = 'best';
  tabs(box, TYPES, typeId, renderBest);
  if (keepFocus) box.querySelector(`[data-id="${typeId}"]`).focus();
  $('[data-best-grid]').innerHTML = bestSellers(8, type.test).map((p) => productCard(p, { showRank: true })).join('');
  reveal($('[data-best-grid]'));
}

/* ---------- Categories, ordered by units sold ---------- */
function renderCategories() {
  const cats = categories
    .map((c) => ({ ...c, items: products.filter((p) => p.category === c.id) }))
    .sort((a, b) => sumSold(b.items) - sumSold(a.items));
  $('[data-cat-grid]').innerHTML = cats
    .map((c, i) => {
      const hero = c.items.sort((a, b) => a.rank - b.rank)[0];
      return `<a class="cat-tile${i === 0 ? ' cat-tile--lg' : ''}" href="shop.html?category=${c.id}" data-reveal>
        <span class="cat-tile__art">${garmentSVG(hero.shape, hero.colors[0].hex)}</span>
        <span class="cat-tile__text">
          <span class="cat-tile__name">${esc(c.name)}</span>
          <span class="cat-tile__meta">${c.items.length} styles · <span class="nowrap">from ${rupiah(minPriceBy('category', c.id))}</span></span>
        </span>
      </a>`;
    })
    .join('');
}

/* ---------- Brand explorer: brand tabs → type chips → products ---------- */
const brandOrder = brands
  .map((b) => ({ ...b, items: products.filter((p) => p.brand === b.id) }))
  .sort((a, b) => sumSold(b.items) - sumSold(a.items));

function renderBrand(brandId = brandOrder[0].id, keepFocus = false, typeId = 'all') {
  const brand = brandOrder.find((b) => b.id === brandId);
  const box = $('[data-brand-tabs]');
  box.dataset.key = 'brand';
  tabs(box, brandOrder, brandId, (id, f) => renderBrand(id, f), (b) => `<span class="brand-tab__name">${esc(b.name)}</span><span class="count">${b.items.length}</span>`);
  if (keepFocus) box.querySelector(`[data-id="${brandId}"]`).focus();
  const panel = $('[data-brand-panel]');
  panel.setAttribute('aria-labelledby', `tab-brand-${brandId}`);
  const available = TYPES.filter((t) => t.id === 'all' || brand.items.some(t.test));
  const top = [...brand.items].sort((a, b) => a.rank - b.rank)[0];

  const draw = (tid) => {
    const type = TYPES.find((t) => t.id === tid);
    const list = brand.items.filter(type.test).sort((a, b) => a.rank - b.rank);
    panel.querySelector('[data-brand-grid]').innerHTML = list.map((p) => productCard(p)).join('');
    panel.querySelectorAll('[data-type]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.type === tid)));
  };

  panel.innerHTML = `
    <div class="brand-panel__head">
      <div>
        <p class="eyebrow">${esc(brand.origin)}</p>
        <h3 class="brand-panel__name">${esc(brand.name)}</h3>
        <p class="brand-panel__blurb">${esc(brand.blurb)}</p>
      </div>
      <dl class="brand-panel__stats">
        <div><dt>Styles</dt><dd>${brand.items.length}</dd></div>
        <div><dt>From</dt><dd>${rupiah(minPriceBy('brand', brand.id))}</dd></div>
        <div><dt>Top seller</dt><dd><a href="${productHref(top)}">${esc(top.name)}</a></dd></div>
      </dl>
    </div>
    <div class="chips" role="group" aria-label="Filter ${esc(brand.name)} by type">
      ${available.map((t) => `<button type="button" class="chip" data-type="${t.id}" aria-pressed="${t.id === typeId}">${t.label} <span class="count">${brand.items.filter(t.test).length}</span></button>`).join('')}
    </div>
    <div class="grid" data-brand-grid></div>
    <p class="section-foot"><a class="link-arrow" href="shop.html?brand=${brand.id}">Shop all ${esc(brand.name)}</a></p>`;
  panel.querySelector('.chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-type]');
    if (chip) draw(chip.dataset.type);
  });
  draw(typeId);
}

/* ---------- New & on sale ---------- */
function renderNew() {
  const list = products.filter((p) => isNew(p) || isOnSale(p)).sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 4);
  $('[data-new-grid]').innerHTML = list.map((p) => productCard(p)).join('');
}

renderHero();
renderBest();
renderCategories();
renderBrand();
renderNew();
heroIntro($('[data-hero]'));
reveal();
