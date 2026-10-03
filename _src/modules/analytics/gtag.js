/**
 * QMF Google Analytics 4 (gtag.js) — shared across *.quizzman.com
 * @version 1.1.0
 *
 * Auto-loaded by qmf-shell.js. Standalone for legacy pages:
 *   <script src="https://ui.quizzman.com/qmf/dist/modules/analytics/gtag.js"></script>
 *
 * Consent Mode v2 (EEA / UK / CH):
 *   Defaults denied in regulated regions until Google CMP updates consent.
 *   Elsewhere granted by default (no banner). Shell also sets defaults
 *   synchronously before ads/gtag network loads.
 *
 * Opt-out:  window.QMF_GTAG = false  (or QMF_DISABLE_ANALYTICS = true)
 * Force:    window.QMF_GTAG = true   (enable on localhost)
 * Override: window.QMF_GTAG_ID = 'G-XXXXXXXX'
 * Consent:  window.QMF_CONSENT_MODE = false to skip defaults
 */
(function (global) {
  'use strict';

  var VERSION = '1.1.0';
  var DEFAULT_ID = 'G-KBKFY8LX2F';
  var SCRIPT_ID = 'qmf-gtag-js';

  /** EEA + UK + CH — Google Privacy & Messaging / CMP regulated markets */
  var CONSENT_REGIONS = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
    'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES',
    'SE', 'IS', 'LI', 'NO', 'GB', 'CH',
  ];

  var CONSENT_DENIED = {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  };

  var CONSENT_GRANTED = {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
  };

  function measurementId() {
    var id = global.QMF_GTAG_ID;
    return (typeof id === 'string' && /^G-[A-Z0-9]+$/i.test(id)) ? id : DEFAULT_ID;
  }

  function shouldTrack() {
    if (global.QMF_DISABLE_ANALYTICS === true || global.QMF_GTAG === false) return false;
    if (global.QMF_GTAG === true) return true;
    try {
      var h = String(global.location && global.location.hostname || '');
      if (!h || h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0') return false;
      if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(h)) return false;
      if (/\.local$/i.test(h) || /\.test$/i.test(h)) return false;
    } catch (e) { /* ignore */ }
    return true;
  }

  function ensureGtagFn() {
    global.dataLayer = global.dataLayer || [];
    if (typeof global.gtag !== 'function') {
      global.gtag = function gtag() {
        global.dataLayer.push(arguments);
      };
    }
    return global.gtag;
  }

  /**
   * Consent Mode v2 defaults — must run before gtag config / AdSense.
   * Idempotent; safe if shell already applied the same guard.
   */
  function applyConsentDefaults() {
    if (global.__QMF_CONSENT_DEFAULT__) return true;
    if (global.QMF_CONSENT_MODE === false) return false;
    global.__QMF_CONSENT_DEFAULT__ = true;

    var gtag = ensureGtagFn();
    var wait = typeof global.QMF_CONSENT_WAIT === 'number' ? global.QMF_CONSENT_WAIT : 500;
    var custom = global.QMF_CONSENT_DEFAULT;
    if (custom && typeof custom === 'object') {
      gtag('consent', 'default', Object.assign({ wait_for_update: wait }, custom));
      return true;
    }

    // Rest of world: granted (no CMP banner).
    gtag('consent', 'default', Object.assign({}, CONSENT_GRANTED, {
      wait_for_update: wait,
    }));
    // EEA / UK / CH: denied until Google CMP (Privacy & Messaging) updates.
    gtag('consent', 'default', Object.assign({}, CONSENT_DENIED, {
      region: CONSENT_REGIONS.slice(),
    }));

    if (global.QMF_CONSENT_URL_PASSTHROUGH !== false) {
      gtag('set', 'url_passthrough', true);
    }
    if (global.QMF_CONSENT_ADS_REDACTION !== false) {
      gtag('set', 'ads_data_redaction', true);
    }
    return true;
  }

  function configOpts() {
    var opts = {};
    try {
      var h = String(global.location && global.location.hostname || '');
      if (/(^|\.)quizzman\.com$/i.test(h)) {
        opts.cookie_domain = 'quizzman.com';
      }
    } catch (e) { /* ignore */ }
    return opts;
  }

  function injectLibrary(id) {
    if (document.getElementById(SCRIPT_ID)) return;
    if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) return;
    var parent = document.head || document.documentElement;
    if (!parent) return;
    var s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    parent.appendChild(s);
  }

  function normalizeConsent(partial) {
    var out = {};
    var keys = ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage'];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (partial && partial[k] != null) out[k] = partial[k];
    }
    return out;
  }

  /** CMP / custom UI → gtag('consent', 'update', …) */
  function updateConsent(partial) {
    var gtag = ensureGtagFn();
    var payload = normalizeConsent(partial);
    if (!Object.keys(payload).length) return false;
    gtag('consent', 'update', payload);
    try {
      global.dispatchEvent(new CustomEvent('qmf:consent', { detail: payload }));
    } catch (e) { /* ignore */ }
    return true;
  }

  function grantAll() {
    return updateConsent(CONSENT_GRANTED);
  }

  function denyAll() {
    return updateConsent(CONSENT_DENIED);
  }

  /**
   * Idempotent GA4 bootstrap. Safe to call many times / from shell + HTML.
   * @returns {boolean} true if tracking was armed
   */
  function init(opts) {
    opts = opts || {};
    if (global.__QMF_GTAG_INIT__) return true;
    if (!shouldTrack() && opts.force !== true) return false;

    var id = opts.id || measurementId();
    global.__QMF_GTAG_INIT__ = true;
    global.__QMF_GTAG_ID__ = id;

    var gtag = ensureGtagFn();
    applyConsentDefaults();
    gtag('js', new Date());
    gtag('config', id, configOpts());
    injectLibrary(id);
    return true;
  }

  /** Manual page_view (SPA / soft navigations that do not reload). */
  function pageview(path, title) {
    if (!global.__QMF_GTAG_INIT__ && !init()) return false;
    var gtag = ensureGtagFn();
    var payload = {
      page_path: path || (global.location && (global.location.pathname + global.location.search)) || undefined,
      page_title: title || (typeof document !== 'undefined' ? document.title : undefined),
    };
    gtag('event', 'page_view', payload);
    return true;
  }

  function event(name, params) {
    if (!name) return false;
    if (!global.__QMF_GTAG_INIT__ && !init()) return false;
    ensureGtagFn()('event', name, params || {});
    return true;
  }

  var api = {
    version: VERSION,
    defaultId: DEFAULT_ID,
    init: init,
    pageview: pageview,
    event: event,
    measurementId: measurementId,
    applyConsentDefaults: applyConsentDefaults,
    updateConsent: updateConsent,
    grantAll: grantAll,
    denyAll: denyAll,
    CONSENT_REGIONS: CONSENT_REGIONS.slice(),
  };

  global.QmfGtag = api;
  if (!global.QMF) global.QMF = {};
  global.QMF.Gtag = api;

  // Auto-init when loaded as a script tag (shell or standalone).
  try { init(); } catch (e) { /* ignore */ }
})(typeof window !== 'undefined' ? window : globalThis);
