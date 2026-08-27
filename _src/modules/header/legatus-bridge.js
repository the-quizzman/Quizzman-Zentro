/**
 * QMF Legatus bridge — single-bell mount into lab-header / app slots.
 * Never creates more than one <legatus-bell> (avoids duplicate sheets).
 */
(function (global) {
  'use strict';

  var CDN = 'https://ui.quizzman.com/qmf/dist/legatus';
  var VERSION = '1.3.7';
  var loading = null;
  var authWired = false;

  function expectedSdkUrl() {
    return CDN + '/legatus.min.js?v=' + VERSION;
  }

  function expectedCssUrl() {
    return CDN + '/legatus.css?v=' + VERSION;
  }

  function isCurrentSdk() {
    return !!(
      global.Legatus &&
      typeof global.Legatus.mount === 'function' &&
      String(global.Legatus.version || '') === VERSION
    );
  }

  function loadCss() {
    var href = expectedCssUrl();
    var existing = document.getElementById('qmf-legatus-css');
    if (existing) {
      if (existing.getAttribute('href') === href) return Promise.resolve();
      existing.href = href;
      return Promise.resolve();
    }
    return new Promise(function (resolve, reject) {
      var el = document.createElement('link');
      el.id = 'qmf-legatus-css';
      el.rel = 'stylesheet';
      el.href = href;
      el.onload = function () { resolve(); };
      el.onerror = function () { reject(new Error('Failed to load legatus.css')); };
      document.head.appendChild(el);
    });
  }

  function loadJs() {
    if (isCurrentSdk()) return Promise.resolve();

    // Stale custom elements cannot be redefined — one soft reload upgrades the page.
    if (
      global.Legatus &&
      typeof global.Legatus.mount === 'function' &&
      String(global.Legatus.version || '') !== VERSION &&
      customElements.get('legatus-bell')
    ) {
      try {
        var key = 'qmf-legatus-upgrade:' + VERSION;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          console.warn('[QMF Legatus] upgrading SDK →', VERSION);
          global.location.reload();
          return new Promise(function () { /* pending reload */ });
        }
      } catch (e) { /* private mode — fall through and load anyway */ }
    }

    var src = expectedSdkUrl();
    var existing = document.getElementById('qmf-legatus-js');
    if (existing) {
      if (existing.getAttribute('src') === src) return waitForLegatus();
      existing.remove();
    }
    return new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.id = 'qmf-legatus-js';
      el.src = src;
      el.defer = true;
      el.onload = function () { waitForLegatus().then(resolve).catch(reject); };
      el.onerror = function () { reject(new Error('Failed to load legatus.min.js')); };
      document.head.appendChild(el);
    });
  }

  function waitForLegatus(ms) {
    ms = ms || 5000;
    return new Promise(function (resolve, reject) {
      var start = Date.now();
      var tick = function () {
        if (global.Legatus && typeof global.Legatus.mount === 'function') return resolve();
        if (Date.now() - start > ms) return reject(new Error('Legatus timeout'));
        setTimeout(tick, 50);
      };
      tick();
    });
  }

  function resolveToken() {
    return Promise.resolve().then(function () {
      if (global.IdSysSSO) {
        if (typeof global.IdSysSSO.getToken === 'function') {
          var t = global.IdSysSSO.getToken();
          if (t) return t;
        }
        if (typeof global.IdSysSSO.getAuth === 'function') {
          return global.IdSysSSO.getAuth().then(function (auth) {
            return (auth && (auth.token || auth.accessToken)) || null;
          }).catch(function () { return null; });
        }
      }
      if (global.SlideStudioAuth && typeof global.SlideStudioAuth.getToken === 'function') {
        var st = global.SlideStudioAuth.getToken();
        if (st) return st;
      }
      try {
        var keys = [
          'jwt_token', 'access_token', 'accessToken',
          'qm_access_token', 'quizzman_access_token', 'token', 'auth_token'
        ];
        for (var i = 0; i < keys.length; i++) {
          var v = localStorage.getItem(keys[i]);
          if (v) return v;
        }
      } catch (e) { /* private mode */ }
      return global.__QM_ACCESS_TOKEN__ || null;
    });
  }

  function ensureAssets() {
    if (loading) return loading;
    loading = Promise.all([loadCss().catch(function () {}), loadJs()]).then(function () {
      return global.Legatus;
    });
    return loading;
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    if (el.hidden) return false;
    var style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    // offsetParent is null for fixed/sticky, so also check rects
    var rects = el.getClientRects();
    return rects.length > 0;
  }

  function collectSlots(slotSel) {
    var slots = [];
    if (typeof slotSel === 'string') {
      slots = Array.prototype.slice.call(document.querySelectorAll(slotSel));
    } else if (slotSel && slotSel.nodeType === 1) {
      slots = [slotSel];
    } else if (slotSel && slotSel.length != null) {
      slots = Array.prototype.slice.call(slotSel);
    }
    return slots;
  }

  /** Prefer a visible slot; fall back to first. */
  function pickSlot(slots) {
    for (var i = 0; i < slots.length; i++) {
      if (isVisible(slots[i])) return slots[i];
    }
    return slots[0] || null;
  }

  /** Keep exactly one <legatus-bell> in the document. */
  function ensureSingletonBell(Legatus, targetSlot) {
    var bells = Array.prototype.slice.call(document.querySelectorAll('legatus-bell'));
    var bell = bells[0] || null;

    // Remove extras (source of duplicate sheets)
    for (var i = 1; i < bells.length; i++) {
      bells[i].remove();
    }

    if (!targetSlot) return bell;

    if (bell) {
      if (bell.parentElement !== targetSlot) {
        targetSlot.appendChild(bell);
      }
      return bell;
    }

    return Legatus.mount(targetSlot);
  }

  function wireAuth(Legatus) {
    if (authWired) return;
    authWired = true;
    global.addEventListener('qmf:auth-ready', function () {
      try {
        if (Legatus.client && Legatus.client.connect) Legatus.client.connect();
        if (Legatus.refresh) Legatus.refresh();
      } catch (e) { /* ignore */ }
    });
    global.addEventListener('qmf:auth-logout', function () {
      try {
        if (Legatus.client && Legatus.client.disconnect) Legatus.client.disconnect();
      } catch (e) { /* ignore */ }
    });
    global.addEventListener('idsys:ready', function () {
      try {
        if (Legatus.client && Legatus.client.connect) Legatus.client.connect();
        if (Legatus.refresh) Legatus.refresh();
      } catch (e) { /* ignore */ }
    });
  }

  /**
   * @param {object} [opts]
   * @param {string|HTMLElement|NodeList} [opts.slot]
   * @param {string} [opts.endpoint]
   */
  function mountLegatusInHeader(opts) {
    opts = opts || {};
    var endpoint = opts.endpoint || 'https://legatus.quizzman.com';
    var slotSel = opts.slot || '[data-qmf-notification-slot]';

    return ensureAssets().then(function (Legatus) {
      var slots = collectSlots(slotSel);
      if (!slots.length) {
        console.warn('[QMF Legatus] notification slot not found:', slotSel);
        return null;
      }

      Legatus.init({
        endpoint: endpoint,
        autoConnect: true,
        toastHost: true,
        tokenProvider: function () { return resolveToken(); },
      });

      var slot = pickSlot(slots);
      ensureSingletonBell(Legatus, slot);
      wireAuth(Legatus);
      return Legatus;
    }).catch(function (err) {
      console.warn('[QMF Legatus] mount failed', err);
      return null;
    });
  }

  /** Re-attach the single bell to the currently visible slot. */
  function remountToVisibleSlot(opts) {
    opts = opts || {};
    var slotSel = opts.slot || '[data-qmf-notification-slot]';
    if (!global.Legatus) return null;
    var slot = pickSlot(collectSlots(slotSel));
    return ensureSingletonBell(global.Legatus, slot);
  }

  global.QmfLegatusBridge = {
    ensureAssets: ensureAssets,
    mountInHeader: mountLegatusInHeader,
    remountToVisibleSlot: remountToVisibleSlot,
    resolveToken: resolveToken,
  };
  global.mountLegatusInHeader = mountLegatusInHeader;
  global.remountLegatusToVisibleSlot = remountToVisibleSlot;
})(typeof window !== 'undefined' ? window : globalThis);
