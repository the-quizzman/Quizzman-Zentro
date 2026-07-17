/**
 * Browser-safe contract helpers (fetch-based). No node:fs.
 */
import { assertValid, validate } from './validate.js';

/**
 * @param {string} url
 */
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`[QMF:contract] GET ${url} → ${res.status}`);
  return res.json();
}

/**
 * @param {string} metaSchemaUrl
 * @param {string} contractUrl
 */
export async function loadContractUrl(contractUrl, metaSchemaUrl) {
  const [meta, raw] = await Promise.all([
    fetchJson(metaSchemaUrl),
    fetchJson(contractUrl),
  ]);
  if (raw.language == null) raw.language = 'js';
  return assertValid(meta, raw, { name: 'qmf.schema.json', applyDefaults: true });
}

/**
 * @param {string} manifestUrl
 * @param {string} metaSchemaUrl
 */
export async function loadManifestUrl(manifestUrl, metaSchemaUrl) {
  const [meta, raw] = await Promise.all([
    fetchJson(metaSchemaUrl),
    fetchJson(manifestUrl),
  ]);
  return assertValid(meta, raw, { name: 'manifest.json', applyDefaults: true });
}

/**
 * @param {Record<string, unknown>} contract
 * @param {string} appBaseUrl trailing-slash base of the app (where qmf.schema.json lives)
 * @param {string} manifestMetaUrl
 */
export async function loadManifestGraphUrl(contract, appBaseUrl, manifestMetaUrl) {
  const layers = /** @type {Record<string, string>} */ (contract.layers ?? {});
  const modulesPath = layers.modules ?? 'src/modules';
  const base = appBaseUrl.endsWith('/') ? appBaseUrl : appBaseUrl + '/';
  const modules = /** @type {Array<Record<string, unknown>>} */ (contract.modules ?? []);

  /** @type {Array<{ id: string, path: string, manifest: any, lazy: boolean, enabled: boolean }>} */
  const nodes = [];

  for (const m of modules) {
    const id = String(m.id);
    const rel = String(m.path ?? id);
    const manifestFile = String(m.manifest ?? 'manifest.json');
    const moduleDirUrl = new URL(`${modulesPath}/${rel}/`, base).href;
    const manifestUrl = new URL(manifestFile, moduleDirUrl).href;
    const manifest = await loadManifestUrl(manifestUrl, manifestMetaUrl);
    nodes.push({
      id,
      path: moduleDirUrl,
      manifest,
      lazy: m.lazy === true,
      enabled: m.enabled !== false,
    });
  }

  const ids = new Set(nodes.map((n) => n.id));
  /** @type {Array<{ from: string, to: string }>} */
  const edges = [];
  for (const n of nodes) {
    for (const d of n.manifest.dependencies ?? []) {
      const name = typeof d === 'string' ? d : d.name;
      if (ids.has(name)) edges.push({ from: n.id, to: name });
    }
  }

  return { modulesRoot: new URL(`${modulesPath}/`, base).href, nodes, edges };
}

/**
 * @param {{ nodes: Array<{ id: string }>, edges: Array<{ from: string, to: string }> }} graph
 */
export function topologicalOrder(graph) {
  const ids = graph.nodes.map((n) => n.id);
  /** @type {Map<string, Set<string>>} */
  const deps = new Map(ids.map((id) => [id, new Set()]));
  for (const e of graph.edges) deps.get(e.from)?.add(e.to);

  /** @type {string[]} */
  const order = [];
  const visiting = new Set();
  const done = new Set();

  /** @param {string} id */
  function visit(id) {
    if (done.has(id)) return;
    if (visiting.has(id)) {
      const err = new Error(`[QMF:contract] Circular dependency involving "${id}"`);
      err.name = 'QMFDependencyError';
      throw err;
    }
    visiting.add(id);
    for (const d of deps.get(id) ?? []) visit(d);
    visiting.delete(id);
    done.add(id);
    order.push(id);
  }

  for (const id of ids) visit(id);
  return order;
}

export { validate, assertValid };
