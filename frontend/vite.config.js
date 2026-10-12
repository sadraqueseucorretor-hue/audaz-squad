import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Produção: o app mora em audazimob.com/squad, então base '/squad/'.
// Dev: base '/', e /api é redirecionado para o backend (Docker na porta 8020).
// Fonte em /src; build em /dist (frontend/dist), que o nginx da VPS serve.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  root: 'src',
  publicDir: '../public',
  base: mode === 'production' ? '/squad/' : '/',
  build: { outDir: '../dist', emptyOutDir: true },
  server: {
    proxy: {
      '/api': 'http://localhost:8020',
    },
  },
}));
