import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContract, loadManifestGraph, topologicalOrder } from '@qmf/contract';

const REQUIRED_FILES = [
  'module.js',
  'config.js',
  'state.js',
  'service.js',
  'events.js',
  'view.js',
  'manifest.json',
];

/**
 * @typedef {{ id: string, level: 'error'|'warn', message: string }} Finding
 */

/**
 * Run QMF doctor against an app root.
 * @param {string} appRoot
 * @param {{ strict?: boolean }} [opts]
 */
export function runDoctor(appRoot, opts = {}) {
  /** @type {Finding[]} */
  const findings = [];

  const contractPath = join(appRoot, 'qmf.schema.json');
  if (!existsSync(contractPath)) {
    findings.push({ id: 'DOC-001', level: 'error', message: 'qmf.schema.json missing' });
    return summarize(findings, opts);
  }

  let contract;
  try {
    contract = loadContract(contractPath);
  } catch (e) {
    findings.push({
      id: 'DOC-001',
      level: 'error',
      message: /** @type {Error} */ (e).message,
    });
    return summarize(findings, opts);
  }

  if (contract.language !== 'js') {
    findings.push({
      id: 'DOC-001',
      level: 'error',
      message: `language must be "js" (got ${JSON.stringify(contract.language)})`,
    });
  }

  if (contract.eventBus === 'typed' && contract.ai && /** @type {any} */ (contract.ai).allowMagicEvents !== false) {
    findings.push({
      id: 'DOC-008',
      level: 'error',
      message: 'allowMagicEvents must be false when eventBus is typed',
    });
  }

  let graph;
  try {
    graph = loadManifestGraph(contract, appRoot);
    topologicalOrder(graph);
  } catch (e) {
    findings.push({
      id: 'DOC-004',
      level: 'error',
      message: /** @type {Error} */ (e).message,
    });
    return summarize(findings, opts);
  }

  const modules = /** @type {any[]} */ (contract.modules ?? []);
  for (const m of modules) {
    const node = graph.nodes.find((n) => n.id === m.id);
    if (!node || !existsSync(node.path)) {
      findings.push({
        id: 'DOC-002',
        level: 'error',
        message: `Module path missing for "${m.id}"`,
      });
      continue;
    }

    for (const file of REQUIRED_FILES) {
      if (!existsSync(join(node.path, file))) {
        findings.push({
          id: 'DOC-003',
          level: 'error',
          message: `Module "${m.id}" missing ${file}`,
        });
      }
    }

    // Reject .ts module sources under strict vanilla
    try {
      const files = readdirSync(node.path);
      for (const f of files) {
        if (f.endsWith('.ts') || f.endsWith('.tsx')) {
          findings.push({
            id: 'DOC-003',
            level: 'error',
            message: `Module "${m.id}" must be vanilla JS; found ${f}`,
          });
        }
      }
    } catch {
      /* ignore */
    }

    // DOC-005: event names in manifest should look like namespace.action
    const ev = node.manifest.events ?? {};
    for (const list of [ev.produces ?? [], ev.consumes ?? []]) {
      for (const ref of list) {
        const name = ref.name ?? ref;
        if (!/^[a-z][a-z0-9-]*\.[a-z][a-z0-9A-Z.]*$/.test(name)) {
          findings.push({
            id: 'DOC-005',
            level: 'error',
            message: `Module "${m.id}" invalid event name "${name}"`,
          });
        }
      }
    }
  }

  // DOC-006 sibling imports (heuristic scan)
  for (const node of graph.nodes) {
    for (const file of ['module.js', 'service.js', 'view.js', 'state.js', 'config.js']) {
      const fp = join(node.path, file);
      if (!existsSync(fp)) continue;
      const src = readFileSync(fp, 'utf8');
      const bad = src.match(/from\s+['"]\.\.\/([a-z0-9-]+)\/(?!events\.js)[^'"]+['"]/g);
      if (bad) {
        findings.push({
          id: 'DOC-006',
          level: 'error',
          message: `Module "${node.id}" ${file} has forbidden sibling import: ${bad.join(', ')}`,
        });
      }
    }
  }

  // DOC-007 version major
  const ver = String(contract.version ?? '');
  if (!ver.startsWith('4.')) {
    findings.push({
      id: 'DOC-007',
      level: 'warn',
      message: `contract.version "${ver}" is not 4.x`,
    });
  }

  return summarize(findings, opts);
}

/**
 * @param {Finding[]} findings
 * @param {{ strict?: boolean }} opts
 */
function summarize(findings, opts) {
  const errors = findings.filter((f) => f.level === 'error');
  const warnings = findings.filter((f) => f.level === 'warn');
  let exitCode = 0;
  if (errors.length) exitCode = 1;
  else if (opts.strict && warnings.length) exitCode = 2;
  return { findings, errors, warnings, exitCode, ok: exitCode === 0 };
}

/**
 * Offline inspect summary from contract+manifests.
 * @param {string} appRoot
 */
export function inspectApp(appRoot) {
  const contract = loadContract(join(appRoot, 'qmf.schema.json'));
  const graph = loadManifestGraph(contract, appRoot);
  const order = topologicalOrder(graph);

  /** @type {string[]} */
  const eventNames = [];
  for (const n of graph.nodes) {
    for (const ref of n.manifest.events?.produces ?? []) {
      eventNames.push(ref.name);
    }
  }

  return {
    contract: {
      name: contract.name,
      version: contract.version,
      eventBus: contract.eventBus,
      language: contract.language,
    },
    modules: graph.nodes.map((n) => ({
      id: n.id,
      lazy: n.lazy,
      enabled: n.enabled,
      deps: (n.manifest.dependencies ?? []).map((d) => d.name ?? d),
    })),
    order,
    events: eventNames,
    graph: {
      modules: graph.nodes.map((n) => ({
        id: n.id,
        deps: (n.manifest.dependencies ?? []).map((d) => d.name ?? d),
      })),
      edges: graph.edges,
    },
  };
}
