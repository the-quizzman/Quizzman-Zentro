/**
 * @qmf/core - Error Boundary
 *
 * Per-module error isolation: one module crashing doesn't kill the app.
 * Provides:
 *   - ModuleErrorBoundary: wraps async work and catches errors
 *   - Error event emission so the host app can react
 *   - Configurable onError hook + optional retry
 */

import { EventBus } from './event-bus';

// ─── Types ──────────────────────────────────────────────────

export interface ModuleError {
  /** Module that threw */
  module: string;
  /** The error object */
  error: Error;
  /** Lifecycle phase or context where the error occurred */
  phase: string;
  /** Timestamp */
  timestamp: number;
  /** Whether the error was recovered from */
  recovered: boolean;
}

export type ErrorHandler = (err: ModuleError) => void;
export type ErrorRecovery = (err: ModuleError) => boolean | Promise<boolean>;

export interface ErrorBoundaryOptions {
  /** Module name */
  module: string;
  /** Event bus for emitting error events */
  eventBus?: EventBus;
  /** Custom error handler */
  onError?: ErrorHandler;
  /** Recovery function — return true to mark as recovered */
  onRecover?: ErrorRecovery;
  /** Maximum retry attempts for recoverable errors */
  maxRetries?: number;
  /** Enable debug logging */
  debug?: boolean;
}

// ─── Error Boundary ─────────────────────────────────────────

export class ModuleErrorBoundary {
  private module: string;
  private eventBus?: EventBus;
  private onError?: ErrorHandler;
  private onRecover?: ErrorRecovery;
  private maxRetries: number;
  private debug: boolean;
  private errors: ModuleError[] = [];

  constructor(options: ErrorBoundaryOptions) {
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
  async guard<T>(
    fn: () => T | Promise<T>,
    phase = 'unknown',
  ): Promise<{ ok: true; value: T } | { ok: false; error: ModuleError }> {
    let attempts = 0;
    const maxAttempts = 1 + this.maxRetries;

    while (attempts < maxAttempts) {
      try {
        const value = await fn();
        return { ok: true, value };
      } catch (rawErr) {
        attempts++;
        const error = rawErr instanceof Error ? rawErr : new Error(String(rawErr));
        const moduleError: ModuleError = {
          module: this.module,
          error,
          phase,
          timestamp: Date.now(),
          recovered: false,
        };

        this.errors.push(moduleError);

        if (this.debug) {
          console.error(`[QMF:ErrorBoundary:${this.module}] Error in "${phase}" (attempt ${attempts}/${maxAttempts}):`, error.message);
        }

        // Emit error event
        this.eventBus?.emit('module:error', moduleError);
        this.eventBus?.emit(`module:${this.module}:error`, moduleError);

        // Call onError hook
        this.onError?.(moduleError);

        // Try recovery (unless we've exhausted retries)
        if (this.onRecover && attempts < maxAttempts) {
          try {
            const recovered = await this.onRecover(moduleError);
            if (recovered) {
              moduleError.recovered = true;
              if (this.debug) {
                console.debug(`[QMF:ErrorBoundary:${this.module}] Recovered from "${phase}", retrying...`);
              }
              continue; // Retry the function
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

    // Should not reach here, but just in case
    return {
      ok: false,
      error: {
        module: this.module,
        error: new Error('Max retries exhausted'),
        phase,
        timestamp: Date.now(),
        recovered: false,
      },
    };
  }

  /**
   * Synchronous guard — wraps a sync function.
   */
  guardSync<T>(fn: () => T, phase = 'unknown'): { ok: true; value: T } | { ok: false; error: ModuleError } {
    try {
      const value = fn();
      return { ok: true, value };
    } catch (rawErr) {
      const error = rawErr instanceof Error ? rawErr : new Error(String(rawErr));
      const moduleError: ModuleError = {
        module: this.module,
        error,
        phase,
        timestamp: Date.now(),
        recovered: false,
      };

      this.errors.push(moduleError);
      this.eventBus?.emit('module:error', moduleError);
      this.eventBus?.emit(`module:${this.module}:error`, moduleError);
      this.onError?.(moduleError);

      return { ok: false, error: moduleError };
    }
  }

  /**
   * Get all errors captured by this boundary.
   */
  getErrors(): readonly ModuleError[] {
    return this.errors;
  }

  /**
   * Get the last error.
   */
  getLastError(): ModuleError | undefined {
    return this.errors[this.errors.length - 1];
  }

  /**
   * Clear the error log.
   */
  clearErrors(): void {
    this.errors = [];
  }
}

// ─── Global Error Registry ──────────────────────────────────

const _boundaries = new Map<string, ModuleErrorBoundary>();

/**
 * Create an error boundary for a module and register it globally.
 */
export function createErrorBoundary(options: ErrorBoundaryOptions): ModuleErrorBoundary {
  const boundary = new ModuleErrorBoundary(options);
  _boundaries.set(options.module, boundary);
  return boundary;
}

/**
 * Get a module's error boundary.
 */
export function getErrorBoundary(module: string): ModuleErrorBoundary | undefined {
  return _boundaries.get(module);
}

/**
 * Get all error boundaries (for DevTools).
 */
export function listErrorBoundaries(): string[] {
  return [..._boundaries.keys()];
}

/**
 * Collect all errors across all modules.
 */
export function getAllModuleErrors(): ModuleError[] {
  const all: ModuleError[] = [];
  for (const boundary of _boundaries.values()) {
    all.push(...boundary.getErrors());
  }
  return all.sort((a, b) => a.timestamp - b.timestamp);
}
