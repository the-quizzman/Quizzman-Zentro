# QMF Ads (AdSense)

Shared Google AdSense runtime for every Quizzman page that loads QMF Shell.

**Publisher ID:** `ca-pub-9878200690154577` (centralized; applications cannot override)

## Auto (recommended)

Any page with:

```html
<script src="https://ui.quizzman.com/qmf/dist/modules/shell/qmf-shell.js"></script>
```

gets the ads runtime automatically (non-blocking). On production it injects Google's snippet:

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9878200690154577"
        crossorigin="anonymous"></script>
```

`adsbygoogle.js` is loaded at most once. Ad units (`<ins>` + `push`) are created only when entitlement says ads are allowed.

Applications **must declare** slot positions. The shell does not auto-insert ad units into every page.

```html
<qmf-ad-slot type="in-content"></qmf-ad-slot>
```

```js
QmfAds.mountSlot(container, { type: 'in-content' });
```

Do not call `adsbygoogle.push` from applications.

## Entitlement

```text
FREE      → ads enabled
PRO       → ads disabled
ADVANCED  → ads disabled
```

Paid / unknown plans fail closed (`ads: false`) unless `entitlement.ads === true`.

```js
QmfAds.resolveEntitlement(user); // { ads, reason, tier }
QmfAds.adsEnabled();
```

Guests (auth settled, no user) are treated as FREE.

## Controls

| Flag | Effect |
|------|--------|
| `window.QMF_ADS = false` | Disable |
| `window.QMF_DISABLE_ADS = true` | Disable |
| `window.QMF_ADS = true` | Force on (incl. localhost) |

Set flags **before** loading shell. Localhost / private IPs / staging / `.local` skip AdSense by default.

Never loaded on:

- `id.quizzman.com`
- `app.quizzman.com`
- `join.quizzman.com`
- live quiz / homework paths: `/quiz`, `/live`, `/host`, `/homework`, `/assignment`, `/quiz-editor`

Do not place slots in editor, CMS, admin, auth, payment, or quiz-taking flows. Prefer SEO / dictionary / article pages.
