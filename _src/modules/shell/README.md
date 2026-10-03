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
- Cache mechanism (no service worker, no CDN purge): [CACHE.md](CACHE.md)
- Publish = bump `REV` in loader + runtime + `.rev`; open tabs soft-reload within ~60s / on focus
- **Editors / live / games** (`/quiz-editor`, `/slide-studio`, `/live/`, `/host`, `/tycoon`, `/arena`, …): fleet REV bump shows **one dismissible English notice** — no auto-reload while working or playing. Opt-in: `window.QMF_SOFT_RELOAD_DEFER = true`.
- Other pages still soft-reload on fleet REV; prefs lang/region still reload everywhere (when not typing).
- If load fails / stale cache / REV mismatch, loader **soft-reloads once** (`?_qmf=<rev>`)
- **Principle:** never ask end users to hard-refresh — use `QMFShell.softReload(reason)`
  (prefs lang/region, package bumps). Theme applies live without reload.
- **GA4:** loader also pulls `modules/analytics/gtag.js` (non-blocking). Opt-out: `window.QMF_GTAG = false` before shell.
- **Consent Mode v2:** loader applies consent defaults synchronously before gtag/AdSense. EEA/UK/CH denied until Google CMP; elsewhere granted. Opt-out: `window.QMF_CONSENT_MODE = false`.
- **Ads:** loader also pulls `modules/ads/ads.js` (non-blocking). On production that injects the official AdSense snippet (`adsbygoogle.js?client=ca-pub-9878200690154577`, async, `crossorigin="anonymous"`) at most once. Apps place `<qmf-ad-slot type="in-content">` for ad units. Opt-out: `window.QMF_ADS = false`.

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

Listen to **`qmf:auth`** — `ready` | `guest` | `logout` | `refresh` | `expired`.

`guest` fires when auth has settled with no user (login chip). Ads uses this; do not treat it as a logged-in session.

## Ads

Apps declare slots; the shell does not auto-insert ads. Paid tiers never render `<ins>` or call `adsbygoogle.push`.

```html
<qmf-ad-slot type="in-content"></qmf-ad-slot>
```

```js
QmfAds.mountSlot(el, { type: 'in-content' });
```

## API

`mount` · `version` · `user` · `refresh` · `softReload` · `logout` · `destroy` · `registry.register`

```js
QMFShell.softReload('prefs:lang') // location.replace(?_qmf=<rev>&_t=…)
```
