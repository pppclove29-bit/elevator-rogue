import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        docs: resolve(__dirname, 'docs.html'),
        design: resolve(__dirname, 'design.html'),
        sounds: resolve(__dirname, 'sounds.html'),
        sprites: resolve(__dirname, 'sprites.html'),
      },
    },
  },
});
