/**
 * QMF Shell loader (stable URL — always revalidate).
 * Loads versioned runtime so end users get updates without hard refresh.
 *
 * Consumers:
 *   <script src="https://ui.quizzman.com/qmf/dist/modules/shell/qmf-shell.js"></script>
 *
 * Fleet soft-reload: watches qmf-shell.rev (no-store). When CDN REV advances,
 * open tabs soft-reload via location.replace(?_qmf=<rev>) — never ask users
 * to hard-refresh.
 */
(function (global) {
  'use strict';

  var REV = '2.2.11';
  var pending = [];
  var loading = false;
  var revWatchStarted = false;
  var revCheckInflight = false;
  var REV_POLL_MS = 60000;

  function base() {
    if (global.QMF_BASE) return String(global.QMF_BASE).replace(/\/+$/, '');
    return 'https://ui.quizzman.com';
  }

  function runtimeSrc() {
    return base() + '/qmf/dist/modules/shell/qmf-shell.runtime.js?v=' + encodeURIComponent(REV);
  }

  function revSrc() {
    return base() + '/qmf/dist/modules/shell/qmf-shell.rev?_=' + Date.now();
  }

  /**
   * Soft-reload principle: location.replace with ?_qmf= — no hard refresh,
   * no cache-bust instruction to end users. Used after prefs / package bumps
   * and fleet REV publishes.
   */
  function softReload(reason, nextRev) {
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
      global.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') checkRemoteRev();
      });
      global.addEventListener('focus', checkRemoteRev);
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
  ensureRuntime();
  startRevWatch();
})(typeof window !== 'undefined' ? window : globalThis);
