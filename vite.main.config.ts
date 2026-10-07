import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    target: 'node20',
    outDir: 'dist',
    lib: {
      entry: {
        'main/index': path.resolve(__dirname, 'src/main/index.ts'),
        'helper/adminHelper': path.resolve(__dirname, 'src/helper/adminHelper.ts'),
      },
      formats: ['cjs'],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        'electron',
        'node-pty',
        'fs',
        'path',
        'os',
        'child_process',
        'events',
        'util',
        'crypto',
        'net',
      ],
    },
    sourcemap: true,
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
});
