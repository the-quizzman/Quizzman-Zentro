# Example AI-Generated Workflow

**Goal:** Add a `settings` module that consumes `auth.session.changed` and produces `settings.theme.changed`.

This is the exact algorithm an AI agent MUST follow (see AI_RULES.md).

---

## Step 0 — Read contract

```bash
cat qmf.schema.json
# Confirm ai.strictConvention=true, eventBus=typed, requireManifest=true
```

---

## Step 1 — Create module via CLI (preferred)

```bash
qmf create module settings --description "Theme and language preferences"
qmf doctor
```

Atomic result:

- `src/modules/settings/{module,config,state,service,events,view}.js`
- `src/modules/settings/manifest.json`
- `qmf.schema.json` modules[] includes `settings`

---

## Step 2 — Define events

Edit `events.js`:

```js
export const SettingsThemeChanged = defineEvent({
  name: 'settings.theme.changed',
  namespace: 'settings',
  version: 1,
  description: 'User changed color theme.',
  payload: {
    type: 'object',
    required: ['theme'],
    properties: { theme: { type: 'string', enum: ['light', 'dark', 'system'] } },
  },
  producers: ['settings'],
  consumers: ['dictionary'],
});
```

Subscribe to `AuthSessionChanged` from `../auth/events.js` (events-only import).

Update `manifest.json` produces/consumes.

---

## Step 3 — Wire plugin

In `module.js`: `createSettingsPlugin`, register service, mount view, emit on toggle.

---

## Step 4 — Verify without reading unrelated source

```bash
qmf inspect modules
qmf inspect events
qmf inspect graph --format mermaid
qmf doctor --strict
```

---

## Step 5 — Agent self-check

| Check | Pass? |
|-------|-------|
| 7 files present | |
| Schema patched | |
| No magic strings | |
| No sibling service imports | |
| Doctor exit 0 | |

---

## Anti-workflow (forbidden)

1. Create `src/features/settings`  
2. Emit `'theme:changed'` string  
3. Skip manifest  
4. Import `auth/service.js` from settings  

---

## Expected inspect excerpt

```json
{
  "modules": ["auth", "dictionary", "settings"],
  "events": [
    "auth.session.changed",
    "dictionary.search",
    "settings.theme.changed"
  ]
}
```
