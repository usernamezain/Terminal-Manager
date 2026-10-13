import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
  },
  root: path.resolve(__dirname, 'src/renderer'),
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'zustand'],
          'vendor-xterm': [
            '@xterm/xterm',
            '@xterm/addon-fit',
            '@xterm/addon-search',
            '@xterm/addon-web-links',
            '@xterm/addon-serialize',
            '@xterm/addon-unicode11',
          ],
          'vendor-framer': ['framer-motion'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
