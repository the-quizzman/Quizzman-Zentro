# Migration Guide — QMF v3 → v4

**Estimated effort:** 0.5 day (small) · 1–2 days (mid) · 1 week (large monorepo consumers)

---

## Goals

1. Introduce `qmf.schema.json` without breaking production  
2. Move to typed events gradually  
3. Align folders to CONVENTION.md  
4. Keep CDN islands working  

---

## Strategy

```
Phase A: Contract + manifests (compat on)
Phase B: Folder convention
Phase C: Typed events module-by-module
Phase D: Inspect + CI doctor gate
Phase E: Disable legacy bus
```

---

## Phase A — Contract

```bash
cd my-app
qmf migrate contract
# generates qmf.schema.json with eventBus: "legacy"
qmf doctor
```

Manual minimal contract: see CONTRACT.md example; set `"eventBus": "legacy"`.

---

## Phase B — Layout

| v3 | v4 |
|----|-----|
| Ad-hoc `src/js/header.js` | `src/modules/header/*` |
| Shared helpers mush | `service.js` / foundation |

```bash
qmf migrate layout --yes
```

Or create modules with CLI and move logic.

---

## Phase C — Events

| v3 | v4 |
|----|-----|
| `eventBus.emit('auth:stateChange', user)` | `emit(AuthSessionChanged, payload)` |
| `on('auth:*')` | subscribe each event or pattern helper |

```bash
qmf migrate events
# inserts defineEvent stubs + TODO markers
```

Keep legacy emits until all producers migrated; then set `eventBus: "typed"`.

---

## Phase D — CI

```yaml
# .github/workflows/qmf.yml
- run: npx qmf doctor --strict
```

---

## Phase E — Typed only

```json
"eventBus": "typed",
"ai": { "allowMagicEvents": false, "strictConvention": true, "requireManifest": true }
```

Remove compat imports.

---

## CDN island apps (lab/wiki/html)

Not all pages need full contract apps.

Options:

1. **Stay on v3 island scripts** until rebuilt  
2. **Thin contract** with zero modules — still valid for doctor of shared packages  
3. **Progressive:** header/auth as modules behind islands  

Supreme Guide island checklist remains valid; prefer versioned CDN URLs matching contract `version`.

---

## API mapping quick table

| v3 | v4 |
|----|-----|
| `QMF.init({...})` | `QMF.initFromContract('./qmf.schema.json')` or bootstrap |
| `QMF.eventBus.emit('x', p)` | `emit(XEvent, p)` |
| `__QMF_DEVTOOLS__` | `QMF.inspect.*` (alias kept) |
| No manifest | `manifest.json` per module |
| Free folder layout | CONVENTION.md |

---

## Rollback

1. Keep `eventBus: "legacy"`  
2. Do not delete v3 bundles until Phase E  
3. Contract file can coexist with v3 entrypoints  

---

## Acceptance checklist

- [ ] `qmf.schema.json` validates  
- [ ] All modules have manifests  
- [ ] `qmf doctor` exit 0  
- [ ] Inspect returns full graph  
- [ ] No sibling module imports  
- [ ] Critical user flows pass  

---

## AI Notes

Run migrate commands in order A→E. Do not jump to typed bus before manifests exist.  
