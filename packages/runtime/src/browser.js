/**
 * Browser bootstrap (fetch + URL imports).
 */
import {
  loadContractUrl,
  loadManifestGraphUrl,
  topologicalOrder,
} from '@qmf/contract/browser';
import {
  createContainer,
  createHttpClient,
  findPluginFactory,
  runLifecycle,
  inspect,
  setSnapshot,
  buildSnapshot,
  emit,
  subscribe,
  defineEvent,
} from './shared.js';

/**
 * @param {string} id
 * @param {any} manifest
 * @param {string} moduleDirUrl
 * @param {Record<string, unknown>} [configs]
 */
export async function loadPluginFromUrl(id, manifest, moduleDirUrl, configs = {}) {
  const entry = manifest.entry || 'module.js';
  const href = new URL(entry, moduleDirUrl).href;
  const mod = await import(/* @vite-ignore */ href);
  const factory = findPluginFactory(mod, id);
  if (!factory) {
    throw new Error(`[QMF:runtime] No create*Plugin export in ${href}`);
  }
  return factory(configs[id] ?? {});
}

/**
 * @param {string} contractUrl absolute URL to qmf.schema.json
 * @param {object} [opts]
 * @param {string} [opts.metaContractUrl]
 * @param {string} [opts.metaManifestUrl]
 * @param {string} [opts.appBaseUrl] directory URL containing the contract
 */
export async function bootstrapFromContractUrl(contractUrl, opts = {}) {
  const metaContractUrl =
    opts.metaContractUrl ??
    new URL('../../../schemas/qmf.schema.schema.json', import.meta.url).href;
  // Prefer CDN/schemas when provided
  const metaManifestUrl =
    opts.metaManifestUrl ??
    new URL('../../../schemas/module.manifest.schema.json', import.meta.url).href;

  const contract = await loadContractUrl(contractUrl, metaContractUrl);
  const appBaseUrl =
    opts.appBaseUrl ??
    contractUrl.replace(/qmf\.schema\.json(?:\?.*)?$/, '');

  const graph = await loadManifestGraphUrl(contract, appBaseUrl, metaManifestUrl);
  const order = topologicalOrder(graph);

  const container = createContainer();
  container.registerValue('http', opts.http ?? createHttpClient());
  container.registerValue('config', contract);

  /** @type {any[]} */
  const plugins = [];
  /** @type {Map<string, any>} */
  const pluginById = new Map();
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  const createPlugin =
    opts.createPlugin ??
    ((id, manifest, dir) => loadPluginFromUrl(id, manifest, dir, opts.configs));

  const shouldRun = opts.runLifecycle !== false;

  /** @param {string} id */
  async function loadOne(id) {
    if (pluginById.has(id)) return pluginById.get(id);
    const node = nodeById.get(id);
    if (!node || !node.enabled) return null;

    const plugin = await createPlugin(id, node.manifest, node.path);
    if (!plugin) return null;

    const ctx = {
      container,
      root: opts.root ?? null,
      eventBus: { emit, subscribe, defineEvent },
      inspect,
      moduleId: id,
    };

    plugins.push(plugin);
    pluginById.set(id, plugin);

    if (shouldRun) {
      try {
        await runLifecycle(plugin, ctx);
        plugin.__qmfStatus = 'ready';
      } catch (e) {
        plugin.__qmfStatus = 'error';
        plugin.__qmfError = e;
        console.error(`[QMF:runtime] module "${id}" failed`, e);
      }
    }

    return plugin;
  }

  for (const id of order) {
    const node = nodeById.get(id);
    if (!node || !node.enabled) continue;
    if (opts.skipLazy !== false && node.lazy) continue;
    await loadOne(id);
  }

  setSnapshot(buildSnapshot(contract, graph, plugins, pluginById, container, opts));

  const api = {
    inspect,
    version: contract.version,
    contract,
    loadModule: loadOne,
    container,
    emit,
    subscribe,
  };

  if (typeof globalThis !== 'undefined' && contract.inspect?.exposeGlobal !== false) {
    /** @type {any} */ (globalThis).QMF = api;
  }

  return { contract, graph, order, container, inspect, plugins, loadModule: loadOne, api };
}

export const initFromContractUrl = bootstrapFromContractUrl;
