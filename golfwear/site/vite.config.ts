import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// three.js is only imported by the lazily loaded golf ball, so it lands in its own chunk.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // three.js (the lazy GolfBall chunk) is ~550 kB minified on its own; that's expected.
  build: { target: 'es2022', chunkSizeWarningLimit: 600 },
});
