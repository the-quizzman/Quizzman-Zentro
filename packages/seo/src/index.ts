/**
 * @qmf/seo — Quizzman brand identity + Schema.org graph builders.
 *
 * SSOT Organization @id: https://quizzman.com/#organization
 * Each product host declares WebSite @id: https://{host}/#website
 * publisher → Organization @id (never duplicate Organization on subdomains).
 */

import registryJson from './registry.json';

export const ORGANIZATION_ID = 'https://quizzman.com/#organization' as const;
export const HOME_WEBSITE_ID = 'https://quizzman.com/#website' as const;

export type SiteClassification =
  | 'brand-root'
  | 'product-surface'
  | 'authenticated-app'
  | 'public-docs-and-cdn'
  | 'infrastructure';

export interface SiteConfig {
  id: string;
  host: string;
  name: string;
  url: string;
  websiteId: string;
  type: 'WebSite';
  indexable: boolean;
  emitOrganization?: boolean;
  classification: SiteClassification;
  notes?: string;
}

export interface OrganizationConfig {
  '@id': string;
  '@type': string;
  name: string;
  url: string;
  logo: string;
  sameAs: string[];
}

export interface SiteRegistry {
  version: string;
  organization: OrganizationConfig;
  sites: Record<string, SiteConfig>;
}

export const SITE_REGISTRY = registryJson as SiteRegistry;

export const OFFICIAL_SAME_AS = [
  'https://github.com/the-quizzman',
  'https://www.tiktok.com/@quizzman.com',
  'https://www.youtube.com/@quizzman.official',
  'https://www.facebook.com/quizzman.official',
] as const;

export interface SiteIdentityInput {
  name: string;
  url: string;
  websiteId?: string;
  publisherId?: string;
  /** When true (home only), include Organization node in the graph. */
  includeOrganization?: boolean;
  description?: string;
  inLanguage?: string | string[];
}

function normalizeHost(host: string): string {
  return String(host || '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
    .replace(/^www\./, '');
}

export function listSites(): SiteConfig[] {
  return Object.values(SITE_REGISTRY.sites);
}

export function getSiteById(id: string): SiteConfig | null {
  return SITE_REGISTRY.sites[id] || null;
}

export function resolveSiteByHost(hostname: string): SiteConfig | null {
  const host = normalizeHost(hostname);
  if (!host) return null;
  for (const site of listSites()) {
    if (normalizeHost(site.host) === host) return site;
  }
  // apex / www
  if (host === 'www.quizzman.com') return SITE_REGISTRY.sites.home;
  return null;
}

export function websiteIdForUrl(url: string): string {
  const u = new URL(url, 'https://quizzman.com');
  const origin = `${u.protocol}//${u.host}`;
  return `${origin}/#website`;
}

/** Canonical Organization node (home only). Deterministic — no timestamps/IDs. */
export function buildOrganizationNode(
  extras: Record<string, unknown> = {},
): Record<string, unknown> {
  const org = SITE_REGISTRY.organization;
  const logoUrl = org.logo;
  const node: Record<string, unknown> = {
    '@type': org['@type'] || 'EducationalOrganization',
    '@id': ORGANIZATION_ID,
    name: org.name,
    url: org.url.endsWith('/') ? org.url : `${org.url}/`,
    logo: {
      '@type': 'ImageObject',
      url: logoUrl,
    },
    sameAs: [...(org.sameAs?.length ? org.sameAs : OFFICIAL_SAME_AS)],
  };

  // Preserve known valid extras from homepage when provided (no invention).
  for (const key of [
    'alternateName',
    'description',
    'foundingDate',
    'knowsLanguage',
    'contactPoint',
    'areaServed',
  ] as const) {
    if (extras[key] !== undefined) node[key] = extras[key];
  }

  if (extras.logoWidth || extras.logoHeight) {
    const logo = node.logo as Record<string, unknown>;
    if (extras.logoWidth) logo.width = extras.logoWidth;
    if (extras.logoHeight) logo.height = extras.logoHeight;
  }

  return node;
}

export function buildWebSiteNode(input: SiteIdentityInput): Record<string, unknown> {
  const url = input.url.endsWith('/') ? input.url : `${input.url.replace(/\/?$/, '/')}`;
  const websiteId = input.websiteId || websiteIdForUrl(url);
  const publisherId = input.publisherId || ORGANIZATION_ID;

  const node: Record<string, unknown> = {
    '@type': 'WebSite',
    '@id': websiteId,
    url,
    name: input.name,
    publisher: { '@id': publisherId },
  };

  if (input.description) node.description = input.description;
  if (input.inLanguage) node.inLanguage = input.inLanguage;

  return node;
}

export function buildSiteIdentityGraph(
  input: SiteIdentityInput,
): Record<string, unknown> {
  const graph: Record<string, unknown>[] = [];

  if (input.includeOrganization) {
    graph.push(buildOrganizationNode());
  }

  graph.push(buildWebSiteNode(input));

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function buildGraphForSiteId(
  siteId: string,
  extras: { description?: string; inLanguage?: string | string[]; organizationExtras?: Record<string, unknown> } = {},
): Record<string, unknown> | null {
  const site = getSiteById(siteId);
  if (!site) return null;

  const graph: Record<string, unknown>[] = [];
  if (site.emitOrganization) {
    graph.push(buildOrganizationNode(extras.organizationExtras || {}));
  }
  graph.push(
    buildWebSiteNode({
      name: site.name,
      url: site.url,
      websiteId: site.websiteId,
      publisherId: ORGANIZATION_ID,
      description: extras.description,
      inLanguage: extras.inLanguage,
    }),
  );

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function buildGraphForHost(
  hostname: string,
  extras: { description?: string; inLanguage?: string | string[] } = {},
): Record<string, unknown> | null {
  const site = resolveSiteByHost(hostname);
  if (!site) return null;
  return buildGraphForSiteId(site.id, extras);
}

/** Serialize deterministic JSON-LD (stable key order for objects we control). */
export function serializeJsonLd(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

export function renderJsonLdScript(data: unknown, attrs: Record<string, string> = {}): string {
  const attrStr = Object.entries({
    type: 'application/ld+json',
    'data-qmf-identity': '1',
    ...attrs,
  })
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
    .join(' ');
  // Prevent </script> breakouts in descriptions
  const body = serializeJsonLd(data).replace(/</g, '\\u003c');
  return `<script ${attrStr}>\n${body}</script>`;
}

export function renderSiteIdentityHtml(
  siteId: string,
  extras: { description?: string; inLanguage?: string | string[]; organizationExtras?: Record<string, unknown> } = {},
): string | null {
  const graph = buildGraphForSiteId(siteId, extras);
  if (!graph) return null;
  return renderJsonLdScript(graph, { 'data-qmf-site': siteId });
}

/**
 * Browser/runtime API — generate identity graph from explicit surface metadata.
 * Prefer SSR injection; this API is for apps that already own a document shell.
 */
export function siteIdentity(input: SiteIdentityInput): Record<string, unknown> {
  return buildSiteIdentityGraph({
    ...input,
    publisherId: input.publisherId || ORGANIZATION_ID,
    websiteId: input.websiteId || websiteIdForUrl(input.url),
  });
}

/** Idempotent DOM inject (client). Does not replace existing data-qmf-identity blocks. */
export function ensureSiteIdentityInDocument(
  input: SiteIdentityInput,
  doc: Document = typeof document !== 'undefined' ? document : (null as unknown as Document),
): boolean {
  if (!doc?.head) return false;
  if (doc.querySelector('script[data-qmf-identity="1"]')) return false;
  const graph = siteIdentity(input);
  const el = doc.createElement('script');
  el.type = 'application/ld+json';
  el.setAttribute('data-qmf-identity', '1');
  el.textContent = JSON.stringify(graph);
  doc.head.appendChild(el);
  return true;
}

export function autoInjectFromLocation(
  loc: { hostname: string } = typeof location !== 'undefined' ? location : { hostname: '' },
): boolean {
  const site = resolveSiteByHost(loc.hostname);
  if (!site) return false;
  return ensureSiteIdentityInDocument({
    name: site.name,
    url: site.url,
    websiteId: site.websiteId,
    publisherId: ORGANIZATION_ID,
    includeOrganization: !!site.emitOrganization,
  });
}
