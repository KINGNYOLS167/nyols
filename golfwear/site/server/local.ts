// Local production-like server: the built site from dist/ plus the API, with an embedded
// database in .data/ (set GW_LOCAL_DB=memory for a throwaway one, or DATABASE_URL for Postgres).
//   npm run build && npm run serve
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { getRequestListener } from '@hono/node-server';
import app from './app';

process.env.GW_LOCAL_DB ??= process.env.DATABASE_URL ? '' : '.data/db';
const ROOT = join(process.cwd(), 'dist');
const PORT = Number(process.env.PORT) || 4173;
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.json': 'application/json',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.xml': 'application/xml',
};

const api = getRequestListener(app.fetch);

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://local');
  if (url.pathname.startsWith('/api/')) return api(req, res);
  let file = normalize(join(ROOT, decodeURIComponent(url.pathname)));
  if (!file.startsWith(ROOT)) { res.writeHead(400).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(ROOT, 'index.html');
  }
  try {
    const body = await readFile(file);
    const headers: Record<string, string> = { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' };
    if (url.pathname.startsWith('/assets/')) headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    if (url.pathname.startsWith('/admin')) headers['X-Robots-Tag'] = 'noindex, nofollow';
    res.writeHead(200, headers).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, () => console.log(`GOLFWEAR running at http://localhost:${PORT}`));
