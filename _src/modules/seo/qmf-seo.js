/**
 * QMF SEO / Brand Identity (browser CDN module)
 * @version 1.0.0
 *
 * SSR-first: prefer static JSON-LD in the document shell.
 * This module provides QMF.siteIdentity() + host auto-resolve helpers.
 *
 *   <script src="https://ui.quizzman.com/qmf/dist/modules/seo/qmf-seo.js"></script>
 *   <script>
 *     QMF.siteIdentity({
 *       name: 'Quizzman Study',
 *       url: 'https://study.quizzman.com/',
 *       websiteId: 'https://study.quizzman.com/#website',
 *       publisherId: 'https://quizzman.com/#organization'
 *     });
 *   </script>
 */
(function (global) {
  'use strict';

  var VERSION = '1.0.0';
  var ORGANIZATION_ID = 'https://quizzman.com/#organization';

  var REGISTRY = {
    organization: {
      '@id': ORGANIZATION_ID,
      '@type': 'EducationalOrganization',
      name: 'Quizzman',
      url: 'https://quizzman.com/',
      logo: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png',
      sameAs: [
        'https://github.com/the-quizzman',
        'https://www.tiktok.com/@quizzman.com',
        'https://www.youtube.com/@quizzman.official'
      ]
    },
    sites: {
      home: { id: 'home', host: 'quizzman.com', name: 'Quizzman', url: 'https://quizzman.com/', websiteId: 'https://quizzman.com/#website', indexable: true, emitOrganization: true },
      app: { id: 'app', host: 'app.quizzman.com', name: 'Quizzman App', url: 'https://app.quizzman.com/', websiteId: 'https://app.quizzman.com/#website', indexable: true },
      study: { id: 'study', host: 'study.quizzman.com', name: 'Quizzman Study', url: 'https://study.quizzman.com/', websiteId: 'https://study.quizzman.com/#website', indexable: true },
      lib: { id: 'lib', host: 'lib.quizzman.com', name: 'Quizzman Library', url: 'https://lib.quizzman.com/', websiteId: 'https://lib.quizzman.com/#website', indexable: true },
      lab: { id: 'lab', host: 'lab.quizzman.com', name: 'Quizzman Lab', url: 'https://lab.quizzman.com/', websiteId: 'https://lab.quizzman.com/#website', indexable: true },
      lms: { id: 'lms', host: 'lms.quizzman.com', name: 'Quizzman LMS', url: 'https://lms.quizzman.com/', websiteId: 'https://lms.quizzman.com/#website', indexable: false },
      class: { id: 'class', host: 'class.quizzman.com', name: 'Quizzman Class', url: 'https://class.quizzman.com/', websiteId: 'https://class.quizzman.com/#website', indexable: false },
      astro: { id: 'astro', host: 'astro.quizzman.com', name: 'Quizzman Astro', url: 'https://astro.quizzman.com/', websiteId: 'https://astro.quizzman.com/#website', indexable: true },
      search: { id: 'search', host: 'search.quizzman.com', name: 'Quizzman Search', url: 'https://search.quizzman.com/', websiteId: 'https://search.quizzman.com/#website', indexable: true },
      legatus: { id: 'legatus', host: 'legatus.quizzman.com', name: 'Quizzman Legatus', url: 'https://legatus.quizzman.com/', websiteId: 'https://legatus.quizzman.com/#website', indexable: true },
      dict: { id: 'dict', host: 'dict.quizzman.com', name: 'Quizzman Dictionary', url: 'https://dict.quizzman.com/', websiteId: 'https://dict.quizzman.com/#website', indexable: true },
      mentis: { id: 'mentis', host: 'mentis.quizzman.com', name: 'Quizzman Mentis', url: 'https://mentis.quizzman.com/', websiteId: 'https://mentis.quizzman.com/#website', indexable: false },
      play: { id: 'play', host: 'play.quizzman.com', name: 'Quizzman Play', url: 'https://play.quizzman.com/', websiteId: 'https://play.quizzman.com/#website', indexable: true },
      wiki: { id: 'wiki', host: 'wiki.quizzman.com', name: 'Quizzman Wiki', url: 'https://wiki.quizzman.com/', websiteId: 'https://wiki.quizzman.com/#website', indexable: true },
      ui: { id: 'ui', host: 'ui.quizzman.com', name: 'Zentro', url: 'https://ui.quizzman.com/', websiteId: 'https://ui.quizzman.com/#website', indexable: true }
    }
  };

  function normalizeHost(host) {
    return String(host || '').trim().toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '');
  }

  function listSites() {
    var out = [];
    for (var k in REGISTRY.sites) {
      if (Object.prototype.hasOwnProperty.call(REGISTRY.sites, k)) out.push(REGISTRY.sites[k]);
    }
    return out;
  }

  function resolveSiteByHost(hostname) {
    var host = normalizeHost(hostname);
    if (!host) return null;
    if (host === 'www.quizzman.com') return REGISTRY.sites.home;
    var sites = listSites();
    for (var i = 0; i < sites.length; i++) {
      if (normalizeHost(sites[i].host) === host) return sites[i];
    }
    return null;
  }

  function websiteIdForUrl(url) {
    try {
      var u = new URL(url, 'https://quizzman.com');
      return u.protocol + '//' + u.host + '/#website';
    } catch (e) {
      return null;
    }
  }

  function withTrailingSlash(url) {
    if (!url) return url;
    return /\/$/.test(url) ? url : url + '/';
  }

  function buildOrganizationNode() {
    var org = REGISTRY.organization;
    return {
      '@type': org['@type'],
      '@id': ORGANIZATION_ID,
      name: org.name,
      url: withTrailingSlash(org.url),
      logo: { '@type': 'ImageObject', url: org.logo },
      sameAs: org.sameAs.slice()
    };
  }

  function buildWebSiteNode(input) {
    var url = withTrailingSlash(input.url);
    return {
      '@type': 'WebSite',
      '@id': input.websiteId || websiteIdForUrl(url),
      url: url,
      name: input.name,
      publisher: { '@id': input.publisherId || ORGANIZATION_ID }
    };
  }

  function siteIdentity(input) {
    if (!input || !input.name || !input.url) {
      throw new Error('[QMF.seo] siteIdentity requires { name, url }');
    }
    var graph = [];
    if (input.includeOrganization) graph.push(buildOrganizationNode());
    graph.push(buildWebSiteNode(input));
    return { '@context': 'https://schema.org', '@graph': graph };
  }

  function renderScript(data, siteId) {
    var json = JSON.stringify(data).replace(/</g, '\\u003c');
    var attrs = 'type="application/ld+json" data-qmf-identity="1"';
    if (siteId) attrs += ' data-qmf-site="' + String(siteId).replace(/"/g, '') + '"';
    return '<script ' + attrs + '>' + json + '</script>';
  }

  function ensureInDocument(input, doc) {
    doc = doc || global.document;
    if (!doc || !doc.head) return false;
    if (doc.querySelector('script[data-qmf-identity="1"]')) return false;
    var graph = siteIdentity(input);
    var el = doc.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-qmf-identity', '1');
    el.textContent = JSON.stringify(graph);
    doc.head.appendChild(el);
    return true;
  }

  function autoInject() {
    try {
      var host = global.location && global.location.hostname;
      var site = resolveSiteByHost(host);
      if (!site) return false;
      return ensureInDocument({
        name: site.name,
        url: site.url,
        websiteId: site.websiteId,
        publisherId: ORGANIZATION_ID,
        includeOrganization: !!site.emitOrganization
      });
    } catch (e) {
      return false;
    }
  }

  var api = {
    version: VERSION,
    ORGANIZATION_ID: ORGANIZATION_ID,
    registry: REGISTRY,
    resolveSiteByHost: resolveSiteByHost,
    siteIdentity: siteIdentity,
    buildOrganizationNode: buildOrganizationNode,
    buildWebSiteNode: buildWebSiteNode,
    renderScript: renderScript,
    ensureInDocument: ensureInDocument,
    autoInject: autoInject
  };

  global.QmfSeo = api;
  global.QMF = global.QMF || {};
  global.QMF.seo = api;
  global.QMF.siteIdentity = function (input) {
    var graph = siteIdentity(input);
    // If called in browser with a document, ensure SSR-missing pages still get a node
    // without duplicating when data-qmf-identity already exists.
    try {
      if (global.document && global.document.head) {
        ensureInDocument(input);
      }
    } catch (e) { /* ignore */ }
    return graph;
  };

  // Optional: auto inject only when page opts in
  // <script src="qmf-seo.js" data-qmf-seo-auto></script>
  try {
    var cur = document.currentScript;
    if (cur && cur.getAttribute('data-qmf-seo-auto') !== null) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInject);
      } else {
        autoInject();
      }
    }
  } catch (e) { /* ignore */ }
})(typeof window !== 'undefined' ? window : globalThis);
