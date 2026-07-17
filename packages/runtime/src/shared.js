/**
 * Shared runtime pieces — safe for Node and browser.
 */
import { validate } from '@qmf/contract/validate';
import { createInspectApi } from '@qmf/inspect/api';
import {
  defineEvent,
  emit,
  subscribe,
  events as eventDebug,
} from '@qmf/events';

/** @type {Map<string, ReturnType<typeof createStore>>} */
export const moduleStores = new Map();

/**
 * @template T
 * @param {T} initial
 * @param {object} [schema]
 */
export function createStore(initial, schema) {
  let state = structuredClone(initial);
  /** @type {Set<(s: any) => void>} */
  const listeners = new Set();

  return {
    getState: () => state,
    /** @param {Partial<T>} partial */
    setState(partial) {
      const next = { ...state, ...partial };
      if (schema) {
        const r = validate(schema, next);
        if (!r.ok) throw new Error(`[QMF:store] ${r.errors.join('; ')}`);
        state = /** @type {T} */ (r.data);
      } else {
        state = next;
      }
      for (const l of listeners) l(state);
    },
    /** @param {(s: any) => void} fn */
    watch(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/**
 * @param {string} moduleId
 * @param {object} initial
 * @param {object} schema
 */
export function createModuleStore(moduleId, initial, schema) {
  const store = createStore(initial, schema);
  moduleStores.set(moduleId, store);
  return store;
}

/**
 * @param {string} tag
 * @param {Record<string, string>} [attrs]
 * @param {(Node|string)[]} [children]
 */
export function createElement(tag, attrs = {}, children = []) {
  if (typeof document === 'undefined') {
    throw new Error('[QMF:dom] createElement requires a document (browser)');
  }
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') el.className = v;
    else el.setAttribute(k, v);
  }
  for (const c of children) {
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

/** @type {any} */
export let snapshot = emptySnapshot();

export function emptySnapshot() {
  return {
    contract: null,
    modules: [],
    events: [],
    services: [],
    state: {},
    routes: [],
    plugins: [],
    config: {},
    graph: { modules: [], events: [], edges: [] },
  };
}

export const inspect = createInspectApi(() => snapshot);

/** @param {any} next */
export function setSnapshot(next) {
  snapshot = next;
}

export function createContainer() {
  /** @type {Map<string, { factory?: Function, value?: unknown }>} */
  const services = new Map();
  const api = {
    /** @param {string} token @param {Function} factory */
    registerFactory(token, factory) {
      services.set(token, { factory });
    },
    /** @param {string} token @param {unknown} value */
    registerValue(token, value) {
      services.set(token, { value });
    },
    /** @param {string} token */
    resolve(token) {
      const d = services.get(token);
      if (!d) throw new Error(`[QMF:di] Unknown service "${token}"`);
      if (d.value !== undefined) return d.value;
      d.value = d.factory(api);
      return d.value;
    },
    has(token) {
      return services.has(token);
    },
  };
  return api;
}

export function createHttpClient(base = '') {
  return {
    /** @param {string} url */
    async get(url) {
      const full = url.startsWith('http') ? url : `${base}${url}`;
      if (typeof fetch === 'function') {
        const res = await fetch(full);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }
      return null;
    },
  };
}

/**
 * @param {Record<string, unknown>} mod
 * @param {string} id
 */
export function findPluginFactory(mod, id) {
  const pascal = id
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
  const preferred = `create${pascal}Plugin`;
  if (typeof mod[preferred] === 'function') return mod[preferred];
  const hit = Object.entries(mod).find(
    ([k, v]) => k.startsWith('create') && k.endsWith('Plugin') && typeof v === 'function',
  );
  if (hit) return hit[1];
  if (typeof mod.default === 'function') return mod.default;
  return null;
}

/**
 * @param {any} plugin
 * @param {any} ctx
 */
export async function runLifecycle(plugin, ctx) {
  const hooks = plugin.hooks ?? {};
  const hasDom = typeof document !== 'undefined';

  if (plugin.setup) await plugin.setup(ctx);
  if (hooks.onBeforeInit) await hooks.onBeforeInit(ctx);
  if (hooks.onInit) await hooks.onInit(ctx);
  if (hooks.onAfterInit) await hooks.onAfterInit(ctx);

  if (hasDom) {
    if (hooks.onBeforeMount) await hooks.onBeforeMount(ctx);
    if (hooks.onMount) await hooks.onMount(ctx);
    if (hooks.onAfterMount) await hooks.onAfterMount(ctx);
  }

  if (hooks.onBeforeConnect) await hooks.onBeforeConnect(ctx);
  if (hooks.onConnect) await hooks.onConnect(ctx);
  if (hooks.onAfterConnect) await hooks.onAfterConnect(ctx);
  if (hooks.onReady) await hooks.onReady(ctx);
}

/**
 * Build inspect snapshot after load.
 */
export function buildSnapshot(contract, graph, plugins, pluginById, container, opts) {
  return {
    contract,
    modules: graph.nodes.map((n) => ({
      id: n.id,
      version: n.manifest.version,
      lazy: n.lazy,
      enabled: n.enabled,
      dependencies: n.manifest.dependencies ?? [],
      path: n.path,
      lifecycle: n.manifest.lifecycle ?? [],
      status: pluginById.get(n.id)?.__qmfStatus ?? (n.lazy ? 'lazy' : 'pending'),
    })),
    events: graph.nodes.flatMap((n) =>
      (n.manifest.events?.produces ?? []).map((e) => ({
        name: e.name,
        version: e.version,
        producers: [n.id],
        consumers: [],
      })),
    ),
    services: graph.nodes.flatMap((n) =>
      (n.manifest.services ?? []).map((s) => ({
        token: s.token,
        module: n.id,
        singleton: s.singleton !== false,
        resolved: container.has(s.token),
      })),
    ),
    state: Object.fromEntries([...moduleStores.entries()].map(([k, s]) => [k, s.getState()])),
    routes: [],
    plugins: plugins.map((p) => ({
      name: p.name,
      status: p.__qmfStatus ?? 'loaded',
      error: p.__qmfError ? String(p.__qmfError.message ?? p.__qmfError) : undefined,
    })),
    config: opts.configs ?? {},
    graph: {
      modules: graph.nodes.map((n) => ({
        id: n.id,
        deps: (n.manifest.dependencies ?? []).map((d) => d.name ?? d),
      })),
      events: [],
      edges: graph.edges,
    },
  };
}

export {
  validate,
  defineEvent,
  emit,
  subscribe,
  eventDebug,
};
