/**
 * QMF v2 → v3 Compatibility Layer
 * 
 * This file provides backward compatibility for apps using QMF v2.x API.
 * Import this file instead of @qmf/core to use the old API style.
 * 
 * @version 3.0.0-compat
 */

import {
  QMF as QMFCore,
  EventBus,
  createStore,
  DIContainer,
  createModule,
  type Store,
} from './index';

// ─── Legacy Context (maps to Store) ─────────────────────────

class LegacyContext {
  private store: Store<Record<string, unknown>>;
  
  constructor(store: Store<Record<string, unknown>>) {
    this.store = store;
  }
  
  get<T = unknown>(key: string): T | undefined {
    const state = this.store.getState();
    return key.split('.').reduce((obj, k) => obj?.[k], state as Record<string, unknown>) as T;
  }
  
  set(key: string, value: unknown): void {
    const keys = key.split('.');
    if (keys.length === 1) {
      this.store.setState({ [key]: value });
    } else {
      // Deep set
      const state = { ...this.store.getState() };
      let current: Record<string, unknown> = state;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...(current[keys[i]] as Record<string, unknown> || {}) };
        current = current[keys[i]] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;
      this.store.setState(state);
    }
  }
  
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
  
  delete(key: string): void {
    this.set(key, undefined);
  }
  
  clear(): void {
    this.store.reset();
  }
}

// ─── Legacy Toast Manager ───────────────────────────────────

interface ToastOptions {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  closable?: boolean;
}

class LegacyToastManager {
  private eventBus: EventBus;
  
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }
  
  show(options: ToastOptions | string): { dismiss: () => void } {
    const opts = typeof options === 'string' ? { message: options } : options;
    const id = `toast-${Date.now()}`;
    
    // Emit event for any toast UI to catch
    this.eventBus.emit('toast:show', { id, ...opts });
    
    // Create DOM toast if no listener (fallback)
    if (typeof document !== 'undefined') {
      this.createDOMToast(id, opts);
    }
    
    return {
      dismiss: () => {
        this.eventBus.emit('toast:dismiss', { id });
        document.getElementById(id)?.remove();
      },
    };
  }
  
  private createDOMToast(id: string, opts: ToastOptions): void {
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `qmf-toast qmf-toast--${opts.type || 'info'}`;
    toast.innerHTML = `
      <span class="qmf-toast__message">${opts.message}</span>
      ${opts.closable !== false ? '<button class="qmf-toast__close">×</button>' : ''}
    `;
    toast.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 9999;
      padding: 12px 24px; border-radius: 8px; background: #1e293b;
      color: white; font-family: system-ui; animation: slideIn 0.3s;
    `;
    
    toast.querySelector('.qmf-toast__close')?.addEventListener('click', () => toast.remove());
    document.body.appendChild(toast);
    
    if (opts.duration !== 0) {
      setTimeout(() => toast.remove(), opts.duration || 5000);
    }
  }
  
  success(message: string) { return this.show({ message, type: 'success' }); }
  error(message: string) { return this.show({ message, type: 'error' }); }
  warning(message: string) { return this.show({ message, type: 'warning' }); }
  info(message: string) { return this.show({ message, type: 'info' }); }
}

// ─── Legacy Loading Manager ─────────────────────────────────

class LegacyLoadingManager {
  private overlay: HTMLElement | null = null;
  private count = 0;
  
  show(message?: string): void {
    this.count++;
    if (this.count === 1 && typeof document !== 'undefined') {
      this.overlay = document.createElement('div');
      this.overlay.className = 'qmf-loading-overlay';
      this.overlay.innerHTML = `
        <div class="qmf-loading-spinner"></div>
        ${message ? `<p class="qmf-loading-message">${message}</p>` : ''}
      `;
      this.overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 99999; display: flex;
        flex-direction: column; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.7); color: white; font-family: system-ui;
      `;
      document.body.appendChild(this.overlay);
    }
  }
  
  hide(): void {
    this.count = Math.max(0, this.count - 1);
    if (this.count === 0 && this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
  
  async wrap<T>(promise: Promise<T>, message?: string): Promise<T> {
    this.show(message);
    try {
      return await promise;
    } finally {
      this.hide();
    }
  }
}

// ─── Legacy Module Loader ───────────────────────────────────

class LegacyModuleLoader {
  private modules = new Map<string, unknown>();
  private eventBus: EventBus;
  
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }
  
  register(name: string, module: unknown): void {
    this.modules.set(name, module);
    this.eventBus.emit('module:registered', { name });
  }
  
  get<T = unknown>(name: string): T | undefined {
    return this.modules.get(name) as T;
  }
  
  has(name: string): boolean {
    return this.modules.has(name);
  }
  
  list(): string[] {
    return Array.from(this.modules.keys());
  }
  
  async load(name: string, url: string): Promise<unknown> {
    if (this.has(name)) return this.get(name);
    
    const module = await import(/* @vite-ignore */ url);
    this.register(name, module.default || module);
    return module;
  }
}

// ─── Legacy Lifecycle ───────────────────────────────────────

type LifecyclePhase = 'init' | 'mount' | 'ready' | 'destroy';
type LifecycleHook = () => void | Promise<void>;

class LegacyLifecycle {
  private hooks = new Map<LifecyclePhase, LifecycleHook[]>();
  private currentPhase: LifecyclePhase | null = null;
  
  on(phase: LifecyclePhase, hook: LifecycleHook): void {
    if (!this.hooks.has(phase)) {
      this.hooks.set(phase, []);
    }
    this.hooks.get(phase)!.push(hook);
  }
  
  off(phase: LifecyclePhase, hook: LifecycleHook): void {
    const hooks = this.hooks.get(phase);
    if (hooks) {
      const idx = hooks.indexOf(hook);
      if (idx !== -1) hooks.splice(idx, 1);
    }
  }
  
  async trigger(phase: LifecyclePhase): Promise<void> {
    this.currentPhase = phase;
    const hooks = this.hooks.get(phase) || [];
    for (const hook of hooks) {
      await hook();
    }
  }
  
  getPhase(): LifecyclePhase | null {
    return this.currentPhase;
  }
}

// ─── Legacy Runtime ─────────────────────────────────────────

class LegacyRuntime {
  private _initialized = false;
  private eventBus: EventBus;
  
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }
  
  get initialized(): boolean {
    return this._initialized;
  }
  
  async init(config: Record<string, unknown> = {}): Promise<void> {
    if (this._initialized) {
      console.warn('[QMF] Already initialized');
      return;
    }
    
    this.eventBus.emit('runtime:beforeInit', config);
    
    // Map to v3 init
    await QMFCore.init({
      appId: (config.appId as string) || 'qmf-app',
      debug: (config.debug as boolean) || false,
      channel: (config.channel as 'dev' | 'staging' | 'production') || 'production',
    });
    
    this._initialized = true;
    this.eventBus.emit('runtime:afterInit', config);
  }
  
  destroy(): void {
    this.eventBus.emit('runtime:destroy');
    this._initialized = false;
  }
}

// ─── Create Legacy QMF Object ───────────────────────────────

function createLegacyQMF() {
  const eventBus = new EventBus({ debug: false });
  const store = createStore<Record<string, unknown>>({}, { name: 'QMF:Legacy' });
  const context = new LegacyContext(store);
  const toast = new LegacyToastManager(eventBus);
  const loading = new LegacyLoadingManager();
  const moduleLoader = new LegacyModuleLoader(eventBus);
  const lifecycle = new LegacyLifecycle();
  const runtime = new LegacyRuntime(eventBus);
  
  const QMF = {
    // Version
    version: '3.0.0-compat',
    
    // ═══ v2 API (Backward Compatible) ═══
    
    // Kernel
    runtime,
    moduleLoader,
    lifecycle,
    eventBus,
    context,
    
    // Feedback
    toast,
    loading,
    
    // ═══ v3 API (New) ═══
    
    // Core v3
    get store() { return QMFCore.store; },
    get events() { return QMFCore.eventBus; },
    get http() { return QMFCore.http; },
    get container() { return QMFCore.container; },
    
    // ═══ Convenience Methods ═══
    
    /**
     * Initialize QMF (supports both v2 and v3 config)
     */
    async init(config: Record<string, unknown> = {}): Promise<void> {
      await runtime.init(config);
    },
    
    /**
     * Quick toast notification
     */
    notify(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
      return toast.show({ message, type });
    },
    
    /**
     * Get current user (v2 style)
     */
    getUser(): Record<string, unknown> | null {
      return context.get('user') || QMFCore.store?.getState()?.user || null;
    },
    
    /**
     * Set current user (v2 style)
     */
    setUser(user: Record<string, unknown> | null): void {
      context.set('user', user);
      QMFCore.store?.setState({ user });
      eventBus.emit('user:changed', { user });
    },
    
    /**
     * Check permission (v2 style)
     */
    can(permission: string): boolean {
      const user = this.getUser();
      if (!user) return false;
      const permissions = (user.permissions as string[]) || [];
      return permissions.includes('*') || permissions.includes(permission);
    },
    
    /**
     * Get config (v2 style)
     */
    getConfig<T = unknown>(key?: string): T {
      if (key) {
        return context.get(`config.${key}`) as T;
      }
      return context.get('config') as T;
    },
    
    /**
     * Set config (v2 style)
     */
    setConfig(key: string, value: unknown): void {
      context.set(`config.${key}`, value);
    },
    
    // ═══ Plugins Namespace (v2 compatibility) ═══
    plugins: {
      header: null,
      footer: null,
      sidebar: null,
      register(name: string, plugin: unknown) {
        (this as Record<string, unknown>)[name] = plugin;
        eventBus.emit('plugin:registered', { name });
      },
    },
    
    // ═══ UI Namespace (v2 compatibility) ═══
    ui: {
      // Will be populated by @qmf/ui imports
    },
    
    // ═══ Shell/Layout (v2 compatibility) ═══
    shell: {
      setHeader(el: HTMLElement | null) {
        const container = document.getElementById('qmf-header');
        if (container && el) {
          container.innerHTML = '';
          container.appendChild(el);
        }
      },
      setFooter(el: HTMLElement | null) {
        const container = document.getElementById('qmf-footer');
        if (container && el) {
          container.innerHTML = '';
          container.appendChild(el);
        }
      },
      setSidebar(el: HTMLElement | null) {
        const container = document.getElementById('qmf-sidebar');
        if (container && el) {
          container.innerHTML = '';
          container.appendChild(el);
        }
      },
    },
    
    // ═══ Navigation (stub, app-specific) ═══
    router: {
      navigate(path: string, _options?: Record<string, unknown>) {
        if (typeof window !== 'undefined') {
          window.location.href = path;
        }
      },
      getCurrentPath(): string {
        return typeof window !== 'undefined' ? window.location.pathname : '/';
      },
    },
  };
  
  return QMF;
}

// ─── Export ─────────────────────────────────────────────────

export const QMF = createLegacyQMF();

// Expose globally
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).QMF = QMF;
}

export default QMF;

// Re-export v3 APIs for gradual migration
export * from './index';
