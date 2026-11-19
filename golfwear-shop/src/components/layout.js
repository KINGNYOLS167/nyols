import { STORE } from '../config.js';
import { bestSellers, brands, categories, countBy, products, searchProducts } from '../lib/catalog.js';
import { esc, rupiah } from '../lib/format.js';
import { productMedia } from '../lib/garments.js';
import { initSmoothScroll, lockScroll } from '../lib/motion.js';
import { BAG_ICON, linkAttrs, shopUrl } from '../lib/tokopedia.js';
import { productHref } from './productCard.js';

const ICON = {
  search: '<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  menu: '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
  close: '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  chevron: '<svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  arrow: '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  chat: '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.3L4 20Z"/></svg>',
};
export { ICON };

const catCounts = countBy('category');
const brandCounts = countBy('brand');
const clothing = categories.filter((c) => c.group === 'clothing');
const gear = categories.filter((c) => c.group !== 'clothing');
const catLink = (c) => `<li><a href="shop.html?category=${c.id}">${esc(c.name)} <span class="muted">${catCounts.get(c.id) ?? 0}</span></a></li>`;
const brandLink = (b) => `<li><a href="shop.html?brand=${b.id}">${esc(b.name)} <span class="muted">${brandCounts.get(b.id) ?? 0}</span></a></li>`;

function logo() {
  return `<a class="logo" href="./" aria-label="${esc(STORE.name)} home">
    <svg aria-hidden="true" viewBox="0 0 32 32" width="30" height="30"><circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M12 24V8l9 4-9 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
    <span class="logo__word">${esc(STORE.shortName)}</span><span class="logo__sub">Golf</span>
  </a>`;
}

function header() {
  const top = bestSellers(1)[0];
  return `<a class="skip-link" href="#main">Skip to content</a>
  <div class="announce"><div class="container announce__inner">
    <p>Every order checks out on Tokopedia — protected payment and tracked delivery.</p>
    <a href="${shopUrl()}" ${linkAttrs}>Visit our store ${ICON.arrow}</a>
  </div></div>
  <header class="site-header" data-header>
    <div class="container site-header__inner">
      ${logo()}
      <nav class="main-nav" aria-label="Main">
        <ul class="main-nav__list">
          <li><a href="shop.html?sort=bestselling">Best Sellers</a></li>
          <li class="has-mega">
            <button class="main-nav__trigger" type="button" aria-expanded="false" aria-controls="mega-shop">Shop ${ICON.chevron}</button>
            <div class="mega" id="mega-shop" hidden>
              <div class="container mega__grid">
                <div><p class="mega__title">Clothing</p><ul>${clothing.map(catLink).join('')}</ul></div>
                <div><p class="mega__title">Sleeves &amp; Gear</p><ul>${gear.map(catLink).join('')}</ul>
                  <p class="mega__title mega__title--spaced">Shop for</p>
                  <ul><li><a href="shop.html?gender=men,unisex">Men</a></li><li><a href="shop.html?gender=women,unisex">Women</a></li><li><a href="shop.html">All products <span class="muted">${products.length}</span></a></li></ul>
                </div>
                <div><p class="mega__title">Brands</p><ul class="mega__brands">${brands.map(brandLink).join('')}</ul></div>
                <a class="mega__feature" href="${productHref(top)}">
                  <span class="mega__feature-media">${productMedia(top)}</span>
                  <span class="eyebrow">No. 1 Best Seller</span>
                  <span class="mega__feature-name">${esc(top.brandName)} ${esc(top.name)}</span>
                  <span class="mega__feature-price">${rupiah(top.price)}</span>
                </a>
              </div>
            </div>
          </li>
          <li><a href="shop.html?gender=men,unisex">Men</a></li>
          <li><a href="shop.html?gender=women,unisex">Women</a></li>
          <li><a href="shop.html?category=sleeves">Arm Sleeves</a></li>
          <li><a href="./#brands">Brands</a></li>
        </ul>
      </nav>
      <div class="site-header__actions">
        <button class="icon-btn" type="button" data-open-search aria-label="Search products">${ICON.search}</button>
        <a class="btn btn--tokopedia btn--sm header-cta" href="${shopUrl()}" ${linkAttrs}>${BAG_ICON}<span>Tokopedia Store</span></a>
        <button class="icon-btn menu-btn" type="button" data-open-drawer aria-label="Open menu" aria-expanded="false" aria-controls="drawer">${ICON.menu}</button>
      </div>
    </div>
  </header>
  <div class="drawer" id="drawer" hidden>
    <div class="drawer__backdrop" data-close-drawer></div>
    <div class="drawer__panel" role="dialog" aria-modal="true" aria-label="Menu">
      <div class="drawer__head">${logo()}<button class="icon-btn" type="button" data-close-drawer aria-label="Close menu">${ICON.close}</button></div>
      <nav class="drawer__nav" aria-label="Mobile">
        <a class="drawer__link" href="shop.html?sort=bestselling">Best Sellers</a>
        <a class="drawer__link" href="shop.html?gender=men,unisex">Men</a>
        <a class="drawer__link" href="shop.html?gender=women,unisex">Women</a>
        <details class="drawer__group" open><summary>Categories ${ICON.chevron}</summary><ul>${categories.map(catLink).join('')}</ul></details>
        <details class="drawer__group"><summary>Brands ${ICON.chevron}</summary><ul>${brands.map(brandLink).join('')}</ul></details>
      </nav>
      <a class="btn btn--tokopedia btn--block" href="${shopUrl()}" ${linkAttrs}>${BAG_ICON}<span>Open our Tokopedia store</span></a>
    </div>
  </div>
  <dialog class="search" data-search aria-label="Search products">
    <form class="search__form" method="get" action="shop.html" role="search">
      <label class="sr-only" for="search-input">Search products</label>
      ${ICON.search}
      <input id="search-input" name="q" type="search" placeholder="Search polos, arm sleeves, FootJoy…" autocomplete="off">
      <button class="icon-btn" type="button" data-close-search aria-label="Close search">${ICON.close}</button>
    </form>
    <div class="search__body">
      <p class="search__label" data-search-label>Popular right now</p>
      <ul class="search__results" data-search-results aria-live="polite"></ul>
    </div>
  </dialog>`;
}

function footer() {
  const wa = STORE.whatsapp ? `<li><a href="https://wa.me/${encodeURIComponent(STORE.whatsapp)}" ${linkAttrs}>${ICON.chat} WhatsApp</a></li>` : '';
  const ig = STORE.instagram ? `<li><a href="https://instagram.com/${encodeURIComponent(STORE.instagram)}" ${linkAttrs}>Instagram</a></li>` : '';
  const mail = STORE.email ? `<li><a href="mailto:${esc(STORE.email)}">${esc(STORE.email)}</a></li>` : '';
  return `<footer class="site-footer">
    <div class="container site-footer__grid">
      <div class="site-footer__brand">
        ${logo()}
        <p>${esc(STORE.tagline)} from the brands golfers trust. Browse here, check out safely on Tokopedia.</p>
        <a class="btn btn--tokopedia" href="${shopUrl()}" ${linkAttrs}>${BAG_ICON}<span>Visit Tokopedia Store</span></a>
      </div>
      <div><p class="site-footer__title">Shop</p><ul>${categories.map((c) => `<li><a href="shop.html?category=${c.id}">${esc(c.name)}</a></li>`).join('')}</ul></div>
      <div><p class="site-footer__title">Brands</p><ul>${brands.map((b) => `<li><a href="shop.html?brand=${b.id}">${esc(b.name)}</a></li>`).join('')}</ul></div>
      <div><p class="site-footer__title">Help</p><ul>
        <li><a href="shop.html?sort=bestselling">Best sellers</a></li>
        <li><a href="./#how-to-order">How to order</a></li>
        <li><a href="${shopUrl()}" ${linkAttrs}>Tokopedia store</a></li>
        ${wa}${ig}${mail}
      </ul></div>
    </div>
    <div class="container site-footer__base">
      <p>© ${new Date().getFullYear()} ${esc(STORE.name)} · ${esc(STORE.location)}</p>
      <p>Brand names belong to their owners. Prices in Indonesian Rupiah.</p>
    </div>
  </footer>`;
}

function setupMega(root) {
  const item = root.querySelector('.has-mega');
  const trigger = item.querySelector('.main-nav__trigger');
  const panel = item.querySelector('.mega');
  let closeTimer;
  const set = (open) => {
    clearTimeout(closeTimer);
    trigger.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    item.classList.toggle('is-open', open);
  };
  trigger.addEventListener('click', () => set(trigger.getAttribute('aria-expanded') !== 'true'));
  item.addEventListener('mouseenter', () => set(true));
  item.addEventListener('mouseleave', () => { closeTimer = setTimeout(() => set(false), 140); });
  item.addEventListener('focusout', (e) => { if (!item.contains(e.relatedTarget)) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { set(false); trigger.focus(); } });
}

function setupDrawer() {
  const drawer = document.getElementById('drawer');
  const openBtn = document.querySelector('[data-open-drawer]');
  const set = (open) => {
    drawer.hidden = !open;
    openBtn.setAttribute('aria-expanded', String(open));
    lockScroll(open);
    if (open) drawer.querySelector('[data-close-drawer].icon-btn').focus();
    else openBtn.focus();
  };
  openBtn.addEventListener('click', () => set(true));
  drawer.querySelectorAll('[data-close-drawer]').forEach((el) => el.addEventListener('click', () => set(false)));
  drawer.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
}

function setupSearch() {
  const dialog = document.querySelector('[data-search]');
  const input = dialog.querySelector('input');
  const list = dialog.querySelector('[data-search-results]');
  const label = dialog.querySelector('[data-search-label]');
  const render = () => {
    const q = input.value.trim();
    const hits = q ? searchProducts(q).sort((a, b) => a.rank - b.rank).slice(0, 6) : bestSellers(6);
    label.textContent = q ? `${hits.length ? 'Top matches' : 'No matches'} for “${q}”` : 'Popular right now';
    list.innerHTML = hits
      .map((p) => `<li><a class="search__hit" href="${productHref(p)}"><span class="search__thumb">${productMedia(p)}</span>
        <span><span class="search__brand">${esc(p.brandName)}</span><span class="search__name">${esc(p.name)}</span></span>
        <span class="search__price">${rupiah(p.price)}</span></a></li>`)
      .join('');
  };
  document.querySelectorAll('[data-open-search]').forEach((b) =>
    b.addEventListener('click', () => { render(); dialog.showModal(); lockScroll(true); input.focus(); }));
  dialog.querySelector('[data-close-search]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => lockScroll(false));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  input.addEventListener('input', render);
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !dialog.open && !/input|textarea|select/i.test(document.activeElement?.tagName)) {
      e.preventDefault();
      document.querySelector('[data-open-search]').click();
    }
  });
}

function setupHeaderState() {
  const headerEl = document.querySelector('[data-header]');
  const onScroll = () => headerEl.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/** Mount header + footer around the page's <main id="main">. */
export function mountLayout() {
  document.body.insertAdjacentHTML('afterbegin', header());
  document.body.insertAdjacentHTML('beforeend', footer());
  setupMega(document);
  setupDrawer();
  setupSearch();
  setupHeaderState();
  initSmoothScroll();
}
