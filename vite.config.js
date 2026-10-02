import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' permite publicar em qualquer hospedagem estática.
// O build vai para /docs, pasta que o GitHub Pages publica (Settings → Pages → main /docs).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'docs', emptyOutDir: true },
});
