/**
 * QMF Legatus bridge — Communication Hub entry.
 * Desktop: header bell slot
 * Mobile: floating orb (no header icon)
 */
(function (global) {
  'use strict';

  var CDN = 'https://ui.quizzman.com/qmf/dist/legatus';
  var VERSION = '1.1.1';
  var loading = null;
  var authWired = false;
  var layoutWired = false;

  function isMobile() {
    return !!(global.matchMedia && global.matchMedia('(max-width: 720px)').matches);
  }

  function ensureSlotHideStyle() {
    if (document.getElementById('qmf-legatus-slot-hide')) return;
    var style = document.createElement('style');
    style.id = 'qmf-legatus-slot-hide';
    style.textContent =
      '@media (max-width: 720px){' +
      '[data-qmf-notification-slot],.lab-header__notification-slot{display:none!important;}' +
      '}';
    document.head.appendChild(style);
  }

  function loadCss() {
    if (document.getElementById('qmf-legatus-css')) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var el = document.createElement('link');
      el.id = 'qmf-legatus-css';
      el.rel = 'stylesheet';
      el.href = CDN + '/legatus.css?v=' + VERSION;
      el.onload = function () { resolve(); };
      el.onerror = function () { reject(new Error('Failed to load legatus.css')); };
      document.head.appendChild(el);
    });
  }

  function loadJs() {
    if (global.Legatus && typeof global.Legatus.mount === 'function') {
      return Promise.resolve();
    }
    if (document.getElementById('qmf-legatus-js')) {
      return waitForLegatus();
    }
    return new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.id = 'qmf-legatus-js';
      el.src = CDN + '/legatus.min.js?v=' + VERSION;
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

  function resolveToken(options) {
    options = options || {};
    return Promise.resolve().then(function () {
      var auth = global.QuizzmanAuth || global.IdSysSSO;
      if (options.forceRefresh && auth && typeof auth.refreshAccessToken === 'function') {
        return Promise.resolve(auth.refreshAccessToken()).then(function (token) {
          if (token) return token;
          return resolveToken({ forceRefresh: false });
        }).catch(function () { return null; });
      }
      if (global.QuizzmanAuth && typeof global.QuizzmanAuth.getToken === 'function') {
        var qt = global.QuizzmanAuth.getToken();
        if (qt) return qt;
      }
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

  function resolveLocale(explicit) {
    if (explicit) return explicit;
    try {
      var keys = [
        'qmf-lang', 'lab-ui-lang', 'lab-lang',
        'quizzman_language', 'qm_lang', 'i18nextLng', 'qm.locale'
      ];
      for (var i = 0; i < keys.length; i++) {
        var v = localStorage.getItem(keys[i]);
        if (v) return v;
      }
    } catch (e) { /* private mode */ }
    return (document.documentElement && document.documentElement.lang) ||
      (navigator.language || 'en');
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

  function pickSlot(slots) {
    for (var i = 0; i < slots.length; i++) {
      if (isVisible(slots[i])) return slots[i];
    }
    return slots[0] || null;
  }

  function ensureSingletonBell(Legatus, targetSlot) {
    var bells = Array.prototype.slice.call(document.querySelectorAll('legatus-bell'));
    var bell = bells[0] || null;

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

  function hasAuthSession() {
    try {
      if (document.body && document.body.classList.contains('authenticated')) return true;
    } catch (e) { /* ignore */ }
    try {
      if (global.QuizzmanAuth && typeof global.QuizzmanAuth.getToken === 'function' && global.QuizzmanAuth.getToken()) {
        return true;
      }
      if (global.IdSysSSO && typeof global.IdSysSSO.getToken === 'function' && global.IdSysSSO.getToken()) {
        return true;
      }
    } catch (e) { /* ignore */ }
    try {
      if (/(?:^|; )jwt_token=/.test(document.cookie)) return true;
      if (localStorage.getItem('jwt_token') || localStorage.getItem('authToken')) return true;
    } catch (e) { /* ignore */ }
    return !!global.__QM_ACCESS_TOKEN__;
  }

  /** Keep Legatus slot as the last child of .lab-header__actions (after login/chip). */
  function pinSlotsAfterAuth(slots) {
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      if (!slot || !slot.parentElement) continue;
      slot.parentElement.appendChild(slot);
      slot.setAttribute('aria-label', 'Legatus');
    }
  }

  function setDesktopSlotAuth(slots, on) {
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      if (!slot) continue;
      if (on) slot.setAttribute('data-legatus-auth', '1');
      else slot.removeAttribute('data-legatus-auth');
    }
  }

  function clearDesktopEntry() {
    document.querySelectorAll('legatus-bell').forEach(function (b) { b.remove(); });
    document.querySelectorAll('[data-qmf-notification-slot]').forEach(function (s) {
      s.removeAttribute('data-legatus-auth');
    });
  }

  function applyLayout(Legatus, opts) {
    opts = opts || {};
    ensureSlotHideStyle();
    var slotSel = opts.slot || '[data-qmf-notification-slot]';
    var authed = hasAuthSession();

    if (isMobile()) {
      clearDesktopEntry();
      if (authed) {
        if (Legatus.ensureOrb) Legatus.ensureOrb();
      } else {
        document.querySelectorAll('legatus-orb').forEach(function (o) { o.remove(); });
      }
      return;
    }

    document.querySelectorAll('legatus-orb').forEach(function (o) { o.remove(); });
    var slots = collectSlots(slotSel);
    if (!authed) {
      clearDesktopEntry();
      return;
    }
    pinSlotsAfterAuth(slots);
    setDesktopSlotAuth(slots, true);
    var slot = pickSlot(slots);
    if (slot) ensureSingletonBell(Legatus, slot);
  }

  function wireLayout(Legatus, opts) {
    if (layoutWired) return;
    layoutWired = true;
    var mq = global.matchMedia('(max-width: 720px)');
    var onChange = function () {
      applyLayout(Legatus, opts);
      if (!isMobile() && hasAuthSession()) {
        remountToVisibleSlot(opts);
      }
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  function wireAuth(Legatus, opts) {
    if (authWired) return;
    authWired = true;

    function onReady() {
      try {
        applyLayout(Legatus, opts);
        if (Legatus.client && Legatus.client.connect) Legatus.client.connect();
        if (Legatus.refresh) Legatus.refresh();
      } catch (e) { /* ignore */ }
    }

    function onLogout() {
      try {
        clearDesktopEntry();
        document.querySelectorAll('legatus-orb').forEach(function (o) { o.remove(); });
        if (Legatus.client && Legatus.client.disconnect) Legatus.client.disconnect();
        applyLayout(Legatus, opts);
      } catch (e) { /* ignore */ }
    }

    global.addEventListener('qmf:auth-ready', onReady);
    global.addEventListener('idsys:ready', onReady);
    global.addEventListener('idsys:login', onReady);
    global.addEventListener('idsys:token-refreshed', onReady);
    global.addEventListener('qmf:auth-logout', onLogout);
    global.addEventListener('idsys:logout', onLogout);
  }

  /**
   * @param {object} [opts]
   * @param {string|HTMLElement|NodeList} [opts.slot]
   * @param {string} [opts.endpoint]
   * @param {string} [opts.locale]
   * @param {string} [opts.lang]
   */
  function mountLegatusInHeader(opts) {
    opts = opts || {};
    var endpoint = opts.endpoint || 'https://legatus.quizzman.com';
    var locale = resolveLocale(opts.locale || opts.lang);

    return ensureAssets().then(function (Legatus) {
      Legatus.init({
        endpoint: endpoint,
        autoConnect: true,
        toastHost: true,
        locale: locale,
        tokenProvider: function (options) { return resolveToken(options); },
      });

      wireAuth(Legatus, opts);
      wireLayout(Legatus, opts);
      applyLayout(Legatus, opts);
      return Legatus;
    }).catch(function (err) {
      console.warn('[QMF Legatus] mount failed', err);
      return null;
    });
  }

  function remountToVisibleSlot(opts) {
    opts = opts || {};
    var slotSel = opts.slot || '[data-qmf-notification-slot]';
    if (!global.Legatus) return null;
    if (isMobile() || !hasAuthSession()) {
      applyLayout(global.Legatus, opts);
      return null;
    }
    var slots = collectSlots(slotSel);
    pinSlotsAfterAuth(slots);
    setDesktopSlotAuth(slots, true);
    var slot = pickSlot(slots);
    return ensureSingletonBell(global.Legatus, slot);
  }

  global.QmfLegatusBridge = {
    ensureAssets: ensureAssets,
    mountInHeader: mountLegatusInHeader,
    remountToVisibleSlot: remountToVisibleSlot,
    resolveToken: resolveToken,
    isMobile: isMobile,
  };
  global.mountLegatusInHeader = mountLegatusInHeader;
  global.remountLegatusToVisibleSlot = remountToVisibleSlot;
})(typeof window !== 'undefined' ? window : globalThis);
