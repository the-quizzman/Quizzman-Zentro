# Initiative 1 — Project Convention

**Status:** QMF 4.0 Canonical  
**Depends on:** [CONTRACT.md](./CONTRACT.md)  
**Enforced by:** `qmf doctor` when `ai.strictConvention: true`

---

## Purpose

Deterministic structure so any AI agent generates **identical** layouts for the same intent.

No optional layouts. No creative folder names.

---

## Architecture

```
src/
├── foundation/     # Layer 0 extensions (optional files, fixed path)
├── runtime/        # bootstrap.js only (+ optional local runtime hooks)
├── components/     # shared UI (imperative)
└── modules/
    └── <id>/       # exactly 7 files (see module convention)
```

Layer paths MUST match `qmf.schema.json → layers`.

---

## Module Convention

### Path

```
src/modules/<id>/
```

`<id>`: `^[a-z][a-z0-9-]{0,31}$`

### Required files (exactly these names)

| File | Role |
|------|------|
| `module.js` | `createXxxPlugin()` + lifecycle wiring |
| `config.js` | `ConfigSchema` (JSON Schema object) |
| `state.js` | `StateSchema` (JSON Schema) + `createStore()` |
| `service.js` | services + DI registration |
| `events.js` | named event defs (produce/consume) |
| `view.js` | imperative DOM view factory |
| `manifest.json` | machine metadata |

**Language:** vanilla JS only. See [LANGUAGE.md](./LANGUAGE.md). No `.ts` in modules.

Optional: `styles.css` (must be listed in manifest `exports.public` if shipped).

Forbidden: `index.js` as sole entry, `helpers.js` dumping mixed concerns, nested `components/` inside module (use `src/components/` or keep private factories inside `view.js`).

### Example

```
src/modules/auth/
├── module.js
├── config.js
├── state.js
├── service.js
├── events.js
├── view.js
└── manifest.json
```

---

## Service Convention

### Location

Always `service.js` inside the owning module.

### Naming

| Kind | Pattern | Example |
|------|---------|---------|
| Class | `<Name>Service` | `AuthService` |
| DI token | `'svc:<module>.<name>'` | `'svc:auth.session'` |
| Factory | `create<Name>Service(ctx)` | `createAuthService(ctx)` |

### Rules

1. Services are registered in `module.js` `setup(ctx)` via `ctx.container`.  
2. Services MUST NOT import other modules.  
3. Cross-module needs → EventBus or public Runtime API.  
4. One primary service file; multiple classes allowed, each with unique token.

### Example

```js
// service.js
import type { PluginContext } from '@qmf/core';

export const AUTH_SESSION_TOKEN = 'svc:auth.session' as const;

export class AuthService {
  constructor(private http: { get: (u: string) => Promise<unknown> }) {}
  me() { return this.http.get('/api/auth/me'); }
}

export function registerAuthServices(ctx: PluginContext) {
  ctx.container.registerFactory(AUTH_SESSION_TOKEN, (c) => {
    const http = c.resolve('http');
    return new AuthService(http);
  });
}
```

---

## Event Convention

### Name

```
<namespace>.<action>
```

- `namespace` = module id (or shared `qmf` / `app`)  
- `action` = camelCase or dotted verb (`search`, `session.changed`)  
- Full regex: `^[a-z][a-z0-9-]*\.[a-z][a-z0-9A-Z.]*$`

### File

All module events live in `events.js` using `defineEvent(...)`.

### Rules

1. No magic strings at emit/subscribe sites — import the event const.  
2. Payload MUST have JSON Schema.  
3. Manifest lists produces/consumes.  
4. Version integer starts at 1; breaking change → version++ and migrate.

### Example

```js
import { defineEvent } from '@qmf/core/events';

export const AuthSessionChanged = defineEvent({
  name: 'auth.session.changed',
  namespace: 'auth',
  version: 1,
  description: 'Emitted when user session becomes available or cleared.',
  payload: {
    type: 'object',
    required: ['userId', 'tier'],
    properties: {
      userId: { type: ['string', 'null'] },
      tier: {
        type: ['string', 'null'],
        enum: ['free', 'basic', 'pro', 'premium', 'admin', null],
      },
    },
  },
  producers: ['auth'],
  consumers: ['dictionary', 'settings'],
});
```

---

## State Convention

### File

`state.js` only.

### Rules

1. Export `StateSchema` (JSON Schema) and `initialState`.  
2. Use `createModuleStore(moduleId, initialState, StateSchema)`.  
3. Default scope = `module`. Global only for auth/theme/language via Runtime.  
4. Never mutate state in place — `setState` partials only.

### Example

```js
import { createModuleStore } from '@qmf/core';

export const StateSchema = {
  type: 'object',
  required: ['ready', 'error'],
  properties: {
    ready: { type: 'boolean' },
    error: { type: ['string', 'null'] },
  },
};

export const initialState = { ready: false, error: null };

export function createAuthStore() {
  return createModuleStore('auth', initialState, StateSchema);
}
```

---

## Config Convention

### File

`config.js` only.

### Rules

1. Export `ConfigSchema` (JSON Schema object).  
2. Put defaults in schema `default` fields; apply via `QMF.validate(schema, raw)`.  
3. Invalid config → `QMFConfigError` at init (fail fast).  
4. Manifest `configSchema` field = `"ConfigSchema"`.

### Example

```js

export const ConfigSchema = {
  type: 'object',
  properties: {
    brandName: { type: 'string', default: 'QuizzMan' },
    showChat: { type: 'boolean', default: false },
  },
};
```

---

## Lifecycle Convention

### Phases (ordered, mandatory names)

```
created → initializing → initialized
→ mounting → mounted
→ connecting → connected
→ ready
→ destroying → destroyed
```

### Hooks allowed in `module.js`

```
onBeforeInit | onInit | onAfterInit
onBeforeMount | onMount | onAfterMount
onBeforeConnect | onConnect | onAfterConnect
onReady
onBeforeDestroy | onDestroy
```

### Rules

1. DOM attachment only in `onMount` / `view.js`.  
2. Network / WS only in `onConnect`.  
3. Cleanup MUST be in `onDestroy` (unsubscribe, unmount, clear timers).  
4. Manifest `lifecycle` array lists implemented hooks only.

### Example

```js
export function createAuthPlugin(config: Config) {
  return {
    name: 'auth',
    hooks: {
      async onInit(ctx) { /* validate config, register services */ },
      async onMount(ctx) { /* view.mount(ctx.root) */ },
      async onConnect(ctx) { /* session fetch */ },
      async onReady() { /* emit auth.session.changed */ },
      async onDestroy(ctx) { /* view.unmount(); off events */ },
    },
  };
}
```

---

## Dependency Flow Convention

```
foundation → runtime → components → modules
```

ESLint boundary rules (required in app template):

- `modules/*` cannot import `modules/*` (sibling) **except** `events.js` (typed event identity only)  
- `modules/*` MUST NOT import sibling `service.js` / `state.js` / `view.js` / `module.js` / `config.js`  
- `components/*` cannot import `modules/*` or `runtime/*` internals  
- `runtime/*` cannot import `components/*` or `modules/*`  

---

## Migration Notes

| v3 habit | v4 rule |
|----------|---------|
| Free-form helpers folders | Fold into service/view or foundation |
| `index.js` module entry | `module.js` + manifest |
| Mix CSS/JS anywhere | `view.js` + optional `styles.css` |
| Emit `'user:changed'` strings | `defineEvent` + import const |

---

## Implementation Roadmap

| Step | Work |
|------|------|
| 1.1 | Codify rules in `qmf doctor` |
| 1.2 | ESLint plugin `@qmf/eslint-plugin` boundaries |
| 1.3 | CLI templates match this file exactly |
| 1.4 | AI_RULES.md cite each rule id |

---

## Anti-Patterns

| Anti-pattern | Fix |
|--------------|-----|
| `src/features/auth` | `src/modules/auth` |
| Shared `utils` between modules with business logic | EventBus / service in owner module |
| Optional skipping of `events.js` | Always generate (empty exports allowed only if no events + manifest empty arrays) |
| React components in `view.js` | Use `@qmf/adapter-react` outside module |

---

## Performance

Deterministic trees improve cold start caching and allow parallel module parse. Manifest-first loading avoids scanning directories at runtime.

---

## AI Generation Notes

- Rule ID prefix: `CONV-*` (see AI_RULES.md).  
- Always emit all 7 module files.  
- Never ask user for “preferred structure” — structure is fixed.  
- After generation, run mental `qmf doctor` checklist.  
