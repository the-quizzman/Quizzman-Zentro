/**
 * CLI helpers: create service / component / migrate
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * @param {string} moduleId
 * @param {string} serviceName PascalCase without Service suffix
 * @param {string} appRoot
 */
export function createService(moduleId, serviceName, appRoot) {
  const contractPath = join(appRoot, 'qmf.schema.json');
  const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  const mod = (contract.modules ?? []).find((m) => m.id === moduleId);
  if (!mod) throw new Error(`Module not in contract: ${moduleId}`);

  const modulesRoot = join(appRoot, contract.layers?.modules ?? 'src/modules');
  const dir = join(modulesRoot, mod.path ?? moduleId);
  const serviceFile = join(dir, 'service.js');
  const manifestFile = join(dir, 'manifest.json');
  if (!existsSync(serviceFile)) throw new Error(`Missing ${serviceFile}`);

  const className = `${serviceName}Service`;
  const token = `svc:${moduleId}.${serviceName.charAt(0).toLowerCase()}${serviceName.slice(1)}`;
  const tokenConst = `${moduleId.toUpperCase().replace(/-/g, '_')}_${serviceName.toUpperCase()}_TOKEN`;

  const snippet = `

export const ${tokenConst} = '${token}';

export class ${className} {
  constructor() {}
  ping() { return 'ok'; }
}
`;

  let src = readFileSync(serviceFile, 'utf8');
  if (src.includes(tokenConst)) {
    throw new Error(`Service token already exists: ${tokenConst}`);
  }
  src += snippet;
  writeFileSync(serviceFile, src);

  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  manifest.services = manifest.services ?? [];
  if (manifest.services.some((s) => s.token === token)) {
    throw new Error(`Manifest already has ${token}`);
  }
  manifest.services.push({
    id: serviceName.charAt(0).toLowerCase() + serviceName.slice(1),
    token,
    file: 'service.js',
    singleton: true,
  });
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');

  return { token, className, serviceFile };
}

/**
 * @param {string} name kebab or camel
 * @param {string} appRoot
 */
export function createComponent(name, appRoot) {
  const id = name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error(`Invalid component name: ${name}`);

  const contractPath = join(appRoot, 'qmf.schema.json');
  if (!existsSync(contractPath)) throw new Error('No qmf.schema.json');
  const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  const componentsRoot = join(appRoot, contract.layers?.components ?? 'src/components');
  const dir = join(componentsRoot, id);
  if (existsSync(join(dir, 'component.js'))) throw new Error(`Component exists: ${id}`);

  mkdirSync(dir, { recursive: true });
  const pascal = id
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');

  writeFileSync(
    join(dir, 'component.js'),
    `import { createElement } from '@qmf/runtime/dom';

/**
 * Imperative component: ${pascal}
 * @param {{ label?: string }} [props]
 */
export function create${pascal}(props = {}) {
  const el = createElement('button', { className: 'qmf-${id}', type: 'button' }, [
    props.label ?? '${pascal}',
  ]);
  return {
    el,
    /** @param {HTMLElement} root */
    mount(root) { root.appendChild(el); },
    unmount() { el.remove(); },
  };
}
`,
  );
  writeFileSync(
    join(dir, 'styles.css'),
    `.qmf-${id} {
  font: inherit;
  cursor: pointer;
}
`,
  );
  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify(
      {
        name: id,
        version: '1.0.0',
        layer: 'component',
        entry: 'component.js',
        styles: 'styles.css',
      },
      null,
      2,
    ) + '\n',
  );

  return { id, dir };
}

/**
 * Generate qmf.schema.json from a modules directory heuristic.
 * @param {string} appRoot
 * @param {{ name?: string, force?: boolean }} [opts]
 */
export function migrateContract(appRoot, opts = {}) {
  const dest = join(appRoot, 'qmf.schema.json');
  if (existsSync(dest) && !opts.force) {
    throw new Error('qmf.schema.json already exists (use --force)');
  }

  const modulesDir = join(appRoot, 'src/modules');
  /** @type {Array<{id:string,path:string,manifest:string,enabled:boolean,lazy:boolean}>} */
  const modules = [];

  if (existsSync(modulesDir)) {
    for (const name of readdirSync(modulesDir)) {
      const p = join(modulesDir, name);
      if (!statSync(p).isDirectory()) continue;
      if (!existsSync(join(p, 'manifest.json')) && !existsSync(join(p, 'module.js'))) continue;
      modules.push({
        id: name,
        path: name,
        manifest: 'manifest.json',
        enabled: true,
        lazy: false,
      });
    }
  }

  let pkgName = opts.name;
  if (!pkgName && existsSync(join(appRoot, 'package.json'))) {
    pkgName = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8')).name?.replace(
      /^@.*\//,
      '',
    );
  }
  pkgName = String(pkgName ?? 'qmf-app')
    .replace(/[^a-z0-9-]/gi, '-')
    .toLowerCase();

  const contract = {
    framework: 'QMF',
    version: '4.0.0',
    name: pkgName,
    language: 'js',
    layers: {
      foundation: 'src/foundation',
      runtime: 'src/runtime',
      components: 'src/components',
      modules: 'src/modules',
    },
    modules,
    eventBus: 'legacy',
    manifest: 'v1',
    router: null,
    componentModel: 'imperative',
    adapters: { react: null, vue: null, svelte: null },
    ai: {
      strictConvention: true,
      requireManifest: true,
      allowImperativeDOM: true,
      allowMagicEvents: false,
      requireSchemaBeforeWrite: true,
    },
    build: { target: 'es2020', cdn: false, sri: true },
    inspect: { enabled: true, exposeGlobal: true },
  };

  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, JSON.stringify(contract, null, 2) + '\n');
  return contract;
}
