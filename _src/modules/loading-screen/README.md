# QMF Bootstrap / Loading Screen

Fullscreen splash — **runtime bootstrap** (default) or legacy **flashcard** variant.

## Philosophy

This is **not** “loading the app”. It is the **framework bootstrapping the runtime**:

> Initializing QMF Runtime · Bootstrapping Quizzman Meta Framework

## CDN

```html
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/loading-screen/loading-screen.css?v=2.0.0">
<script src="https://ui.quizzman.com/qmf/dist/modules/loading-screen/loading-screen.js?v=2.0.0"></script>
```

## Runtime bootstrap (default)

```js
const boot = createQmfBootstrapScreen({
  presentation: 'status', // or 'log'
  runtimeVersion: '4.0',
  stages: [
    'Initializing runtime…',
    'Loading Theme Engine…',
    'Loading Design Tokens…',
    'Initializing Component Registry…',
    'Preparing Event Bus…',
    'Connecting Identity…',
    'Ready',
  ],
});

// drive from real boot phases
boot.setStage(2);
boot.setProgress(40);

await boot.hide(); // footer → "Ready in N ms"
```

### Static first paint

```html
<body>
  <script>window.__qmLoadStart = Date.now(); document.documentElement.classList.add('qm-load-active');</script>
  <script>
    document.write(buildQuizzmanBootLoaderHtml({
      variant: 'runtime',
      message: 'Initializing QMF Runtime…',
      runtimeVersion: '4.0',
    }));
  </script>
</body>
```

Or hide later:

```js
await hideQuizzmanBootLoader({ readyText: 'QMF Ready' });
```

## API

| Method | Role |
|--------|------|
| `createQmfBootstrapScreen(cfg)` | Runtime variant |
| `createQuizzmanLoadingScreen(cfg)` | Same factory (`variant: 'runtime'\|'flashcard'`) |
| `setMessage` / `setStage` / `setProgress` | Drive status + thin 2px line |
| `hide()` | Show ready timing, fade out |
| `buildQuizzmanBootLoaderHtml` | Static HTML shell |
| `hideQuizzmanBootLoader` | Fade static `#qm-initial-loading` |

## Legacy flashcard

```js
createQuizzmanLoadingScreen({ variant: 'flashcard', brandName: 'Quizzman', appLogoUrl: '…' });
```

## Copy guidelines

Prefer:

- Initializing QMF Runtime
- Bootstrapping Quizzman Meta Framework
- Preparing QMF Environment
- Đang khởi tạo Quizzman Meta Framework…

Avoid: “Đang khởi tạo QMF cho QMF”.
