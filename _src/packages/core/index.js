import { z } from 'zod';
export { z } from 'zod';

// src/event-bus.ts
var EventBus = class {
  constructor(options = {}) {
    this.listeners = /* @__PURE__ */ new Map();
    this.maxListeners = options.maxListeners ?? 100;
    this.debug = options.debug ?? false;
  }
  /**
   * Subscribe to an event.
   * @returns Unsubscribe function
   */
  on(event, handler) {
    return this.addListener(event, handler, false);
  }
  /**
   * Subscribe to an event, auto-removes after first call.
   * @returns Unsubscribe function
   */
  once(event, handler) {
    return this.addListener(event, handler, true);
  }
  /**
   * Remove a specific listener.
   */
  off(event, handler) {
    const entries = this.listeners.get(event);
    if (!entries) return;
    const filtered = entries.filter((e) => e.handler !== handler);
    if (filtered.length === 0) {
      this.listeners.delete(event);
    } else {
      this.listeners.set(event, filtered);
    }
  }
  /**
   * Emit an event to all listeners.
   */
  emit(event, payload) {
    if (this.debug) {
      console.debug(`[QMF:EventBus] emit "${event}"`, payload);
    }
    const entries = this.listeners.get(event);
    if (entries) {
      const toRemove = [];
      for (const entry of entries) {
        try {
          entry.handler(payload);
        } catch (err) {
          console.error(`[QMF:EventBus] Error in handler for "${event}":`, err);
        }
        if (entry.once) toRemove.push(entry);
      }
      if (toRemove.length > 0) {
        this.listeners.set(
          event,
          entries.filter((e) => !toRemove.includes(e))
        );
      }
    }
    for (const [pattern, patternEntries] of this.listeners) {
      if (pattern === "*" || pattern.endsWith(":*") && event.startsWith(pattern.slice(0, -1))) {
        for (const entry of patternEntries) {
          try {
            entry.handler({ event, payload });
          } catch (err) {
            console.error(`[QMF:EventBus] Error in wildcard handler "${pattern}":`, err);
          }
        }
      }
    }
  }
  /**
   * Remove all listeners, optionally for a specific event.
   */
  clear(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
  /**
   * Get the number of listeners for an event.
   */
  listenerCount(event) {
    return this.listeners.get(event)?.length ?? 0;
  }
  /**
   * Get all registered event names.
   */
  eventNames() {
    return Array.from(this.listeners.keys());
  }
  addListener(event, handler, once) {
    let entries = this.listeners.get(event);
    if (!entries) {
      entries = [];
      this.listeners.set(event, entries);
    }
    if (this.maxListeners > 0 && entries.length >= this.maxListeners) {
      console.warn(
        `[QMF:EventBus] Max listeners (${this.maxListeners}) reached for "${event}". Possible memory leak.`
      );
    }
    const entry = { handler, once };
    entries.push(entry);
    return () => this.off(event, handler);
  }
};
var _globalBus = null;
function getGlobalEventBus() {
  if (!_globalBus) {
    _globalBus = new EventBus();
  }
  return _globalBus;
}
function createScopedBus(scope, bus) {
  const target = bus ?? getGlobalEventBus();
  const proxy = new EventBus();
  const originalEmit = proxy.emit.bind(proxy);
  const originalOn = proxy.on.bind(proxy);
  proxy.emit = (event, payload) => {
    originalEmit(event, payload);
    target.emit(`${scope}:${event}`, payload);
  };
  proxy.on = (event, handler) => {
    return originalOn(event, handler);
  };
  return proxy;
}
var Store = class {
  constructor(options) {
    this.listeners = /* @__PURE__ */ new Set();
    this.selectorListeners = /* @__PURE__ */ new Map();
    this.debug = options.debug ?? false;
    this.name = options.name ?? "QMFStore";
    this.schema = options.schema;
    const validated = this.validate(options.initialState);
    this.state = structuredClone(validated);
  }
  /**
   * Get current state (immutable snapshot).
   */
  getState() {
    return Object.freeze({ ...this.state });
  }
  /**
   * Select a derived value from state.
   */
  select(selector) {
    return selector(this.state);
  }
  /**
   * Update state with a partial update or updater function.
   * If a Zod schema was provided, the merged state is validated before committing.
   */
  setState(updater) {
    const prevState = this.state;
    const patch = typeof updater === "function" ? updater(prevState) : updater;
    const merged = { ...prevState, ...patch };
    const nextState = this.validate(merged);
    this.state = nextState;
    if (this.debug) {
      console.debug(`[QMF:Store:${this.name}] setState`, { prev: prevState, patch, next: this.state });
    }
    for (const listener of this.listeners) {
      try {
        listener(this.state, prevState);
      } catch (err) {
        console.error(`[QMF:Store:${this.name}] Listener error:`, err);
      }
    }
    for (const [selector, sListeners] of this.selectorListeners) {
      const prevVal = selector(prevState);
      const nextVal = selector(this.state);
      if (!Object.is(prevVal, nextVal)) {
        for (const sl of sListeners) {
          try {
            sl(nextVal, prevVal);
          } catch (err) {
            console.error(`[QMF:Store:${this.name}] Selector listener error:`, err);
          }
        }
      }
    }
  }
  /**
   * Subscribe to all state changes.
   * @returns Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  /**
   * Subscribe to changes of a selected value.
   * @returns Unsubscribe function
   */
  watch(selector, listener) {
    let sListeners = this.selectorListeners.get(selector);
    if (!sListeners) {
      sListeners = /* @__PURE__ */ new Set();
      this.selectorListeners.set(selector, sListeners);
    }
    sListeners.add(listener);
    return () => {
      sListeners.delete(listener);
      if (sListeners.size === 0) {
        this.selectorListeners.delete(selector);
      }
    };
  }
  /**
   * Reset state to initial value.
   */
  reset(initialState) {
    const prevState = this.state;
    const validated = this.validate(initialState);
    this.state = structuredClone(validated);
    for (const listener of this.listeners) {
      listener(this.state, prevState);
    }
  }
  /**
   * Destroy the store, removing all listeners.
   */
  destroy() {
    this.listeners.clear();
    this.selectorListeners.clear();
  }
  /**
   * Validate state against the Zod schema (if present).
   * Returns the parsed (possibly transformed) state.
   */
  validate(state) {
    if (!this.schema) return state;
    const result = this.schema.safeParse(state);
    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`[QMF:Store:${this.name}] State validation failed: ${errors}`);
    }
    return result.data;
  }
};
function createStore(initialState, options) {
  return new Store({ initialState, ...options });
}
var GlobalStateSchema = z.object({
  initialized: z.boolean(),
  appId: z.string(),
  channel: z.enum(["dev", "staging", "production"]),
  debug: z.boolean(),
  user: z.record(z.unknown()).nullable(),
  theme: z.enum(["light", "dark"]),
  language: z.string().default("vi")
});
var _moduleStores = /* @__PURE__ */ new Map();
function createModuleStore(moduleName, initialState, schema, debug) {
  if (_moduleStores.has(moduleName)) {
    console.warn(`[QMF:Store] Module store "${moduleName}" already exists \u2014 returning existing.`);
    return _moduleStores.get(moduleName);
  }
  const store = new Store({
    initialState,
    name: moduleName,
    schema,
    debug
  });
  _moduleStores.set(moduleName, store);
  return store;
}
function getModuleStore(moduleName) {
  return _moduleStores.get(moduleName);
}
function destroyModuleStore(moduleName) {
  const store = _moduleStores.get(moduleName);
  if (store) {
    store.destroy();
    _moduleStores.delete(moduleName);
  }
}
function listModuleStores() {
  return [..._moduleStores.keys()];
}

// src/lifecycle.ts
var LifecycleManager = class {
  constructor(options) {
    this.phase = "created";
    this.name = options.name;
    this.hooks = options.hooks ?? {};
    this.eventBus = options.eventBus;
    this.debug = options.debug ?? false;
  }
  /** Get current lifecycle phase */
  getPhase() {
    return this.phase;
  }
  /** Check if module is in a given phase */
  isPhase(phase) {
    return this.phase === phase;
  }
  /** Check if module is ready (past "ready" phase) */
  isReady() {
    return this.phase === "ready";
  }
  /** Check if module is destroyed */
  isDestroyed() {
    return this.phase === "destroyed";
  }
  /**
   * Run full lifecycle: init → mount → connect → ready
   */
  async start() {
    await this.init();
    await this.mount();
    await this.connect();
    await this.ready();
  }
  async init() {
    this.assertPhase(["created"], "init");
    await this.transition("initializing", "initialized", [
      this.hooks.onBeforeInit,
      this.hooks.onInit,
      this.hooks.onAfterInit
    ]);
  }
  async mount() {
    this.assertPhase(["initialized"], "mount");
    await this.transition("mounting", "mounted", [
      this.hooks.onBeforeMount,
      this.hooks.onMount,
      this.hooks.onAfterMount
    ]);
  }
  async connect() {
    this.assertPhase(["mounted"], "connect");
    await this.transition("connecting", "connected", [
      this.hooks.onBeforeConnect,
      this.hooks.onConnect,
      this.hooks.onAfterConnect
    ]);
  }
  async ready() {
    this.assertPhase(["connected"], "ready");
    await this.transition("ready", "ready", [this.hooks.onReady]);
  }
  async destroy() {
    if (this.phase === "destroyed") return;
    await this.transition("destroying", "destroyed", [
      this.hooks.onBeforeDestroy,
      this.hooks.onDestroy
    ]);
  }
  /** Update hooks dynamically */
  setHooks(hooks) {
    this.hooks = { ...this.hooks, ...hooks };
  }
  async transition(enterPhase, exitPhase, hooks) {
    this.setPhase(enterPhase);
    try {
      for (const hook of hooks) {
        if (hook) await hook();
      }
      if (enterPhase !== exitPhase) {
        this.setPhase(exitPhase);
      }
    } catch (err) {
      this.setPhase("error");
      if (this.hooks.onError) {
        this.hooks.onError(err instanceof Error ? err : new Error(String(err)), enterPhase);
      } else {
        throw err;
      }
    }
  }
  setPhase(phase) {
    const prev = this.phase;
    this.phase = phase;
    if (this.debug) {
      console.debug(`[QMF:Lifecycle:${this.name}] ${prev} \u2192 ${phase}`);
    }
    this.eventBus?.emit(`lifecycle:${this.name}`, { phase, prev });
    this.eventBus?.emit("lifecycle:change", { module: this.name, phase, prev });
  }
  assertPhase(expected, action) {
    if (!expected.includes(this.phase)) {
      throw new Error(
        `[QMF:Lifecycle:${this.name}] Cannot "${action}" in phase "${this.phase}". Expected: ${expected.join(", ")}`
      );
    }
  }
};
function createLifecycle(options) {
  return new LifecycleManager(options);
}
var BaseConfigSchema = z.object({
  debug: z.boolean().default(false),
  channel: z.enum(["dev", "staging", "production"]).default("production")
});
var EnvUrlsSchema = z.object({
  id: z.string().url(),
  chat: z.string().url(),
  noti: z.string().url(),
  ui: z.string().url(),
  main: z.string().url()
});
var ENV_URL_PRESETS = {
  dev: {
    id: "http://localhost:4001",
    chat: "http://localhost:4002",
    noti: "http://localhost:4003",
    ui: "http://localhost:4000",
    main: "http://localhost:3000"
  },
  staging: {
    id: "https://id.staging.quizzman.com",
    chat: "https://chat.staging.quizzman.com",
    noti: "https://noti.staging.quizzman.com",
    ui: "https://ui.staging.quizzman.com",
    main: "https://staging.quizzman.com"
  },
  production: {
    id: "https://id.quizzman.com",
    chat: "https://chat.quizzman.com",
    noti: "https://noti.quizzman.com",
    ui: "https://ui.quizzman.com",
    main: "https://quizzman.com"
  }
};
function detectChannel() {
  if (typeof window === "undefined") return "production";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "dev";
  if (host.includes("staging") || host.includes("dev")) return "staging";
  return "production";
}
function resolveEnvUrls(channel) {
  return ENV_URL_PRESETS[channel ?? detectChannel()];
}
function validateConfig(schema, config, moduleName) {
  const result = schema.safeParse(config);
  if (!result.success) {
    const errors = formatZodErrors(result.error);
    throw new QMFConfigError(errors, moduleName);
  }
  return result.data;
}
function resolveConfig(schema, userConfig, defaults) {
  const merged = { ...defaults ?? {}, ...userConfig };
  return validateConfig(schema, merged);
}
var QMFConfigError = class extends Error {
  constructor(errors, module) {
    const prefix = module ? `[QMF:Config:${module}]` : "[QMF:Config]";
    super(`${prefix} Invalid configuration:
${errors.map((e) => `  - ${e}`).join("\n")}`);
    this.name = "QMFConfigError";
    this.errors = errors;
    this.module = module;
  }
};
function formatZodErrors(error, _moduleName) {
  return error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `"${path}": ${issue.message}` : issue.message;
  });
}

// src/http.ts
var HttpError = class extends Error {
  constructor(response, data) {
    super(`HTTP ${response.status}: ${response.statusText}`);
    this.name = "HttpError";
    this.status = response.status;
    this.statusText = response.statusText;
    this.data = data;
    this.url = response.url;
  }
};
var HttpClient = class {
  constructor(options = {}) {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.errorInterceptors = [];
    this.baseUrl = options.baseUrl ?? "";
    this.defaultTimeout = options.timeout ?? 3e4;
    this.defaultRetries = options.retries ?? 0;
    this.getToken = options.getToken;
    this.debug = options.debug ?? false;
  }
  /** Add a request interceptor */
  useRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
    return () => {
      const idx = this.requestInterceptors.indexOf(interceptor);
      if (idx !== -1) this.requestInterceptors.splice(idx, 1);
    };
  }
  /** Add a response interceptor */
  useResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
    return () => {
      const idx = this.responseInterceptors.indexOf(interceptor);
      if (idx !== -1) this.responseInterceptors.splice(idx, 1);
    };
  }
  /** Add an error interceptor */
  useErrorInterceptor(interceptor) {
    this.errorInterceptors.push(interceptor);
    return () => {
      const idx = this.errorInterceptors.indexOf(interceptor);
      if (idx !== -1) this.errorInterceptors.splice(idx, 1);
    };
  }
  async get(url, config) {
    return this.request({ ...config, url, method: "GET" });
  }
  async post(url, body, config) {
    return this.request({
      ...config,
      url,
      method: "POST",
      body: body ? JSON.stringify(body) : void 0,
      headers: { "Content-Type": "application/json", ...config?.headers }
    });
  }
  async put(url, body, config) {
    return this.request({
      ...config,
      url,
      method: "PUT",
      body: body ? JSON.stringify(body) : void 0,
      headers: { "Content-Type": "application/json", ...config?.headers }
    });
  }
  async delete(url, config) {
    return this.request({ ...config, url, method: "DELETE" });
  }
  async request(config) {
    let resolvedConfig = { ...config };
    for (const interceptor of this.requestInterceptors) {
      resolvedConfig = await interceptor(resolvedConfig);
    }
    let url = resolvedConfig.url.startsWith("http") ? resolvedConfig.url : `${this.baseUrl}${resolvedConfig.url}`;
    if (resolvedConfig.params) {
      const params = new URLSearchParams();
      for (const [key, val] of Object.entries(resolvedConfig.params)) {
        params.set(key, String(val));
      }
      url += `?${params.toString()}`;
    }
    if (!resolvedConfig.skipAuth && this.getToken) {
      const token = await this.getToken();
      if (token) {
        resolvedConfig.headers = {
          ...resolvedConfig.headers,
          Authorization: `Bearer ${token}`
        };
      }
    }
    const timeout = resolvedConfig.timeout ?? this.defaultTimeout;
    const retries = resolvedConfig.retries ?? this.defaultRetries;
    if (this.debug) {
      console.debug(`[QMF:HTTP] ${resolvedConfig.method ?? "GET"} ${url}`);
    }
    return this.fetchWithRetry(url, resolvedConfig, timeout, retries, resolvedConfig.retryDelay ?? 1e3);
  }
  async fetchWithRetry(url, config, timeout, retries, retryDelay, attempt = 0) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      clearTimeout(timer);
      const data = await this.parseResponse(response);
      if (!response.ok) {
        throw new HttpError(response, data);
      }
      let result = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        ok: response.ok
      };
      for (const interceptor of this.responseInterceptors) {
        result = await interceptor(result);
      }
      return result;
    } catch (err) {
      if (err instanceof HttpError) {
        for (const interceptor of this.errorInterceptors) {
          await interceptor(err);
        }
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelay * (attempt + 1)));
        return this.fetchWithRetry(url, config, timeout, retries, retryDelay, attempt + 1);
      }
      throw err;
    }
  }
  async parseResponse(response) {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return response.json();
    }
    return response.text();
  }
};
function createHttpClient(options) {
  return new HttpClient(options);
}

// src/di.ts
var DIContainer = class _DIContainer {
  constructor() {
    this.services = /* @__PURE__ */ new Map();
    this.resolving = /* @__PURE__ */ new Set();
  }
  // Circular dependency detection
  /**
   * Register a class/constructor as a service.
   * The container will instantiate it once (singleton) or per-resolve (transient).
   */
  register(token, Ctor, options = {}) {
    this.assertOrReplace(token, options);
    this.services.set(token, {
      factory: () => new Ctor(),
      singleton: options.singleton ?? true,
      tags: options.tags
    });
    return this;
  }
  /**
   * Register a factory function that receives the container for resolving deps.
   */
  registerFactory(token, factory, options = {}) {
    this.assertOrReplace(token, options);
    this.services.set(token, {
      factory,
      singleton: options.singleton ?? true,
      tags: options.tags
    });
    return this;
  }
  /**
   * Register a pre-built instance directly.
   * Always treated as singleton.
   */
  registerInstance(token, instance, options = {}) {
    this.assertOrReplace(token, options);
    this.services.set(token, {
      factory: () => instance,
      singleton: true,
      instance,
      tags: options.tags
    });
    return this;
  }
  /**
   * Resolve a service by token.
   * Throws if not registered.
   */
  resolve(token) {
    const descriptor = this.services.get(token);
    if (!descriptor) {
      throw new Error(`[QMF:DI] Service "${token}" is not registered. Available: ${this.tokens().join(", ")}`);
    }
    if (descriptor.singleton && descriptor.instance !== void 0) {
      return descriptor.instance;
    }
    if (this.resolving.has(token)) {
      throw new Error(
        `[QMF:DI] Circular dependency detected when resolving "${token}". Resolution chain: ${[...this.resolving].join(" \u2192 ")} \u2192 ${token}`
      );
    }
    this.resolving.add(token);
    try {
      const instance = descriptor.factory(this);
      if (descriptor.singleton) {
        descriptor.instance = instance;
      }
      return instance;
    } finally {
      this.resolving.delete(token);
    }
  }
  /**
   * Try to resolve a service. Returns undefined if not registered.
   */
  tryResolve(token) {
    if (!this.has(token)) return void 0;
    return this.resolve(token);
  }
  /**
   * Check if a service is registered.
   */
  has(token) {
    return this.services.has(token);
  }
  /**
   * Unregister a service.
   */
  unregister(token) {
    return this.services.delete(token);
  }
  /**
   * Get all registered tokens.
   */
  tokens() {
    return [...this.services.keys()];
  }
  /**
   * Get all tokens matching a tag.
   */
  getByTag(tag) {
    return [...this.services.entries()].filter(([, desc]) => desc.tags?.includes(tag)).map(([token]) => token);
  }
  /**
   * Create a child container that inherits parent registrations.
   * Overrides in the child don't affect the parent.
   */
  createScope() {
    const child = new _DIContainer();
    for (const [token, desc] of this.services) {
      child.services.set(token, { ...desc });
    }
    return child;
  }
  /**
   * Reset all singletons (forces re-creation on next resolve).
   * Useful for testing.
   */
  resetSingletons() {
    for (const desc of this.services.values()) {
      if (desc.singleton) {
        desc.instance = void 0;
      }
    }
  }
  /**
   * Clear all registrations.
   */
  clear() {
    this.services.clear();
    this.resolving.clear();
  }
  /**
   * Snapshot of all registered services (for debugging).
   */
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    const entries = [...this.services.entries()].map(
      ([token, desc]) => `  ${token}: ${desc.singleton ? "singleton" : "transient"}${desc.instance !== void 0 ? " (cached)" : ""}${desc.tags?.length ? ` [${desc.tags.join(",")}]` : ""}`
    );
    return `DIContainer {
${entries.join("\n")}
}`;
  }
  assertOrReplace(token, options) {
    if (this.services.has(token) && !options.replace) {
      throw new Error(
        `[QMF:DI] Service "${token}" is already registered. Use { replace: true } to override.`
      );
    }
  }
};
var _globalContainer = null;
function getGlobalContainer() {
  if (!_globalContainer) {
    _globalContainer = new DIContainer();
  }
  return _globalContainer;
}
function resetGlobalContainer() {
  _globalContainer?.clear();
  _globalContainer = null;
}

// src/error-boundary.ts
var ModuleErrorBoundary = class {
  constructor(options) {
    this.errors = [];
    this.module = options.module;
    this.eventBus = options.eventBus;
    this.onError = options.onError;
    this.onRecover = options.onRecover;
    this.maxRetries = options.maxRetries ?? 0;
    this.debug = options.debug ?? false;
  }
  /**
   * Execute an async function within the error boundary.
   * If it throws, the error is captured, the onError hook fires,
   * and optionally onRecover is attempted.
   *
   * Returns true if the fn completed (or recovered), false otherwise.
   */
  async guard(fn, phase = "unknown") {
    let attempts = 0;
    const maxAttempts = 1 + this.maxRetries;
    while (attempts < maxAttempts) {
      try {
        const value = await fn();
        return { ok: true, value };
      } catch (rawErr) {
        attempts++;
        const error = rawErr instanceof Error ? rawErr : new Error(String(rawErr));
        const moduleError = {
          module: this.module,
          error,
          phase,
          timestamp: Date.now(),
          recovered: false
        };
        this.errors.push(moduleError);
        if (this.debug) {
          console.error(`[QMF:ErrorBoundary:${this.module}] Error in "${phase}" (attempt ${attempts}/${maxAttempts}):`, error.message);
        }
        this.eventBus?.emit("module:error", moduleError);
        this.eventBus?.emit(`module:${this.module}:error`, moduleError);
        this.onError?.(moduleError);
        if (this.onRecover && attempts < maxAttempts) {
          try {
            const recovered = await this.onRecover(moduleError);
            if (recovered) {
              moduleError.recovered = true;
              if (this.debug) {
                console.debug(`[QMF:ErrorBoundary:${this.module}] Recovered from "${phase}", retrying...`);
              }
              continue;
            }
          } catch (recoveryErr) {
            if (this.debug) {
              console.error(`[QMF:ErrorBoundary:${this.module}] Recovery failed:`, recoveryErr);
            }
          }
        }
        return { ok: false, error: moduleError };
      }
    }
    return {
      ok: false,
      error: {
        module: this.module,
        error: new Error("Max retries exhausted"),
        phase,
        timestamp: Date.now(),
        recovered: false
      }
    };
  }
  /**
   * Synchronous guard — wraps a sync function.
   */
  guardSync(fn, phase = "unknown") {
    try {
      const value = fn();
      return { ok: true, value };
    } catch (rawErr) {
      const error = rawErr instanceof Error ? rawErr : new Error(String(rawErr));
      const moduleError = {
        module: this.module,
        error,
        phase,
        timestamp: Date.now(),
        recovered: false
      };
      this.errors.push(moduleError);
      this.eventBus?.emit("module:error", moduleError);
      this.eventBus?.emit(`module:${this.module}:error`, moduleError);
      this.onError?.(moduleError);
      return { ok: false, error: moduleError };
    }
  }
  /**
   * Get all errors captured by this boundary.
   */
  getErrors() {
    return this.errors;
  }
  /**
   * Get the last error.
   */
  getLastError() {
    return this.errors[this.errors.length - 1];
  }
  /**
   * Clear the error log.
   */
  clearErrors() {
    this.errors = [];
  }
};
var _boundaries = /* @__PURE__ */ new Map();
function createErrorBoundary(options) {
  const boundary = new ModuleErrorBoundary(options);
  _boundaries.set(options.module, boundary);
  return boundary;
}
function getErrorBoundary(module) {
  return _boundaries.get(module);
}
function listErrorBoundaries() {
  return [..._boundaries.keys()];
}
function getAllModuleErrors() {
  const all = [];
  for (const boundary of _boundaries.values()) {
    all.push(...boundary.getErrors());
  }
  return all.sort((a, b) => a.timestamp - b.timestamp);
}

// src/plugin-loader.ts
var PluginLoader = class {
  constructor(eventBus, container, debug = false) {
    this.plugins = /* @__PURE__ */ new Map();
    this.lazyQueue = /* @__PURE__ */ new Map();
    this.eventBus = eventBus;
    this.container = container;
    this.debug = debug;
  }
  /**
   * Register a plugin (eager) or lazy plugin loader.
   */
  register(pluginOrLazy) {
    if (isLazyPlugin(pluginOrLazy)) {
      this.lazyQueue.set(`__lazy_${this.lazyQueue.size}`, pluginOrLazy);
      if (this.debug) {
        console.debug(`[QMF:PluginLoader] Registered lazy plugin (will resolve on init)`);
      }
      this.eventBus.emit("plugin:lazy-registered", {});
      return;
    }
    this.registerEager(pluginOrLazy);
  }
  /**
   * Register an eager (already-resolved) plugin.
   */
  registerEager(plugin) {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`[QMF:PluginLoader] Plugin "${plugin.name}" is already registered.`);
    }
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep) && !this.lazyQueue.has(dep)) {
          throw new Error(
            `[QMF:PluginLoader] Plugin "${plugin.name}" depends on "${dep}" which is not registered. Register dependencies first.`
          );
        }
      }
    }
    const lifecycle = createLifecycle({
      name: plugin.name,
      hooks: plugin.hooks,
      eventBus: this.eventBus,
      debug: this.debug
    });
    const errorBoundary = createErrorBoundary({
      module: plugin.name,
      eventBus: this.eventBus,
      debug: this.debug
    });
    const instance = {
      plugin,
      lifecycle,
      errorBoundary,
      api: /* @__PURE__ */ new Map()
    };
    this.plugins.set(plugin.name, instance);
    if (this.debug) {
      console.debug(`[QMF:PluginLoader] Registered "${plugin.name}" v${plugin.version ?? "?"}`);
    }
    this.eventBus.emit("plugin:registered", { name: plugin.name, version: plugin.version });
  }
  /**
   * Resolve and register all lazy plugins.
   */
  async resolveLazyPlugins() {
    for (const [key, lazyLoader] of this.lazyQueue) {
      try {
        const result = await lazyLoader.load();
        const plugin = "default" in result ? result.default : result;
        this.registerEager(plugin);
        if (this.debug) {
          console.debug(`[QMF:PluginLoader] Lazy-resolved "${plugin.name}"`);
        }
      } catch (err) {
        console.error(`[QMF:PluginLoader] Failed to resolve lazy plugin "${key}":`, err);
        this.eventBus.emit("plugin:error", { key, error: err });
      }
    }
    this.lazyQueue.clear();
  }
  /**
   * Initialize a specific plugin (wrapped in error boundary).
   */
  async initPlugin(name) {
    const instance = this.plugins.get(name);
    if (!instance) {
      throw new Error(`[QMF:PluginLoader] Plugin "${name}" not found.`);
    }
    const result = await instance.errorBoundary.guard(async () => {
      if (instance.plugin.styles?.length) {
        instance.styleElements = injectStyles(instance.plugin.name, instance.plugin.styles);
      }
      const context = {
        eventBus: this.eventBus,
        container: this.container,
        config: instance.plugin.config ?? { debug: false, channel: "production" },
        lifecycle: instance.lifecycle,
        expose: (key, value) => instance.api.set(key, value),
        getPlugin: (n) => this.plugins.get(n)
      };
      if (instance.plugin.setup) {
        await instance.plugin.setup(context);
      }
      await instance.lifecycle.start();
    }, "init");
    if (!result.ok) {
      console.error(
        `[QMF:PluginLoader] Plugin "${name}" failed to initialize. The error was isolated \u2014 other modules continue running.`,
        result.error.error.message
      );
    }
  }
  /**
   * Initialize all registered plugins in dependency order.
   * Resolves lazy plugins first, then topological sort + init.
   * Errors in one plugin do NOT stop others from initializing.
   */
  async initAll() {
    await this.resolveLazyPlugins();
    const sorted = this.topologicalSort();
    for (const name of sorted) {
      await this.initPlugin(name);
    }
  }
  /**
   * Destroy a specific plugin (wrapped in error boundary).
   */
  async destroyPlugin(name) {
    const instance = this.plugins.get(name);
    if (!instance) return;
    await instance.errorBoundary.guard(async () => {
      if (instance.styleElements) {
        for (const el of instance.styleElements) {
          el.remove();
        }
      }
      if (instance.plugin.teardown) {
        await instance.plugin.teardown();
      }
      await instance.lifecycle.destroy();
    }, "destroy");
    this.plugins.delete(name);
    this.eventBus.emit("plugin:destroyed", { name });
  }
  /**
   * Destroy all plugins in reverse dependency order.
   */
  async destroyAll() {
    const sorted = this.topologicalSort().reverse();
    for (const name of sorted) {
      await this.destroyPlugin(name);
    }
  }
  /**
   * Get a registered plugin instance.
   */
  get(name) {
    return this.plugins.get(name);
  }
  /**
   * Get a plugin's exposed API value.
   */
  getApi(pluginName, key) {
    return this.plugins.get(pluginName)?.api.get(key);
  }
  /**
   * Check if a plugin is registered.
   */
  has(name) {
    return this.plugins.has(name);
  }
  /**
   * Get all registered plugin names.
   */
  names() {
    return Array.from(this.plugins.keys());
  }
  /**
   * Topological sort of plugins by dependencies.
   */
  topologicalSort() {
    const visited = /* @__PURE__ */ new Set();
    const sorted = [];
    const visit = (name) => {
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
};
function lazy(loader) {
  return { __lazy: true, load: loader };
}
function isLazyPlugin(p) {
  return "__lazy" in p && p.__lazy === true;
}
function injectStyles(pluginName, urls) {
  if (typeof document === "undefined") return [];
  const elements = [];
  for (const url of urls) {
    const existing = document.querySelector(`link[data-qmf-plugin="${pluginName}"][href="${url}"]`);
    if (existing) continue;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.setAttribute("data-qmf-plugin", pluginName);
    document.head.appendChild(link);
    elements.push(link);
  }
  return elements;
}
function createPluginLoader(eventBus, container, debug) {
  return new PluginLoader(eventBus, container, debug);
}

// src/event-tracer.ts
var EventTracer = class {
  constructor(bus, options = {}) {
    this.entries = [];
    this._enabled = false;
    this.counter = 0;
    this.bus = bus;
    this.maxEntries = options.maxEntries ?? 1e3;
    this.consoleLog = options.consoleLog ?? false;
    this.filter = options.filter;
    if (options.enabled) {
      this.enable();
    }
  }
  /** Whether tracing is active */
  get enabled() {
    return this._enabled;
  }
  /**
   * Start tracing by subscribing to wildcard (*) on the bus.
   */
  enable() {
    if (this._enabled) return;
    this._enabled = true;
    const handler = (data) => {
      const { event, payload } = data;
      if (!event) return;
      if (this.filter && !this.filter(event, payload)) return;
      const origin = event.includes(":") ? event.split(":")[0] : "unknown";
      const entry = {
        event,
        payload: safeClone(payload),
        origin,
        timestamp: Date.now(),
        index: this.counter++
      };
      this.entries.push(entry);
      if (this.entries.length > this.maxEntries) {
        this.entries.shift();
      }
      if (this.consoleLog) {
        console.debug(
          `%c[EventTracer]%c ${event} %c\u2192 Origin: ${origin}`,
          "color: #6c5ce7; font-weight:bold",
          "color: #00b894",
          "color: #636e72",
          payload ?? ""
        );
      }
    };
    this.unsubscribe = this.bus.on("*", handler);
  }
  /**
   * Stop tracing.
   */
  disable() {
    if (!this._enabled) return;
    this._enabled = false;
    this.unsubscribe?.();
    this.unsubscribe = void 0;
  }
  /**
   * Get all trace entries (newest last).
   */
  getTrace() {
    return this.entries;
  }
  /**
   * Get the last N entries.
   */
  getLast(n) {
    return this.entries.slice(-n);
  }
  /**
   * Query trace entries by event pattern (supports `*` wildcard).
   */
  query(pattern) {
    if (pattern === "*") return [...this.entries];
    if (pattern.endsWith(":*")) {
      const prefix = pattern.slice(0, -1);
      return this.entries.filter((e) => e.event.startsWith(prefix));
    }
    return this.entries.filter((e) => e.event === pattern);
  }
  /**
   * Query trace entries by origin module.
   */
  queryByOrigin(origin) {
    return this.entries.filter((e) => e.origin === origin);
  }
  /**
   * Get unique event names that have been traced.
   */
  eventNames() {
    return [...new Set(this.entries.map((e) => e.event))];
  }
  /**
   * Get unique origins that have been traced.
   */
  origins() {
    return [...new Set(this.entries.map((e) => e.origin))];
  }
  /**
   * Get event frequency map (event → count).
   */
  frequency() {
    const map = /* @__PURE__ */ new Map();
    for (const entry of this.entries) {
      map.set(entry.event, (map.get(entry.event) ?? 0) + 1);
    }
    return map;
  }
  /**
   * Print a formatted trace table to console.
   */
  printTrace(last) {
    const entries = last ? this.getLast(last) : this.entries;
    if (entries.length === 0) {
      console.log("[EventTracer] No events recorded.");
      return;
    }
    console.group(`[EventTracer] ${entries.length} events`);
    console.table(
      entries.map((e) => ({
        "#": e.index,
        Event: e.event,
        Origin: e.origin,
        Payload: typeof e.payload === "object" ? JSON.stringify(e.payload) : e.payload,
        Time: new Date(e.timestamp).toISOString().slice(11, -1)
      }))
    );
    console.groupEnd();
  }
  /**
   * Export trace as JSON for saving/analysis.
   */
  exportJSON() {
    return JSON.stringify(this.entries, null, 2);
  }
  /**
   * Clear the trace buffer.
   */
  clear() {
    this.entries = [];
    this.counter = 0;
  }
  /**
   * Destroy the tracer.
   */
  destroy() {
    this.disable();
    this.clear();
  }
};
function installDevTools(options) {
  if (typeof window === "undefined") return;
  const devtools = {
    version: "3.0.0",
    /** Get current global state */
    state: options.getState,
    /** Event trace */
    trace: {
      getAll: () => options.tracer.getTrace(),
      getLast: (n) => options.tracer.getLast(n),
      query: (pattern) => options.tracer.query(pattern),
      queryByOrigin: (origin) => options.tracer.queryByOrigin(origin),
      frequency: () => Object.fromEntries(options.tracer.frequency()),
      eventNames: () => options.tracer.eventNames(),
      origins: () => options.tracer.origins(),
      print: (n) => options.tracer.printTrace(n),
      export: () => options.tracer.exportJSON(),
      clear: () => options.tracer.clear()
    },
    /** Plugin info */
    plugins: options.getPlugins,
    /** Module stores */
    stores: options.getModuleStores,
    /** Errors */
    errors: options.getErrors,
    /** Event bus (for manual emit in devtools console) */
    emit: (event, payload) => options.eventBus.emit(event, payload)
  };
  window.__QMF_DEVTOOLS__ = devtools;
  console.debug("[QMF:DevTools] Installed \u2192 window.__QMF_DEVTOOLS__");
}
function safeClone(value) {
  try {
    return structuredClone(value);
  } catch {
    if (typeof value === "function") return `[Function: ${value.name || "anonymous"}]`;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }
}

// src/version.ts
var QMF_VERSION = "3.0.0";
var QMF_PACKAGES = {
  "@qmf/core": "3.0.0",
  "@qmf/tokens": "3.0.0",
  "@qmf/utils": "3.0.0",
  "@qmf/ui": "3.0.0",
  "@qmf/auth-shell": "3.0.0",
  "@qmf/header": "3.0.0",
  "@qmf/footer": "3.0.0",
  "@qmf/chat-embed": "3.0.0",
  "@qmf/noti-embed": "3.0.0",
  "@qmf/loading-screen": "3.0.0"
};
function getBuildMeta() {
  return {
    frameworkVersion: QMF_VERSION,
    buildId: "__BUILD_ID__",
    gitCommit: "__GIT_COMMIT__",
    channel: (typeof process !== "undefined" ? process.env.QMF_CHANNEL : "production") ?? "production",
    buildTime: "__BUILD_TIME__",
    packages: QMF_PACKAGES
  };
}
function printVersion() {
  const meta = getBuildMeta();
  console.info(
    `%c\u26A1 QMF v${meta.frameworkVersion}%c (${meta.channel})`,
    "color: #667eea; font-weight: bold; font-size: 14px;",
    "color: #888; font-size: 12px;"
  );
}

// src/qmf.ts
var QMFInitSchema = z.object({
  appId: z.string().min(1),
  channel: z.enum(["dev", "staging", "production"]).optional(),
  debug: z.boolean().default(false),
  features: z.object({
    chat: z.boolean().default(false),
    notifications: z.boolean().default(false),
    header: z.boolean().default(true),
    footer: z.boolean().default(true),
    loadingScreen: z.boolean().default(false)
  }).default({}),
  header: z.record(z.unknown()).optional(),
  footer: z.record(z.unknown()).optional(),
  auth: z.object({
    getToken: z.function().optional(),
    getUser: z.function().optional()
  }).optional()
});
var QMFFramework = class {
  constructor() {
    this._eventBus = null;
    this._store = null;
    this._http = null;
    this._pluginLoader = null;
    this._lifecycle = null;
    this._container = null;
    this._tracer = null;
    this._options = null;
  }
  /** Framework version */
  get version() {
    return QMF_VERSION;
  }
  /** Event bus */
  get events() {
    if (!this._eventBus) this._eventBus = getGlobalEventBus();
    return this._eventBus;
  }
  /** State store */
  get store() {
    if (!this._store) throw new Error("[QMF] Not initialized. Call QMF.init() first.");
    return this._store;
  }
  /** HTTP client */
  get http() {
    if (!this._http) throw new Error("[QMF] Not initialized. Call QMF.init() first.");
    return this._http;
  }
  /** DI container */
  get container() {
    if (!this._container) this._container = getGlobalContainer();
    return this._container;
  }
  /** Event tracer (available after init, only in debug mode) */
  get tracer() {
    return this._tracer;
  }
  /** Plugin loader */
  get plugins() {
    if (!this._pluginLoader) throw new Error("[QMF] Not initialized. Call QMF.init() first.");
    return this._pluginLoader;
  }
  /**
   * Initialize the QMF framework.
   */
  async init(options) {
    const config = validateConfig(QMFInitSchema, options, "QMF");
    this._options = config;
    const channel = config.channel ?? detectChannel();
    const urls = resolveEnvUrls(channel);
    const debug = config.debug ?? false;
    this._eventBus = new EventBus({ debug });
    this._store = createStore(
      {
        initialized: false,
        appId: config.appId,
        channel,
        debug,
        user: null,
        theme: this.detectTheme(),
        language: "vi"
      },
      { name: "QMF:Global", debug, schema: GlobalStateSchema }
    );
    this._http = createHttpClient({
      baseUrl: urls.main,
      getToken: config.auth?.getToken,
      debug
    });
    this._container = new DIContainer();
    this._container.registerInstance("eventBus", this._eventBus);
    this._container.registerInstance("store", this._store);
    this._container.registerInstance("http", this._http);
    this._container.registerInstance("config", config);
    this._pluginLoader = createPluginLoader(this._eventBus, this._container, config.debug);
    if (config.debug) {
      this._tracer = new EventTracer(this._eventBus, {
        enabled: true,
        consoleLog: false,
        // Set to true for verbose console output
        maxEntries: 1e3
      });
    }
    this._lifecycle = createLifecycle({
      name: "QMF",
      eventBus: this._eventBus,
      debug: config.debug,
      hooks: {
        onInit: () => {
          this._store.setState({ initialized: true });
          this._eventBus.emit("qmf:initialized", { appId: config.appId, channel });
        },
        onReady: () => {
          this._eventBus.emit("qmf:ready", { appId: config.appId });
          if (config.debug) {
            printVersion();
            if (this._tracer) {
              installDevTools({
                eventBus: this._eventBus,
                tracer: this._tracer,
                getState: () => this._store.getState(),
                getPlugins: () => this._pluginLoader.names(),
                getModuleStores: () => listModuleStores(),
                getErrors: () => getAllModuleErrors()
              });
            }
          }
        },
        onDestroy: () => {
          this._eventBus.emit("qmf:destroyed");
        }
      }
    });
    await this._lifecycle.start();
  }
  /**
   * Register a plugin/module (eager or lazy).
   * Lazy usage: qmf.use(lazy(() => import('@qmf/chat-embed')))
   */
  use(plugin) {
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
  getConfig() {
    return this._options;
  }
  /**
   * Destroy the framework and all plugins.
   */
  async destroy() {
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
  detectTheme() {
    if (typeof window === "undefined") return "light";
    try {
      const stored = localStorage.getItem("qmf-theme");
      if (stored === "dark" || stored === "light") return stored;
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    } catch {
    }
    return "light";
  }
};
var QMF = new QMFFramework();
if (typeof window !== "undefined") {
  window.QMF = QMF;
}

export { BaseConfigSchema, DIContainer, EnvUrlsSchema, EventBus, EventTracer, GlobalStateSchema, HttpClient, HttpError, LifecycleManager, ModuleErrorBoundary, PluginLoader, QMF, QMFConfigError, QMFInitSchema, QMF_PACKAGES, QMF_VERSION, Store, createErrorBoundary, createHttpClient, createLifecycle, createModuleStore, createPluginLoader, createScopedBus, createStore, destroyModuleStore, detectChannel, getAllModuleErrors, getBuildMeta, getErrorBoundary, getGlobalContainer, getGlobalEventBus, getModuleStore, installDevTools, lazy, listErrorBoundaries, listModuleStores, printVersion, resetGlobalContainer, resolveConfig, resolveEnvUrls, validateConfig };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map