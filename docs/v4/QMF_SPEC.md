# QMF_SPEC.md — Quizzman Modular Framework 4.0

**Name:** QMF (Quizzman Modular Framework)  
**Version:** 4.0.0  
**Type:** Modular frontend runtime (not a React framework)  
**CDN:** https://ui.quizzman.com/qmf/  
**Contract:** `qmf.schema.json`  
**Rules:** [AI_RULES.md](./AI_RULES.md)

---

## One-sentence definition

QMF is a layered, plugin-based frontend runtime with a machine-readable project contract so humans and AI agents build identical, introspectable applications.

---

## Core properties (deterministic)

1. **Vanilla JavaScript** — `.js` ESM/IIFE; no TS required (see LANGUAGE.md)  
2. Four layers: Foundation → Runtime → Component → Module  
3. React/Vue/Svelte are adapters only; core has zero JSX dependency  
4. Modules are plugins with manifests  
5. Events are named, versioned, JSON-Schema-validated  
6. `qmf.schema.json` is the single source of truth  
7. `QMF.inspect.*` answers architecture questions  
8. Official CLI is the standard authoring path  

---

## Package list

| Package | Layer |
|---------|-------|
| `@qmf/tokens` | Foundation |
| `@qmf/utils` | Foundation |
| `@qmf/contract` | Foundation |
| `@qmf/core` | Runtime |
| `@qmf/ui` | Component |
| `@qmf/cli` | Tooling |
| `@qmf/adapter-react` | Adapter (optional) |

---

## Entry APIs

```js
import { QMF } from '@qmf/core';

await QMF.initFromContract('./qmf.schema.json');
QMF.inspect.summary();
```

CDN (islands still supported for static pages; full contract apps prefer npm).

---

## Spec index

| Spec | Path |
|------|------|
| Architecture (public) | ARCHITECTURE.public.md |
| Architecture (internal) | ARCHITECTURE.internal.md |
| Contract | CONTRACT.md |
| Convention | CONVENTION.md |
| CLI | CLI_SPEC.md |
| Events | EVENT_SPEC.md |
| Modules | MODULE_SPEC.md |
| State | STATE_SPEC.md |
| Plugins | PLUGIN_SPEC.md |
| Introspection | INTROSPECTION.md |
| Migration | MIGRATION_v3_v4.md |
| Roadmap | ROADMAP.md |

---

## Compatibility

- QMF 3.x apps run via `eventBus: "legacy"` + compat layer during migration  
- QMF 4.0 typed mode is the default for new apps  

---

## Non-goals

VDOM replacement · React lock-in · Upward dependency exceptions  
