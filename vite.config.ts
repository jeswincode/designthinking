import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  server: { proxy: { '/api': { target: 'http://127.0.0.1:' + (loadEnv(mode, process.cwd(), '').SERVER_PORT || '8787'), changeOrigin: true } } },
  base: './',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: 'dist' },
}));

