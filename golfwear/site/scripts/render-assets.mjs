// Renders the site's image assets from code:
//   public/products/<id>-<colour>.webp   sample GOLFWEAR product mockups (studio style)
//   public/ball/albedo-{2k,1k}.webp       the print on the 3D golf ball
//   public/favicon.svg, apple-touch-icon.png, og.jpg
// Run: npm run assets   (needs Playwright with Chromium, and Python 3 with Pillow)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/brand/paths.json'), 'utf8'));
const { products } = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/catalog.json'), 'utf8'));
const C = P.colors;
const TMP = path.join(ROOT, 'scripts/.render');
fs.mkdirSync(TMP, { recursive: true });

// ---------- colour helpers ----------
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (r) => '#' + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const shade = (h, amt) => rgb2hex(hex2rgb(h).map((v) => (amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
const luminance = (h) => { const [r, g, b] = hex2rgb(h).map((v) => v / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const markColors = (bg) => (luminance(bg) < 0.45 ? { g: C.ivory, flag: C.brass } : { g: C.green, flag: C.brass });

// ---------- shared pieces ----------
const mark = (cx, cy, width, col) => {
  const s = width / P.mark.viewBox[2];
  return `<g transform="translate(${cx - width / 2} ${cy - 50 * s}) scale(${s})"><path d="${P.mark.g}" fill="${col.g}"/><path d="${P.mark.flag}" fill="${col.flag}"/></g>`;
};
const wordmark = (x, baseline, width, color, rotate = 0) => {
  const b = P.wordmark.box;
  const s = width / (b.x2 - b.x1);
  return `<g transform="translate(${x} ${baseline}) rotate(${rotate}) scale(${s}) translate(${-b.x1} 0)"><path d="${P.wordmark.d}" fill="${color}"/></g>`;
};
const studio = (w, h) => `
  <defs>
    <radialGradient id="bg" cx="50%" cy="36%" r="75%"><stop offset="0" stop-color="#F3EEE5"/><stop offset="1" stop-color="#E1D7C5"/></radialGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="fold" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>`;

// ---------- polo ----------
const R = (p) => [900 - p[0], p[1]];
function poloGeometry(long, women) {
  if (women) {
    return long
      ? { N: [398, 222], S: [304, 252], T: [222, 300], E: [150, 800], I: [222, 820], A: [280, 404], ci: [252, 600], W: [288, 600], H: [272, 884], hy: 910, cuff: 34 }
      : { N: [398, 222], S: [304, 252], T: [222, 300], E: [186, 420], I: [258, 446], A: [280, 404], ci: [266, 422], W: [288, 600], H: [272, 884], hy: 910, cuff: 18 };
  }
  return long
    ? { N: [392, 214], S: [288, 246], T: [196, 300], E: [116, 846], I: [198, 868], A: [264, 410], ci: [238, 640], W: [262, 700], H: [256, 972], hy: 1002, cuff: 40 }
    : { N: [392, 214], S: [288, 246], T: [196, 300], E: [138, 462], I: [234, 502], A: [264, 410], ci: [250, 452], W: [262, 700], H: [256, 972], hy: 1002, cuff: 22 };
}
const pt = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
function poloSVG({ hex, stripe, long, women, pique }) {
  const g = poloGeometry(long, women);
  const { N, S, T, E, I, A, ci, W, H, hy } = g;
  const body = [
    `M ${pt(N)}`, `Q ${pt([S[0] + 48, S[1] - 26])} ${pt(S)}`, `L ${pt(T)}`, `L ${pt(E)}`, `L ${pt(I)}`,
    `Q ${pt(ci)} ${pt(A)}`, `C ${pt([A[0] + 4, A[1] + 110])} ${pt([W[0], W[1] - 80])} ${pt(W)}`,
    `C ${pt([W[0] - 2, W[1] + 120])} ${pt([H[0] + 2, H[1] - 120])} ${pt(H)}`, `Q ${pt([450, hy])} ${pt(R(H))}`,
    `C ${pt(R([H[0] + 2, H[1] - 120]))} ${pt(R([W[0] - 2, W[1] + 120]))} ${pt(R(W))}`,
    `C ${pt(R([W[0], W[1] - 80]))} ${pt(R([A[0] + 4, A[1] + 110]))} ${pt(R(A))}`,
    `Q ${pt(R(ci))} ${pt(R(I))}`, `L ${pt(R(E))}`, `L ${pt(R(T))}`, `L ${pt(R(S))}`,
    `Q ${pt(R([S[0] + 48, S[1] - 26]))} ${pt(R(N))}`, `Q ${pt([450, N[1] + 40])} ${pt(N)}`, 'Z',
  ].join(' ');
  // rib cuffs
  const cuff = (e, i, t, a) => {
    const mid = [(e[0] + i[0]) / 2, (e[1] + i[1]) / 2], top = [(t[0] + a[0]) / 2, (t[1] + a[1]) / 2];
    const len = Math.hypot(top[0] - mid[0], top[1] - mid[1]);
    const d = [(top[0] - mid[0]) / len * g.cuff, (top[1] - mid[1]) / len * g.cuff];
    return `M ${pt(e)} L ${pt(i)} L ${pt([i[0] + d[0], i[1] + d[1]])} L ${pt([e[0] + d[0], e[1] + d[1]])} Z`;
  };
  const sleeveArea = (e, i, t, a) => `M ${pt(t)} L ${pt(e)} L ${pt(i)} L ${pt(a)} Z`;
  // collar
  const flapTip = women ? 86 : 106;
  const flap = (side) => {
    const f = side < 0 ? (p) => p : R;
    return `M ${pt(f([N[0] - 4, N[1] - 2]))} L ${pt(f([447, N[1] + 50]))} L ${pt(f([420, N[1] + flapTip]))} Q ${pt(f([N[0] - 12, N[1] + 78]))} ${pt(f([N[0] - 24, N[1] + 38]))} Z`;
  };
  const band = `M ${pt(N)} Q ${pt([450, N[1] - 30])} ${pt(R(N))} L ${pt(R([N[0] + 6, N[1] + 18]))} Q ${pt([450, N[1] - 8])} ${pt([N[0] + 6, N[1] + 18])} Z`;
  const plBottom = N[1] + (women ? 170 : 210);
  const dark = luminance(hex) < 0.45;
  const collarHex = hex;
  const btn = dark ? shade(hex, 0.35) : shade(hex, -0.12);
  const chest = women ? [546, N[1] + 140] : [556, N[1] + 150];
  const patterns = `
    <pattern id="stripes" width="64" height="64" patternUnits="userSpaceOnUse"><rect width="64" height="64" fill="${hex}"/><rect y="24" width="64" height="16" fill="${stripe || hex}"/></pattern>
    <pattern id="pique" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="#000" opacity=".07"/><circle cx="5.5" cy="5.5" r="1.1" fill="#fff" opacity=".07"/></pattern>
    <linearGradient id="shadeX" x1="110" x2="790" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset=".2" stop-color="#000" stop-opacity="0"/>
      <stop offset=".46" stop-color="#fff" stop-opacity=".07"/><stop offset=".8" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
    <linearGradient id="shadeY" y1="200" y2="1000" x1="0" x2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".08"/></linearGradient>
    <clipPath id="bodyClip"><path d="${body}"/></clipPath>`;
  const folds = [
    `M ${pt([A[0] + 8, A[1] + 22])} Q ${pt([A[0] + 62, A[1] + 84])} ${pt([A[0] + 42, A[1] + 176])}`,
    `M ${pt(R([A[0] + 8, A[1] + 22]))} Q ${pt(R([A[0] + 62, A[1] + 84]))} ${pt(R([A[0] + 42, A[1] + 176]))}`,
  ];
  return `
    <defs>${patterns}</defs>
    <ellipse cx="450" cy="${H[1] + 52}" rx="250" ry="24" fill="#000" opacity=".12" filter="url(#soft)"/>
    <path d="${body}" fill="${stripe ? 'url(#stripes)' : hex}"/>
    <g clip-path="url(#bodyClip)">
      ${pique ? `<rect width="900" height="1125" fill="url(#pique)"/>` : ''}
      <path d="${sleeveArea(E, I, T, A)}" fill="#000" opacity=".06"/><path d="${sleeveArea(R(E), R(I), R(T), R(A))}" fill="#000" opacity=".08"/>
      <path d="${cuff(E, I, T, A)}" fill="${shade(hex, -0.1)}"/><path d="${cuff(R(E), R(I), R(T), R(A))}" fill="${shade(hex, -0.1)}"/>
      <rect width="900" height="1125" fill="url(#shadeX)"/><rect width="900" height="1125" fill="url(#shadeY)"/>
      <g filter="url(#fold)" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="7" stroke-linecap="round">${folds.map((d) => `<path d="${d}"/>`).join('')}</g>
      <ellipse cx="450" cy="${N[1] + 70}" rx="70" ry="44" fill="#000" opacity=".14" filter="url(#fold)"/>
      <rect x="436" y="${N[1] + 46}" width="28" height="${plBottom - N[1] - 46}" fill="${shade(hex, -0.06)}"/>
      <path d="M 436 ${plBottom} L 464 ${plBottom}" stroke="${shade(hex, -0.22)}" stroke-width="2"/>
      <circle cx="450" cy="${N[1] + 100}" r="5.5" fill="${btn}"/><circle cx="450" cy="${N[1] + (women ? 140 : 160)}" r="5.5" fill="${btn}"/>
    </g>
    <path d="${band}" fill="${shade(collarHex, -0.25)}"/>
    <path d="${flap(-1)}" fill="${shade(collarHex, 0.04)}" stroke="${shade(collarHex, -0.12)}" stroke-width="1.5"/>
    <path d="${flap(1)}" fill="${shade(collarHex, -0.02)}" stroke="${shade(collarHex, -0.12)}" stroke-width="1.5"/>
    ${mark(chest[0], chest[1], 46, markColors(hex))}`;
}

// ---------- arm sleeves (a pair) ----------
function sleeveSVG({ hex, kind }) {
  const one = (cx, angle, front) => {
    const outline = `M ${cx - 66} 170 C ${cx - 74} 420 ${cx - 50} 700 ${cx - 42} 930 Q ${cx} 946 ${cx + 42} 930 C ${cx + 50} 700 ${cx + 74} 420 ${cx + 66} 170 Q ${cx} 186 ${cx - 66} 170 Z`;
    const id = `s${cx}`;
    const col = markColors(hex);
    let print = '';
    if (kind === 'signature' && front) print = wordmark(cx + 9, 872, 330, col.g, -90);
    else print = mark(cx, 852, 40, col);
    return `
      <ellipse cx="${cx}" cy="946" rx="70" ry="12" fill="#000" opacity=".16" filter="url(#soft)"/>
      <g transform="rotate(${angle} ${cx} 560)">
        <defs>
          <clipPath id="${id}"><path d="${outline}"/></clipPath>
          <linearGradient id="${id}g" x1="${cx - 74}" x2="${cx + 74}" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".3" stop-color="#fff" stop-opacity=".12"/>
            <stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient>
        </defs>
        <path d="${outline}" fill="${hex}"/>
        <g clip-path="url(#${id})">
          ${kind === 'cool' ? `<g stroke="${luminance(hex) < 0.45 ? '#fff' : '#000'}" stroke-opacity=".03" stroke-width="2">${Array.from({ length: 34 }, (_, i) => `<line x1="${cx - 90}" y1="${190 + i * 22}" x2="${cx + 90}" y2="${170 + i * 22}"/>`).join('')}</g>` : ''}
          <rect x="${cx - 80}" y="160" width="160" height="56" fill="${shade(hex, -0.07)}"/>
          <line x1="${cx - 80}" y1="216" x2="${cx + 80}" y2="216" stroke="${shade(hex, -0.2)}" stroke-width="1.5"/>
          <line x1="${cx - 80}" y1="908" x2="${cx + 80}" y2="912" stroke="${shade(hex, -0.18)}" stroke-width="1.5" stroke-dasharray="5 4"/>
          ${print}
          <rect x="${cx - 80}" y="150" width="160" height="820" fill="url(#${id}g)"/>
        </g>
        <ellipse cx="${cx}" cy="172" rx="64" ry="13" fill="${shade(hex, -0.42)}"/>
        <ellipse cx="${cx}" cy="176" rx="56" ry="8" fill="${shade(hex, -0.55)}" opacity=".6"/>
      </g>`;
  };
  return one(372, -3, false) + one(530, 3, true);
}

const productSVG = (prod, color) => {
  const content = prod.category === 'sleeves'
    ? sleeveSVG({ hex: color.hex, kind: prod.kind })
    : poloSVG({ hex: color.hex, stripe: color.stripe, long: prod.sleeve === 'long', women: prod.category === 'polo-women', pique: prod.kind === 'pique' });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1125" viewBox="0 0 900 1125">${studio(900, 1125)}${content}</svg>`;
};

// ---------- ball print (equirectangular; u = 0.25 faces the camera in three.js) ----------
const ballSVG = () => `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1024" viewBox="0 0 2048 1024">
  <rect width="2048" height="1024" fill="#F6F5F0"/>
  ${mark(512, 468, 150, { g: C.green, flag: C.brass })}
  ${wordmark(512 - 135, 592, 270, C.green)}
  ${wordmark(1536 - 110, 530, 220, C.green)}
</svg>`;

// ---------- icons and share image ----------
const tile = (size, radius) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="${radius}" fill="${C.green}"/>${mark(51.5, 50, 62, { g: C.ivory, flag: C.brass })}</svg>`;
const stripes = (w, h) => `<defs><pattern id="mow" width="160" height="160" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
  <rect width="160" height="160" fill="${C.green}"/><rect width="80" height="160" fill="#164234"/></pattern></defs>
  <rect width="${w}" height="${h}" fill="url(#mow)"/>`;
const ogSVG = () => {
  const b = P.wordmark.box, lockW = 760, markH = 120;
  const wordW = lockW - markH - 36;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">${stripes(1200, 630)}
  ${mark(220 + markH / 2, 270, markH, { g: C.ivory, flag: C.brass })}
  ${wordmark(220 + markH + 36, 270 + (wordW / (b.x2 - b.x1)) * P.wordmark.capHeight / 2, wordW, C.ivory)}
  <text x="600" y="440" text-anchor="middle" font-family="Jost" font-weight="500" font-size="26" letter-spacing="8" fill="${C.brass}">GOLF APPAREL · JAKARTA</text></svg>`;
};

// ---------- render ----------
const browser = await chromium.launch();
const page = await browser.newPage();
const jost = fs.readFileSync(path.join(ROOT, 'node_modules/@fontsource/jost/files/jost-latin-500-normal.woff2')).toString('base64');
async function render(svg, w, h, out, { transparent = false } = {}) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><head><style>@font-face{font-family:Jost;font-weight:500;src:url(data:font/woff2;base64,${jost})}
    html,body{margin:0;background:transparent}svg{display:block;width:${w}px;height:${h}px}</style></head><body>${svg}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h }, omitBackground: transparent });
}
const toWebp = [];
for (const prod of products) {
  for (const color of prod.colors) {
    const png = path.join(TMP, `${prod.id}-${color.key}.png`);
    await render(productSVG(prod, color), 900, 1125, png);
    toWebp.push([png, path.join(ROOT, `public/products/${prod.id}-${color.key}.webp`), 82]);
  }
}
for (const [w, h, name] of [[2048, 1024, '2k'], [1024, 512, '1k']]) {
  const png = path.join(TMP, `albedo-${name}.png`);
  await render(ballSVG().replace('width="2048" height="1024"', `width="${w}" height="${h}"`), w, h, png);
  toWebp.push([png, path.join(ROOT, `public/ball/albedo-${name}.webp`), 90]);
}
fs.writeFileSync(path.join(ROOT, 'public/favicon.svg'), tile(64, 22));
await render(tile(180, 0), 180, 180, path.join(ROOT, 'public/apple-touch-icon.png'));
await render(ogSVG(), 1200, 630, path.join(TMP, 'og.png'));
await browser.close();

// PNG -> WebP / JPEG with Pillow
const py = `
import sys, json
from PIL import Image
jobs = json.loads(sys.argv[1])
for src, dst, q in jobs:
    Image.open(src).convert("RGB").save(dst, "WEBP", quality=q, method=6)
Image.open(sys.argv[2]).convert("RGB").save(sys.argv[3], "JPEG", quality=88, optimize=True, progressive=True)
`;
execFileSync('python3', ['-c', py, JSON.stringify(toWebp), path.join(TMP, 'og.png'), path.join(ROOT, 'public/og.jpg')], { stdio: 'inherit' });
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`Rendered ${toWebp.length - 2} product images, ball print, favicon, apple-touch-icon and og.jpg`);
