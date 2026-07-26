# Quizzman Modular Framework (QMF)

**Quizzman Modular Framework v3.0** — A production-ready frontend framework by [Quizzman.com](https://quizzman.com), powering all Quizzman web applications.

License: [MIT](./LICENSE) · Copyright © Quizzman.com

## Features

- 🎯 **Plugin System** — Modular architecture with dependency resolution
- 🚀 **Lazy Loading** — Code-split plugins loaded on demand
- 📦 **DI Container** — Token-based dependency injection
- 🔒 **Error Isolation** — One module crash doesn't break others
- 📊 **State Management** — Global + isolated module stores with Zod validation
- 🔌 **Event Bus** — Pub/sub with wildcard support
- 🛠️ **DevTools** — Event tracing, state inspection, debugging

## Architecture

\`\`\`
┌─────────────────────────────────────────────┐
│                  Modules                     │
│  header · footer · chat · noti · loading     │
├─────────────────────────────────────────────┤
│               UI Kit Layer                   │
│  button · modal · dropdown · toast · panel   │
├─────────────────────────────────────────────┤
│               Core Layer                     │
│  event-bus · state · lifecycle · config      │
│  http · plugin-loader · di · error-boundary  │
├─────────────────────────────────────────────┤
│           Foundation Layer                   │
│  tokens · utils · assets                     │
└─────────────────────────────────────────────┘
\`\`\`

## Quick Start

### CDN (Fastest)

\`\`\`html
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/v3/tokens.css">
<script src="https://ui.quizzman.com/qmf/v3/qmf.iife.js"></script>
<script>
  QMF.init({ appId: 'my-app', debug: true });
</script>
\`\`\`

### npm/pnpm

\`\`\`bash
pnpm add @qmf/core @qmf/tokens
\`\`\`

\`\`\`typescript
import { QMF, lazy } from '@qmf/core';
import '@qmf/tokens/css';

QMF.use(createHeaderPlugin({ brandName: 'My App' }));
QMF.use(lazy(() => import('@qmf/chat-embed')));

await QMF.init({ appId: 'my-app', debug: true });
\`\`\`

## Usage Example

\`\`\`typescript
import { QMF, lazy, getGlobalEventBus } from '@qmf/core';
import { createHeaderPlugin } from '@qmf/header';
import { createFooterPlugin } from '@qmf/footer';
import '@qmf/tokens/css';

// 1. Register plugins
QMF.use(createHeaderPlugin({ brandName: 'QuizzMan LMS' }));
QMF.use(createFooterPlugin());
QMF.use(lazy(() => import('@qmf/chat-embed')));

// 2. Initialize
await QMF.init({
  appId: 'quizzman-lms',
  channel: 'production',
  debug: import.meta.env.DEV,
});

// 3. Listen to events
getGlobalEventBus().on('auth:stateChange', (user) => {
  console.log('User:', user);
});

// 4. Access state
QMF.store.watch(s => s.theme, (theme) => {
  document.body.dataset.theme = theme;
});
\`\`\`

## Development

\`\`\`bash
pnpm install         # Install dependencies
pnpm build           # Build all packages
pnpm dev             # Development mode
pnpm test            # Run tests
pnpm build:dist      # Build for CDN
pnpm deploy:cdn      # Deploy to CDN
pnpm deploy:npm      # Publish to npm
\`\`\`

## Debug Mode

\`\`\`javascript
// In browser console (when debug: true)
__QMF_DEVTOOLS__.state()           // Current state
__QMF_DEVTOOLS__.plugins()         // Registered plugins
__QMF_DEVTOOLS__.trace.print(20)   // Last 20 events
__QMF_DEVTOOLS__.errors()          // Module errors
\`\`\`

## Documentation

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System design
- [USAGE.md](./docs/USAGE.md) — Detailed usage guide
- [API.md](./docs/API.md) — API reference

## License

Proprietary — © 2022–2026 CTCP PTN & GDQT QUIZZMAN. All rights reserved.
