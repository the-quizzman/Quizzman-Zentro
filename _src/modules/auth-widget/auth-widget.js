/**
 * QMF Auth Widget Component
 * User authentication dropdown with avatar, tier badge, and menu
 * @version 1.0.0
 * 
 * Usage:
 * <script src="https://ui.quizzman.com/qmf/dist/modules/auth-widget/auth-widget.js"></script>
 * <script>
 *   createAuthWidget('.header-actions', {
     loginUrl: 'https://id.quizzman.com/login',
     accountUrl: 'https://id.quizzman.com/account'
   });
 * </script>
 */

(function() {
  'use strict';

  const VERSION = '1.3.0';
  const FONT_STACK = "var(--qmf-font-sans, 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif)";
  const CDN_BASE = 'https://ui.quizzman.com/qmf/dist/modules/auth-widget';
  const ID_SYS = 'https://id.quizzman.com';

  // i18n Labels
  const LABELS = {
    vi:  { login: 'Đăng nhập', account: 'Tài khoản', logout: 'Đăng xuất' },
    en:  { login: 'Sign in',   account: 'Account',   logout: 'Sign out' },
    zh:  { login: '登录',       account: '账户',      logout: '退出' },
    zht: { login: '登入',       account: '帳戶',      logout: '登出' },
    kr:  { login: '로그인',     account: '계정',      logout: '로그아웃' },
    jp:  { login: 'ログイン',   account: 'アカウント', logout: 'ログアウト' },
  };

  // Default configuration
  const DEFAULT_CONFIG = {
    container: '.qmf-header__right, .qmf-header__actions, .qmf-header__cluster--right, .lab-header__actions, .header-actions',
    loginUrl: 'https://id.quizzman.com/login',
    accountUrl: 'https://id.quizzman.com/account',
    logoutUrl: 'https://id.quizzman.com/logout',
    apiEndpoint: '/api/auth/me',
    lang: 'vi',
    showTierBadge: true,
    showLumenBadge: true,
    showTitle: true,
    showProgressRing: true,
    avatarSize: 28,
    onLogin: null,
    onLogout: null,
    onUserLoad: null
  };

  class AuthWidget {
    constructor(config = {}) {
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.user = null;
      this.elements = {};
      
      this.init();
    }

    init() {
      // Guard: prevent duplicate initialization - check EARLY
      if (window.qmfAuthInitialized || document.querySelector('.qmf-auth-wrap')) {
        console.log('[QMF Auth] Already exists, skipping duplicate');
        return;
      }
      
      this.injectStyles();
      
      const container = typeof this.config.container === 'string'
        ? document.querySelector(this.config.container)
        : this.config.container;
        
      if (!container) {
        console.warn('[QMF Auth] Container not found:', this.config.container);
        return;
      }
      
      // Mark as initialized
      window.qmfAuthInitialized = true;
      
      this.container = container;
      this.checkAuth();
    }

    injectStyles() {
      if (document.getElementById('qmf-auth-widget-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'qmf-auth-widget-styles';
      style.textContent = `
        /* QMF Auth Widget - Base */
        .qmf-auth-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        
        /* Login Button */
        .qmf-auth-login {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          padding: 0;
          border-radius: 10px;
          border: 1px solid rgba(139, 105, 20, 0.35);
          background: rgba(139, 105, 20, 0.08);
          color: var(--c-primary, #8b6914);
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
          transition: all 0.25s;
          font-family: inherit;
        }
        .qmf-auth-login:hover {
          background: rgba(139, 105, 20, 0.16);
          border-color: var(--c-primary, #8b6914);
          color: #7a5c10;
        }
        [data-theme="dark"] .qmf-auth-login {
          border-color: rgba(212, 168, 67, 0.35);
          background: rgba(212, 168, 67, 0.1);
          color: #d4a843;
        }
        [data-theme="dark"] .qmf-auth-login:hover {
          background: rgba(212, 168, 67, 0.18);
          border-color: #d4a843;
        }
        
        /* User Chip */
        .qmf-auth-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 0 8px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid var(--c-border, rgba(0,0,0,0.12));
          background: var(--c-surface, rgba(255,255,255,0.7));
          color: var(--c-text-secondary, #555);
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 500;
          transition: all 0.25s;
          font-family: inherit;
          white-space: nowrap;
        }
        [data-theme="dark"] .qmf-auth-chip {
          border-color: rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: #aaa;
        }
        .qmf-auth-chip:hover {
          background: rgba(139, 105, 20, 0.1);
          color: var(--c-primary, #8b6914);
          border-color: var(--c-primary, #8b6914);
        }
        [data-theme="dark"] .qmf-auth-chip:hover {
          background: rgba(212, 168, 67, 0.12);
          color: #d4a843;
          border-color: #d4a843;
        }
        
        /* Avatar + frame + progress ring */
        .qmf-auth-avatar-wrap {
          position: relative;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qmf-auth-progress {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          pointer-events: none;
        }
        .qmf-auth-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--c-primary, #8b6914), var(--c-accent, #5c4a9e));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 0.72rem;
          font-weight: 700;
          flex-shrink: 0;
          text-transform: uppercase;
          overflow: hidden;
          position: relative;
          z-index: 1;
        }
        .qmf-auth-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }
        .qmf-auth-avatar-wrap[data-frame] .qmf-auth-avatar {
          box-shadow: 0 0 0 2px var(--qmf-auth-frame, #c9a227);
        }
        .qmf-auth-avatar-wrap[data-frame="frame.bronze-halo"] { --qmf-auth-frame: #b87333; }
        .qmf-auth-avatar-wrap[data-frame="frame.silver-halo"] { --qmf-auth-frame: #c0c0c0; }
        .qmf-auth-avatar-wrap[data-frame="frame.gold-halo"] { --qmf-auth-frame: #d4a843; }
        .qmf-auth-avatar-wrap[data-frame="frame.aurora"] { --qmf-auth-frame: #7dd3c0; }
        .qmf-auth-avatar-wrap[data-frame="frame.scholar-ring"] { --qmf-auth-frame: #8b6914; }
        .qmf-auth-avatar-wrap[data-frame="frame.celestial"] { --qmf-auth-frame: #7c9cff; }
        [data-theme="dark"] .qmf-auth-avatar {
          background: linear-gradient(135deg, #d4a843, #9b8ce0);
        }
        .qmf-auth-lumen {
          margin-left: 2px;
          font-size: 0.68rem;
          font-weight: 650;
          letter-spacing: 0.01em;
          color: var(--c-primary, #8b6914);
          font-variant-numeric: tabular-nums;
        }
        [data-theme="dark"] .qmf-auth-lumen {
          color: #d4a843;
        }
        
        /* Tier Badge */
        .qmf-auth-tier {
          margin-left: 4px;
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--c-primary, #8b6914);
          color: #fff;
        }
        .qmf-auth-tier--pro {
          background: linear-gradient(135deg, #8b6914, #d4a843);
        }
        .qmf-auth-tier--premium {
          background: linear-gradient(135deg, #5c4a9e, #8b5cf6);
        }
        .qmf-auth-tier--enterprise {
          background: linear-gradient(135deg, #059669, #10b981);
        }
        
        /* Dropdown — portaled to body with fixed coords (see openDrop) */
        .qmf-auth-drop {
          --qmf-auth-drop-bg: rgba(255, 255, 255, 0.98);
          --qmf-auth-drop-border: rgba(15, 23, 42, 0.12);
          --qmf-auth-drop-text: #0f172a;
          --qmf-auth-drop-muted: #64748b;
          --qmf-auth-drop-icon: #64748b;
          --qmf-auth-drop-divider: rgba(15, 23, 42, 0.09);
          --qmf-auth-drop-hover-bg: rgba(79, 70, 229, 0.08);
          --qmf-auth-drop-hover-text: #4f46e5;
          --qmf-auth-drop-accent: #8b6914;
          position: fixed;
          z-index: 10000;
          color-scheme: light;
          background: var(--qmf-auth-drop-bg);
          border: 1px solid var(--qmf-auth-drop-border);
          border-radius: var(--qmf-radius-md, 10px);
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.16), 0 2px 8px rgba(15, 23, 42, 0.08);
          min-width: 200px;
          padding: 6px;
          font-family: ${FONT_STACK};
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-6px);
          transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s;
          pointer-events: none;
          overflow: hidden;
        }
        .qmf-auth-drop--open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
          pointer-events: auto;
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-drop {
          --qmf-auth-drop-bg: rgba(15, 23, 42, 0.98);
          --qmf-auth-drop-border: rgba(255, 255, 255, 0.10);
          --qmf-auth-drop-text: #f1f5f9;
          --qmf-auth-drop-muted: #94a3b8;
          --qmf-auth-drop-icon: #94a3b8;
          --qmf-auth-drop-divider: rgba(255, 255, 255, 0.08);
          --qmf-auth-drop-hover-bg: rgba(165, 180, 252, 0.11);
          --qmf-auth-drop-hover-text: #c7d2fe;
          --qmf-auth-drop-accent: #d4a843;
          color-scheme: dark;
          box-shadow: 0 20px 55px rgba(0, 0, 0, 0.52), 0 2px 10px rgba(0, 0, 0, 0.34);
          backdrop-filter: blur(20px) saturate(1.25);
          -webkit-backdrop-filter: blur(20px) saturate(1.25);
        }
        
        .qmf-auth-user-title {
          font-size: 0.72rem;
          color: var(--qmf-auth-drop-muted);
          margin-top: 2px;
        }
        .qmf-auth-user-lumen {
          font-size: 0.72rem;
          color: var(--qmf-auth-drop-accent);
          margin-top: 4px;
          font-weight: 600;
        }

        /* Dropdown User Info */
        .qmf-auth-user {
          padding: 10px 12px 8px;
          margin: 0 0 4px;
          border-bottom: 1px solid var(--qmf-auth-drop-divider);
          font-family: ${FONT_STACK};
        }
        .qmf-auth-user-name {
          font-family: ${FONT_STACK};
          font-size: 0.875rem;
          font-weight: 600;
          line-height: 1.3;
          color: var(--qmf-auth-drop-text);
        }
        .qmf-auth-user-email {
          font-family: ${FONT_STACK};
          font-size: 0.75rem;
          color: var(--qmf-auth-drop-muted);
          margin-top: 3px;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        /* Dropdown Items */
        .qmf-auth-drop a,
        .qmf-auth-drop button {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          font-family: ${FONT_STACK};
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--qmf-auth-drop-text);
          text-decoration: none;
          background: none;
          border: none;
          border-radius: var(--qmf-radius-sm, 8px);
          cursor: pointer;
          text-align: left;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .qmf-auth-drop a i,
        .qmf-auth-drop button i {
          width: 16px;
          text-align: center;
          font-size: 0.8rem;
          color: var(--qmf-auth-drop-icon);
        }
        .qmf-auth-drop a:hover,
        .qmf-auth-drop button:hover {
          background: var(--qmf-auth-drop-hover-bg);
          color: var(--qmf-auth-drop-hover-text);
        }
        .qmf-auth-drop a:hover i,
        .qmf-auth-drop button:hover i {
          color: var(--qmf-auth-drop-hover-text);
        }
        .qmf-auth-drop a:focus-visible,
        .qmf-auth-drop button:focus-visible {
          outline: 2px solid color-mix(in srgb, var(--qmf-auth-drop-hover-text) 70%, transparent);
          outline-offset: -2px;
          background: var(--qmf-auth-drop-hover-bg);
        }
        .qmf-auth-drop .qmf-auth-logout-btn:hover {
          background: rgba(239, 68, 68, 0.11);
          color: #ef4444;
        }
        .qmf-auth-drop .qmf-auth-logout-btn:hover i {
          color: #ef4444;
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-drop .qmf-auth-logout-btn:hover {
          background: rgba(248, 113, 113, 0.12);
          color: #fca5a5;
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-drop .qmf-auth-logout-btn:hover i {
          color: #fca5a5;
        }
        
        .qmf-auth-drop-divider {
          height: 1px;
          background: var(--qmf-auth-drop-divider);
          margin: 4px 6px;
        }
        
        .qmf-auth-wrap--open .qmf-auth-chip {
          border-color: var(--qmf-brand-primary, var(--c-primary, #8b6914));
        }
        
        /* Mobile Adjustments */
        @media (max-width: 768px) {
          .qmf-auth-drop {
            min-width: 180px;
          }
        }
      `;
      document.head.appendChild(style);
    }

    getLang() {
      if (this.config.lang && LABELS[this.config.lang]) return this.config.lang;
      const saved = localStorage.getItem('lab-ui-lang') || localStorage.getItem('qmf-lang');
      if (saved && LABELS[saved]) return saved;
      if (window.labI18n?.lang && LABELS[window.labI18n.lang]) return window.labI18n.lang;
      
      const nav = (navigator.language || 'vi').toLowerCase();
      if (nav.startsWith('zh-t') || nav === 'zht') return 'zht';
      if (nav.startsWith('zh')) return 'zh';
      if (nav.startsWith('ko')) return 'kr';
      if (nav.startsWith('ja')) return 'jp';
      if (nav.startsWith('en')) return 'en';
      return 'vi';
    }

    getToken() {
      if (window.QuizzmanAuth?.getToken) {
        const t = window.QuizzmanAuth.getToken();
        if (t) return t;
      }
      if (window.QuizzmanSSO?.getToken) {
        const t = window.QuizzmanSSO.getToken();
        if (t) return t;
      }
      return this.getCookie('jwt_token') || this.getCookie('authToken')
        || localStorage.getItem('jwt_token') || localStorage.getItem('authToken') || localStorage.getItem('token');
    }

    getLoginUrl() {
      const returnPath = window.location.pathname + window.location.search;
      const redirect = returnPath && returnPath !== '/' ? returnPath : '/account';
      try {
        const loginBase = new URL(this.config.loginUrl, window.location.origin);
        if (loginBase.origin === window.location.origin) {
          return loginBase.pathname + '?redirect=' + encodeURIComponent(redirect);
        }
      } catch (e) { /* fall through */ }
      return this.config.loginUrl + '?redirect=' + encodeURIComponent(window.location.href);
    }

    getLogoutUrl() {
      try {
        const logoutBase = new URL(this.config.logoutUrl, window.location.origin);
        if (logoutBase.origin === window.location.origin) {
          const returnPath = window.location.pathname + window.location.search || '/account';
          return logoutBase.pathname + '?redirect=' + encodeURIComponent(returnPath);
        }
      } catch (e) { /* fall through */ }
      return this.config.logoutUrl + '?redirect=' + encodeURIComponent(window.location.href);
    }
    getAccountUrl() {
      return this.config.accountUrl;
    }

    getInitials(name, email) {
      if (name && name.trim()) {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return parts[0].slice(0, 2).toUpperCase();
      }
      if (email) return email.slice(0, 2).toUpperCase();
      return '?';
    }

    resolveAvatarUrl(user) {
      if (!user) return '';
      let src = user.avatar_url || user.avatar || user.photo || '';
      try {
        if (!src) src = localStorage.getItem('user_avatar') || '';
      } catch (e) { /* ignore */ }
      if (src && src.charAt(0) === '/') {
        src = 'https://id.quizzman.com' + src;
      }
      return src;
    }

    buildAvatarEl(avatarSrc, initials, lumen) {
      const wrap = document.createElement('div');
      wrap.className = 'qmf-auth-avatar-wrap';
      if (lumen?.frame) wrap.setAttribute('data-frame', lumen.frame);

      if (this.config.showProgressRing && lumen && typeof lumen.progress === 'number') {
        const progress = Math.max(0, Math.min(1, Number(lumen.progress) || 0));
        const size = 32;
        const stroke = 2;
        const r = (size - stroke) / 2;
        const c = 2 * Math.PI * r;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'qmf-auth-progress');
        svg.setAttribute('width', String(size));
        svg.setAttribute('height', String(size));
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
        svg.innerHTML =
          `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(139,105,20,0.18)" stroke-width="${stroke}"/>` +
          `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--c-primary,#8b6914)" stroke-width="${stroke}" ` +
          `stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - progress)}" ` +
          `transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
        wrap.appendChild(svg);
      }

      const avatarEl = document.createElement('div');
      avatarEl.className = 'qmf-auth-avatar';
      if (avatarSrc) {
        const img = document.createElement('img');
        img.src = avatarSrc;
        img.alt = '';
        img.loading = 'lazy';
        img.onerror = () => {
          img.remove();
          avatarEl.textContent = initials;
        };
        avatarEl.appendChild(img);
      } else {
        avatarEl.textContent = initials;
      }
      wrap.appendChild(avatarEl);
      return wrap;
    }

    formatLumen(n) {
      const v = Math.trunc(Number(n) || 0);
      try {
        return v.toLocaleString('en-US');
      } catch (_) {
        return String(v);
      }
    }

    refreshAccessToken() {
      if (window.QuizzmanSSO?.refreshAccessToken) {
        return window.QuizzmanSSO.refreshAccessToken();
      }
      if (window.QuizzmanAuth?.refreshAccessToken) {
        return window.QuizzmanAuth.refreshAccessToken();
      }
      return fetch(ID_SYS + '/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data?.success && data.token) {
            document.cookie = `jwt_token=${encodeURIComponent(data.token)}; path=/; domain=.quizzman.com; max-age=${90 * 24 * 60 * 60}; SameSite=Lax; Secure`;
            try { localStorage.setItem('jwt_token', data.token); } catch (e) { /* ignore */ }
            return data.token;
          }
          return null;
        })
        .catch(() => null);
    }

    checkAuth() {
      if (window.QuizzmanAuth?.handleTokenFromUrl) {
        window.QuizzmanAuth.handleTokenFromUrl();
      }

      if (window.QuizzmanAuth?.getAuth) {
        window.QuizzmanAuth.getAuth().then(auth => {
          if (auth.authenticated && auth.user) {
            this.user = auth.user;
            try { localStorage.setItem('user', JSON.stringify(auth.user)); } catch (e) { /* ignore */ }
            this.renderUserChip();
            if (typeof this.config.onUserLoad === 'function') {
              const token = auth.token || auth.accessToken || this.getToken() || null;
              this.config.onUserLoad(auth.user, { token });
            }
          } else {
            this.checkAuthFallback();
          }
        }).catch(() => this.checkAuthFallback());
        return;
      }
      this.checkAuthFallback();
    }

    checkAuthFallback() {
      const token = this.getToken();

      if (!token) {
        const hasSession = window.QuizzmanSSO?.hasSessionHint?.() ||
          /(?:^|; )session_id=/.test(document.cookie) ||
          /(?:^|; )jwt_token=/.test(document.cookie);
        if (!hasSession) {
          this.renderLoginBtn();
          return;
        }
        this.refreshAccessToken().then(newToken => {
          if (newToken) this.verifyWithBackend();
          else this.renderLoginBtn();
        });
        return;
      }

      this.verifyWithBackend();
    }

    getUserFromStorage() {
      try {
        const userData = localStorage.getItem('user') || localStorage.getItem('currentUser');
        if (userData) {
          return JSON.parse(userData);
        }
      } catch (e) {}
      return null;
    }

    verifyWithBackend(retryAfterRefresh) {
      const token = this.getToken();
      const fetcher = window.QuizzmanSSO?.fetchWithRefresh || fetch;
      const headers = {};
      if (token) headers.Authorization = 'Bearer ' + token;
      const opts = { credentials: 'include', headers };

      fetcher(this.config.apiEndpoint, opts)
        .then(res => {
          if (res.status === 401 && !retryAfterRefresh) {
            return this.refreshAccessToken().then(token => {
              if (token) return this.verifyWithBackend(true);
              return { success: false };
            });
          }
          if (res.status === 404) {
            return { success: true, user: this.user || this.createBasicUser() };
          }
          return res.json();
        })
        .then(data => {
          if (data && data.success && data.user) {
            this.user = data.user;
            try { localStorage.setItem('user', JSON.stringify(data.user)); } catch (e) { /* ignore */ }
            this.renderUserChip();
            if (typeof this.config.onUserLoad === 'function') {
              const token = data.token || data.accessToken || this.getToken() || null;
              this.config.onUserLoad(data.user, { token });
            }
          } else {
            try { localStorage.removeItem('user'); } catch (e) { /* ignore */ }
            this.renderLoginBtn();
          }
        })
        .catch(() => {
          if (!this.user) this.renderLoginBtn();
        });
    }

    createBasicUser() {
      // Create basic user object from available data
      return {
        id: 'unknown',
        email: '',
        display_name: 'User',
        tier: 'free'
      };
    }

    /** Keep Legatus slot last in actions (after login / chip). */
    pinNotificationSlot() {
      const slot = this.container.querySelector('[data-qmf-notification-slot]');
      if (slot && slot.parentElement === this.container) {
        this.container.appendChild(slot);
      }
      return slot;
    }

    setLegatusAuthVisible(on) {
      try {
        if (on) document.body.classList.add('authenticated');
        else document.body.classList.remove('authenticated');
      } catch (e) { /* ignore */ }
      const slot = this.pinNotificationSlot();
      if (!slot) return;
      if (on) slot.setAttribute('data-legatus-auth', '1');
      else {
        slot.removeAttribute('data-legatus-auth');
        slot.querySelectorAll('legatus-bell').forEach((b) => b.remove());
      }
    }

    renderLoginBtn() {
      // Remove any existing auth elements first
      this.container.querySelectorAll('.qmf-auth-wrap, .qmf-auth-login').forEach(el => el.remove());
      this.rendered = false;

      const lang = this.getLang();
      const lbl = LABELS[lang] || LABELS.vi;

      const a = document.createElement('a');
      a.className = 'qmf-auth-login';
      a.href = this.getLoginUrl();
      a.title = lbl.login;
      a.innerHTML = '<i class="fas fa-sign-in-alt"></i>';
      
      this.container.insertBefore(a, this.container.firstChild);
      this.elements.loginBtn = a;
      this.setLegatusAuthVisible(false);
      
      if (typeof this.config.onLogin === 'function') {
        a.addEventListener('click', (e) => {
          this.config.onLogin(e);
        });
      }
    }

    renderUserChip() {
      const lang = this.getLang();
      const lbl = LABELS[lang] || LABELS.vi;
      
      // Remove any existing auth elements (chip or login button)
      this.container.querySelectorAll('.qmf-auth-wrap, .qmf-auth-login').forEach(el => el.remove());
      
      const user = this.user;
      const displayName = user.display_name || user.username || user.name || '';
      const email = user.email || '';
      const initials = this.getInitials(displayName, email);
      const avatarSrc = this.resolveAvatarUrl(user);

      // Get tier from qmTier if available
      const tier = window.qmTier?.tier || user.tier || 'free';
      const lumen = user.lumen || null;
      const title = (this.config.showTitle && lumen?.title) ? lumen.title : '';

      // Wrap
      const wrap = document.createElement('div');
      wrap.className = 'qmf-auth-wrap';

      // Chip button
      const chip = document.createElement('button');
      chip.className = 'qmf-auth-chip';
      chip.type = 'button';
      chip.setAttribute('aria-haspopup', 'true');
      chip.setAttribute('aria-expanded', 'false');

      chip.appendChild(this.buildAvatarEl(avatarSrc, initials, lumen));

      if (this.config.showLumenBadge && lumen && lumen.balance != null) {
        const lumenEl = document.createElement('span');
        lumenEl.className = 'qmf-auth-lumen';
        lumenEl.title = title ? `${title} · Lv${lumen.level || 1}` : `Lv${lumen.level || 1}`;
        lumenEl.textContent = this.formatLumen(lumen.balance);
        chip.appendChild(lumenEl);
      }

      // Tier badge
      if (this.config.showTierBadge && tier && tier !== 'free') {
        const tierEl = document.createElement('span');
        tierEl.className = 'qmf-auth-tier qmf-auth-tier--' + tier;
        tierEl.textContent = tier.toUpperCase();
        chip.appendChild(tierEl);
      }

      const chevron = document.createElement('i');
      chevron.className = 'fas fa-chevron-down';
      chevron.style.cssText = 'font-size:0.65rem;opacity:0.6;margin-left:2px;';
      chip.appendChild(chevron);

      // Dropdown
      const drop = document.createElement('div');
      drop.className = 'qmf-auth-drop';
      drop.setAttribute('role', 'menu');

      const lumenLine = (lumen && lumen.balance != null)
        ? `<div class="qmf-auth-user-lumen">${this.formatLumen(lumen.balance)} Lumen · Lv${lumen.level || 1}</div>`
        : '';
      const titleLine = title
        ? `<div class="qmf-auth-user-title">${this._esc(title)}</div>`
        : '';

      drop.innerHTML = `
        <div class="qmf-auth-user">
          <div class="qmf-auth-user-name">${this._esc(displayName || email.split('@')[0] || lbl.account)}</div>
          ${titleLine}
          ${email ? `<div class="qmf-auth-user-email">${this._esc(email)}</div>` : ''}
          ${lumenLine}
        </div>
        <a href="${this.getAccountUrl()}" role="menuitem"><i class="fas fa-user"></i> ${lbl.account}</a>
        <div class="qmf-auth-drop-divider"></div>
        <button class="qmf-auth-logout-btn" role="menuitem"><i class="fas fa-sign-out-alt"></i> ${lbl.logout}</button>
      `;

      wrap.appendChild(chip);
      wrap.appendChild(drop);
      this.container.insertBefore(wrap, this.container.firstChild);
      this.setLegatusAuthVisible(true);

      this.elements = { ...this.elements, wrap, chip, drop };
      this.rendered = true;

      let outsideClickHandler = null;
      let onReposition = null;

      const clearDropPosition = () => {
        drop.style.top = '';
        drop.style.right = '';
        drop.style.left = '';
        drop.style.bottom = '';
      };

      const positionDrop = () => {
        const rect = chip.getBoundingClientRect();
        const gap = 6;
        const viewportPad = 8;
        const dropWidth = drop.offsetWidth || 200;
        let left = rect.right - dropWidth;
        left = Math.max(viewportPad, Math.min(left, window.innerWidth - dropWidth - viewportPad));

        Object.assign(drop.style, {
          position: 'fixed',
          top: `${rect.bottom + gap}px`,
          left: `${left}px`,
          right: 'auto',
          bottom: 'auto',
        });
      };

      const removeGlobalListeners = () => {
        if (outsideClickHandler) {
          document.removeEventListener('click', outsideClickHandler);
          outsideClickHandler = null;
        }
        if (onReposition) {
          window.removeEventListener('resize', onReposition);
          window.removeEventListener('scroll', onReposition, true);
          onReposition = null;
        }
      };

      const closeDrop = () => {
        drop.classList.remove('qmf-auth-drop--open');
        chip.setAttribute('aria-expanded', 'false');
        wrap.classList.remove('qmf-auth-wrap--open');
        removeGlobalListeners();
        clearDropPosition();
        if (drop.parentElement !== wrap) {
          wrap.appendChild(drop);
        }
      };

      const openDrop = () => {
        if (drop.parentElement !== document.body) {
          document.body.appendChild(drop);
        }
        drop.classList.add('qmf-auth-drop--open');
        chip.setAttribute('aria-expanded', 'true');
        wrap.classList.add('qmf-auth-wrap--open');
        positionDrop();

        onReposition = () => {
          if (drop.classList.contains('qmf-auth-drop--open')) positionDrop();
        };
        window.addEventListener('resize', onReposition);
        window.addEventListener('scroll', onReposition, true);

        outsideClickHandler = (e) => {
          if (!drop.classList.contains('qmf-auth-drop--open')) return;
          if (chip.contains(e.target) || drop.contains(e.target)) return;
          closeDrop();
        };
        requestAnimationFrame(() => {
          if (!drop.classList.contains('qmf-auth-drop--open')) return;
          document.addEventListener('click', outsideClickHandler);
        });
      };

      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        if (drop.classList.contains('qmf-auth-drop--open')) closeDrop();
        else openDrop();
      });

      drop.addEventListener('click', (e) => e.stopPropagation());

      // Logout
      drop.querySelector('.qmf-auth-logout-btn').addEventListener('click', () => {
        closeDrop();
        this.logout();
      });
    }

    logout() {
      // Clear cookies
      document.cookie = 'jwt_token=; path=/; domain=.quizzman.com; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'authToken=; path=/; domain=.quizzman.com; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'jwt_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      // Clear localStorage
      ['authToken', 'jwt_token', 'token', 'user', 'currentUser'].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      if (typeof this.config.onLogout === 'function') {
        this.config.onLogout();
      }

      this.setLegatusAuthVisible(false);
      window.location.href = this.getLogoutUrl();
    }

    getCookie(name) {
      const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : null;
    }

    _esc(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // Public API
    getUser() {
      return this.user;
    }

    isAuthenticated() {
      return !!this.user;
    }

    refresh() {
      this.container.innerHTML = '';
      this.checkAuth();
    }

    destroy() {
      if (this.container) {
        this.container.innerHTML = '';
      }
    }
  }

  // Export
  window.AuthWidget = AuthWidget;
  window.QMFAuth = AuthWidget;
  window.createAuthWidget = function(config) {
    return new AuthWidget(config);
  };

  // Also expose as QMF method
  if (window.QMF) {
    window.QMF.createAuthWidget = window.createAuthWidget;
  }

  console.log(`[QMF Auth Widget] Module loaded v${VERSION}`);
})();
