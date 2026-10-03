# QMF Analytics (GA4 / gtag)

Shared Google Analytics 4 for every Quizzman page that loads QMF Shell.

**Measurement ID:** `G-KBKFY8LX2F`  
**Module version:** `1.1.0` (Consent Mode v2)

## Auto (recommended)

Any page with:

```html
<script src="https://ui.quizzman.com/qmf/dist/modules/shell/qmf-shell.js"></script>
```

gets GA4 automatically (non-blocking). No per-page snippet needed.

Shell applies **Consent Mode v2 defaults synchronously** before loading gtag / AdSense.

## Standalone (legacy pages without shell)

```html
<script src="https://ui.quizzman.com/qmf/dist/modules/analytics/gtag.js?v=1.1.0"></script>
```

## Consent Mode v2

| Region | Default |
|--------|---------|
| EEA / UK / CH | `denied` until Google CMP (Privacy & Messaging) updates |
| Elsewhere | `granted` (no banner) |

Signals: `ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`.

Also sets `url_passthrough` + `ads_data_redaction` (disable with `QMF_CONSENT_URL_PASSTHROUGH = false` / `QMF_CONSENT_ADS_REDACTION = false`).

```js
QmfGtag.updateConsent({ analytics_storage: 'granted', ad_storage: 'granted', … });
QmfGtag.grantAll();
QmfGtag.denyAll();
```

Listen: `window.addEventListener('qmf:consent', …)`.

## Controls

| Flag | Effect |
|------|--------|
| `window.QMF_GTAG = false` | Disable |
| `window.QMF_DISABLE_ANALYTICS = true` | Disable |
| `window.QMF_GTAG = true` | Force on (incl. localhost) |
| `window.QMF_GTAG_ID = 'G-…'` | Override measurement ID |
| `window.QMF_CONSENT_MODE = false` | Skip consent defaults |
| `window.QMF_CONSENT_WAIT = 500` | CMP wait_for_update (ms) |
| `window.QMF_CONSENT_DEFAULT = {…}` | Replace default consent object |

Set flags **before** loading shell / gtag.js.

Localhost / private IPs / `.local` are skipped by default.

On `*.quizzman.com`, `cookie_domain` is set to `quizzman.com` so one GA cookie covers home, lab, id, search, etc.

## API

```js
QmfGtag.init();
QmfGtag.pageview('/path');       // SPA virtual page_view
QmfGtag.event('sign_up', { method: 'google' });
```
