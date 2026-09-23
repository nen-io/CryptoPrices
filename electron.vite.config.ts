import { defineConfig } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
export default defineConfig({
 main: { build: { rollupOptions: { input: { index: resolve('src/main/index.ts'), worker: resolve('src/main/worker.ts') } } } },
 preload: { build: { rollupOptions: { input: resolve('src/preload/index.ts'), output: { format: 'cjs', entryFileNames: 'index.cjs' } } } },
 renderer: {
   publicDir: resolve('src/renderer/public'),
   plugins: [vue(), { name: 'development-only-hmr-csp', apply: 'serve', transformIndexHtml: html => html.replace("connect-src 'none'", "connect-src 'self' ws://127.0.0.1:*") }],
   server: { host: '127.0.0.1' },
   build: { rollupOptions: { input: resolve('src/renderer/index.html') } }
 }
});
