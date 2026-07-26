/**
 * QMF Unified Header — global Quizzman navigation
 *
 * Top nav discovers platform capabilities.
 * Each application's sidebar owns in-app navigation.
 */

(function() {
  'use strict';

  const VERSION = '3.8.7';
  const CDN_BASE = 'https://ui.quizzman.com/qmf/dist/modules/header';
  const CDN_NAV_BASE = 'https://ui.quizzman.com/qmf/dist/modules-v3/header';
  const JOIN_OVERLAY_BASE = 'https://ui.quizzman.com/qmf/dist/modules/join-overlay';
  const JOIN_OVERLAY_VERSION = '1.0.4';
  const LEGATUS_BRIDGE = CDN_BASE + '/legatus-bridge.js?v=' + VERSION;
  const LEGATUS_ENDPOINT = 'https://legatus.quizzman.com';
  const NAV_ICON_BASE = 'https://ui.quizzman.com/qmf/assets/logo/nav';
  const NAV_ICON_VER = '20260719-4';
  let joinOverlayLoader = null;

  function navIcon(name) {
    const base = NAV_ICON_BASE + '/' + name;
    return {
      iconImg: base + '-40.png?v=' + NAV_ICON_VER,
      iconImg2x: base + '-80.png?v=' + NAV_ICON_VER,
      iconImgWebp: base + '-40.webp?v=' + NAV_ICON_VER,
      iconImgWebp2x: base + '-80.webp?v=' + NAV_ICON_VER,
      iconAlt: name.replace(/-/g, ' '),
    };
  }

  /**
   * Section glyphs for the primary nav — Lucide-style, 2px stroke, one visual family.
   * Rendered inline so they inherit the link color (muted → brand accent when active).
   */
  const NAV_SECTION_ICONS = {
    'home': '<path d="m3 10.8 9-7.3 9 7.3"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/>',
    'app': '<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/>',
    'tri-thuc': '<path d="M2 4.5h6a3 3 0 0 1 3 3V20a2.2 2.2 0 0 0-2.2-2.2H2z"/><path d="M22 4.5h-6a3 3 0 0 0-3 3V20a2.2 2.2 0 0 1 2.2-2.2H22z"/>',
    'hoc': '<path d="M22 9.5 12 5 2 9.5l10 4.5 10-4.5z"/><path d="M6 11.4V16c3.2 2 8.8 2 12 0v-4.6"/>',
    'game': '<path d="M6.5 11.5h4M8.5 9.5v4"/><path d="M15.4 10.6h.01M18 12.9h.01"/><path d="M17.4 5.5H6.6a4 4 0 0 0-3.98 3.6L2 14.4A2.4 2.4 0 0 0 6.3 16l.6-.8h10.2l.6.8a2.4 2.4 0 0 0 4.3-1.6l-.62-5.3a4 4 0 0 0-3.98-3.6z"/>',
  };

  function navSectionIcon(id) {
    const paths = NAV_SECTION_ICONS[id];
    if (!paths) return '';
    return `<svg class="lab-header__nav-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  }

  /**
   * Four primary sections only. Add new apps as children — never new top-level items.
   * Product logos: compressed WebP/PNG thumbs under /qmf/assets/logo/nav/ (cached 7d).
   */
  const QUIZZMAN_NAV_ITEMS = [
    {
      id: 'home',
      label: 'Trang chủ',
      href: 'https://quizzman.com',
      compact: true,
    },
    {
      id: 'app',
      label: 'App',
      href: 'https://app.quizzman.com',
      children: [
        { id: 'mentis', label: 'Mentis', href: 'https://mentis.quizzman.com', description: 'AI assistant', group: 'Nền tảng', ...navIcon('mentis') },
        { id: 'lms', label: 'LMS', href: 'https://lms.quizzman.com', description: 'Learning management system', group: 'Nền tảng', ...navIcon('lms') },
        { id: 'classroom', label: 'Class', href: 'https://class.quizzman.com', description: 'Classes and learning groups', group: 'Nền tảng', ...navIcon('classroom') },
        { id: 'slide-studio', label: 'Slide Studio', href: 'https://app.quizzman.com/slide-studio/', description: 'Presentation editor', group: 'Nền tảng', ...navIcon('slide-studio') },
        { id: 'lab', label: 'Eastern Lab', href: 'https://lab.quizzman.com', description: 'Experiments and tools', group: 'Nền tảng', ...navIcon('eastern-lab') },
        { id: 'app-platform', label: 'App Platform', href: 'https://app.quizzman.com', icon: 'A', description: 'All Quizzman apps', group: 'Nền tảng' },
        { id: 'quiz-editor', label: 'Quiz Editor', href: 'https://app.quizzman.com/quiz-editor/', description: 'Create interactive quizzes', group: 'Tạo & khám phá', ...navIcon('quiz-editor') },
        { id: 'assignment', label: 'Assignment', href: 'https://class.quizzman.com/homework', description: 'Create and manage assignments', group: 'Tạo & khám phá', ...navIcon('assignment') },
        { id: 'iching', label: 'I-Ching', href: 'https://lab.quizzman.com/tool/iching-divination', description: 'Cast and explore hexagrams', group: 'Tạo & khám phá', ...navIcon('iching') },
        { id: 'calendar', label: 'Calendar', href: 'https://lab.quizzman.com/tool/calendar-converter', description: 'Calendar and date tools', group: 'Tạo & khám phá', ...navIcon('calendar') },
        { id: 'mandarin', label: 'Mandarin', href: 'https://hsk.quizzman.com', description: 'Chinese language learning', group: 'Tạo & khám phá', ...navIcon('mandarin') },
      ],
    },
    {
      id: 'tri-thuc',
      label: 'Tri thức',
      href: 'https://wiki.quizzman.com',
      children: [
        { id: 'wiki', label: 'Wiki', href: 'https://wiki.quizzman.com', description: 'Knowledge base', ...navIcon('wiki') },
        { id: 'dictionary', label: 'Dictionary', href: 'https://dict.quizzman.com', icon: '典', description: 'Chinese dictionary' },
        { id: 'docs', label: 'Docs', href: 'https://ui.quizzman.com/qmf/docs.html', description: 'Platform documentation', ...navIcon('ui') },
        { id: 'ai-knowledge', label: 'AI Knowledge', href: 'https://mentis.quizzman.com', description: 'Ask Mentis about anything', ...navIcon('mentis') },
        { id: 'search', label: 'Search', href: 'https://lib.quizzman.com', icon: '⌕', description: 'Search across Quizzman' },
      ],
    },
    {
      id: 'hoc',
      label: 'Học',
      href: 'https://study.quizzman.com',
      children: [
        { id: 'live-quiz', label: 'Live Quiz', href: 'https://play.quizzman.com/quiz', description: 'Realtime classroom quizzes', ...navIcon('live-quiz') },
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
        { id: 'practice', label: 'Practice', href: 'https://play.quizzman.com/pikahans', description: 'Pikahans word practice', ...navIcon('pikahans') },
        { id: 'challenges', label: 'Challenges', href: 'https://play.quizzman.com/idiom-king', description: 'Idiom King challenges', ...navIcon('idiom-king') },
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
    showJoinQuiz: true,
    showUserDropdown: false,
    searchPlaceholder: 'Search',
    joinQuizLabel: 'Join Quiz',
    joinOverlayBase: JOIN_OVERLAY_BASE,
    searchUrl: '',
    loginUrl: 'https://id.quizzman.com/login',
    profileUrl: 'https://id.quizzman.com/account',
    settingsUrl: 'https://id.quizzman.com/account',
    mainLogoUrl: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png',
    mainLogoDarkUrl: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-dark.png',
    mainLogoLink: 'https://quizzman.com',
    navItems: null,
    headerInFlow: false,
  };

  function loadJoinOverlay(base = JOIN_OVERLAY_BASE) {
    if (window.QMFJoinOverlay?.open) return Promise.resolve(window.QMFJoinOverlay);
    if (joinOverlayLoader) return joinOverlayLoader;
    const normalizedBase = String(base || JOIN_OVERLAY_BASE).replace(/\/+$/, '');
    joinOverlayLoader = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-qmf-join-overlay]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.QMFJoinOverlay), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = `${normalizedBase}/join-overlay.js?v=${JOIN_OVERLAY_VERSION}`;
      script.async = true;
      script.dataset.qmfJoinOverlay = '1';
      script.addEventListener('load', () => {
        if (window.QMFJoinOverlay?.open) resolve(window.QMFJoinOverlay);
        else reject(new Error('Join Overlay API unavailable'));
      }, { once: true });
      script.addEventListener('error', () => reject(new Error('Unable to load Join Overlay')), { once: true });
      document.head.appendChild(script);
    }).catch((error) => {
      joinOverlayLoader = null;
      throw error;
    });
    return joinOverlayLoader;
  }

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

    if (host === 'quizzman.com' || host === 'www.quizzman.com') {
      return { section: 'home' };
    }

    if (host === 'mentis.quizzman.com') {
      return { section: 'app', child: 'mentis' };
    }

    if (host === 'lms.quizzman.com') {
      return { section: 'app', child: 'lms' };
    }

    if (host === 'app.quizzman.com') {
      if (path.startsWith('/quiz-editor')) return { section: 'app', child: 'quiz-editor' };
      if (path.startsWith('/slide-studio')) return { section: 'app', child: 'slide-studio' };
      return { section: 'app', child: 'app-platform' };
    }

    if (host === 'lab.quizzman.com') {
      if (path.startsWith('/tool/iching-divination')) return { section: 'app', child: 'iching' };
      if (path.startsWith('/tool/calendar-converter')) return { section: 'app', child: 'calendar' };
      return { section: 'app', child: 'lab' };
    }

    if (host === 'wiki.quizzman.com') {
      return { section: 'tri-thuc', child: 'wiki' };
    }

    if (host === 'dict.quizzman.com') {
      return { section: 'tri-thuc', child: 'dictionary' };
    }

    if (host === 'ui.quizzman.com') {
      return { section: 'tri-thuc', child: 'docs' };
    }

    if (host === 'lib.quizzman.com') {
      return { section: 'tri-thuc', child: 'search' };
    }

    if (host === 'hsk.quizzman.com') {
      return { section: 'app', child: 'mandarin' };
    }

    if (host === 'study.quizzman.com') {
      return { section: 'hoc', child: 'learning-center' };
    }

    if (host === 'class.quizzman.com') {
      if (path.includes('assignment') || path.includes('homework')) {
        return { section: 'app', child: 'assignment' };
      }
      return { section: 'app', child: 'classroom' };
    }

    if (host === 'play.quizzman.com') {
      if (path.startsWith('/quiz')) return { section: 'hoc', child: 'live-quiz' };
      if (path.startsWith('/pikahans')) return { section: 'game', child: 'practice' };
      if (path.startsWith('/idiom-king')) return { section: 'game', child: 'challenges' };
      return { section: 'game', child: 'edu-games' };
    }

    return {};
  }

  function renderMegaIcon(child) {
    if (child.iconImg) {
      const alt = escapeHtml(child.iconAlt || child.label);
      const src = escapeHtml(child.iconImg);
      const src2x = child.iconImg2x ? escapeHtml(child.iconImg2x) : '';
      const webp = child.iconImgWebp ? escapeHtml(child.iconImgWebp) : '';
      const webp2x = child.iconImgWebp2x ? escapeHtml(child.iconImgWebp2x) : '';
      const pngSrcset = src2x ? `${src} 1x, ${src2x} 2x` : src;
      const webpSrcset = webp && webp2x ? `${webp} 1x, ${webp2x} 2x` : webp;

      return `
        <span class="lab-header__mega-icon lab-header__mega-icon--img" aria-hidden="true">
          <picture>
            ${webpSrcset ? `<source type="image/webp" srcset="${webpSrcset}">` : (webp ? `<source type="image/webp" srcset="${webp}">` : '')}
            <img src="${src}" ${src2x ? `srcset="${pngSrcset}"` : ''} alt="${alt}" width="20" height="20" loading="lazy" decoding="async">
          </picture>
        </span>
      `;
    }

    return `<span class="lab-header__mega-icon" aria-hidden="true">${escapeHtml(child.icon || child.label.charAt(0))}</span>`;
  }

  function renderMegaCard(child, activeChild) {
    const isActive = child.id === activeChild;
    const isDisabled = !!child.disabled;
    const icon = renderMegaIcon(child);

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
    const children = item.children || [];
    const grouped = children.some((child) => child.group);
    const groups = [];

    children.forEach((child) => {
      const label = child.group || '';
      let group = groups.find((candidate) => candidate.label === label);
      if (!group) {
        group = { label, children: [] };
        groups.push(group);
      }
      group.children.push(child);
    });

    const cards = grouped
      ? groups.map((group) => `
          <section class="lab-header__mega-section">
            <div class="lab-header__mega-section-title">${escapeHtml(group.label)}</div>
            <div class="lab-header__mega-section-items">
              ${group.children.map((child) => renderMegaCard(child, activeState.child)).join('')}
            </div>
          </section>
        `).join('')
      : children.map((child) => renderMegaCard(child, activeState.child)).join('');
    const count = children.length;
    const wide = count >= 4;

    return `
      <div class="lab-header__nav-item lab-header__nav-item--dropdown${isSectionActive ? ' is-active' : ''}" data-nav-id="${escapeHtml(item.id)}">
        <button type="button" class="lab-header__nav-link lab-header__nav-trigger${isSectionActive ? ' is-active' : ''}" aria-expanded="false" aria-haspopup="true" aria-label="${escapeHtml(item.label)}" title="${escapeHtml(item.label)}">
          ${navSectionIcon(item.id)}
          <span class="lab-header__nav-text">${escapeHtml(item.label)}</span>
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
    const compact = !!item.compact;
    return `
      <a
        class="lab-header__nav-link${compact ? ' lab-header__nav-link--compact' : ''}${isSectionActive ? ' is-active' : ''}"
        href="${escapeHtml(item.href)}"
        data-nav-id="${escapeHtml(item.id)}"
        aria-label="${escapeHtml(item.label)}"
        title="${escapeHtml(item.label)}"
      >
        ${navSectionIcon(item.id)}
        <span class="${compact ? 'sr-only' : 'lab-header__nav-text'}">${escapeHtml(item.label)}</span>
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
      let currentGroup = null;
      const children = item.children.map((child) => {
        const isActive = child.id === activeState.child;
        const icon = renderMegaIcon(child);
        const groupLabel = child.group && child.group !== currentGroup
          ? `<span class="lab-header__drawer-group-label">${escapeHtml(child.group)}</span>`
          : '';
        currentGroup = child.group || null;

        if (child.disabled) {
          return `
            ${groupLabel}
            <span class="lab-header__drawer-item lab-header__drawer-item--disabled${isActive ? ' is-active' : ''}" aria-disabled="true">
              ${icon}
              <span class="lab-header__drawer-item-body">
                <span class="lab-header__drawer-item-title">${escapeHtml(child.label)}</span>
                <span class="lab-header__drawer-item-desc">${escapeHtml(child.description || '')}</span>
              </span>
            </span>
          `;
        }

        return `
          ${groupLabel}
          <a class="lab-header__drawer-item${isActive ? ' is-active' : ''}" href="${escapeHtml(child.href)}">
            ${icon}
            <span class="lab-header__drawer-item-body">
              <span class="lab-header__drawer-item-title">${escapeHtml(child.label)}</span>
              <span class="lab-header__drawer-item-desc">${escapeHtml(child.description || '')}</span>
            </span>
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
      <button type="button" class="lab-header__search-btn" data-qmf-search-toggle aria-label="Search" aria-expanded="false" aria-controls="qmf-global-search">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
          <path d="M10.5 10.5 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
      <form class="lab-header__search" role="search" data-qmf-search>
        <label class="lab-header__search-label" for="qmf-global-search">
          <svg class="lab-header__search-icon" width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
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
          placeholder="${escapeHtml(config.searchPlaceholder || 'Search apps, knowledge…')}"
          aria-label="Search apps, wiki, docs, quizzes, and more"
        />
        <span class="lab-header__search-ai" aria-hidden="true" title="AI-powered search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/>
            <path d="M19 15l.8 1.9L21.7 17.7 19.8 18.5 19 20.5 18.2 18.5 16.3 17.7 18.2 16.9z"/>
          </svg>
        </span>
        <kbd class="lab-header__search-kbd" aria-hidden="true">⌘K</kbd>
        <button type="button" class="lab-header__search-dismiss" data-qmf-search-dismiss aria-label="Close search">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3 3 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
      </form>
    `;
  }

  function renderJoinQuizButton(config) {
    if (config.showJoinQuiz === false) return '';
    const label = escapeHtml(config.joinQuizLabel || 'Join Quiz');
    return `
      <button type="button" class="lab-header__join-quiz" data-qmf-header-join aria-haspopup="dialog">
        <svg class="lab-header__join-quiz-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7.2 9.5h3.6M9 7.7v3.6M15.4 8.6h.01M17.4 10.5h.01" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
          <path d="M7 5.5h10a4 4 0 0 1 3.94 3.3l.8 4.6a2.7 2.7 0 0 1-4.78 2.15l-1.15-1.45H8.19l-1.15 1.45a2.7 2.7 0 0 1-4.78-2.15l.8-4.6A4 4 0 0 1 7 5.5Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
        </svg>
        <span class="lab-header__join-quiz-label">${label}</span>
      </button>
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
      this.boundJoinClick = null;

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
      if (this.config.showJoinQuiz !== false) {
        this.setupJoinQuiz();
      }
      if (this.config.showNotification !== false && this.config.autoMountLegatus !== false) {
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
      const badge = String(this.config.brandBadge || '').trim();

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
                <span class="lab-header__title-row">
                  <span class="lab-header__name lab-header__brand-title">${escapeHtml(appName)}</span>
                  ${badge ? `<span class="lab-header__badge">${escapeHtml(badge)}</span>` : ''}
                </span>
                ${subLabel ? `<span class="lab-header__sub lab-header__brand-subtitle">${escapeHtml(subLabel)}</span>` : ''}
              </div>
            </a>
            ${navHtml}
            <div class="lab-header__spacer" aria-hidden="true"></div>
            ${qmGroupHtml}
            ${renderSearch(this.config)}
            <div class="lab-header__spacer lab-header__spacer--end" aria-hidden="true"></div>
            <div class="lab-header__actions">
              ${renderJoinQuizButton(this.config)}
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

    setupJoinQuiz() {
      const button = this.headerEl?.querySelector('[data-qmf-header-join]');
      if (!button) return;
      this.boundJoinClick = async () => {
        if (button.disabled) return;
        button.disabled = true;
        button.classList.add('is-loading');
        try {
          const api = await loadJoinOverlay(this.config.joinOverlayBase);
          api.open({ source: 'global-header' });
        } catch (error) {
          console.error('[QMF Header] Join Overlay failed to load', error);
          window.dispatchEvent(new CustomEvent('qmf:join-error', {
            detail: { message: error?.message || 'Unable to open Join Quiz', source: 'global-header' },
          }));
        } finally {
          button.disabled = false;
          button.classList.remove('is-loading');
        }
      };
      button.addEventListener('click', this.boundJoinClick);
    }

    setupSearch() {
      const form = this.headerEl?.querySelector('[data-qmf-search]');
      const input = form?.querySelector('.lab-header__search-input');
      const toggle = this.headerEl?.querySelector('[data-qmf-search-toggle]');
      const dismiss = form?.querySelector('[data-qmf-search-dismiss]');
      if (!form || !input) return;

      const setSearchOpen = (open) => {
        this.headerEl?.classList.toggle('lab-header--search-open', open);
        toggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
          requestAnimationFrame(() => {
            input.focus();
            input.select?.();
          });
        } else {
          input.blur();
        }
      };

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

      toggle?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const open = !this.headerEl?.classList.contains('lab-header--search-open');
        setSearchOpen(open);
      });

      dismiss?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setSearchOpen(false);
        input.value = '';
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        runSearch(input.value);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (this.headerEl?.classList.contains('lab-header--search-open')) {
            setSearchOpen(false);
          }
          input.blur();
          input.value = '';
        }
      });

      document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          if (window.matchMedia('(max-width: 899px)').matches) {
            setSearchOpen(true);
          } else {
            input.focus();
          }
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

      // Portal to <body> so position:fixed is viewport-relative (header
      // backdrop-filter / transforms must not become the containing block).
      if (backdrop && backdrop.parentElement !== document.body) {
        document.body.appendChild(backdrop);
      }
      if (drawer && drawer.parentElement !== document.body) {
        document.body.appendChild(drawer);
      }

      const openDrawer = () => {
        this.drawerOpen = true;
        drawer?.setAttribute('aria-hidden', 'false');
        menuBtn?.setAttribute('aria-expanded', 'true');
        backdrop?.removeAttribute('hidden');
        this.headerEl?.classList.add('lab-header--drawer-open');
        document.body.classList.add('lab-header-drawer-open');
        try { if (drawer) drawer.scrollTop = 0; } catch (e) { /* ignore */ }
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
      const joinButton = this.headerEl?.querySelector('[data-qmf-header-join]');
      if (joinButton && this.boundJoinClick) {
        joinButton.removeEventListener('click', this.boundJoinClick);
      }
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
