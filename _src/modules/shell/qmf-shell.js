/**
 * QMF Shell loader (stable URL — always revalidate).
 * Loads versioned runtime so end users get updates without hard refresh.
 *
 * Consumers:
 *   <script src="https://ui.quizzman.com/qmf/dist/modules/shell/qmf-shell.js"></script>
 */
(function (global) {
  'use strict';

  var REV = '2.1.3';
  var pending = [];
  var loading = false;

  function base() {
    if (global.QMF_BASE) return String(global.QMF_BASE).replace(/\/+$/, '');
    return 'https://ui.quizzman.com';
  }

  function runtimeSrc() {
    return base() + '/qmf/dist/modules/shell/qmf-shell.runtime.js?v=' + encodeURIComponent(REV);
  }

  function softReloadOnce(reason) {
    try {
      if (sessionStorage.getItem('qmf_shell_soft_reload') === REV) return;
      sessionStorage.setItem('qmf_shell_soft_reload', REV);
      console.warn('[QMFShell] soft-reload once:', reason || 'cache flush');
      var u = new URL(global.location.href);
      u.searchParams.set('_qmf', REV);
      global.location.replace(u.toString());
    } catch (e) {
      try { global.location.reload(); } catch (e2) { /* ignore */ }
    }
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
})(typeof window !== 'undefined' ? window : globalThis);
