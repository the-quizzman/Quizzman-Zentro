/**
 * @qmf/core - QMF Framework Core
 * Main entry point. Ties together event bus, state, lifecycle,
 * config resolver, HTTP, plugin loader, and version metadata.
 */

import { EventBus, getGlobalEventBus } from './event-bus';
import { Store, createStore, GlobalStateSchema, type GlobalState } from './state';
import { LifecycleManager, createLifecycle } from './lifecycle';
import { validateConfig, resolveConfig, resolveEnvUrls, detectChannel, z, type QMFChannel } from './config';
import { HttpClient, createHttpClient } from './http';
import { PluginLoader, createPluginLoader, type QMFPlugin, type LazyPluginLoader } from './plugin-loader';
import { DIContainer, getGlobalContainer } from './di';
import { EventTracer, installDevTools } from './event-tracer';
import { listModuleStores } from './state';
import { getAllModuleErrors } from './error-boundary';
import { QMF_VERSION, printVersion, getBuildMeta } from './version';

/** Global QMF initialization options */
export const QMFInitSchema = z.object({
  appId: z.string().min(1),
  channel: z.enum(['dev', 'staging', 'production']).optional(),
  debug: z.boolean().default(false),
  features: z
    .object({
      chat: z.boolean().default(false),
      notifications: z.boolean().default(false),
      header: z.boolean().default(true),
      footer: z.boolean().default(true),
      loadingScreen: z.boolean().default(false),
    })
    .default({}),
  header: z.record(z.unknown()).optional(),
  footer: z.record(z.unknown()).optional(),
  auth: z
    .object({
      getToken: z.function().optional(),
      getUser: z.function().optional(),
    })
    .optional(),
});

export type QMFInitOptions = z.infer<typeof QMFInitSchema>;

/** Global QMF state — now uses GlobalState from state.ts with Zod validation */
type QMFState = GlobalState;

/**
 * QMF Framework singleton.
 */
class QMFFramework {
  private _eventBus: EventBus | null = null;
  private _store: Store<QMFState> | null = null;
  private _http: HttpClient | null = null;
  private _pluginLoader: PluginLoader | null = null;
  private _lifecycle: LifecycleManager | null = null;
  private _container: DIContainer | null = null;
  private _tracer: EventTracer | null = null;
  private _options: QMFInitOptions | null = null;

  /** Framework version */
  get version(): string {
    return QMF_VERSION;
  }

  /** Event bus */
  get events(): EventBus {
    if (!this._eventBus) this._eventBus = getGlobalEventBus();
    return this._eventBus;
  }

  /** State store */
  get store(): Store<QMFState> {
    if (!this._store) throw new Error('[QMF] Not initialized. Call QMF.init() first.');
    return this._store;
  }

  /** HTTP client */
  get http(): HttpClient {
    if (!this._http) throw new Error('[QMF] Not initialized. Call QMF.init() first.');
    return this._http;
  }

  /** DI container */
  get container(): DIContainer {
    if (!this._container) this._container = getGlobalContainer();
    return this._container;
  }

  /** Event tracer (available after init, only in debug mode) */
  get tracer(): EventTracer | null {
    return this._tracer;
  }

  /** Plugin loader */
  get plugins(): PluginLoader {
    if (!this._pluginLoader) throw new Error('[QMF] Not initialized. Call QMF.init() first.');
    return this._pluginLoader;
  }

  /**
   * Initialize the QMF framework.
   */
  async init(options: Partial<QMFInitOptions>): Promise<void> {
    // Validate config
    const config = validateConfig(QMFInitSchema, options, 'QMF');
    this._options = config;

    const channel = config.channel ?? detectChannel();
    const urls = resolveEnvUrls(channel);
    const debug = config.debug ?? false;

    // Init event bus
    this._eventBus = new EventBus({ debug });

    // Init state store with Zod schema validation
    this._store = createStore<QMFState>(
      {
        initialized: false,
        appId: config.appId,
        channel,
        debug,
        user: null,
        theme: this.detectTheme(),
        language: 'vi',
      },
      { name: 'QMF:Global', debug, schema: GlobalStateSchema },
    );

    // Init HTTP client
    this._http = createHttpClient({
      baseUrl: urls.main,
      getToken: config.auth?.getToken as (() => string | null) | undefined,
      debug,
    });

    // Init DI container with core services
    this._container = new DIContainer();
    this._container.registerInstance('eventBus', this._eventBus);
    this._container.registerInstance('store', this._store);
    this._container.registerInstance('http', this._http);
    this._container.registerInstance('config', config);

    // Init plugin loader
    this._pluginLoader = createPluginLoader(this._eventBus, this._container, config.debug);

    // Init event tracer (debug mode)
    if (config.debug) {
      this._tracer = new EventTracer(this._eventBus, {
        enabled: true,
        consoleLog: false, // Set to true for verbose console output
        maxEntries: 1000,
      });
    }

    // Init lifecycle
    this._lifecycle = createLifecycle({
      name: 'QMF',
      eventBus: this._eventBus,
      debug: config.debug,
      hooks: {
        onInit: () => {
          this._store!.setState({ initialized: true });
          this._eventBus!.emit('qmf:initialized', { appId: config.appId, channel });
        },
        onReady: () => {
          this._eventBus!.emit('qmf:ready', { appId: config.appId });
          if (config.debug) {
            printVersion();
            // Install DevTools in debug mode
            if (this._tracer) {
              installDevTools({
                eventBus: this._eventBus!,
                tracer: this._tracer,
                getState: () => this._store!.getState(),
                getPlugins: () => this._pluginLoader!.names(),
                getModuleStores: () => listModuleStores(),
                getErrors: () => getAllModuleErrors(),
              });
            }
          }
        },
        onDestroy: () => {
          this._eventBus!.emit('qmf:destroyed');
        },
      },
    });

    await this._lifecycle.start();
  }

  /**
   * Register a plugin/module (eager or lazy).
   * Lazy usage: qmf.use(lazy(() => import('@qmf/chat-embed')))
   */
  use(plugin: QMFPlugin | LazyPluginLoader): this {
    this.plugins.register(plugin);
    return this;
  }

  /**
   * Get build metadata.
   */
  getBuildMeta() {
    return getBuildMeta();
  }

  /**
   * Get current config.
   */
  getConfig(): QMFInitOptions | null {
    return this._options;
  }

  /**
   * Destroy the framework and all plugins.
   */
  async destroy(): Promise<void> {
    if (this._pluginLoader) {
      await this._pluginLoader.destroyAll();
    }
    if (this._lifecycle) {
      await this._lifecycle.destroy();
    }
    this._tracer?.destroy();
    this._container?.clear();
    this._store?.destroy();
    this._eventBus?.clear();
    this._options = null;
  }

  private detectTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    try {
      const cookieMatch = typeof document !== 'undefined' && document.cookie ? document.cookie.match(/(?:^|;\s*)qmf-theme=([^;]+)/) : null;
      if (cookieMatch) {
        const val = decodeURIComponent(cookieMatch[1]).trim().toLowerCase();
        if (val === 'dark' || val === 'light') return val;
      }
      const stored = localStorage.getItem('qmf-theme') || localStorage.getItem('qm-theme');
      if (stored === 'dark' || stored === 'light') return stored;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch {
      // Ignore
    }
    return 'light';
  }
}

/** Global QMF instance */
export const QMF = new QMFFramework();

// Expose to window in browser
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).QMF = QMF;
}
