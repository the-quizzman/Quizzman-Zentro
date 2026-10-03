/**
 * QMF Ads unit tests — entitlement gating, AdSlot, AdSense loader idempotency.
 * Uses a minimal DOM shim (no jsdom).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ADS_SRC = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'ads.js'),
  'utf8',
);

class FakeElement {
  constructor(tag) {
    this.tagName = String(tag || 'div').toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.style = { display: '' };
    this._text = '';
    this.id = '';
    this.className = '';
    this.src = '';
    this.async = false;
    this.crossOrigin = '';
  }
  get firstChild() { return this.children[0] || null; }
  get textContent() { return this._text; }
  set textContent(v) {
    this._text = v == null ? '' : String(v);
    this.children = [];
  }
  setAttribute(k, v) {
    const key = String(k);
    const val = String(v);
    this.attributes.set(key, val);
    if (key === 'id') this.id = val;
    if (key === 'src') this.src = val;
    if (key === 'class') this.className = val;
  }
  getAttribute(k) {
    if (k === 'id' && this.id) return this.id;
    if (k === 'src' && this.src) return this.src;
    return this.attributes.get(String(k)) ?? null;
  }
  hasAttribute(k) { return this.getAttribute(k) != null; }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }
  querySelectorAll(sel) {
    return collect(this, sel);
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
}

function collect(root, sel) {
  const out = [];
  const walk = (el) => {
    if (matches(el, sel)) out.push(el);
    for (const c of el.children) walk(c);
  };
  for (const c of root.children) walk(c);
  return out;
}

function matches(el, sel) {
  if (sel === 'script') return el.tagName === 'SCRIPT';
  if (sel === 'ins' || sel === 'ins.adsbygoogle') {
    return el.tagName === 'INS' && (sel === 'ins' || el.className.indexOf('adsbygoogle') >= 0);
  }
  if (sel === '.adsbygoogle') return el.className.indexOf('adsbygoogle') >= 0;
  const id = sel.match(/^#([A-Za-z0-9_-]+)$/);
  if (id) return el.id === id[1];
  return false;
}

function createFakeDOM() {
  const html = new FakeElement('html');
  const head = new FakeElement('head');
  const body = new FakeElement('body');
  html.appendChild(head);
  html.appendChild(body);

  const listeners = {};
  const doc = {
    documentElement: html,
    head,
    body,
    createElement(tag) { return new FakeElement(tag); },
    getElementById(id) {
      const all = collect(html, 'script').concat(collect(html, 'ins'));
      const walk = (el) => {
        if (el.id === id) return el;
        for (const c of el.children) {
          const hit = walk(c);
          if (hit) return hit;
        }
        return null;
      };
      return walk(html);
    },
    querySelector(sel) { return collect(html, sel)[0] || null; },
    querySelectorAll(sel) { return collect(html, sel); },
    _listeners: listeners,
  };
  return doc;
}

function bootBrowser(opts = {}) {
  const document = createFakeDOM();
  const host = opts.hostname || 'www.quizzman.com';
  const path = opts.pathname || '/';
  const location = {
    hostname: host,
    pathname: path,
    href: `https://${host}${path}`,
  };
  const ctx = {
    console,
    location,
    document,
    QMF_ADS: opts.QMF_ADS,
    QMF_DISABLE_ADS: opts.QMF_DISABLE_ADS,
    QMFShell: opts.QMFShell || { user: () => opts.user || null },
    qmTier: opts.qmTier || undefined,
    adsbygoogle: undefined,
    addEventListener(type, fn) {
      (ctx._listeners[type] || (ctx._listeners[type] = [])).push(fn);
    },
    dispatchEvent(ev) {
      const list = ctx._listeners[ev.type] || [];
      for (const fn of list) fn(ev);
      return true;
    },
    _listeners: {},
    HTMLElement: class HTMLElement {},
    customElements: {
      _reg: Object.create(null),
      get(name) { return this._reg[name]; },
      define(name, ctor) { this._reg[name] = ctor; },
    },
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.runInNewContext(ADS_SRC, ctx);
  return ctx;
}

function bootSsr() {
  const ctx = {
    console,
    QMF: undefined,
  };
  ctx.globalThis = ctx;
  vm.runInNewContext(ADS_SRC, ctx);
  return ctx;
}

describe('resolveAdsEntitlement', () => {
  let ads;

  beforeEach(() => {
    ads = bootBrowser({ QMF_ADS: true }).QmfAds;
  });

  it('FREE → ads enabled', () => {
    expect(ads.resolveEntitlement({ tier: 'free' })).toMatchObject({ ads: true, reason: 'free', tier: 'free' });
    expect(ads.resolveEntitlement('FREE')).toMatchObject({ ads: true, tier: 'free' });
    expect(ads.resolveEntitlement({ plan_code: 'guest' })).toMatchObject({ ads: true });
  });

  it('PRO → ads disabled', () => {
    expect(ads.resolveEntitlement({ tier: 'pro' })).toMatchObject({ ads: false, reason: 'paid:pro' });
    expect(ads.resolveEntitlement({ plan_code: 'PRO' })).toMatchObject({ ads: false, tier: 'pro' });
  });

  it('ADVANCED → ads disabled', () => {
    expect(ads.resolveEntitlement({ tier: 'advanced' })).toMatchObject({ ads: false, reason: 'paid:advanced' });
    expect(ads.resolveEntitlement({ user: { tier: 'ADVANCED' } })).toMatchObject({ ads: false, tier: 'advanced' });
  });

  it('unknown/null entitlement → fail closed', () => {
    expect(ads.resolveEntitlement(null)).toMatchObject({ ads: false, reason: 'null' });
    expect(ads.resolveEntitlement(undefined)).toMatchObject({ ads: false, reason: 'null' });
    expect(ads.resolveEntitlement({})).toMatchObject({ ads: false, reason: 'unknown' });
    expect(ads.resolveEntitlement({ user: {} })).toMatchObject({ ads: false, reason: 'unknown' });
  });

  it('prefers entitlement.ads over tier', () => {
    expect(ads.resolveEntitlement({ tier: 'pro', entitlement: { ads: true } })).toMatchObject({
      ads: true,
      reason: 'entitlement.ads',
    });
    expect(ads.resolveEntitlement({ tier: 'free', entitlements: { ads: false } })).toMatchObject({
      ads: false,
      reason: 'entitlement.ads=false',
    });
    expect(ads.resolveEntitlement({ ads: true, tier: 'enterprise' })).toMatchObject({ ads: true });
  });

  it('future paid tiers default to no ads', () => {
    for (const tier of ['plus', 'elite', 'enterprise', 'legend', 'starter']) {
      expect(ads.resolveEntitlement({ tier }).ads).toBe(false);
    }
  });
});

describe('QMFAdSlot gating', () => {
  let ctx;

  beforeEach(() => {
    ctx = bootBrowser({ QMF_ADS: true, hostname: 'quizzman.com' });
    ctx.QmfAds._reset();
  });

  afterEach(() => {
    ctx.QmfAds._reset();
  });

  it('FREE → AdSlot rendered', () => {
    ctx.QmfAds._refresh({ tier: 'free' }, true);
    const host = ctx.document.createElement('div');
    ctx.document.body.appendChild(host);
    const ctrl = ctx.QmfAds.mountSlot(host, { type: 'in-content' });
    expect(ctrl).not.toBeNull();
    expect(host.children.length).toBe(1);
    expect(host.children[0].tagName).toBe('INS');
    expect(host.children[0].className).toBe('adsbygoogle');
    expect(host.children[0].getAttribute('data-ad-client')).toBe('ca-pub-9878200690154577');
    expect(ctx.adsbygoogle.length).toBe(1);
  });

  it('PRO → AdSlot not rendered', () => {
    ctx.QmfAds._refresh({ tier: 'pro' }, true);
    const host = ctx.document.createElement('div');
    const ctrl = ctx.QmfAds.mountSlot(host, { type: 'in-content' });
    expect(ctrl).toBeNull();
    expect(host.children.length).toBe(0);
    expect(ctx.document.querySelectorAll('ins').length).toBe(0);
    expect(ctx.adsbygoogle).toBeUndefined();
  });

  it('ADVANCED → AdSlot not rendered', () => {
    ctx.QmfAds._refresh({ tier: 'advanced' }, true);
    const host = ctx.document.createElement('div');
    expect(ctx.QmfAds.mountSlot(host, { type: 'in-content' })).toBeNull();
    expect(host.children.length).toBe(0);
  });

  it('unknown/null entitlement → no ads (fail closed)', () => {
    ctx.QmfAds._refresh(null, true);
    const host = ctx.document.createElement('div');
    expect(ctx.QmfAds.mountSlot(host)).toBeNull();
    expect(host.children.length).toBe(0);
    expect(ctx.document.querySelectorAll('ins').length).toBe(0);
  });

  it('pending entitlement → empty, no ins, no adsbygoogle.push', () => {
    ctx.QmfAds._refresh({ tier: 'free' }, false);
    const host = ctx.document.createElement('div');
    ctx.document.body.appendChild(host);
    const ctrl = ctx.QmfAds.mountSlot(host, { type: 'in-content' });
    expect(ctrl).not.toBeNull();
    expect(host.children.length).toBe(0);
    expect(ctx.adsbygoogle).toBeUndefined();
  });

  it('does not reserve layout space when ads are off', () => {
    ctx.QmfAds._refresh({ tier: 'pro' }, true);
    const host = ctx.document.createElement('div');
    ctx.QmfAds.mountSlot(host);
    expect(host.style.display === '' || host.style.display === 'contents').toBe(true);
    expect(host.children.length).toBe(0);
  });
});

describe('AdSense loader', () => {
  it('SSR → does not touch browser APIs', () => {
    expect(() => bootSsr()).not.toThrow();
    const ctx = bootSsr();
    expect(ctx.QmfAds.publisherId).toBe('ca-pub-9878200690154577');
    expect(ctx.QmfAds.ensureLoader()).toBe(false);
    expect(ctx.QmfAds.AdSlot({ type: 'in-content' })).toBeNull();
    expect(ctx.QmfAds.mountSlot({}, { type: 'in-content' })).toBeNull();
  });

  it('skips localhost / staging unless QMF_ADS = true', () => {
    const local = bootBrowser({ hostname: 'localhost' });
    local.QmfAds._refresh({ tier: 'free' }, true);
    expect(local.QmfAds.adsEnabled()).toBe(false);
    expect(local.QmfAds.ensureLoader()).toBe(false);
    expect(local.document.querySelectorAll('script').length).toBe(0);

    const staging = bootBrowser({ hostname: 'staging.quizzman.com' });
    staging.QmfAds._refresh({ tier: 'free' }, true);
    expect(staging.QmfAds.adsEnabled()).toBe(false);
    expect(staging.document.querySelectorAll('script').length).toBe(0);
  });

  it('SPA navigation / remount → adsbygoogle.js at most once', () => {
    const ctx = bootBrowser({ QMF_ADS: true, hostname: 'wiki.quizzman.com' });
    ctx.QmfAds._refresh({ tier: 'free' }, true);
    const a = ctx.document.createElement('div');
    const b = ctx.document.createElement('div');
    ctx.document.body.appendChild(a);
    ctx.document.body.appendChild(b);
    ctx.QmfAds.mountSlot(a, { type: 'in-content' });
    ctx.QmfAds.mountSlot(b, { type: 'display' });
    ctx.QmfAds.ensureLoader();
    ctx.QmfAds.ensureLoader();
    const scripts = ctx.document.querySelectorAll('script').filter((s) =>
      String(s.src || '').includes('adsbygoogle.js') || s.id === 'qmf-adsense-js',
    );
    expect(scripts.length).toBe(1);
    expect(scripts[0].async).toBe(true);
    expect(scripts[0].id).toBe('qmf-adsense-js');
  });

  it('multiple AdSlots share one AdSense loader', () => {
    const ctx = bootBrowser({ QMF_ADS: true, hostname: 'dict.quizzman.com' });
    ctx.QmfAds._refresh({ tier: 'free' }, true);
    for (let i = 0; i < 3; i++) {
      const host = ctx.document.createElement('div');
      ctx.document.body.appendChild(host);
      ctx.QmfAds.mountSlot(host, { type: 'in-content' });
    }
    expect(ctx.document.querySelectorAll('ins').length).toBe(3);
    expect(ctx.document.querySelectorAll('script').length).toBe(1);
    expect(ctx.adsbygoogle.length).toBe(3);
  });

  it('injects the official AdSense snippet (async + client + crossorigin)', () => {
    const ctx = bootBrowser({ QMF_ADS: true, hostname: 'quizzman.com' });
    const scripts = ctx.document.querySelectorAll('script');
    expect(scripts.length).toBe(1);
    expect(scripts[0].async).toBe(true);
    expect(scripts[0].src).toBe(
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9878200690154577',
    );
    expect(scripts[0].getAttribute('crossorigin')).toBe('anonymous');
    expect(scripts[0].crossOrigin).toBe('anonymous');
  });

  it('blocks id / app / live quiz / homework surfaces', () => {
    for (const hostname of ['id.quizzman.com', 'app.quizzman.com', 'join.quizzman.com']) {
      const ctx = bootBrowser({ QMF_ADS: true, hostname });
      ctx.QmfAds._refresh({ tier: 'free' }, true);
      expect(ctx.QmfAds.isDeniedSurface()).toBe(true);
      expect(ctx.QmfAds.adsEnabled()).toBe(false);
      expect(ctx.document.querySelectorAll('script').length).toBe(0);
      const host = ctx.document.createElement('div');
      expect(ctx.QmfAds.mountSlot(host, { type: 'in-content' })).toBeNull();
    }

    for (const pathname of ['/quiz', '/quiz/abc', '/live/host', '/host', '/homework', '/assignment/', '/quiz-editor']) {
      const ctx = bootBrowser({ QMF_ADS: true, hostname: 'play.quizzman.com', pathname });
      ctx.QmfAds._refresh({ tier: 'free' }, true);
      expect(ctx.QmfAds.isDeniedSurface()).toBe(true);
      expect(ctx.QmfAds.adsEnabled()).toBe(false);
      expect(ctx.document.querySelectorAll('script').length).toBe(0);
    }

    const classHw = bootBrowser({ QMF_ADS: true, hostname: 'class.quizzman.com', pathname: '/homework' });
    classHw.QmfAds._refresh({ tier: 'free' }, true);
    expect(classHw.QmfAds.adsEnabled()).toBe(false);

    const wiki = bootBrowser({ QMF_ADS: true, hostname: 'wiki.quizzman.com', pathname: '/' });
    wiki.QmfAds._refresh({ tier: 'free' }, true);
    expect(wiki.QmfAds.isDeniedSurface()).toBe(false);
    expect(wiki.QmfAds.adsEnabled()).toBe(true);
  });

  it('does not create <ins> or adsbygoogle.push for paid users', () => {
    const ctx = bootBrowser({ QMF_ADS: true, hostname: 'study.quizzman.com' });
    ctx.QmfAds._refresh({ tier: 'pro' }, true);
    const host = ctx.document.createElement('div');
    expect(ctx.QmfAds.mountSlot(host)).toBeNull();
    expect(ctx.document.querySelectorAll('ins').length).toBe(0);
    expect(ctx.adsbygoogle).toBeUndefined();
  });

  it('publisher id cannot be overridden from the page', () => {
    const ctx = bootBrowser({ QMF_ADS: true, hostname: 'quizzman.com' });
    ctx.QMF_ADSENSE_ID = 'ca-pub-000';
    ctx.QMF_ADS_PUBLISHER_ID = 'ca-pub-000';
    expect(ctx.QmfAds.publisherId).toBe('ca-pub-9878200690154577');
    ctx.QmfAds._refresh({ tier: 'free' }, true);
    const host = ctx.document.createElement('div');
    ctx.document.body.appendChild(host);
    ctx.QmfAds.mountSlot(host);
    expect(host.children[0].getAttribute('data-ad-client')).toBe('ca-pub-9878200690154577');
  });
});

describe('qmf:auth integration', () => {
  it('guest ready (user null) enables ads', () => {
    const ctx = bootBrowser({ QMF_ADS: true, hostname: 'wiki.quizzman.com' });
    ctx.dispatchEvent({ type: 'qmf:auth', detail: { type: 'guest', user: null } });
    expect(ctx.QmfAds.entitlement()).toMatchObject({ ads: true, reason: 'guest-free' });
  });

  it('PRO ready disables ads and tears down existing slots', () => {
    const ctx = bootBrowser({ QMF_ADS: true, hostname: 'wiki.quizzman.com' });
    ctx.QmfAds._refresh({ tier: 'free' }, true);
    const host = ctx.document.createElement('div');
    ctx.document.body.appendChild(host);
    ctx.QmfAds.mountSlot(host, { type: 'in-content' });
    expect(host.children.length).toBe(1);

    ctx.QMFShell = { user: () => ({ tier: 'pro' }) };
    ctx.dispatchEvent({ type: 'qmf:auth', detail: { type: 'ready', user: { tier: 'pro' } } });
    expect(ctx.QmfAds.adsEnabled()).toBe(false);
    expect(host.children.length).toBe(0);
  });
});
