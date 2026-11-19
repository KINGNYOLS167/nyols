import '../styles/base.css';
import '../styles/pages.css';
import { mountLayout } from '../components/layout.js';
import { productCard } from '../components/productCard.js';
import {
  GENDERS, PRICE_BANDS, SORTS, brands, categories, getBrand, getCategory, isOnSale, products, searchProducts,
} from '../lib/catalog.js';
import { esc } from '../lib/format.js';
import { lockScroll, reducedMotion } from '../lib/motion.js';

mountLayout();
const $ = (sel) => document.querySelector(sel);

const SIZE_ORDER = ['XS', 'S', 'M', 'ML', 'L', 'XL', 'XXL', 'S/M', 'L/XL', '30', '32', '34', '36', '38', 'Adjustable'];
const allSizes = [...new Set(products.flatMap((p) => p.sizes))].sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
const bandById = new Map(PRICE_BANDS.map((b) => [b.id, b]));

const FACETS = [
  { key: 'category', label: 'Category', options: categories.map((c) => ({ id: c.id, label: c.name })), match: (p, v) => v.includes(p.category) },
  { key: 'brand', label: 'Brand', options: brands.map((b) => ({ id: b.id, label: b.name })), match: (p, v) => v.includes(p.brand) },
  { key: 'gender', label: 'Gender', options: GENDERS, match: (p, v) => v.includes(p.gender) },
  { key: 'size', label: 'Size', chips: true, options: allSizes.map((s) => ({ id: s, label: s })), match: (p, v) => p.sizes.some((s) => v.includes(s)) },
  { key: 'price', label: 'Price', options: PRICE_BANDS, match: (p, v) => v.some((id) => p.price >= bandById.get(id).min && p.price <= bandById.get(id).max) },
];

/* ---------- State <-> URL ---------- */
const params = new URLSearchParams(location.search);
const state = {
  q: params.get('q')?.trim() ?? '',
  sort: SORTS[params.get('sort')] ? params.get('sort') : 'bestselling',
  sale: params.get('sale') === '1',
};
FACETS.forEach((f) => {
  const valid = new Set(f.options.map((o) => o.id));
  state[f.key] = (params.get(f.key) ?? '').split(',').filter((v) => valid.has(v));
});

function syncUrl() {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  FACETS.forEach((f) => state[f.key].length && p.set(f.key, state[f.key].join(',')));
  if (state.sale) p.set('sale', '1');
  if (state.sort !== 'bestselling') p.set('sort', state.sort);
  const qs = p.toString().replace(/%2C/g, ',');
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

/* ---------- Filtering ---------- */
function filtered(exceptKey) {
  let list = searchProducts(state.q);
  FACETS.forEach((f) => {
    if (f.key !== exceptKey && state[f.key].length) list = list.filter((p) => f.match(p, state[f.key]));
  });
  if (state.sale && exceptKey !== 'sale') list = list.filter(isOnSale);
  return list;
}

/* ---------- Filter form (built once, counts updated in place) ---------- */
function buildForm() {
  const form = $('[data-filter-form]');
  form.innerHTML = `
    <div class="facet facet--toggle">
      <label class="toggle"><input type="checkbox" name="sale" ${state.sale ? 'checked' : ''}><span class="toggle__track" aria-hidden="true"></span><span>On sale only <span class="count" data-count-for="sale"></span></span></label>
    </div>
    ${FACETS.map((f) => `
      <details class="facet" ${f.key !== 'size' || state.size.length ? 'open' : ''}>
        <summary>${f.label}<span class="facet__sel" data-sel-for="${f.key}"></span></summary>
        <fieldset class="${f.chips ? 'facet__chips' : 'facet__list'}">
          <legend class="sr-only">${f.label}</legend>
          ${f.options.map((o) => `
            <label class="${f.chips ? 'chip-check' : 'check'}">
              <input type="checkbox" name="${f.key}" value="${esc(o.id)}" ${state[f.key].includes(o.id) ? 'checked' : ''}>
              <span class="check__label">${esc(o.label)}</span>
              ${f.chips ? '' : `<span class="count" data-count-for="${f.key}:${esc(o.id)}"></span>`}
            </label>`).join('')}
        </fieldset>
      </details>`).join('')}`;

  form.addEventListener('change', (e) => {
    const { name, value, checked } = e.target;
    if (name === 'sale') state.sale = checked;
    else state[name] = checked ? [...state[name], value] : state[name].filter((v) => v !== value);
    update();
  });
}

function updateForm() {
  FACETS.forEach((f) => {
    const base = filtered(f.key);
    f.options.forEach((o) => {
      const n = base.filter((p) => f.match(p, [o.id])).length;
      const input = document.querySelector(`input[name="${f.key}"][value="${CSS.escape(o.id)}"]`);
      input.checked = state[f.key].includes(o.id);
      input.disabled = n === 0 && !input.checked;
      const countEl = document.querySelector(`[data-count-for="${f.key}:${CSS.escape(o.id)}"]`);
      if (countEl) countEl.textContent = n;
    });
    const sel = document.querySelector(`[data-sel-for="${f.key}"]`);
    sel.textContent = state[f.key].length ? state[f.key].length : '';
  });
  const saleInput = document.querySelector('input[name="sale"]');
  saleInput.checked = state.sale;
  document.querySelector('[data-count-for="sale"]').textContent = filtered('sale').filter(isOnSale).length;
}

/* ---------- Heading, breadcrumb, quick category pills ---------- */
function headingInfo() {
  const only = (key) => FACETS.every((f) => (f.key === key ? state[f.key].length === 1 : !state[f.key].length)) && !state.q;
  if (state.q) return { title: `Results for “${state.q}”`, lede: 'Matching styles, best sellers first.' };
  if (only('category')) { const c = getCategory(state.category[0]); return { title: c.name, lede: c.blurb }; }
  if (only('brand')) { const b = getBrand(state.brand[0]); return { title: b.name, lede: b.blurb }; }
  const g = state.gender.slice().sort().join(',');
  if (g === 'men,unisex' && FACETS.every((f) => f.key === 'gender' || !state[f.key].length)) return { title: 'Men', lede: "Men's golf apparel plus unisex sleeves, caps and gear." };
  if (g === 'unisex,women' && FACETS.every((f) => f.key === 'gender' || !state[f.key].length)) return { title: 'Women', lede: "Women's golf apparel plus unisex sleeves, caps and gear." };
  if (state.sale) return { title: 'On Sale', lede: 'Reduced prices on selected styles.' };
  return { title: 'All Products', lede: 'Every style we carry. Use the filters to sort by brand, category, size and price.' };
}

function renderHead() {
  const { title, lede } = headingInfo();
  $('[data-title]').textContent = title;
  $('[data-lede]').textContent = lede;
  document.title = `${title} — Shop`;
  $('[data-crumbs]').innerHTML = `<ol><li><a href="./">Home</a></li><li><a href="shop.html">Shop</a></li>${title !== 'All Products' ? `<li aria-current="page">${esc(title)}</li>` : ''}</ol>`;
  const base = filtered('category');
  $('[data-quick-cats]').innerHTML = `
    <button type="button" class="chip" data-quick="" aria-pressed="${!state.category.length}">All <span class="count">${base.length}</span></button>
    ${categories.map((c) => {
      const n = base.filter((p) => p.category === c.id).length;
      return `<button type="button" class="chip" data-quick="${c.id}" aria-pressed="${state.category.length === 1 && state.category[0] === c.id}" ${n ? '' : 'disabled'}>${esc(c.name)} <span class="count">${n}</span></button>`;
    }).join('')}`;
}

$('[data-quick-cats]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-quick]');
  if (!btn) return;
  state.category = btn.dataset.quick ? [btn.dataset.quick] : [];
  update();
});

/* ---------- Active filter chips ---------- */
function renderActive() {
  const chips = [];
  if (state.q) chips.push({ label: `“${state.q}”`, remove: () => { state.q = ''; } });
  FACETS.forEach((f) => state[f.key].forEach((v) => {
    const o = f.options.find((x) => x.id === v);
    chips.push({ label: `${f.key === 'size' ? 'Size ' : ''}${o.label}`, remove: () => { state[f.key] = state[f.key].filter((x) => x !== v); } });
  }));
  if (state.sale) chips.push({ label: 'On sale', remove: () => { state.sale = false; } });
  const list = $('[data-active]');
  list.innerHTML = chips.map((c, i) => `<li><button type="button" class="chip chip--remove" data-i="${i}" aria-label="Remove filter ${esc(c.label)}">${esc(c.label)}<svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></li>`).join('')
    + (chips.length > 1 ? '<li><button type="button" class="clear-link" data-clear>Clear all</button></li>' : '');
  list.onclick = (e) => {
    const b = e.target.closest('[data-i]');
    if (b) { chips[Number(b.dataset.i)].remove(); update(); }
  };
  const n = chips.length - (state.q ? 1 : 0);
  $('[data-filter-count]').textContent = n ? `(${n})` : '';
}

/* ---------- Results ---------- */
function renderResults() {
  const list = filtered().sort(SORTS[state.sort].fn);
  $('[data-count]').innerHTML = `<strong>${list.length}</strong> ${list.length === 1 ? 'product' : 'products'}`;
  const grid = $('[data-grid]');
  grid.innerHTML = list.map((p) => productCard(p)).join('');
  if (!reducedMotion) grid.querySelectorAll('.card').forEach((c, i) => { c.style.setProperty('--i', Math.min(i, 12)); c.classList.add('card--enter'); });
  $('[data-empty]').hidden = list.length > 0;
  $('[data-show-results]').textContent = `Show ${list.length} result${list.length === 1 ? '' : 's'}`;
}

function update() {
  syncUrl();
  renderHead();
  updateForm();
  renderActive();
  renderResults();
}

/* ---------- Sort ---------- */
const sortSel = $('[data-sort]');
sortSel.innerHTML = Object.entries(SORTS).map(([id, s]) => `<option value="${id}" ${id === state.sort ? 'selected' : ''}>${s.label}</option>`).join('');
sortSel.addEventListener('change', () => { state.sort = sortSel.value; update(); });

/* ---------- Clear ---------- */
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-clear]')) return;
  FACETS.forEach((f) => { state[f.key] = []; });
  state.sale = false;
  state.q = '';
  update();
});

/* ---------- Mobile filter drawer ---------- */
const panel = $('[data-filters]');
const backdrop = $('.filters-backdrop');
const openBtn = $('[data-open-filters]');
const setFilters = (open) => {
  panel.classList.toggle('is-open', open);
  backdrop.hidden = !open;
  openBtn.setAttribute('aria-expanded', String(open));
  lockScroll(open);
  if (open) panel.querySelector('.filters__close').focus();
};
openBtn.addEventListener('click', () => setFilters(true));
document.querySelectorAll('[data-close-filters]').forEach((el) => el.addEventListener('click', () => {
  if (panel.classList.contains('is-open')) { setFilters(false); openBtn.focus(); }
}));
panel.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('is-open')) { setFilters(false); openBtn.focus(); } });

buildForm();
update();
