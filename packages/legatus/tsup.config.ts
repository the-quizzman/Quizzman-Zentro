import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({ js: format === 'esm' ? '.js' : '.cjs' }),
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: ['@qmf/core', '@qmf/utils', '@qmf/ui'],
});
