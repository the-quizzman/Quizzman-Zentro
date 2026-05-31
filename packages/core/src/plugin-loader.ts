/**
 * @qmf/core - Plugin Loader
 * Dynamic module/plugin registration and resolution system.
 * Supports eager and lazy (dynamic import) plugins with CSS injection.
 */

import { LifecycleManager, createLifecycle, type LifecycleHooks } from './lifecycle';
import { EventBus } from './event-bus';
import { DIContainer } from './di';
import { createErrorBoundary, type ModuleErrorBoundary } from './error-boundary';
import type { BaseConfig } from './config';

/** Plugin/Module definition */
export interface QMFPlugin<TConfig extends BaseConfig = BaseConfig> {
  /** Unique plugin name (e.g., "header", "chat-embed") */
  name: string;
  /** Plugin version */
  version?: string;
  /** Dependencies on other plugins */
  dependencies?: string[];
  /** Plugin-specific config */
  config?: TConfig;
  /** Lifecycle hooks */
  hooks?: LifecycleHooks;
  /** CSS URLs to inject when the plugin loads */
  styles?: string[];
  /** Setup function called during init */
  setup?: (context: PluginContext) => void | Promise<void>;
  /** Teardown function called during destroy */
  teardown?: () => void | Promise<void>;
}

/** Lazy plugin loader — returned by lazy() helper */
export interface LazyPluginLoader {
  /** Marker to distinguish from a regular plugin */
  __lazy: true;
  /** Factory that returns a promise of the plugin */
  load: () => Promise<QMFPlugin | { default: QMFPlugin }>;
}

/** Context provided to plugins during setup */
export interface PluginContext {
  /** Global event bus */
  eventBus: EventBus;
  /** DI container — register/resolve shared services */
  container: DIContainer;
  /** Config for this plugin */
  config: BaseConfig;
  /** Lifecycle manager for this plugin */
  lifecycle: LifecycleManager;
  /** Register a public API method */
  expose: (key: string, value: unknown) => void;
  /** Get another plugin's exposed API */
  getPlugin: (name: string) => PluginInstance | undefined;
}

/** Registered plugin instance */
export interface PluginInstance {
  plugin: QMFPlugin;
  lifecycle: LifecycleManager;
  errorBoundary: ModuleErrorBoundary;
  api: Map<string, unknown>;
  /** CSS link elements injected by this plugin */
  styleElements?: HTMLLinkElement[];
}

export class PluginLoader {
  private plugins = new Map<string, PluginInstance>();
  private lazyQueue = new Map<string, LazyPluginLoader>();
  private eventBus: EventBus;
  private container: DIContainer;
  private debug: boolean;

  constructor(eventBus: EventBus, container: DIContainer, debug = false) {
    this.eventBus = eventBus;
    this.container = container;
    this.debug = debug;
  }

  /**
   * Register a plugin (eager) or lazy plugin loader.
   */
  register(pluginOrLazy: QMFPlugin | LazyPluginLoader): void {
    if (isLazyPlugin(pluginOrLazy)) {
      // For lazy plugins we can't know the name upfront — store a temp key and resolve during init
      // The caller should use `qmf.use(lazy(() => import(...)))` and we resolve during initAll
      this.lazyQueue.set(`__lazy_${this.lazyQueue.size}`, pluginOrLazy);
      if (this.debug) {
        console.debug(`[QMF:PluginLoader] Registered lazy plugin (will resolve on init)`);
      }
      this.eventBus.emit('plugin:lazy-registered', {});
      return;
    }

    this.registerEager(pluginOrLazy);
  }

  /**
   * Register an eager (already-resolved) plugin.
   */
  private registerEager(plugin: QMFPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`[QMF:PluginLoader] Plugin "${plugin.name}" is already registered.`);
    }

    // Check dependencies (skip for lazy — they'll be checked after resolve)
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep) && !this.lazyQueue.has(dep)) {
          throw new Error(
            `[QMF:PluginLoader] Plugin "${plugin.name}" depends on "${dep}" which is not registered. ` +
              'Register dependencies first.',
          );
        }
      }
    }

    const lifecycle = createLifecycle({
      name: plugin.name,
      hooks: plugin.hooks,
      eventBus: this.eventBus,
      debug: this.debug,
    });

    const errorBoundary = createErrorBoundary({
      module: plugin.name,
      eventBus: this.eventBus,
      debug: this.debug,
    });

    const instance: PluginInstance = {
      plugin,
      lifecycle,
      errorBoundary,
      api: new Map(),
    };

    this.plugins.set(plugin.name, instance);

    if (this.debug) {
      console.debug(`[QMF:PluginLoader] Registered "${plugin.name}" v${plugin.version ?? '?'}`);
    }

    this.eventBus.emit('plugin:registered', { name: plugin.name, version: plugin.version });
  }

  /**
   * Resolve and register all lazy plugins.
   */
  private async resolveLazyPlugins(): Promise<void> {
    const entries = Array.from(this.lazyQueue.entries());
    const results = await Promise.allSettled(
      entries.map(async ([key, lazyLoader]) => {
        const result = await lazyLoader.load();
        const plugin = 'default' in result ? (result as { default: QMFPlugin }).default : result as QMFPlugin;
        return { key, plugin };
      }),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        try {
          this.registerEager(result.value.plugin);
          if (this.debug) {
            console.debug(`[QMF:PluginLoader] Lazy-resolved "${result.value.plugin.name}"`);
          }
        } catch (err) {
          console.error(`[QMF:PluginLoader] Failed to register lazy plugin "${result.value.key}":`, err);
          this.eventBus.emit('plugin:error', { key: result.value.key, error: err });
        }
      } else {
        console.error(`[QMF:PluginLoader] Failed to resolve lazy plugin:`, result.reason);
        this.eventBus.emit('plugin:error', { error: result.reason });
      }
    }
    this.lazyQueue.clear();
  }

  /**
   * Initialize a specific plugin (wrapped in error boundary).
   */
  async initPlugin(name: string): Promise<void> {
    const instance = this.plugins.get(name);
    if (!instance) {
      throw new Error(`[QMF:PluginLoader] Plugin "${name}" not found.`);
    }

    const result = await instance.errorBoundary.guard(async () => {
      // Inject CSS if specified
      if (instance.plugin.styles?.length) {
        instance.styleElements = injectStyles(instance.plugin.name, instance.plugin.styles);
      }

      const context: PluginContext = {
        eventBus: this.eventBus,
        container: this.container,
        config: instance.plugin.config ?? { debug: false, channel: 'production' },
        lifecycle: instance.lifecycle,
        expose: (key, value) => instance.api.set(key, value),
        getPlugin: (n) => this.plugins.get(n),
      };

      if (instance.plugin.setup) {
        await instance.plugin.setup(context);
      }

      await instance.lifecycle.start();
    }, 'init');

    if (!result.ok) {
      console.error(
        `[QMF:PluginLoader] Plugin "${name}" failed to initialize. ` +
          'The error was isolated — other modules continue running.',
        result.error.error.message,
      );
    }
  }

  /**
   * Initialize all registered plugins in dependency order.
   * Resolves lazy plugins first, then topological sort + init.
   * Errors in one plugin do NOT stop others from initializing.
   */
  async initAll(): Promise<void> {
    // Phase 1: Resolve lazy imports
    await this.resolveLazyPlugins();
    // Phase 2: Init in dependency order
    const sorted = this.topologicalSort();
    for (const name of sorted) {
      await this.initPlugin(name);
    }
  }

  /**
   * Destroy a specific plugin (wrapped in error boundary).
   */
  async destroyPlugin(name: string): Promise<void> {
    const instance = this.plugins.get(name);
    if (!instance) return;

    await instance.errorBoundary.guard(async () => {
      // Remove injected CSS
      if (instance.styleElements) {
        for (const el of instance.styleElements) {
          el.remove();
        }
      }

      if (instance.plugin.teardown) {
        await instance.plugin.teardown();
      }
      await instance.lifecycle.destroy();
    }, 'destroy');

    this.plugins.delete(name);
    this.eventBus.emit('plugin:destroyed', { name });
  }

  /**
   * Destroy all plugins in reverse dependency order.
   */
  async destroyAll(): Promise<void> {
    const sorted = this.topologicalSort().reverse();
    for (const name of sorted) {
      await this.destroyPlugin(name);
    }
  }

  /**
   * Get a registered plugin instance.
   */
  get(name: string): PluginInstance | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get a plugin's exposed API value.
   */
  getApi<T>(pluginName: string, key: string): T | undefined {
    return this.plugins.get(pluginName)?.api.get(key) as T | undefined;
  }

  /**
   * Check if a plugin is registered.
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Get all registered plugin names.
   */
  names(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Topological sort of plugins by dependencies.
   */
  private topologicalSort(): string[] {
    const visited = new Set<string>();
    const sorted: string[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const instance = this.plugins.get(name);
      if (instance?.plugin.dependencies) {
        for (const dep of instance.plugin.dependencies) {
          visit(dep);
        }
      }
      sorted.push(name);
    };

    for (const name of this.plugins.keys()) {
      visit(name);
    }

    return sorted;
  }
}

// ─── Lazy Helper ────────────────────────────────────────────

/**
 * Create a lazy plugin loader for code-splitting.
 *
 * Usage:
 *   qmf.use(lazy(() => import('@qmf/chat-embed')));
 */
export function lazy(loader: () => Promise<QMFPlugin | { default: QMFPlugin }>): LazyPluginLoader {
  return { __lazy: true, load: loader };
}

/** Type guard for lazy plugins */
function isLazyPlugin(p: QMFPlugin | LazyPluginLoader): p is LazyPluginLoader {
  return '__lazy' in p && p.__lazy === true;
}

// ─── CSS Injection ──────────────────────────────────────────

/**
 * Inject <link> elements for plugin CSS files.
 * Returns the created elements (so we can remove them on destroy).
 */
function injectStyles(pluginName: string, urls: string[]): HTMLLinkElement[] {
  if (typeof document === 'undefined') return [];
  const elements: HTMLLinkElement[] = [];

  for (const url of urls) {
    // Avoid duplicate injection
    const existing = document.querySelector(`link[data-qmf-plugin="${pluginName}"][href="${url}"]`);
    if (existing) continue;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.setAttribute('data-qmf-plugin', pluginName);
    document.head.appendChild(link);
    elements.push(link);
  }

  return elements;
}

// ─── Factory ────────────────────────────────────────────────

/**
 * Create a plugin loader instance.
 */
export function createPluginLoader(eventBus: EventBus, container: DIContainer, debug?: boolean): PluginLoader {
  return new PluginLoader(eventBus, container, debug);
}
