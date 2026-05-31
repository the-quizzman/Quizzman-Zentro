/**
 * @qmf/utils - Shared Utilities
 * Common utilities used across all QMF modules.
 * No dependencies on any module — pure utility functions.
 */

// ─── Mobile Detection ───────────────────────────────────────
export {
  detectDevice,
  applyDeviceTier,
  shouldEnableHeavyEffects,
  resetDeviceDetection,
  type DeviceTier,
  type DeviceCapability,
} from './mobile-detect';

// ─── Meta Manager & Resource Hints ──────────────────────────
export {
  updateMeta,
  addPreconnect,
  addPreload,
  injectQMFResourceHints,
  clearManagedMeta,
  type MetaConfig,
} from './meta-manager';

// ─── Token Resolution ───────────────────────────────────────

/**
 * Resolve auth token from multiple sources (priority order):
 * 1. QuizzmanAuth.getToken()
 * 2. Cookie: jwt_token
 * 3. Cookie: authToken
 * 4. localStorage: jwt_token
 * 5. localStorage: authToken
 * 6. localStorage: token
 */
export function resolveToken(): string | null {
  // 1. QuizzmanAuth global
  const win = typeof window !== 'undefined' ? (window as Record<string, unknown>) : null;
  if (win) {
    const auth = win.QuizzmanAuth as { getToken?: () => string | null } | undefined;
    if (auth?.getToken) {
      const token = auth.getToken();
      if (token) return token;
    }
  }

  // 2-3. Cookies
  if (typeof document !== 'undefined') {
    const cookieToken = getCookie('jwt_token') || getCookie('authToken');
    if (cookieToken) return cookieToken;
  }

  // 4-6. localStorage
  if (typeof localStorage !== 'undefined') {
    for (const key of ['jwt_token', 'authToken', 'token']) {
      try {
        const val = localStorage.getItem(key);
        if (val) return val;
      } catch {
        // Ignore storage errors
      }
    }
  }

  return null;
}

/**
 * Resolve current user data from available sources.
 */
export function resolveCurrentUser(): Record<string, unknown> | null {
  const win = typeof window !== 'undefined' ? (window as Record<string, unknown>) : null;
  if (win) {
    const auth = win.QuizzmanAuth as { getUser?: () => Record<string, unknown> | null } | undefined;
    if (auth?.getUser) {
      const user = auth.getUser();
      if (user) return user;
    }
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('user');
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore parse errors
    }
  }

  return null;
}

// ─── Cookie Helpers ─────────────────────────────────────────

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

// ─── Logger ─────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/**
 * Create a namespaced logger with configurable log level.
 */
export function createLogger(namespace: string, level: LogLevel = 'info'): Logger {
  const prefix = `[QMF:${namespace}]`;
  const minLevel = LOG_LEVELS[level];

  return {
    debug: (...args) => {
      if (minLevel <= LOG_LEVELS.debug) console.debug(prefix, ...args);
    },
    info: (...args) => {
      if (minLevel <= LOG_LEVELS.info) console.info(prefix, ...args);
    },
    warn: (...args) => {
      if (minLevel <= LOG_LEVELS.warn) console.warn(prefix, ...args);
    },
    error: (...args) => {
      if (minLevel <= LOG_LEVELS.error) console.error(prefix, ...args);
    },
  };
}

// ─── DOM Helpers ────────────────────────────────────────────

/**
 * Safely query and return a DOM element.
 */
export function queryElement(selector: string | HTMLElement): HTMLElement | null {
  if (typeof selector === 'string') {
    return document.querySelector<HTMLElement>(selector);
  }
  return selector;
}

/**
 * Mount a component into a container.
 * Returns cleanup function.
 */
export function mountComponent(
  container: string | HTMLElement,
  render: (el: HTMLElement) => (() => void) | void,
): () => void {
  const el = queryElement(container);
  if (!el) {
    console.error(`[QMF:mount] Container not found: ${container}`);
    return () => {};
  }

  const cleanup = render(el);
  return () => {
    if (cleanup) cleanup();
    el.innerHTML = '';
  };
}

/**
 * Create an HTML element with attributes and children.
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  children?: (HTMLElement | string)[],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, val] of Object.entries(attrs)) {
      if (key === 'className') {
        el.className = val;
      } else {
        el.setAttribute(key, val);
      }
    }
  }
  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    }
  }
  return el;
}

// ─── SafeFetch ──────────────────────────────────────────────

/**
 * Fetch wrapper with automatic JSON parsing and error handling.
 */
export async function safeFetch<T = unknown>(
  url: string,
  options?: RequestInit & { timeout?: number },
): Promise<{ data: T | null; error: Error | null; status: number }> {
  try {
    const controller = new AbortController();
    const timer = options?.timeout
      ? setTimeout(() => controller.abort(), options.timeout)
      : null;

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (timer) clearTimeout(timer);

    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      return { data: null, error: new Error(`HTTP ${response.status}`), status: response.status };
    }

    return { data: data as T, error: null, status: response.status };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)), status: 0 };
  }
}

// ─── Event Emitter Mixin ────────────────────────────────────

export type EventCallback<T = unknown> = (data: T) => void;

/**
 * Simple event emitter creator (lightweight, for modules that need local events).
 */
export function createEventEmitter() {
  const listeners = new Map<string, Set<EventCallback>>();

  return {
    on<T = unknown>(event: string, cb: EventCallback<T>): () => void {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(cb as EventCallback);
      return () => set!.delete(cb as EventCallback);
    },

    emit<T = unknown>(event: string, data?: T): void {
      const set = listeners.get(event);
      if (set) {
        for (const cb of set) {
          try {
            cb(data);
          } catch (err) {
            console.error(`[QMF:EventEmitter] Error in "${event}":`, err);
          }
        }
      }
    },

    off(event: string, cb?: EventCallback): void {
      if (cb) {
        listeners.get(event)?.delete(cb);
      } else {
        listeners.delete(event);
      }
    },

    clear(): void {
      listeners.clear();
    },
  };
}

// ─── Misc Utilities ─────────────────────────────────────────

/**
 * Deep merge objects (non-array values).
 */
export function deepMerge<T extends Record<string, unknown>>(...objects: Partial<T>[]): T {
  const result: Record<string, unknown> = {};
  for (const obj of objects) {
    for (const [key, val] of Object.entries(obj)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        result[key] = deepMerge(
          (result[key] as Record<string, unknown>) || {},
          val as Record<string, unknown>,
        );
      } else {
        result[key] = val;
      }
    }
  }
  return result as T;
}

/**
 * Generate a unique ID.
 */
export function uniqueId(prefix = 'qmf'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Debounce a function.
 */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

/**
 * Throttle a function.
 */
export function throttle<T extends (...args: unknown[]) => void>(fn: T, limit: number): T {
  let inThrottle = false;
  return ((...args: unknown[]) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}

/**
 * Format a relative time (e.g., "2 phút trước").
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = new Date(date);
  const now = Date.now();
  const diff = now - d.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return 'vừa xong';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;
  return d.toLocaleDateString('vi-VN');
}
