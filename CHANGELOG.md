# QMF Framework Changelog

## 2.2.42 — 2026-08-26

### Shell
- Fleet soft-reload signal (Consent Mode v2 / analytics 1.1.0 rollout)

## 2.2.41 — 2026-08-26

### Analytics / Consent
- Consent Mode v2 in `modules/analytics/gtag.js` (`1.1.0`)
- Shell sets consent defaults **synchronously** before gtag / AdSense load
- EEA / UK / CH default `denied` until Google CMP updates; elsewhere `granted`
- API: `QmfGtag.updateConsent` / `grantAll` / `denyAll` + `qmf:consent` event

## 2.2.37 — 2026-08-25

### Header
- Add Tycoon and The Vault (Arena) to the global Game catalog, with nav logos and 11-locale i18n
- Header package pin `3.10.15` → `3.10.16`; nav icon bust `20260825`

## 2.2.36 — 2026-08-23

### Ads
- Deny AdSense on `id.quizzman.com`, `app.quizzman.com`, `join.quizzman.com`
- Deny live quiz + homework paths: `/quiz`, `/live`, `/host`, `/homework`, `/assignment`, `/quiz-editor`

## 2.2.35 — 2026-08-23

### Ads
- Inject the official AdSense snippet on production (`adsbygoogle.js?client=ca-pub-9878200690154577`, async, `crossorigin="anonymous"`)
- Snippet is idempotent (at most one). Ad units remain entitlement-gated

## 2.2.34 — 2026-08-23

### Ads
- Shared AdSense runtime (`ca-pub-9878200690154577`) via `modules/ads/ads.js`
- `qmf-shell.js` auto-loads the ads module (non-blocking); `adsbygoogle.js` loads at most once, only when ads are entitled
- `QMFAdSlot` / `<qmf-ad-slot>` gated by entitlement: FREE/guest on, PRO/ADVANCED/unknown off
- Prefer `entitlement.ads`; paid tiers fail closed unless explicitly `ads: true`
- Guest auth settle emits `qmf:auth` type `guest` (not `ready`) so existing login listeners stay correct
- Opt-out: `window.QMF_ADS = false` before shell; localhost/staging skipped by default

## 2.2.21 — 2026-08-10

### Analytics
- Shared GA4 (`G-KBKFY8LX2F`) via `modules/analytics/gtag.js`
- `qmf-shell.js` auto-loads gtag on every shell consumer (home / lab / …)
- Cookie domain `quizzman.com` across subdomains; localhost skipped by default
- Opt-out: `window.QMF_GTAG = false` before shell

## 2.2.19 — 2026-08-09

### Header / Shell
- Global header typeahead default API → `https://search.quizzman.com/api/search`
- Default “See all” → `https://search.quizzman.com/?q={q}`
- Nav Knowledge → Search points to `search.quizzman.com`
- `QMFShell.mount` accepts top-level `searchApiUrl`
- Header package pin `3.10.6` → `3.10.7`

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
