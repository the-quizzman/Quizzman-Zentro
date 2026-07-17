/**
 * QMF Unified Header — global Quizzman navigation
 *
 * Top nav discovers platform capabilities.
 * Each application's sidebar owns in-app navigation.
 */

(function() {
  'use strict';

  const VERSION = '3.5.0';
  const CDN_BASE = 'https://ui.quizzman.com/qmf/dist/modules/header';
  const CDN_NAV_BASE = 'https://ui.quizzman.com/qmf/dist/modules-v3/header';
  const LEGATUS_BRIDGE = CDN_BASE + '/legatus-bridge.js?v=' + VERSION;
  const LEGATUS_ENDPOINT = 'https://legatus.quizzman.com';

  /**
   * Four primary sections only. Add new apps as children — never new top-level items.
   */
  const QUIZZMAN_NAV_ITEMS = [
    {
      id: 'app',
      label: 'App',
      href: 'https://app.quizzman.com',
      children: [
        { id: 'mentis', label: 'Mentis', href: 'https://mentis.quizzman.com', icon: 'M', description: 'AI assistant' },
        { id: 'quiz-editor', label: 'Quiz Editor', href: 'https://app.quizzman.com/quiz-editor/', icon: 'Q', description: 'Create interactive quizzes' },
        { id: 'slide-studio', label: 'Slide Studio', href: 'https://app.quizzman.com/slide-studio/', icon: 'S', description: 'Presentation editor' },
        { id: 'lab', label: 'Lab', href: 'https://lab.quizzman.com', icon: 'L', description: 'Experiments and tools' },
        { id: 'app-platform', label: 'App Platform', href: 'https://app.quizzman.com', icon: 'A', description: 'All Quizzman apps' },
      ],
    },
    {
      id: 'tri-thuc',
      label: 'Tri thức',
      href: 'https://wiki.quizzman.com',
      children: [
        { id: 'wiki', label: 'Wiki', href: 'https://wiki.quizzman.com', icon: 'W', description: 'Knowledge base' },
        { id: 'dictionary', label: 'Dictionary', href: 'https://dict.quizzman.com', icon: '典', description: 'Chinese dictionary' },
        { id: 'docs', label: 'Docs', href: 'https://ui.quizzman.com/qmf/docs.html', icon: 'D', description: 'Platform documentation' },
        { id: 'ai-knowledge', label: 'AI Knowledge', href: 'https://mentis.quizzman.com', icon: 'AI', description: 'Ask Mentis about anything' },
        { id: 'search', label: 'Search', href: 'https://lib.quizzman.com', icon: '⌕', description: 'Search across Quizzman' },
      ],
    },
    {
      id: 'hoc',
      label: 'Học',
      href: 'https://study.quizzman.com',
      children: [
        { id: 'live-quiz', label: 'Live Quiz', href: 'https://play.quizzman.com/quiz', icon: '▶', description: 'Realtime classroom quizzes' },
        { id: 'homework', label: 'Homework', href: 'https://class.quizzman.com', icon: 'H', description: 'Assignments and submissions' },
        { id: 'classes', label: 'Classes', href: 'https://class.quizzman.com', icon: 'C', description: 'Classrooms and cohorts' },
        { id: 'learning-center', label: 'Learning Center', href: 'https://study.quizzman.com', icon: '学', description: 'HSK, TOCFL, and study tools' },
      ],
    },
    {
      id: 'game',
      label: 'Game',
      href: 'https://play.quizzman.com',
      children: [
        { id: 'edu-games', label: 'Educational games', href: 'https://play.quizzman.com', icon: 'G', description: 'Learn through play' },
        { id: 'multiplayer', label: 'Multiplayer', href: 'https://play.quizzman.com', icon: '合', description: 'Join a live room' },
        { id: 'practice', label: 'Practice', href: 'https://play.quizzman.com/pikahans', icon: '漢', description: 'Pikahans word practice' },
        { id: 'challenges', label: 'Challenges', href: 'https://play.quizzman.com/idiom-king', icon: '語', description: 'Idiom King challenges' },
      ],
    },
  ];

  const DEFAULT_CONFIG = {
    logoSrc: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png',
    logoSrcDark: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-dark.png',
    brandName: 'Quizzman',
    pageTitle: '',
    productSub: '',
    showGlobalNav: true,
    showHamburger: false,
    showChat: false,
    showFriend: false,
    showNotification: true,
    showSearch: true,
    showUserDropdown: false,
    searchPlaceholder: 'Search',
    searchUrl: '',
    loginUrl: 'https://id.quizzman.com/login',
    profileUrl: 'https://id.quizzman.com/profile',
    settingsUrl: 'https://id.quizzman.com/settings',
    mainLogoUrl: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png',
    mainLogoDarkUrl: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-dark.png',
    mainLogoLink: 'https://quizzman.com',
    navItems: null,
    headerInFlow: false,
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeSubLabel(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.toLowerCase() === 'workspace') return '';
    return raw;
  }

  function renderBrandLogo(config, brandName) {
    if (config.logoSrc) {
      const size = config.logoSize || 28;
      return `<img src="${escapeHtml(config.logoSrc)}" alt="${escapeHtml(brandName)}" class="lab-header__logo" width="${size}" height="${size}" loading="eager" decoding="async">`;
    }

    return `
      <picture>
        <source srcset="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.webp 1x, https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-232.webp 2x" type="image/webp">
        <img src="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.png" srcset="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.png 1x, https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png 2x" alt="${escapeHtml(brandName)}" class="lab-header__logo" width="116" height="63" loading="eager" decoding="async">
      </picture>
    `;
  }

  function detectActiveNavState() {
    const host = window.location.hostname;
    const path = window.location.pathname;

    if (host === 'mentis.quizzman.com') {
      return { section: 'app', child: 'mentis' };
    }

    if (host === 'app.quizzman.com') {
      if (path.startsWith('/quiz-editor')) return { section: 'app', child: 'quiz-editor' };
      if (path.startsWith('/slide-studio')) return { section: 'app', child: 'slide-studio' };
      return { section: 'app', child: 'app-platform' };
    }

    if (host === 'lab.quizzman.com') {
      return { section: 'app', child: 'lab' };
    }

    if (host === 'wiki.quizzman.com') {
      return { section: 'tri-thuc', child: 'wiki' };
    }

    if (host === 'dict.quizzman.com') {
      return { section: 'tri-thuc', child: 'dictionary' };
    }

    if (host === 'ui.quizzman.com' && path.includes('/docs')) {
      return { section: 'tri-thuc', child: 'docs' };
    }

    if (host === 'lib.quizzman.com') {
      return { section: 'tri-thuc', child: 'search' };
    }

    if (host === 'study.quizzman.com' || host === 'hsk.quizzman.com') {
      return { section: 'hoc', child: 'learning-center' };
    }

    if (host === 'class.quizzman.com') {
      return { section: 'hoc', child: path.includes('homework') ? 'homework' : 'classes' };
    }

    if (host === 'play.quizzman.com') {
      if (path.startsWith('/quiz')) return { section: 'hoc', child: 'live-quiz' };
      if (path.startsWith('/pikahans')) return { section: 'game', child: 'practice' };
      if (path.startsWith('/idiom-king')) return { section: 'game', child: 'challenges' };
      return { section: 'game', child: 'edu-games' };
    }

    return {};
  }

  function renderMegaCard(child, activeChild) {
    const isActive = child.id === activeChild;
    const isDisabled = !!child.disabled;
    const icon = child.iconImg
      ? `<span class="lab-header__mega-icon lab-header__mega-icon--img" aria-hidden="true"><img src="${escapeHtml(child.iconImg)}" alt="${escapeHtml(child.iconAlt || child.label)}" width="20" height="20" loading="lazy" decoding="async"></span>`
      : `<span class="lab-header__mega-icon" aria-hidden="true">${escapeHtml(child.icon || child.label.charAt(0))}</span>`;

    const body = `
      ${icon}
      <span class="lab-header__mega-body">
        <span class="lab-header__mega-title">${escapeHtml(child.label)}</span>
        <span class="lab-header__mega-desc">${escapeHtml(child.description || '')}</span>
      </span>
    `;

    if (isDisabled) {
      return `
        <span class="lab-header__mega-card lab-header__mega-card--disabled${isActive ? ' is-active' : ''}" role="menuitem" aria-disabled="true">
          ${body}
        </span>
      `;
    }

    return `
      <a class="lab-header__mega-card${isActive ? ' is-active' : ''}" href="${escapeHtml(child.href)}" role="menuitem">
        ${body}
      </a>
    `;
  }

  function renderNavDropdown(item, activeState) {
    const isSectionActive = item.id === activeState.section;
    const cards = (item.children || []).map((child) => renderMegaCard(child, activeState.child)).join('');
    const count = (item.children || []).length;
    const wide = count >= 4;

    return `
      <div class="lab-header__nav-item lab-header__nav-item--dropdown${isSectionActive ? ' is-active' : ''}" data-nav-id="${escapeHtml(item.id)}">
        <button type="button" class="lab-header__nav-link lab-header__nav-trigger${isSectionActive ? ' is-active' : ''}" aria-expanded="false" aria-haspopup="true">
          <span>${escapeHtml(item.label)}</span>
          <svg class="lab-header__nav-chevron" width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
        <div class="lab-header__mega${wide ? ' lab-header__mega--wide' : ''}" role="menu" aria-label="${escapeHtml(item.label)}">
          <div class="lab-header__mega-grid">
            ${cards}
          </div>
        </div>
      </div>
    `;
  }

  function renderNavLink(item, activeState) {
    const isSectionActive = item.id === activeState.section;
    return `
      <a
        class="lab-header__nav-link${isSectionActive ? ' is-active' : ''}"
        href="${escapeHtml(item.href)}"
        data-nav-id="${escapeHtml(item.id)}"
      >
        <span>${escapeHtml(item.label)}</span>
      </a>
    `;
  }

  function renderNavItem(item, activeState) {
    if (item.children && item.children.length) return renderNavDropdown(item, activeState);
    return renderNavLink(item, activeState);
  }

  function buildNavHtml(navItems, activeState) {
    return navItems.map((item) => renderNavItem(item, activeState)).join('');
  }

  function renderMobileNavSection(item, activeState) {
    const isSectionActive = item.id === activeState.section;

    if (item.children && item.children.length) {
      const children = item.children.map((child) => {
        const isActive = child.id === activeState.child;

        if (child.disabled) {
          return `
            <span class="lab-header__drawer-item lab-header__drawer-item--disabled${isActive ? ' is-active' : ''}" aria-disabled="true">
              <span class="lab-header__drawer-item-title">${escapeHtml(child.label)}</span>
              <span class="lab-header__drawer-item-desc">${escapeHtml(child.description || '')}</span>
            </span>
          `;
        }

        return `
          <a class="lab-header__drawer-item${isActive ? ' is-active' : ''}" href="${escapeHtml(child.href)}">
            <span class="lab-header__drawer-item-title">${escapeHtml(child.label)}</span>
            <span class="lab-header__drawer-item-desc">${escapeHtml(child.description || '')}</span>
          </a>
        `;
      }).join('');

      return `
        <div class="lab-header__drawer-section${isSectionActive ? ' is-active' : ''}">
          <div class="lab-header__drawer-section-head">
            <span class="lab-header__drawer-section-label">${escapeHtml(item.label)}</span>
          </div>
          <div class="lab-header__drawer-section-items">${children}</div>
        </div>
      `;
    }

    return `
      <a class="lab-header__drawer-link${isSectionActive ? ' is-active' : ''}" href="${escapeHtml(item.href)}">
        <span>${escapeHtml(item.label)}</span>
      </a>
    `;
  }

  function renderSearch(config) {
    if (config.showSearch === false) return '';

    return `
      <form class="lab-header__search" role="search" data-qmf-search>
        <label class="lab-header__search-label" for="qmf-global-search">
          <svg class="lab-header__search-icon" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10.5 10.5 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span class="sr-only">Search Quizzman</span>
        </label>
        <input
          id="qmf-global-search"
          class="lab-header__search-input"
          type="search"
          name="q"
          autocomplete="off"
          spellcheck="false"
          placeholder="${escapeHtml(config.searchPlaceholder || 'Search')}"
          aria-label="Search apps, wiki, docs, quizzes, and more"
        />
        <kbd class="lab-header__search-kbd" aria-hidden="true">⌘K</kbd>
      </form>
    `;
  }

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
      this.navItems = this.config.navItems || QUIZZMAN_NAV_ITEMS;
      this.activeState = detectActiveNavState();
      this.headerEl = null;
      this.openDropdown = null;
      this.drawerOpen = false;
      this.boundDocClick = this.handleDocumentClick.bind(this);
      this.boundKeydown = this.handleKeydown.bind(this);

      this.init();
    }

    init() {
      this.render();
      this.setupThemeAwareness();
      if (this.config.showGlobalNav) {
        this.setupNavigation();
      }
      if (this.config.showSearch !== false) {
        this.setupSearch();
      }
      if (this.config.showNotification !== false) {
        this.mountLegatus();
      }
      document.body.classList.add('has-qmf-header');
      console.log(`[QMF Header] v${VERSION} initialized`);
    }

    mountLegatus() {
      const slot = this.container?.querySelector('[data-qmf-notification-slot]');
      if (!slot) return;

      const run = () => {
        if (typeof window.mountLegatusInHeader !== 'function') return;
        window.mountLegatusInHeader({
          slot: slot,
          endpoint: this.config.legatusEndpoint || LEGATUS_ENDPOINT,
        });
      };

      if (typeof window.mountLegatusInHeader === 'function') {
        run();
        return;
      }

      if (document.getElementById('qmf-legatus-bridge-js')) {
        const start = Date.now();
        const wait = () => {
          if (typeof window.mountLegatusInHeader === 'function') return run();
          if (Date.now() - start > 5000) return;
          setTimeout(wait, 50);
        };
        wait();
        return;
      }

      const script = document.createElement('script');
      script.id = 'qmf-legatus-bridge-js';
      script.src = LEGATUS_BRIDGE;
      script.defer = true;
      script.onload = run;
      script.onerror = () => console.warn('[QMF Header] Legatus bridge failed to load');
      document.head.appendChild(script);
    }

    setupThemeAwareness() {
      const update = () => {
        const dark = document.documentElement.getAttribute('data-theme') === 'dark'
          || (!document.documentElement.getAttribute('data-theme')
            && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (this.config.logoSrc) return;

        this.container.querySelectorAll('img').forEach((logo) => {
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
      const { brandName, pageTitle, productSub, showGlobalNav } = this.config;
      const appName = pageTitle || brandName;
      const subLabel = normalizeSubLabel(productSub);

      const navHtml = showGlobalNav
        ? `<nav class="lab-header__nav" aria-label="Quizzman navigation">${buildNavHtml(this.navItems, this.activeState)}</nav>`
        : '';

      const qmGroupHtml = showGlobalNav ? '' : `
        <a href="${escapeHtml(this.config.mainLogoLink || 'https://quizzman.com')}" class="lab-header__qm-group" title="Quizzman">
          <picture>
            <source srcset="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.webp 1x, https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-232.webp 2x" type="image/webp">
            <img src="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.png" srcset="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.png 1x, https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png 2x" alt="Quizzman" class="lab-header__qm-logo" width="116" height="63" loading="eager" decoding="async">
          </picture>
          <div class="lab-header__qm-texts">
            <span class="lab-header__qm-name">${escapeHtml(appName)}</span>
          </div>
        </a>
      `;

      const menuBtnHtml = showGlobalNav
        ? `<button type="button" class="lab-header__menu-btn lab-header__mobile-menu" aria-label="Open navigation menu" aria-expanded="false" aria-controls="lab-header-drawer"><svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5.5h14M3 10h14M3 14.5h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>`
        : '';

      const drawerHtml = showGlobalNav
        ? `
          <div class="lab-header__drawer-backdrop" hidden></div>
          <aside id="lab-header-drawer" class="lab-header__drawer" aria-hidden="true" aria-label="Quizzman navigation menu">
            <div class="lab-header__drawer-head">
              <span class="lab-header__drawer-title">Quizzman</span>
              <button type="button" class="lab-header__drawer-close" aria-label="Close navigation menu">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4.5 4.5 13.5 13.5M13.5 4.5 4.5 13.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
              </button>
            </div>
            <div class="lab-header__drawer-body">
              ${this.navItems.map((item) => renderMobileNavSection(item, this.activeState)).join('')}
            </div>
            <div class="lab-header__drawer-extras" data-drawer-extras></div>
          </aside>
        `
        : '';

      const inFlow = !!this.config.headerInFlow;
      const brandHref = this.config.brandHref || '/';

      this.container.innerHTML = `
        <header class="lab-header${showGlobalNav ? ' lab-header--has-nav' : ''}${inFlow ? ' lab-header--in-flow' : ''}" role="banner">
          <div class="lab-header__inner">
            <a href="${escapeHtml(brandHref)}" class="lab-header__brand">
              ${renderBrandLogo(this.config, brandName)}
              <div class="lab-header__titles">
                <span class="lab-header__name lab-header__brand-title">${escapeHtml(appName)}</span>
                ${subLabel ? `<span class="lab-header__sub lab-header__brand-subtitle">${escapeHtml(subLabel)}</span>` : ''}
              </div>
            </a>
            ${navHtml}
            <div class="lab-header__spacer" aria-hidden="true"></div>
            ${qmGroupHtml}
            <div class="lab-header__actions">
              ${renderSearch(this.config)}
              ${this.config.showNotification !== false ? '<div class="lab-header__notification-slot" data-qmf-notification-slot aria-label="Notifications"></div>' : ''}
            </div>
            ${menuBtnHtml}
          </div>
          ${drawerHtml}
        </header>
      `;

      this.headerEl = this.container.querySelector('.lab-header');

      if (inFlow) {
        document.body.classList.add('lab-header--in-flow');
      }
    }

    setupSearch() {
      const form = this.headerEl?.querySelector('[data-qmf-search]');
      const input = form?.querySelector('.lab-header__search-input');
      if (!form || !input) return;

      const runSearch = (query) => {
        const q = String(query || '').trim();
        const detail = { query: q, source: 'qmf-header' };
        window.dispatchEvent(new CustomEvent('qmf:global-search', { detail }));
        document.dispatchEvent(new CustomEvent('qmf:global-search', { detail }));

        if (!q) {
          input.focus();
          return;
        }

        if (this.config.searchUrl) {
          const url = this.config.searchUrl.includes('{q}')
            ? this.config.searchUrl.replace('{q}', encodeURIComponent(q))
            : `${this.config.searchUrl}${this.config.searchUrl.includes('?') ? '&' : '?'}q=${encodeURIComponent(q)}`;
          window.location.href = url;
          return;
        }

        // Prefer in-app command palette when present (e.g. Mentis)
        if (typeof document.dispatchEvent === 'function') {
          document.dispatchEvent(new CustomEvent('mentis:open-palette', { detail: { query: q } }));
        }
      };

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        runSearch(input.value);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          input.blur();
          input.value = '';
        }
      });
    }

    setupNavigation() {
      if (!this.headerEl) return;

      const dropdownItems = this.headerEl.querySelectorAll('.lab-header__nav-item--dropdown');
      dropdownItems.forEach((item) => {
        const trigger = item.querySelector('.lab-header__nav-trigger');
        const dropdown = item.querySelector('.lab-header__mega');

        const positionDropdown = () => {
          if (!dropdown) return;
          dropdown.classList.remove('lab-header__mega--align-right');
          const rect = dropdown.getBoundingClientRect();
          if (rect.right > window.innerWidth - 12) {
            dropdown.classList.add('lab-header__mega--align-right');
          }
        };

        const open = () => {
          this.closeAllDropdowns();
          item.classList.add('is-open');
          trigger?.setAttribute('aria-expanded', 'true');
          this.openDropdown = item;
          requestAnimationFrame(positionDropdown);
        };

        const close = () => {
          item.classList.remove('is-open');
          trigger?.setAttribute('aria-expanded', 'false');
          if (this.openDropdown === item) this.openDropdown = null;
        };

        trigger?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (item.classList.contains('is-open')) close();
          else open();
        });

        item.addEventListener('mouseenter', () => {
          if (window.matchMedia('(hover: hover)').matches) open();
        });

        item.addEventListener('mouseleave', () => {
          if (window.matchMedia('(hover: hover)').matches) close();
        });

        item.addEventListener('focusin', () => open());
        item.addEventListener('focusout', (e) => {
          if (!item.contains(e.relatedTarget)) close();
        });

        trigger?.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            open();
            item.querySelector('.lab-header__mega-card:not(.lab-header__mega-card--disabled)')?.focus();
          }
        });
      });

      const menuBtn = this.headerEl.querySelector('.lab-header__mobile-menu');
      const drawer = this.headerEl.querySelector('.lab-header__drawer');
      const backdrop = this.headerEl.querySelector('.lab-header__drawer-backdrop');
      const closeBtn = this.headerEl.querySelector('.lab-header__drawer-close');

      const openDrawer = () => {
        this.drawerOpen = true;
        drawer?.setAttribute('aria-hidden', 'false');
        menuBtn?.setAttribute('aria-expanded', 'true');
        backdrop?.removeAttribute('hidden');
        this.headerEl?.classList.add('lab-header--drawer-open');
        document.body.classList.add('lab-header-drawer-open');
        closeBtn?.focus();
      };

      const closeDrawer = () => {
        this.drawerOpen = false;
        drawer?.setAttribute('aria-hidden', 'true');
        menuBtn?.setAttribute('aria-expanded', 'false');
        backdrop?.setAttribute('hidden', '');
        this.headerEl?.classList.remove('lab-header--drawer-open');
        document.body.classList.remove('lab-header-drawer-open');
        menuBtn?.focus();
      };

      menuBtn?.addEventListener('click', () => {
        if (this.drawerOpen) closeDrawer();
        else openDrawer();
      });

      closeBtn?.addEventListener('click', closeDrawer);
      backdrop?.addEventListener('click', closeDrawer);

      document.addEventListener('click', this.boundDocClick);
      document.addEventListener('keydown', this.boundKeydown);

      this.closeDrawer = closeDrawer;
    }

    closeAllDropdowns() {
      if (!this.headerEl) return;
      this.headerEl.querySelectorAll('.lab-header__nav-item--dropdown.is-open').forEach((item) => {
        item.classList.remove('is-open');
        item.querySelector('.lab-header__nav-trigger')?.setAttribute('aria-expanded', 'false');
      });
      this.openDropdown = null;
    }

    handleDocumentClick(e) {
      if (!this.openDropdown) return;
      if (!this.openDropdown.contains(e.target)) this.closeAllDropdowns();
    }

    handleKeydown(e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        const input = this.headerEl?.querySelector('.lab-header__search-input');
        if (input && this.config.showSearch !== false) {
          e.preventDefault();
          input.focus();
          input.select();
          return;
        }
      }

      if (e.key === 'Escape') {
        if (this.drawerOpen && this.closeDrawer) {
          this.closeDrawer();
          return;
        }
        this.closeAllDropdowns();
      }
    }

    destroy() {
      document.removeEventListener('click', this.boundDocClick);
      document.removeEventListener('keydown', this.boundKeydown);
      document.body.classList.remove('has-qmf-header', 'lab-header-drawer-open', 'lab-header--in-flow');
      if (this.container) this.container.innerHTML = '';
      this.headerEl = null;
    }
  }

  function loadStyles() {
    const sheets = [
      { id: 'qmf-header-styles', href: CDN_BASE + '/unified-header.css?v=' + VERSION },
      { id: 'qmf-lab-header-styles', href: CDN_NAV_BASE + '/lab-header.css?v=' + VERSION },
    ];

    sheets.forEach(({ id, href }) => {
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    });
  }

  window.UnifiedHeader = UnifiedHeader;
  window.QMFHeader = UnifiedHeader;
  window.QUIZZMAN_NAV_ITEMS = QUIZZMAN_NAV_ITEMS;
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
