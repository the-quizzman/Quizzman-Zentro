#!/usr/bin/env node
/**
 * Generate / inject Quizzman site-identity JSON-LD into homepage shells.
 *
 * Usage:
 *   node scripts/inject-site-identity.mjs              # write snippets under reports/seo/
 *   node scripts/inject-site-identity.mjs --apply       # inject into known HTML files
 *   node scripts/inject-site-identity.mjs --apply --dry
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'configs/sites.registry.json'), 'utf8'),
);

const ORGANIZATION_ID = REGISTRY.organization['@id'];
const APPLY = process.argv.includes('--apply');
const DRY = process.argv.includes('--dry');

const HOME_ORG_EXTRAS = {
  alternateName: ['Quizzman', 'Quizzman Education'],
  description:
    'Nền tảng giáo dục tương tác với quiz game, hệ thống quản lý học tập (LMS), từ điển Hán-Nôm và các công cụ học tập hiện đại.',
  foundingDate: '2024',
  knowsLanguage: ['vi', 'en', 'zh'],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    url: 'https://quizzman.com/contact',
    availableLanguage: ['Vietnamese', 'English', 'Chinese'],
  },
  areaServed: {
    '@type': 'Country',
    name: 'Vietnam',
  },
  logoWidth: 512,
  logoHeight: 512,
};

/** Known homepage shells to patch (SSR). */
const TARGETS = [
  {
    siteId: 'home',
    files: ['/opt/qm-home/frontend/pages/index.html'],
    mode: 'home',
  },
  {
    siteId: 'app',
    files: ['/opt/qm-app/public/index.html'],
  },
  {
    siteId: 'study',
    files: [
      '/opt/qm-mandarin/Quizzman-mandarin-main/modules/portal/view/home/index.html',
    ],
  },
  {
    siteId: 'lib',
    files: ['/opt/qm-library/services/library-gateway/public/index.html'],
    canonical: 'https://lib.quizzman.com/',
  },
  {
    siteId: 'lab',
    files: ['/opt/qm-lab/frontend/index.html'],
    canonical: 'https://lab.quizzman.com/',
  },
  {
    siteId: 'lms',
    files: ['/opt/qm-lms/apps/shell/public/index.html'],
    canonical: 'https://lms.quizzman.com/',
    robots: 'noindex, nofollow',
  },
  {
    siteId: 'class',
    files: ['/opt/qm-classroom/frontend/index.html'],
    canonical: 'https://class.quizzman.com/',
    robots: 'noindex, nofollow',
  },
  {
    siteId: 'astro',
    files: ['/opt/qm-astro/docs/index.html'],
  },
  {
    siteId: 'search',
    files: ['/opt/qm-search-api/public/index.html'],
    canonical: 'https://search.quizzman.com/',
  },
  {
    siteId: 'legatus',
    files: ['/opt/legatus/web/index.html'],
    mode: 'legatus',
  },
  {
    siteId: 'dict',
    files: [
      '/opt/qm-dictionary/apps/dictionary/index.html',
      '/opt/qm-dictionary/apps/dictionary/dist/index.html',
    ],
    canonical: 'https://dict.quizzman.com/',
  },
  {
    siteId: 'mentis',
    files: ['/opt/qm-mentis-assistant/frontend/index.html'],
    canonical: 'https://mentis.quizzman.com/',
    robots: 'noindex, nofollow',
  },
  {
    siteId: 'play',
    files: ['/opt/qm-play/frontend/pages/play-house.html'],
    mode: 'play',
  },
  {
    siteId: 'ui',
    files: ['/opt/QMF/index.html'],
  },
];

function withSlash(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

function buildOrganizationNode(extras = {}) {
  const org = REGISTRY.organization;
  const node = {
    '@type': org['@type'],
    '@id': ORGANIZATION_ID,
    name: org.name,
    url: withSlash(org.url),
    logo: {
      '@type': 'ImageObject',
      url: org.logo,
    },
    sameAs: [...org.sameAs],
  };
  for (const key of [
    'alternateName',
    'description',
    'foundingDate',
    'knowsLanguage',
    'contactPoint',
    'areaServed',
  ]) {
    if (extras[key] !== undefined) node[key] = extras[key];
  }
  if (extras.logoWidth) node.logo.width = extras.logoWidth;
  if (extras.logoHeight) node.logo.height = extras.logoHeight;
  return node;
}

function buildWebSiteNode(site, extras = {}) {
  const node = {
    '@type': 'WebSite',
    '@id': site.websiteId,
    url: withSlash(site.url),
    name: site.name,
    publisher: { '@id': ORGANIZATION_ID },
  };
  if (extras.inLanguage) node.inLanguage = extras.inLanguage;
  if (extras.description) node.description = extras.description;
  if (extras.potentialAction) node.potentialAction = extras.potentialAction;
  return node;
}

function buildGraph(siteId) {
  const site = REGISTRY.sites[siteId];
  if (!site) throw new Error(`Unknown site: ${siteId}`);
  const graph = [];
  if (site.emitOrganization) {
    graph.push(buildOrganizationNode(HOME_ORG_EXTRAS));
  }
  const websiteExtras =
    siteId === 'home'
      ? {
          inLanguage: ['vi', 'en', 'zh'],
          potentialAction: [
            {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate:
                  'https://dict.quizzman.com/dictionary.html?q={search_term_string}',
              },
              'query-input': 'required name=search_term_string',
            },
          ],
        }
      : {};
  graph.push(buildWebSiteNode(site, websiteExtras));
  return { '@context': 'https://schema.org', '@graph': graph };
}

function renderScript(data, siteId) {
  const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
  return `<script type="application/ld+json" data-qmf-identity="1" data-qmf-site="${siteId}">\n${json}\n</script>`;
}

function ensureCanonical(html, href) {
  if (/rel=["']canonical["']/i.test(html)) {
    return html.replace(
      /(<link[^>]*rel=["']canonical["'][^>]*href=["'])([^"']+)(["'][^>]*>)/i,
      `$1${href}$3`,
    ).replace(
      /(<link[^>]*href=["'])([^"']+)(["'][^>]*rel=["']canonical["'][^>]*>)/i,
      `$1${href}$3`,
    );
  }
  return html.replace(/<\/head>/i, `  <link rel="canonical" href="${href}" />\n</head>`);
}

function ensureRobots(html, content) {
  if (/name=["']robots["']/i.test(html)) {
    return html.replace(
      /(<meta[^>]*name=["']robots["'][^>]*content=["'])([^"']+)(["'][^>]*>)/i,
      `$1${content}$3`,
    );
  }
  return html.replace(
    /<\/head>/i,
    `  <meta name="robots" content="${content}" />\n</head>`,
  );
}

function stripExistingIdentity(html) {
  return html
    .replace(
      /<script\b[^>]*\bdata-qmf-identity=["']1["'][^>]*>[\s\S]*?<\/script>\s*/gi,
      '',
    )
    .replace(
      /<script\b[^>]*\bdata-qmf-site-identity=["']1["'][^>]*>[\s\S]*?<\/script>\s*/gi,
      '',
    );
}

function injectBeforeHeadClose(html, snippet) {
  if (/data-qmf-identity=["']1["']/.test(html)) {
    html = stripExistingIdentity(html);
  }
  if (!/<\/head>/i.test(html)) {
    throw new Error('No </head> found');
  }
  return html.replace(/<\/head>/i, `  ${snippet}\n</head>`);
}

function patchHome(html, siteId) {
  // Remove legacy Organization / WebSite blocks (keep ItemList sitelinks).
  html = html.replace(
    /<!-- Schema\.org: Organization -->\s*<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/i,
    '',
  );
  html = html.replace(
    /<!-- Schema\.org: WebSite \+ SearchAction[\s\S]*?<\/script>\s*/i,
    '',
  );
  // Also strip any prior identity inject
  html = stripExistingIdentity(html);

  const graph = buildGraph(siteId);
  const snippet =
    `<!-- QMF Brand Identity (Organization + WebSite) -->\n  ${renderScript(graph, siteId)}`;
  html = injectBeforeHeadClose(html, snippet);

  // Canonical trailing slash consistency
  html = html.replace(
    /rel="canonical" href="https:\/\/quizzman\.com"/,
    'rel="canonical" href="https://quizzman.com/"',
  );
  return html;
}

function patchLegatus(html, siteId) {
  const site = REGISTRY.sites[siteId];
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      buildWebSiteNode(site),
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://legatus.quizzman.com/#software',
        name: 'Legatus',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: 'https://legatus.quizzman.com/',
        description:
          'Centralized notification and activity hub for the Quizzman ecosystem.',
        isPartOf: { '@id': site.websiteId },
        publisher: { '@id': ORGANIZATION_ID },
      },
    ],
  };
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/i,
    '',
  );
  html = stripExistingIdentity(html);
  return injectBeforeHeadClose(html, renderScript(graph, siteId));
}

function patchPlay(html, siteId) {
  const site = REGISTRY.sites[siteId];
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      buildWebSiteNode(site, {
        description:
          'Game hub for Quizzman — join quizzes, homework and mini-games via code.',
      }),
      {
        '@type': 'CollectionPage',
        '@id': 'https://play.quizzman.com/#collection',
        name: 'Quizzman Play Center',
        url: 'https://play.quizzman.com/',
        description:
          'Game hub for Quizzman — join quizzes, homework and mini-games via code.',
        isPartOf: { '@id': site.websiteId },
        publisher: { '@id': ORGANIZATION_ID },
      },
    ],
  };
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/i,
    '',
  );
  html = stripExistingIdentity(html);
  return injectBeforeHeadClose(html, renderScript(graph, siteId));
}

function patchGeneric(html, target) {
  const site = REGISTRY.sites[target.siteId];
  let out = html;
  if (target.canonical) out = ensureCanonical(out, target.canonical);
  if (target.robots) out = ensureRobots(out, target.robots);
  // For non-indexable shells, keep identity but discourage indexing.
  if (site && site.indexable === false && !target.robots) {
    out = ensureRobots(out, 'noindex, nofollow');
  }
  out = stripExistingIdentity(out);
  const snippet = renderScript(buildGraph(target.siteId), target.siteId);
  return injectBeforeHeadClose(out, snippet);
}

function processTarget(target) {
  const results = [];
  for (const file of target.files) {
    if (!existsSync(file)) {
      results.push({ file, status: 'missing' });
      continue;
    }
    const original = readFileSync(file, 'utf8');
    let next;
    if (target.mode === 'home') next = patchHome(original, target.siteId);
    else if (target.mode === 'legatus') next = patchLegatus(original, target.siteId);
    else if (target.mode === 'play') next = patchPlay(original, target.siteId);
    else next = patchGeneric(original, target);

    results.push({
      file,
      status: original === next ? 'unchanged' : 'updated',
      bytes: next.length,
    });
    if (APPLY && !DRY && original !== next) {
      writeFileSync(file, next);
    }
  }
  return results;
}

function main() {
  const outDir = join(ROOT, 'reports/seo');
  mkdirSync(outDir, { recursive: true });

  const summary = {
    generatedAt: new Date().toISOString(),
    organizationId: ORGANIZATION_ID,
    sameAs: REGISTRY.organization.sameAs,
    sites: {},
    apply: APPLY,
    dry: DRY,
    files: [],
  };

  for (const siteId of Object.keys(REGISTRY.sites)) {
    const graph = buildGraph(siteId);
    const snippet = renderScript(graph, siteId);
    writeFileSync(join(outDir, `${siteId}.jsonld.json`), JSON.stringify(graph, null, 2));
    writeFileSync(join(outDir, `${siteId}.snippet.html`), snippet);
    summary.sites[siteId] = {
      websiteId: REGISTRY.sites[siteId].websiteId,
      indexable: REGISTRY.sites[siteId].indexable,
      classification: REGISTRY.sites[siteId].classification,
    };
  }

  if (APPLY) {
    for (const target of TARGETS) {
      summary.files.push(...processTarget(target));
    }
  }

  writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        apply: APPLY,
        dry: DRY,
        outDir,
        files: summary.files,
      },
      null,
      2,
    ),
  );
}

main();
