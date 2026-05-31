# QMF Migration Guide (v2 → v3)

Migration guide from QMF v2 (share-ui) to QMF v3.0.

**Estimated time:** 15-30 minutes for small apps, 1-2 hours for large apps.

---

## 🚀 Quick Migration (Zero Code Changes)

If you want to keep your old code, use the **Compatibility Layer**:

### CDN

```html
<!-- BEFORE (v2) -->
<script src="https://ui.quizzman.com/qmf/dist/qmf.min.js"></script>

<!-- AFTER (v3 + Compat) - No code changes needed! -->
<script src="https://ui.quizzman.com/qmf/v3/qmf-compat.min.js"></script>
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/v3/tokens.css">
```

### npm

```bash
# Import compat layer
import QMF from '@qmf/core/compat';

# v2 code still works:
QMF.context.get('user');
QMF.toast.show({ message: 'Hello' });
QMF.eventBus.emit('user:changed', data);
```

---

## What Changed

| v2 (share-ui) | v3 (QMF) |
|---|---|
| Single monolithic file | 11 modular packages |
| Plain JavaScript | TypeScript |
| `QMF.context.get/set` | `QMF.store.getState/setState` |
| No config validation | Zod schema validation |
| CSS inline colors | CSS custom properties (`--qmf-*`) |
| `QMF.plugins.header` | `@qmf/header` package |

---

## API Mapping

### Initialization

```javascript
// ═══ v2 ═══
QMF.runtime.init({ appId: 'my-app', debug: true });

// ═══ v3 ═══
await QMF.init({
  appId: 'my-app',
  debug: true,
  channel: 'production',
  features: { header: true, footer: true }
});
```

### Context / State

```javascript
// ═══ v2 ═══
QMF.context.get('user');
QMF.context.set('user', userData);

// ═══ v3 ═══
QMF.store.getState().user;
QMF.store.setState({ user: userData });

// v3 also supports watch
QMF.store.watch(s => s.user, (newUser) => console.log(newUser));
```

### Event Bus (Compatible!)

```javascript
// ═══ v2 & v3 (Same!) ═══
QMF.eventBus.on('user:changed', handler);
QMF.eventBus.emit('user:changed', { user });

// v3 adds wildcard support
QMF.eventBus.on('user:*', handler);
```

### Toast / Loading

```javascript
// ═══ v2 ═══
QMF.toast.show({ message: 'Hello', type: 'success' });
QMF.loading.show();

// ═══ v3 ═══
import { toast } from '@qmf/ui';
toast({ message: 'Hello', type: 'success' });

import { showLoading, hideLoading } from '@qmf/loading-screen';
showLoading();
```

### Plugins

```javascript
// ═══ v2 ═══
QMF.plugins.header.init({ brandName: 'App' });

// ═══ v3 ═══
import { createHeaderPlugin } from '@qmf/header';
QMF.use(createHeaderPlugin({ brandName: 'App' }));
```

---

## Package Mapping

| v2 API | v3 Package | Import |
|--------|------------|--------|
| `QMF.eventBus` | `@qmf/core` | Compatible |
| `QMF.context` | `@qmf/core` | `QMF.store` |
| `QMF.toast` | `@qmf/ui` | `import { toast }` |
| `QMF.loading` | `@qmf/loading-screen` | Separate module |
| `QMF.plugins.header` | `@qmf/header` | `createHeaderPlugin` |
| `QMF.plugins.footer` | `@qmf/footer` | `createFooterPlugin` |
| `QMF.plugins.notificationCenter` | `@qmf/noti-embed` | Separate module |

---

## CDN URLs

| Version | URL |
|---------|-----|
| **v2 Legacy** | `https://ui.quizzman.com/qmf/v2/qmf.min.js` |
| **v3 Core** | `https://ui.quizzman.com/qmf/v3/qmf.min.js` |
| **v3 + Compat** | `https://ui.quizzman.com/qmf/v3/qmf-compat.min.js` |
| **v3 CSS** | `https://ui.quizzman.com/qmf/v3/tokens.css` |

---

## Step-by-Step Migration

### Step 1: Update Script Tags

**Before (v2):**
```html
<script src="/share-ui/dist/qmf.min.js"></script>
<link rel="stylesheet" href="/share-ui/dist/qmf.min.css">
```

**After (v3):**
```html
<script src="https://ui.quizzman.com/qmf/v3/qmf.min.js"></script>
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/v3/tokens.css">
```

### Step 2: Update Initialization

```javascript
// Before
QMF.runtime.init({ appId: 'my-app' });

// After
await QMF.init({ appId: 'my-app' });
```

### Step 3: Replace context with store

```javascript
// Before
const user = QMF.context.get('user');
QMF.context.set('theme', 'dark');

// After
const { user } = QMF.store.getState();
QMF.store.setState({ theme: 'dark' });
```

### Step 4: Update CSS Variables

```css
/* Before */
.my-btn { background: #6366f1; }

/* After */
.my-btn { background: var(--qmf-color-primary); }
```
import { QMF } from '@qmf/core';
import '@qmf/tokens/tokens.css';
```

## Step 2: Replace Global Namespace

**Before (v2):**
```javascript
window.QMF.eventBus.on('auth:stateChange', handler);
window.QMF.header.updateBadge('chat', 5);
```

**After (v3):**
```typescript
import { getGlobalEventBus } from '@qmf/core';

getGlobalEventBus().on('auth:stateChange', handler);

// Header is now a plugin
import { createHeaderPlugin } from '@qmf/header';
```

## Step 3: Update CSS

**Before (v2):**
```css
.my-button { background: #6366f1; }
```

**After (v3):**
```css
.my-button { background: var(--qmf-color-primary); }
```

## Step 4: Plugin System

**Before (v2):**
```javascript
QMF.loadModule('header', { brandName: 'My App' });
QMF.loadModule('footer');
```

**After (v3):**
```typescript
import { QMF } from '@qmf/core';
import { createHeaderPlugin } from '@qmf/header';
import { createFooterPlugin } from '@qmf/footer';

const qmf = QMF.getInstance();
qmf.use(createHeaderPlugin({ brandName: 'My App' }));
qmf.use(createFooterPlugin());
await qmf.init({ appId: 'my-app', env: 'production' });
```

## Step 5: Auth

**Before (v2):**
```javascript
const token = QMF.auth.getToken();
```

**After (v3):**
```typescript
import { createAuthShellPlugin, AuthShell } from '@qmf/auth-shell';

// As plugin
qmf.use(createAuthShellPlugin({ loginUrl: '...' }));

// Or standalone
const auth = new AuthShell({ loginUrl: '...' });
const token = auth.getToken();
```

## Breaking Changes

1. **No more global `window.QMF`** — use ES module imports
2. **Config is validated** — invalid config now throws errors instead of silently using defaults
3. **CSS tokens renamed** — all custom properties now use `--qmf-*` prefix
4. **Module lifecycle enforced** — modules must follow init→mount→connect→ready→destroy
5. **TypeScript required** — all packages export TypeScript types

## Compatibility

The legacy code is preserved at `_legacy_qmf/` for reference during migration.
