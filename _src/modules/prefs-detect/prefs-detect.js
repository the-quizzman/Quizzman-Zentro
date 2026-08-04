/**
 * QMF prefs-detect — first-visit lang / theme / region bootstrap
 * @version 1.0.0
 *
 * Precedence:
 *   account (logged-in, via auth-widget) > explicit localStorage/cookie > browser detect > defaults
 *
 * Only fills missing keys. Never overwrites user or account settings.
 *
 *   <script src="https://ui.quizzman.com/qmf/dist/modules/prefs-detect/prefs-detect.js"></script>
 *   <script> QmfPrefsDetect.bootstrap(); </script>
 *
 * Events out: qmf:prefs-change, qmf:langchange, qmf:lang-change,
 *             qmf:themechange, qmf:region-change  (source: 'detect')
 */
(function (global) {
  'use strict';

  var VERSION = '1.0.0';
  var SUPPORTED_LANG = ['vi', 'en', 'zh', 'zht', 'jp', 'kr', 'fr', 'de', 'es', 'th', 'pt'];
  var SUPPORTED_REGION = ['VN', 'US', 'TW', 'CN', 'JP', 'KR', 'SG', 'AU', 'FR', 'TH', 'DE', 'ES', 'PT', 'GB'];

  var LANG_ALIAS = {
    vi: 'vi', 'vi-vn': 'vi',
    en: 'en', 'en-us': 'en', 'en-gb': 'en', 'en-au': 'en', 'en-sg': 'en',
    zh: 'zh', 'zh-cn': 'zh', 'zh-hans': 'zh', zhs: 'zh',
    zht: 'zht', 'zh-tw': 'zht', 'zh-hant': 'zht', 'zh-hk': 'zht', 'zh-mo': 'zht',
    jp: 'jp', ja: 'jp', 'ja-jp': 'jp',
    kr: 'kr', ko: 'kr', 'ko-kr': 'kr',
    fr: 'fr', 'fr-fr': 'fr', 'fr-ca': 'fr',
    de: 'de', 'de-de': 'de',
    es: 'es', 'es-es': 'es', 'es-mx': 'es',
    th: 'th', 'th-th': 'th',
    pt: 'pt', 'pt-br': 'pt', 'pt-pt': 'pt',
  };

  /** IANA timezone → Quizzman region codes used by auth-widget / i18n-dom */
  var TZ_REGION = {
    'Asia/Ho_Chi_Minh': 'VN',
    'Asia/Saigon': 'VN',
    'Asia/Bangkok': 'TH',
    'Asia/Vientiane': 'TH',
    'Asia/Phnom_Penh': 'TH',
    'Asia/Shanghai': 'CN',
    'Asia/Chongqing': 'CN',
    'Asia/Urumqi': 'CN',
    'Asia/Harbin': 'CN',
    'Asia/Taipei': 'TW',
    'Asia/Hong_Kong': 'TW',
    'Asia/Macau': 'TW',
    'Asia/Tokyo': 'JP',
    'Asia/Seoul': 'KR',
    'Asia/Singapore': 'SG',
    'Asia/Kuala_Lumpur': 'SG',
    'Australia/Sydney': 'AU',
    'Australia/Melbourne': 'AU',
    'Australia/Brisbane': 'AU',
    'Australia/Perth': 'AU',
    'America/New_York': 'US',
    'America/Chicago': 'US',
    'America/Denver': 'US',
    'America/Los_Angeles': 'US',
    'America/Phoenix': 'US',
    'America/Anchorage': 'US',
    'Pacific/Honolulu': 'US',
    'Europe/Paris': 'FR',
    'Europe/Berlin': 'DE',
    'Europe/Madrid': 'ES',
    'Europe/Lisbon': 'PT',
    'Europe/London': 'GB',
  };

  var LANG_DEFAULT_REGION = {
    vi: 'VN', th: 'TH', zh: 'CN', zht: 'TW', jp: 'JP', kr: 'KR',
    fr: 'FR', de: 'DE', es: 'ES', pt: 'PT', en: 'US',
  };

  var state = {
    bootstrapped: false,
    lang: null,
    theme: null,
    region: null,
    applied: null,
  };

  function normalizeLang(code) {
    if (!code) return null;
    var key = String(code).trim().toLowerCase().replace(/_/g, '-');
    if (LANG_ALIAS[key]) return LANG_ALIAS[key];
    if (key.indexOf('zh-t') === 0 || key.indexOf('hant') >= 0) return 'zht';
    if (key.indexOf('zh') === 0) return 'zh';
    if (key.indexOf('ja') === 0) return 'jp';
    if (key.indexOf('ko') === 0) return 'kr';
    var base = key.split('-')[0];
    return LANG_ALIAS[base] || (SUPPORTED_LANG.indexOf(base) >= 0 ? base : null);
  }

  function normalizeTheme(t) {
    t = String(t || '').toLowerCase();
    if (t === 'dark' || t === 'light') return t;
    return null;
  }

  function normalizeRegion(r) {
    if (!r) return null;
    var v = String(r).trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(v)) return null;
    return SUPPORTED_REGION.indexOf(v) >= 0 ? v : v; // allow unknown ISO-2 for forward compat
  }

  function readLangCookie() {
    try {
      var parts = String(document.cookie || '').split(';');
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i].trim();
        if (p.indexOf('qmf-lang=') === 0) {
          return normalizeLang(decodeURIComponent(p.slice('qmf-lang='.length)));
        }
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function writeLangCookie(lang) {
    if (!lang) return;
    try {
      var host = (location && location.hostname) || '';
      var base = 'qmf-lang=' + encodeURIComponent(lang)
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

  function lsGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function lsSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  function hasStoredLang() {
    return !!(
      normalizeLang(lsGet('qmf-lang'))
      || normalizeLang(lsGet('lab-ui-lang'))
      || normalizeLang(lsGet('lab-lang'))
      || normalizeLang(lsGet('qss_ui_lang'))
      || normalizeLang(lsGet('preferred_language'))
      || readLangCookie()
    );
  }

  function hasStoredTheme() {
    return !!(normalizeTheme(lsGet('qmf-theme')) || normalizeTheme(lsGet('lab-theme')));
  }

  function hasStoredRegion() {
    return !!(normalizeRegion(lsGet('qmf-region')) || normalizeRegion(lsGet('qlib-region')));
  }

  function detectLang() {
    var list = [];
    try {
      if (navigator.languages && navigator.languages.length) {
        for (var i = 0; i < navigator.languages.length; i++) list.push(navigator.languages[i]);
      }
    } catch (e) { /* ignore */ }
    try {
      if (navigator.language) list.push(navigator.language);
      if (navigator.userLanguage) list.push(navigator.userLanguage);
    } catch (e2) { /* ignore */ }

    for (var j = 0; j < list.length; j++) {
      var lang = normalizeLang(list[j]);
      if (lang) return lang;
    }
    return 'en';
  }

  function detectTheme() {
    try {
      if (global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) { /* ignore */ }
    return 'light';
  }

  function regionFromLocaleTag(tag) {
    if (!tag) return null;
    var m = String(tag).trim().replace(/_/g, '-').match(/^[a-z]{2,3}-([A-Za-z]{2})\b/i);
    if (!m) return null;
    return normalizeRegion(m[1]);
  }

  function detectRegion(langHint) {
    // 1) Timezone
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && TZ_REGION[tz]) return TZ_REGION[tz];
    } catch (e) { /* ignore */ }

    // 2) Region subtag from navigator languages (en-US → US, zh-TW → TW)
    try {
      var langs = (navigator.languages && navigator.languages.length)
        ? navigator.languages
        : [navigator.language];
      for (var i = 0; i < langs.length; i++) {
        var r = regionFromLocaleTag(langs[i]);
        if (r) return r;
      }
    } catch (e2) { /* ignore */ }

    // 3) Default by detected language
    if (langHint && LANG_DEFAULT_REGION[langHint]) return LANG_DEFAULT_REGION[langHint];
    return 'VN';
  }

  function applyDom(prefs) {
    if (!prefs) return;
    try {
      if (prefs.theme) {
        document.documentElement.setAttribute('data-theme', prefs.theme);
        document.documentElement.style.colorScheme = prefs.theme;
      }
      if (prefs.lang) {
        var htmlLang = prefs.lang === 'zht' ? 'zh-Hant'
          : (prefs.lang === 'jp' ? 'ja' : (prefs.lang === 'kr' ? 'ko' : prefs.lang));
        document.documentElement.lang = htmlLang;
        document.documentElement.setAttribute('data-lang', prefs.lang);
      }
      if (prefs.region) {
        document.documentElement.setAttribute('data-region', prefs.region);
      }
    } catch (e) { /* ignore */ }
  }

  function persist(prefs) {
    if (!prefs) return;
    if (prefs.lang) {
      lsSet('qmf-lang', prefs.lang);
      lsSet('lab-lang', prefs.lang);
      lsSet('lab-ui-lang', prefs.lang);
      lsSet('qss_ui_lang', prefs.lang);
      writeLangCookie(prefs.lang);
    }
    if (prefs.theme) {
      lsSet('qmf-theme', prefs.theme);
      lsSet('lab-theme', prefs.theme);
    }
    if (prefs.region) {
      lsSet('qmf-region', prefs.region);
      lsSet('qlib-region', prefs.region);
    }
    lsSet('qmf-prefs-source', 'detect');
  }

  function emit(prefs, fields) {
    var detail = {
      lang: prefs.lang,
      theme: prefs.theme,
      region: prefs.region,
      source: 'detect',
      fields: fields || [],
      version: VERSION,
    };
    try {
      global.dispatchEvent(new CustomEvent('qmf:prefs-change', { detail: detail }));
      if (fields.indexOf('lang') >= 0) {
        global.dispatchEvent(new CustomEvent('qmf:langchange', { detail: detail }));
        global.dispatchEvent(new CustomEvent('qmf:lang-change', { detail: detail }));
      }
      if (fields.indexOf('theme') >= 0) {
        global.dispatchEvent(new CustomEvent('qmf:themechange', { detail: detail }));
      }
      if (fields.indexOf('region') >= 0) {
        global.dispatchEvent(new CustomEvent('qmf:region-change', { detail: detail }));
      }
    } catch (e) { /* ignore */ }
  }

  function readCurrent() {
    return {
      lang: normalizeLang(lsGet('qmf-lang') || lsGet('lab-ui-lang') || lsGet('lab-lang') || readLangCookie()) || state.lang,
      theme: normalizeTheme(lsGet('qmf-theme') || lsGet('lab-theme')) || state.theme,
      region: normalizeRegion(lsGet('qmf-region') || lsGet('qlib-region')) || state.region,
    };
  }

  /**
   * Bootstrap missing prefs from browser signals.
   * Safe to call multiple times — only fills gaps.
   */
  function bootstrap(opts) {
    opts = opts || {};
    var force = !!opts.force;
    var fields = [];
    var patch = {};

    var lang = hasStoredLang() && !force ? null : (normalizeLang(opts.lang) || detectLang());
    var theme = hasStoredTheme() && !force ? null : (normalizeTheme(opts.theme) || detectTheme());
    var region = hasStoredRegion() && !force
      ? null
      : (normalizeRegion(opts.region) || detectRegion(lang || readCurrent().lang || detectLang()));

    if (lang && (!hasStoredLang() || force)) {
      patch.lang = lang;
      fields.push('lang');
    }
    if (theme && (!hasStoredTheme() || force)) {
      patch.theme = theme;
      fields.push('theme');
    }
    if (region && (!hasStoredRegion() || force)) {
      patch.region = region;
      fields.push('region');
    }

    // Always refresh in-memory state from storage after optional writes
    if (fields.length) {
      persist(patch);
      applyDom(patch);
      emit(Object.assign(readCurrent(), patch), fields);
      state.applied = {
        at: Date.now(),
        fields: fields.slice(),
        patch: patch,
      };
    } else {
      // Still paint DOM from whatever is already stored / defaults
      var cur = readCurrent();
      if (!cur.lang) cur.lang = detectLang();
      if (!cur.theme) cur.theme = detectTheme();
      if (!cur.region) cur.region = detectRegion(cur.lang);
      applyDom(cur);
    }

    var now = readCurrent();
    state.lang = now.lang;
    state.theme = now.theme;
    state.region = now.region;
    state.bootstrapped = true;

    // Account hydrate wins later — mark source so UI can tell detect vs account
    if (!lsGet('qmf-prefs-source')) lsSet('qmf-prefs-source', fields.length ? 'detect' : 'stored');

    console.log('[QmfPrefsDetect] bootstrap v' + VERSION, {
      lang: state.lang,
      theme: state.theme,
      region: state.region,
      filled: fields,
    });

    return {
      lang: state.lang,
      theme: state.theme,
      region: state.region,
      filled: fields,
      source: lsGet('qmf-prefs-source') || 'stored',
    };
  }

  /** Account settings take priority — write through and mark source. */
  function applyAccount(user) {
    if (!user) return null;
    var patch = {};
    var fields = [];
    var lang = normalizeLang(user.language || user.preferred_language);
    var theme = normalizeTheme(user.theme || user.ui_theme);
    var region = normalizeRegion(user.region);

    if (lang) { patch.lang = lang; fields.push('lang'); }
    if (theme) { patch.theme = theme; fields.push('theme'); }
    if (region) { patch.region = region; fields.push('region'); }
    if (!fields.length) return null;

    persist(patch);
    lsSet('qmf-prefs-source', 'account');
    applyDom(patch);
    // Do not re-emit prefs-change here — auth-widget / i18n-dom already do.
    var now = readCurrent();
    state.lang = now.lang;
    state.theme = now.theme;
    state.region = now.region;
    return { lang: state.lang, theme: state.theme, region: state.region, fields: fields, source: 'account' };
  }

  function bindAccountWatch() {
    if (state._accountBound) return;
    state._accountBound = true;
    global.addEventListener('qmf:auth', function (e) {
      var d = (e && e.detail) || {};
      if ((d.type === 'ready' || d.type === 'refresh') && d.user) applyAccount(d.user);
    });
    global.addEventListener('qmf:auth-ready', function (e) {
      var user = e && e.detail && e.detail.user;
      if (user) applyAccount(user);
    });
    global.addEventListener('qmf:prefs-change', function (e) {
      var d = (e && e.detail) || {};
      if (d.source === 'account' || d.source === 'user' || d.source === 'settings') {
        lsSet('qmf-prefs-source', d.source);
      }
      var cur = readCurrent();
      state.lang = cur.lang;
      state.theme = cur.theme;
      state.region = cur.region;
    });
  }

  function mount(opts) {
    bindAccountWatch();
    return bootstrap(opts);
  }

  var api = {
    version: VERSION,
    supportedLang: SUPPORTED_LANG.slice(),
    supportedRegion: SUPPORTED_REGION.slice(),
    bootstrap: bootstrap,
    mount: mount,
    detectLang: detectLang,
    detectTheme: detectTheme,
    detectRegion: detectRegion,
    applyAccount: applyAccount,
    normalizeLang: normalizeLang,
    normalizeTheme: normalizeTheme,
    normalizeRegion: normalizeRegion,
    getLang: function () { return state.lang || readCurrent().lang; },
    getTheme: function () { return state.theme || readCurrent().theme; },
    getRegion: function () { return state.region || readCurrent().region; },
    getPrefs: function () { return readCurrent(); },
    hasStoredLang: hasStoredLang,
    hasStoredTheme: hasStoredTheme,
    hasStoredRegion: hasStoredRegion,
  };

  global.QmfPrefsDetect = api;
  global.QMFPrefsDetect = api;
  if (!global.QMF) global.QMF = {};
  global.QMF.PrefsDetect = api;

  // Auto-run once if shell (or page) loaded the script without explicit bootstrap.
  // Shell will call bootstrap() again safely (idempotent for stored keys).
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        if (!state.bootstrapped) mount();
      });
    } else if (!state.bootstrapped) {
      mount();
    }
  } catch (e) {
    try { mount(); } catch (e2) { /* ignore */ }
  }

  console.log('[QmfPrefsDetect] module loaded v' + VERSION);
})(typeof window !== 'undefined' ? window : globalThis);
