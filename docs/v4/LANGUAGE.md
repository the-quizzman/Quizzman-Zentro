# Language Policy — Vanilla JavaScript Canonical

**Status:** Hard rule for QMF 4.0  
**Supersedes:** Any earlier v4 draft that assumed TypeScript-first

---

## Rule

QMF **is** vanilla JavaScript (ES modules).

| Surface | Language |
|---------|----------|
| Runtime / CDN bundles | `.js` ESM + IIFE |
| App modules (`src/modules/**`) | `.js` only |
| CLI templates | generate `.js` |
| Specs / examples in `docs/v4` | `.js` |
| TypeScript | **Optional** consumer overlay — never required by core, CLI, or doctor |

**Never** require `tsc`, `.ts` sources, or Zod as a framework dependency for QMF apps.

---

## Why

1. Production delivery is CDN islands (`qmf.min.js`, header widgets) — plain JS.  
2. AI agents and static HTML apps must not need a TS toolchain.  
3. React/Vue adapters may use TS internally; **core and Module Layer stay JS**.  

---

## Typing (optional)

Use **JSDoc** when helpful:

```js
/**
 * @typedef {{ keyword: string, source: 'header'|'sidebar'|'api' }} DictionarySearchPayload
 */

/**
 * @param {DictionarySearchPayload} payload
 */
export function assertSearchPayload(payload) { /* ... */ }
```

No `.ts` / `.tsx` in Foundation, Runtime, Component, or Module layers.

---

## Validation (replace Zod-in-core)

| Concern | Mechanism |
|---------|-----------|
| Project contract | `qmf.schema.json` + JSON Schema meta |
| Module manifest | `module.manifest.schema.json` |
| Event payloads | JSON Schema fragment in `events.js` / `defineEvent({ schema })` |
| Module config | JSON Schema object in `config.js` + `QMF.validate(schema, data)` |

Implementation may use a small built-in validator or Ajv; apps must not depend on TypeScript types for safety.

---

## File extension convention

```
module.js  config.js  state.js  service.js  events.js  view.js  manifest.json
```

Doctor **fails** if it finds required module entry as `.ts` under strict vanilla mode (`ai.language: "js"` default).

---

## Package authoring note

Internal monorepo **may** author packages in TS **only if** published artifacts are plain `.js` and public docs/examples remain JS. App convention and AI_RULES stay JS-first.
