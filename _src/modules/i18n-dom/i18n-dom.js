/**
 * QMF i18n-dom — shared data-i18n apply + prefs sync (lang / theme / region)
 * @version 1.0.6
 *
 *   <script src="https://ui.quizzman.com/qmf/dist/modules/i18n-dom/i18n-dom.js"></script>
 *   <script>
 *     QmfI18n.mount({ packs: ['common', 'app'] });
 *   </script>
 *
 * Attributes: data-i18n, data-i18n-title, data-i18n-placeholder,
 *             data-i18n-aria, data-i18n-html, data-i18n-fallback
 * Events in:  qmf:langchange | qmf:lang-change | qmf:themechange |
 *             qmf:region-change | qmf:prefs-change | qmf:auth
 * Events out: qmf:i18n-applied
 */
(function (global) {
  'use strict';

  var VERSION = '1.0.6';
  var SUPPORTED = ['vi', 'en', 'zh', 'zht', 'jp', 'kr', 'fr', 'de', 'es', 'th', 'pt'];
  var ALIAS = {
    auto: 'auto',
    vi: 'vi', 'vi-vn': 'vi',
    en: 'en', 'en-us': 'en', 'en-gb': 'en',
    zh: 'zh', 'zh-cn': 'zh', 'zh-hans': 'zh', zhs: 'zh',
    zht: 'zht', 'zh-tw': 'zht', 'zh-hant': 'zht', 'zh-hk': 'zht',
    jp: 'jp', ja: 'jp', 'ja-jp': 'jp',
    kr: 'kr', ko: 'kr', 'ko-kr': 'kr',
    fr: 'fr', 'fr-fr': 'fr', 'fr-ca': 'fr',
    de: 'de', 'de-de': 'de', german: 'de',
    es: 'es', 'es-es': 'es', spanish: 'es',
    th: 'th', 'th-th': 'th', thai: 'th',
    pt: 'pt', 'pt-br': 'pt', 'pt-pt': 'pt', portuguese: 'pt', portu: 'pt',
  };

  var state = {
    lang: 'vi',
    theme: 'light',
    region: 'VN',
    dict: Object.create(null),
    packs: ['common'],
    base: '',
    mounted: false,
    pendingApply: null,
  };

  function resolveBase() {
    if (global.QMF_BASE) return String(global.QMF_BASE).replace(/\/+$/, '');
    return 'https://ui.quizzman.com';
  }

  function moduleBase() {
    if (state.base) return state.base;
    return resolveBase() + '/qmf/dist/modules/i18n-dom';
  }

  function normalizeLang(code) {
    if (!code) return null;
    var key = String(code).trim().toLowerCase().replace(/_/g, '-');
    if (key === 'auto') return 'auto';
    if (ALIAS[key]) return ALIAS[key];
    if (key === 'zht' || key.indexOf('zh-t') === 0 || key.indexOf('hant') >= 0
        || key === 'zh-tw' || key === 'zh-hk' || key === 'zh-mo') return 'zht';
    if (key === 'zh' || key.indexOf('zh-') === 0) return 'zh';
    if (key.indexOf('ja') === 0) return 'jp';
    if (key.indexOf('ko') === 0) return 'kr';
    if (key.indexOf('fr') === 0) return 'fr';
    var base = key.split('-')[0];
    return ALIAS[base] || (SUPPORTED.indexOf(base) >= 0 ? base : null);
  }

  function detectLangFromBrowser() {
    var nav = String((typeof navigator !== 'undefined' && (navigator.language || (navigator.languages && navigator.languages[0]))) || 'vi').toLowerCase();
    if (nav === 'zht' || nav.indexOf('zh-t') === 0 || nav.indexOf('hant') >= 0 || nav === 'zh-tw' || nav === 'zh-hk' || nav === 'zh-mo') return 'zht';
    if (nav === 'zh' || nav.indexOf('zh-') === 0 || nav.indexOf('zh') === 0) return 'zh';
    if (nav.indexOf('ko') === 0) return 'kr';
    if (nav.indexOf('ja') === 0) return 'jp';
    if (nav.indexOf('fr') === 0) return 'fr';
    if (nav.indexOf('de') === 0) return 'de';
    if (nav.indexOf('es') === 0) return 'es';
    if (nav.indexOf('th') === 0) return 'th';
    if (nav.indexOf('pt') === 0) return 'pt';
    if (nav.indexOf('en') === 0) return 'en';
    if (nav.indexOf('vi') === 0) return 'vi';
    return 'vi';
  }

  function resolveLang(code) {
    var n = normalizeLang(code);
    if (n === 'auto' || !n) return detectLangFromBrowser();
    return n;
  }

  function normalizeTheme(t) {
    t = String(t || '').toLowerCase();
    return t === 'dark' ? 'dark' : 'light';
  }

  function normalizeRegion(r) {
    if (!r) return null;
    var v = String(r).trim();
    if (v.toLowerCase() === 'auto') return 'auto';
    v = v.toUpperCase();
    return /^[A-Z]{2}/.test(v) ? v.slice(0, 16) : null;
  }

  function detectRegionFromBrowser() {
    try {
      var list = [];
      if (typeof navigator !== 'undefined') {
        if (navigator.language) list.push(navigator.language);
        if (navigator.languages) list = list.concat(navigator.languages);
      }
      for (var i = 0; i < list.length; i++) {
        var m = String(list[i]).match(/-([A-Za-z]{2})\b/);
        if (m) return m[1].toUpperCase();
      }
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (/Ho_Chi_Minh|Saigon|Bangkok/i.test(tz)) return 'VN';
      if (/Taipei/i.test(tz)) return 'TW';
      if (/Shanghai|Beijing|Chongqing|Harbin|Hong_Kong/i.test(tz)) return 'CN';
      if (/Tokyo/i.test(tz)) return 'JP';
      if (/Seoul/i.test(tz)) return 'KR';
      if (/Singapore/i.test(tz)) return 'SG';
      if (/Sydney|Melbourne|Perth|Brisbane|Adelaide/i.test(tz)) return 'AU';
      if (/Paris/i.test(tz)) return 'FR';
      if (/New_York|Los_Angeles|Chicago|Denver|Phoenix|Anchorage|Honolulu/i.test(tz)) return 'US';
    } catch (e) { /* ignore */ }
    return 'VN';
  }

  function resolveRegion(code) {
    var n = normalizeRegion(code);
    if (n === 'auto' || !n) return detectRegionFromBrowser();
    return n;
  }

  function readStoredPrefs() {
    var lang = null;
    var theme = null;
    var region = null;
    try {
      var lsLang = normalizeLang(
        localStorage.getItem('qmf-lang')
        || localStorage.getItem('lab-ui-lang')
        || localStorage.getItem('lab-lang')
        || localStorage.getItem('qss_ui_lang')
        || localStorage.getItem('preferred_language')
      );
      var cookieLang = readLangCookie();
      var src = readLangSrcCookie();
      var cookieTheme = readThemeCookie();
      if (lsLang === 'auto') lang = 'auto';
      else if (cookieLang && (src === 'local' || !lsLang || cookieLang !== lsLang)) lang = cookieLang;
      else lang = lsLang || cookieLang;
      theme = normalizeTheme(
        localStorage.getItem('qmf-theme')
        || localStorage.getItem('lab-theme')
        || cookieTheme
        || document.documentElement.getAttribute('data-theme')
        || 'light'
      );
      region = normalizeRegion(
        localStorage.getItem('qmf-region') || localStorage.getItem('qlib-region')
      ) || 'VN';
    } catch (e) { /* ignore */ }
    return {
      lang: lang || 'vi',
      theme: theme || 'light',
      region: region || 'VN',
    };
  }

  function writeSharedCookie(name, value) {
    if (!name || value == null || typeof document === 'undefined') return;
    try {
      var host = (location && location.hostname) || '';
      var base = name + '=' + encodeURIComponent(value)
        + '; path=/; max-age=' + (365 * 24 * 60 * 60)
        + '; SameSite=Lax';
      if (location.protocol === 'https:') base += '; Secure';
      if (host === 'quizzman.com' || host.slice(-13) === '.quizzman.com') {
        document.cookie = base + '; domain=.quizzman.com';
      } else {
        document.cookie = base;
      }
    } catch (e) { /* ignore */ }
  }

  function writeLangCookie(lang) {
    if (!lang) return;
    writeSharedCookie('qmf-lang', lang);
  }

  function writeThemeCookie(theme) {
    if (!theme) return;
    writeSharedCookie('qmf-theme', theme);
  }

  function readSharedCookie(name) {
    if (!name || typeof document === 'undefined') return null;
    try {
      var parts = String(document.cookie || '').split(';');
      var prefix = name + '=';
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i].trim();
        if (p.indexOf(prefix) === 0) {
          return decodeURIComponent(p.slice(prefix.length));
        }
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function readLangCookie() {
    return normalizeLang(readSharedCookie('qmf-lang'));
  }

  function readThemeCookie() {
    return normalizeTheme(readSharedCookie('qmf-theme'));
  }

  function readLangSrcCookie() {
    var src = readSharedCookie('qmf-lang-src');
    return src === 'local' || src === 'account' || src === 'detect' ? src : null;
  }

  function writePrefs(prefs, opts) {
    opts = opts || {};
    var lang = prefs.lang != null ? normalizeLang(prefs.lang) : null;
    var theme = prefs.theme != null ? normalizeTheme(prefs.theme) : null;
    var region = prefs.region != null ? normalizeRegion(prefs.region) : null;

    try {
      if (lang) {
        localStorage.setItem('qmf-lang', lang);
        localStorage.setItem('lab-lang', lang);
        localStorage.setItem('lab-ui-lang', lang);
        localStorage.setItem('qss_ui_lang', lang);
        localStorage.setItem('preferred_language', lang);
        var resolvedLang = resolveLang(lang);
        writeLangCookie(resolvedLang);
        if (opts.source === 'local' || opts.source === 'account' || opts.source === 'detect') {
          writeSharedCookie('qmf-lang-src', opts.source);
          try { localStorage.setItem('qmf-prefs-source', opts.source); } catch (e0) { /* ignore */ }
        }
        state.lang = resolvedLang;
      }
      if (theme) {
        localStorage.setItem('qmf-theme', theme);
        localStorage.setItem('lab-theme', theme);
        localStorage.setItem('qm-theme', theme);
        writeThemeCookie(theme);
        state.theme = theme;
      }
      if (region) {
        localStorage.setItem('qmf-region', region);
        state.region = resolveRegion(region);
      }
    } catch (e) { /* ignore */ }

    if (theme && opts.applyTheme !== false) {
      document.documentElement.setAttribute('data-theme', theme);
      try { document.documentElement.style.colorScheme = theme; } catch (e2) { /* ignore */ }
    }

    if (lang && opts.applyLangChrome !== false) {
      var applied = state.lang;
      var htmlLang = applied === 'zht' ? 'zh-Hant' : (applied === 'jp' ? 'ja' : (applied === 'kr' ? 'ko' : applied));
      document.documentElement.lang = htmlLang;
      document.documentElement.setAttribute('data-lang', applied);
    }

    if (region) {
      document.documentElement.setAttribute('data-region', state.region);
    }
  }

  function deepGet(obj, path) {
    if (!obj || !path) return undefined;
    if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
    var parts = String(path).split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function t(key, fallback) {
    if (!key) return fallback != null ? fallback : '';
    var v = deepGet(state.dict, key);
    if (v == null || v === '') {
      return fallback != null ? fallback : key;
    }
    return String(v);
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      if (el.tagName === 'OPTION') return;
      var key = el.getAttribute('data-i18n');
      var fb = el.getAttribute('data-i18n-fallback');
      if (fb == null) fb = el.textContent;
      var val = t(key, fb);
      if (el.hasAttribute('data-i18n-html')) el.innerHTML = val;
      else el.textContent = val;
    });
    root.querySelectorAll('option[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var fb = el.getAttribute('data-i18n-fallback') || el.textContent;
      el.textContent = t(key, fb);
    });
    root.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      var fb = el.getAttribute('title') || el.getAttribute('aria-label') || '';
      var val = t(key, fb);
      el.title = val;
      if (el.hasAttribute('aria-label') || el.hasAttribute('data-i18n-aria')) {
        el.setAttribute('aria-label', val);
      }
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder'), el.getAttribute('placeholder') || ''));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'), el.getAttribute('aria-label') || ''));
    });

    try {
      global.dispatchEvent(new CustomEvent('qmf:i18n-applied', {
        detail: { lang: state.lang, theme: state.theme, region: state.region },
      }));
    } catch (e) { /* ignore */ }

    // Bridge Slide Studio if present
    if (global.QssI18n && typeof global.QssI18n.setLocale === 'function') {
      try {
        if (global.QssI18n.getLocale && global.QssI18n.getLocale() !== state.lang) {
          global.QssI18n.setLocale(state.lang, true);
        }
      } catch (e2) { /* ignore */ }
    }

    return state;
  }

  function mergeDict(target, src) {
    if (!src || typeof src !== 'object') return target;
    Object.keys(src).forEach(function (k) {
      var v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v)
        && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
        mergeDict(target[k], v);
      } else {
        target[k] = v;
      }
    });
    return target;
  }

  function loadPack(name, lang) {
    var url = moduleBase() + '/packs/' + encodeURIComponent(name) + '/' + encodeURIComponent(lang) + '.json?v=' + VERSION;
    return fetch(url, { credentials: 'omit' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (json) { return json || {}; })
      .catch(function () { return {}; });
  }

  function loadPacks(lang, packNames) {
    packNames = packNames || state.packs;
    lang = resolveLang(lang || state.lang);
    return Promise.all(packNames.map(function (n) { return loadPack(n, lang); }))
      .then(function (parts) {
        var dict = Object.create(null);
        parts.forEach(function (p) { mergeDict(dict, p); });
        state.dict = dict;
        state.lang = lang;
        return dict;
      });
  }

  function setLanguage(lang, opts) {
    opts = opts || {};
    lang = normalizeLang(lang) || 'vi';
    writePrefs({ lang: lang }, { applyTheme: false, source: opts.source || 'local' });
    var resolved = resolveLang(lang);
    return loadPacks(resolved, state.packs).then(function () {
      if (opts.apply !== false) apply(opts.root || document);
      if (opts.emit !== false) {
        try {
          global.dispatchEvent(new CustomEvent('qmf:langchange', { detail: { lang: resolved, pref: lang, source: 'i18n-dom' } }));
          global.dispatchEvent(new CustomEvent('qmf:lang-change', { detail: { lang: resolved, pref: lang, source: 'i18n-dom' } }));
        } catch (e) { /* ignore */ }
      }
      return lang;
    });
  }

  function setTheme(theme, opts) {
    opts = opts || {};
    theme = normalizeTheme(theme);
    writePrefs({ theme: theme }, { applyLangChrome: false });
    if (opts.emit !== false) {
      try {
        var detail = { theme: theme, source: 'i18n-dom' };
        global.dispatchEvent(new CustomEvent('qmf:themechange', { detail: detail }));
        global.dispatchEvent(new CustomEvent('qmf:theme-change', { detail: detail }));
        if (typeof document !== 'undefined') {
          document.dispatchEvent(new CustomEvent('qmf:themechange', { detail: detail }));
          document.dispatchEvent(new CustomEvent('qmf:theme-change', { detail: detail }));
          document.dispatchEvent(new CustomEvent('qmf-theme-change', { detail: theme }));
        }
        global.dispatchEvent(new CustomEvent('qmf:prefs-change', { detail: { theme: theme, source: 'local' } }));
      } catch (e) { /* ignore */ }
    }
    return theme;
  }

  function setRegion(region, opts) {
    opts = opts || {};
    region = normalizeRegion(region) || state.region;
    writePrefs({ region: region }, { applyTheme: false, applyLangChrome: false });
    if (opts.emit !== false) {
      try {
        global.dispatchEvent(new CustomEvent('qmf:region-change', { detail: { region: region, source: 'i18n-dom' } }));
      } catch (e) { /* ignore */ }
    }
    return region;
  }

  function hydrateFromUser(user) {
    if (!user) return Promise.resolve(state);
    var stored = readStoredPrefs();
    var src = readLangSrcCookie();
    var skipLang = src === 'local' || stored.lang === 'auto';
    var patch = {};
    var lang = skipLang ? null : normalizeLang(user.language || user.preferred_language);
    var region = normalizeRegion(user.region);
    var theme = normalizeTheme(user.theme || user.ui_theme);
    if (lang) patch.lang = lang;
    if (region) patch.region = region;
    if (theme) patch.theme = theme;
    if (!Object.keys(patch).length) return Promise.resolve(state);
    writePrefs(patch, { source: patch.lang ? 'account' : undefined });
    if (patch.lang) return loadPacks(resolveLang(patch.lang)).then(function () { apply(document); return state; });
    return Promise.resolve(state);
  }

  function onPrefsEvent(e) {
    var d = (e && e.detail) || {};
    var lang = normalizeLang(d.lang || d.language || d.preferred_language);
    var theme = d.theme != null ? normalizeTheme(d.theme) : null;
    var region = d.region != null ? normalizeRegion(d.region) : null;
    var jobs = [];

    if (theme) writePrefs({ theme: theme }, { applyLangChrome: false });
    if (region) writePrefs({ region: region }, { applyTheme: false, applyLangChrome: false });

    if (lang && lang !== 'auto' && resolveLang(lang) !== state.lang) {
      jobs.push(loadPacks(resolveLang(lang)).then(function () { apply(document); }));
    } else if (e.type === 'qmf:langchange' || e.type === 'qmf:lang-change') {
      jobs.push(Promise.resolve().then(function () { apply(document); }));
    }

    return Promise.all(jobs);
  }

  function bindWatchers() {
    ['qmf:langchange', 'qmf:lang-change', 'qmf:themechange', 'qmf:region-change', 'qmf:prefs-change'].forEach(function (name) {
      global.addEventListener(name, onPrefsEvent);
    });
    global.addEventListener('qmf:auth', function (e) {
      var d = (e && e.detail) || {};
      if (d.type === 'ready' || d.type === 'refresh') hydrateFromUser(d.user);
    });
    global.addEventListener('qmf:auth-ready', function (e) {
      hydrateFromUser(e && e.detail && e.detail.user);
    });
    // storage sync across same-origin tabs
    global.addEventListener('storage', function (e) {
      if (!e) return;
      if (e.key === 'qmf-lang' || e.key === 'lab-ui-lang' || e.key === 'qmf-theme' || e.key === 'qmf-region' || e.key === 'qmf_prefs_signal') {
        var prefs = readStoredPrefs();
        writePrefs(prefs);
        loadPacks(resolveLang(prefs.lang)).then(function () {
          apply(document);
          try {
            global.dispatchEvent(new CustomEvent('qmf:langchange', { detail: { lang: state.lang, pref: prefs.lang, source: 'storage' } }));
            global.dispatchEvent(new CustomEvent('qmf:lang-change', { detail: { lang: state.lang, pref: prefs.lang, source: 'storage' } }));
          } catch (e2) { /* ignore */ }
        });
      }
    });
  }

  function mount(opts) {
    opts = opts || {};
    if (opts.base) state.base = String(opts.base).replace(/\/+$/, '');
    if (opts.packs && opts.packs.length) state.packs = opts.packs.slice();

    var prefs = readStoredPrefs();
    if (opts.lang) prefs.lang = normalizeLang(opts.lang) || prefs.lang;
    if (opts.theme) prefs.theme = normalizeTheme(opts.theme);
    if (opts.region) prefs.region = normalizeRegion(opts.region) || prefs.region;

    writePrefs(prefs);

    if (!state.mounted) {
      bindWatchers();
      state.mounted = true;
    }

    return loadPacks(prefs.lang, state.packs).then(function () {
      apply(opts.root || document);
      if (global.__QMF_DEBUG__) console.log('[QmfI18n] mounted v' + VERSION, { lang: state.lang, theme: state.theme, region: state.region, packs: state.packs });
      return api;
    });
  }

  var api = {
    version: VERSION,
    supported: SUPPORTED.slice(),
    mount: mount,
    apply: apply,
    t: t,
    setLanguage: setLanguage,
    setTheme: setTheme,
    setRegion: setRegion,
    hydrateFromUser: hydrateFromUser,
    getLang: function () { return state.lang; },
    getTheme: function () { return state.theme; },
    getRegion: function () { return state.region; },
    getDict: function () { return state.dict; },
    loadPacks: loadPacks,
    normalizeLang: normalizeLang,
  };

  global.QmfI18n = api;
  global.QMFI18n = api;
  if (!global.QMF) global.QMF = {};
  global.QMF.I18n = api;

  if (global.__QMF_DEBUG__) console.log('[QmfI18n] module loaded v' + VERSION);
})(typeof window !== 'undefined' ? window : globalThis);
