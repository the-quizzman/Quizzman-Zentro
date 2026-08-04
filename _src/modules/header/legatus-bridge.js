/**
 * QMF Legatus bridge — Communication Hub entry.
 * Desktop: header bell slot
 * Mobile: floating orb (no header icon)
 */
(function (global) {
  'use strict';

  var CDN = 'https://ui.quizzman.com/qmf/dist/legatus';
  var VERSION = '1.3.1';
  var ID_REFRESH_URL = 'https://id.quizzman.com/api/auth/refresh';
  var EXPIRY_SKEW_SECS = 45;
  var loading = null;
  var authWired = false;
  var layoutWired = false;
  var latestAccessToken = null;

  function decodeJwtPayload(token) {
    try {
      var part = String(token || '').split('.')[1];
      if (!part) return null;
      var json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function isTokenUsable(token) {
    if (!token) return false;
    var payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') return true;
    return payload.exp > Math.floor(Date.now() / 1000) + EXPIRY_SKEW_SECS;
  }

  function clearStoredTokens() {
    var keys = [
      'jwt_token', 'access_token', 'accessToken',
      'qm_access_token', 'quizzman_access_token', 'token', 'auth_token'
    ];
    for (var i = 0; i < keys.length; i++) {
      try { localStorage.removeItem(keys[i]); } catch (e) { /* private mode */ }
    }
    try {
      document.cookie = 'jwt_token=; path=/; domain=.quizzman.com; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'jwt_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } catch (e) { /* ignore */ }
  }

  function persistToken(token) {
    if (!token) return;
    latestAccessToken = token;
    try { localStorage.setItem('jwt_token', token); } catch (e) { /* ignore */ }
    try {
      document.cookie = 'jwt_token=' + encodeURIComponent(token) +
        '; path=/; domain=.quizzman.com; max-age=' + (90 * 24 * 60 * 60) + '; SameSite=Lax; Secure';
    } catch (e) { /* ignore */ }
    try { global.__QM_ACCESS_TOKEN__ = token; } catch (e) { /* ignore */ }
  }

  function refreshViaCookie() {
    return fetch(ID_REFRESH_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: '{}'
    }).then(function (res) {
      if (!res.ok) return null;
      return res.json().catch(function () { return null; });
    }).then(function (data) {
      var token = data && (data.token || data.accessToken || data.access_token) || null;
      if (data && data.success && token && isTokenUsable(token)) {
        persistToken(token);
        return token;
      }
      return null;
    }).catch(function () { return null; });
  }

  function ssoOwners() {
    var seen = [];
    var out = [];
    var candidates = [global.IdSysSSO, global.QuizzmanAuth, global.QuizzmanSSO];
    for (var i = 0; i < candidates.length; i++) {
      var owner = candidates[i];
      if (!owner) continue;
      var dup = false;
      for (var j = 0; j < seen.length; j++) {
        if (seen[j] === owner) { dup = true; break; }
      }
      if (dup) continue;
      seen.push(owner);
      out.push(owner);
    }
    return out;
  }

  function refreshAccessToken(force) {
    var owners = ssoOwners();
    function tryOwner(idx) {
      if (idx >= owners.length) return refreshViaCookie();
      var owner = owners[idx];
      if (typeof owner.refreshAccessToken === 'function') {
        return Promise.resolve(owner.refreshAccessToken(!!force)).then(function (token) {
          if (token && isTokenUsable(token)) {
            persistToken(token);
            return token;
          }
          return tryOwner(idx + 1);
        }).catch(function () { return tryOwner(idx + 1); });
      }
      if (typeof owner.ensureToken === 'function') {
        return Promise.resolve(owner.ensureToken()).then(function (token) {
          if (token && isTokenUsable(token)) {
            persistToken(token);
            return token;
          }
          return tryOwner(idx + 1);
        }).catch(function () { return tryOwner(idx + 1); });
      }
      return tryOwner(idx + 1);
    }
    return tryOwner(0);
  }

  function isMobile() {
    return !!(global.matchMedia && global.matchMedia('(max-width: 899px)').matches);
  }

  function ensureSlotHideStyle() {
    if (document.getElementById('qmf-legatus-slot-hide')) return;
    var style = document.createElement('style');
    style.id = 'qmf-legatus-slot-hide';
    style.textContent =
      '@media (max-width: 899px){' +
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
      if (options.forceRefresh) {
        return refreshAccessToken(true);
      }

      var candidate = null;
      var owners = ssoOwners();
      for (var oi = 0; oi < owners.length; oi++) {
        if (typeof owners[oi].getToken !== 'function') continue;
        try {
          candidate = owners[oi].getToken();
          if (candidate) break;
        } catch (e) { /* ignore */ }
      }
      if (!candidate && global.SlideStudioAuth && typeof global.SlideStudioAuth.getToken === 'function') {
        candidate = global.SlideStudioAuth.getToken();
      }
      if (!candidate) {
        try {
          var keys = [
            'jwt_token', 'access_token', 'accessToken',
            'qm_access_token', 'quizzman_access_token', 'token', 'auth_token'
          ];
          for (var i = 0; i < keys.length; i++) {
            var v = localStorage.getItem(keys[i]);
            if (v) { candidate = v; break; }
          }
        } catch (e) { /* private mode */ }
      }
      if (!candidate) {
        candidate = latestAccessToken || global.__QM_ACCESS_TOKEN__ || null;
      }

      if (candidate && isTokenUsable(candidate)) {
        latestAccessToken = candidate;
        return candidate;
      }

      if (candidate && !isTokenUsable(candidate)) {
        clearStoredTokens();
        latestAccessToken = null;
      }

      // Prefer SSO getAuth (may refresh), then cookie refresh — never return expired JWT.
      for (var gi = 0; gi < owners.length; gi++) {
        if (typeof owners[gi].getAuth === 'function') {
          return owners[gi].getAuth(true).then(function (auth) {
            var t = (auth && (auth.token || auth.accessToken)) || null;
            if (t && isTokenUsable(t)) {
              persistToken(t);
              return t;
            }
            return refreshAccessToken(true);
          }).catch(function () { return refreshAccessToken(true); });
        }
      }

      return refreshAccessToken(true);
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
    // Only treat display:none as unusable. Ignore inherited visibility:hidden
    // (FOUC gates like account-styles-ready hide <body> temporarily).
    if (style.display === 'none') return false;
    return true;
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
    // Fallback: still mount into first connected slot (FOUC / not-yet-painted).
    for (var j = 0; j < slots.length; j++) {
      if (slots[j] && slots[j].isConnected) return slots[j];
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
      var owners = ssoOwners();
      for (var i = 0; i < owners.length; i++) {
        if (typeof owners[i].getToken === 'function' && owners[i].getToken()) return true;
        if (typeof owners[i].hasSessionHint === 'function' && owners[i].hasSessionHint()) return true;
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
    var mq = global.matchMedia('(max-width: 899px)');
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

    function onReady(event) {
      try {
        var detailToken = event && event.detail &&
          (event.detail.token || event.detail.accessToken || event.detail.access_token);
        if (detailToken) latestAccessToken = detailToken;
        applyLayout(Legatus, opts);
        if (Legatus.client && Legatus.client.connect) Legatus.client.connect();
        if (Legatus.refresh) Legatus.refresh();
      } catch (e) { /* ignore */ }
    }

    function onLogout() {
      try {
        latestAccessToken = null;
        clearDesktopEntry();
        document.querySelectorAll('legatus-orb').forEach(function (o) { o.remove(); });
        if (Legatus.client && Legatus.client.disconnect) Legatus.client.disconnect();
        applyLayout(Legatus, opts);
      } catch (e) { /* ignore */ }
    }

    /** Sites that only toggle body.authenticated (no qmf:auth-ready) still remount the bell. */
    function watchBodyAuth() {
      try {
        if (typeof MutationObserver === 'undefined' || !document.body) return;
        var last = document.body.classList.contains('authenticated');
        var mo = new MutationObserver(function () {
          var now = document.body.classList.contains('authenticated');
          if (now === last) return;
          last = now;
          if (now) onReady();
          else onLogout();
        });
        mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      } catch (e) { /* ignore */ }
    }

    global.addEventListener('qmf:auth-ready', onReady);
    global.addEventListener('idsys:ready', onReady);
    global.addEventListener('idsys:login', onReady);
    global.addEventListener('idsys:token-refreshed', onReady);
    global.addEventListener('payments:auth', function (event) {
      try {
        if (event && event.detail && event.detail.user) onReady(event);
        else onLogout();
      } catch (e) { /* ignore */ }
    });
    global.addEventListener('qmf:auth-logout', onLogout);
    global.addEventListener('idsys:logout', onLogout);
    watchBodyAuth();
  }

  /**
   * @param {object} [opts]
   * @param {string|HTMLElement|NodeList} [opts.slot]
   * @param {string} [opts.endpoint]
   * @param {string} [opts.locale]
   * @param {string} [opts.lang]
   * @param {string} [opts.token]
   * @param {string} [opts.accessToken]
   */
  function mountLegatusInHeader(opts) {
    opts = opts || {};
    var endpoint = opts.endpoint || 'https://legatus.quizzman.com';
    var locale = resolveLocale(opts.locale || opts.lang);
    var bootstrapToken = opts.token || opts.accessToken || opts.access_token || null;
    if (bootstrapToken) persistToken(bootstrapToken);

    return ensureAssets().then(function (Legatus) {
      Legatus.init({
        endpoint: endpoint,
        autoConnect: true,
        toastHost: true,
        locale: locale,
        forceRestart: true,
        tokenProvider: function (options) { return resolveToken(options); },
      });

      wireAuth(Legatus, opts);
      wireLayout(Legatus, opts);
      applyLayout(Legatus, opts);
      // FOUC / late CSS: remount after body becomes visible.
      scheduleAuthRemount(opts);
      return Legatus;
    }).catch(function (err) {
      console.warn('[QMF Legatus] mount failed', err);
      return null;
    });
  }

  function scheduleAuthRemount(opts) {
    var delays = [0, 100, 300, 800, 1600];
    for (var i = 0; i < delays.length; i++) {
      (function (ms) {
        setTimeout(function () {
          if (!hasAuthSession() || !global.Legatus) return;
          remountToVisibleSlot(opts);
        }, ms);
      })(delays[i]);
    }
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
