/**
 * QMF Documentation Portal — homepage interactions (vanilla JS)
 */
(function () {
  'use strict';

  var THEME_KEY = 'qmf-theme';
  var LANG_KEY = 'qmf-lang';
  var RECENT_KEY = 'qmf-search-recent';
  var SEARCH_URL = '/qmf/search.json';
  var FILTERS = ['All', 'Docs', 'API', 'Guides', 'AI', 'Examples', 'Registry'];

  var I18N = {
    en: {
      nav_docs: 'Docs', nav_components: 'Components', nav_guides: 'Guides', nav_examples: 'Examples',
      nav_api: 'API', nav_ai: 'AI', nav_registry: 'Registry', nav_changelog: 'Changelog',
      hero_kicker: 'Modular Framework + Runtime',
      hero_title: 'Zentro',
      hero_subtitle: 'Build modern modular applications with a lightweight plugin architecture.',
      hero_btn_start: 'Get Started', hero_btn_docs: 'Documentation', hero_btn_ai: 'AI Documentation',
      section_quick: 'Quick actions', section_docs: 'Documentation', section_learn: 'Learn Zentro',
      section_ai: 'AI & LLM', section_indexes: 'AI-friendly indexes', section_overview: 'Documentation overview',
      section_dash: 'Developer dashboard', section_examples: 'Examples', section_components: 'Component explorer',
      section_code: 'Code preview',
      footer_docs: 'Documentation', footer_api: 'API', footer_guides: 'Guides', footer_examples: 'Examples',
      footer_registry: 'Registry', footer_ai: 'AI', footer_community: 'Community',
      footer_tagline: 'Zentro — Modular Framework + Runtime.',
      search_placeholder: 'Search...', search_empty: 'Type to search documentation',
      search_no_results: 'No results found', search_recent: 'Recent searches',
      filter_all: 'All', filter_docs: 'Docs', filter_api: 'API', filter_guides: 'Guides',
      filter_ai: 'AI', filter_examples: 'Examples', filter_registry: 'Registry',
      theme_to_dark: 'Switch to dark theme', theme_to_light: 'Switch to light theme',
      lang_switch: 'Switch language', copied: 'Copied', copy_code: 'Copy code',
      mobile_menu_open: 'Open menu', mobile_menu_close: 'Close menu', search_open: 'Open search'
    },
    vi: {
      nav_docs: 'Tài liệu', nav_components: 'Components', nav_guides: 'Hướng dẫn', nav_examples: 'Ví dụ',
      nav_api: 'API', nav_ai: 'AI', nav_registry: 'Registry', nav_changelog: 'Changelog',
      hero_kicker: 'Modular Framework + Runtime',
      hero_title: 'Zentro',
      hero_subtitle: 'Xây ứng dụng modular hiện đại với kiến trúc plugin nhẹ.',
      hero_btn_start: 'Bắt đầu', hero_btn_docs: 'Tài liệu', hero_btn_ai: 'Tài liệu AI',
      section_quick: 'Thao tác nhanh', section_docs: 'Tài liệu', section_learn: 'Học Zentro',
      section_ai: 'AI & LLM', section_indexes: 'Index cho AI', section_overview: 'Tổng quan tài liệu',
      section_dash: 'Dashboard developer', section_examples: 'Ví dụ', section_components: 'Component explorer',
      section_code: 'Code preview',
      footer_docs: 'Tài liệu', footer_api: 'API', footer_guides: 'Hướng dẫn', footer_examples: 'Ví dụ',
      footer_registry: 'Registry', footer_ai: 'AI', footer_community: 'Cộng đồng',
      footer_tagline: 'Zentro — Modular Framework + Runtime.',
      search_placeholder: 'Tìm kiếm...', search_empty: 'Nhập để tìm kiếm tài liệu',
      search_no_results: 'Không có kết quả', search_recent: 'Tìm kiếm gần đây',
      filter_all: 'Tất cả', filter_docs: 'Tài liệu', filter_api: 'API', filter_guides: 'Hướng dẫn',
      filter_ai: 'AI', filter_examples: 'Ví dụ', filter_registry: 'Registry',
      theme_to_dark: 'Chuyển sang giao diện tối', theme_to_light: 'Chuyển sang giao diện sáng',
      lang_switch: 'Đổi ngôn ngữ', copied: 'Đã sao chép', copy_code: 'Sao chép mã',
      mobile_menu_open: 'Mở menu', mobile_menu_close: 'Đóng menu', search_open: 'Mở tìm kiếm'
    }
  };

  var FILTER_I18N = {
    All: 'filter_all', Docs: 'filter_docs', API: 'filter_api', Guides: 'filter_guides',
    AI: 'filter_ai', Examples: 'filter_examples', Registry: 'filter_registry'
  };

  var lang = 'en';
  var searchData = null;
  var searchFilter = 'All';
  var searchHi = -1;
  var lastFocus = null;

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function t(k) { return (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k; }

  function systemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getTheme() {
    var s = localStorage.getItem(THEME_KEY);
    return s === 'light' || s === 'dark' ? s : systemTheme();
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#f5f5f7');
    var btn = $('#theme-toggle');
    if (!btn) return;
    var dark = theme === 'dark';
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    btn.setAttribute('aria-label', t(dark ? 'theme_to_light' : 'theme_to_dark'));
  }

  function cycleTheme() {
    var next = getTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  function applyLang(code) {
    lang = code === 'vi' ? 'vi' : 'en';
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (k) el.textContent = t(k);
    });
    $$('[data-set-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-set-lang') === lang ? 'true' : 'false');
    });
    var lt = $('#lang-toggle');
    if (lt) {
      lt.setAttribute('aria-label', t('lang_switch'));
      lt.textContent = lang === 'vi' ? 'VI' : 'EN';
    }
    var inp = $('#search-input');
    if (inp) inp.placeholder = t('search_placeholder');
    renderFilters();
    renderRecent();
    applyTheme(getTheme());
  }

  function copyText(text, btn, labelKey) {
    if (!text) return;
    var done = function () { flash(btn, labelKey || 'copied'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
    } else fallbackCopy(text, done);
  }

  function fallbackCopy(text, cb) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
    if (cb) cb();
  }

  function flash(btn, key) {
    if (!btn) return;
    var orig = btn.textContent;
    btn.textContent = t(key);
    btn.disabled = true;
    setTimeout(function () { btn.textContent = orig; btn.disabled = false; }, 1400);
  }

  function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) { return []; }
  }

  function pushRecent(q) {
    q = (q || '').trim();
    if (!q) return;
    var list = getRecent().filter(function (x) { return x !== q; });
    list.unshift(q);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
  }

  function loadSearch() {
    if (searchData) return Promise.resolve(searchData);
    return fetch(SEARCH_URL).then(function (r) { return r.json(); }).then(function (d) {
      searchData = d.entries || d;
      return searchData;
    }).catch(function () { searchData = []; return searchData; });
  }

  function matchEntry(e, q) {
    if (searchFilter !== 'All' && e.category !== searchFilter) return false;
    if (!q) return true;
    var hay = (e.title + ' ' + e.category + ' ' + (e.keywords || []).join(' ')).toLowerCase();
    return hay.indexOf(q.toLowerCase()) !== -1;
  }

  function renderResults(list) {
    var box = $('#search-results');
    if (!box) return;
    box.innerHTML = '';
    searchHi = list.length ? 0 : -1;
    if (!list.length) {
      var li = document.createElement('li');
      li.className = 'search-empty';
      li.textContent = $('#search-input') && $('#search-input').value.trim() ? t('search_no_results') : t('search_empty');
      box.appendChild(li);
      return;
    }
    list.forEach(function (e, i) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = e.href;
      a.setAttribute('aria-selected', i === searchHi ? 'true' : 'false');
      a.innerHTML = '<span class="result-title">' + esc(e.title) + '</span>' +
        '<span class="result-path">' + esc(e.category) + ' · ' + esc(e.href) + '</span>';
      a.addEventListener('click', function () {
        pushRecent($('#search-input').value);
        closeSearch();
      });
      li.appendChild(a);
      box.appendChild(li);
    });
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function filterSearch() {
    var q = ($('#search-input') && $('#search-input').value) || '';
    var list = (searchData || []).filter(function (e) { return matchEntry(e, q.trim()); });
    renderResults(list.slice(0, 20));
  }

  function renderFilters() {
    var wrap = $('#search-filters');
    if (!wrap) return;
    wrap.innerHTML = '';
    FILTERS.forEach(function (cat) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = t(FILTER_I18N[cat]);
      b.setAttribute('aria-pressed', cat === searchFilter ? 'true' : 'false');
      b.addEventListener('click', function () {
        searchFilter = cat;
        renderFilters();
        filterSearch();
      });
      wrap.appendChild(b);
    });
  }

  function renderRecent() {
    var wrap = $('#search-recent');
    if (!wrap) return;
    var recent = getRecent();
    wrap.innerHTML = '<h4>' + esc(t('search_recent')) + '</h4>';
    if (!recent.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    var ul = document.createElement('ul');
    recent.forEach(function (q) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#';
      a.textContent = q;
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        $('#search-input').value = q;
        filterSearch();
      });
      li.appendChild(a);
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
  }

  function highlight(delta) {
    var links = $$('#search-results a');
    if (!links.length) return;
    searchHi = (searchHi + delta + links.length) % links.length;
    links.forEach(function (a, i) { a.setAttribute('aria-selected', i === searchHi ? 'true' : 'false'); });
    links[searchHi].scrollIntoView({ block: 'nearest' });
  }

  function openSearch() {
    var modal = $('#search-modal');
    var input = $('#search-input');
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('open', '');
    modal.setAttribute('aria-hidden', 'false');
    modal.setAttribute('aria-modal', 'true');
    document.body.style.overflow = 'hidden';
    renderFilters();
    renderRecent();
    loadSearch().then(filterSearch);
    if (input) { input.value = ''; setTimeout(function () { input.focus(); }, 30); }
  }

  function closeSearch() {
    var modal = $('#search-modal');
    if (!modal || !modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.removeAttribute('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  function trapFocus(modal, e) {
    if (e.key !== 'Tab') return;
    var nodes = modal.querySelectorAll('a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])');
    nodes = Array.prototype.filter.call(nodes, function (n) { return n.offsetParent !== null; });
    if (!nodes.length) return;
    var first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function onSearchKey(e) {
    var modal = $('#search-modal');
    if (!modal || !modal.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeSearch(); return; }
    trapFocus(modal, e);
    if (e.key === 'ArrowDown') { e.preventDefault(); highlight(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(-1); }
    else if (e.key === 'Enter') {
      var links = $$('#search-results a');
      if (links.length) {
        e.preventDefault();
        pushRecent($('#search-input').value);
        var target = searchHi >= 0 ? links[searchHi] : links[0];
        window.location.href = target.href;
      }
    }
  }

  function openDrawer() {
    var d = $('#mobile-drawer');
    var tgl = $('#mobile-toggle');
    if (!d) return;
    d.classList.add('is-open');
    d.setAttribute('aria-hidden', 'false');
    if (tgl) { tgl.setAttribute('aria-expanded', 'true'); tgl.setAttribute('aria-label', t('mobile_menu_close')); }
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    var d = $('#mobile-drawer');
    var tgl = $('#mobile-toggle');
    if (!d) return;
    d.classList.remove('is-open');
    d.setAttribute('aria-hidden', 'true');
    if (tgl) { tgl.setAttribute('aria-expanded', 'false'); tgl.setAttribute('aria-label', t('mobile_menu_open')); }
    document.body.style.overflow = '';
  }

  function initCodeTabs() {
    var tabs = $$('[data-code-tab]');
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var id = tab.getAttribute('data-code-tab');
        tabs.forEach(function (x) {
          var on = x === tab;
          x.setAttribute('aria-selected', on ? 'true' : 'false');
          x.classList.toggle('is-active', on);
        });
        $$('[data-code-panel]').forEach(function (p) {
          p.hidden = p.getAttribute('data-code-panel') !== id;
        });
      });
    });
  }

  function initCopyButtons() {
    var copyBtn = $('#copy-code');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var visible = document.querySelector('[data-code-panel]:not([hidden])');
        var el = visible || $('#code-sample');
        copyText(el ? el.textContent : '', copyBtn, 'copied');
      });
    }
    $$('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        if (!text) {
          var row = btn.closest('.install-cmd, .install-row, .cmd-block, .quick-card, li, div');
          var code = row && row.querySelector('code');
          text = code ? code.textContent : '';
        }
        copyText(text, btn, 'copied');
      });
    });
  }

  function bindEvents() {
    var themeBtn = $('#theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', cycleTheme);

    var langBtn = $('#lang-toggle');
    if (langBtn) langBtn.addEventListener('click', function () { applyLang(lang === 'en' ? 'vi' : 'en'); });
    $$('[data-set-lang]').forEach(function (b) {
      b.addEventListener('click', function () { applyLang(b.getAttribute('data-set-lang')); });
    });

    var openBtn = $('#search-open');
    if (openBtn) {
      openBtn.setAttribute('aria-label', t('search_open'));
      openBtn.addEventListener('click', openSearch);
    }
    $$('[data-search-open], #search-open-2').forEach(function (el) {
      el.addEventListener('click', openSearch);
    });
    $$('.search-trigger').forEach(function (el) {
      if (el.id !== 'search-open') el.addEventListener('click', openSearch);
    });

    var modal = $('#search-modal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal || e.target.hasAttribute('data-search-close')) closeSearch();
      });
      var input = $('#search-input');
      if (input) input.addEventListener('input', filterSearch);
    }

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); return; }
      onSearchKey(e);
      if (e.key === 'Escape') closeDrawer();
    });

    var mob = $('#mobile-toggle');
    if (mob) {
      mob.setAttribute('aria-expanded', 'false');
      mob.setAttribute('aria-label', t('mobile_menu_open'));
      mob.addEventListener('click', function () {
        $('#mobile-drawer') && $('#mobile-drawer').classList.contains('is-open') ? closeDrawer() : openDrawer();
      });
    }
    var drawer = $('#mobile-drawer');
    if (drawer) {
      var backdrop = drawer.querySelector('.drawer-backdrop');
      if (backdrop) backdrop.addEventListener('click', closeDrawer);
    }
  }

  function init() {
    applyTheme(getTheme());
    applyLang(localStorage.getItem(LANG_KEY) || 'en');
    bindEvents();
    initCodeTabs();
    initCopyButtons();
    loadSearch();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
