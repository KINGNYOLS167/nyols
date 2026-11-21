// Packages dist/ and the Edge Functions in server/ as Vercel Build Output (v3) in .vercel/output.
// Run after `vite build`:  node scripts/build-vercel.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.vercel/output');
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'dist'), path.join(OUT, 'static'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'static/_api'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'static/_api/404.json'), JSON.stringify({ error: 'not_found' }));

for (const name of ['subscribe', 'admin']) {
  const dir = path.join(OUT, `functions/api/${name}.func`);
  await build({
    entryPoints: [path.join(ROOT, `server/${name}.ts`)],
    outfile: path.join(dir, 'index.js'),
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    mainFields: ['browser', 'module', 'main'],
    conditions: ['edge-light', 'worker', 'browser'],
    minify: true,
    logLevel: 'warning',
  });
  // envVarsInUse: the settings Vercel must hand to the function at runtime (values stay in Vercel).
  fs.writeFileSync(path.join(dir, '.vc-config.json'), JSON.stringify({ runtime: 'edge', entrypoint: 'index.js', envVarsInUse: ['DATABASE_URL', 'POSTGRES_URL', 'ADMIN_PASSWORD', 'SESSION_SECRET'] }));
}

const config = {
  version: 3,
  routes: [
    { src: '^/assets/(.*)$', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
    { src: '^/(photos|products|ball)/(.*)$', headers: { 'cache-control': 'public, max-age=604800' }, continue: true },
    { src: '^/admin(?:/.*)?$', headers: { 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' }, continue: true },
    { src: '^/(.*)$', headers: { 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'SAMEORIGIN' }, continue: true },
    { src: '^/api/admin(?:/.*)?$', dest: '/api/admin' },
    { handle: 'filesystem' },
    { src: '^/api/.*$', status: 404, dest: '/_api/404.json' },
    { src: '^/(.*)$', dest: '/index.html' },
  ],
};
fs.writeFileSync(path.join(OUT, 'config.json'), JSON.stringify(config, null, 2));
console.log('Vercel output written to .vercel/output');
