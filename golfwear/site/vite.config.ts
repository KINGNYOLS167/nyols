import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** Serves the API from server/app.ts during `npm run dev`, with an embedded database in .data/. */
function api(): Plugin {
  return {
    name: 'golfwear-api',
    configureServer(server) {
      process.env.GW_LOCAL_DB ??= process.env.DATABASE_URL ? '' : '.data/db';
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        try {
          const { default: app } = await server.ssrLoadModule('/server/app.ts');
          const { getRequestListener } = await import('@hono/node-server');
          await getRequestListener(app.fetch)(req, res);
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), api()],
  build: {
    target: 'es2022',
    // three.js (the lazy golf ball chunk on the About page) is ~550 kB minified on its own; that's expected.
    chunkSizeWarningLimit: 600,
  },
  ssr: { external: ['@electric-sql/pglite'] },
});
