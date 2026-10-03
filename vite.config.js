import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O código-fonte (index.html incluso) fica em /src; o build vai para /docs.
// O index.html da raiz só redireciona para /docs, então o GitHub Pages funciona
// tanto com a pasta "/ (root)" quanto com "/docs".
export default defineConfig({
  plugins: [react()],
  root: 'src',
  publicDir: '../public',
  base: './',
  build: { outDir: '../docs', emptyOutDir: true },
});
