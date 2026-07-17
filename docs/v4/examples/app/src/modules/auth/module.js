import { emit } from '@qmf/events';
import { assertValid } from '@qmf/contract';
import { ConfigSchema } from './config.js';
import { createAuthStore } from './state.js';
import { AUTH_SESSION_TOKEN, registerAuthServices } from './service.js';
import { AuthSessionChanged } from './events.js';
import { createAuthView } from './view.js';

/**
 * Example plugin (= module entry) — vanilla JS.
 * @param {Record<string, unknown>} raw
 */
export function createAuthPlugin(raw = {}) {
  const config = assertValid(
    ConfigSchema,
    {
      apiEndpoint: '/api/auth/me',
      showTierBadge: true,
      ...raw,
    },
    { name: 'auth.config' },
  );
  const store = createAuthStore();
  const view = createAuthView();

  return {
    name: 'auth',
    version: '1.0.0',
    async setup(ctx) {
      registerAuthServices(ctx, config.apiEndpoint);
    },
    hooks: {
      async onMount(ctx) {
        const root = ctx.root ?? document.querySelector('#qmf-auth');
        if (root instanceof HTMLElement) {
          view.mount(root, { loginUrl: config.loginUrl });
        }
      },
      async onConnect(ctx) {
        const auth = ctx.container.resolve(AUTH_SESSION_TOKEN);
        const session = await auth.fetchSession();
        store.setState({
          ready: true,
          userId: session?.userId ?? null,
          tier: session?.tier ?? null,
          error: null,
        });
      },
      async onReady() {
        const s = store.getState();
        view.renderUser(s.userId);
        emit(AuthSessionChanged, { userId: s.userId, tier: s.tier });
      },
      async onDestroy() {
        view.unmount();
      },
    },
  };
}
