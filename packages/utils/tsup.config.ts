import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({
    js: format === 'esm' ? '.js' : '.cjs',
  }),
  dts: false,
  clean: true,
  sourcemap: true,
  treeshake: true,
  target: 'es2020',
  minify: true,
  esbuildOptions(options) {
    options.drop = ['console', 'debugger'];
  },
});
