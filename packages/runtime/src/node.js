/**
 * Node bootstrap (fs + pathToFileURL).
 */
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import {
  loadContract,
  loadManifestGraph,
  topologicalOrder,
  assertValid,
} from '@qmf/contract';
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
 * @param {string} dir
 * @param {Record<string, unknown>} [configs]
 */
export async function loadPluginFromDisk(id, manifest, dir, configs = {}) {
  const entry = join(dir, manifest.entry || 'module.js');
  const href = pathToFileURL(entry).href;
  const mod = await import(href);
  const factory = findPluginFactory(mod, id);
  if (!factory) {
    throw new Error(`[QMF:runtime] No create*Plugin export in ${entry}`);
  }
  return factory(configs[id] ?? {});
}

/**
 * @param {string|URL} contractRef
 * @param {object} [opts]
 */
export async function bootstrapFromContract(contractRef, opts = {}) {
  const path =
    typeof contractRef === 'string' ? contractRef : contractRef.pathname;

  const contract = loadContract(path);
  const appRoot = path.replace(/[/\\]qmf\.schema\.json$/, '');
  const graph = loadManifestGraph(contract, appRoot);
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
    ((id, manifest, dir) => loadPluginFromDisk(id, manifest, dir, opts.configs));

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

export const initFromContract = bootstrapFromContract;
export { assertValid };
