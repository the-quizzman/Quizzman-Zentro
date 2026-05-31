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
 *     languages: ['vi', 'en', 'zh', 'zht', 'kr', 'jp'],
 *     onLangChange: (lang) => console.log('Lang:', lang)
 *   });
 * </script>
 */

(function() {
  'use strict';

  const VERSION = '1.0.0';
  const CDN_BASE = 'https://ui.quizzman.com/qmf/dist/modules/settings-float';

  // Default configuration
  const DEFAULT_CONFIG = {
    position: 'bottom-right', // 'bottom-right' | 'bottom-left'
    offset: { bottom: 24, right: 24, left: 'auto' },
    lang: 'vi',
    theme: 'light',
    languages: ['vi', 'en', 'zh', 'zht', 'kr', 'jp'],
    langLabels: { vi: 'VI', en: 'EN', zh: '中', zht: '繁', kr: '한', jp: '日' },
    langNames: { 
      vi: 'Tiếng Việt', 
      en: 'English', 
      zh: '简体中文', 
      zht: '繁體中文', 
      kr: '한국어', 
      jp: '日本語' 
    },
    onLangChange: null,
    onThemeChange: null,
    autoInject: true
  };

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
      const savedTheme = localStorage.getItem('lab-theme') || localStorage.getItem('qmf-theme');
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
      console.log(`[QMF Settings] v${VERSION} initialized`);
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
      
      const container = document.createElement('div');
      container.className = `qmf-settings-float qmf-settings-float--${this.config.position}`;
      container.id = 'qmfSettingsFloat';
      
      container.innerHTML = `
        <button class="qmf-settings__toggle" id="qmfSettingsToggle" 
                aria-haspopup="true" aria-expanded="false" title="Settings">
          <i class="fas fa-cog"></i>
        </button>
        <div class="qmf-settings__menu" id="qmfSettingsMenu" role="menu">
          <div class="qmf-settings__section">
            <div class="qmf-settings__label">Language</div>
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
            <div class="qmf-settings__label">Theme</div>
            <div class="qmf-settings__themes">
              <button class="qmf-settings__theme ${theme === 'light' ? 'qmf-settings__theme--active' : ''}" 
                      data-theme="light" role="menuitem">
                <i class="fas fa-sun"></i>
                <span>Light</span>
              </button>
              <button class="qmf-settings__theme ${theme === 'dark' ? 'qmf-settings__theme--active' : ''}" 
                      data-theme="dark" role="menuitem">
                <i class="fas fa-moon"></i>
                <span>Dark</span>
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
      localStorage.setItem('qmf-lang', lang);
      localStorage.setItem('lab-lang', lang);
      
      // Update UI
      this.elements.langButtons.forEach(btn => {
        btn.classList.toggle('qmf-settings__lang--active', btn.dataset.lang === lang);
      });
      
      // Callback
      if (typeof this.config.onLangChange === 'function') {
        this.config.onLangChange(lang);
      }
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('qmf:langchange', { detail: { lang } }));
    }

    setTheme(theme) {
      this.config.theme = theme;
      localStorage.setItem('qmf-theme', theme);
      localStorage.setItem('lab-theme', theme);
      
      // Apply theme
      document.documentElement.setAttribute('data-theme', theme);
      
      // Update UI
      this.elements.themeButtons.forEach(btn => {
        btn.classList.toggle('qmf-settings__theme--active', btn.dataset.theme === theme);
      });
      
      // Callback
      if (typeof this.config.onThemeChange === 'function') {
        this.config.onThemeChange(theme);
      }
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('qmf:themechange', { detail: { theme } }));
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

  console.log(`[QMF Settings Float] Module loaded v${VERSION}`);
})();
