import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: {
        arcade: fileURLToPath(new URL('./index.html', import.meta.url)),
        gedi: fileURLToPath(new URL('./gedi/index.html', import.meta.url)),
        namboothiri: fileURLToPath(new URL('./namboothiri/index.html', import.meta.url)),
      },
    },
  },
  server: { host: true },
});
