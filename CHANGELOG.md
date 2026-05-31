# QMF Framework Changelog

## [3.0.0] — 2025-01-01

### 🎉 Initial Release — Full Framework Rewrite

This is a complete restructure from the legacy `share-ui` static files into a proper modular framework.

### Architecture
- Monorepo with pnpm workspaces + Turborepo v2
- 4-layer architecture: Core → UI Kit → Modules → Assets
- TypeScript strict mode throughout
- Zod-powered config schema validation for all modules
- Import boundary enforcement between layers

### Packages
- **@qmf/core** — Event bus, state management, lifecycle manager, config system, HTTP client, plugin loader
- **@qmf/tokens** — Design tokens (CSS custom properties + TypeScript constants, dark theme)
- **@qmf/utils** — Shared utilities (logger, DOM helpers, token resolution, debounce/throttle)
- **@qmf/ui** — Component library (Button, Modal, Dropdown, Toast, Panel, Avatar, Badge, Overlay)
- **@qmf/auth-shell** — Authentication shell (token resolution, cross-tab sync, redirect)
- **@qmf/header** — Unified header with 3-zone layout (brand | logo | actions)
- **@qmf/footer** — Global footer with copyright, links, social, DMCA
- **@qmf/chat-embed** — Floating chat panel with WebSocket realtime
- **@qmf/noti-embed** — Notification center with categories + WebSocket push
- **@qmf/loading-screen** — Fullscreen splash with particles, progress, dark/light themes
- **@qmf/cli** — CLI tool for scaffolding (`qmf create`, `qmf add`, `qmf doctor`)

### Build System
- tsup v8 (ESM + CJS + IIFE outputs)
- PostCSS + cssnano + lightningcss for CSS processing
- SRI hash generation for all dist files
- manifest.json with file sizes and integrity hashes
- Bundle size budgets with automated checking

### Developer Experience
- ESLint 9 with import boundary rules
- Vitest for testing
- Prettier for formatting
- @changesets/cli for version management
- `qmf doctor` health check command

### Migration from v2
- Legacy code preserved in `_legacy_qmf/` for reference
- All global namespaces replaced with proper ES module imports
- Event bus API unchanged: `on()`, `emit()`, `off()`
- Config now validated with Zod schemas (runtime safety)
- CSS tokens migrated from inline colors to `--qmf-*` custom properties
