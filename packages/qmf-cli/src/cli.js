#!/usr/bin/env node
/**
 * QMF 4.0 CLI — vanilla JS
 * qmf4 create app|module|service|component|plugin
 * qmf4 doctor | inspect | graph
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, cpSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runDoctor, inspectApp } from '@qmf/inspect';
import { loadContract } from '@qmf/contract';
import { renderApp, renderModule } from './templates.js';
import { createService, createComponent, migrateContract } from './scaffold-extra.js';
import { migrateEvents } from './migrate-events.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION = '4.0.0-alpha.1';

const args = process.argv.slice(2);
const cmd = args[0];
const sub = args[1];

function help() {
  console.log(`QMF CLI ${VERSION} (vanilla JS)

Usage:
  qmf4 create app <name>
  qmf4 create module <id>
  qmf4 create plugin <id>
  qmf4 create service <moduleId> <ServiceName>
  qmf4 create component <name>
  qmf4 migrate contract [--force] [appRoot]
  qmf4 migrate events [--write] [appRoot]
  qmf4 doctor [--strict] [appRoot]
  qmf4 inspect [modules|events|graph|summary] [appRoot]
  qmf4 graph [--format json|mermaid] [appRoot]
  qmf4 version
`);
}

function appRootFromArgs(startIndex) {
  const rest = args.slice(startIndex).filter((a) => !a.startsWith('-'));
  // skip values that belong to flags (e.g. --format mermaid)
  const skipValues = new Set();
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--format' && args[i + 1]) skipValues.add(args[i + 1]);
  }
  const candidates = rest.filter((a) => !skipValues.has(a));
  return resolve(candidates[0] ?? process.cwd());
}

function hasFlag(flag) {
  return args.includes(flag);
}

async function main() {
  if (!cmd || cmd === 'help' || cmd === '-h' || cmd === '--help') {
    help();
    process.exit(0);
  }

  if (cmd === 'version' || cmd === '-V' || cmd === '--version') {
    console.log(VERSION);
    process.exit(0);
  }

  if (cmd === 'doctor') {
    const root = appRootFromArgs(1);
    const result = runDoctor(root, { strict: hasFlag('--strict') });
    for (const f of result.findings) {
      const mark = f.level === 'error' ? '✗' : '⚠';
      console.log(`${mark} [${f.id}] ${f.message}`);
    }
    if (result.ok) console.log('✓ doctor passed');
    else console.log(`doctor failed (${result.errors.length} errors, ${result.warnings.length} warnings)`);
    process.exit(result.exitCode);
  }

  if (cmd === 'inspect') {
    const what = ['modules', 'events', 'graph', 'summary'].includes(sub) ? sub : 'summary';
    const root = appRootFromArgs(what === sub ? 2 : 1);
    const data = inspectApp(root);
    if (what === 'summary') console.log(JSON.stringify(data.contract), `\nmodules: ${data.modules.map((m) => m.id).join(', ')}\nevents: ${data.events.join(', ')}`);
    else if (what === 'modules') console.log(JSON.stringify(data.modules, null, 2));
    else if (what === 'events') console.log(JSON.stringify(data.events, null, 2));
    else if (what === 'graph') console.log(JSON.stringify(data.graph, null, 2));
    process.exit(0);
  }

  if (cmd === 'graph') {
    const root = appRootFromArgs(1);
    const format = hasFlag('--format') ? args[args.indexOf('--format') + 1] : 'json';
    const data = inspectApp(root);
    if (format === 'mermaid') {
      console.log('graph TD');
      for (const e of data.graph.edges) {
        console.log(`  ${e.to} --> ${e.from}`);
      }
      for (const m of data.graph.modules) {
        if (!(data.graph.edges ?? []).some((e) => e.from === m.id || e.to === m.id)) {
          console.log(`  ${m.id}`);
        }
      }
    } else {
      console.log(JSON.stringify(data.graph, null, 2));
    }
    process.exit(0);
  }

  if (cmd === 'create' && sub === 'app') {
    const name = args[2];
    if (!name || !/^[a-z][a-z0-9-]{1,63}$/.test(name)) {
      console.error('Usage: qmf4 create app <kebab-name>');
      process.exit(1);
    }
    const dest = resolve(process.cwd(), name);
    if (existsSync(dest)) {
      console.error(`Directory exists: ${dest}`);
      process.exit(1);
    }
    const files = renderApp(name);
    for (const [rel, content] of Object.entries(files)) {
      const fp = join(dest, rel);
      mkdirSync(dirname(fp), { recursive: true });
      writeFileSync(fp, content);
    }
    console.log(`✓ created app ${name}`);
    console.log(`  cd ${name} && node ../../packages/qmf-cli/src/cli.js doctor`);
    process.exit(0);
  }

  if (cmd === 'create' && (sub === 'module' || sub === 'plugin')) {
    const id = args[2];
    if (!id || !/^[a-z][a-z0-9-]{0,31}$/.test(id)) {
      console.error(`Usage: qmf4 create ${sub} <id>`);
      process.exit(1);
    }
    const root = process.cwd();
    const contractPath = join(root, 'qmf.schema.json');
    if (!existsSync(contractPath)) {
      console.error('No qmf.schema.json in cwd — run inside a QMF app');
      process.exit(1);
    }
    const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
    const modules = contract.modules ?? [];
    if (modules.some((m) => m.id === id)) {
      console.error(`Module already registered: ${id}`);
      process.exit(1);
    }

    const layers = contract.layers ?? {};
    const modulesDir = join(root, layers.modules ?? 'src/modules', id);
    const files = renderModule(id);
    for (const [rel, content] of Object.entries(files)) {
      const fp = join(modulesDir, rel);
      mkdirSync(dirname(fp), { recursive: true });
      writeFileSync(fp, content);
    }

    modules.push({
      id,
      path: id,
      manifest: 'manifest.json',
      enabled: true,
      lazy: false,
    });
    contract.modules = modules;
    writeFileSync(contractPath, JSON.stringify(contract, null, 2) + '\n');

    const result = runDoctor(root, { strict: true });
    if (!result.ok) {
      console.error('Created files but doctor failed — fix findings:');
      for (const f of result.findings) console.error(`  [${f.id}] ${f.message}`);
      process.exit(1);
    }
    console.log(`✓ created module ${id} and updated qmf.schema.json`);
    process.exit(0);
  }

  if (cmd === 'create' && sub === 'service') {
    const moduleId = args[2];
    const serviceName = args[3];
    if (!moduleId || !serviceName) {
      console.error('Usage: qmf4 create service <moduleId> <ServiceName>');
      process.exit(1);
    }
    const root = process.cwd();
    try {
      const r = createService(moduleId, serviceName, root);
      console.log(`✓ service ${r.className} (${r.token})`);
      const result = runDoctor(root, { strict: true });
      if (!result.ok) {
        for (const f of result.findings) console.error(`  [${f.id}] ${f.message}`);
        process.exit(1);
      }
      process.exit(0);
    } catch (e) {
      console.error(/** @type {Error} */ (e).message);
      process.exit(1);
    }
  }

  if (cmd === 'create' && sub === 'component') {
    const name = args[2];
    if (!name) {
      console.error('Usage: qmf4 create component <name>');
      process.exit(1);
    }
    try {
      const r = createComponent(name, process.cwd());
      console.log(`✓ component ${r.id} at ${r.dir}`);
      process.exit(0);
    } catch (e) {
      console.error(/** @type {Error} */ (e).message);
      process.exit(1);
    }
  }

  if (cmd === 'migrate' && sub === 'contract') {
    const root = appRootFromArgs(2);
    try {
      const c = migrateContract(root, { force: hasFlag('--force') });
      console.log(`✓ wrote qmf.schema.json (${c.modules.length} modules, eventBus=${c.eventBus})`);
      process.exit(0);
    } catch (e) {
      console.error(/** @type {Error} */ (e).message);
      process.exit(1);
    }
  }

  if (cmd === 'migrate' && sub === 'events') {
    const root = appRootFromArgs(2);
    try {
      const r = migrateEvents(root, { write: hasFlag('--write') });
      console.log(`found ${r.count} magic-string event(s)`);
      for (const ev of r.events) {
        console.log(`  - ${ev.name} (emit=${ev.emits}, on=${ev.ons})`);
      }
      if (r.written) console.log(`✓ wrote ${r.written}`);
      else if (r.count && !hasFlag('--write')) console.log('tip: re-run with --write to generate stubs');
      process.exit(0);
    } catch (e) {
      console.error(/** @type {Error} */ (e).message);
      process.exit(1);
    }
  }

  console.error(`Unknown command: ${args.join(' ')}`);
  help();
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
