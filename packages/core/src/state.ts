/**
 * @qmf/core - State Store
 * Minimal reactive state management for QMF modules.
 * Immutable updates, selectors, change subscriptions.
 * Supports Zod schema validation and isolated module stores.
 */

import { z, type ZodSchema } from 'zod';

export type StateListener<T> = (newState: T, prevState: T) => void;
export type Selector<T, R> = (state: T) => R;

export interface StoreOptions<T> {
  /** Initial state */
  initialState: T;
  /** Enable debug logging */
  debug?: boolean;
  /** Store name (for debugging) */
  name?: string;
  /** Zod schema for runtime state validation (optional) */
  schema?: ZodSchema<T>;
}

export class Store<T extends Record<string, unknown>> {
  private state: T;
  private listeners = new Set<StateListener<T>>();
  private selectorListeners = new Map<Selector<T, unknown>, Set<StateListener<unknown>>>();
  private debug: boolean;
  private name: string;
  private schema?: ZodSchema<T>;
  private pendingPatch: Partial<T> | null = null;
  private batchRAF: number | null = null;

  constructor(options: StoreOptions<T>) {
    this.debug = options.debug ?? false;
    this.name = options.name ?? 'QMFStore';
    this.schema = options.schema;

    // Validate initial state if schema provided
    const validated = this.validate(options.initialState);
    this.state = structuredClone(validated);
  }

  /**
   * Get current state (immutable snapshot).
   */
  getState(): Readonly<T> {
    return Object.freeze({ ...this.state });
  }

  /**
   * Select a derived value from state.
   */
  select<R>(selector: Selector<T, R>): R {
    return selector(this.state);
  }

  /**
   * Update state with a partial update or updater function.
   * If a Zod schema was provided, the merged state is validated before committing.
   * Multiple rapid calls are batched into a single frame via requestAnimationFrame.
   */
  setState(updater: Partial<T> | ((prev: T) => Partial<T>)): void {
    const currentState = this.pendingPatch ? { ...this.state, ...this.pendingPatch } : this.state;
    const patch = typeof updater === 'function' ? updater(currentState as T) : updater;

    // Accumulate patches
    this.pendingPatch = this.pendingPatch ? { ...this.pendingPatch, ...patch } : { ...patch };

    // Schedule flush once per frame
    if (this.batchRAF === null) {
      this.batchRAF = (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : setTimeout)(() => {
        this.flushState();
      }) as unknown as number;
    }
  }

  /**
   * Force-flush any pending batched state update immediately.
   * Useful for tests or when you need synchronous state commit.
   */
  flushState(): void {
    if (!this.pendingPatch) return;

    const prevState = this.state;
    const patch = this.pendingPatch;
    this.pendingPatch = null;
    this.batchRAF = null;

    const merged = { ...prevState, ...patch } as T;
    const nextState = this.validate(merged);
    this.state = nextState;

    if (this.debug) {
      console.debug(`[QMF:Store:${this.name}] setState (batched flush)`, { prev: prevState, patch, next: this.state });
    }

    // Notify global listeners
    for (const listener of this.listeners) {
      try {
        listener(this.state, prevState);
      } catch (err) {
        console.error(`[QMF:Store:${this.name}] Listener error:`, err);
      }
    }

    // Notify selector listeners
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
  subscribe(listener: StateListener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to changes of a selected value.
   * @returns Unsubscribe function
   */
  watch<R>(selector: Selector<T, R>, listener: StateListener<R>): () => void {
    let sListeners = this.selectorListeners.get(selector as Selector<T, unknown>);
    if (!sListeners) {
      sListeners = new Set();
      this.selectorListeners.set(selector as Selector<T, unknown>, sListeners);
    }
    sListeners.add(listener as StateListener<unknown>);

    return () => {
      sListeners!.delete(listener as StateListener<unknown>);
      if (sListeners!.size === 0) {
        this.selectorListeners.delete(selector as Selector<T, unknown>);
      }
    };
  }

  /**
   * Reset state to initial value.
   */
  reset(initialState: T): void {
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
  destroy(): void {
    this.listeners.clear();
    this.selectorListeners.clear();
  }

  /**
   * Validate state against the Zod schema (if present).
   * Returns the parsed (possibly transformed) state.
   */
  private validate(state: T): T {
    if (!this.schema) return state;
    const result = this.schema.safeParse(state);
    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new Error(`[QMF:Store:${this.name}] State validation failed: ${errors}`);
    }
    return result.data as T;
  }
}

/**
 * Create a typed store with initial state and optional Zod schema.
 */
export function createStore<T extends Record<string, unknown>>(
  initialState: T,
  options?: Omit<StoreOptions<T>, 'initialState'>,
): Store<T> {
  return new Store({ initialState, ...options });
}

// ─── Global State Schema ────────────────────────────────────

/**
 * Schema for shared/global state that all modules can access.
 * Only auth, theme, and language belong here.
 */
export const GlobalStateSchema = z.object({
  initialized: z.boolean(),
  appId: z.string(),
  channel: z.enum(['dev', 'staging', 'production']),
  debug: z.boolean(),
  user: z.record(z.unknown()).nullable(),
  theme: z.enum(['light', 'dark']),
  language: z.string().default('vi'),
});

export type GlobalState = z.infer<typeof GlobalStateSchema>;

// ─── Module Store Registry ──────────────────────────────────

/** Registry of all module-scoped stores (for debugging / DevTools). */
const _moduleStores = new Map<string, Store<Record<string, unknown>>>();

/**
 * Create an isolated store for a specific module.
 * Each module gets its own local state — prevents cross-contamination.
 *
 * Usage:
 *   const chatStore = createModuleStore('chat-embed', { messages: [], connected: false }, ChatStateSchema);
 */
export function createModuleStore<T extends Record<string, unknown>>(
  moduleName: string,
  initialState: T,
  schema?: ZodSchema<T>,
  debug?: boolean,
): Store<T> {
  if (_moduleStores.has(moduleName)) {
    console.warn(`[QMF:Store] Module store "${moduleName}" already exists — returning existing.`);
    return _moduleStores.get(moduleName) as unknown as Store<T>;
  }

  const store = new Store<T>({
    initialState,
    name: moduleName,
    schema,
    debug,
  });

  _moduleStores.set(moduleName, store as unknown as Store<Record<string, unknown>>);
  return store;
}

/**
 * Get a module's isolated store (for cross-module reads — use sparingly).
 */
export function getModuleStore<T extends Record<string, unknown>>(moduleName: string): Store<T> | undefined {
  return _moduleStores.get(moduleName) as unknown as Store<T> | undefined;
}

/**
 * Destroy a module store (called during module teardown).
 */
export function destroyModuleStore(moduleName: string): void {
  const store = _moduleStores.get(moduleName);
  if (store) {
    store.destroy();
    _moduleStores.delete(moduleName);
  }
}

/**
 * Get all registered module store names (for DevTools).
 */
export function listModuleStores(): string[] {
  return [..._moduleStores.keys()];
}

export { z };
