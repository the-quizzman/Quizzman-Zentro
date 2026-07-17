# Initiative 4 — Module Manifest (`MODULE_SPEC`)

**Status:** QMF 4.0 Canonical  
**Format:** `manifest` = `v1` in contract  
**JSON Schema:** [`schemas/module.manifest.schema.json`](./schemas/module.manifest.schema.json)

---

## Purpose

Every module exposes machine-readable metadata so AI agents understand an application **without parsing source**.

---

## Architecture

```
qmf.schema.json
    modules[].manifest → modules/<id>/manifest.json
                              │
                              ├─ services / events / states
                              ├─ configSchema / lifecycle
                              └─ dependencies → DAG for PluginLoader
```

Build integration:

- `qmf build` embeds manifests into `dist/qmf-manifests.json`  
- Runtime can load manifests without shipping full TS  

---

## Manifest Specification (v1)

### Required fields

| Field | Type | Rule |
|-------|------|------|
| `name` | string | = module id |
| `version` | semver | module-local version |
| `layer` | `"module"` | const |
| `dependencies` | array | other modules or packages |
| `services` | array | DI tokens |
| `events` | `{produces,consumes}` | typed event refs |
| `states` | array | store schemas |
| `exports` | object | plugin entry |
| `configSchema` | string | schema export name |
| `lifecycle` | string[] | implemented hooks |

### Optional

`description` · `permissions` · `entry` · `files`

### Example

```json
{
  "name": "dictionary",
  "version": "1.0.0",
  "description": "Dictionary search and entry viewing.",
  "layer": "module",
  "dependencies": [
    { "name": "auth", "version": "^1.0.0", "optional": false }
  ],
  "services": [
    {
      "id": "search",
      "token": "svc:dictionary.search",
      "file": "service.js",
      "singleton": true
    }
  ],
  "events": {
    "produces": [
      { "name": "dictionary.search", "version": 1, "schema": "DictionarySearchPayload" }
    ],
    "consumes": [
      { "name": "auth.session.changed", "version": 1, "schema": "AuthSessionChangedPayload" }
    ]
  },
  "states": [
    {
      "id": "dictionary",
      "file": "state.js",
      "schema": "StateSchema",
      "scope": "module"
    }
  ],
  "permissions": ["dict:read", "dict:write"],
  "exports": {
    "plugin": "module.js",
    "public": ["styles.css"]
  },
  "configSchema": "ConfigSchema",
  "lifecycle": ["onInit", "onMount", "onConnect", "onReady", "onDestroy"],
  "entry": "module.js",
  "files": {
    "module": "module.js",
    "config": "config.js",
    "state": "state.js",
    "service": "service.js",
    "events": "events.js",
    "view": "view.js",
    "manifest": "manifest.json"
  }
}
```

---

## Validation

1. JSON Schema validation (CLI + runtime)  
2. Cross-check: every `events.produces[].name` exists in `events.js`  
3. Cross-check: dependency names exist in contract `modules[]` or are `@qmf/*`  
4. Fail on missing required files listed in `files`  

---

## Build Integration

```bash
qmf build
# emits:
#   dist/
#     bundles...
#     qmf-manifests.json    # all manifests + contract digest
#     qmf-event-registry.json
```

CDN apps may fetch manifests for inspect without source maps.

---

## Runtime Loading

```js
const graph = await QMF.loadManifestGraph(contract);
// topological sort → init order
await QMF.initModules(graph);
```

Lazy modules: `modules[].lazy: true` → load on first route/event/inspect demand.

---

## Dependency Resolution

1. Build DAG from `dependencies`  
2. Reject cycles (`qmf doctor` / bootstrap throw)  
3. Optional deps skip if missing  
4. Version range: semver; for app-local modules, exact major match required  

---

## Migration Notes

| v3 | v4 |
|----|-----|
| No manifest | Generate via `qmf create module` or `qmf migrate contract` |
| Plugin deps in code only | Declared in manifest + enforced |

---

## Implementation Roadmap

| Step | Work |
|------|------|
| 4.1 | Schema publish |
| 4.2 | Loader + DAG |
| 4.3 | Build embed |
| 4.4 | Doctor cross-checks |
| 4.5 | Lazy resolution |

---

## Anti-Patterns

| Anti-pattern | Fix |
|--------------|-----|
| Manifest out of date vs code | Doctor DOC-004/005; CI gate |
| Hidden dependency via import | Declare in dependencies |
| `permissions` unused theater | Wire to auth checks or omit |

---

## Performance

Manifest files < 2 KB typical. Full graph resolve < 5 ms for 100 modules.

---

## AI Generation Notes

1. Write `manifest.json` in the same turn as module files.  
2. Keep produces/consumes synchronized with `events.js`.  
3. Prefer reading manifests over opening `module.js` for architecture questions.  
