# QMF Usage Guide

## Installation

### Via CDN (Recommended for quick start)

```html
<!-- Load from CDN -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/v3/tokens.css">
<script src="https://ui.quizzman.com/qmf/v3/qmf.iife.js"></script>

<script>
  QMF.init({
    appId: 'my-app',
    debug: true,
  }).then(() => {
    console.log('QMF Ready!');
  });
</script>
```

### Via npm/pnpm (For bundler projects)

```bash
pnpm add @qmf/core @qmf/tokens @qmf/ui
# Or individual modules
pnpm add @qmf/header @qmf/chat-embed
```

```typescript
import { QMF, lazy } from '@qmf/core';
import '@qmf/tokens/css';

await QMF.init({ appId: 'my-app', debug: true });
```

---

## Quick Start

### 1. Basic Initialization

```typescript
import { QMF } from '@qmf/core';

// Initialize framework
await QMF.init({
  appId: 'quizzman-lms',
  channel: 'production',  // 'dev' | 'staging' | 'production'
  debug: false,
  features: {
    header: true,
    footer: true,
    chat: false,
    notifications: false,
  },
});

// Access global state
console.log(QMF.store.getState());
// → { appId, channel, theme, user, language, ... }
```

### 2. Using Plugins (Modules)

```typescript
import { QMF, lazy } from '@qmf/core';
import { createHeaderPlugin } from '@qmf/header';

// Register eager plugin
QMF.use(createHeaderPlugin({
  brandName: 'QuizzMan LMS',
  showChat: true,
  links: [
    { label: 'Courses', href: '/courses' },
    { label: 'Library', href: '/library' },
  ],
}));

// Register lazy plugin (code-split, loaded on demand)
QMF.use(lazy(() => import('@qmf/chat-embed')));
QMF.use(lazy(() => import('@qmf/noti-embed')));

// Initialize all plugins
await QMF.init({ appId: 'my-app' });
```

### 3. Event Communication

```typescript
import { getGlobalEventBus } from '@qmf/core';

const bus = getGlobalEventBus();

// Listen to events
bus.on('auth:stateChange', (user) => {
  console.log('User changed:', user);
});

bus.on('chat:unread', (count) => {
  // Update badge in header
});

// Emit events
bus.emit('header:menuToggle', { open: true });

// Wildcard listeners
bus.on('*', ({ event, payload }) => {
  console.log(`[Event] ${event}`, payload);
});

bus.on('chat:*', ({ event, payload }) => {
  // All chat events
});
```

### 4. State Management

```typescript
import { QMF, createModuleStore } from '@qmf/core';
import { z } from 'zod';

// === Global State (shared across all modules) ===
QMF.store.getState();
// → { user, theme, language, appId, channel, ... }

QMF.store.setState({ theme: 'dark' });

QMF.store.watch(
  (s) => s.theme,
  (newTheme, oldTheme) => {
    document.body.dataset.theme = newTheme;
  }
);

// === Module State (isolated per module) ===
const ChatStateSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    text: z.string(),
    sender: z.string(),
  })),
  connected: z.boolean(),
  typing: z.array(z.string()),
});

const chatStore = createModuleStore(
  'chat-embed',
  { messages: [], connected: false, typing: [] },
  ChatStateSchema  // Optional Zod validation
);

chatStore.setState({ connected: true });
chatStore.watch(
  (s) => s.messages.length,
  (count) => console.log(`${count} messages`)
);
```

### 5. Dependency Injection

```typescript
import { QMF } from '@qmf/core';

// Register a service
QMF.container.registerFactory('analytics', (container) => {
  const http = container.resolve('http');
  return new AnalyticsService(http);
});

// Resolve a service
const analytics = QMF.container.resolve('analytics');

// In plugin setup
const myPlugin = {
  name: 'my-plugin',
  setup(ctx) {
    // Pre-registered: eventBus, store, http, config
    const http = ctx.container.resolve('http');
    const config = ctx.container.resolve('config');
    
    // Register your own service
    ctx.container.registerInstance('myService', new MyService());
  },
};
```

### 6. HTTP Client

```typescript
import { QMF } from '@qmf/core';

// GET request
const users = await QMF.http.get('/api/users');

// POST with body
const result = await QMF.http.post('/api/login', {
  email: 'user@example.com',
  password: '***',
});

// With options
const data = await QMF.http.get('/api/data', {
  headers: { 'X-Custom': 'value' },
  timeout: 5000,
});

// Interceptors (set during init via auth.getToken)
```

### 7. Lifecycle Hooks

```typescript
import { createLifecycle } from '@qmf/core';

const lifecycle = createLifecycle({
  name: 'my-component',
  hooks: {
    onBeforeInit: () => console.log('Before init'),
    onInit: async () => {
      // Async setup
      await loadConfig();
    },
    onMount: () => {
      // DOM is ready
      document.getElementById('root').innerHTML = '...';
    },
    onConnect: async () => {
      // WebSocket/API connections
      await websocket.connect();
    },
    onReady: () => {
      console.log('Fully operational!');
    },
    onDestroy: () => {
      // Cleanup
      websocket.disconnect();
    },
    onError: (error, phase) => {
      console.error(`Error in ${phase}:`, error);
    },
  },
});

await lifecycle.start();
// → onBeforeInit → onInit → onMount → onConnect → onReady
```

---

## Creating a Plugin

```typescript
import type { QMFPlugin, PluginContext } from '@qmf/core';
import { z } from 'zod';

// 1. Define config schema
const MyPluginConfigSchema = z.object({
  apiKey: z.string(),
  enabled: z.boolean().default(true),
});

type MyPluginConfig = z.infer<typeof MyPluginConfigSchema>;

// 2. Define plugin
export const myPlugin: QMFPlugin<MyPluginConfig> = {
  name: 'my-plugin',
  version: '1.0.0',
  dependencies: ['auth-shell'],  // Depends on auth-shell
  
  // CSS files to inject
  styles: [
    'https://ui.quizzman.com/qmf/v3/my-plugin.css',
  ],
  
  setup(ctx: PluginContext) {
    const { eventBus, container, config, lifecycle, expose } = ctx;
    
    // Listen to events
    eventBus.on('auth:login', (user) => {
      console.log('User logged in:', user);
    });
    
    // Register services
    container.registerFactory('myService', () => new MyService(config));
    
    // Expose public API
    expose('doSomething', () => { /* ... */ });
    expose('getData', () => myStore.getState());
  },
  
  async teardown() {
    // Cleanup on destroy
  },
  
  hooks: {
    onReady: () => {
      console.log('My plugin is ready!');
    },
  },
};

// 3. Factory function for easier use
export function createMyPlugin(config: Partial<MyPluginConfig>): QMFPlugin {
  return {
    ...myPlugin,
    config: MyPluginConfigSchema.parse(config),
  };
}
```

---

## Debug Mode & DevTools

When `debug: true`, QMF exposes DevTools on `window.__QMF_DEVTOOLS__`:

```javascript
// In browser console:

// View current state
__QMF_DEVTOOLS__.state()

// View all registered plugins
__QMF_DEVTOOLS__.plugins()

// Event trace
__QMF_DEVTOOLS__.trace.print(20)       // Last 20 events
__QMF_DEVTOOLS__.trace.query('auth:*') // Filter by module
__QMF_DEVTOOLS__.trace.frequency()     // Event counts
__QMF_DEVTOOLS__.trace.export()        // JSON export

// Module stores
__QMF_DEVTOOLS__.stores()

// Errors
__QMF_DEVTOOLS__.errors()

// Manual emit (for testing)
__QMF_DEVTOOLS__.emit('test:event', { foo: 'bar' })
```

---

## Full Example: LMS App

```typescript
// main.ts
import { QMF, lazy } from '@qmf/core';
import { createHeaderPlugin } from '@qmf/header';
import { createFooterPlugin } from '@qmf/footer';
import { createAuthShellPlugin } from '@qmf/auth-shell';
import '@qmf/tokens/css';

async function bootstrap() {
  // Register plugins
  QMF.use(createAuthShellPlugin({
    getToken: () => localStorage.getItem('token'),
    getUser: async () => {
      const res = await fetch('/api/me');
      return res.json();
    },
  }));
  
  QMF.use(createHeaderPlugin({
    brandName: 'QuizzMan LMS',
    brandLogo: '/logo.svg',
    links: [
      { label: 'Dashboard', href: '/' },
      { label: 'Courses', href: '/courses' },
      { label: 'Library', href: '/library' },
    ],
    showChat: true,
    showNotifications: true,
  }));
  
  QMF.use(createFooterPlugin({
    copyright: '© 2026 QuizzMan',
    links: [
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' },
    ],
  }));
  
  // Lazy-load heavy modules
  QMF.use(lazy(() => import('@qmf/chat-embed')));
  QMF.use(lazy(() => import('@qmf/noti-embed')));
  QMF.use(lazy(() => import('@qmf/loading-screen')));
  
  // Initialize
  await QMF.init({
    appId: 'quizzman-lms',
    channel: 'production',
    debug: import.meta.env.DEV,
  });
  
  // Listen for auth changes
  QMF.events.on('auth:stateChange', (user) => {
    if (!user) {
      window.location.href = '/login';
    }
  });
  
  console.log('LMS Ready!', QMF.version);
}

bootstrap();
```

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>QuizzMan LMS</title>
  <link rel="stylesheet" href="https://ui.quizzman.com/qmf/v3/tokens.css">
</head>
<body>
  <div id="qmf-header"></div>
  <main id="app">
    <!-- Your app content -->
  </main>
  <div id="qmf-footer"></div>
  <div id="qmf-chat"></div>
  <div id="qmf-noti"></div>
  
  <script type="module" src="/main.ts"></script>
</body>
</html>
```

---

## API Reference

See [API.md](./API.md) for complete API documentation.
