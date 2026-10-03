/**
 * QMF Ads — AdSense loader, entitlement gating, QMFAdSlot
 * @version 1.0.2
 *
 * Auto-loaded by qmf-shell.js. Applications only use QMFAdSlot:
 *   <qmf-ad-slot type="in-content"></qmf-ad-slot>
 *   QmfAds.mountSlot(el, { type: 'in-content' })
 *
 * Publisher ID is centralized and is not overridable by applications.
 *
 * Opt-out:  window.QMF_ADS = false  (or QMF_DISABLE_ADS = true)
 * Force:    window.QMF_ADS = true   (enable loader on localhost)
 */
(function (global) {
  'use strict';

  var VERSION = '1.0.2';
  var ADSENSE_PUBLISHER_ID = 'ca-pub-9878200690154577';
  var SCRIPT_ID = 'qmf-adsense-js';
  var SCRIPT_SRC =
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
    ADSENSE_PUBLISHER_ID;

  /** Auth, app shell, live-join — never monetize these hosts. */
  var DENIED_HOSTS = {
    'id.quizzman.com': 1,
    'app.quizzman.com': 1,
    'join.quizzman.com': 1,
  };

  /** Live quiz + homework/assignment taking — never monetize these paths. */
  var DENIED_PATH_RE = [
    /^\/quiz(\/|$)/i,
    /^\/live(\/|$)/i,
    /^\/host(\/|$)/i,
    /^\/homework(\/|$)/i,
    /^\/assignment(\/|$)/i,
    /^\/join(\/|$)/i,
    /^\/quiz-editor(\/|$)/i,
    /^\/play-house(\/|$)/i,
  ];

  var FREE_TIERS = { free: 1, guest: 1, inactive: 1 };
  var SLOT_TYPES = {
    'in-content': {
      format: 'fluid',
      layout: 'in-article',
      style: 'display:block;text-align:center;',
    },
    display: {
      format: 'auto',
      fullWidth: true,
      style: 'display:block;',
    },
    feed: {
      format: 'fluid',
      style: 'display:block;',
    },
    sidebar: {
      format: 'auto',
      style: 'display:block;',
    },
  };

  var authSettled = false;
  var lastEntitlement = { ads: false, ready: false, reason: 'pending', tier: null };
  var slotInstances = [];
  var listenersBound = false;
  var definedCE = false;

  function isBrowser() {
    return typeof document !== 'undefined' &&
      document &&
      typeof document.createElement === 'function';
  }

  function hostname() {
    try {
      return String((global.location && global.location.hostname) || '');
    } catch (e) {
      return '';
    }
  }

  function isProductionHost(h) {
    h = String(h == null ? hostname() : h);
    if (!h) return false;
    if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '::1') return false;
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(h)) return false;
    if (/\.local$/i.test(h) || /\.test$/i.test(h) || /\.localhost$/i.test(h)) return false;
    if (/staging/i.test(h) || /(^|\.)dev\./i.test(h)) return false;
    return true;
  }

  function normalizeHost(h) {
    return String(h || '').toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '');
  }

  function currentPath() {
    try {
      if (global.location && global.location.pathname) return String(global.location.pathname);
    } catch (e) { /* ignore */ }
    return '/';
  }

  function isDeniedSurface(h, p) {
    h = normalizeHost(h == null ? hostname() : h);
    p = String(p == null ? currentPath() : p);
    if (DENIED_HOSTS[h]) return true;
    for (var i = 0; i < DENIED_PATH_RE.length; i++) {
      if (DENIED_PATH_RE[i].test(p)) return true;
    }
    return false;
  }

  function adsRuntimeAllowed() {
    if (isDeniedSurface()) return false;
    if (global.QMF_DISABLE_ADS === true || global.QMF_ADS === false) return false;
    if (global.QMF_ADS === true) return true;
    return isProductionHost();
  }

  function normalizeTier(raw) {
    if (raw == null || raw === '') return '';
    var t = String(raw).toLowerCase().trim().replace(/^quizzman\s+/, '');
    if (!t) return '';
    if (FREE_TIERS[t]) return 'free';
    if (t === 'advanced' || t.indexOf('advanced') >= 0) return 'advanced';
    if (t === 'pro' || t === 'premium' || t === 'professional') return 'pro';
    if (t === 'plus' || t === 'basic') return 'plus';
    if (t === 'elite' || t === 'ultra' || t === 'enterprise') return 'elite';
    if (t === 'legend' || t === 'admin' || t === 'starter' || t === 'teacher' || t === 'vip') return t;
    if (t.indexOf('pro') >= 0) return 'pro';
    return t;
  }

  function pickExplicitAds(obj, depth) {
    if (!obj || typeof obj !== 'object') return undefined;
    if (depth > 4) return undefined;
    if (typeof obj.ads === 'boolean') return obj.ads;
    if (obj.entitlement && typeof obj.entitlement === 'object' && typeof obj.entitlement.ads === 'boolean') {
      return obj.entitlement.ads;
    }
    if (obj.entitlements && typeof obj.entitlements === 'object' && typeof obj.entitlements.ads === 'boolean') {
      return obj.entitlements.ads;
    }
    return undefined;
  }

  /**
   * Pure entitlement adapter.
   * Prefer entitlement.ads over tier strings. Fail closed on null/unknown.
   */
  function resolveAdsEntitlement(source) {
    if (source == null) {
      return { ads: false, ready: true, reason: 'null', tier: null };
    }
    if (typeof source === 'string') source = { tier: source };
    if (typeof source !== 'object') {
      return { ads: false, ready: true, reason: 'invalid', tier: null };
    }

    var explicit = pickExplicitAds(source);
    if (explicit === undefined && source.user) explicit = pickExplicitAds(source.user);

    var rawTier = source.tier || source.plan_code || source.subscription_tier ||
      source.plan || source.plan_name ||
      (source.user && (source.user.tier || source.user.plan_code ||
        source.user.subscription_tier || source.user.plan));
    var tier = normalizeTier(rawTier) || null;

    if (typeof explicit === 'boolean') {
      return {
        ads: explicit,
        ready: true,
        reason: explicit ? 'entitlement.ads' : 'entitlement.ads=false',
        tier: tier,
      };
    }

    if (!tier) {
      return { ads: false, ready: true, reason: 'unknown', tier: null };
    }
    if (tier === 'free') {
      return { ads: true, ready: true, reason: 'free', tier: 'free' };
    }
    return { ads: false, ready: true, reason: 'paid:' + tier, tier: tier };
  }

  function currentSource() {
    var user = null;
    try {
      if (global.QMFShell && typeof global.QMFShell.user === 'function') {
        user = global.QMFShell.user();
      }
    } catch (e) { /* ignore */ }
    var qm = global.qmTier || null;
    if (!user && qm && qm.user) user = qm.user;
    var src = {
      user: user,
      tier: (qm && qm.tier) || (user && (user.tier || user.plan_code)) || null,
      entitlement: (user && (user.entitlement || user.entitlements)) || (qm && qm.entitlement) || null,
    };
    if (user && typeof user.ads === 'boolean') src.ads = user.ads;
    return src;
  }

  function sourceHasIdentity(source) {
    if (!source || typeof source !== 'object') return false;
    if (source.user) return true;
    if (source.tier || source.plan_code || source.subscription_tier || source.plan) return true;
    if (source.entitlement || source.entitlements) return true;
    if (typeof source.ads === 'boolean') return true;
    return false;
  }

  function applyHostGate(ent) {
    if (ent && ent.ads && !adsRuntimeAllowed()) {
      return {
        ads: false,
        ready: true,
        reason: (ent.reason || 'ads') + ':host-blocked',
        tier: ent.tier || null,
      };
    }
    return ent;
  }

  function refreshEntitlement(source, settled) {
    if (!settled) {
      lastEntitlement = { ads: false, ready: false, reason: 'pending', tier: null };
      return lastEntitlement;
    }
    // Explicit null/undefined = unknown entitlement (fail closed).
    // Empty object after auth settle = guest, treated as FREE.
    if (source === null || source === undefined) {
      lastEntitlement = applyHostGate(resolveAdsEntitlement(source));
      return lastEntitlement;
    }
    if (sourceHasIdentity(source)) {
      lastEntitlement = applyHostGate(resolveAdsEntitlement(source));
    } else {
      lastEntitlement = applyHostGate({
        ads: true,
        ready: true,
        reason: 'guest-free',
        tier: 'free',
      });
    }
    return lastEntitlement;
  }

  function adsEnabled() {
    return !!(lastEntitlement.ready && lastEntitlement.ads);
  }

  function existingAdSenseScripts() {
    if (!isBrowser() || !document.querySelectorAll) return [];
    var found = [];
    var nodes = document.querySelectorAll('script');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var src = '';
      try {
        src = el.id === SCRIPT_ID
          ? SCRIPT_SRC
          : String((el.getAttribute && el.getAttribute('src')) || el.src || '');
      } catch (e) { src = ''; }
      if (el.id === SCRIPT_ID || src.indexOf('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js') >= 0) {
        found.push(el);
      }
    }
    return found;
  }

  /**
   * Official AdSense snippet (exact Google tag). Production-only, idempotent.
   *
   *   <script async
   *     src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9878200690154577"
   *     crossorigin="anonymous"></script>
   *
   * Loaded from the ads runtime (via qmf-shell). Does not request ads;
   * QMFAdSlot still gates <ins> + adsbygoogle.push.
   */
  function ensurePublisherSnippet() {
    if (!isBrowser()) return false;
    if (!adsRuntimeAllowed()) return false;
    if (existingAdSenseScripts().length) {
      global.__QMF_ADS_LOADER__ = true;
      return true;
    }
    var parent = document.head || document.documentElement;
    if (!parent) return false;
    var s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.async = true;
    s.src = SCRIPT_SRC;
    s.crossOrigin = 'anonymous';
    if (s.setAttribute) s.setAttribute('crossorigin', 'anonymous');
    parent.appendChild(s);
    global.__QMF_ADS_LOADER__ = true;
    return true;
  }

  function ensureAdSenseLoader() {
    return ensurePublisherSnippet();
  }

  function pushAd() {
    if (!isBrowser()) return;
    try {
      global.adsbygoogle = global.adsbygoogle || [];
      global.adsbygoogle.push({});
    } catch (e) { /* ignore */ }
  }

  function buildIns(opts) {
    opts = opts || {};
    var type = opts.type || 'in-content';
    var spec = SLOT_TYPES[type] || SLOT_TYPES['in-content'];
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.setAttribute('data-ad-client', ADSENSE_PUBLISHER_ID);
    ins.setAttribute('data-ad-format', spec.format || 'auto');
    if (spec.layout) ins.setAttribute('data-ad-layout', spec.layout);
    if (spec.fullWidth) ins.setAttribute('data-full-width-responsive', 'true');
    ins.setAttribute('style', spec.style || 'display:block;');
    var unit = opts.unit || opts.adSlot || spec.unit;
    if (unit) ins.setAttribute('data-ad-slot', String(unit));
    return ins;
  }

  function setHostEmpty(host) {
    try {
      while (host.firstChild) host.removeChild(host.firstChild);
      if (host.style) host.style.display = 'contents';
    } catch (e) { /* ignore */ }
  }

  function createSlotController(host, opts) {
    opts = opts || {};
    var destroyed = false;
    var filled = false;

    function clear() {
      filled = false;
      setHostEmpty(host);
    }

    function fill() {
      if (destroyed || filled) return;
      if (!adsEnabled()) {
        clear();
        return;
      }
      ensureAdSenseLoader();
      var ins = buildIns(opts);
      try {
        if (host.style) host.style.display = 'block';
        while (host.firstChild) host.removeChild(host.firstChild);
        host.appendChild(ins);
      } catch (e) {
        return;
      }
      filled = true;
      pushAd();
    }

    function sync() {
      if (destroyed) return;
      if (!lastEntitlement.ready || !adsEnabled()) {
        clear();
        return;
      }
      fill();
    }

    function destroy() {
      destroyed = true;
      clear();
      for (var i = slotInstances.length - 1; i >= 0; i--) {
        if (slotInstances[i] === ctrl) slotInstances.splice(i, 1);
      }
    }

    var ctrl = { host: host, opts: opts, sync: sync, destroy: destroy };
    slotInstances.push(ctrl);
    sync();
    return ctrl;
  }

  function syncAllSlots() {
    for (var i = 0; i < slotInstances.length; i++) {
      try { slotInstances[i].sync(); } catch (e) { /* ignore */ }
    }
  }

  function onAuthEvent(ev) {
    var detail = (ev && ev.detail) || {};
    var type = detail.type;
    authSettled = true;
    var user = detail.user;
    if (user === undefined) {
      try {
        user = (global.QMFShell && global.QMFShell.user && global.QMFShell.user()) || null;
      } catch (e) {
        user = null;
      }
    }
    if (type === 'logout') user = null;
    var source = user ? Object.assign(currentSource(), { user: user }) : {};
    refreshEntitlement(source, true);
    ensurePublisherSnippet();
    syncAllSlots();
  }

  function bindAuth() {
    if (listenersBound || !isBrowser()) return;
    listenersBound = true;
    try {
      global.addEventListener('qmf:auth', onAuthEvent);
      global.addEventListener('qmf:auth-ready', function (ev) {
        onAuthEvent({ detail: { type: 'ready', user: ev && ev.detail && ev.detail.user } });
      });
      global.addEventListener('qmf:auth-logout', function () {
        onAuthEvent({ detail: { type: 'logout', user: null } });
      });
    } catch (e) { /* ignore */ }
    if (global.qmTier && typeof global.qmTier.on === 'function') {
      try {
        global.qmTier.on('change', function () {
          authSettled = true;
          refreshEntitlement(currentSource(), true);
          ensurePublisherSnippet();
          syncAllSlots();
        });
      } catch (e2) { /* ignore */ }
    }
    try {
      var u = global.QMFShell && global.QMFShell.user && global.QMFShell.user();
      if (u) {
        authSettled = true;
        refreshEntitlement(currentSource(), true);
      }
    } catch (e3) { /* ignore */ }
  }

  function defineAdSlotElement() {
    if (definedCE || !isBrowser()) return;
    if (typeof customElements === 'undefined' || !customElements.define) return;
    if (typeof HTMLElement === 'undefined') return;
    if (customElements.get && customElements.get('qmf-ad-slot')) {
      definedCE = true;
      return;
    }
    class QMFAdSlotElement extends HTMLElement {
      connectedCallback() {
        if (this.__qmfAdsCtrl) return;
        var type = this.getAttribute('type') || 'in-content';
        var unit = this.getAttribute('unit') || this.getAttribute('data-ad-slot') || '';
        this.__qmfAdsCtrl = createSlotController(this, { type: type, unit: unit });
      }
      disconnectedCallback() {
        if (this.__qmfAdsCtrl) {
          this.__qmfAdsCtrl.destroy();
          this.__qmfAdsCtrl = null;
        }
      }
    }
    try {
      customElements.define('qmf-ad-slot', QMFAdSlotElement);
      definedCE = true;
    } catch (e) { /* ignore duplicate define */ }
  }

  /**
   * App-facing mount. Returns null when ads are settled-off (no ins, no push).
   * While entitlement is pending, returns a controller that stays empty until ready.
   */
  function mountSlot(container, opts) {
    if (!isBrowser() || !container) return null;
    bindAuth();
    if (lastEntitlement.ready && !adsEnabled()) return null;
    return createSlotController(container, opts || {});
  }

  function AdSlot(opts) {
    if (!isBrowser()) return null;
    bindAuth();
    if (lastEntitlement.ready && !adsEnabled()) return null;
    defineAdSlotElement();
    var el = document.createElement('qmf-ad-slot');
    opts = opts || {};
    if (opts.type) el.setAttribute('type', opts.type);
    if (opts.unit) el.setAttribute('unit', String(opts.unit));
    return el;
  }

  function init(opts) {
    opts = opts || {};
    bindAuth();
    if (isBrowser()) defineAdSlotElement();
    if (opts.forceSettled) {
      authSettled = true;
      refreshEntitlement(opts.source !== undefined ? opts.source : currentSource(), true);
    }
    ensurePublisherSnippet();
    syncAllSlots();
    return api;
  }

  var api = {
    version: VERSION,
    publisherId: ADSENSE_PUBLISHER_ID,
    resolveEntitlement: resolveAdsEntitlement,
    adsEnabled: function () { return adsEnabled(); },
    entitlement: function () { return lastEntitlement; },
    ensureLoader: ensureAdSenseLoader,
    mountSlot: mountSlot,
    AdSlot: AdSlot,
    init: init,
    slotTypes: SLOT_TYPES,
    isProductionHost: isProductionHost,
    isDeniedSurface: isDeniedSurface,
    adsRuntimeAllowed: adsRuntimeAllowed,
    scriptId: SCRIPT_ID,
    _refresh: function (source, settled) {
      authSettled = settled !== false;
      refreshEntitlement(source, authSettled);
      ensurePublisherSnippet();
      syncAllSlots();
      return lastEntitlement;
    },
    _reset: function () {
      authSettled = false;
      lastEntitlement = { ads: false, ready: false, reason: 'pending', tier: null };
      for (var i = slotInstances.length - 1; i >= 0; i--) {
        try { slotInstances[i].destroy(); } catch (e) { /* ignore */ }
      }
      slotInstances = [];
      global.__QMF_ADS_LOADER__ = false;
    },
  };

  if (isBrowser()) {
    try {
      bindAuth();
      defineAdSlotElement();
      ensurePublisherSnippet();
    } catch (e) { /* ignore */ }
  }

  global.QmfAds = api;
  global.QMFAdSlot = AdSlot;
  if (!global.QMF) global.QMF = {};
  global.QMF.Ads = api;
  global.QMF.AdSlot = AdSlot;
  global.__QMF_ADS_MODULE__ = VERSION;
})(typeof window !== 'undefined' ? window : globalThis);
