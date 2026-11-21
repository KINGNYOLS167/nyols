// Serves .vercel/output the way Vercel does: applies config.json routes in order (headers,
// rewrites, the filesystem step, the SPA fallback) and calls the API function's default export
// with Node's (req, res). Lets the tests run against the exact artifact that gets deployed.
//   npm run build:vercel && DATABASE_URL=... ADMIN_PASSWORD=... node tests/vercel-harness.mjs
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';

const OUT = join(process.cwd(), '.vercel/output');
const config = JSON.parse(readFileSync(join(OUT, 'config.json'), 'utf8'));
const vc = JSON.parse(readFileSync(join(OUT, 'functions/api.func/.vc-config.json'), 'utf8'));
const { default: handler } = await import(pathToFileURL(join(OUT, 'functions/api.func', vc.handler)).href);
const PORT = Number(process.env.PORT) || 4190;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain' };

function staticFile(path) {
  const file = normalize(join(OUT, 'static', decodeURIComponent(path)));
  if (!file.startsWith(join(OUT, 'static'))) return null;
  try { return statSync(file).isFile() ? file : null; } catch { return null; }
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  let path = url.pathname;
  let search = url.search;
  const headers = {};
  for (const route of config.routes) {
    if (route.handle === 'filesystem') {
      const file = staticFile(path);
      if (file) {
        res.writeHead(200, { ...headers, 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
        res.end(readFileSync(file));
        return;
      }
      continue;
    }
    const m = new RegExp(route.src).exec(path);
    if (!m) continue;
    Object.assign(headers, route.headers ?? {});
    if (route.dest) {
      const dest = route.dest.replace(/\$(\d)/g, (_, i) => m[Number(i)] ?? '');
      const d = new URL(dest, 'http://local');
      const merged = new URLSearchParams(url.search);
      d.searchParams.forEach((v, k) => merged.set(k, v));
      path = d.pathname;
      search = merged.toString() ? `?${merged}` : '';
    }
    if (route.continue) continue;
    if (path === '/api') {
      for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
      req.url = path + search;
      if (route.status) res.statusCode = route.status;
      return handler(req, res);
    }
    const file = staticFile(path);
    if (file) {
      res.writeHead(route.status ?? 200, { ...headers, 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(readFileSync(file));
      return;
    }
  }
  res.writeHead(404).end('Not found');
}).listen(PORT, () => console.log(`Vercel output served at http://localhost:${PORT}`));

if (!existsSync(join(OUT, 'static/index.html'))) console.warn('No static/index.html in the build output.');
