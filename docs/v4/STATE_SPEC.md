# STATE_SPEC — QMF 4.0 State Management

**Status:** Canonical  
**Runtime:** `@qmf/core` Store · ModuleStore

---

## Purpose

Deterministic, schema-validated state with clear module vs global boundaries.

---

## Rules

1. Every module state lives in `state.js` with `StateSchema` (JSON Schema).  
2. Default scope: `module` (isolated).  
3. Global store keys reserved: `user` · `theme` · `language` · `appId` · `channel`.  
4. Updates via `setState(partial)` only; batched with `requestAnimationFrame` (v3 perf preserved).  
5. `watch(selector, cb)` for reactions — no silent polling.  

---

## API

```js
const store = createModuleStore('dictionary', initialState, StateSchema);

store.getState();
store.setState({ query: '学' });
store.flushState(); // sync flush when needed
const off = store.watch(s => s.query, (next, prev) => { /* ... */ });
```

Global:

```js
QMF.store.getState();
QMF.store.setState({ theme: 'dark' });
```

---

## Manifest

```json
"states": [{ "id": "dictionary", "file": "state.js", "schema": "StateSchema", "scope": "module" }]
```

---

## Anti-Patterns

- Mutating `getState()` result in place  
- Cross-module store imports  
- Storing secrets in state without redaction policy  

---

## Migration

v3 `QMF.store` remains; add JSON Schemas where missing. Module-local inventories move into `state.js`.

---

## Performance

Batching preserved from QMF 3.x hotfix. Prefer selectors that return primitives/stable refs.

---

## AI Notes

Always generate `StateSchema` + `initialState` + `createXStore()`. Register in manifest.  
