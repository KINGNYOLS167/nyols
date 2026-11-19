import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Multi-page static build: every page is plain HTML enhanced by a small JS module.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        shop: resolve(import.meta.dirname, 'shop.html'),
        product: resolve(import.meta.dirname, 'product.html'),
      },
    },
  },
});
