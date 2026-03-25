import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'zustand'],
  },
  // Allow Vite to resolve node_modules from the workspace root
  // This is needed because workspace packages import from zustand/nanoid
  // but Vite resolves relative to the importing file's location
  optimizeDeps: {
    include: ['zustand', 'zustand/vanilla', 'nanoid'],
  },
});
