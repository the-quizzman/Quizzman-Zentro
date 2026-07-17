# Initiative 5 — AI Introspection Layer (`INTROSPECTION`)

**Status:** QMF 4.0 Canonical  
**Surface:** `QMF.inspect.*` · CLI `qmf inspect` · DevTools

---

## Purpose

The runtime answers architectural questions so AI agents **never need to inspect raw source**.

Data sources (in order):

1. `qmf.schema.json`  
2. Module `manifest.json` files  
3. Live Event registry / Store / DI container  
4. (Optional) Build artifacts `qmf-manifests.json`  

---

## Architecture

```
Contract + Manifests + Live Runtime
              │
              ▼
        InspectEngine
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
 Browser   CLI offline  DevTools panel
```

When `inspect.enabled: false`, methods throw `QMFInspectDisabledError`.

---

## API

### Modules

```js
QMF.inspect.modules(): ModuleInspect[]
// [{ name, version, lazy, enabled, dependencies, path, lifecycle }]
```

### Events

```js
QMF.inspect.events(filter?: string): EventInspect[]
// filter supports prefix "dictionary.*"
```

### Services

```js
QMF.inspect.services(): ServiceInspect[]
// [{ token, module, singleton, resolved: boolean }]
```

### State

```js
QMF.inspect.state(moduleId?: string): StateInspect
// snapshots (dev only; redact secrets via permissions)
```

### Routes

```js
QMF.inspect.routes(): RouteInspect[]
// empty if router: null; else adapter-provided table
```

### Plugins

```js
QMF.inspect.plugins(): PluginInspect[]
// registered plugin names, status, error boundary state
```

### Config

```js
QMF.inspect.config(moduleId?: string): unknown
// validated config objects (no secrets — use permissions allowlist)
```

### Graph

```js
QMF.inspect.graph(): {
  modules: { id: string; deps: string[] }[];
  events: { name: string; from: string[]; to: string[] }[];
}

QMF.inspect.contract(): QMFContract
```

### Convenience

```js
QMF.inspect.summary(): string  // human + AI readable short dump
QMF.inspect.toJSON(): object   // full export for agents
```

---

## Examples

```js
// AI agent workflow
const summary = QMF.inspect.summary();
const orphans = QMF.inspect.events().filter(e => e.consumers.length === 0);
const cycles = QMF.inspect.graph(); // doctor already rejects cycles; still visible
```

CLI:

```bash
qmf inspect graph --format json > /tmp/qmf-graph.json
```

---

## Migration Notes

| v3 `__QMF_DEVTOOLS__` | v4 `QMF.inspect` |
|-----------------------|------------------|
| Ad-hoc | Stable documented API |
| Debug only | Designed for AI + CI |

Keep `__QMF_DEVTOOLS__` as alias calling inspect (compat).

---

## Implementation Roadmap

| Step | Work |
|------|------|
| 5.1 | InspectEngine from contract+manifests |
| 5.2 | Live bindings (store/di/events) |
| 5.3 | CLI offline mode |
| 5.4 | `toJSON` / `summary` |
| 5.5 | Secret redaction policy |

---

## Anti-Patterns

| Anti-pattern | Fix |
|--------------|-----|
| AI grepping `src/` for architecture | `QMF.inspect.toJSON()` |
| Exposing tokens in `inspect.state` | Redact keys matching `/token|password|secret/i` |
| Custom per-app inspect APIs | Extend via CLI plugin, not fork core |

---

## Performance

- `modules/events/graph`: pure data, < 1 ms  
- `state()`: clones snapshots; avoid in hot loops  
- `toJSON()`: suitable for agent turn start, not per keystroke  

---

## AI Generation Notes

1. Call `inspect.summary()` or read `qmf.schema.json` + manifests before edits.  
2. After adding module/event, verify with `inspect.modules()` / `inspect.events()`.  
3. Never claim architecture facts that contradict inspect output.  
