// Assembles a Vercel Build Output (v3) in ./.vercel/output from dist/ and the bundled API:
//   static/        the built site
//   functions/api.func   the API (Node.js function)
//   config.json    routes: API rewrite, cache and security headers, SPA fallback
// Run after `npm run build` and `node scripts/build-server.mjs`.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

const OUT = '.vercel/output';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/functions/api.func`, { recursive: true });
cpSync('dist', `${OUT}/static`, { recursive: true });
cpSync('.server/vercel/index.mjs', `${OUT}/functions/api.func/index.mjs`);
writeFileSync(`${OUT}/functions/api.func/package.json`, JSON.stringify({ type: 'module' }));
writeFileSync(
  `${OUT}/functions/api.func/.vc-config.json`,
  JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs', shouldAddHelpers: false, maxDuration: 30 }, null, 2),
);

const security = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};

const config = {
  version: 3,
  routes: [
    { src: '^/(.*)$', headers: security, continue: true },
    { src: '^/assets/(.*)$', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
    { src: '^/(campaign|ball|fonts)/(.*)$', headers: { 'cache-control': 'public, max-age=2592000' }, continue: true },
    { src: '^/admin(?:/.*)?$', headers: { 'x-robots-tag': 'noindex, nofollow', 'x-frame-options': 'DENY', 'cache-control': 'no-store' }, continue: true },
    { src: '^/api/(.*)$', dest: '/api?__p=$1' },
    { handle: 'filesystem' },
    { src: '^/api(?:/.*)?$', status: 404, dest: '/api?__p=not-found' },
    { src: '^/(.*)$', dest: '/index.html' },
  ],
};
writeFileSync(`${OUT}/config.json`, JSON.stringify(config, null, 2));
console.log(`Vercel build output written to ${OUT}`);
