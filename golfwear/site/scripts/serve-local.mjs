// Runs the built site exactly like Vercel does, on your own computer, with a throwaway database.
//   npm run build:vercel && ADMIN_PASSWORD='choose-one-here' node scripts/serve-local.mjs
// Data lives in memory and disappears when you stop the server (PGlite). Port: PORT or 4173.
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { PGlite } from '@electric-sql/pglite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATIC = path.join(ROOT, '.vercel/output/static');
if (!fs.existsSync(STATIC)) { console.error('Run `npm run build:vercel` first.'); process.exit(1); }
if (!process.env.ADMIN_PASSWORD) console.warn('ADMIN_PASSWORD is not set: /admin will show the setup message.');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-serve-'));
const handlers = {};
for (const name of ['subscribe', 'admin']) {
  await build({ entryPoints: [path.join(ROOT, `server/${name}.ts`)], outfile: path.join(tmp, `${name}.mjs`), bundle: true, format: 'esm', platform: 'node', logLevel: 'error' });
  handlers[name] = (await import(pathToFileURL(path.join(tmp, `${name}.mjs`)).href)).default;
}
if (process.env.NO_DB !== '1') {
  const pg = new PGlite();
  globalThis.__GW_TEST_DB__ = { query: async (text, params) => (await pg.query(text, params)).rows };
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.glb': 'model/gltf-binary', '.ktx2': 'image/ktx2' };
const PORT = Number(process.env.PORT || 4173);

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const fn = /^\/api\/admin(\/|$)/.test(url.pathname) ? handlers.admin : url.pathname === '/api/subscribe' ? handlers.subscribe : null;
  if (fn) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
    headers.set('x-forwarded-for', req.socket.remoteAddress || '127.0.0.1');
    const out = await fn(new Request(url, { method: req.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined }));
    res.writeHead(out.status, Object.fromEntries(out.headers));
    res.end(Buffer.from(await out.arrayBuffer()));
    return;
  }
  if (url.pathname.startsWith('/api/')) { res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"error":"not_found"}'); return; }
  let file = path.join(STATIC, decodeURIComponent(url.pathname));
  if (!file.startsWith(STATIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(STATIC, 'index.html');
  const extra = /^\/admin(\/|$)/.test(url.pathname) ? { 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' } : {};
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', ...extra });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`GOLFWEAR running at http://localhost:${PORT}  (admin: /admin)`));
