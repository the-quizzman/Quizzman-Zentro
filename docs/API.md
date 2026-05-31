# QMF API Reference

## @qmf/core

### EventBus
```typescript
import { EventBus, getGlobalEventBus } from '@qmf/core';

const bus = getGlobalEventBus(); // Global singleton
// or
const bus = new EventBus();

bus.on('event', callback);        // Subscribe
bus.once('event', callback);      // Subscribe once
bus.off('event', callback);       // Unsubscribe
bus.emit('event', data);          // Publish
bus.on('*', callback);            // Wildcard (all events)
EventBus.scoped('prefix');        // Scoped bus (prefix:event)
```

### Store
```typescript
import { Store } from '@qmf/core';

const store = new Store({ count: 0 });

store.getState();                     // { count: 0 }
store.setState({ count: 1 });         // Immutable update
store.select(s => s.count);           // Selector
store.watch(s => s.count, callback);  // Watch specific value
store.subscribe(callback);            // Subscribe to all changes
```

### LifecycleManager
```typescript
import { createLifecycle } from '@qmf/core';

const lc = createLifecycle();
lc.hook('onInit', async () => { /* ... */ });
lc.hook('onMount', async () => { /* ... */ });
lc.hook('onReady', async () => { /* ... */ });
lc.hook('onDestroy', async () => { /* ... */ });
await lc.transition('initialized');
```

### Config
```typescript
import { validateConfig, resolveEnvUrls } from '@qmf/core';

const config = validateConfig(MySchema, rawConfig, 'ModuleName');
const urls = resolveEnvUrls('production');
// { api, id, chat, noti, cdn, ws }
```

### HttpClient
```typescript
import { HttpClient } from '@qmf/core';

const http = new HttpClient({
  baseUrl: 'https://api.quizzman.com',
  timeout: 10000,
  retry: 3,
});

http.addInterceptor({ /* request/response/error */ });
const data = await http.get('/users/me');
await http.post('/data', { key: 'value' });
```

### QMF Framework
```typescript
import { QMF } from '@qmf/core';

const qmf = QMF.getInstance();
qmf.use(plugin);
await qmf.init({ appId: 'my-app', env: 'production' });
```

---

## @qmf/tokens

```typescript
import { colors, spacing, radius, shadows, zIndex, fontFamily, fontSize, breakpoints } from '@qmf/tokens';

// CSS
import '@qmf/tokens/tokens.css';  // Light theme
import '@qmf/tokens/dark.css';    // Dark theme
```

---

## @qmf/utils

```typescript
import {
  resolveToken,          // 6-source token resolution
  resolveCurrentUser,    // User from localStorage/cookie
  createLogger,          // Namespaced logger
  createElement,         // DOM element factory
  mountComponent,        // Mount with cleanup
  safeFetch,             // Fetch with error handling
  createEventEmitter,    // Lightweight pub/sub
  deepMerge,             // Deep object merge
  debounce, throttle,    // Rate limiters
  formatRelativeTime,    // "5 phút trước"
} from '@qmf/utils';
```

---

## @qmf/ui

```typescript
import {
  createButton,    // { variant, size, loading, onClick }
  Modal,           // new Modal({ title, content, onClose })
  createDropdown,  // { trigger, items, onSelect }
  createToast,     // { message, variant, duration }
  createPanel,     // Sliding drawer
  createAvatar,    // { src, fallback, status }
  createBadge,     // { count, variant, max }
  createOverlay,   // Fullscreen overlay
} from '@qmf/ui';

import '@qmf/ui/style.css';
```

---

## @qmf/auth-shell

```typescript
import { AuthShell, createAuthShellPlugin } from '@qmf/auth-shell';

// Standalone
const auth = new AuthShell({ loginUrl: 'https://id.quizzman.com/login' });
auth.checkAuthState();
auth.getToken();
auth.getUser();
auth.logout();
auth.onAuthChange(callback);

// As plugin
qmf.use(createAuthShellPlugin({ loginUrl: '...' }));
```

---

## @qmf/header

```typescript
import { QMFHeader, createUnifiedHeader, createHeaderPlugin } from '@qmf/header';

// Standalone
const header = createUnifiedHeader('#qmf-header', {
  brandName: 'My App',
  showChat: true,
  showNotification: true,
});

header.updateChatBadge(5);
header.updateNotificationBadge(3);
header.on('menu:action', (action) => { /* ... */ });

// As plugin
qmf.use(createHeaderPlugin({ brandName: 'My App' }));
```

---

## @qmf/footer

```typescript
import { createFooter, createFooterPlugin } from '@qmf/footer';

const footer = createFooter('#qmf-footer', {
  copyrightHolder: 'My Company',
  links: [{ label: 'About', href: '/about' }],
});

qmf.use(createFooterPlugin());
```

---

## @qmf/chat-embed

```typescript
import { QMFChat, createChatEmbed, createChatPlugin } from '@qmf/chat-embed';

const chat = createChatEmbed('#qmf-chat', {
  wsUrl: 'wss://chat.quizzman.com/ws',
});

chat.open();
chat.close();
chat.sendMessage(conversationId, 'Hello!');
chat.on('message:new', (msg) => { /* ... */ });

qmf.use(createChatPlugin());
```

---

## @qmf/noti-embed

```typescript
import { QMFNotiEmbed, createNotiEmbed, createNotiPlugin } from '@qmf/noti-embed';

const noti = createNotiEmbed('#qmf-noti', {
  wsUrl: 'wss://noti.quizzman.com/ws',
});

noti.open();
noti.markAsRead(notificationId);
noti.markAllAsRead();

qmf.use(createNotiPlugin());
```

---

## @qmf/loading-screen

```typescript
import { showLoadingScreen, createLoadingScreenPlugin } from '@qmf/loading-screen';

const screen = showLoadingScreen({
  brandName: 'Quizzman',
  showParticles: true,
});

screen.setProgress(50);
screen.setStage(2);
await screen.hide();

qmf.use(createLoadingScreenPlugin());
```
