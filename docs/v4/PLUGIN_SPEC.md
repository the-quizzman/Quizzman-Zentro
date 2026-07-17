# PLUGIN_SPEC — QMF 4.0 Plugin System

**Status:** Canonical  
**Runtime:** PluginLoader · LifecycleManager · ErrorBoundary

---

## Purpose

Modules ship as plugins with declared dependencies, lazy loading, and error isolation.

---

## API

```js
import { QMF, lazy } from '@qmf/core';
import { createAuthPlugin } from './modules/auth/module';

QMF.use(createAuthPlugin({ loginUrl: 'https://id.quizzman.com/login' }));
QMF.use(lazy(() => import('./modules/dictionary/module').then(m =>
  m.createDictionaryPlugin({ apiBase: '/api/dict' })
)));

await QMF.initFromContract('./qmf.schema.json');
```

### Plugin shape

```js
interface QMFPlugin {
  name: string;
  version?: string;
  dependencies?: string[];
  hooks?: LifecycleHooks;
  setup?(ctx: PluginContext): void | Promise<void>;
}
```

`PluginContext`: `{ container, eventBus, store, config, root?, inspect }`.

---

## Rules

1. Plugin `name` = module id = manifest `name`.  
2. Dependencies must match manifest.  
3. One crash → ErrorBoundary; others continue; emit `module:error`.  
4. Lazy plugins resolve before init completes (parallel `allSettled`).  

---

## Anti-Patterns

- Side effects at import time (defer to hooks)  
- Catching and swallowing init errors silently  
- Circular `dependencies`  

---

## Migration

v3 `createXxxPlugin` continues; add manifests + contract registration.

---

## AI Notes

`qmf create plugin` ≡ `qmf create module`. Export `create<PascalId>Plugin`.  
