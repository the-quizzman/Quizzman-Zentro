# QMF Shell

Thin **bootstrap** for Quizzman header + auth + plugins. Not a God Object — UI lives in modules.

## Consumer (stable URL — users do **not** need hard refresh)

```html
<script src="https://ui.quizzman.com/qmf/dist/modules/shell/qmf-shell.js"></script>
<script>
  QMFShell.mount({
    headerRoot: '#qmf-header',
    brandName: 'Quizzman',
    pageTitle: 'My App',
    plugins: ['legatus'],
  });
</script>
```

- `qmf-shell.js` = **loader** (`Cache-Control: no-store`) — always revalidated
- `qmf-shell.rev` = plain REV string (`Cache-Control: no-store`) — fleet soft-reload signal
- Loader pulls `qmf-shell.runtime.js?v=<REV>` (immutable)
- Publish = bump `REV` in loader + runtime + `.rev`; open tabs soft-reload within ~60s / on focus
- If load fails / stale cache / REV mismatch, loader **soft-reloads once** (`?_qmf=<rev>`)
- **Principle:** never ask end users to hard-refresh — use `QMFShell.softReload(reason)`
  (prefs lang/region, package bumps). Theme applies live without reload.

Optional before load: `window.QMF_BASE = 'https://staging-ui.example'`.

## Pipeline

`resolveBase → prefs-detect → waitSSO → mountHeader → mountWidget → plugins → qmf:auth`

`prefs-detect` fills missing lang/theme/region for first-time guests (browser locale + `prefers-color-scheme` + timezone). Logged-in account prefs still win via auth-widget hydrate.

## Version (two tiers)

```js
QMFShell.version()
// { shell: '2.0.1', packages: { header, auth, legatus, sso } }
```

## Events

Listen to **`qmf:auth`** only — `ready` | `logout` | `refresh` | `expired`.

## API

`mount` · `version` · `user` · `refresh` · `softReload` · `logout` · `destroy` · `registry.register`

```js
QMFShell.softReload('prefs:lang') // location.replace(?_qmf=<rev>&_t=…)
```
