# QMF i18n-dom

Shared **data-i18n** apply + prefs sync (`lang` / `theme` / `region`) for Quizzman subdomains.

## Load

```html
<script src="https://ui.quizzman.com/qmf/dist/modules/i18n-dom/i18n-dom.js"></script>
<script>
  QmfI18n.mount({ packs: ['common', 'app'] });
</script>
```

## Attributes

| Attribute | Effect |
|-----------|--------|
| `data-i18n="key"` | textContent from pack |
| `data-i18n-html` | innerHTML |
| `data-i18n-title` | title (+ aria-label if present) |
| `data-i18n-placeholder` | placeholder |
| `data-i18n-aria` | aria-label |
| `data-i18n-fallback` | fallback before pack / missing key |

Nested keys: `app.section.createContent`.

## Packs

```
packs/
  common/{vi,en,zh,zht,jp,kr}.json   # shared chrome
  app/...                            # app.quizzman.com landing
  assignment|quiz-editor|classroom-tools|lms|…  # skeletons (empty → fill later)
```

`_meta.status`: `seed` | `skeleton` | `empty`

## Events

Listens: `qmf:langchange`, `qmf:lang-change`, `qmf:themechange`, `qmf:region-change`, `qmf:prefs-change`, `qmf:auth`  
Emits: `qmf:i18n-applied`  
Storage: `qmf-lang`, `lab-lang`, `lab-ui-lang`, `qss_ui_lang`, `qmf-theme`, `qmf-region`

## Soft-reload

Lang/region resync across heavy apps uses `QMFShell.softReload` — do not ask users to hard-refresh.
