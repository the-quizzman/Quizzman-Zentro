# QMF 4.0 Future Roadmap

**Horizon:** 2026 H2 → 2027 H1

---

## Now — Spec freeze (this document set)

- [x] Initiative 0 Contract  
- [x] Initiatives 1–5 specifications  
- [x] AI documentation suite  
- [x] Example app / module / plugin / service / workflow  
- [x] Spec review sign-off (vanilla JS correction)  

---

## Milestone M1 — Contract + Doctor (4.0.0-alpha)

| Item | Owner surface | Status |
|------|----------------|--------|
| `@qmf/contract` package | Foundation | **Done** |
| Meta-schema on CDN | `/qmf/schemas/` | Copied to `/opt/QMF/schemas` (publish pending) |
| `qmf doctor` DOC-001…008 | CLI (`qmf4`) | **Done** |
| `initFromContract` | Runtime (`bootstrapFromContract`) | **Done (alpha)** |

**Exit:** New app scaffolds with contract; doctor green. → **Met for example app**

---

## Milestone M2 — CLI templates (4.0.0-beta)

| Item | Notes | Status |
|------|-------|--------|
| All `qmf create *` commands | app/module/plugin/service/component | **Done** (`qmf4`) |
| Templates from `docs/v4/templates` | Synced | **Done** |
| `qmf graph` / `qmf inspect` offline | | **Done** |
| `qmf migrate contract` | | **Done** |

**Exit:** AI agents use CLI exclusively for scaffolds. → **Met for alpha CLI**

---

## Milestone M3 — Typed events + manifests (4.0.0-rc)

| Item | Notes | Status |
|------|-------|--------|
| `defineEvent` / emit validate | `@qmf/events` + JSON Schema | **Done (alpha)** |
| Manifest DAG loader | `@qmf/contract` | **Done** |
| Dynamic module `import()` | Node + browser bootstrap | **Done** |
| Build embed `qmf-manifests.json` | | Pending |
| Codemod `migrate events` | `qmf4 migrate events --write` | **Done** |

---

## Milestone M4 — Introspection GA (4.0.0)

| Item | Notes | Status |
|------|-------|--------|
| `QMF.inspect.*` stable | after bootstrap | **Done (alpha)** |
| Secret redaction | | Pending |
| Browser demo | `pnpm demo:v4` | **Done** |
| Schemas CDN | `/qmf/schemas/` live | **Done** |
| Version alignment CDN ↔ packages | | Pending |

**Exit:** Public GA announcement.

---

## Milestone M5 — Adapters (4.1)

| Item | Notes |
|------|-------|
| `@qmf/adapter-react` | Header/module wrappers |
| Optional `qmf-router` | Still not React Router core |
| `componentModel: declarative-adapter` docs | |

---

## Milestone M6 — IDE + ecosystem (4.2)

| Item | Notes |
|------|-------|
| VS Code / Cursor extension reading schema | |
| ESLint plugin boundaries | |
| Generated AI docs from graph | `qmf docs gen` |

---

## Explicit non-roadmap (rejected)

- JSX in `@qmf/core`  
- Replacing Next.js apps wholesale with QMF  
- Multiple contracts per app  

---

## Success metrics

| Metric | Target by M4 |
|--------|--------------|
| Doctor adoption in CI (first-party apps) | 100% |
| Magic-string events in new modules | 0 |
| AI scaffold success without human structure edits | ≥ 95% |
| Version drift incidents | 0 |

---

## Dependency on v3

Maintain v3 CDN islands ≥ 6 months after M4; security fixes only.  
