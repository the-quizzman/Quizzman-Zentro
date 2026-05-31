/**
 * QMF Unified Header Component
 */

(function() {
  'use strict';

  const VERSION = '3.0.0';
  const CDN_BASE = 'https://ui.quizzman.com/qmf/dist/modules/header';

  // Default config
  const DEFAULT_CONFIG = {
    logoSrc: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png',
    logoSrcDark: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-dark.png',
    brandName: 'QuizzMan',
    pageTitle: '',
    showHamburger: false,
    showChat: false,
    showFriend: false,
    showNotification: false,
    showUserDropdown: false,
    loginUrl: 'https://id.quizzman.com/login',
    profileUrl: 'https://id.quizzman.com/profile',
    settingsUrl: 'https://id.quizzman.com/settings',
    mainLogoUrl: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png',
    mainLogoDarkUrl: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-dark.png',
    mainLogoLink: 'https://quizzman.com'
  };

  // Simple header class
  class UnifiedHeader {
    constructor(container, config = {}) {
      this.container = typeof container === 'string' 
        ? document.querySelector(container) 
        : container;
      
      if (!this.container) {
        console.error('[QMF Header] Container not found');
        return;
      }

      this.config = { ...DEFAULT_CONFIG, ...config };
      this.init();
    }

    init() {
      this.render();
      this.setupThemeAwareness();
      document.body.classList.add('has-qmf-header');
      console.log(`[QMF Header] v${VERSION} initialized`);
    }

    setupThemeAwareness() {
      const update = () => {
        const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
          (!document.documentElement.getAttribute('data-theme') && 
           window.matchMedia('(prefers-color-scheme: dark)').matches);
        
        const logos = this.container.querySelectorAll('img');
        logos.forEach(logo => {
          if (dark && logo.src.includes('quizzman-logo.png') && !logo.src.includes('dark')) {
            logo.src = logo.src.replace('quizzman-logo.png', 'quizzman-logo-dark.png');
          } else if (!dark && logo.src.includes('quizzman-logo-dark.png')) {
            logo.src = logo.src.replace('quizzman-logo-dark.png', 'quizzman-logo.png');
          }
        });
      };

      update();
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', update);
      new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    render() {
      const { logoSrc, brandName, pageTitle, mainLogoUrl, mainLogoLink } = this.config;

      // Lab-header style structure
      this.container.innerHTML = `
        <header class="lab-header" role="banner">
          <div class="lab-header__inner">
            <a href="/" class="lab-header__brand">
              <picture>
                <source srcset="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.webp 1x, https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-232.webp 2x" type="image/webp">
                <img src="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.png" srcset="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.png 1x, https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png 2x" alt="${brandName}" class="lab-header__logo" width="116" height="63" loading="eager" decoding="async">
              </picture>
              <div class="lab-header__titles">
                <span class="lab-header__name">${pageTitle || brandName}</span>
                <span class="lab-header__sub">Payment Gateway</span>
              </div>
            </a>
            <a href="${mainLogoLink || 'https://quizzman.com'}" class="lab-header__qm-group" title="QuizzMan">
              <picture>
                <source srcset="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.webp 1x, https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-232.webp 2x" type="image/webp">
                <img src="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.png" srcset="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.png 1x, https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png 2x" alt="QuizzMan" class="lab-header__qm-logo" width="116" height="63" loading="eager" decoding="async">
              </picture>
              <div class="lab-header__qm-texts">
                <span class="lab-header__qm-name">QuizzMan</span>
                <span class="lab-header__qm-sub">Payment System</span>
              </div>
            </a>
            <div class="lab-header__actions">
              <!-- Auth widget will be placed here by createAuthWidget -->
            </div>
          </div>
        </header>
      `;
    }
  }

  // Load CSS
  function loadStyles() {
    if (document.getElementById('qmf-header-styles')) return;
    const link = document.createElement('link');
    link.id = 'qmf-header-styles';
    link.rel = 'stylesheet';
    link.href = CDN_BASE + '/unified-header.css?v=' + VERSION;
    document.head.appendChild(link);
  }

  // Export
  window.UnifiedHeader = UnifiedHeader;
  window.QMFHeader = UnifiedHeader;
  window.createUnifiedHeader = function(containerOrConfig, config) {
    loadStyles();
    if (typeof containerOrConfig === 'object' && containerOrConfig.container) {
      const { container, ...restConfig } = containerOrConfig;
      return new UnifiedHeader(container, restConfig);
    }
    return new UnifiedHeader(containerOrConfig, config);
  };

  if (window.QMF) {
    window.QMF.createHeader = window.createUnifiedHeader;
  }

  console.log(`[QMF Header] Module loaded v${VERSION}`);
})();
