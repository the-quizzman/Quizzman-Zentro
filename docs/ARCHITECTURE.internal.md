# QMF Architecture Guide (Internal - Confidential)

## Overview

QMF (Quizzman Modular Framework) is a 4-layer frontend framework designed for building consistent, composable web applications across the Quizzman ecosystem.

## Layer Architecture

### Layer 0 — Foundation
**Packages:** `@qmf/tokens`, `@qmf/utils`

The foundation layer has zero dependencies on other QMF packages. It provides:
- **Design tokens**: CSS custom properties and TypeScript constants for colors, spacing, typography, shadows, etc.
- **Utilities**: Logger, DOM helpers, token resolution, event emitter, fetch wrapper, etc.

**Import rule:** Cannot import from any other QMF layer.

### Layer 1 — Core
**Packages:** `@qmf/core`

The core layer provides the runtime infrastructure:
- **EventBus**: Pub/sub with wildcard and scoped bus support
- **Store**: Immutable state container with Zod schema validation, selectors and watchers
- **GlobalState / ModuleStore**: Isolated per-module state + shared global state (auth, theme, language)
- **LifecycleManager**: Standardized module lifecycle (created → ready → destroyed)
- **Config**: Zod-powered validation, environment URL resolution
- **HttpClient**: Fetch wrapper with interceptors, retry, auth injection
- **DIContainer**: Token-based dependency injection for service registration/resolution
- **PluginLoader**: Dependency-aware plugin registration with lazy loading and CSS injection
- **ErrorBoundary**: Per-module error isolation — one crash doesn't kill the app
- **EventTracer**: Event tracing with origin, payload, timestamp for debugging
- **DevTools**: Browser DevTools panel via `window.__QMF_DEVTOOLS__`

**Import rule:** Can only import from Layer 0.

### Layer 2 — UI Kit
**Packages:** `@qmf/ui`

Reusable UI primitives consumed by modules:
- Button, Modal, Dropdown, Toast, Panel, Avatar, Badge, Overlay

All components use `--qmf-*` CSS custom properties from `@qmf/tokens`.

**Import rule:** Can only import from Layer 0.

### Layer 3 — Modules
**Packages:** `@qmf/auth-shell`, `@qmf/header`, `@qmf/footer`, `@qmf/chat-embed`, `@qmf/noti-embed`, `@qmf/loading-screen`

Business-level modules that assemble into full applications. Each module:
- Has a Zod config schema
- Follows the standard lifecycle
- Can be used standalone or as a QMF plugin
- Provides a `createXxxPlugin()` factory for framework integration

**Import rule:** Can import from all lower layers.

## Plugin System

Every module can be used as a QMF plugin (eager or lazy-loaded):

```typescript
import { QMF, lazy } from '@qmf/core';

// Eager plugin
qmf.use(createHeaderPlugin({ brandName: 'My App' }));

// Lazy plugin — code-split, loaded on demand
qmf.use(lazy(() => import('@qmf/chat-embed')));

await qmf.init({ appId: 'my-app' });
```

Plugins declare their dependencies, and the PluginLoader resolves them via topological sort.
Lazy plugins are resolved before initialization begins.

## Dependency Injection

The DI container allows modules to register and consume shared services:

```typescript
// In plugin setup
setup(ctx) {
  // Register a service
  ctx.container.registerFactory('analytics', (c) => {
    const http = c.resolve<HttpClient>('http');
    return new AnalyticsService(http);
  });

  // Consume a service
  const config = ctx.container.resolve<QMFInitOptions>('config');
}
```

Pre-registered services: `eventBus`, `store`, `http`, `config`.

## Error Isolation

Each module runs inside a `ModuleErrorBoundary`. If a plugin crashes during init or runtime:
1. The error is captured and logged
2. `module:error` event is emitted on the EventBus
3. Other modules continue running unaffected
4. Optional `onRecover` callback can retry the operation

```typescript
eventBus.on('module:error', ({ module, error, phase }) => {
  console.warn(`Module "${module}" failed in "${phase}": ${error.message}`);
});
```

## Lifecycle

All modules follow a standardized lifecycle:

```
created → initializing → initialized → mounting → mounted 
→ connecting → connected → ready → destroying → destroyed
```

Hooks:
- `onBeforeInit` / `onInit` — Configuration and setup
- `onMount` — DOM attachment
- `onConnect` — WebSocket / API connections
- `onReady` — Fully operational
- `onDestroy` — Cleanup

## State Management

### Global State (shared)
Auth, theme, and language data live in the global store with Zod validation:

```typescript
QMF.store.getState(); // { user, theme, language, appId, ... }
QMF.store.watch(s => s.theme, (next, prev) => { /* react */ });
```

### Module State (isolated)
Each module gets its own local store — prevents cross-contamination:

```typescript
import { createModuleStore } from '@qmf/core';
import { z } from 'zod';

const ChatStateSchema = z.object({
  messages: z.array(z.unknown()),
  connected: z.boolean(),
});

const chatStore = createModuleStore('chat-embed', 
  { messages: [], connected: false }, 
  ChatStateSchema
);
```

## Config Validation

Every module uses Zod schemas:

```typescript
const HeaderConfigSchema = z.object({
  brandName: z.string().default('QuizzMan'),
  showChat: z.boolean().default(false),
  // ...
});
```

Invalid config throws `QMFConfigError` with detailed validation messages.

## Event Communication

Modules communicate via the global EventBus:

```typescript
// Module A: emit
getGlobalEventBus().emit('chat:unread', 5);

// Module B: listen
getGlobalEventBus().on('chat:unread', (count) => {
  header.updateChatBadge(count);
});
```

Naming convention: `module:event` (e.g., `auth:stateChange`, `noti:unread`)

### Event Tracing (Debug Mode)

In debug mode, all events are traced with origin, payload, and timestamp:

```typescript
// In browser DevTools console:
__QMF_DEVTOOLS__.trace.print(20);        // Last 20 events
__QMF_DEVTOOLS__.trace.query('auth:*');   // Filter by module
__QMF_DEVTOOLS__.trace.frequency();       // Event counts
__QMF_DEVTOOLS__.trace.export();          // JSON export
```

## Build Pipeline

```
TypeScript → tsup → ESM/CJS/IIFE
CSS → PostCSS → cssnano → minified CSS
All outputs → SRI hash → manifest.json
```

Each package is independently buildable and tree-shakeable.

### Versioning
- **Changesets** (`@changesets/cli`) handles version bumps and changelogs
- Foundation packages (`core`, `tokens`, `utils`, `ui`) are **linked** — they release together
- `zod` and `@qmf/*` are **peerDependencies** to avoid duplicate bundling

## Directory Structure

```
/opt/QMF/
├── packages/
│   ├── core/          # Layer 1: Runtime core
│   ├── tokens/        # Layer 0: Design tokens
│   ├── utils/         # Layer 0: Shared utilities
│   ├── ui/            # Layer 2: Component library
│   ├── auth-shell/    # Layer 3: Auth module
│   ├── header/        # Layer 3: Header module
│   ├── footer/        # Layer 3: Footer module
│   ├── chat-embed/    # Layer 3: Chat module
│   ├── noti-embed/    # Layer 3: Notification module
│   ├── loading-screen/# Layer 3: Loading screen
│   └── cli/           # CLI tool
├── configs/           # Shared build/lint/TS configs
├── scripts/           # Build, release, verify, clean
├── assets/            # Static assets (logos, icons, sounds)
├── apps/              # Docs, playground, examples
├── dist/              # Consolidated build output
└── _legacy_qmf/      # Preserved legacy code
```
