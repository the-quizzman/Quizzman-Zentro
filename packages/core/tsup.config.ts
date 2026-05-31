import { defineConfig } from 'tsup';

export default defineConfig([
  // ESM and CJS for npm
  {
    entry: {
      index: 'src/index.ts',
      compat: 'src/compat.ts',
      'event-bus': 'src/event-bus.ts',
      state: 'src/state.ts',
      lifecycle: 'src/lifecycle.ts',
      di: 'src/di.ts',
      'error-boundary': 'src/error-boundary.ts',
      'event-tracer': 'src/event-tracer.ts',
    },
    format: ['esm', 'cjs'],
    outExtension: ({ format }) => ({
      js: format === 'esm' ? '.js' : '.cjs',
    }),
    dts: false, // Temporarily disabled due to Zod type inference complexity
    sourcemap: true,
    clean: true,
    splitting: false,
    treeshake: true,
    target: 'es2020',
    minify: process.env.NODE_ENV === 'production',
    external: ['zod'],
    esbuildOptions(options) {
      if (process.env.NODE_ENV === 'production') {
        options.drop = ['console', 'debugger'];
      }
    },
  },
  // IIFE for browser/CDN (Core only)
  {
    entry: { 'index.iife': 'src/index.ts' },
    format: ['iife'],
    globalName: 'QMFCore',
    outExtension: () => ({ js: '.js' }),
    sourcemap: true,
    treeshake: true,
    target: 'es2020',
    minify: true,
    noExternal: ['zod'],
    esbuildOptions(options) {
      options.drop = ['console', 'debugger'];
    },
  },
  // IIFE for browser/CDN (Compat layer for v2 apps)
  {
    entry: { 'compat.iife': 'src/compat.ts' },
    format: ['iife'],
    globalName: 'QMFCompat',
    outExtension: () => ({ js: '.js' }),
    sourcemap: true,
    treeshake: true,
    target: 'es2020',
    minify: true,
    noExternal: ['zod'],
    esbuildOptions(options) {
      options.drop = ['console', 'debugger'];
    },
  },
]);
