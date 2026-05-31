'use strict';

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

exports.EventTracer = EventTracer;
exports.installDevTools = installDevTools;
//# sourceMappingURL=event-tracer.cjs.map
//# sourceMappingURL=event-tracer.cjs.map