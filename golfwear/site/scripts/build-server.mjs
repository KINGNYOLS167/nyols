// Bundles the API for local use (.server/local.mjs) and for Vercel (.server/vercel/index.mjs).
//   node scripts/build-server.mjs
import { build } from 'esbuild';
import { rmSync } from 'node:fs';

rmSync('.server', { recursive: true, force: true });

const common = {
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: false,
  legalComments: 'none',
  // PGlite is only for local development; postgres.js has an optional Cloudflare entry we never use.
  external: ['@electric-sql/pglite', 'cloudflare:sockets'],
  // esm bundles that pull in CommonJS code need require().
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: 'warning',
};

await build({ ...common, entryPoints: ['server/local.ts'], outfile: '.server/local.mjs' });
await build({ ...common, entryPoints: ['server/vercel.ts'], outfile: '.server/vercel/index.mjs', minify: true });
console.log('API bundled: .server/local.mjs, .server/vercel/index.mjs');
