import { emit, subscribe } from '@qmf/events';
import { assertValid } from '@qmf/contract';
import { ConfigSchema } from './config.js';
import { createDictionaryStore } from './state.js';
import { DICT_SEARCH_TOKEN, registerDictionaryServices } from './service.js';
import { DictionarySearch } from './events.js';
import { AuthSessionChanged } from '../auth/events.js';
import { createDictionaryView } from './view.js';

/**
 * Example module — vanilla JS.
 * @param {Record<string, unknown>} raw
 */
export function createDictionaryPlugin(raw = {}) {
  const config = assertValid(
    ConfigSchema,
    {
      apiBase: '/api/dict',
      mountSelector: '#qmf-dictionary',
      ...raw,
    },
    { name: 'dictionary.config' },
  );
  const store = createDictionaryStore();
  const view = createDictionaryView();
  /** @type {(() => void)|undefined} */
  let offAuth;

  return {
    name: 'dictionary',
    version: '1.0.0',
    dependencies: ['auth'],
    async setup(ctx) {
      registerDictionaryServices(ctx, config.apiBase);
    },
    hooks: {
      async onMount(ctx) {
        const root = document.querySelector(config.mountSelector);
        if (!(root instanceof HTMLElement)) return;

        view.mount(root, async (keyword) => {
          emit(DictionarySearch, { keyword, source: 'header' });
          const svc = ctx.container.resolve(DICT_SEARCH_TOKEN);
          const results = await svc.search(keyword);
          store.setState({ query: keyword, results });
          view.renderResults(results);
        });
      },
      async onConnect() {
        offAuth = subscribe(AuthSessionChanged, (payload) => {
          store.setState({ authed: payload.userId != null });
        });
      },
      async onDestroy() {
        offAuth?.();
        view.unmount();
      },
    },
  };
}
