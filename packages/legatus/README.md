# @qmf/legatus

Official QMF module for Quizzman notification & realtime UI.

## Install (monorepo)

```bash
pnpm add @qmf/legatus
```

## Plugin

```ts
import { createLegatusPlugin } from '@qmf/legatus';

QMF.use(createLegatusPlugin({
  endpoint: 'https://legatus.quizzman.com',
  mountTo: '#header-actions',
}));
```

## Standalone

```html
<script src="https://ui.quizzman.com/qmf/dist/legatus/legatus.min.js"></script>
```

## Components

Bell, notification center, toast, WebSocket client, client event bus — see [Legatus SDK_UI.md](../../../legatus/docs/SDK_UI.md).
