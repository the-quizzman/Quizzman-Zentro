/**
 * @qmf/events — typed (named) event bus for QMF 4.0 — vanilla JS
 */

/** @type {Map<string, import('./types.js').EventDef>} */
const registry = new Map();

/** @type {Map<string, Set<Function>>} */
const listeners = new Map();

/** @type {Array<{ name: string, at: number, payload: unknown }>} */
const traceBuf = [];
const TRACE_MAX = 200;
let tracing = false;

/**
 * @typedef {object} EventDef
 * @property {string} name
 * @property {string} namespace
 * @property {number} version
 * @property {string} description
 * @property {object} payload JSON Schema
 * @property {string[]} producers
 * @property {string[]} consumers
 */

/**
 * @param {EventDef} def
 */
export function defineEvent(def) {
  if (!def?.name || !def.namespace || !def.payload) {
    throw new Error('[QMF:events] defineEvent requires name, namespace, payload');
  }
  if (!def.name.startsWith(def.namespace + '.')) {
    throw new Error(`[QMF:events] name "${def.name}" must start with namespace "${def.namespace}."`);
  }
  const key = `${def.name}@${def.version ?? 1}`;
  const existing = registry.get(key);
  if (existing && JSON.stringify(existing.payload) !== JSON.stringify(def.payload)) {
    throw new Error(`[QMF:events] Redeclare ${key} with different payload schema`);
  }
  const normalized = {
    ...def,
    version: def.version ?? 1,
    producers: def.producers ?? [],
    consumers: def.consumers ?? [],
  };
  registry.set(key, normalized);
  registry.set(def.name, normalized); // latest by name
  return normalized;
}

/**
 * @param {EventDef|string} event
 * @param {unknown} payload
 * @param {{ validate?: (schema: object, data: unknown) => { ok: boolean, errors?: string[], data?: unknown }, producer?: string }} [opts]
 */
export function emit(event, payload, opts = {}) {
  const def = typeof event === 'string' ? registry.get(event) : event;
  if (!def) {
    throw new Error(`[QMF:events] Unknown event: ${typeof event === 'string' ? event : event?.name}`);
  }

  let data = payload;
  if (opts.validate) {
    const r = opts.validate(def.payload, payload);
    if (!r.ok) {
      const err = new Error(
        `[QMF:events] Invalid payload for ${def.name}:\n` + (r.errors ?? []).map((e) => `  - ${e}`).join('\n'),
      );
      err.name = 'QMFEventPayloadError';
      throw err;
    }
    data = r.data ?? payload;
  }

  if (tracing) {
    traceBuf.push({ name: def.name, at: Date.now(), payload: data });
    if (traceBuf.length > TRACE_MAX) traceBuf.shift();
  }

  const set = listeners.get(def.name);
  if (!set) return;
  const meta = { version: def.version, at: Date.now(), producer: opts.producer };
  for (const handler of set) {
    try {
      handler(data, meta);
    } catch (e) {
      console.error(`[QMF:events] handler error on ${def.name}`, e);
    }
  }
}

/**
 * @param {EventDef|string} event
 * @param {(payload: unknown, meta: object) => void} handler
 */
export function subscribe(event, handler) {
  const def = typeof event === 'string' ? registry.get(event) : event;
  if (!def) {
    throw new Error(`[QMF:events] Unknown event for subscribe`);
  }
  let set = listeners.get(def.name);
  if (!set) {
    set = new Set();
    listeners.set(def.name, set);
  }
  set.add(handler);
  return () => unsubscribe(def, handler);
}

/**
 * @param {EventDef|string} event
 * @param {Function} handler
 */
export function unsubscribe(event, handler) {
  const def = typeof event === 'string' ? registry.get(event) : event;
  if (!def) return;
  listeners.get(def.name)?.delete(handler);
}

export const events = {
  trace: {
    enable() {
      tracing = true;
    },
    disable() {
      tracing = false;
    },
    /** @param {number} [n] */
    print(n = 20) {
      console.table(traceBuf.slice(-n));
    },
    list() {
      return [...traceBuf];
    },
  },
  debug: {
    list() {
      return [...registry.entries()]
        .filter(([k]) => k.includes('@') || !k.includes('@'))
        .filter(([k], i, arr) => !k.includes('@') || true)
        .reduce((acc, [k, v]) => {
          if (!k.includes('@')) acc.push(v);
          return acc;
        }, /** @type {EventDef[]} */ ([]));
    },
  },
  /**
   * @param {string} [filter] e.g. dictionary.*
   */
  inspect(filter) {
    const all = events.debug.list();
    if (!filter) return all;
    if (filter.endsWith('.*')) {
      const prefix = filter.slice(0, -1);
      return all.filter((e) => e.name.startsWith(prefix));
    }
    return all.filter((e) => e.name === filter);
  },
  /** @internal */
  _reset() {
    registry.clear();
    listeners.clear();
    traceBuf.length = 0;
  },
};

export function listRegisteredEvents() {
  return events.debug.list();
}
