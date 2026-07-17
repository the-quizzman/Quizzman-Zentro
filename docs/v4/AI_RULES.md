# AI_RULES.md — Machine Rules for QMF 4.0 Agents

**Status:** Canonical · Deterministic  
**Audience:** Claude Code · Codex · Gemini CLI · Cursor · any coding agent  
**SSOT:** `qmf.schema.json`

---

## Meta Rules

| ID | Rule |
|----|------|
| AI-000 | Read `qmf.schema.json` before writing any file. If missing, run/emulate `qmf create app`. |
| AI-001 | Prefer `QMF.inspect.*` / manifests over parsing source for architecture facts. |
| AI-002 | Never introduce JSX/React/Vue/Svelte into Foundation, Runtime, or Component layers. |
| AI-002b | Canonical language is vanilla JS (`.js`). Do not scaffold `.ts` modules. JSDoc optional. No Zod requirement — use JSON Schema + `QMF.validate`. |
| AI-003 | Adapters are optional and declared only under `adapters` in the contract. |
| AI-004 | When `ai.strictConvention: true`, treat CONVENTION.md as hard errors. |
| AI-005 | When `ai.allowMagicEvents: false`, never emit/subscribe with raw strings. |
| AI-006 | Creating modules MUST update `qmf.schema.json` atomically with files. |
| AI-007 | Every public API change must update the matching `*_SPEC.md`. |
| AI-008 | Do not invent folder layouts. Use CONVENTION.md only. |
| AI-009 | After edits, ensure `qmf doctor` would pass (DOC-001…008). |

---

## Layer Rules

| ID | Rule |
|----|------|
| LYR-001 | Import direction: Foundation ← Runtime ← Component ← Module (down only). |
| LYR-002 | Modules must not import sibling modules, except `events.js` for typed event identity. |
| LYR-003 | Modules communicate via EventBus, ServiceContainer, or Runtime APIs only. |
| LYR-004 | No circular dependencies. |

---

## Module File Rules

| ID | Rule |
|----|------|
| MOD-001 | Path: `src/modules/<id>/` with id `^[a-z][a-z0-9-]{0,31}$`. |
| MOD-002 | Required files: module.js, config.js, state.js, service.js, events.js, view.js, manifest.json. |
| MOD-003 | Export `create<PascalId>Plugin` from module.js. |
| MOD-004 | Export `ConfigSchema` from config.js. |
| MOD-005 | Export `StateSchema` + `initialState` from state.js. |
| MOD-006 | Events use `defineEvent` in events.js. |
| MOD-007 | manifest.json validates against module.manifest.schema.json. |

---

## Event Rules

| ID | Rule |
|----|------|
| EVT-001 | Name pattern: `<namespace>.<action>`. |
| EVT-002 | Namespace equals owner module id (or `app`/`qmf`). |
| EVT-003 | Payload JSON Schema required. |
| EVT-004 | Manifest produces/consumes must match events.js. |
| EVT-005 | Breaking payload change → increment version. |

---

## CLI Rules

| ID | Rule |
|----|------|
| CLI-001 | Prefer `qmf create *` over hand-written scaffolds. |
| CLI-002 | Prefer `qmf doctor` as acceptance check. |
| CLI-003 | Prefer `qmf graph` / `qmf inspect` for architecture dumps. |

---

## Forbidden

| ID | Forbidden |
|----|-----------|
| FOR-001 | `src/features/`, `src/pages/` as module homes |
| FOR-002 | Upward imports |
| FOR-003 | Business logic in `src/components/` |
| FOR-004 | React inside `view.js` |
| FOR-005 | Multiple `qmf.schema.json` files |
| FOR-006 | Optional skipping of manifest |
| FOR-007 | **Reimplementing a QMF capability** (store, event bus, lifecycle, DI, bootstrap, `createElement`) as an “alternative” — treat as architecture error, not a valid choice |
| FOR-008 | App-level `CustomEvent` / homemade pubsub / parallel `let state` for cross-module communication when typed EventBus + ModuleStore exist |
| FOR-009 | Feature UI via large `innerHTML` string templates when `createElement` / `@qmf/ui` apply |
| FOR-010 | Second bootstrap path beside `bootstrapFromContract*` / `QMF.init`+`QMF.use` |

### Capability-forbid policy (agents)

Do **not** prompt only “use QMF”. Encode the negative space:

> If QMF already provides X, writing your own X is a **defect**.

Workflow before any new primitive:

1. Read `qmf.schema.json` + matching `*_SPEC.md`.
2. If the capability exists → call the QMF API.
3. If the contract sets it to `null` (e.g. `router`) → thin adapter only, still emit/subscribe on the QMF bus; replace when QMF ships it.
4. Never introduce a parallel framework slice “just for this app”.

---

## Generation Algorithm (mandatory)

```
1. Load qmf.schema.json (or create app)
2. Load all manifests → build mental graph
3. Plan change (module/event/service)
4. If new module: create 7 files + patch schema
5. If new event: events.js + manifest + subscribers
6. Verify doctor checklist
7. Update specs only if public API changed
```

---

## Ambiguity Policy

If two interpretations exist, choose the one that:

1. Satisfies `qmf.schema.json`  
2. Satisfies CONVENTION.md  
3. Minimizes files touched  
4. Preserves downward imports  

Never ask for a custom structure.  
