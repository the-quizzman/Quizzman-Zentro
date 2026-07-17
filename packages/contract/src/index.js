import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertValid, validate } from './validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMAS_DIR = join(__dirname, '../schemas');

/**
 * @param {string} name
 */
export function loadMetaSchema(name = 'qmf.schema.schema.json') {
  const path = join(SCHEMAS_DIR, name);
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Load and validate qmf.schema.json
 * @param {string} contractPath absolute or relative path
 * @returns {Record<string, unknown>}
 */
export function loadContract(contractPath) {
  const abs = isAbsolute(contractPath) ? contractPath : resolve(process.cwd(), contractPath);
  if (!existsSync(abs)) {
    const err = new Error(`[QMF:contract] File not found: ${abs}`);
    err.name = 'QMFContractError';
    throw err;
  }
  /** @type {Record<string, unknown>} */
  let raw;
  try {
    raw = JSON.parse(readFileSync(abs, 'utf8'));
  } catch (e) {
    const err = new Error(`[QMF:contract] Invalid JSON: ${abs}\n${/** @type {Error} */ (e).message}`);
    err.name = 'QMFContractError';
    throw err;
  }

  const meta = loadMetaSchema('qmf.schema.schema.json');
  // Soften meta: language may be required — ensure default
  if (raw.language == null) raw.language = 'js';

  const data = assertValid(meta, raw, { name: 'qmf.schema.json', applyDefaults: true });
  return /** @type {Record<string, unknown>} */ (data);
}

/**
 * Load module manifest.json and validate.
 * @param {string} manifestPath
 */
export function loadManifest(manifestPath) {
  const abs = isAbsolute(manifestPath) ? manifestPath : resolve(process.cwd(), manifestPath);
  if (!existsSync(abs)) {
    const err = new Error(`[QMF:manifest] File not found: ${abs}`);
    err.name = 'QMFManifestError';
    throw err;
  }
  const raw = JSON.parse(readFileSync(abs, 'utf8'));
  const meta = loadMetaSchema('module.manifest.schema.json');
  return assertValid(meta, raw, { name: 'manifest.json', applyDefaults: true });
}

/**
 * Resolve all manifests for a contract.
 * @param {Record<string, unknown>} contract
 * @param {string} appRoot
 */
export function loadManifestGraph(contract, appRoot) {
  const layers = /** @type {Record<string, string>} */ (contract.layers ?? {});
  const modulesRoot = join(appRoot, layers.modules ?? 'src/modules');
  const modules = /** @type {Array<Record<string, unknown>>} */ (contract.modules ?? []);

  /** @type {Array<{ id: string, path: string, manifest: any, lazy: boolean, enabled: boolean }>} */
  const nodes = [];

  for (const m of modules) {
    const id = String(m.id);
    const rel = String(m.path ?? id);
    const manifestFile = String(m.manifest ?? 'manifest.json');
    const moduleDir = join(modulesRoot, rel);
    const manifestPath = join(moduleDir, manifestFile);
    const manifest = loadManifest(manifestPath);
    nodes.push({
      id,
      path: moduleDir,
      manifest,
      lazy: m.lazy === true,
      enabled: m.enabled !== false,
    });
  }

  return { modulesRoot, nodes, edges: buildEdges(nodes) };
}

/**
 * @param {Array<{ id: string, manifest: any }>} nodes
 */
function buildEdges(nodes) {
  const ids = new Set(nodes.map((n) => n.id));
  /** @type {Array<{ from: string, to: string }>} */
  const edges = [];
  for (const n of nodes) {
    const deps = n.manifest.dependencies ?? [];
    for (const d of deps) {
      const name = typeof d === 'string' ? d : d.name;
      if (ids.has(name)) edges.push({ from: n.id, to: name });
    }
  }
  return edges;
}

/**
 * Topological order; throws on cycle.
 * @param {{ nodes: Array<{ id: string }>, edges: Array<{ from: string, to: string }> }} graph
 */
export function topologicalOrder(graph) {
  const ids = graph.nodes.map((n) => n.id);
  /** @type {Map<string, Set<string>>} */
  const deps = new Map(ids.map((id) => [id, new Set()]));
  for (const e of graph.edges) {
    deps.get(e.from)?.add(e.to);
  }

  /** @type {string[]} */
  const order = [];
  /** @type {Set<string>} */
  const visiting = new Set();
  /** @type {Set<string>} */
  const done = new Set();

  /**
   * @param {string} id
   */
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
