/**
 * Flat SVG garment illustrations used when a product has no photo yet.
 * Drop a real photo into /public/products/ and set `image` in catalog.json to replace it.
 */
import { esc } from './format.js';

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const rgbToHex = (rgb) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (hex, target, amt) => rgbToHex(hexToRgb(hex).map((v, i) => v + (target[i] - v) * amt));
const lighten = (hex, amt) => mix(hex, [255, 255, 255], amt);
const darken = (hex, amt) => mix(hex, [0, 0, 0], amt);
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Each shape: `fill` paths get the garment colour, `detail` paths are seams/trims.
const SHAPES = {
  polo: {
    fill: [
      'M72,30 L52,37 L26,60 L38,88 L56,80 L57,170 Q100,177 143,170 L144,80 L162,88 L174,60 L148,37 L128,30 Q100,44 72,30 Z',
    ],
    trim: ['M72,30 L86,53 L100,40 Q86,38 72,30 Z', 'M128,30 L114,53 L100,40 Q114,38 128,30 Z'],
    detail: ['M95,42 L95,77 L105,77 L105,42', 'M35,82 L53,74', 'M165,82 L147,74', 'M58,162 Q100,169 142,162'],
    dots: [[100, 54], [100, 66]],
  },
  sleeveless: {
    fill: ['M74,30 L58,36 Q63,62 54,80 L56,170 Q100,177 144,170 L146,80 Q137,62 142,36 L126,30 Q100,44 74,30 Z'],
    trim: ['M74,30 L87,53 L100,40 Q87,38 74,30 Z', 'M126,30 L113,53 L100,40 Q113,38 126,30 Z'],
    detail: ['M95,42 L95,77 L105,77 L105,42', 'M58,40 Q66,62 58,80', 'M142,40 Q134,62 142,80', 'M57,162 Q100,169 143,162'],
    dots: [[100, 54], [100, 66]],
  },
  longsleeve: {
    fill: [
      'M78,32 L56,38 Q40,44 36,64 L22,146 L40,151 L54,88 L57,170 Q100,177 143,170 L146,88 L160,151 L178,146 L164,64 Q160,44 144,38 L122,32 Q100,40 78,32 Z',
    ],
    trim: ['M80,20 L120,20 L122,34 Q100,40 78,34 Z'],
    detail: ['M24,137 L41,142', 'M176,137 L159,142', 'M58,162 Q100,169 142,162'],
  },
  jacket: {
    fill: [
      'M78,32 L56,38 Q40,44 36,64 L22,146 L40,151 L54,88 L57,172 Q100,179 143,172 L146,88 L160,151 L178,146 L164,64 Q160,44 144,38 L122,32 Q100,40 78,32 Z',
    ],
    trim: ['M78,16 L122,16 L124,34 Q100,41 76,34 Z'],
    detail: ['M100,18 L100,176', 'M66,132 L84,127', 'M134,132 L116,127', 'M24,137 L41,142', 'M176,137 L159,142'],
    dots: [[100, 22]],
  },
  vest: {
    fill: ['M76,24 L90,20 L100,30 L110,20 L124,24 L130,44 Q135,64 150,72 L148,172 Q100,180 52,172 L50,72 Q65,64 70,44 Z'],
    trim: ['M76,24 L90,20 L100,30 L110,20 L124,24 L121,36 Q100,44 79,36 Z'],
    detail: ['M100,30 L100,176', 'M62,128 L82,124', 'M138,128 L118,124', 'M70,46 Q66,64 54,72', 'M130,46 Q134,64 146,72'],
  },
  sleeves: {
    pair: true,
    fill: ['M58,28 Q74,22 90,28 L84,172 Q73,176 62,172 Z'],
    detail: ['M59,42 Q74,37 89,42', 'M63,160 Q73,163 84,160'],
  },
  pants: {
    fill: ['M61,36 L139,36 L150,178 L113,178 L100,76 L87,178 L50,178 Z'],
    trim: ['M62,24 L138,24 L139,36 L61,36 Z'],
    detail: ['M100,36 L100,62', 'M66,40 Q75,55 64,64', 'M134,40 Q125,55 136,64', 'M76,82 L69,174', 'M124,82 L131,174', 'M74,24 L74,36', 'M100,24 L100,36', 'M126,24 L126,36'],
  },
  shorts: {
    fill: ['M57,52 L143,52 L154,140 L110,146 L100,100 L90,146 L46,140 Z'],
    trim: ['M58,40 L142,40 L143,52 L57,52 Z'],
    detail: ['M100,52 L100,80', 'M62,56 Q72,70 60,78', 'M138,56 Q128,70 140,78', 'M72,40 L72,52', 'M128,40 L128,52'],
  },
  skirt: {
    fill: ['M63,50 L137,50 L158,156 Q100,168 42,156 Z'],
    trim: ['M64,36 L136,36 L137,50 L63,50 Z'],
    detail: ['M84,52 L72,159', 'M116,52 L128,159', 'M100,52 L100,163'],
  },
  cap: {
    fill: ['M42,124 C42,64 158,64 158,124 Z', 'M30,126 Q100,108 170,126 Q178,148 156,152 Q100,138 44,152 Q22,148 30,126 Z'],
    detail: ['M100,76 L100,118', 'M72,86 Q78,104 76,121', 'M128,86 Q122,104 124,121'],
    patch: { x: 86, y: 97, w: 28, h: 11 },
    dots: [[100, 71]],
  },
  visor: {
    fill: ['M40,110 Q100,88 160,110 L158,126 Q100,106 42,126 Z', 'M30,126 Q100,106 170,126 Q178,150 156,154 Q100,138 44,154 Q22,150 30,126 Z'],
    detail: ['M44,116 Q100,96 156,116'],
  },
  glove: {
    fill: [
      'M72,182 L72,124 L56,96 Q51,86 59,81 Q67,77 73,86 L84,104 L82,50 Q82,40 91,40 Q100,40 100,50 L101,96 L104,38 Q104,28 113,28 Q122,28 122,38 L120,98 L126,48 Q127,38 136,38 Q145,39 144,49 L138,104 L146,66 Q148,57 156,58 Q164,60 162,70 L150,128 Q146,150 134,160 L132,182 Z',
    ],
    trim: ['M94,148 L140,148 Q147,158 140,168 L94,168 Z'],
    detail: ['M90,60 L92,92', 'M112,48 L111,92', 'M134,58 L130,96'],
    dots: [[88, 70], [94, 70], [109, 60], [115, 60], [131, 68], [137, 68]],
  },
};

let uid = 0;

export function garmentSVG(shape, hex = '#F4F3EE', label = '') {
  const s = SHAPES[shape] ?? SHAPES.polo;
  const id = `g${(uid += 1)}`;
  const lum = luminance(hex);
  const light = lum > 0.6;
  const outline = light ? '#b5ae9e' : darken(hex, 0.35);
  const detail = lum < 0.12 ? lighten(hex, 0.3) : darken(hex, light ? 0.22 : 0.3);
  const trim = light ? darken(hex, 0.05) : lighten(hex, 0.1);
  const paths = (list, attrs) => (list ?? []).map((d) => `<path d="${d}" ${attrs}/>`).join('');
  const body = `
    ${paths(s.fill, `fill="url(#${id})" stroke="${outline}" stroke-width="1.6" stroke-linejoin="round"`)}
    ${paths(s.trim, `fill="${trim}" stroke="${outline}" stroke-width="1.4" stroke-linejoin="round"`)}
    ${paths(s.detail, `fill="none" stroke="${detail}" stroke-width="1.3" stroke-linecap="round" opacity="0.85"`)}
    ${s.patch ? `<rect x="${s.patch.x}" y="${s.patch.y}" width="${s.patch.w}" height="${s.patch.h}" rx="3" fill="${light ? darken(hex, 0.55) : lighten(hex, 0.75)}"/>` : ''}
    ${(s.dots ?? []).map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="2" fill="${detail}"/>`).join('')}`;
  const art = s.pair
    ? `<g transform="rotate(-7 74 100) translate(-6 0)">${body}</g><g transform="rotate(7 126 100) translate(46 0)">${body}</g>`
    : body;
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="garment" viewBox="0 0 200 200" ${a11y} xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${lighten(hex, 0.14)}"/><stop offset="0.55" stop-color="${hex}"/><stop offset="1" stop-color="${darken(hex, 0.12)}"/>
    </linearGradient></defs>
    <ellipse cx="100" cy="188" rx="58" ry="6" fill="rgb(15 26 21 / 0.10)"/>
    ${art}
  </svg>`;
}

/** Photo if the product has one, otherwise the illustration in its first colour. */
export function productMedia(p, colorIndex = 0, { eager = false } = {}) {
  const color = p.colors[colorIndex] ?? p.colors[0];
  const alt = esc(`${p.brandName} ${p.name}${color ? ` in ${color.name}` : ''}`);
  if (p.image) {
    return `<img src="${p.image}" alt="${alt}" width="800" height="800" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  }
  return garmentSVG(p.shape, color?.hex, alt);
}
