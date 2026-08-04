# QMF prefs-detect

First-visit bootstrap for **language**, **theme (mode)**, and **region (locale)**.

## Precedence

1. **Account** settings (logged-in) — auth-widget hydrate / `applyAccount`
2. **Explicit** `localStorage` / `qmf-lang` cookie (user chose before)
3. **Browser detect** — `navigator.languages`, `prefers-color-scheme`, timezone
4. Defaults — `en` / `light` / region from lang map (`vi`→`VN`, …)

Missing keys only are filled. Never overwrites stored or account prefs.

## Load

```html
<script src="https://ui.quizzman.com/qmf/dist/modules/prefs-detect/prefs-detect.js?v=1.0.0"></script>
<script>
  QmfPrefsDetect.bootstrap();
</script>
```

QMFShell loads this automatically early in `mount()` (before SSO / header / auth).

Disable: `QMFShell.mount({ prefs: false })`.

## API

| Method | Notes |
|--------|--------|
| `bootstrap(opts?)` | Fill gaps; `opts.force` re-detect |
| `mount(opts?)` | `bootstrap` + watch account events |
| `detectLang()` / `detectTheme()` / `detectRegion(lang?)` | Pure detect |
| `applyAccount(user)` | Apply account prefs + mark source |
| `getLang()` / `getTheme()` / `getRegion()` / `getPrefs()` | Current |

## Storage

Writes (when detecting): `qmf-lang`, `lab-lang`, `lab-ui-lang`, `qss_ui_lang`, `qmf-lang` cookie, `qmf-theme`, `lab-theme`, `qmf-region`, `qlib-region`, `qmf-prefs-source=detect`.

## Events

Emits `qmf:prefs-change` (+ lang/theme/region events) with `source: 'detect'` only when keys were filled.
