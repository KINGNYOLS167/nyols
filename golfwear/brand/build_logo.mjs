// Builds every GOLFWEAR logo file from one source of truth.
//
//   cd golfwear/brand && npm install && npm run build
//
// The mark is drawn from geometry and the wordmark is set in Jost 500 (SIL Open Font
// License) and converted to outlines, so no file depends on a font being installed.
// PNG and PDF exports are rendered with Playwright's Chromium.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const opentype = require('opentype.js');
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = (...p) => path.join(HERE, ...p);
const JOST_DIR = path.join(HERE, 'node_modules/@fontsource/jost/files');
const f = (n) => +n.toFixed(2);

// ---------- brand ----------
export const BRAND = {
  green: '#12372A',   // Fairway green: primary
  brass: '#B8975A',   // Brass: the flag, small accents
  ivory: '#F4EFE4',   // Ivory: light backgrounds
  ink: '#101614',     // Ink: body text
};
const VARIANTS = {
  color: { mark: BRAND.green, flag: BRAND.brass, text: BRAND.green, bg: BRAND.ivory },
  reverse: { mark: BRAND.ivory, flag: BRAND.brass, text: BRAND.ivory, bg: BRAND.green },
  black: { mark: '#000000', flag: '#000000', text: '#000000', bg: '#FFFFFF' },
  white: { mark: '#FFFFFF', flag: '#FFFFFF', text: '#FFFFFF', bg: '#1B1F1C' },
};

// ---------- the mark: a G whose flag flies out through its opening ----------
// 100 x 100 box, ring centre (50, 50). One closed contour for the G and its flagstick,
// one triangle for the flag (so it can take the accent colour).
const MARK = { R: 50, t: 9.5, open: 58, s: 5, h: 31, ph: 22, pw: 46 };
function markPaths({ R, t, open, s, h, ph, pw } = MARK, cx = 50, cy = 50) {
  const ri = R - t;
  const rad = (a) => (a * Math.PI) / 180;
  const P = (r, a) => [cx + r * Math.cos(rad(a)), cy - r * Math.sin(rad(a))];
  const q = (p) => `${f(p[0])} ${f(p[1])}`;
  const A = P(R, open);                                   // outer end of the upper terminal
  const E = P(ri, (-Math.asin(t / ri) * 180) / Math.PI);  // where the bar's underside meets the ring
  const F = P(ri, open);                                  // inner end of the upper terminal
  const g = [
    `M ${q(A)}`,
    `A ${R} ${R} 0 1 0 ${cx + R} ${cy}`,  // outer edge: over the top, round the left, under the bottom
    `L ${f(cx + s)} ${cy}`,               // top of the bar, back to the stick
    `L ${f(cx + s)} ${f(cy - h)}`,        // up the stick
    `L ${cx} ${f(cy - h)}`,
    `L ${cx} ${f(cy + t)}`,               // down the stick and the end of the bar
    `L ${q(E)}`,                          // underside of the bar
    `A ${ri} ${ri} 0 1 1 ${q(F)}`,        // inner edge, back round to the terminal
    'Z',
  ].join(' ');
  const flag = `M ${f(cx + s - 0.5)} ${f(cy - h)} L ${f(cx + s + pw)} ${f(cy - h + ph / 2)} L ${f(cx + s - 0.5)} ${f(cy - h + ph)} Z`;
  return { g, flag, box: { x1: 0, y1: 0, x2: cx + s + pw, y2: 100 } };
}

// ---------- the wordmark ----------
const loadFont = (file) => opentype.parse(new Uint8Array(fs.readFileSync(path.join(JOST_DIR, file))).buffer);
const JOST = loadFont('jost-latin-500-normal.woff');
const TRACKING = 0.16; // em

function setText(font, text, size, tracking) {
  const glyphs = font.stringToGlyphs(text);
  const k = size / font.unitsPerEm;
  let x = 0, d = '';
  let x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
  glyphs.forEach((g, i) => {
    const p = g.getPath(x, 0, size);
    d += p.toPathData(2);
    const bb = p.getBoundingBox();
    x1 = Math.min(x1, bb.x1); x2 = Math.max(x2, bb.x2); y1 = Math.min(y1, bb.y1); y2 = Math.max(y2, bb.y2);
    x += g.advanceWidth * k;
    if (i < glyphs.length - 1) x += font.getKerningValue(g, glyphs[i + 1]) * k + tracking * size;
  });
  return { d, box: { x1, x2, y1, y2 } };
}
const WORD = setText(JOST, 'GOLFWEAR', 100, TRACKING);
const CAP = -JOST.charToGlyph('H').getPath(0, 0, 100).getBoundingBox().y1; // cap height at size 100

// ---------- lockups (all in "mark units": the ring is 100 tall) ----------
// Each returns { w, h, draw(v) } with content placed from (0, 0).
function markOnly() {
  const m = markPaths();
  return { w: m.box.x2, h: 100, draw: (v) => `<path d="${m.g}" fill="${v.mark}"/><path d="${m.flag}" fill="${v.flag}"/>` };
}
function wordOnly(capHeight = 40) {
  const k = capHeight / CAP;
  const w = (WORD.box.x2 - WORD.box.x1) * k;
  return {
    w, h: capHeight,
    draw: (v) => `<path transform="translate(${f(-WORD.box.x1 * k)} ${f(capHeight)}) scale(${f(k)})" d="${WORD.d}" fill="${v.text}"/>`,
  };
}
function horizontal() {
  const m = markOnly();
  const cap = 42, gap = 30;
  const wd = wordOnly(cap);
  const x = 100 + gap, y = 50 - cap / 2;
  return { w: x + wd.w, h: 100, draw: (v) => `${m.draw(v)}<g transform="translate(${f(x)} ${f(y)})">${wd.draw(v)}</g>` };
}
function stacked() {
  const m = markOnly();
  const wordW = 260;
  const wd = wordOnly((wordW / (WORD.box.x2 - WORD.box.x1)) * CAP);
  const gap = 24;
  const mx = wordW / 2 - 50;
  return {
    w: wordW, h: 100 + gap + wd.h,
    draw: (v) => `<g transform="translate(${f(mx)} 0)">${m.draw(v)}</g><g transform="translate(0 ${100 + gap})">${wd.draw(v)}</g>`,
  };
}
const LOCKUPS = { horizontal, stacked, icon: markOnly, wordmark: () => wordOnly(40) };

const PAD = 1;
function svgDoc(lock, v, { width, height, units = '', title = 'GOLFWEAR' } = {}) {
  const vw = lock.w + PAD * 2, vh = lock.h + PAD * 2;
  const W = width ?? f(vw * 4), H = height ?? f((vh * (width ?? vw * 4)) / vw);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-PAD} ${-PAD} ${f(vw)} ${f(vh)}" width="${W}${units}" height="${f(H)}${units}"><title>${title}</title>${lock.draw(v)}</svg>`;
}

// ---------- page helpers ----------
// Fonts are embedded as data URLs: pages loaded with setContent can't read local files.
const fontFace = (weight) => {
  const b64 = fs.readFileSync(path.join(JOST_DIR, `jost-latin-${weight}-normal.woff2`)).toString('base64');
  return `@font-face{font-family:Jost;font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
};
const BASE_CSS = `${[400, 500, 600].map(fontFace).join('')}
  *{box-sizing:border-box} html,body{margin:0;padding:0}
  body{font-family:Jost,Arial,sans-serif;color:${BRAND.ink}}`;
const inline = (lock, v, px) => svgDoc(lock, v, { width: px });
const write = (rel, data) => { fs.mkdirSync(path.dirname(OUT(rel)), { recursive: true }); fs.writeFileSync(OUT(rel), data); };

async function shoot(page, html, file, { width, height, transparent = false, scale = 1, full = false }) {
  await page.setViewportSize({ width, height: height ?? 800 });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>${html}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  fs.mkdirSync(path.dirname(OUT(file)), { recursive: true });
  if (full) return page.screenshot({ path: OUT(file), fullPage: true, omitBackground: transparent });
  return page.screenshot({ path: OUT(file), clip: { x: 0, y: 0, width, height }, omitBackground: transparent, scale: scale === 1 ? 'css' : 'device' });
}

// ---------- outputs ----------
async function main() {
  // 0. Raw geometry for code that draws the logo itself (the website)
  const m = markPaths();
  write('logo/golfwear-paths.json', JSON.stringify({
    colors: BRAND,
    mark: { viewBox: [0, 0, f(m.box.x2), 100], g: m.g, flag: m.flag },
    wordmark: { d: WORD.d, box: WORD.box, capHeight: f(CAP), fontSize: 100, tracking: TRACKING },
  }, null, 1));

  // 1. Logo SVGs
  for (const [name, make] of Object.entries(LOCKUPS)) {
    for (const [vname, v] of Object.entries(VARIANTS)) {
      write(`logo/svg/golfwear-${name}-${vname}.svg`, svgDoc(make(), v));
    }
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 2. Logo PNGs: transparent, 2400 px on the long side
  for (const [name, make] of Object.entries(LOCKUPS)) {
    const lock = make();
    const vw = lock.w + PAD * 2, vh = lock.h + PAD * 2;
    const W = vw >= vh ? 2400 : Math.round((2400 * vw) / vh);
    const H = Math.round((W * vh) / vw);
    for (const [vname, v] of Object.entries(VARIANTS)) {
      await shoot(page, `<div style="width:${W}px;height:${H}px">${svgDoc(lock, v, { width: W, height: H })}</div>`,
        `logo/png/golfwear-${name}-${vname}.png`, { width: W, height: H, transparent: true });
    }
  }

  // 3. Print artwork at actual size (vector SVG + PDF)
  const prints = [
    ['sleeve-wordmark-120mm', LOCKUPS.wordmark(), 120],
    ['chest-icon-30mm', LOCKUPS.icon(), 30],
    ['chest-horizontal-70mm', LOCKUPS.horizontal(), 70],
  ];
  for (const [name, lock, mm] of prints) {
    for (const vname of ['color', 'black']) {
      const svg = svgDoc(lock, VARIANTS[vname], { width: mm, units: 'mm', title: `GOLFWEAR ${name}` });
      write(`print/golfwear-${name}-${vname}.svg`, svg);
      const hmm = (mm * (lock.h + PAD * 2)) / (lock.w + PAD * 2);
      await page.setContent(`<!doctype html><html><head><style>@page{margin:0}html,body{margin:0}svg{display:block}</style></head><body>${svg}</body></html>`);
      await page.pdf({ path: OUT(`print/golfwear-${name}-${vname}.pdf`), width: `${mm}mm`, height: `${f(hmm + 0.01)}mm`, printBackground: true, pageRanges: '1' });
    }
  }

  // 4. Tokopedia: profile picture (shown in a circle) and store banners
  await shoot(page, `<div style="width:1000px;height:1000px;background:${BRAND.green};display:flex;align-items:center;justify-content:center">
      <div style="transform:translateX(12px)">${inline(markOnly(), VARIANTS.reverse, 520)}</div></div>`,
    'tokopedia/golfwear-tokopedia-avatar-1000.png', { width: 1000, height: 1000 });
  for (const [w, h] of [[1200, 400], [1920, 480]]) {
    const logoW = Math.round(w * 0.42);
    await shoot(page, `<div style="position:relative;overflow:hidden;width:${w}px;height:${h}px;background:${BRAND.green};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(h * 0.07)}px">
        <div style="position:absolute;right:${-Math.round(h * 0.28)}px;top:${-Math.round(h * 0.18)}px;opacity:.07">${inline(markOnly(), VARIANTS.white, Math.round(h * 1.36))}</div>
        <div style="position:absolute;left:${-Math.round(h * 0.5)}px;bottom:${-Math.round(h * 0.62)}px;width:${Math.round(h * 1.2)}px;height:${Math.round(h * 1.2)}px;border:1px solid rgba(184,151,90,.35);border-radius:50%"></div>
        <div style="position:relative">${inline(horizontal(), VARIANTS.reverse, logoW)}</div>
        <div style="position:relative;display:flex;align-items:center;gap:18px;color:${BRAND.brass};font-weight:500;letter-spacing:.32em;font-size:${Math.round(h * 0.052)}px">
          <span style="width:44px;height:1px;background:${BRAND.brass}"></span>GOLF APPAREL · JAKARTA<span style="width:44px;height:1px;background:${BRAND.brass}"></span></div>
      </div>`, `tokopedia/golfwear-tokopedia-banner-${w}x${h}.png`, { width: w, height: h });
  }

  // 5. Brand guide (one page)
  const guide = guideHtml();
  write('guide/golfwear-brand-guide.html', guide);
  const gp = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  await gp.setContent(guide);
  await gp.evaluate(() => document.fonts.ready);
  await gp.screenshot({ path: OUT('golfwear-brand-guide.png'), fullPage: true });
  await browser.close();
  console.log('Built logo/, print/, tokopedia/, guide/ and golfwear-brand-guide.png');
}

// ---------- brand guide page ----------
function guideHtml() {
  const H = horizontal(), S = stacked(), I = markOnly(), W = wordOnly(40);
  const tile = (bg, content, extra = '') => `<div class="tile" style="background:${bg};${extra}">${content}</div>`;
  const sw = (name, hex, rgb, role, dark) => `<div class="sw"><div class="chip" style="background:${hex};${dark ? '' : 'border:1px solid #ddd5c4'}"></div>
      <b>${name}</b><span>${hex}</span><span>RGB ${rgb}</span><em>${role}</em></div>`;
  const dont = (label, style, v = VARIANTS.color) => `<div class="dont"><div class="dbox">
      <div style="${style}">${inline(H, v, 250)}</div></div><div class="x">✕</div><p>${label}</p></div>`;
  const cs = 25; // clear space = a quarter of the mark's height
  // the logo is drawn 440 px wide, so the mark is 440 / H.w * 100 px tall and x is a quarter of that
  const x = Math.round((440 / (H.w + 2)) * 100 * 0.25);
  const clear = `<div style="position:relative;display:inline-block;padding:${x}px;border:1.5px dashed #c9b27f;background:#fff">
      ${inline(H, VARIANTS.color, 440)}
      <span class="cs" style="left:0;top:0;width:${x}px;height:100%">x</span>
      <span class="cs" style="right:0;top:0;width:${x}px;height:100%">x</span>
      <span class="cs" style="left:${x}px;right:${x}px;top:0;height:${x}px">x</span>
      <span class="cs" style="left:${x}px;right:${x}px;bottom:0;height:${x}px">x</span></div>`;
  const sleeve = `<svg viewBox="0 0 220 430" width="220" height="430">
      <path d="M40 10 L180 10 L162 410 Q110 420 58 410 Z" fill="#fff" stroke="#b9b2a2" stroke-width="2"/>
      <path d="M58 380 Q110 390 162 380" fill="none" stroke="#d6cfbf" stroke-width="2"/>
      <g transform="translate(118 362) rotate(-90)">${svgDoc(W, VARIANTS.color, { width: 150 }).replace('<svg ', '<svg x="0" y="-9" ')}</g>
      <line x1="150" y1="212" x2="150" y2="362" stroke="${BRAND.brass}" stroke-width="1.5"/>
      <text x="156" y="292" font-size="12" fill="${BRAND.ink}" font-family="Jost">120 mm</text>
      <line x1="64" y1="362" x2="64" y2="405" stroke="${BRAND.brass}" stroke-width="1.5"/>
      <text x="8" y="388" font-size="12" fill="${BRAND.ink}" font-family="Jost">60 mm</text></svg>`;
  const polo = `<svg viewBox="0 0 300 300" width="300" height="300">
      <path d="M100 30 L125 22 Q150 40 175 22 L200 30 L262 60 L240 112 L214 100 L214 285 L86 285 L86 100 L60 112 L38 60 Z" fill="#fff" stroke="#b9b2a2" stroke-width="2" stroke-linejoin="round"/>
      <path d="M125 22 L150 62 L175 22" fill="none" stroke="#b9b2a2" stroke-width="2"/>
      <line x1="150" y1="62" x2="150" y2="118" stroke="#d6cfbf" stroke-width="2"/>
      <g transform="translate(176 78)">${svgDoc(I, VARIANTS.color, { width: 30 }).replace('<svg ', '<svg x="0" y="0" ')}</g>
      <text x="166" y="132" font-size="12" fill="${BRAND.ink}" font-family="Jost">30 mm</text></svg>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
    body{background:${BRAND.ivory};padding:64px 72px 80px;width:1600px}
    h1{font-size:15px;letter-spacing:.32em;color:${BRAND.brass};font-weight:500;margin:0 0 18px}
    h2{font-size:30px;color:${BRAND.green};font-weight:500;margin:56px 0 6px} .lead{color:#5d625c;font-size:17px;margin:0 0 22px;max-width:980px}
    .grid{display:grid;gap:18px}.g2{grid-template-columns:1fr 1fr}.g4{grid-template-columns:repeat(4,1fr)}.g3{grid-template-columns:repeat(3,1fr)}
    .tile{border-radius:8px;display:flex;align-items:center;justify-content:center;min-height:250px;padding:36px}
    .cap{font-size:14px;color:#5d625c;margin-top:8px}
    .sw .chip{height:110px;border-radius:8px;margin-bottom:12px}.sw b{display:block;font-size:18px;font-weight:600;color:${BRAND.ink}}
    .sw span{display:block;font-size:15px;color:#3d423d}.sw em{display:block;font-style:normal;font-size:14px;color:#7a7466;margin-top:4px}
    .cs{position:absolute;display:flex;align-items:center;justify-content:center;font-size:13px;color:${BRAND.brass};background:rgba(184,151,90,.14)}
    .dont{position:relative}.dbox{background:#fff;border-radius:8px;height:170px;display:flex;align-items:center;justify-content:center;overflow:hidden}
    .x{position:absolute;top:10px;right:12px;width:28px;height:28px;border-radius:50%;background:#B42318;color:#fff;font-size:15px;display:flex;align-items:center;justify-content:center}
    .dont p{font-size:15px;margin:10px 0 0}
    table{border-collapse:collapse;font-size:16px;width:100%} td,th{text-align:left;padding:10px 12px;border-bottom:1px solid #ddd5c4} th{color:#5d625c;font-weight:500}
    .place{display:flex;gap:56px;align-items:flex-start;background:#fff;border-radius:8px;padding:28px 36px}
    .place p{font-size:16px;line-height:1.55;max-width:420px;margin:6px 0 0}
  </style></head><body>
  <h1>GOLFWEAR · BRAND GUIDE</h1>
  <div style="display:flex;align-items:center;justify-content:space-between">
    ${inline(H, VARIANTS.color, 720)}
    <p class="lead" style="max-width:520px;margin:0">A G drawn as a ring, with a flag on the pin flying out through its opening: the moment the ball drops. Set beside a calm, widely spaced wordmark. Elegant on a polo, clear on a sleeve.</p>
  </div>

  <h2>Logo versions</h2><p class="lead">Use the full-colour version whenever you can. Use one colour (black or white) for screen printing, embroidery in a single thread, or busy photos.</p>
  <div class="grid g2">
    <div>${tile(BRAND.ivory, inline(H, VARIANTS.color, 560), 'border:1px solid #ddd5c4')}<div class="cap">Horizontal: the main logo</div></div>
    <div>${tile(BRAND.green, inline(H, VARIANTS.reverse, 560))}<div class="cap">Horizontal, reversed: on green or dark photos</div></div>
  </div>
  <div class="grid g4" style="margin-top:18px">
    <div>${tile('#fff', inline(S, VARIANTS.color, 230))}<div class="cap">Stacked: square spaces</div></div>
    <div>${tile(BRAND.green, inline(I, VARIANTS.reverse, 150))}<div class="cap">Mark: profile picture, chest, tags</div></div>
    <div>${tile('#fff', inline(W, VARIANTS.black, 300))}<div class="cap">Wordmark, one colour: sleeves</div></div>
    <div>${tile('#1B1F1C', inline(I, VARIANTS.white, 150))}<div class="cap">Mark, white: one-colour printing</div></div>
  </div>

  <h2>Colours</h2><p class="lead">Fairway green carries the brand; brass is only for the flag and small accents. Ask the printer to match a physical swatch: screens and fabrics shift colour.</p>
  <div class="grid g4">
    ${sw('Fairway green', BRAND.green, '18 · 55 · 42', 'Logo, headings, backgrounds', true)}
    ${sw('Brass', BRAND.brass, '184 · 151 · 90', 'The flag, thin lines, highlights', true)}
    ${sw('Ivory', BRAND.ivory, '244 · 239 · 228', 'Light backgrounds', false)}
    ${sw('Ink', BRAND.ink, '16 · 22 · 20', 'Body text', true)}
  </div>

  <h2>Space and size</h2><p class="lead">Keep clear space of x (a quarter of the mark's height) on every side. Below the minimum sizes the flag disappears.</p>
  <div style="display:flex;gap:56px;align-items:center">
    ${clear}
    <table><tr><th>Version</th><th>Print / embroidery</th><th>Screen</th></tr>
      <tr><td>Mark</td><td>12 mm print · 20 mm embroidery</td><td>24 px</td></tr>
      <tr><td>Horizontal logo</td><td>35 mm wide</td><td>120 px wide</td></tr>
      <tr><td>Wordmark on a sleeve</td><td>80 mm long</td><td>-</td></tr></table>
  </div>

  <h2>On the product</h2><p class="lead">Suggested placement. Send the files in the <b>print</b> folder to your printer or embroiderer: they are vector and already at these sizes.</p>
  <div class="place">
    <div style="display:flex;gap:28px;align-items:flex-start">${sleeve}<div><b style="font-size:19px;color:${BRAND.green}">Arm sleeve</b>
      <p>Wordmark along the outer forearm, reading from the wrist up. 120 mm long, starting 60 mm above the cuff. One colour: green on white sleeves, white on black or grey.</p></div></div>
    <div style="display:flex;gap:20px;align-items:flex-start">${polo}<div><b style="font-size:19px;color:${BRAND.green}">Polo</b>
      <p>Mark on the left chest (the wearer's left), 30 mm wide, about 180 mm below the shoulder seam. Embroider in green with a brass flag, or one thread colour.</p></div></div>
  </div>

  <h2>Please don't</h2>
  <div class="grid g4">
    ${dont('Stretch or squash it', 'transform:scaleX(1.35)')}
    ${dont('Change its colours', 'filter:hue-rotate(150deg) saturate(2.4)')}
    ${dont('Add shadows or outlines', 'filter:drop-shadow(4px 6px 2px rgba(0,0,0,.45))')}
    ${dont('Rotate it or put it on a busy background', 'transform:rotate(-14deg)')}
  </div>

  <h2>Type</h2><p class="lead">For banners, labels and the website, use <b>Jost</b> (free, Google Fonts), the typeface the wordmark is drawn from. Headings in Jost Medium with wide letter spacing, text in Jost Regular.</p>
  <div style="display:flex;gap:64px;align-items:baseline">
    <div style="font-size:44px;font-weight:500;letter-spacing:.16em;color:${BRAND.green}">GOLF APPAREL</div>
    <div style="font-size:20px;max-width:640px;line-height:1.5">Arm sleeves and golf polos for every round. Jost Regular, 20 px, for text like this.</div>
  </div>
  </body></html>`;
}

await main();
