# Initiative 0 — Project Contract (`qmf.schema.json`)

**Status:** QMF 4.0 Canonical  
**Consumers:** CLI · Runtime · AI Agents · IDE · Docs Generator  
**Meta-schema:** [`schemas/qmf.schema.schema.json`](./schemas/qmf.schema.schema.json)

---

## Purpose

`qmf.schema.json` is the **single source of truth (SSOT)** for one QMF application.

| Consumer | Use |
|----------|-----|
| CLI | create / doctor / migrate / graph / analyze |
| Runtime | bootstrap order, feature flags, module graph |
| AI Coding Agent | understand architecture before writing files |
| IDE extension | validate paths, naming, imports |
| Docs generator | emit deterministic `*_SPEC.md` |

**Rule:** If schema and source disagree, schema wins and `qmf doctor` fails hard.

---

## Architecture

```
qmf.schema.json          ← contract (app root)
        │
        ├─► CLI validates + mutates (atomic with file generation)
        ├─► Runtime loads → validates against meta-schema → resolves modules
        ├─► Each module.manifest.json ← referenced by modules[]
        ├─► Typed EventBus registry ← derived from manifests.events
        └─► QMF.inspect.* ← derived graph (no source parsing required)
```

Bootstrap order (mandatory):

1. Load + validate `qmf.schema.json` against meta-schema  
2. Resolve `modules[]` → load each `manifest.json`  
3. Register typed events from manifests  
4. Topological init of modules by dependencies  
5. Expose `QMF.inspect.*` from resolved graph  

---

## API

### Location

```
/<app-root>/qmf.schema.json
```

Exactly one file per application. Never nest another contract inside a module.

### Minimal valid contract

```json
{
  "framework": "QMF",
  "version": "4.0.0",
  "name": "quizzman-dictionary",
  "layers": {
    "foundation": "src/foundation",
    "runtime": "src/runtime",
    "components": "src/components",
    "modules": "src/modules"
  },
  "modules": [
    {
      "id": "auth",
      "path": "auth",
      "manifest": "manifest.json",
      "enabled": true,
      "lazy": false
    },
    {
      "id": "dictionary",
      "path": "dictionary",
      "manifest": "manifest.json",
      "enabled": true,
      "lazy": true
    }
  ],
  "eventBus": "typed",
  "manifest": "v1",
  "router": null,
  "componentModel": "imperative",
  "adapters": {
    "react": null,
    "vue": null,
    "svelte": null
  },
  "ai": {
    "strictConvention": true,
    "requireManifest": true,
    "allowImperativeDOM": true,
    "allowMagicEvents": false,
    "requireSchemaBeforeWrite": true
  },
  "build": {
    "target": "es2020",
    "cdn": false,
    "sri": true
  },
  "inspect": {
    "enabled": true,
    "exposeGlobal": true
  }
}
```

### Runtime loader (conceptual)

```js
import { loadContract } from '@qmf/core/contract';

const contract = await loadContract('./qmf.schema.json');
// throws QMFContractError if invalid
await QMF.bootstrap(contract);
```

### CLI mutation (atomic)

```bash
qmf create module auth
# 1. create src/modules/auth/* from templates
# 2. patch qmf.schema.json modules[]
# 3. validate both
# On any failure → rollback all writes
```

---

## Folder Structure

```
my-app/
├── qmf.schema.json              # REQUIRED — Initiative 0
├── package.json
├── src/
│   ├── foundation/
│   ├── runtime/
│   ├── components/
│   └── modules/
│       └── <id>/
│           └── manifest.json    # REQUIRED — Initiative 4
└── docs/                        # optional generated AI docs
```

---

## Examples

See [`examples/app/qmf.schema.json`](./examples/app/qmf.schema.json).

---

## Migration Notes (v3 → v4)

| v3 | v4 |
|----|-----|
| Implicit app layout | Explicit `qmf.schema.json` |
| Ad-hoc module folders | `modules[]` registry |
| Magic string events | `eventBus: "typed"` |
| Optional manifests | `ai.requireManifest: true` |
| Version drift (3.0.1 vs 3.3.1) | `version` must match `@qmf/core` major.minor |

Compat: `eventBus: "legacy"` allows v3 string bus during migration; `qmf doctor` warns.

---

## Documentation

- Meta-schema: `schemas/qmf.schema.schema.json`
- Module manifest schema: `schemas/module.manifest.schema.json`
- Event schema: `schemas/event.schema.json`

---

## Implementation Roadmap

| Step | Deliverable | Depends on |
|------|-------------|------------|
| 0.1 | Meta-schema publish to CDN | — |
| 0.2 | `@qmf/core/contract` loader + JSON Schema validate | 0.1 |
| 0.3 | `qmf doctor` contract checks | 0.2 |
| 0.4 | CLI create* atomic schema patch | 0.3 + CLI |
| 0.5 | Runtime bootstrap from contract | 0.2 + Manifest |
| 0.6 | `QMF.inspect.contract()` | 0.5 |

---

## Anti-Patterns

| Anti-pattern | Correct |
|--------------|---------|
| Multiple `qmf.schema.json` | Exactly one at app root |
| Hardcoding module list in code | Read from contract |
| AI inventing folders not in schema | Run `qmf create *` first |
| `allowMagicEvents: true` with typed bus | Forbidden in 4.0 |
| Putting JSX adapter path in `layers` | Adapters stay outside core layers |

---

## Performance

- Contract parse: O(size); typical file < 4 KB  
- Validate once at bootstrap; cache in memory  
- Hot reload in `qmf dev`: re-validate only on schema/manifest change  

---

## AI Generation Notes

1. ALWAYS read `qmf.schema.json` before writing any file.  
2. NEVER invent a module id absent from `modules[]`.  
3. To add a module: run or emulate `qmf create module <id>` (updates schema + files).  
4. Treat `ai.*` flags as hard constraints, not suggestions.  
5. Prefer `QMF.inspect.*` / manifests over grepping source.  
