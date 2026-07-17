import { validate } from '@qmf/contract';
import { emit } from '@qmf/events';
import { ConfigSchema } from './config.js';
import { createSampleStore } from './state.js';
import { registerSampleServices } from './service.js';
import { SampleReady } from './events.js';
import { createSampleView } from './view.js';

/**
 * @param {Record<string, unknown>} [raw]
 */
export function createSamplePlugin(raw = {}) {
  const result = validate(ConfigSchema, { enabled: true, ...raw }, { applyDefaults: true });
  if (!result.ok) throw new Error(result.errors.join('; '));
  const config = result.data;
  const store = createSampleStore();
  const view = createSampleView();

  return {
    name: 'sample',
    version: '1.0.0',
    async setup(ctx) {
      registerSampleServices(ctx);
    },
    hooks: {
      async onMount(ctx) {
        const el = ctx.root ?? document.querySelector('#qmf-sample');
        if (el instanceof HTMLElement) view.mount(el);
      },
      async onReady() {
        store.setState({ ready: true });
        emit(SampleReady, { ok: true });
      },
      async onDestroy() {
        view.unmount();
      },
    },
  };
}
