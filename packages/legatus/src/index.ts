/**
 * @qmf/legatus — Official QMF module for Legatus communication UI.
 *
 * Backend: https://legatus.quizzman.com (REST + SSE stream; WebSocket for rooms)
 * Assets:  https://ui.quizzman.com/qmf/dist/legatus/
 */

import { z, validateConfig, type QMFPlugin } from '@qmf/core';
import legatusRuntime from './runtime/index.js';

export const LegatusConfigSchema = z.object({
  /** Legatus API origin (no trailing slash). */
  endpoint: z.string().url().default('https://legatus.quizzman.com'),
  /** Pre-set access token. */
  token: z.string().optional(),
  /** Async token provider (SSO / localStorage). */
  tokenProvider: z.function().optional(),
  /** Open live channel on init (SSE by default; WS only if realtime). */
  autoConnect: z.boolean().default(true),
  /** `auto` prefers SSE; `ws` for rooms/presence; `poll` never holds a socket. */
  transport: z.enum(['auto', 'sse', 'ws', 'poll']).default('auto'),
  /** When true, use WebSocket (rooms / presence) instead of SSE. */
  realtime: z.boolean().default(false),
  /** Drop the live socket this many ms after the tab is hidden. */
  pauseHiddenMs: z.number().default(15000),
  /** Mount global toast host. */
  toastHost: z.boolean().default(true),
  /** CSS URL for plugin loader injection (CDN). */
  stylesUrl: z
    .string()
    .url()
    .default('https://ui.quizzman.com/qmf/dist/legatus/legatus.css'),
  /** Auto-mount bell into selector on plugin mount. */
  mountTo: z.string().optional(),
  debug: z.boolean().default(false),
});

export type LegatusConfig = z.infer<typeof LegatusConfigSchema>;

/** Standalone Legatus client API (also exposed as `window.Legatus` in CDN bundle). */
export const Legatus = legatusRuntime;

/**
 * Create Legatus as a QMF plugin.
 *
 * ```js
 * QMF.use(createLegatusPlugin({ endpoint: 'https://legatus.quizzman.com' }));
 * QMF.init({ appId: 'wiki' });
 * ```
 */
export function createLegatusPlugin(config: Partial<LegatusConfig> = {}): QMFPlugin {
  const cfg = validateConfig(LegatusConfigSchema, config, 'Legatus');

  return {
    name: 'legatus',
    version: '1.0.0',
    styles: [cfg.stylesUrl],
    hooks: {
      onMount: async () => {
        Legatus.init({
          endpoint: cfg.endpoint,
          token: cfg.token,
          tokenProvider: cfg.tokenProvider as (() => string | null | Promise<string | null>) | undefined,
          autoConnect: cfg.autoConnect,
          toastHost: cfg.toastHost,
          transport: cfg.transport,
          realtime: cfg.realtime,
          pauseHiddenMs: cfg.pauseHiddenMs,
        });
        if (cfg.mountTo) {
          Legatus.mount(cfg.mountTo);
        }
        if (typeof window !== 'undefined') {
          (window as unknown as Record<string, unknown>).Legatus = Legatus;
          const qmf = (window as unknown as Record<string, unknown>).QMF as
            | Record<string, unknown>
            | undefined;
          if (qmf) qmf.Legatus = Legatus;
        }
      },
      onDestroy: () => {
        try {
          Legatus.client?.disconnect?.();
        } catch {
          /* ignore */
        }
      },
    },
    setup: (ctx) => {
      ctx.expose('init', Legatus.init.bind(Legatus));
      ctx.expose('mount', Legatus.mount.bind(Legatus));
      ctx.expose('on', Legatus.on.bind(Legatus));
      ctx.expose('off', Legatus.off.bind(Legatus));
      ctx.expose('emit', Legatus.emit.bind(Legatus));
      ctx.expose('refresh', Legatus.refresh.bind(Legatus));
      ctx.expose('reconnect', Legatus.reconnect.bind(Legatus));
      ctx.expose('getState', Legatus.getState.bind(Legatus));
      ctx.expose('client', () => Legatus.client);
    },
  };
}

/** Register custom elements without full QMF init. */
export function registerLegatusElements(): void {
  Legatus.init({ autoConnect: false, toastHost: false });
}

export default Legatus;
