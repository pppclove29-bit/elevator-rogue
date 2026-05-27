import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  // Electron 패키지에서 file:// 로 dist/index.html 로드 시 상대경로 필요.
  // 브라우저 배포에서도 무해.
  base: './',
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
