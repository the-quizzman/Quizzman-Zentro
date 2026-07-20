# QMF Bootstrap / Loading Screen

Fullscreen splash — **runtime bootstrap** (default) or **flashcard** app splash (fullscreen / no-card by default).

## Philosophy

This is **not** “loading the app”. It is the **framework bootstrapping the runtime**:

> Initializing QMF Runtime · Bootstrapping Quizzman Meta Framework

App splash (`variant: 'flashcard'`) shows the **app logo + brand + wavy path** on a full-bleed background — **no card**. Pass a per-app `palette`.

## CDN

```html
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/loading-screen/loading-screen.css?v=2.1.0">
<script src="https://ui.quizzman.com/qmf/dist/modules/loading-screen/loading-screen.js?v=2.1.0"></script>
```

## App splash (flashcard) — recommended for product frontends

```js
const boot = createQuizzmanLoadingScreen({
  variant: 'flashcard',
  layout: 'fullscreen', // default — no card
  brandName: 'Quiz Editor',
  appLogoUrl: '/quiz-editor/icons/logo-128.png',
  message: 'Starting…',
  theme: 'light',
  palette: {
    primary: '#3F5EFB',
    secondary: '#FF7A45',
    accent: '#6366f1',
    background: '#f7f8ff',
    brand: '#1e293b',
    text: '#64748b',
  },
});

await boot.hide();
```

### Static first paint + CSS variables

```html
<link rel="stylesheet" href="…/loading-screen.css?v=2.1.0">
<style>
  #qm-initial-loading {
    --qm-load-primary: #3F5EFB;
    --qm-load-secondary: #FF7A45;
    --qm-load-accent: #6366f1;
    --qm-load-bg: #f7f8ff;
    --qm-load-brand: #1e293b;
    --qm-load-msg: #64748b;
  }
</style>
<div id="qm-initial-loading" class="qm-load qm-load--boot qm-load--fullscreen" role="status">
  <!-- logo / brand / map / msg -->
</div>
<script src="…/loading-screen.js?v=2.1.0"></script>
<script>
  await hideQuizzmanBootLoader({ readyText: 'Ready' });
</script>
```

Legacy card layout (opt-in only):

```js
createQuizzmanLoadingScreen({ variant: 'flashcard', layout: 'card', … });
```

## Runtime bootstrap

```js
const boot = createQmfBootstrapScreen({
  presentation: 'status', // or 'log'
  runtimeVersion: '4.0',
  palette: { primary: '#7da6ff', secondary: '#c9d6ff', background: '#0b1020' },
  stages: [
    'Initializing runtime…',
    'Loading Theme Engine…',
    'Ready',
  ],
});

boot.setStage(2);
await boot.hide();
```

## API

| Method | Role |
|--------|------|
| `createQmfBootstrapScreen(cfg)` | Runtime variant |
| `createQuizzmanLoadingScreen(cfg)` | Same factory (`variant: 'runtime'\|'flashcard'`) |
| `palette` | `{ primary, secondary, accent, background, brand, text, muted, glow }` |
| `layout` | flashcard: `'fullscreen'` (default) \| `'card'` (legacy) |
| `setMessage` / `setStage` / `setProgress` | Drive status + progress |
| `hide()` | Show ready timing, fade out |
| `buildQuizzmanBootLoaderHtml` | Static HTML shell |
| `hideQuizzmanBootLoader` | Fade static `#qm-initial-loading` |

## CSS variables

| Variable | Role |
|----------|------|
| `--qm-load-primary` / `--secondary` / `--accent` | Path gradient stops |
| `--qm-load-bg` / `--qm-load-bg-glow` | Fullscreen background |
| `--qm-load-brand` / `--qm-load-msg` | Title + status text |
| `--qm-boot-primary` / `--secondary` / `--bg` / `--glow` | Runtime mark + progress |

## Copy guidelines

Prefer:

- Initializing QMF Runtime
- Bootstrapping Quizzman Meta Framework
- Preparing QMF Environment
- Đang khởi tạo Quizzman Meta Framework…

Avoid: “Đang khởi tạo QMF cho QMF”.
