'use strict';

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

exports.EventBus = EventBus;
exports.createScopedBus = createScopedBus;
exports.getGlobalEventBus = getGlobalEventBus;
//# sourceMappingURL=event-bus.cjs.map
//# sourceMappingURL=event-bus.cjs.map