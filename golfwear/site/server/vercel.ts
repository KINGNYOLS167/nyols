// Entry for the Vercel function (bundled by scripts/build-vercel.mjs). The route table sends
// /api/<path> here as /api?__p=<path>; restore the original path before Hono sees it.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getRequestListener } from '@hono/node-server';
import app from './app';

const listener = getRequestListener(app.fetch);

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://local');
  const rest = url.searchParams.get('__p');
  if (rest !== null) {
    url.searchParams.delete('__p');
    url.pathname = '/api/' + rest.replace(/^\/+/, '');
    req.url = url.pathname + url.search;
  }
  return listener(req, res);
}
