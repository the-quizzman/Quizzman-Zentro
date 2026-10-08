/**
 * QMF Settings Float Component
 * Floating settings button with Language + Theme toggle
 * @version 1.0.0
 * 
 * Usage:
 * <script src="https://ui.quizzman.com/qmf/dist/modules/settings-float/settings-float.js"></script>
 * <script>
 *   createSettingsFloat({
 *     lang: 'vi',
 *     languages: ['vi', 'en', 'zh', 'zht', 'kr', 'jp', 'fr', 'de', 'es', 'th', 'pt'],
 *     onLangChange: (lang) => console.log('Lang:', lang)
 *   });
 * </script>
 */

(function() {
  'use strict';

  const VERSION = '1.0.6';
  const CDN_BASE = 'https://ui.quizzman.com/qmf/dist/modules/settings-float';
  const ACCOUNT_PREFS_URL = 'https://id.quizzman.com/api/account/update-profile';

  function persistAccountPrefs(partial) {
    if (window.QmfAccountPrefs && typeof window.QmfAccountPrefs.save === 'function') {
      return window.QmfAccountPrefs.save(partial);
    }
    if (!partial || typeof partial !== 'object') return Promise.resolve(null);
    let token = null;
    try {
      token = window.QuizzmanSSO?.getToken?.()
        || window.QuizzmanAuth?.getToken?.()
        || localStorage.getItem('jwt_token')
        || localStorage.getItem('authToken');
    } catch (e) { /* ignore */ }
    const hasSession = !!(token || /(?:^|; )(?:jwt_token|authToken|session_id)=/.test(document.cookie || ''));
    if (!hasSession) return Promise.resolve(null);
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(ACCOUNT_PREFS_URL, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(partial),
    }).then((res) => (res.ok ? res.json().catch(() => ({ success: true })) : null))
      .catch(() => null);
  }

  // Default configuration
  const DEFAULT_CONFIG = {
    position: 'bottom-right', // 'bottom-right' | 'bottom-left'
    offset: { bottom: 24, right: 24, left: 'auto' },
    lang: 'vi',
    theme: 'light',
    languages: ['vi', 'en', 'zh', 'zht', 'kr', 'jp', 'fr', 'de', 'es', 'th', 'pt'],
    langLabels: {
      vi: 'VI', en: 'EN', zh: '中', zht: '繁', kr: '한', jp: '日',
      fr: 'FR', de: 'DE', es: 'ES', th: 'TH', pt: 'PT',
    },
    langNames: {
      vi: 'Tiếng Việt',
      en: 'English',
      zh: '简体中文',
      zht: '繁體中文',
      kr: '한국어',
      jp: '日本語',
      fr: 'Français',
      de: 'Deutsch',
      es: 'Español',
      th: 'ไทย',
      pt: 'Português',
    },
    onLangChange: null,
    onThemeChange: null,
    autoInject: true
  };

  const UI_LABELS = {
    vi: { settings: 'Thiết lập', language: 'Ngôn ngữ', theme: 'Giao diện', light: 'Sáng', dark: 'Tối' },
    en: { settings: 'Settings', language: 'Language', theme: 'Theme', light: 'Light', dark: 'Dark' },
    zh: { settings: '设置', language: '语言', theme: '外观', light: '浅色', dark: '深色' },
    zht: { settings: '設定', language: '語言', theme: '外觀', light: '淺色', dark: '深色' },
    jp: { settings: '設定', language: '言語', theme: 'テーマ', light: 'ライト', dark: 'ダーク' },
    kr: { settings: '설정', language: '언어', theme: '테마', light: '라이트', dark: '다크' },
    fr: { settings: 'Paramètres', language: 'Langue', theme: 'Thème', light: 'Clair', dark: 'Sombre' },
    de: { settings: 'Einstellungen', language: 'Sprache', theme: 'Design', light: 'Hell', dark: 'Dunkel' },
    es: { settings: 'Ajustes', language: 'Idioma', theme: 'Tema', light: 'Claro', dark: 'Oscuro' },
    th: { settings: 'การตั้งค่า', language: 'ภาษา', theme: 'ธีม', light: 'สว่าง', dark: 'มืด' },
    pt: { settings: 'Configurações', language: 'Idioma', theme: 'Tema', light: 'Claro', dark: 'Escuro' },
  };

  function uiLabels(lang) {
    return UI_LABELS[lang] || UI_LABELS.en;
  }

  function writeSharedCookie(name, value) {
    if (!name || value == null || typeof document === 'undefined') return;
    try {
      const host = (location && location.hostname) || '';
      let base = name + '=' + encodeURIComponent(value)
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

  function readSharedCookie(name) {
    if (!name || typeof document === 'undefined') return '';
    try {
      const parts = String(document.cookie || '').split(';');
      const prefix = name + '=';
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i].trim();
        if (p.indexOf(prefix) === 0) return decodeURIComponent(p.slice(prefix.length));
      }
    } catch (e) { /* ignore */ }
    return '';
  }

  class SettingsFloat {
    constructor(config = {}) {
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.elements = {};
      
      // Load saved preferences
      this.loadSavedPreferences();
      
      if (this.config.autoInject) {
        this.init();
      }
    }

    loadSavedPreferences() {
      // Load language
      const savedLang = localStorage.getItem('lab-lang') || localStorage.getItem('qmf-lang');
      if (savedLang && this.config.languages.includes(savedLang)) {
        this.config.lang = savedLang;
      }
      
      // Load theme
      const cookieTheme = readSharedCookie('qmf-theme');
      const savedTheme = localStorage.getItem('lab-theme')
        || localStorage.getItem('qmf-theme')
        || (cookieTheme === 'dark' || cookieTheme === 'light' ? cookieTheme : null);
      if (savedTheme) {
        this.config.theme = savedTheme;
      }
      
      // Apply theme immediately
      document.documentElement.setAttribute('data-theme', this.config.theme);
    }

    init() {
      this.injectStyles();
      this.render();
      this.attachEvents();
      if (window.__QMF_DEBUG__) console.log(`[QMF Settings] v${VERSION} initialized`);
    }

    injectStyles() {
      if (document.getElementById('qmf-settings-float-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'qmf-settings-float-styles';
      style.textContent = `
        /* QMF Settings Float - Base */
        .qmf-settings-float {
          position: fixed;
          z-index: 9999;
          font-family: var(--font-sans, 'Inter', system-ui, -apple-system, sans-serif);
        }
        .qmf-settings-float--bottom-right {
          bottom: 24px;
          right: 24px;
        }
        .qmf-settings-float--bottom-left {
          bottom: 24px;
          left: 24px;
        }
        
        /* Settings Toggle Button */
        .qmf-settings__toggle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 1px solid var(--c-border, #e4dfd8);
          background: var(--c-surface, #fff);
          color: var(--c-text-secondary, #666);
          cursor: pointer;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--c-card-shadow, 0 1px 3px rgba(0,0,0,0.04));
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .qmf-settings__toggle:hover,
        .qmf-settings__toggle[aria-expanded="true"] {
          border-color: var(--c-primary, #8b6914);
          color: var(--c-primary, #8b6914);
          transform: scale(1.1) rotate(30deg);
          box-shadow: var(--c-card-shadow-hover, 0 4px 16px rgba(0,0,0,0.08));
        }
        
        /* Settings Menu */
        .qmf-settings__menu {
          position: absolute;
          bottom: calc(100% + 12px);
          right: 0;
          min-width: 200px;
          background: var(--c-surface, #fff);
          border: 1px solid var(--c-border, #e4dfd8);
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.15);
          z-index: 10000;
          display: none;
          flex-direction: column;
          overflow: hidden;
          animation: qmf-settings-fade-in 0.2s ease-out;
        }
        .qmf-settings__menu--open {
          display: flex;
        }
        .qmf-settings-float--bottom-left .qmf-settings__menu {
          right: auto;
          left: 0;
        }
        
        @keyframes qmf-settings-fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Settings Sections */
        .qmf-settings__section {
          padding: 14px 16px;
          border-bottom: 1px solid var(--c-border, #e4dfd8);
        }
        .qmf-settings__section:last-child {
          border-bottom: none;
        }
        
        .qmf-settings__label {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--c-text-muted, #9c958e);
          margin-bottom: 10px;
          letter-spacing: 0.5px;
        }
        
        /* Language Grid */
        .qmf-settings__langs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }
        
        .qmf-settings__lang {
          height: 36px;
          padding: 0 8px;
          border-radius: 8px;
          border: 1px solid var(--c-border, #e4dfd8);
          background: var(--c-surface, #fff);
          color: var(--c-text-secondary, #666);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qmf-settings__lang:hover {
          border-color: var(--c-primary, #8b6914);
          color: var(--c-primary, #8b6914);
        }
        .qmf-settings__lang--active {
          background: var(--c-primary, #8b6914);
          color: #fff;
          border-color: var(--c-primary, #8b6914);
        }
        
        /* Theme Toggle */
        .qmf-settings__themes {
          display: flex;
          gap: 8px;
        }
        
        .qmf-settings__theme {
          flex: 1;
          height: 40px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid var(--c-border, #e4dfd8);
          background: var(--c-surface, #fff);
          color: var(--c-text-secondary, #666);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.15s;
        }
        .qmf-settings__theme:hover {
          border-color: var(--c-primary, #8b6914);
          color: var(--c-primary, #8b6914);
        }
        .qmf-settings__theme--active {
          background: var(--c-primary-subtle, rgba(139,105,20,0.08));
          color: var(--c-primary, #8b6914);
          border-color: var(--c-primary, #8b6914);
        }
        
        /* Mobile Adjustments */
        @media (max-width: 768px) {
          .qmf-settings-float--bottom-right {
            bottom: 20px;
            right: 20px;
          }
          .qmf-settings-float--bottom-left {
            bottom: 20px;
            left: 20px;
          }
          .qmf-settings__menu {
            min-width: 180px;
          }
        }
      `;
      document.head.appendChild(style);
    }

    render() {
      const { lang, theme, languages, langLabels, langNames } = this.config;
      const t = uiLabels(lang);
      
      const container = document.createElement('div');
      container.className = `qmf-settings-float qmf-settings-float--${this.config.position}`;
      container.id = 'qmfSettingsFloat';
      
      container.innerHTML = `
        <button class="qmf-settings__toggle" id="qmfSettingsToggle" 
                aria-haspopup="true" aria-expanded="false" title="${t.settings}">
          <i class="fas fa-cog"></i>
        </button>
        <div class="qmf-settings__menu" id="qmfSettingsMenu" role="menu">
          <div class="qmf-settings__section">
            <div class="qmf-settings__label" data-qmf-settings-label="language">${t.language}</div>
            <div class="qmf-settings__langs">
              ${languages.map(l => `
                <button class="qmf-settings__lang ${l === lang ? 'qmf-settings__lang--active' : ''}" 
                        data-lang="${l}" role="menuitem" title="${langNames[l]}">
                  ${langLabels[l]}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="qmf-settings__section">
            <div class="qmf-settings__label" data-qmf-settings-label="theme">${t.theme}</div>
            <div class="qmf-settings__themes">
              <button class="qmf-settings__theme ${theme === 'light' ? 'qmf-settings__theme--active' : ''}" 
                      data-theme="light" role="menuitem">
                <i class="fas fa-sun"></i>
                <span data-qmf-settings-label="light">${t.light}</span>
              </button>
              <button class="qmf-settings__theme ${theme === 'dark' ? 'qmf-settings__theme--active' : ''}" 
                      data-theme="dark" role="menuitem">
                <i class="fas fa-moon"></i>
                <span data-qmf-settings-label="dark">${t.dark}</span>
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(container);
      
      this.elements = {
        container: container,
        toggle: container.querySelector('#qmfSettingsToggle'),
        menu: container.querySelector('#qmfSettingsMenu'),
        langButtons: container.querySelectorAll('.qmf-settings__lang'),
        themeButtons: container.querySelectorAll('.qmf-settings__theme')
      };
    }

    attachEvents() {
      const { toggle, menu, langButtons, themeButtons } = this.elements;
      
      // Toggle menu
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menu.classList.toggle('qmf-settings__menu--open');
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        toggle.classList.toggle('active', isOpen);
      });
      
      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!this.elements.container.contains(e.target)) {
          menu.classList.remove('qmf-settings__menu--open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.classList.remove('active');
        }
      });
      
      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          menu.classList.remove('qmf-settings__menu--open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.classList.remove('active');
        }
      });
      
      // Language selection
      langButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const selectedLang = btn.dataset.lang;
          this.setLanguage(selectedLang);
        });
      });
      
      // Theme selection
      themeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const selectedTheme = btn.dataset.theme;
          this.setTheme(selectedTheme);
        });
      });
    }

    setLanguage(lang) {
      if (!this.config.languages.includes(lang)) return;
      
      this.config.lang = lang;
      try {
        localStorage.setItem('qmf-lang', lang);
        localStorage.setItem('lab-lang', lang);
        localStorage.setItem('lab-ui-lang', lang);
        localStorage.setItem('qss_ui_lang', lang);
        localStorage.setItem('preferred_language', lang);
        localStorage.setItem('qmf-prefs-source', 'local');
        var host = location.hostname || '';
        var base = 'qmf-lang=' + encodeURIComponent(lang)
          + '; path=/; max-age=' + (365 * 24 * 60 * 60) + '; SameSite=Lax'
          + (location.protocol === 'https:' ? '; Secure' : '');
        var src = 'qmf-lang-src=local; path=/; max-age=' + (365 * 24 * 60 * 60) + '; SameSite=Lax'
          + (location.protocol === 'https:' ? '; Secure' : '');
        if (host === 'quizzman.com' || host.slice(-13) === '.quizzman.com') {
          document.cookie = base + '; domain=.quizzman.com';
          document.cookie = src + '; domain=.quizzman.com';
        } else {
          document.cookie = base;
          document.cookie = src;
        }
      } catch (e) { /* ignore */ }
      
      // Update UI
      this.elements.langButtons.forEach(btn => {
        btn.classList.toggle('qmf-settings__lang--active', btn.dataset.lang === lang);
      });
      this.applyUiLabels(lang);

      try {
        if (window.labI18n && typeof window.labI18n.setLang === 'function') {
          window.labI18n.setLang(lang, true);
        }
      } catch (e2) { /* ignore */ }
      
      // Callback
      if (typeof this.config.onLangChange === 'function') {
        this.config.onLangChange(lang);
      }

      if (window.QmfI18n && typeof window.QmfI18n.setLanguage === 'function') {
        window.QmfI18n.setLanguage(lang, { emit: false, source: 'local' });
      }

      try {
        if (window.QmfPrefsDetect && typeof window.QmfPrefsDetect.broadcast === 'function') {
          window.QmfPrefsDetect.broadcast({ lang: lang, pref: lang, source: 'local' });
        }
      } catch (e3) { /* ignore */ }
      
      // Dual event names — Legatus listens to hyphen form
      window.dispatchEvent(new CustomEvent('qmf:langchange', { detail: { lang, source: 'local' } }));
      window.dispatchEvent(new CustomEvent('qmf:lang-change', { detail: { lang, source: 'local' } }));
      window.dispatchEvent(new CustomEvent('qmf:prefs-change', {
        detail: { lang, theme: this.config.theme, region: localStorage.getItem('qmf-region') || null, source: 'local' },
      }));

      const save = persistAccountPrefs({ language: lang });

      /* Principle: lang resync via QMFShell soft-reload — never hard-refresh. */
      Promise.race([
        save,
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]).finally(() => {
        if (window.QMFShell && typeof window.QMFShell.softReload === 'function') {
          window.QMFShell.softReload('prefs:lang');
        }
      });
    }

    applyUiLabels(lang) {
      const t = uiLabels(lang);
      const root = this.elements.container || document.getElementById('qmfSettingsFloat');
      if (!root) return;
      const toggle = root.querySelector('#qmfSettingsToggle');
      if (toggle) toggle.setAttribute('title', t.settings);
      root.querySelectorAll('[data-qmf-settings-label]').forEach((el) => {
        const key = el.getAttribute('data-qmf-settings-label');
        if (t[key]) el.textContent = t[key];
      });
    }

    setTheme(theme) {
      this.config.theme = theme;
      try {
        localStorage.setItem('qmf-theme', theme);
        localStorage.setItem('lab-theme', theme);
        localStorage.setItem('qm-theme', theme);
      } catch (e) { /* ignore */ }
      writeSharedCookie('qmf-theme', theme);
      
      // Apply theme
      document.documentElement.setAttribute('data-theme', theme);
      try { document.documentElement.style.colorScheme = theme; } catch (e) { /* ignore */ }
      try {
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'theme-color');
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', theme === 'dark' ? '#0f172a' : '#ffffff');
      } catch (e) { /* ignore */ }
      
      // Update UI
      this.elements.themeButtons.forEach(btn => {
        btn.classList.toggle('qmf-settings__theme--active', btn.dataset.theme === theme);
      });
      
      // Callback
      if (typeof this.config.onThemeChange === 'function') {
        this.config.onThemeChange(theme);
      }

      if (window.QmfI18n && typeof window.QmfI18n.setTheme === 'function') {
        window.QmfI18n.setTheme(theme, { emit: false });
      }
      
      // Dispatch events
      const detail = { theme, source: 'settings-float' };
      window.dispatchEvent(new CustomEvent('qmf:themechange', { detail }));
      window.dispatchEvent(new CustomEvent('qmf:theme-change', { detail }));
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('qmf:themechange', { detail }));
        document.dispatchEvent(new CustomEvent('qmf:theme-change', { detail }));
        document.dispatchEvent(new CustomEvent('qmf-theme-change', { detail: theme }));
      }
      window.dispatchEvent(new CustomEvent('qmf:prefs-change', {
        detail: { lang: this.config.lang, theme, region: localStorage.getItem('qmf-region') || null, source: 'local' },
      }));

      persistAccountPrefs({ theme });
    }

    // Public API
    getLang() {
      return this.config.lang;
    }

    getTheme() {
      return this.config.theme;
    }

    destroy() {
      if (this.elements.container) {
        this.elements.container.remove();
      }
      const style = document.getElementById('qmf-settings-float-styles');
      if (style) style.remove();
    }
  }

  // Export
  window.SettingsFloat = SettingsFloat;
  window.QMFSettings = SettingsFloat;
  window.createSettingsFloat = function(config) {
    return new SettingsFloat(config);
  };

  // Also expose as QMF method
  if (window.QMF) {
    window.QMF.createSettingsFloat = window.createSettingsFloat;
  }

  // Auto-init if data attribute present
  if (document.querySelector('[data-qmf-settings-float]')) {
    document.addEventListener('DOMContentLoaded', () => {
      createSettingsFloat();
    });
  }

  if (window.__QMF_DEBUG__) console.log(`[QMF Settings Float] Module loaded v${VERSION}`);
})();
