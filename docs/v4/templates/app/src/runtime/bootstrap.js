/**
 * Bootstrap MyApp from qmf.schema.json
 */
import { bootstrapFromContract } from '@qmf/runtime';

bootstrapFromContract(new URL('../../qmf.schema.json', import.meta.url)).catch((err) => {
  console.error('[QMF] bootstrap failed', err);
  throw err;
});
