# QMF 4.0 — Full Architecture Proposal

**Version:** 4.0.0  
**Status:** Production-ready specification  
**Supersedes:** QMF 3.x runtime patterns (compat preserved)  
**SSOT:** [`qmf.schema.json`](./CONTRACT.md)

---

## 1. Purpose

Evolve QMF v3.x into an **AI-first modular frontend runtime** without redesigning the layer model.

QMF is **vanilla JavaScript** (ES modules + CDN IIFE). See [LANGUAGE.md](./LANGUAGE.md).

QMF is **not** a React framework and **not** a TypeScript framework. React / Vue / Svelte are **adapters only**. TypeScript is optional for consumers, never required by core.

Every architectural decision must improve:

1. discoverability  
2. consistency  
3. introspection  
4. code generation  
5. automated refactoring  

---

## 2. Layer Model (unchanged principle, renamed for clarity)

```
┌─────────────────────────────────────────────┐
│              Module Layer                    │  business features
│         (auth · dictionary · settings)       │
├─────────────────────────────────────────────┤
│            Component Layer                   │  reusable UI primitives
│         (button · modal · toast · panel)     │
├─────────────────────────────────────────────┤
│             Runtime Layer                    │  was @qmf/core in v3
│  event-bus · store · di · plugin · inspect   │
├─────────────────────────────────────────────┤
│           Foundation Layer                   │
│         tokens · utils · contract            │
└─────────────────────────────────────────────┘
```

### Import rules (hard)

| Layer | May import |
|-------|------------|
| Foundation | nothing above |
| Runtime | Foundation only |
| Component | Foundation only |
| Module | Foundation + Runtime + Component |

- Never upward dependency  
- Never circular dependency  
- Never couple business modules together  

Modules communicate **only** through:

- Typed EventBus  
- ServiceContainer (DI)  
- Runtime APIs (`QMF.*` / `QMF.inspect.*`)  

### v3 → v4 name map

| v3 | v4 |
|----|-----|
| Layer 0 Foundation (`@qmf/tokens`, `@qmf/utils`) | Foundation |
| Layer 1 Core (`@qmf/core`) | Runtime |
| Layer 2 UI Kit (`@qmf/ui`) | Component |
| Layer 3 Modules | Module |

---

## 3. Package Map

| Package | Layer | Role |
|---------|-------|------|
| `@qmf/tokens` | Foundation | Design tokens |
| `@qmf/utils` | Foundation | DOM / logger / helpers |
| `@qmf/contract` | Foundation | `qmf.schema.json` loader + validators |
| `@qmf/core` | Runtime | EventBus, Store, DI, PluginLoader, Inspect |
| `@qmf/ui` | Component | Imperative UI primitives |
| `@qmf/cli` | Tooling | Official CLI |
| `@qmf/header` etc. | Module | Ship as packages OR app-local modules |
| `@qmf/adapter-react` | Adapter (outside layers) | Optional React bridge |

**Constraint:** No JSX / React / Vue import inside Foundation, Runtime, or Component packages.

---

## 4. Initiatives Overview

| # | Initiative | Doc |
|---|------------|-----|
| 0 | Project Contract (`qmf.schema.json`) | [CONTRACT.md](./CONTRACT.md) |
| 1 | Project Convention | [CONVENTION.md](./CONVENTION.md) |
| 2 | Official CLI | [CLI_SPEC.md](./CLI_SPEC.md) |
| 3 | Typed Event System | [EVENT_SPEC.md](./EVENT_SPEC.md) |
| 4 | Module Manifest | [MODULE_SPEC.md](./MODULE_SPEC.md) |
| 5 | AI Introspection Layer | [INTROSPECTION.md](./INTROSPECTION.md) |

Supporting specs: [STATE_SPEC.md](./STATE_SPEC.md) · [PLUGIN_SPEC.md](./PLUGIN_SPEC.md) · [AI_RULES.md](./AI_RULES.md) · [QMF_SPEC.md](./QMF_SPEC.md)

---

## 5. Canonical App Folder Structure

```
my-app/
├── qmf.schema.json
├── package.json
├── tsconfig.json
├── src/
│   ├── foundation/           # app-local foundation extensions (optional)
│   │   └── index.js
│   ├── runtime/              # app bootstrap only
│   │   └── bootstrap.js
│   ├── components/           # app-local components (optional)
│   │   └── .gitkeep
│   └── modules/
│       └── <module-id>/
│           ├── module.js     # plugin factory + lifecycle
│           ├── config.js     # JSON Schema ConfigSchema
│           ├── state.js      # JSON Schema state + store factory
│           ├── service.js    # DI-registered services
│           ├── events.js     # typed event definitions
│           ├── view.js       # imperative DOM view
│           └── manifest.json # machine metadata
├── docs/                     # generated AI docs (optional)
└── dist/
```

**No optional layouts.** When `ai.strictConvention: true`, missing required files = doctor error.

---

## 6. Runtime Bootstrap Sequence

```js
import { QMF } from '@qmf/core';
import { loadContract } from '@qmf/contract';

const contract = await loadContract(new URL('../qmf.schema.json', import.meta.url));

await QMF.bootstrap({
  contract,
  // optional overrides — must not contradict contract.ai
});

// Equivalent short form:
await QMF.initFromContract('./qmf.schema.json');
```

Internal steps:

1. Validate contract  
2. Load manifests  
3. Build dependency DAG  
4. Register events + services  
5. Init plugins (eager then lazy)  
6. Mount inspect API  

---

## 7. Communication Model

```
Module A ──emit──► TypedEventBus ──subscribe──► Module B
Module A ──resolve──► ServiceContainer ──► Service X
AI / DevTools ──► QMF.inspect.* ──► graph from contract+manifests
```

Forbidden:

- `import` from `modules/auth` into `modules/dictionary`  
- Shared mutable globals outside Runtime store  
- Magic string events when `eventBus: "typed"`  

---

## 8. Adapters (non-core)

```
@qmf/adapter-react   → wraps modules as React components
@qmf/adapter-vue
@qmf/adapter-svelte
```

Adapters:

- May use JSX  
- Must not be imported by `@qmf/core`  
- Declared only under `qmf.schema.json → adapters`  

---

## 9. Quality Bar (every public API)

Each API in this initiative set documents:

1. purpose  
2. example  
3. anti-pattern  
4. migration  
5. performance considerations  
6. AI generation notes  

---

## 10. Deliverable Index

| # | Deliverable | Path |
|---|-------------|------|
| 1 | Architecture proposal | this file |
| 2 | Folder structure | §5 + CONVENTION.md |
| 3 | CLI specification | CLI_SPEC.md |
| 4 | Event specification | EVENT_SPEC.md |
| 5 | Manifest specification | MODULE_SPEC.md |
| 6 | Runtime introspection API | INTROSPECTION.md |
| 7 | AI documentation | AI_RULES.md + specs |
| 8 | Migration guide | MIGRATION_v3_v4.md |
| 9 | Example application | examples/app/ |
| 10 | Example module | examples/app/src/modules/dictionary/ |
| 11 | Example plugin | examples/app/src/modules/auth/ |
| 12 | Example service | examples/app/src/modules/auth/service.js |
| 13 | Example AI workflow | examples/ai-workflow/ |
| 14 | Future roadmap | ROADMAP.md |

---

## 11. Non-Goals (4.0)

- Replacing React for complex SPA page trees  
- Shipping a full VDOM  
- Breaking CDN island consumers without compat  
- Allowing upward imports “for convenience”  

---

## 12. Success Criteria

| Metric | Target |
|--------|--------|
| AI creates valid module without reading existing apps | ≥ 95% with CLI + schema |
| `qmf doctor` catches convention violations | 100% of rules in CONVENTION.md |
| Inspect answers architecture questions | no source parse required |
| v3 app migrates via compat | ≤ 1 day for mid-size app |

---

*© 2026 Quizzman Engineering · QMF 4.0 Specification*
