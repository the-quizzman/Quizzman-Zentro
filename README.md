# Quizzman Fabric

**Quizzman Fabric** — Modular Framework + Runtime by [Quizzman.com](https://quizzman.com).

Formerly **QMF (Quizzman Modular Framework)**. The short code name **QMF** remains in package scopes (`@qmf/*`), CDN paths (`/qmf/`), and the global `QMF` runtime API.

License: [MIT](./LICENSE) · Copyright © Quizzman.com

## Product

| | |
|---|---|
| **Name** | Quizzman Fabric |
| **Subtitle** | Modular Framework + Runtime |
| **Docs / CDN** | https://ui.quizzman.com/ |
| **Packages** | `@qmf/core`, `@qmf/tokens`, `@qmf/ui`, `@qmf/header`, `@qmf/runtime`, … |

## Features

- **Plugin System** — Modular architecture with dependency resolution
- **Lazy Loading** — Code-split plugins loaded on demand
- **DI Container** — Token-based dependency injection
- **Error Isolation** — One module crash doesn't break others
- **State Management** — Global + isolated module stores with Zod validation
- **Event Bus** — Pub/sub with wildcard support
- **DevTools** — Event tracing, state inspection, debugging

## Architecture

```
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
```

## Quick Start

### CDN (Fastest)

```html
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/v3/tokens.css">
<script src="https://ui.quizzman.com/qmf/v3/qmf.iife.js"></script>
<script>
  QMF.init({ appId: 'my-app', debug: true });
</script>
```

### npm/pnpm

```bash
pnpm add @qmf/core @qmf/tokens
```

```typescript
import { QMF, lazy } from '@qmf/core';
import '@qmf/tokens/css';

QMF.use(createHeaderPlugin({ brandName: 'My App' }));
QMF.use(lazy(() => import('@qmf/chat-embed')));
```

## Documentation

- Portal: https://ui.quizzman.com/
- Usage: https://ui.quizzman.com/qmf/docs/USAGE.md
- API: https://ui.quizzman.com/qmf/docs/API.md
- Architecture: https://ui.quizzman.com/qmf/docs/ARCHITECTURE.md
- Fabric 4.0 (alpha): https://ui.quizzman.com/qmf/docs/v4/README.md

## Repository

https://github.com/the-quizzman/Quizzman-Fabric
