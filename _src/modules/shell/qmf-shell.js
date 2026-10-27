/**
 * QMF Shell loader (stable URL — always revalidate).
 * Loads versioned runtime so end users get updates without hard refresh.
 *
 * Consumers:
 *   <script src="https://ui.quizzman.com/qmf/dist/modules/shell/qmf-shell.js"></script>
 *
 * Fleet soft-reload: watches qmf-shell.rev (no-store). When CDN REV advances,
 * open tabs soft-reload via location.replace(?_qmf=<rev>) — except editors,
 * live hosts/players, and games (notice-only popup).
 */
(function (global) {
  'use strict';

  var REV = '2.2.83';
  var pending = [];
  var loading = false;
  var revWatchStarted = false;
  var revCheckInflight = false;
  var REV_POLL_MS = 60000;
  var gtagStarted = false;
  var adsStarted = false;
  /** @type {{ reason: string, nextRev: string }|null} */
  var pendingSoft = null;
  var pendingFlushBound = false;

  function base() {
    if (global.QMF_BASE) return String(global.QMF_BASE).replace(/\/+$/, '');
    return 'https://ui.quizzman.com';
  }

  /**
   * Production: silence console.log/info/debug.
   * Keep warn/error. Re-enable with ?qmf-debug=1, localStorage qmf-debug=1, or window.QMF_DEBUG.
   */
  function ensureQuietConsole() {
    if (global.__QMF_CONSOLE_READY__) return;
    global.__QMF_CONSOLE_READY__ = true;
    var debug = false;
    try {
      if (global.QMF_DEBUG === true) debug = true;
      else if (/(?:^|[?&])qmf-debug=1(?:&|$)/.test(String(global.location && global.location.search || ''))) debug = true;
      else if (global.localStorage && global.localStorage.getItem('qmf-debug') === '1') debug = true;
    } catch (e) { /* ignore */ }
    var host = '';
    try { host = String(global.location && global.location.hostname || ''); } catch (e2) { /* ignore */ }
    var isLocal = !host || host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0'
      || host === '::1' || /\.local$/i.test(host) || /\.test$/i.test(host)
      || /(^|\.)dev\./i.test(host) || /staging/i.test(host);
    global.__QMF_DEBUG__ = debug || isLocal;
    if (global.__QMF_DEBUG__) return;
    try {
      var noop = function () {};
      console.log = noop;
      console.debug = noop;
      console.info = noop;
    } catch (e3) { /* ignore */ }
  }

  /**
   * Consent Mode v2 defaults — sync, before any Google script (gtag / AdSense).
   * Regulated regions (EEA/UK/CH) denied until Google CMP updates.
   */
  function ensureConsentDefaults() {
    if (global.__QMF_CONSENT_DEFAULT__) return;
    if (global.QMF_CONSENT_MODE === false) return;
    global.__QMF_CONSENT_DEFAULT__ = true;
    try {
      global.dataLayer = global.dataLayer || [];
      if (typeof global.gtag !== 'function') {
        global.gtag = function () { global.dataLayer.push(arguments); };
      }
      var wait = typeof global.QMF_CONSENT_WAIT === 'number' ? global.QMF_CONSENT_WAIT : 500;
      var granted = {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
        analytics_storage: 'granted',
        wait_for_update: wait,
      };
      var denied = {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
        region: [
          'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
          'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
          'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH',
        ],
      };
      if (global.QMF_CONSENT_DEFAULT && typeof global.QMF_CONSENT_DEFAULT === 'object') {
        global.gtag('consent', 'default', Object.assign({ wait_for_update: wait }, global.QMF_CONSENT_DEFAULT));
      } else {
        global.gtag('consent', 'default', granted);
        global.gtag('consent', 'default', denied);
      }
      if (global.QMF_CONSENT_URL_PASSTHROUGH !== false) {
        global.gtag('set', 'url_passthrough', true);
      }
      if (global.QMF_CONSENT_ADS_REDACTION !== false) {
        global.gtag('set', 'ads_data_redaction', true);
      }
    } catch (e) { /* ignore */ }
  }

  /**
   * GA4 for every shell consumer (home / lab / tools / …).
   * Non-blocking — does not wait for runtime mount.
   * Standalone: /qmf/dist/modules/analytics/gtag.js
   */
  function ensureGtag() {
    if (gtagStarted) return;
    gtagStarted = true;
    if (global.QMF_DISABLE_ANALYTICS === true || global.QMF_GTAG === false) return;
    if (global.__QMF_GTAG_INIT__ || global.QmfGtag) return;
    try {
      var s = document.createElement('script');
      s.id = 'qmf-analytics-gtag';
      s.async = true;
      s.src = base() + '/qmf/dist/modules/analytics/gtag.js?v=1.1.0';
      (document.head || document.documentElement).appendChild(s);
    } catch (e) { /* ignore */ }
  }

  /**
   * Ads runtime for every shell consumer.
   * Non-blocking — does not wait for runtime mount.
   * Official AdSense snippet is injected by modules/ads/ads.js on production:
   *   adsbygoogle.js?client=ca-pub-9878200690154577  (async, crossorigin=anonymous)
   * Ad units stay entitlement-gated. Standalone: /qmf/dist/modules/ads/ads.js
   */
  function ensureAds() {
    if (adsStarted) return;
    adsStarted = true;
    if (global.QmfAds || global.__QMF_ADS_MODULE__) return;
    try {
      if (typeof document !== 'undefined' && document.getElementById && document.getElementById('qmf-ads-runtime')) return;
      var s = document.createElement('script');
      s.id = 'qmf-ads-runtime';
      s.async = true;
      s.src = base() + '/qmf/dist/modules/ads/ads.js?v=1.0.2';
      (document.head || document.documentElement).appendChild(s);
    } catch (e) { /* ignore */ }
  }

  function runtimeSrc() {
    return base() + '/qmf/dist/modules/shell/qmf-shell.runtime.js?v=' + encodeURIComponent(REV);
  }

  function revSrc() {
    return base() + '/qmf/dist/modules/shell/qmf-shell.rev?_=' + Date.now();
  }

  /** Fleet publish / cross-tab REV signals — not user prefs or recovery reloads. */
  function isFleetPublishReason(reason) {
    var r = String(reason || '');
    if (r.indexOf('shell:rev') === 0) return true;
    if (r === 'shell:bc' || r === 'shell:storage' || r === 'cache flush') return true;
    if (r === 'shell:runtime-mismatch') return true;
    return false;
  }

  /** Editors, live sessions, and games — defer fleet reload until user leaves. */
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

  /** One dismissible English notice per target REV (session). */
  function showFleetUpdateNotice(rev) {
    try {
      var key = 'qmf_shell_update_notice_' + rev;
      if (sessionStorage.getItem(key) === '1') return;
      if (fleetUpdateNoticeEl && fleetUpdateNoticeEl.isConnected) return;
      if (!document.body) {
        document.addEventListener('DOMContentLoaded', function () {
          showFleetUpdateNotice(rev);
        }, { once: true });
        return;
      }

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

  /** True while the user is editing a field — never steal focus via soft-reload. */
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

  function performSoftReload(reason, nextRev) {
    try {
      var rev = nextRev || REV;
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

  function flushPendingSoftReload() {
    if (!pendingSoft) return;
    if (isTypingContext()) return;
    var job = pendingSoft;
    pendingSoft = null;
    if (isFleetPublishReason(job.reason) && isProtectedSoftReloadContext()) {
      showFleetUpdateNotice(job.nextRev);
      return;
    }
    performSoftReload(job.reason, job.nextRev);
  }

  function bindPendingSoftFlush() {
    if (pendingFlushBound) return;
    pendingFlushBound = true;
    try {
      document.addEventListener(
        'focusout',
        function () {
          setTimeout(flushPendingSoftReload, 50);
        },
        true,
      );
      global.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') flushPendingSoftReload();
      });
    } catch (e) { /* ignore */ }
  }

  /**
   * Soft-reload principle: location.replace with ?_qmf= — no hard refresh,
   * no cache-bust instruction to end users. Used after prefs / package bumps
   * and fleet REV publishes.
   * Deferred while an input/textarea has focus (create forms, editor, etc.).
   */
  function softReload(reason, nextRev) {
    var rev = nextRev || REV;
    var why = reason || 'manual';
    if (isFleetPublishReason(why) && isProtectedSoftReloadContext()) {
      showFleetUpdateNotice(rev);
      try {
        console.info('[QMFShell] fleet update notice (protected):', why, rev);
      } catch (e1) { /* ignore */ }
      return;
    }
    if (isTypingContext()) {
      pendingSoft = { reason: why, nextRev: rev };
      bindPendingSoftFlush();
      try {
        console.info('[QMFShell] soft-reload deferred (typing):', why, rev);
      } catch (e0) { /* ignore */ }
      return;
    }
    pendingSoft = null;
    performSoftReload(why, rev);
  }

  /** One-shot soft-reload (guarded per target REV). */
  function softReloadOnce(reason, nextRev) {
    var rev = nextRev || REV;
    try {
      if (sessionStorage.getItem('qmf_shell_soft_reload') === rev) return;
      sessionStorage.setItem('qmf_shell_soft_reload', rev);
      try {
        localStorage.setItem('qmf_shell_rev_signal', JSON.stringify({
          rev: rev,
          reason: reason || 'cache flush',
          t: Date.now(),
        }));
      } catch (e0) { /* ignore */ }
      try {
        if (global.__qmfShellBc) {
          global.__qmfShellBc.postMessage({ rev: rev, reason: reason || 'cache flush' });
        }
      } catch (e1) { /* ignore */ }
      if (isFleetPublishReason(reason) && isProtectedSoftReloadContext()) {
        showFleetUpdateNotice(rev);
        try {
          console.info('[QMFShell] fleet update notice (protected):', reason || 'cache flush', rev);
        } catch (e2) { /* ignore */ }
        return;
      }
      softReload(reason || 'cache flush', rev);
    } catch (e) {
      try { global.location.reload(); } catch (e2) { /* ignore */ }
    }
  }

  function parseRemoteRev(text) {
    if (!text) return '';
    var line = String(text).trim().split(/\r?\n/)[0] || '';
    var rev = line.replace(/^\uFEFF/, '').trim().split(/\s+/)[0] || '';
    return /^[0-9A-Za-z._+-]+$/.test(rev) ? rev : '';
  }

  function checkRemoteRev() {
    if (revCheckInflight) return;
    revCheckInflight = true;
    var done = function () { revCheckInflight = false; };
    try {
      fetch(revSrc(), { cache: 'no-store', credentials: 'omit', mode: 'cors' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (text) {
          var remote = parseRemoteRev(text);
          if (remote && remote !== REV) {
            softReloadOnce('shell:rev ' + REV + '→' + remote, remote);
          }
        })
        .catch(function () { /* ignore */ })
        .then(done, done);
    } catch (e) {
      done();
    }
  }

  function startRevWatch() {
    if (revWatchStarted) return;
    revWatchStarted = true;

    try {
      var bc = new BroadcastChannel('qmf-shell-rev');
      global.__qmfShellBc = bc;
      bc.onmessage = function (ev) {
        var data = ev && ev.data;
        if (data && data.rev && data.rev !== REV) {
          softReloadOnce('shell:bc', data.rev);
        }
      };
    } catch (e) { /* ignore */ }

    try {
      global.addEventListener('storage', function (ev) {
        if (!ev || ev.key !== 'qmf_shell_rev_signal' || !ev.newValue) return;
        try {
          var data = JSON.parse(ev.newValue);
          if (data && data.rev && data.rev !== REV) {
            softReloadOnce('shell:storage', data.rev);
          }
        } catch (e2) { /* ignore */ }
      });
    } catch (e) { /* ignore */ }

    try {
      // Tab visible again — check fleet REV. Do NOT hook window `focus`:
      // that races with clicking into inputs and can soft-reload mid-keystroke.
      global.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') checkRemoteRev();
      });
    } catch (e) { /* ignore */ }

    // Initial + periodic poll so long-lived tabs pick up publishes.
    setTimeout(checkRemoteRev, 2500);
    try {
      setInterval(checkRemoteRev, REV_POLL_MS);
    } catch (e) { /* ignore */ }
  }

  function drain() {
    var jobs = pending.splice(0, pending.length);
    for (var i = 0; i < jobs.length; i++) {
      try {
        global.QMFShell.mount(jobs[i].opts).then(jobs[i].resolve, jobs[i].reject);
      } catch (err) {
        jobs[i].reject(err);
      }
    }
  }

  function installStub() {
    global.QMFShell = {
      _loaderRev: REV,
      mount: function (opts) {
        return new Promise(function (resolve, reject) {
          pending.push({ opts: opts || {}, resolve: resolve, reject: reject });
          ensureRuntime();
        });
      },
      version: function () {
        return { shell: REV, packages: {}, loader: true };
      },
      user: function () { return null; },
      refresh: function () { return Promise.resolve(null); },
      softReload: softReload,
      logout: function () {},
      destroy: function () {},
      get base() { return base(); },
      set base(v) { global.QMF_BASE = v; },
      registry: { register: function () {}, get: function () { return null; }, list: function () { return []; } },
    };
  }

  function ensureRuntime() {
    if (loading) return;
    if (global.QMFShell && global.QMFShell.Runtime && global.QMFShell.Runtime.shell) {
      // Stale full-shell already on page with older REV — soft-reload fleet.
      if (global.QMFShell.Runtime.shell !== REV) {
        softReloadOnce('shell:runtime-mismatch', REV);
        return;
      }
      drain();
      return;
    }
    loading = true;
    var s = document.createElement('script');
    s.src = runtimeSrc();
    s.async = false;
    s.onload = function () {
      loading = false;
      if (!global.QMFShell || !global.QMFShell.Runtime) {
        softReloadOnce('runtime missing after load');
        return;
      }
      if (global.QMFShell.Runtime.shell !== REV) {
        softReloadOnce('shell:runtime-mismatch', REV);
        return;
      }
      try {
        if (sessionStorage.getItem('qmf_shell_soft_reload') === REV) {
          sessionStorage.removeItem('qmf_shell_soft_reload');
        }
      } catch (e) { /* ignore */ }
      drain();
    };
    s.onerror = function () {
      loading = false;
      softReloadOnce('runtime failed to load');
      for (var i = 0; i < pending.length; i++) {
        pending[i].reject(new Error('Failed to load QMFShell runtime'));
      }
      pending.length = 0;
    };
    document.head.appendChild(s);
  }

  // If a broken cached full-shell already assigned QMFShell without Runtime, replace stub.
  if (!global.QMFShell || !global.QMFShell.Runtime) {
    installStub();
  }
  ensureQuietConsole();
  ensureConsentDefaults();
  ensureGtag();
  ensureAds();
  ensureRuntime();
  startRevWatch();
})(typeof window !== 'undefined' ? window : globalThis);
