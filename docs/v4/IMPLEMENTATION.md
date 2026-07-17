# QMF 4.0 Alpha — Implementation Status

**Date:** 2026-07-17  
**Language:** vanilla JavaScript (ESM)

## Packages

| Package | Path | Role |
|---------|------|------|
| `@qmf/contract` | `packages/contract` | Node + browser loaders |
| `@qmf/events` | `packages/events` | named events |
| `@qmf/inspect` | `packages/inspect` | doctor + inspect API |
| `@qmf/runtime` | `packages/runtime` | Node + browser bootstrap |
| `@qmf/qmf-cli` | `packages/qmf-cli` | `qmf4` CLI |

## CDN schemas

Live: `https://ui.quizzman.com/qmf/schemas/`

## npm registry (Verdaccio)

Registry: `https://ui.quizzman.com/registry/` (proxy → `127.0.0.1:4873`)

Published **4.0.0-alpha.1**:

| Package | Install |
|---------|---------|
| `@qmf/contract` | `npm i @qmf/contract@4.0.0-alpha.1` |
| `@qmf/events` | `npm i @qmf/events@4.0.0-alpha.1` |
| `@qmf/inspect` | `npm i @qmf/inspect@4.0.0-alpha.1` |
| `@qmf/runtime` | `npm i @qmf/runtime@4.0.0-alpha.1` |
| `@qmf/qmf-cli` | `npm i -g @qmf/qmf-cli@4.0.0-alpha.1` → `qmf4` |

```bash
# .npmrc
@qmf:registry=https://ui.quizzman.com/registry/

npm i @qmf/runtime@4.0.0-alpha.1 @qmf/contract@4.0.0-alpha.1 @qmf/events@4.0.0-alpha.1
pnpm publish:v4   # re-publish from monorepo
```

PM2 process: `qmf-registry` (Verdaccio).

## Browser demo

```bash
pnpm demo:v4
# → http://127.0.0.1:4177/docs/v4/examples/browser-demo/
```

Uses import maps + `bootstrapFromContractUrl` (fetch manifests, dynamic `import()` modules, DOM mount).

## CLI

```bash
pnpm qmf4 doctor --strict docs/v4/examples/app
pnpm qmf4 create module|plugin|service|component …
pnpm qmf4 migrate contract [--force]
pnpm qmf4 migrate events [--write]
pnpm qmf4 inspect|graph …
pnpm test:v4
```

## Milestone progress

| Milestone | Status |
|-----------|--------|
| M1 Contract + Doctor | **Done** |
| M2 CLI templates | **Done** |
| M3 Typed events + dynamic load | **Done (alpha)** |
| M4 Inspect + browser demo | **Done (alpha)** |
| Schemas on CDN | **Done** |
| `migrate events` | **Done** |

## Still open

- npm registry publish 4.0-alpha  
- `qmf-manifests.json` build embed  
- Compat bridge to `@qmf/core` 3.x TS packages  
- Production hardening of browser import maps / CDN package hosting  
