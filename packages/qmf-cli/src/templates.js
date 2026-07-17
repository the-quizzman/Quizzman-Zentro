/**
 * Vanilla JS templates for qmf4 create *
 */

/**
 * @param {string} name
 */
export function renderApp(name) {
  const pascal = toPascal(name);
  return {
    'qmf.schema.json': JSON.stringify(
      {
        framework: 'QMF',
        version: '4.0.0',
        name,
        language: 'js',
        layers: {
          foundation: 'src/foundation',
          runtime: 'src/runtime',
          components: 'src/components',
          modules: 'src/modules',
        },
        modules: [],
        eventBus: 'typed',
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
      },
      null,
      2,
    ) + '\n',
    'package.json': JSON.stringify(
      {
        name,
        version: '0.1.0',
        private: true,
        type: 'module',
        scripts: {
          doctor: 'qmf4 doctor --strict',
          inspect: 'qmf4 inspect summary',
        },
      },
      null,
      2,
    ) + '\n',
    'src/foundation/index.js': `/** Foundation extensions for ${name} */\nexport const APP_ID = '${name}';\n`,
    'src/runtime/bootstrap.js': `/**
 * Bootstrap ${pascal} from qmf.schema.json
 */
import { bootstrapFromContract } from '@qmf/runtime';

bootstrapFromContract(new URL('../../qmf.schema.json', import.meta.url)).catch((err) => {
  console.error('[QMF] bootstrap failed', err);
  throw err;
});
`,
    'src/components/.gitkeep': '',
    'src/modules/.gitkeep': '',
    'README.md': `# ${name}

QMF 4.0 vanilla JS app.

\`\`\`bash
qmf4 doctor --strict
qmf4 create module auth
\`\`\`
`,
  };
}

/**
 * @param {string} id
 */
export function renderModule(id) {
  const pascal = toPascal(id);
  const pluginName = `create${pascal}Plugin`;

  return {
    'config.js': `/** JSON Schema config for ${id} */
export const ConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean', default: true },
  },
};
`,
    'state.js': `import { createModuleStore } from '@qmf/runtime';

export const StateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ready'],
  properties: {
    ready: { type: 'boolean' },
  },
};

export const initialState = { ready: false };

export function create${pascal}Store() {
  return createModuleStore('${id}', initialState, StateSchema);
}
`,
    'service.js': `export const ${id.toUpperCase().replace(/-/g, '_')}_TOKEN = 'svc:${id}.main';

export class ${pascal}Service {
  constructor() {}
  ping() { return 'ok'; }
}

export function register${pascal}Services(ctx) {
  ctx.container.registerFactory(${id.toUpperCase().replace(/-/g, '_')}_TOKEN, () => new ${pascal}Service());
}
`,
    'events.js': `import { defineEvent } from '@qmf/events';

export const ${pascal}ReadyPayload = {
  type: 'object',
  additionalProperties: false,
  required: ['ok'],
  properties: {
    ok: { type: 'boolean' },
  },
};

export const ${pascal}Ready = defineEvent({
  name: '${id}.ready',
  namespace: '${id}',
  version: 1,
  description: 'Emitted when ${id} module is ready.',
  payload: ${pascal}ReadyPayload,
  producers: ['${id}'],
  consumers: [],
});
`,
    'view.js': `import { createElement } from '@qmf/runtime/dom';

export function create${pascal}View() {
  let root = null;
  return {
    /** @param {HTMLElement} el */
    mount(el) {
      root = el;
      root.appendChild(createElement('div', { className: 'qmf-${id}' }, ['${pascal}']));
    },
    unmount() {
      root?.replaceChildren();
      root = null;
    },
  };
}
`,
    'module.js': `import { validate } from '@qmf/contract';
import { emit } from '@qmf/events';
import { ConfigSchema } from './config.js';
import { create${pascal}Store } from './state.js';
import { register${pascal}Services } from './service.js';
import { ${pascal}Ready } from './events.js';
import { create${pascal}View } from './view.js';

/**
 * @param {Record<string, unknown>} [raw]
 */
export function ${pluginName}(raw = {}) {
  const result = validate(ConfigSchema, { enabled: true, ...raw }, { applyDefaults: true });
  if (!result.ok) throw new Error(result.errors.join('; '));
  const config = result.data;
  const store = create${pascal}Store();
  const view = create${pascal}View();

  return {
    name: '${id}',
    version: '1.0.0',
    async setup(ctx) {
      register${pascal}Services(ctx);
    },
    hooks: {
      async onMount(ctx) {
        const el = ctx.root ?? document.querySelector('#qmf-${id}');
        if (el instanceof HTMLElement) view.mount(el);
      },
      async onReady() {
        store.setState({ ready: true });
        emit(${pascal}Ready, { ok: true });
      },
      async onDestroy() {
        view.unmount();
      },
    },
  };
}
`,
    'manifest.json': JSON.stringify(
      {
        name: id,
        version: '1.0.0',
        description: `${pascal} module`,
        layer: 'module',
        dependencies: [],
        services: [
          {
            id: 'main',
            token: `svc:${id}.main`,
            file: 'service.js',
            singleton: true,
          },
        ],
        events: {
          produces: [{ name: `${id}.ready`, version: 1, schema: `${pascal}ReadyPayload` }],
          consumes: [],
        },
        states: [
          {
            id,
            file: 'state.js',
            schema: 'StateSchema',
            scope: 'module',
          },
        ],
        permissions: [],
        exports: { plugin: 'module.js', public: [] },
        configSchema: 'ConfigSchema',
        lifecycle: ['onMount', 'onReady', 'onDestroy'],
        entry: 'module.js',
        files: {
          module: 'module.js',
          config: 'config.js',
          state: 'state.js',
          service: 'service.js',
          events: 'events.js',
          view: 'view.js',
          manifest: 'manifest.json',
        },
      },
      null,
      2,
    ) + '\n',
  };
}

/** @param {string} kebab */
function toPascal(kebab) {
  return kebab
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}
