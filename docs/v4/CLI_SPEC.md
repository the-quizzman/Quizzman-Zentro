# Initiative 2 — Official QMF CLI (`CLI_SPEC`)

**Package:** `@qmf/cli` (bin: `qmf`)  
**Status:** QMF 4.0 Canonical  
**Depends on:** CONTRACT · CONVENTION · MODULE · EVENT

---

## Purpose

The CLI is the **standard** way to create and evolve QMF applications. Humans and AI agents use the same commands so output is identical.

---

## Architecture

```
qmf
├── commands/          # one file per command
├── templates/         # ejs/handlebars-free TS templates (pure string modules)
├── validators/        # contract + convention + manifest
├── graph/             # dependency / event graph
└── migrate/           # v3 → v4 codemods
```

Extension mechanism:

```js
// qmf.plugin.cli.js (app or package)
export default {
  name: 'my-cli-plugin',
  commands: {
    'gen:api': async (ctx) => { /* ... */ },
  },
  templates: {
    module: { /* override or augment */ },
  },
};
```

Register via `qmf.schema.json` future field `cli.plugins[]` or `package.json → qmf.cliPlugins`.

---

## Commands

### `qmf create app`

**Purpose:** Scaffold a new QMF 4.0 application.

**Generated files:**

```
<name>/
├── qmf.schema.json
├── package.json
├── tsconfig.json
├── .gitignore
├── src/foundation/index.js
├── src/runtime/bootstrap.js
├── src/components/.gitkeep
└── src/modules/.gitkeep
```

**Flags:** `--name` `--template=default|cdn-island` `--lang=js` (only supported value)

**Validation:** name kebab-case; target dir empty.

**Example:**

```bash
qmf create app quizzman-notes
cd quizzman-notes && pnpm install && qmf dev
```

---

### `qmf create module`

**Purpose:** Add a module with all 7 files + patch contract.

**Generated:** `src/modules/<id>/{module,config,state,service,events,view}.js` + `manifest.json`  
**Mutates:** `qmf.schema.json → modules[]` (atomic)

**Flags:** `--id` `--lazy` `--description`

**Validation:** id unique; path free; contract valid after patch.

---

### `qmf create service`

**Purpose:** Add a named service class + token into an existing module `service.js` and manifest `services[]`.

**Flags:** `--module` `--name` (PascalCase without `Service` suffix)

---

### `qmf create component`

**Purpose:** Scaffold imperative component under `src/components/<name>/`.

**Generated:**

```
src/components/<name>/
├── component.js
├── styles.css
└── manifest.json   # optional lightweight component meta
```

**Flags:** `--name`

---

### `qmf create plugin`

**Purpose:** Alias of `create module` with plugin-centric template comments (same 7 files). Kept for AI discoverability.

---

### `qmf doctor`

**Purpose:** Validate contract, conventions, manifests, import boundaries, event magic-string absence.

**Exit codes:** `0` ok · `1` errors · `2` warnings-only (if `--strict-warnings`)

**Checks:**

| ID | Check |
|----|-------|
| DOC-001 | `qmf.schema.json` exists + validates |
| DOC-002 | Every `modules[]` path exists |
| DOC-003 | Required 7 files present |
| DOC-004 | Manifest validates |
| DOC-005 | Event names match defineEvent exports |
| DOC-006 | No sibling module imports |
| DOC-007 | `framework.version` matches `@qmf/core` |
| DOC-008 | `allowMagicEvents` is false when eventBus=typed |

---

### `qmf analyze`

**Purpose:** Static report — module count, event fan-out, orphan events, cyclic deps.

**Output:** JSON or markdown (`--format json|md`).

---

### `qmf migrate`

**Purpose:** v3 → v4 migration helpers.

**Subcommands:**

- `qmf migrate contract` — generate `qmf.schema.json` from heuristics  
- `qmf migrate events` — replace string emits with stubs + TODO  
- `qmf migrate layout` — move files toward convention (interactive/`--yes`)  

---

### `qmf build`

**Purpose:** Production build (wraps tsup/turbo). Emits SRI if `build.sri: true`.

---

### `qmf dev`

**Purpose:** Dev server + watch; re-runs doctor on schema/manifest change.

---

### `qmf inspect`

**Purpose:** CLI mirror of runtime inspect (reads manifests without browser).

```bash
qmf inspect modules
qmf inspect events
qmf inspect graph --out graph.json
```

---

### `qmf graph`

**Purpose:** Emit dependency + event graph (DOT / JSON / Mermaid).

```bash
qmf graph --format mermaid > docs/graph.mmd
```

---

## Templates

Templates live in [`templates/`](./templates/) as vanilla JS string builders (no EJS — deterministic, AI-readable).

| Template | Path |
|----------|------|
| app | `templates/app/` |
| module | `templates/module/` |
| service | `templates/service/` |
| component | `templates/component/` |
| plugin | `templates/plugin/` (extends module) |

---

## Extension Mechanism

1. Package exports `qmfCliPlugin`  
2. App lists plugin in `package.json`:

```json
{
  "qmf": {
    "cliPlugins": ["@acme/qmf-cli-plugin"]
  }
}
```

3. Plugin may add commands; may not remove built-ins.  
4. Template overrides are deep-merge by file key.

---

## Migration Notes

| v3 CLI (`qmf create`, `qmf add`, `qmf doctor`) | v4 |
|-----------------------------------------------|-----|
| Partial scaffolding | Full convention templates |
| No schema patch | Atomic schema mutation |
| Doctor optional | Doctor is gate for CI |

---

## Implementation Roadmap

| Step | Work |
|------|------|
| 2.1 | Port `@qmf/cli` to command table above |
| 2.2 | Wire templates from `docs/v4/templates` |
| 2.3 | Doctor rules DOC-001…008 |
| 2.4 | Graph + inspect offline |
| 2.5 | Migrate codemods |
| 2.6 | Plugin loader |

---

## Anti-Patterns

| Anti-pattern | Fix |
|--------------|-----|
| Hand-creating modules without CLI | `qmf create module` |
| Editing schema without validation | Always `qmf doctor` after |
| Custom template engines per team | Official templates only (+ plugin merge) |

---

## Performance

- Doctor should finish < 2s for 50 modules (manifest-first, no TS program required for basic rules).  
- `analyze` may use TS compiler API optionally (`--deep`).

---

## AI Generation Notes

- Prefer invoking CLI over writing files manually.  
- If CLI unavailable, emulate exact template outputs + schema patch.  
- Never skip `manifest.json`.  
- After any create command, assume doctor must pass.  
