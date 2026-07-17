# Initiative 3 — Typed Event System (`EVENT_SPEC`)

**Status:** QMF 4.0 Canonical  
**Package surface:** `@qmf/core/events`  
**JSON Schema:** [`schemas/event.schema.json`](./schemas/event.schema.json)

---

## Purpose

Eliminate magic strings, anonymous payloads, and undocumented events.

Every event has: namespace · payload schema · description · producer · consumer · version.

Runtime validation on emit (and optionally on subscribe handler input).

---

## Architecture

```
defineEvent(def) → EventType<T>
        │
        ├─► registry (global, inspectable)
        ├─► emit(event, payload) → schema validate → bus
        └─► subscribe(event, handler) → typed handler
```

When `qmf.schema.json → eventBus = "typed"`:

- String `emit('foo')` throws in dev / doctor fails in CI  
- Legacy bus available only if `eventBus: "legacy"`  

---

## API

### `defineEvent`

```js
import { defineEvent } from '@qmf/core/events';

export const DictionarySearch = defineEvent({
  name: 'dictionary.search',
  namespace: 'dictionary',
  version: 1,
  description: 'User submitted a dictionary search query.',
  payload: {
    type: 'object',
    required: ['keyword', 'source'],
    properties: {
      keyword: { type: 'string', minLength: 1 },
      source: { type: 'string', enum: ['header', 'sidebar', 'api'] },
    },
  },
  producers: ['dictionary'],
  consumers: ['analytics', 'settings'],
});

```

**Rules:**

- `name` MUST start with `namespace + '.'`  
- `producers` min 1  
- Re-define same name+version with different schema → throw  

### `emit`

```js
import { emit } from '@qmf/core/events';
import { DictionarySearch } from './events';

emit(DictionarySearch, { keyword: '学', source: 'header' });
// Invalid payload → QMFEventPayloadError
```

### `subscribe` / `unsubscribe`

```js
import { subscribe, unsubscribe } from '@qmf/core/events';

const off = subscribe(DictionarySearch, (payload, meta) => {
  // payload validated; meta: { version, at, producer? }
});

unsubscribe(DictionarySearch, handler);
// or off()
```

### `trace` / `debug` / `inspect`

```js
import { events } from '@qmf/core';

events.trace.enable();
events.trace.print(20);
events.debug.list();           // all registered defs
events.inspect('dictionary.*'); // filter
```

Runtime also exposes:

```js
QMF.inspect.events()
```

---

## Folder Structure

Per module:

```
modules/<id>/events.js     # all defineEvent for this module
```

Optional app-level shared:

```
src/runtime/events/app.js  # namespace "app" or "qmf" only
```

---

## Examples

See [`examples/app/src/modules/dictionary/events.js`](./examples/app/src/modules/dictionary/events.js).

---

## Migration Notes

| v3 | v4 |
|----|-----|
| `eventBus.emit('auth:stateChange', user)` | `emit(AuthSessionChanged, { ... })` |
| `eventBus.on('auth:*', fn)` | `subscribe` per event or `subscribePattern` with typed map |
| Undocumented payloads | JSON Schema required |

Compat shim:

```js
// only when eventBus: "legacy"
QMF.eventBus.emit('auth:stateChange', data);
```

Codemod: `qmf migrate events`.

---

## Implementation Roadmap

| Step | Work |
|------|------|
| 3.1 | `defineEvent` + registry |
| 3.2 | JSON Schema validate on emit |
| 3.3 | Trace/debug/inspect |
| 3.4 | Doctor magic-string scan |
| 3.5 | Wildcard typed subscribe helpers |

---

## Anti-Patterns

| Anti-pattern | Fix |
|--------------|-----|
| `emit('dictionary.search', …)` | `emit(DictionarySearch, …)` |
| Payload without schema | JSON Schema object |
| Event without producers | Add owner module |
| Breaking field change at same version | Bump version; dual-publish transition |

---

## Performance

- schema validate cost: keep payloads shallow; avoid giant nested objects on hot paths  
- Registry lookup O(1) by event identity (symbol/object ref), not string scan  
- Trace buffer ring ≤ 200 events by default  

---

## AI Generation Notes

1. Create `defineEvent` in `events.js` before any emit.  
2. Update `manifest.json` produces/consumes.  
3. Name = `<moduleId>.<action>`.  
4. Description ≥ 8 chars, meaningful for inspect.  
5. Never invent events consumed by nobody without documenting future consumer.  
