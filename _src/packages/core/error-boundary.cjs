'use strict';

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

exports.ModuleErrorBoundary = ModuleErrorBoundary;
exports.createErrorBoundary = createErrorBoundary;
exports.getAllModuleErrors = getAllModuleErrors;
exports.getErrorBoundary = getErrorBoundary;
exports.listErrorBoundaries = listErrorBoundaries;
//# sourceMappingURL=error-boundary.cjs.map
//# sourceMappingURL=error-boundary.cjs.map