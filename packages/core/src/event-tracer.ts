/**
 * @qmf/core - Event Tracer & DevTools
 *
 * Wraps the EventBus to record every event with:
 *   - origin (which module emitted it)
 *   - payload
 *   - timestamp
 *   - event name
 *
 * Provides a queryable trace buffer and optional DevTools window panel.
 *
 * Usage:
 *   const tracer = new EventTracer(eventBus, { maxEntries: 500 });
 *   tracer.enable();
 *   // ... events fire ...
 *   tracer.getTrace();            // recent events
 *   tracer.query('auth:*');       // filtered
 *   tracer.printTrace();          // formatted console output
 */

import { EventBus, type EventHandler } from './event-bus';

// ─── Types ──────────────────────────────────────────────────

export interface TraceEntry {
  /** Event name */
  event: string;
  /** Clone of the payload */
  payload: unknown;
  /** Module/origin that emitted (if known) */
  origin: string;
  /** Unix timestamp (ms) */
  timestamp: number;
  /** Monotonic index */
  index: number;
}

export interface EventTracerOptions {
  /** Maximum number of trace entries to keep (ring buffer). Default: 1000 */
  maxEntries?: number;
  /** Enable immediately */
  enabled?: boolean;
  /** Pretty-print every event to console */
  consoleLog?: boolean;
  /** Custom filter — return false to skip tracing an event */
  filter?: (event: string, payload: unknown) => boolean;
}

// ─── Tracer ─────────────────────────────────────────────────

export class EventTracer {
  private bus: EventBus;
  private entries: TraceEntry[] = [];
  private maxEntries: number;
  private _enabled = false;
  private consoleLog: boolean;
  private filter?: (event: string, payload: unknown) => boolean;
  private unsubscribe?: () => void;
  private counter = 0;

  constructor(bus: EventBus, options: EventTracerOptions = {}) {
    this.bus = bus;
    this.maxEntries = options.maxEntries ?? 1000;
    this.consoleLog = options.consoleLog ?? false;
    this.filter = options.filter;

    if (options.enabled) {
      this.enable();
    }
  }

  /** Whether tracing is active */
  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Start tracing by subscribing to wildcard (*) on the bus.
   */
  enable(): void {
    if (this._enabled) return;
    this._enabled = true;

    // Subscribe to ALL events via wildcard
    const handler: EventHandler = (data: unknown) => {
      // Wildcard receives { event, payload }
      const { event, payload } = data as { event: string; payload: unknown };
      if (!event) return;

      // Apply filter
      if (this.filter && !this.filter(event, payload)) return;

      // Extract origin from namespaced event (e.g., "header:mounted" → "header")
      const origin = event.includes(':') ? event.split(':')[0] : 'unknown';

      const entry: TraceEntry = {
        event,
        payload: safeClone(payload),
        origin,
        timestamp: Date.now(),
        index: this.counter++,
      };

      // Ring buffer
      this.entries.push(entry);
      if (this.entries.length > this.maxEntries) {
        this.entries.shift();
      }

      // Optional console output
      if (this.consoleLog) {
        console.debug(
          `%c[EventTracer]%c ${event} %c→ Origin: ${origin}`,
          'color: #6c5ce7; font-weight:bold',
          'color: #00b894',
          'color: #636e72',
          payload ?? '',
        );
      }
    };

    this.unsubscribe = this.bus.on('*', handler);
  }

  /**
   * Stop tracing.
   */
  disable(): void {
    if (!this._enabled) return;
    this._enabled = false;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  /**
   * Get all trace entries (newest last).
   */
  getTrace(): readonly TraceEntry[] {
    return this.entries;
  }

  /**
   * Get the last N entries.
   */
  getLast(n: number): TraceEntry[] {
    return this.entries.slice(-n);
  }

  /**
   * Query trace entries by event pattern (supports `*` wildcard).
   */
  query(pattern: string): TraceEntry[] {
    if (pattern === '*') return [...this.entries];

    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -1); // "auth:" from "auth:*"
      return this.entries.filter((e) => e.event.startsWith(prefix));
    }

    return this.entries.filter((e) => e.event === pattern);
  }

  /**
   * Query trace entries by origin module.
   */
  queryByOrigin(origin: string): TraceEntry[] {
    return this.entries.filter((e) => e.origin === origin);
  }

  /**
   * Get unique event names that have been traced.
   */
  eventNames(): string[] {
    return [...new Set(this.entries.map((e) => e.event))];
  }

  /**
   * Get unique origins that have been traced.
   */
  origins(): string[] {
    return [...new Set(this.entries.map((e) => e.origin))];
  }

  /**
   * Get event frequency map (event → count).
   */
  frequency(): Map<string, number> {
    const map = new Map<string, number>();
    for (const entry of this.entries) {
      map.set(entry.event, (map.get(entry.event) ?? 0) + 1);
    }
    return map;
  }

  /**
   * Print a formatted trace table to console.
   */
  printTrace(last?: number): void {
    const entries = last ? this.getLast(last) : this.entries;
    if (entries.length === 0) {
      console.log('[EventTracer] No events recorded.');
      return;
    }

    console.group(`[EventTracer] ${entries.length} events`);
    console.table(
      entries.map((e) => ({
        '#': e.index,
        Event: e.event,
        Origin: e.origin,
        Payload: typeof e.payload === 'object' ? JSON.stringify(e.payload) : e.payload,
        Time: new Date(e.timestamp).toISOString().slice(11, -1),
      })),
    );
    console.groupEnd();
  }

  /**
   * Export trace as JSON for saving/analysis.
   */
  exportJSON(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  /**
   * Clear the trace buffer.
   */
  clear(): void {
    this.entries = [];
    this.counter = 0;
  }

  /**
   * Destroy the tracer.
   */
  destroy(): void {
    this.disable();
    this.clear();
  }
}

// ─── DevTools Panel ─────────────────────────────────────────

/**
 * Expose QMF DevTools on window.__QMF_DEVTOOLS__ for browser DevTools panels.
 * Only runs in browser when debug mode is enabled.
 */
export function installDevTools(options: {
  eventBus: EventBus;
  tracer: EventTracer;
  getState: () => unknown;
  getPlugins: () => string[];
  getModuleStores: () => string[];
  getErrors: () => unknown[];
}): void {
  if (typeof window === 'undefined') return;

  const devtools = {
    version: '3.0.0',

    /** Get current global state */
    state: options.getState,

    /** Event trace */
    trace: {
      getAll: () => options.tracer.getTrace(),
      getLast: (n: number) => options.tracer.getLast(n),
      query: (pattern: string) => options.tracer.query(pattern),
      queryByOrigin: (origin: string) => options.tracer.queryByOrigin(origin),
      frequency: () => Object.fromEntries(options.tracer.frequency()),
      eventNames: () => options.tracer.eventNames(),
      origins: () => options.tracer.origins(),
      print: (n?: number) => options.tracer.printTrace(n),
      export: () => options.tracer.exportJSON(),
      clear: () => options.tracer.clear(),
    },

    /** Plugin info */
    plugins: options.getPlugins,

    /** Module stores */
    stores: options.getModuleStores,

    /** Errors */
    errors: options.getErrors,

    /** Event bus (for manual emit in devtools console) */
    emit: (event: string, payload?: unknown) => options.eventBus.emit(event, payload),
  };

  (window as unknown as Record<string, unknown>).__QMF_DEVTOOLS__ = devtools;
  console.debug('[QMF:DevTools] Installed → window.__QMF_DEVTOOLS__');
}

// ─── Helpers ────────────────────────────────────────────────

function safeClone(value: unknown): unknown {
  try {
    return structuredClone(value);
  } catch {
    // For non-cloneable values (functions, etc.), just capture a summary
    if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }
}
