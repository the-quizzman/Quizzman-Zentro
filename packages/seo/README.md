# @qmf/seo — Quizzman Brand Identity

Config-driven Organization + WebSite structured data for the Quizzman ecosystem.

## Canonical identities

| Entity | `@id` |
|--------|-------|
| Organization | `https://quizzman.com/#organization` |
| Home WebSite | `https://quizzman.com/#website` |
| Study WebSite | `https://study.quizzman.com/#website` |
| … | `https://{host}/#website` |

Official `sameAs` (external only — never Quizzman subdomains):

- https://github.com/the-quizzman
- https://www.tiktok.com/@quizzman.com
- https://www.youtube.com/@quizzman.official

## Registry

`/opt/QMF/configs/sites.registry.json` is the SSOT for hosts, names, indexability, and classification.

## API

```js
import {
  siteIdentity,
  buildGraphForHost,
  renderJsonLdScript,
  ORGANIZATION_ID,
} from '@qmf/seo';

const graph = siteIdentity({
  name: 'Quizzman Study',
  url: 'https://study.quizzman.com/',
  websiteId: 'https://study.quizzman.com/#website',
  publisherId: ORGANIZATION_ID,
});
```

CDN browser module:

```html
<script src="https://ui.quizzman.com/qmf/dist/modules/seo/qmf-seo.js"></script>
<script>
  // Prefer SSR. Client API for explicit surfaces:
  QMF.siteIdentity({
    name: 'Quizzman Study',
    url: 'https://study.quizzman.com/',
    websiteId: 'https://study.quizzman.com/#website',
    publisherId: 'https://quizzman.com/#organization'
  });
</script>
```

Structured data must appear in initial SSR HTML — do not rely on this module alone after hydration.
