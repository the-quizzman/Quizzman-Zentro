/**
 * @qmf/utils - Dynamic Meta Manager
 * Manages document title, meta description, Open Graph, and Twitter Card tags.
 * Provides preconnect/preload resource hint injection.
 */

export interface MetaConfig {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  ogSiteName?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonicalUrl?: string;
  robots?: string;
  lang?: string;
}

const _managedMeta = new Map<string, HTMLMetaElement | HTMLLinkElement>();

function getOrCreateMeta(name: string, attr: 'name' | 'property' = 'name'): HTMLMetaElement {
  const existing = _managedMeta.get(name) as HTMLMetaElement | undefined;
  if (existing && existing.parentNode) return existing;

  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  _managedMeta.set(name, el);
  return el;
}

function setMetaContent(name: string, content: string, attr: 'name' | 'property' = 'name'): void {
  const el = getOrCreateMeta(name, attr);
  el.setAttribute('content', content);
}

function getOrCreateLink(rel: string, key: string): HTMLLinkElement {
  const mapKey = `link:${key}`;
  const existing = _managedMeta.get(mapKey) as HTMLLinkElement | undefined;
  if (existing && existing.parentNode) return existing;

  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"][data-qmf-key="${key}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    el.setAttribute('data-qmf-key', key);
    document.head.appendChild(el);
  }
  _managedMeta.set(mapKey, el);
  return el;
}

/**
 * Update document meta tags dynamically.
 * Only provided fields are updated; omitted fields are left unchanged.
 */
export function updateMeta(config: MetaConfig): void {
  if (typeof document === 'undefined') return;

  if (config.title) {
    document.title = config.title;
  }

  if (config.description) {
    setMetaContent('description', config.description);
  }

  if (config.robots) {
    setMetaContent('robots', config.robots);
  }

  if (config.lang && document.documentElement) {
    document.documentElement.lang = config.lang;
  }

  // Open Graph
  if (config.ogTitle ?? config.title) {
    setMetaContent('og:title', config.ogTitle ?? config.title!, 'property');
  }
  if (config.ogDescription ?? config.description) {
    setMetaContent('og:description', config.ogDescription ?? config.description!, 'property');
  }
  if (config.ogImage) {
    setMetaContent('og:image', config.ogImage, 'property');
  }
  if (config.ogUrl) {
    setMetaContent('og:url', config.ogUrl, 'property');
  }
  if (config.ogType) {
    setMetaContent('og:type', config.ogType, 'property');
  }
  if (config.ogSiteName) {
    setMetaContent('og:site_name', config.ogSiteName, 'property');
  }

  // Twitter Card
  if (config.twitterCard) {
    setMetaContent('twitter:card', config.twitterCard);
  }
  if (config.twitterTitle ?? config.ogTitle ?? config.title) {
    setMetaContent('twitter:title', config.twitterTitle ?? config.ogTitle ?? config.title!);
  }
  if (config.twitterDescription ?? config.ogDescription ?? config.description) {
    setMetaContent('twitter:description', config.twitterDescription ?? config.ogDescription ?? config.description!);
  }
  if (config.twitterImage ?? config.ogImage) {
    setMetaContent('twitter:image', config.twitterImage ?? config.ogImage!);
  }

  // Canonical URL
  if (config.canonicalUrl) {
    const link = getOrCreateLink('canonical', 'canonical');
    link.href = config.canonicalUrl;
  }
}

/**
 * Add a preconnect resource hint.
 */
export function addPreconnect(origin: string, crossorigin = true): void {
  if (typeof document === 'undefined') return;
  const key = `preconnect:${origin}`;
  if (_managedMeta.has(key)) return;

  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = origin;
  if (crossorigin) link.crossOrigin = 'anonymous';
  link.setAttribute('data-qmf-key', key);
  document.head.appendChild(link);
  _managedMeta.set(key, link);
}

/**
 * Add a preload resource hint.
 */
export function addPreload(href: string, as: string, type?: string): void {
  if (typeof document === 'undefined') return;
  const key = `preload:${href}`;
  if (_managedMeta.has(key)) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.setAttribute('as', as);
  if (type) link.type = type;
  link.setAttribute('data-qmf-key', key);
  document.head.appendChild(link);
  _managedMeta.set(key, link);
}

/**
 * Inject standard Quizzman preconnect hints.
 */
export function injectQMFResourceHints(): void {
  addPreconnect('https://ui.quizzman.com');
  addPreconnect('https://id.quizzman.com');
  addPreconnect('https://fonts.googleapis.com');
  addPreconnect('https://fonts.gstatic.com');
  addPreconnect('https://cdnjs.cloudflare.com');
}

/**
 * Remove all QMF-managed meta/link elements.
 */
export function clearManagedMeta(): void {
  for (const el of _managedMeta.values()) {
    el.parentNode?.removeChild(el);
  }
  _managedMeta.clear();
}
