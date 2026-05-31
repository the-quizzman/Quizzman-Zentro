/**
 * Phase 2 & 3 tests:
 * - Mobile Detection Service (device tier scoring)
 * - Meta Manager (dynamic OG/Twitter/preconnect)
 *
 * Uses a minimal DOM shim so we don't depend on jsdom / happy-dom.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mini DOM Shim ──────────────────────────────────────────

class FakeElement {
  tagName: string;
  attributes = new Map<string, string>();
  children: FakeElement[] = [];
  parentNode: FakeElement | null = null;
  textContent = '';

  constructor(tag: string) {
    this.tagName = tag.toUpperCase();
  }

  setAttribute(k: string, v: string) { this.attributes.set(k, v); }
  getAttribute(k: string) { return this.attributes.get(k) ?? null; }
  removeAttribute(k: string) { this.attributes.delete(k); }
  hasAttribute(k: string) { return this.attributes.has(k); }

  set rel(v: string) { this.setAttribute('rel', v); }
  get rel() { return this.getAttribute('rel') ?? ''; }
  set href(v: string) { this.setAttribute('href', v); }
  get href() { return this.getAttribute('href') ?? ''; }
  set crossOrigin(v: string) { this.setAttribute('crossorigin', v); }
  get crossOrigin() { return this.getAttribute('crossorigin') ?? ''; }
  set type(v: string) { this.setAttribute('type', v); }
  get type() { return this.getAttribute('type') ?? ''; }
  set lang(v: string) { this.setAttribute('lang', v); }
  get lang() { return this.getAttribute('lang') ?? ''; }
  set content(v: string) { this.setAttribute('content', v); }
  get content() { return this.getAttribute('content') ?? ''; }

  appendChild(child: FakeElement) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child: FakeElement) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) { this.children.splice(idx, 1); child.parentNode = null; }
    return child;
  }
  remove() {
    this.parentNode?.removeChild(this);
  }

  /** Minimal querySelector: supports tag[attr="val"][attr2="val2"] */
  querySelector(sel: string): FakeElement | null {
    const all = this._querySelectorAll(sel);
    return all[0] ?? null;
  }
  querySelectorAll(sel: string): FakeElement[] {
    return this._querySelectorAll(sel);
  }

  private _matchesSel(sel: string): boolean {
    const tagMatch = sel.match(/^([a-z]+)/i);
    if (tagMatch && tagMatch[1].toUpperCase() !== this.tagName) return false;
    const attrParts = [...sel.matchAll(/\[([a-z:_-]+)(?:="([^"]*)")?\]/gi)];
    for (const [, attr, val] of attrParts) {
      if (val !== undefined) {
        if (this.getAttribute(attr) !== val) return false;
      } else {
        if (!this.hasAttribute(attr)) return false;
      }
    }
    return true;
  }

  private _querySelectorAll(selector: string): FakeElement[] {
    // Support comma-separated selectors
    const selectors = selector.split(',').map(s => s.trim());
    const result: FakeElement[] = [];
    const collect = (el: FakeElement) => {
      for (const sel of selectors) {
        if (el._matchesSel(sel)) { result.push(el); break; }
      }
      for (const c of el.children) collect(c);
    };
    for (const c of this.children) collect(c);
    return result;
  }
}

function createFakeDOM() {
  const html = new FakeElement('html');
  const head = new FakeElement('head');
  const body = new FakeElement('body');
  html.appendChild(head);
  html.appendChild(body);

  const doc = {
    _title: '',
    get title() { return this._title; },
    set title(v: string) { this._title = v; },
    documentElement: html,
    head,
    body,
    createElement(tag: string) { return new FakeElement(tag); },
    querySelector(sel: string) { return html.querySelector(sel); },
    querySelectorAll(sel: string) { return html.querySelectorAll(sel); },
  };
  return doc;
}

// Install shim before importing modules
const fakeDoc = createFakeDOM();
const fakeNav: Record<string, unknown> = {
  hardwareConcurrency: 4,
  maxTouchPoints: 0,
  connection: { effectiveType: '4g' },
};
const fakeWin: Record<string, unknown> = {
  screen: { width: 1920 },
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: false }),
};

vi.stubGlobal('document', fakeDoc);
vi.stubGlobal('navigator', fakeNav);
vi.stubGlobal('window', fakeWin);

// Dynamic import AFTER globals are installed
const { detectDevice, applyDeviceTier, shouldEnableHeavyEffects, resetDeviceDetection } =
  await import('../mobile-detect');
const { updateMeta, addPreconnect, addPreload, injectQMFResourceHints, clearManagedMeta } =
  await import('../meta-manager');

// ─── Mobile Detection ───────────────────────────────────────

describe('Mobile Detection Service', () => {
  beforeEach(() => {
    resetDeviceDetection();
  });

  it('detects a high-end device', () => {
    fakeNav.hardwareConcurrency = 16;
    fakeNav.deviceMemory = 16;
    fakeNav.connection = { effectiveType: '4g' };
    resetDeviceDetection();

    const cap = detectDevice();
    expect(cap.tier).toBe('high');
    expect(cap.cores).toBe(16);
    expect(cap.memoryGB).toBe(16);
  });

  it('detects a low-end device', () => {
    fakeNav.hardwareConcurrency = 2;
    fakeNav.deviceMemory = 1;
    fakeNav.connection = { effectiveType: '2g' };
    resetDeviceDetection();

    const cap = detectDevice();
    expect(cap.tier).toBe('low');
  });

  it('caches detection result', () => {
    fakeNav.hardwareConcurrency = 4;
    fakeNav.deviceMemory = 4;
    fakeNav.connection = { effectiveType: '4g' };
    resetDeviceDetection();

    const cap1 = detectDevice();
    const cap2 = detectDevice();
    expect(cap1).toBe(cap2); // same reference = cached
  });

  it('applyDeviceTier sets data attributes on HTML root', () => {
    fakeNav.hardwareConcurrency = 8;
    fakeNav.deviceMemory = 8;
    fakeNav.connection = { effectiveType: '4g' };
    resetDeviceDetection();

    const tier = applyDeviceTier();
    expect(fakeDoc.documentElement.getAttribute('data-device-tier')).toBe(tier);
    expect(fakeDoc.documentElement.getAttribute('data-mobile')).toBe('false');
  });

  it('shouldEnableHeavyEffects returns true for high tier', () => {
    fakeNav.hardwareConcurrency = 16;
    fakeNav.deviceMemory = 16;
    fakeNav.connection = { effectiveType: '4g' };
    resetDeviceDetection();

    const result = shouldEnableHeavyEffects();
    expect(result).toBe(true);
  });

  it('performance: detectDevice runs under 1ms', () => {
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) {
      resetDeviceDetection();
      detectDevice();
    }
    const elapsed = performance.now() - t0;
    console.log(`  ⏱ 1000x detectDevice: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(100); // < 0.1ms per call
  });
});

// ─── Meta Manager ───────────────────────────────────────────

describe('Meta Manager', () => {
  beforeEach(() => {
    clearManagedMeta();
    // Reset head children
    fakeDoc.head.children.length = 0;
  });

  afterEach(() => {
    clearManagedMeta();
  });

  it('updates document title', () => {
    updateMeta({ title: 'Test Page - Quizzman' });
    expect(fakeDoc.title).toBe('Test Page - Quizzman');
  });

  it('creates and updates meta description', () => {
    updateMeta({ description: 'Hello world SEO description' });
    const meta = fakeDoc.querySelector('meta[name="description"]');
    expect(meta).not.toBeNull();
    expect(meta!.getAttribute('content')).toBe('Hello world SEO description');
  });

  it('creates Open Graph meta tags', () => {
    updateMeta({
      title: 'OG Test',
      ogImage: 'https://example.com/image.png',
      ogType: 'website',
      ogSiteName: 'QuizzMan',
    });

    expect(fakeDoc.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('OG Test');
    expect(fakeDoc.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://example.com/image.png');
    expect(fakeDoc.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('website');
    expect(fakeDoc.querySelector('meta[property="og:site_name"]')?.getAttribute('content')).toBe('QuizzMan');
  });

  it('creates Twitter Card meta tags', () => {
    updateMeta({
      title: 'Twitter Test',
      twitterCard: 'summary_large_image',
      twitterImage: 'https://example.com/twitter.png',
    });

    expect(fakeDoc.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image');
    expect(fakeDoc.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe('Twitter Test');
    expect(fakeDoc.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe('https://example.com/twitter.png');
  });

  it('creates canonical link', () => {
    updateMeta({ canonicalUrl: 'https://quizzman.com/page' });
    const link = fakeDoc.querySelector('link[rel="canonical"]');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('https://quizzman.com/page');
  });

  it('addPreconnect creates link element', () => {
    addPreconnect('https://fonts.googleapis.com');
    const link = fakeDoc.querySelector('link[rel="preconnect"][href="https://fonts.googleapis.com"]');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('crossorigin')).toBe('anonymous');
  });

  it('addPreconnect does not duplicate', () => {
    addPreconnect('https://fonts.googleapis.com');
    addPreconnect('https://fonts.googleapis.com');
    const links = fakeDoc.querySelectorAll('link[rel="preconnect"][href="https://fonts.googleapis.com"]');
    expect(links.length).toBe(1);
  });

  it('addPreload creates link with correct attributes', () => {
    addPreload('https://ui.quizzman.com/qmf/v3/tokens.css', 'style', 'text/css');
    const link = fakeDoc.querySelector('link[rel="preload"][href="https://ui.quizzman.com/qmf/v3/tokens.css"]');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('as')).toBe('style');
    expect(link!.getAttribute('type')).toBe('text/css');
  });

  it('injectQMFResourceHints adds all standard preconnects', () => {
    injectQMFResourceHints();
    const preconnects = fakeDoc.querySelectorAll('link[rel="preconnect"]');
    expect(preconnects.length).toBeGreaterThanOrEqual(5);
  });

  it('clearManagedMeta removes all managed elements', () => {
    updateMeta({ title: 'Cleanup Test', description: 'Test' });
    addPreconnect('https://example.com');
    clearManagedMeta();

    // All managed elements should have been removed
    const managedLinks = fakeDoc.querySelectorAll('link[data-qmf-key]');
    expect(managedLinks.length).toBe(0);
  });

  it('performance: 1000 updateMeta calls under 100ms', () => {
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) {
      updateMeta({
        title: `Page ${i}`,
        description: `Description ${i}`,
        ogTitle: `OG ${i}`,
        ogImage: `https://example.com/img${i}.png`,
        twitterCard: 'summary',
      });
    }
    const elapsed = performance.now() - t0;
    console.log(`  ⏱ 1000x updateMeta: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(100);
  });
});
