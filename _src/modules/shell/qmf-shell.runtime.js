/**
 * QMF Shell — thin bootstrap (not a God Object).
 *
 * Pipeline: resolveBase → prefs-detect → waitSSO
 *           → mountHeader → mountWidget → runPlugins → emit qmf:auth
 *
 * UI (Lumen bar, plan ring, menus) lives in auth-widget / header modules.
 *
 * @version 2.2.16
 */
(function (global) {
  'use strict';

  var Runtime = {
    shell: '2.2.16',
    packages: {
      header: '3.10.4',
      auth: '1.5.9',
      legatus: '1.3.1',
      sso: '20260721',
      i18n: '1.0.3',
      prefs: '1.0.0',
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
      url: moduleUrl('modules/header/legatus-bridge.js', pk.header),
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
      loginUrl: opts.loginUrl || (resolveIdBase() + '/login?redirect_uri=' + encodeURIComponent(global.location.href)),
      profileUrl: opts.profileUrl || accountUrl,
      settingsUrl: opts.settingsUrl || accountUrl,
    }, opts.header || {});

    // Allow top-level brand fields
    ['brandName', 'pageTitle', 'productSub', 'logoSrc', 'logoSrcDark', 'mainLogoLink',
      'brandHref', 'showGlobalNav', 'showSearch', 'showChat', 'showFriend', 'showJoinQuiz',
      'headerInFlow', 'searchPlaceholder', 'searchUrl', 'navItems'].forEach(function (k) {
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
    var redirectLogin = opts.loginUrl ||
      (resolveIdBase() + '/login?redirect_uri=' + encodeURIComponent(global.location.href));

    var detectedLang = (global.QmfPrefsDetect && global.QmfPrefsDetect.getLang && global.QmfPrefsDetect.getLang()) || null;

    state.widget = global.createAuthWidget({
      container: container,
      lang: opts.lang || detectedLang || undefined,
      apiEndpoint: opts.apiEndpoint || (resolveIdBase() + '/api/auth/me'),
      loginUrl: redirectLogin,
      accountUrl: accountUrl,
      logoutUrl: opts.logoutUrl || (resolveIdBase() + '/logout'),
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
            token: state.token || undefined,
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

  /** Soft-reload principle — replace navigation with ?_qmf=, never ask users to hard refresh. */
  function softReload(reason, nextRev) {
    try {
      var rev = nextRev || Runtime.shell;
      console.warn('[QMFShell] soft-reload:', reason || 'manual', rev);
      var u = new URL(global.location.href);
      u.searchParams.set('_qmf', rev);
      if (reason) u.searchParams.set('_qmf_why', String(reason).slice(0, 48));
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
    // Fallback: clear on id-sys then land on /login?logged_out=1 (no silent refresh).
    var dest = (state.opts && state.opts.logoutUrl) || (resolveIdBase() + '/logout');
    try {
      var land = new URL(resolveIdBase() + '/login');
      land.searchParams.set('logged_out', '1');
      try {
        var here = new URL(global.location.href);
        if (here.hostname.endsWith('quizzman.com')
            && !(here.hostname === 'id.quizzman.com' && here.pathname.indexOf('/login') === 0)) {
          land.searchParams.set('redirect', global.location.href);
        }
      } catch (e0) { /* ignore */ }
      var u = new URL(dest, global.location.origin);
      u.searchParams.set('redirect_uri', land.toString());
      u.searchParams.set('redirect', land.toString());
      global.location.assign(u.toString());
    } catch (e2) {
      global.location.href = resolveIdBase() + '/logout?redirect=' + encodeURIComponent(resolveIdBase() + '/login?logged_out=1');
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

  console.log('[QMFShell] ready v' + Runtime.shell, Runtime.packages);
})(typeof window !== 'undefined' ? window : globalThis);
