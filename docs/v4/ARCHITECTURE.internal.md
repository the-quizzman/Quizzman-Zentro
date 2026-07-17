# QMF Architecture Guide (Internal — Confidential)

**Version:** 4.0.0  
**Audience:** Quizzman engineering · framework maintainers  
**Companion:** [ARCHITECTURE.md](./ARCHITECTURE.md) (full proposal)

---

## Overview

QMF 4.0 evolves the v3 4-layer monorepo into an AI-first runtime with a project contract (`qmf.schema.json`), typed events, module manifests, and a stable introspection API.

Preserve v3 performance wins: store batching (rAF), EventBus wildcard cache, parallel plugin resolve.

---

## Layer packages (internal)

### Foundation

- `@qmf/tokens` — CSS custom properties + TS constants  
- `@qmf/utils` — logger, DOM, mobile-detect, meta-manager  
- `@qmf/contract` — **new** — load/validate `qmf.schema.json` + manifests  

### Runtime (`@qmf/core`)

- EventBus → Typed registry (`@qmf/core/events`)  
- Store / ModuleStore (JSON Schema)  
- DIContainer  
- PluginLoader + Lifecycle + ErrorBoundary  
- InspectEngine (`QMF.inspect`)  
- Compat layer for v3 (`eventBus: "legacy"`)  

### Component (`@qmf/ui`)

Imperative factories only. No JSX.

### Modules

Ship as `@qmf/*` packages and/or app-local `src/modules/*`.

---

## Contract bootstrap (internal sequence)

```
loadContract → validateMetaSchema → loadManifests
→ buildDAG → registerEvents → registerServices
→ plugin.init (eager) → mark ready → expose inspect
→ lazy modules on demand
```

---

## Import boundary enforcement

ESLint plugin `@qmf/eslint-plugin` + `qmf doctor` DOC-006.

---

## CDN dual surface (known risk)

v3 had dual `_src` modules vs packages. v4 rule:

- **Source of truth:** packages monorepo  
- CDN build emits from packages + app contract digest  
- Island scripts remain for static HTML but must not diverge APIs  

---

## Security

- Inspect redacts `/token|password|secret|authorization/i`  
- SRI remain on CDN artifacts  
- Permissions in manifests reserved for authz hooks  

---

## Testing gates

| Gate | Command |
|------|---------|
| Unit | `pnpm test` |
| Doctor | `qmf doctor --strict` |
| Boundaries | ESLint |
| Bundle | `pnpm bundle:check` |

---

## Related internal docs

CONTRACT · CONVENTION · EVENT_SPEC · MODULE_SPEC · INTROSPECTION · ROADMAP  
