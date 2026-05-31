/**
 * @qmf/core - Event Bus
 * Central event system for inter-module communication.
 * Follows pub/sub pattern with wildcard support.
 */

export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export interface EventBusOptions {
  /** Maximum listeners per event (0 = unlimited) */
  maxListeners?: number;
  /** Enable debug logging */
  debug?: boolean;
}

interface EventEntry {
  handler: EventHandler;
  once: boolean;
}

export class EventBus {
  private listeners = new Map<string, EventEntry[]>();
  private wildcardPatterns = new Map<string, EventEntry[]>();
  private maxListeners: number;
  private debug: boolean;

  constructor(options: EventBusOptions = {}) {
    this.maxListeners = options.maxListeners ?? 100;
    this.debug = options.debug ?? false;
  }

  /**
   * Subscribe to an event.
   * @returns Unsubscribe function
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    return this.addListener(event, handler as EventHandler, false);
  }

  /**
   * Subscribe to an event, auto-removes after first call.
   * @returns Unsubscribe function
   */
  once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    return this.addListener(event, handler as EventHandler, true);
  }

  /**
   * Remove a specific listener.
   */
  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    const entries = this.listeners.get(event);
    if (!entries) return;
    const filtered = entries.filter((e) => e.handler !== handler);
    if (filtered.length === 0) {
      this.listeners.delete(event);
      this.wildcardPatterns.delete(event);
    } else {
      this.listeners.set(event, filtered);
      if (event === '*' || event.endsWith(':*')) {
        this.wildcardPatterns.set(event, filtered);
      }
    }
  }

  /**
   * Emit an event to all listeners.
   */
  emit<T = unknown>(event: string, payload?: T): void {
    if (this.debug) {
      console.debug(`[QMF:EventBus] emit "${event}"`, payload);
    }

    // Exact match listeners
    const entries = this.listeners.get(event);
    if (entries) {
      const toRemove: EventEntry[] = [];
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
          entries.filter((e) => !toRemove.includes(e)),
        );
      }
    }

    // Wildcard listeners — O(1) lookup via dedicated cache
    const globalWild = this.wildcardPatterns.get('*');
    if (globalWild) {
      for (const entry of globalWild) {
        try {
          entry.handler({ event, payload });
        } catch (err) {
          console.error(`[QMF:EventBus] Error in wildcard handler "*":`, err);
        }
      }
    }

    // Scoped wildcard (e.g., "module:*")
    const colonIdx = event.indexOf(':');
    if (colonIdx !== -1) {
      const scopeWild = this.wildcardPatterns.get(event.slice(0, colonIdx + 1) + '*');
      if (scopeWild) {
        for (const entry of scopeWild) {
          try {
            entry.handler({ event, payload });
          } catch (err) {
            console.error(`[QMF:EventBus] Error in wildcard handler "${event.slice(0, colonIdx + 1)}*":`, err);
          }
        }
      }
    }
  }

  /**
   * Remove all listeners, optionally for a specific event.
   */
  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
      this.wildcardPatterns.delete(event);
    } else {
      this.listeners.clear();
      this.wildcardPatterns.clear();
    }
  }

  /**
   * Get the number of listeners for an event.
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  /**
   * Get all registered event names.
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  private addListener(event: string, handler: EventHandler, once: boolean): () => void {
    let entries = this.listeners.get(event);
    if (!entries) {
      entries = [];
      this.listeners.set(event, entries);
    }

    if (this.maxListeners > 0 && entries.length >= this.maxListeners) {
      console.warn(
        `[QMF:EventBus] Max listeners (${this.maxListeners}) reached for "${event}". ` +
          'Possible memory leak.',
      );
    }

    const entry: EventEntry = { handler, once };
    entries.push(entry);

    // Keep wildcard cache in sync
    if (event === '*' || event.endsWith(':*')) {
      this.wildcardPatterns.set(event, entries);
    }

    return () => this.off(event, handler);
  }
}

/** Singleton global event bus */
let _globalBus: EventBus | null = null;

export function getGlobalEventBus(): EventBus {
  if (!_globalBus) {
    _globalBus = new EventBus();
  }
  return _globalBus;
}

/**
 * Create a scoped event bus that prefixes all events.
 */
export function createScopedBus(scope: string, bus?: EventBus): EventBus {
  const target = bus ?? getGlobalEventBus();
  const proxy = new EventBus();

  const originalEmit = proxy.emit.bind(proxy);
  const originalOn = proxy.on.bind(proxy);

  proxy.emit = <T>(event: string, payload?: T) => {
    originalEmit(event, payload);
    target.emit(`${scope}:${event}`, payload);
  };

  proxy.on = <T>(event: string, handler: EventHandler<T>) => {
    return originalOn(event, handler);
  };

  return proxy;
}
