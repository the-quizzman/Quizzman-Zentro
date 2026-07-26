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
- Loader pulls `qmf-shell.runtime.js?v=<REV>` (immutable)
- Publish = bump `REV` inside the loader only; next page view picks it up automatically
- If load fails / stale cache, loader **soft-reloads once** (`?_qmf=<rev>`)

Optional before load: `window.QMF_BASE = 'https://staging-ui.example'`.

## Pipeline

`resolveBase → loadModules → waitSSO → mountHeader → mountWidget → plugins → qmf:auth`

## Version (two tiers)

```js
QMFShell.version()
// { shell: '2.0.1', packages: { header, auth, legatus, sso } }
```

## Events

Listen to **`qmf:auth`** only — `ready` | `logout` | `refresh` | `expired`.

## API

`mount` · `version` · `user` · `refresh` · `logout` · `destroy` · `registry.register`
