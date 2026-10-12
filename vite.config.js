import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Código-fonte em /src; build em /docs (mantido por ora). Em dev, /api é
// redirecionado para o backend FastAPI em localhost:8000, então o cliente
// (services/api.js) usa caminhos relativos e funciona tanto no dev quanto
// servido na mesma origem em produção.
export default defineConfig({
  plugins: [react()],
  root: 'src',
  publicDir: '../public',
  base: './',
  build: { outDir: '../docs', emptyOutDir: true },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});
