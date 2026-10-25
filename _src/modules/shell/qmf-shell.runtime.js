/**
 * QMF Shell — thin bootstrap (not a God Object).
 *
 * Pipeline: resolveBase → prefs-detect → waitSSO
 *           → mountHeader → mountWidget → runPlugins → emit qmf:auth
 *
 * UI (Lumen bar, plan ring, menus) lives in auth-widget / header modules.
 *
 * @version 2.2.66
 */
(function (global) {
  'use strict';

  var Runtime = {
    shell: '2.2.82',
    packages: {
      header: '3.13.11',
      auth: '2.0.9',
      legatus: '1.3.11',
      sso: '20260906noloop',
      i18n: '1.0.6',
      prefs: '1.0.5',
      analytics: '1.1.0',
      ads: '1.0.2',
    },
  };

  var ACCOUNT = 'https://id.quizzman.com/account';
  var state = {
    mounted: false,
    user: null,
    token: null,
    opts: null,
    header: null,
    widget: null,
    destroyed: false,
  };

  /* ─── base / registry ─────────────────────────────────────── */

  // Never read QMFShell.base here — that getter calls resolveBase() (infinite loop).
  function resolveBase() {
    if (global.QMF_BASE) return String(global.QMF_BASE).replace(/\/+$/, '');
    return 'https://ui.quizzman.com';
  }

  function resolveIdBase() {
    if (global.QMF_ID_BASE) return String(global.QMF_ID_BASE).replace(/\/+$/, '');
    return 'https://id.quizzman.com';
  }

  var registry = Object.create(null);

  function register(name, entry) {
    if (!name || !entry) throw new Error('[QMFShell] register(name, entry) required');
    registry[name] = entry;
    return api;
  }

  function getEntry(name) {
    return registry[name] || null;
  }

  function moduleUrl(relPath, version) {
    var base = resolveBase();
    var v = version ? ('?v=' + encodeURIComponent(version)) : '';
    return base + '/qmf/dist/' + relPath.replace(/^\//, '') + v;
  }

  function loadScript(src, id) {
    return new Promise(function (resolve, reject) {
      if (id && document.getElementById(id)) {
        resolve();
        return;
      }
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        if (existing.dataset.loaded === '1') return resolve();
        existing.addEventListener('load', function () { resolve(); }, { once: true });
        existing.addEventListener('error', function () { reject(new Error('Failed: ' + src)); }, { once: true });
        return;
      }
      var s = document.createElement('script');
      if (id) s.id = id;
      s.src = src;
      s.async = false;
      s.onload = function () {
        s.dataset.loaded = '1';
        resolve();
      };
      s.onerror = function () { reject(new Error('Failed: ' + src)); };
      document.head.appendChild(s);
    });
  }

  function loadCss(href, id) {
    return new Promise(function (resolve) {
      if (id && document.getElementById(id)) return resolve();
      if (document.querySelector('link[href="' + href + '"]')) return resolve();
      var l = document.createElement('link');
      if (id) l.id = id;
      l.rel = 'stylesheet';
      l.href = href;
      l.onload = function () { resolve(); };
      l.onerror = function () { resolve(); };
      document.head.appendChild(l);
    });
  }

  async function loadEntry(name) {
    var entry = getEntry(name);
    if (!entry) throw new Error('[QMFShell] unknown module: ' + name);
    if (entry.loaded) return entry;
    if (typeof entry.factory === 'function') {
      await entry.factory();
      entry.loaded = true;
      return entry;
    }
    var jobs = [];
    if (entry.css) jobs.push(loadCss(entry.css, 'qmf-shell-css-' + name));
    if (entry.url) jobs.push(loadScript(entry.url, 'qmf-shell-js-' + name));
    if (entry.urls && entry.urls.length) {
      for (var i = 0; i < entry.urls.length; i++) {
        jobs.push(loadScript(entry.urls[i], 'qmf-shell-js-' + name + '-' + i));
      }
    }
    await Promise.all(jobs);
    entry.loaded = true;
    return entry;
  }

  /* ─── builtins ────────────────────────────────────────────── */

  function registerBuiltins() {
    var pk = Runtime.packages;
    register('prefs', {
      version: pk.prefs,
      url: moduleUrl('modules/prefs-detect/prefs-detect.js', pk.prefs),
    });
    register('sso', {
      version: pk.sso,
      url: resolveIdBase() + '/module/sso-refresh.js?v=' + pk.sso,
    });
    register('header', {
      version: pk.header,
      css: moduleUrl('modules/header/lab-header.css', pk.header),
      urls: [
        moduleUrl('modules/header/unified-header.js', pk.header),
      ],
    });
    register('auth', {
      version: pk.auth,
      url: moduleUrl('modules/auth-widget/auth-widget.js', pk.auth),
    });
    register('legatus', {
      version: pk.legatus,
      // Bust bridge + SDK together (do not pin bridge to header rev — CF immutable).
      url: moduleUrl('modules/header/legatus-bridge.js', pk.legatus),
      plugin: true,
    });
  }

  /* ─── events ──────────────────────────────────────────────── */

  function emitAuth(type, extra) {
    var detail = Object.assign({ type: type, user: state.user, token: state.token }, extra || {});
    try {
      global.dispatchEvent(new CustomEvent('qmf:auth', { detail: detail }));
    } catch (e) { /* ignore */ }
    // Temporary bridge for legacy listeners (remove after migrate).
    try {
      if (type === 'ready') {
        global.dispatchEvent(new CustomEvent('qmf:auth-ready', { detail: { user: state.user, token: state.token } }));
      } else if (type === 'logout') {
        global.dispatchEvent(new CustomEvent('qmf:auth-logout', { detail: detail }));
      }
    } catch (e2) { /* ignore */ }
  }

  function aliasSso() {
    if (global.QuizzmanSSO) {
      global.IdSysSSO = global.IdSysSSO || global.QuizzmanSSO;
      global.QuizzmanAuth = global.QuizzmanAuth || global.QuizzmanSSO;
    } else if (global.IdSysSSO) {
      global.QuizzmanSSO = global.QuizzmanSSO || global.IdSysSSO;
      global.QuizzmanAuth = global.QuizzmanAuth || global.IdSysSSO;
    } else if (global.QuizzmanAuth) {
      global.QuizzmanSSO = global.QuizzmanSSO || global.QuizzmanAuth;
      global.IdSysSSO = global.IdSysSSO || global.QuizzmanAuth;
    }
  }

  async function waitSSO(opts) {
    if (opts.skipSso) {
      aliasSso();
      return;
    }
    if (opts.ssoScript) {
      await loadScript(opts.ssoScript, 'qmf-shell-sso-custom');
    } else if (!global.QuizzmanSSO && !global.IdSysSSO && !global.QuizzmanAuth) {
      try {
        await loadEntry('sso');
      } catch (err) {
        console.warn('[QMFShell] SSO load failed:', err && err.message);
      }
    }
    aliasSso();
    if (global.QuizzmanAuth && typeof global.QuizzmanAuth.handleTokenFromUrl === 'function') {
      try { global.QuizzmanAuth.handleTokenFromUrl(); } catch (e) { /* ignore */ }
    }
  }

  function waitForSelector(sel, timeoutMs) {
    return new Promise(function (resolve) {
      var start = Date.now();
      (function tick() {
        var el = typeof sel === 'string' ? document.querySelector(sel) : sel;
        if (el) return resolve(el);
        if (Date.now() - start > (timeoutMs || 8000)) return resolve(null);
        setTimeout(tick, 40);
      })();
    });
  }

  /* ─── mount steps ─────────────────────────────────────────── */

  /**
   * First-visit lang/theme/region detect — runs before chrome/auth so
   * account hydrate can still override afterward.
   */
  async function bootstrapPrefs(opts) {
    if (opts.prefs === false || opts.prefsDetect === false) return null;
    try {
      await loadEntry('prefs');
    } catch (err) {
      console.warn('[QMFShell] prefs-detect load failed:', err && err.message);
      return null;
    }
    var detectOpts = opts.prefsDetect || opts.prefs;
    if (detectOpts && typeof detectOpts === 'object') {
      /* keep */
    } else {
      detectOpts = {};
    }
    if (opts.lang && detectOpts.lang == null) detectOpts.lang = opts.lang;
    if (opts.theme && detectOpts.theme == null) detectOpts.theme = opts.theme;
    if (opts.region && detectOpts.region == null) detectOpts.region = opts.region;

    if (global.QmfPrefsDetect && typeof global.QmfPrefsDetect.mount === 'function') {
      try {
        return global.QmfPrefsDetect.mount(detectOpts);
      } catch (e) {
        console.warn('[QMFShell] prefs-detect mount failed:', e && e.message);
      }
    }
    return null;
  }

  async function mountHeader(opts) {
    await loadEntry('header');
    if (typeof global.createUnifiedHeader !== 'function') {
      throw new Error('[QMFShell] createUnifiedHeader missing');
    }
    var accountUrl = opts.accountUrl || ACCOUNT;
    var headerOpts = Object.assign({
      showUserDropdown: false,
      showNotification: opts.auth !== false,
      autoMountLegatus: false,
      loginUrl: opts.loginUrl || '#login',
      profileUrl: opts.profileUrl || accountUrl,
      settingsUrl: opts.settingsUrl || accountUrl,
    }, opts.header || {});

    // Allow top-level brand fields
    ['brandName', 'pageTitle', 'productSub', 'logoSrc', 'logoSrcDark', 'mainLogoLink',
      'brandHref', 'showGlobalNav', 'showSearch', 'showChat', 'showFriend', 'showJoinQuiz',
      'showThemeToggle', 'showLangSwitch',
      'headerInFlow', 'searchPlaceholder', 'searchUrl', 'searchApiUrl', 'navItems'].forEach(function (k) {
      if (opts[k] !== undefined && headerOpts[k] === undefined) headerOpts[k] = opts[k];
    });

    var root = opts.headerRoot || opts.container || '#qmf-header';
    state.header = global.createUnifiedHeader(root, headerOpts);
    return state.header;
  }

  async function mountWidget(opts) {
    if (opts.auth === false) return null;
    await loadEntry('auth');
    if (typeof global.createAuthWidget !== 'function') {
      throw new Error('[QMFShell] createAuthWidget missing');
    }

    var container = opts.authContainer ||
      (opts.headerRoot ? String(opts.headerRoot) + ' .lab-header__actions' : null) ||
      '.lab-header__actions, .qmf-header__actions, [data-qmf-auth-slot]';

    await waitForSelector(
      typeof container === 'string' && container.indexOf(' ') >= 0
        ? container
        : (typeof container === 'string' ? container + ' , .lab-header__actions' : container),
      8000
    );

    var accountUrl = opts.accountUrl || ACCOUNT;
    var redirectLogin = opts.loginUrl || '#login';

    var detectedLang = (global.QmfPrefsDetect && global.QmfPrefsDetect.getLang && global.QmfPrefsDetect.getLang()) || null;

    var defaultMe = (global.location && String(global.location.pathname).indexOf('/assignment') === 0)
      ? '/assignment/api/auth/me'
      : '/api/auth/me';
    state.widget = global.createAuthWidget({
      container: container,
      lang: opts.lang || detectedLang || undefined,
      apiEndpoint: opts.apiEndpoint || defaultMe,
      loginUrl: redirectLogin,
      accountUrl: accountUrl,
      logoutUrl: opts.logoutUrl || (resolveIdBase() + '/oauth/logout'),
      showTierBadge: opts.showTierBadge !== false,
      showLumenBadge: opts.showLumenBadge !== false,
      showProgressRing: opts.showProgressRing !== false,
      onUserLoad: function (user, meta) {
        state.user = user || null;
        state.token = (meta && meta.token) ||
          (global.QuizzmanSSO && global.QuizzmanSSO.getToken && global.QuizzmanSSO.getToken()) ||
          (global.QuizzmanAuth && global.QuizzmanAuth.getToken && global.QuizzmanAuth.getToken()) ||
          null;
        if (state.token) {
          try { global.__QM_ACCESS_TOKEN__ = state.token; } catch (e) { /* ignore */ }
        }
        document.body.classList.add('authenticated', 'qmf-auth-widget-ready');
        emitAuth('ready');
        runPluginsAfterAuth(opts).catch(function (err) {
          console.warn('[QMFShell] plugin error:', err && err.message);
        });
        if (typeof opts.onUserLoad === 'function') {
          try { opts.onUserLoad(user, meta); } catch (e2) { /* ignore */ }
        }
      },
      onGuest: function () {
        state.user = null;
        state.token = null;
        emitAuth('guest');
        if (typeof opts.onGuest === 'function') {
          try { opts.onGuest(); } catch (e3) { /* ignore */ }
        }
      },
      onLogout: function () {
        state.user = null;
        state.token = null;
        try { global.__QM_ACCESS_TOKEN__ = null; } catch (e) { /* ignore */ }
        document.body.classList.remove('authenticated');
        document.querySelectorAll('legatus-bell, legatus-orb').forEach(function (el) { el.remove(); });
        emitAuth('logout');
        if (typeof opts.onLogout === 'function') {
          try { opts.onLogout(); } catch (e2) { /* ignore */ }
        }
      },
    });
    return state.widget;
  }

  async function runPluginsAfterAuth(opts) {
    var list = opts.plugins;
    if (!list) list = (opts.auth === false) ? [] : ['legatus'];
    if (!Array.isArray(list)) list = [];
    for (var i = 0; i < list.length; i++) {
      var name = list[i];
      if (!name) continue;
      if (name === 'legatus') {
        await loadEntry('legatus');
        if (typeof global.mountLegatusInHeader === 'function') {
          await global.mountLegatusInHeader({
            slot: opts.legatusSlot || '[data-qmf-notification-slot]',
            endpoint: opts.legatusEndpoint || 'https://legatus.quizzman.com',
          });
        }
      } else {
        var entry = getEntry(name);
        if (!entry) {
          console.warn('[QMFShell] plugin not registered:', name);
          continue;
        }
        await loadEntry(name);
        if (typeof entry.mount === 'function') {
          await entry.mount({ user: state.user, token: state.token, opts: opts });
        }
      }
    }
  }

  /* ─── public API ──────────────────────────────────────────── */

  async function mount(opts) {
    opts = opts || {};
    if (state.mounted && !opts.force) {
      console.warn('[QMFShell] already mounted; pass { force: true } to remount');
      return api;
    }
    state.destroyed = false;
    state.opts = opts;
    registerBuiltins();

    // Allow app to register extra packages before load
    if (typeof opts.register === 'function') {
      opts.register(api.registry);
    }

    // Prefs detect before SSO/header/auth — account settings win later.
    await bootstrapPrefs(opts);
    await waitSSO(opts);
    if (!opts.authOnly) {
      await mountHeader(opts);
    }
    await mountWidget(opts);
    if (opts.auth === false) {
      emitAuth('guest');
    }
    state.mounted = true;
    return api;
  }

  function version() {
    return JSON.parse(JSON.stringify(Runtime));
  }

  function user() {
    return state.user;
  }

  function refresh() {
    if (state.widget && typeof state.widget.refresh === 'function') {
      return Promise.resolve(state.widget.refresh()).then(function () {
        emitAuth('refresh');
        return state.user;
      });
    }
    if (global.QuizzmanSSO && typeof global.QuizzmanSSO.refreshAccessToken === 'function') {
      return global.QuizzmanSSO.refreshAccessToken().then(function (token) {
        if (token) {
          state.token = token;
          try { global.__QM_ACCESS_TOKEN__ = token; } catch (e) { /* ignore */ }
          emitAuth('refresh');
        } else {
          emitAuth('expired');
        }
        return token;
      });
    }
    return Promise.resolve(null);
  }

  function isFleetPublishReason(reason) {
    var r = String(reason || '');
    if (r.indexOf('shell:rev') === 0) return true;
    if (r === 'shell:bc' || r === 'shell:storage' || r === 'cache flush') return true;
    if (r === 'shell:runtime-mismatch') return true;
    return false;
  }

  function isProtectedSoftReloadContext() {
    if (global.QMF_SOFT_RELOAD_DEFER === true) return true;
    try {
      var path = String(global.location.pathname || '/').toLowerCase();
      if (path.indexOf('/quiz-editor') === 0) return true;
      if (path.indexOf('/slide-studio') === 0) return true;
      if (path === '/slide' || path.indexOf('/slide/') === 0) return true;
      if (path.indexOf('/host') === 0 || path === '/live' || path.indexOf('/live/') === 0) return true;
      if (path.indexOf('/tycoon') === 0) return true;
      if (path.indexOf('/arena') === 0 || path.indexOf('/the-vault') === 0) return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  var fleetUpdateNoticeEl = null;

  function showFleetUpdateNotice(rev) {
    try {
      var key = 'qmf_shell_update_notice_' + rev;
      if (sessionStorage.getItem(key) === '1') return;
      if (fleetUpdateNoticeEl && fleetUpdateNoticeEl.isConnected) return;
      if (!document.body) return;

      sessionStorage.setItem(key, '1');

      var root = document.createElement('div');
      root.id = 'qmf-shell-update-notice';
      root.setAttribute('role', 'status');
      root.setAttribute('aria-live', 'polite');
      root.style.cssText = [
        'position:fixed',
        'z-index:2147483000',
        'left:50%',
        'bottom:max(16px,env(safe-area-inset-bottom))',
        'transform:translateX(-50%)',
        'max-width:min(420px,calc(100vw - 32px))',
        'padding:14px 16px 14px 18px',
        'border-radius:12px',
        'background:#0f172a',
        'color:#f8fafc',
        'box-shadow:0 12px 40px rgba(15,23,42,.35)',
        'font:500 14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
        'display:flex',
        'align-items:flex-start',
        'gap:12px',
      ].join(';');

      var text = document.createElement('p');
      text.style.cssText = 'margin:0;flex:1';
      text.textContent = 'Quizzman was just updated to a new version. You can keep working — reload when you\'re ready.';

      var close = document.createElement('button');
      close.type = 'button';
      close.setAttribute('aria-label', 'Dismiss');
      close.textContent = '\u00d7';
      close.style.cssText = [
        'flex:0 0 auto',
        'border:0',
        'background:transparent',
        'color:#94a3b8',
        'font:600 20px/1 system-ui,sans-serif',
        'cursor:pointer',
        'padding:0 2px',
        'margin:-2px 0 0',
      ].join(';');
      close.addEventListener('click', function () {
        try { root.remove(); } catch (e) { /* ignore */ }
        fleetUpdateNoticeEl = null;
      });

      root.appendChild(text);
      root.appendChild(close);
      document.body.appendChild(root);
      fleetUpdateNoticeEl = root;
    } catch (e) { /* ignore */ }
  }

  function isTypingContext() {
    try {
      var el = document.activeElement;
      if (!el) return false;
      var tag = String(el.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if (el.isContentEditable) return true;
      return !!(el.closest && el.closest('[contenteditable=""], [contenteditable="true"]'));
    } catch (e) {
      return false;
    }
  }

  /** Soft-reload principle — replace navigation with ?_qmf=, never ask users to hard refresh. */
  function softReload(reason, nextRev) {
    var rev = nextRev || Runtime.shell;
    var why = reason || 'manual';
    if (isFleetPublishReason(why) && isProtectedSoftReloadContext()) {
      showFleetUpdateNotice(rev);
      try {
        console.info('[QMFShell] fleet update notice (protected):', why, rev);
      } catch (e1) { /* ignore */ }
      return;
    }
    if (isTypingContext()) {
      try {
        console.info('[QMFShell] soft-reload deferred (typing):', why, rev);
      } catch (e0) { /* ignore */ }
      var pending = { reason: why, nextRev: rev };
      var onOut = function () {
        setTimeout(function () {
          if (isTypingContext()) return;
          document.removeEventListener('focusout', onOut, true);
          softReload(pending.reason, pending.nextRev);
        }, 50);
      };
      document.addEventListener('focusout', onOut, true);
      return;
    }

    try {
      console.warn('[QMFShell] soft-reload:', why, rev);
      var u = new URL(global.location.href);
      u.searchParams.set('_qmf', rev);
      if (reason) u.searchParams.set('_qmf_why', String(why).slice(0, 48));
      u.searchParams.set('_t', String(Date.now()));
      global.location.replace(u.toString());
    } catch (e) {
      try { global.location.reload(); } catch (e2) { /* ignore */ }
    }
  }

  function logout() {
    // Call widget.logout() directly — dropdown may be portaled to <body>,
    // so wrap.querySelector('.qmf-auth-logout-btn') often misses the button.
    if (state.widget && typeof state.widget.logout === 'function') {
      try {
        state.widget.logout();
        return;
      } catch (e) {
        console.warn('[QMFShell] widget.logout failed', e);
      }
    }
    emitAuth('logout');
    var dest = (state.opts && state.opts.logoutUrl) || (resolveIdBase() + '/oauth/logout');
    try {
      var land = new URL(global.location.href);
      land.hash = '';
      var u = new URL(dest, resolveIdBase());
      u.searchParams.set('post_logout_redirect_uri', land.origin + land.pathname + land.search);
      global.location.assign(u.toString());
    } catch (e2) {
      global.location.href = resolveIdBase() + '/oauth/logout';
    }
  }

  function destroy() {
    try {
      if (state.widget && typeof state.widget.destroy === 'function') state.widget.destroy();
    } catch (e) { /* ignore */ }
    document.querySelectorAll('legatus-bell, legatus-orb').forEach(function (el) { el.remove(); });
    state.mounted = false;
    state.destroyed = true;
    state.user = null;
    state.token = null;
    state.widget = null;
    state.header = null;
  }

  var api = {
    mount: mount,
    version: version,
    user: user,
    get token() { return state.token; },
    refresh: refresh,
    softReload: softReload,
    logout: logout,
    destroy: destroy,
    get base() { return resolveBase(); },
    set base(v) { global.QMF_BASE = v; },
    registry: {
      register: register,
      get: getEntry,
      list: function () { return Object.keys(registry); },
    },
    Runtime: Runtime,
  };

  global.QMFShell = api;
  if (!global.QMF) global.QMF = {};
  global.QMF.Shell = api;

  if (global.__QMF_DEBUG__) console.log('[QMFShell] ready v' + Runtime.shell, Runtime.packages);
})(typeof window !== 'undefined' ? window : globalThis);
