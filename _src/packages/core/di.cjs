'use strict';

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

exports.DIContainer = DIContainer;
exports.getGlobalContainer = getGlobalContainer;
exports.resetGlobalContainer = resetGlobalContainer;
//# sourceMappingURL=di.cjs.map
//# sourceMappingURL=di.cjs.map