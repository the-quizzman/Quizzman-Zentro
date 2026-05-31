import { defineConfig } from 'tsup';

export default defineConfig([
  // Browser build (IIFE)
  {
    entry: { 'qmf-migrate.min': 'src/browser.js' },
    format: ['iife'],
    globalName: 'QMFMigrate',
    minify: true,
    clean: true,
    platform: 'browser',
    target: 'es2020'
  },
  // ESM/CJS builds from browser.js (browser-safe)
  {
    entry: { 'index': 'src/browser.js' },
    format: ['esm', 'cjs'],
    dts: false,
    sourcemap: true,
    platform: 'browser'
  }
]);
