'use strict';

var zod = require('zod');

// src/state.ts
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
var GlobalStateSchema = zod.z.object({
  initialized: zod.z.boolean(),
  appId: zod.z.string(),
  channel: zod.z.enum(["dev", "staging", "production"]),
  debug: zod.z.boolean(),
  user: zod.z.record(zod.z.unknown()).nullable(),
  theme: zod.z.enum(["light", "dark"]),
  language: zod.z.string().default("vi")
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

Object.defineProperty(exports, "z", {
  enumerable: true,
  get: function () { return zod.z; }
});
exports.GlobalStateSchema = GlobalStateSchema;
exports.Store = Store;
exports.createModuleStore = createModuleStore;
exports.createStore = createStore;
exports.destroyModuleStore = destroyModuleStore;
exports.getModuleStore = getModuleStore;
exports.listModuleStores = listModuleStores;
//# sourceMappingURL=state.cjs.map
//# sourceMappingURL=state.cjs.map