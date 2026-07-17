/**
 * QMF Bootstrap / Loading Screen
 * Philosophy: not “loading the app” — framework bootstrapping the runtime.
 *
 * Variants:
 *   runtime (default) — QMF mark + scan glow + thin progress + status/log
 *   flashcard         — legacy fc-load wavy path (compat)
 *
 * @version 2.0.0
 */
(function () {
  'use strict';

  var VERSION = '2.0.0';
  var CDN_LOGO = 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-loading-116.webp';
  var CDN_LOGO_DARK = 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-dark-116.webp';

  window.QUIZZMAN_LOADER_LOGOS = {
    light: CDN_LOGO,
    dark: CDN_LOGO_DARK,
    standard: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.webp',
  };

  var RUNTIME_STAGES = [
    'Initializing runtime…',
    'Loading Theme Engine…',
    'Loading Design Tokens…',
    'Initializing Component Registry…',
    'Preparing Event Bus…',
    'Connecting Identity…',
    'Ready',
  ];

  var RUNTIME_LOG = [
    { cmd: 'Initializing QMF Runtime', ok: 'Theme Engine' },
    { cmd: 'Register Components', ok: 'Component registry' },
    { cmd: 'Loading Tokens', ok: 'Design tokens' },
    { cmd: 'Preparing Event Bus', ok: 'Event bus' },
    { cmd: 'Connecting Identity', ok: 'qm-id' },
  ];

  var LOAD_PATH = 'M 20 42 C 48 12, 72 72, 100 42 C 128 12, 152 72, 180 42 C 208 12, 232 72, 260 42';

  var DEFAULTS = {
    variant: 'runtime',
    presentation: 'status',
    brandMark: 'QMF',
    productName: 'Quizzman Meta Framework',
    brandName: 'Quizzman',
    tagLine: '',
    message: 'Initializing QMF Runtime…',
    runtimeVersion: '4.0',
    logoUrl: CDN_LOGO,
    logoDarkUrl: CDN_LOGO_DARK,
    theme: 'dark',
    mode: 'boot',
    minDisplayMs: 900,
    fadeOutMs: 420,
    stages: RUNTIME_STAGES.slice(),
    bootLog: RUNTIME_LOG.slice(),
    zIndex: 99999,
    autoStages: true,
    stageIntervalMs: 420,
  };

  var _uid = 0;

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function resolveTheme(config) {
    if (config.variant === 'runtime') return 'dark';
    if (config.theme === 'dark' || config.theme === 'light') return config.theme;
    var doc = document.documentElement.getAttribute('data-theme');
    if (doc === 'dark' || doc === 'light') return doc;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function resolveLoaderLogo(config, theme) {
    var appLogo = config.appLogoUrl || config.logoUrl;
    if (appLogo) {
      return theme === 'dark'
        ? config.logoDarkUrl || config.appLogoDarkUrl || appLogo
        : appLogo;
    }
    return theme === 'dark' ? CDN_LOGO_DARK : CDN_LOGO;
  }

  function themeFallbackLogo(theme) {
    return theme === 'dark' ? CDN_LOGO_DARK : CDN_LOGO;
  }

  function buildMapSvg(gradId) {
    return (
      '<svg class="qm-load__map" viewBox="0 0 280 72" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="' +
      gradId +
      '" x1="0%" y1="0%" x2="100%" y2="0%">' +
      '<stop offset="0%" stop-color="#fbbf24"/>' +
      '<stop offset="55%" stop-color="#0d9488"/>' +
      '<stop offset="100%" stop-color="#2563eb"/>' +
      '</linearGradient>' +
      '</defs>' +
      '<path class="qm-load__path-bg" d="' +
      LOAD_PATH +
      '" pathLength="100"/>' +
      '<path class="qm-load__path-fill" d="' +
      LOAD_PATH +
      '" pathLength="100" stroke="url(#' +
      gradId +
      ')"/>' +
      '<circle class="qm-load__node" cx="20" cy="42" r="4.5"/>' +
      '<circle class="qm-load__node qm-load__node--d1" cx="100" cy="42" r="4.5"/>' +
      '<circle class="qm-load__node qm-load__node--d2" cx="180" cy="42" r="4.5"/>' +
      '<circle class="qm-load__node qm-load__node--d3" cx="260" cy="42" r="4.5"/>' +
      '<circle class="qm-load__runner" r="6" fill="#fbbf24" stroke="#d97706" stroke-width="2">' +
      '<animateMotion dur="2.4s" repeatCount="indefinite" path="' +
      LOAD_PATH +
      '"/>' +
      '</circle>' +
      '</svg>'
    );
  }

  function logoImgHtml(config, logo) {
    var fallback = themeFallbackLogo(resolveTheme(config));
    return (
      '<img class="qm-load__logo" src="' +
      esc(logo) +
      '" alt="' +
      esc(config.brandName) +
      '"' +
      ' width="64" height="64" decoding="async"' +
      ' onerror="this.onerror=null;this.src=\'' +
      esc(fallback) +
      '\'">'
    );
  }

  function buildFlashcardInner(config, logo, gradId) {
    return (
      '<div class="qm-load__inner">' +
      '  <div class="qm-load__badge">' +
      logoImgHtml(config, logo) +
      '  </div>' +
      '  <span class="qm-load__brand">' +
      esc(config.brandName) +
      '</span>' +
      (config.tagLine
        ? '<span class="qm-load__tagline">' + esc(config.tagLine) + '</span>'
        : '') +
      buildMapSvg(gradId) +
      '  <p class="qm-load__msg">' +
      esc(config.message) +
      '</p>' +
      '</div>'
    );
  }

  function buildRuntimeInner(config) {
    var presentation = config.presentation === 'log' ? 'log' : 'status';
    var logHtml =
      presentation === 'log'
        ? '<div class="qm-boot__log" aria-live="polite"></div>'
        : '';
    var statusHtml =
      presentation === 'status'
        ? '<p class="qm-boot__status">' + esc(config.message) + '</p>'
        : '<p class="qm-boot__status qm-boot__status--ready" hidden>QMF Ready</p>';

    return (
      '<div class="qm-boot__center">' +
      '  <div class="qm-boot__mark-wrap">' +
      '    <div class="qm-boot__mark" aria-hidden="true">' +
      esc(config.brandMark || 'QMF') +
      '</div>' +
      '    <div class="qm-boot__scan" aria-hidden="true"></div>' +
      '  </div>' +
      '  <div class="qm-boot__sub">' +
      esc(config.productName || 'Quizzman Meta Framework') +
      '</div>' +
      logHtml +
      statusHtml +
      '  <div class="qm-boot__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
      '    <i class="qm-boot__progress-fill" style="width:0%"></i>' +
      '  </div>' +
      '</div>' +
      '<div class="qm-boot__footer">' +
      '  <span class="qm-boot__ver">QMF Runtime v' +
      esc(config.runtimeVersion || '4.0') +
      '</span>' +
      '  <span class="qm-boot__time">Boot Time · 0.00s</span>' +
      '</div>'
    );
  }

  function buildBootShellHtml(config) {
    var cfg = Object.assign({}, DEFAULTS, config || {});
    if (cfg.variant === 'flashcard') {
      var theme = resolveTheme(cfg);
      var gradId = 'qmLoadGrad' + ++_uid;
      var logo = resolveLoaderLogo(cfg, theme);
      return (
        '<div id="qm-initial-loading" class="qm-load qm-load--boot qm-load--' +
        theme +
        '"' +
        ' role="status" aria-live="polite" aria-label="' +
        esc(cfg.message) +
        '">' +
        buildFlashcardInner(cfg, logo, gradId) +
        '</div>'
      );
    }
    return (
      '<div id="qm-initial-loading" class="qm-boot qm-boot--boot"' +
      ' role="status" aria-live="polite" aria-label="' +
      esc(cfg.message) +
      '">' +
      buildRuntimeInner(cfg) +
      '</div>'
    );
  }

  function QuizzmanLoadingScreen(config) {
    this.config = Object.assign({}, DEFAULTS, config || {});
    this.gradId = 'qmLoadGrad' + ++_uid;
    this.progress = 0;
    this.stageIndex = 0;
    this.visible = false;
    this.startedAt = 0;
    this.root = null;
    this.msgEl = null;
    this.fillEl = null;
    this.timeEl = null;
    this.logEl = null;
    this._autoTimer = null;
    this._clockTimer = null;
    this._logTimer = null;
    this._logIndex = 0;
    this.show();
  }

  QuizzmanLoadingScreen.prototype.show = function () {
    if (this.visible) return this;
    this.visible = true;
    this.startedAt = Date.now();
    window.__qmLoadStart = this.startedAt;

    var cfg = this.config;
    var isRuntime = cfg.variant !== 'flashcard';
    var theme = resolveTheme(cfg);
    var root = document.createElement('div');

    if (isRuntime) {
      root.id = cfg.id || '';
      root.className = 'qm-boot qm-boot--' + (cfg.mode === 'inline' ? 'inline' : 'boot');
      root.innerHTML = buildRuntimeInner(cfg);
    } else {
      var logo = resolveLoaderLogo(cfg, theme);
      root.className =
        'qm-load qm-load--' + theme + ' qm-load--' + (cfg.mode === 'inline' ? 'inline' : 'boot');
      root.innerHTML = buildFlashcardInner(cfg, logo, this.gradId);
    }

    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    root.setAttribute('aria-label', cfg.message || 'Bootstrapping QMF');
    if (cfg.mode !== 'inline') root.style.zIndex = String(cfg.zIndex);

    this.root = root;
    this.msgEl = root.querySelector('.qm-boot__status, .qm-load__msg');
    this.fillEl = root.querySelector('.qm-boot__progress-fill');
    this.timeEl = root.querySelector('.qm-boot__time');
    this.logEl = root.querySelector('.qm-boot__log');
    this.barEl = root.querySelector('.qm-boot__progress');

    var mount = function () {
      document.body.appendChild(root);
      if (root.classList.contains('qm-boot--boot') || root.classList.contains('qm-load--boot')) {
        document.documentElement.classList.add('qm-load-active');
      }
    };

    if (cfg.container) {
      var container =
        typeof cfg.container === 'string' ? document.querySelector(cfg.container) : cfg.container;
      if (container) container.appendChild(root);
      else if (document.body) mount();
    } else if (document.body) {
      mount();
    } else {
      document.addEventListener('DOMContentLoaded', mount);
    }

    this._startClock();
    if (cfg.presentation === 'log' && isRuntime) this._startBootLog();
    else if (cfg.autoStages !== false) this._startAutoStages();

    return this;
  };

  QuizzmanLoadingScreen.prototype._startClock = function () {
    var self = this;
    clearInterval(this._clockTimer);
    this._clockTimer = setInterval(function () {
      if (!self.visible || !self.timeEl) return;
      var s = ((Date.now() - self.startedAt) / 1000).toFixed(2);
      if (!self.timeEl.dataset.ready) {
        self.timeEl.textContent = 'Boot Time · ' + s + 's';
      }
    }, 50);
  };

  QuizzmanLoadingScreen.prototype._startAutoStages = function () {
    var self = this;
    var stages = this.config.stages || [];
    if (stages.length < 2) return;
    clearInterval(this._autoTimer);
    this._autoTimer = setInterval(function () {
      if (!self.visible || self.progress >= 100) return;
      var next = Math.min(stages.length - 2, self.stageIndex + 1);
      if (next > self.stageIndex) self.setStage(next);
    }, this.config.stageIntervalMs || 420);
  };

  QuizzmanLoadingScreen.prototype._startBootLog = function () {
    var self = this;
    var lines = this.config.bootLog || [];
    if (!this.logEl || !lines.length) return;
    clearTimeout(this._logTimer);

    function step() {
      if (!self.visible || !self.logEl) return;
      if (self._logIndex >= lines.length) {
        self.setProgress(100);
        if (self.msgEl) {
          self.msgEl.hidden = false;
          self.msgEl.textContent = 'QMF Ready';
          self.msgEl.classList.add('qm-boot__status--ready');
        }
        return;
      }
      var row = lines[self._logIndex++];
      var block = document.createElement('div');
      block.className = 'qm-boot__log-line';
      block.innerHTML =
        '<div class="qm-boot__log-cmd">&gt; ' +
        esc(row.cmd) +
        '</div>' +
        '<div class="qm-boot__log-ok">✓ ' +
        esc(row.ok) +
        '</div>';
      self.logEl.appendChild(block);
      var pct = Math.round((self._logIndex / lines.length) * 92);
      self.setProgress(pct);
      while (self.logEl.children.length > 4) {
        self.logEl.firstChild.classList.add('qm-boot__log-line--fade');
        var old = self.logEl.firstChild;
        setTimeout(function () {
          old.remove();
        }, 400);
      }
      self._logTimer = setTimeout(step, 140 + Math.floor(Math.random() * 40));
    }
    step();
  };

  QuizzmanLoadingScreen.prototype.setMessage = function (text) {
    this.config.message = text;
    if (this.msgEl) {
      this.msgEl.hidden = false;
      this.msgEl.textContent = text;
      this.msgEl.classList.remove('qm-boot__status--fade');
      void this.msgEl.offsetWidth;
      this.msgEl.classList.add('qm-boot__status--fade');
    }
    if (this.root) this.root.setAttribute('aria-label', text);
    return this;
  };

  QuizzmanLoadingScreen.prototype.setProgress = function (value) {
    this.progress = Math.min(100, Math.max(0, value));
    if (this.fillEl) this.fillEl.style.width = this.progress + '%';
    if (this.barEl) this.barEl.setAttribute('aria-valuenow', String(Math.round(this.progress)));
    var stages = this.config.stages || [];
    if (stages.length && this.config.presentation !== 'log') {
      var idx = Math.min(stages.length - 1, Math.floor(this.progress / (100 / stages.length)));
      if (idx !== this.stageIndex) this.setStage(idx);
    }
    return this;
  };

  QuizzmanLoadingScreen.prototype.setStage = function (index) {
    var stages = this.config.stages || [];
    var idx = Math.max(0, Math.min(stages.length - 1, index));
    this.stageIndex = idx;
    this.setMessage(stages[idx] || this.config.message);
    this.progress = ((idx + 1) / stages.length) * 100;
    if (this.fillEl) this.fillEl.style.width = this.progress + '%';
    if (this.barEl) this.barEl.setAttribute('aria-valuenow', String(Math.round(this.progress)));
    return this;
  };

  QuizzmanLoadingScreen.prototype.hide = function () {
    var self = this;
    if (!this.visible) return Promise.resolve();

    return new Promise(function (resolve) {
      clearInterval(self._autoTimer);
      clearInterval(self._clockTimer);
      clearTimeout(self._logTimer);

      var ms = Date.now() - self.startedAt;
      if (self.timeEl) {
        self.timeEl.dataset.ready = '1';
        self.timeEl.textContent = 'Ready in ' + ms + ' ms';
      }
      self.setProgress(100);
      if (self.config.presentation === 'log') {
        self.setMessage('QMF Ready');
      } else {
        self.setMessage(
          (self.config.stages && self.config.stages[self.config.stages.length - 1]) || 'Ready',
        );
      }

      var elapsed = Date.now() - self.startedAt;
      var wait = Math.max(0, self.config.minDisplayMs - elapsed);

      setTimeout(function () {
        if (!self.root) return resolve();
        self.root.classList.add('qm-boot--out', 'qm-load--out');
        setTimeout(function () {
          self.destroy();
          resolve();
        }, self.config.fadeOutMs);
      }, wait + 280);
    });
  };

  QuizzmanLoadingScreen.prototype.destroy = function () {
    clearInterval(this._autoTimer);
    clearInterval(this._clockTimer);
    clearTimeout(this._logTimer);
    this.visible = false;
    if (this.root) {
      this.root.remove();
      this.root = null;
    }
    document.documentElement.classList.remove('qm-load-active');
  };

  window.buildQuizzmanBootLoaderHtml = buildBootShellHtml;
  window.buildQuizzmanLoadingInner = function (config) {
    var cfg = Object.assign({}, DEFAULTS, config || {});
    if (cfg.variant === 'flashcard') {
      var theme = resolveTheme(cfg);
      var logo = resolveLoaderLogo(cfg, theme);
      return buildFlashcardInner(cfg, logo, 'qmLoadGrad' + ++_uid);
    }
    return buildRuntimeInner(cfg);
  };

  window.hideQuizzmanBootLoader = function (opts) {
    opts = opts || {};
    var el = opts.element || document.getElementById('qm-initial-loading');
    if (!el) return Promise.resolve();

    var minDisplayMs = opts.minDisplayMs != null ? opts.minDisplayMs : 900;
    var fadeOutMs = opts.fadeOutMs != null ? opts.fadeOutMs : 420;
    var started = opts.startedAt || window.__qmLoadStart || Date.now();
    var timeEl = el.querySelector('.qm-boot__time');
    var fill = el.querySelector('.qm-boot__progress-fill');
    var status = el.querySelector('.qm-boot__status');

    if (fill) fill.style.width = '100%';
    if (status) {
      status.hidden = false;
      status.textContent = opts.readyText || 'QMF Ready';
      status.classList.add('qm-boot__status--ready');
    }
    if (timeEl) {
      timeEl.dataset.ready = '1';
      timeEl.textContent = 'Ready in ' + (Date.now() - started) + ' ms';
    }

    return new Promise(function (resolve) {
      var wait = Math.max(0, minDisplayMs - (Date.now() - started));
      setTimeout(function () {
        el.classList.add('qm-boot--out', 'qm-load--out');
        setTimeout(function () {
          el.remove();
          document.documentElement.classList.remove('qm-load-active');
          resolve();
        }, fadeOutMs);
      }, wait + 280);
    });
  };

  window.createQuizzmanLoadingScreen = function (config) {
    return new QuizzmanLoadingScreen(config);
  };
  window.createLoadingScreen = window.createQuizzmanLoadingScreen;
  window.createQmfBootstrapScreen = function (config) {
    return new QuizzmanLoadingScreen(
      Object.assign({ variant: 'runtime', presentation: 'status' }, config || {}),
    );
  };

  if (window.QMF) {
    window.QMF.createLoadingScreen = window.createQuizzmanLoadingScreen;
    window.QMF.createBootstrapScreen = window.createQmfBootstrapScreen;
  }

  console.log('[QMF Bootstrap] loading-screen v' + VERSION);
})();
