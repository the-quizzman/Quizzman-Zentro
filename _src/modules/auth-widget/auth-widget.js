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

  const VERSION = '1.0.0';
  const CDN_BASE = 'https://ui.quizzman.com/qmf/dist/modules/auth-widget';

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
    container: '.qmf-header__right, .qmf-header__actions, .lab-header__actions, .header-actions',
    loginUrl: 'https://id.quizzman.com/login',
    accountUrl: 'https://id.quizzman.com/account',
    logoutUrl: 'https://id.quizzman.com/logout',
    apiEndpoint: '/api/auth/me',
    lang: 'vi',
    showTierBadge: true,
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
        
        /* Avatar */
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
        }
        .qmf-auth-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }
        [data-theme="dark"] .qmf-auth-avatar {
          background: linear-gradient(135deg, #d4a843, #9b8ce0);
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
        
        /* Dropdown */
        .qmf-auth-drop {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          z-index: 9999;
          background: var(--c-surface, #fff);
          border: 1px solid var(--c-border, #e4dfd8);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          min-width: 180px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-6px);
          transition: opacity 0.2s, transform 0.2s, visibility 0.2s;
          pointer-events: none;
          overflow: hidden;
        }
        .qmf-auth-drop--open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
          pointer-events: auto;
        }
        [data-theme="dark"] .qmf-auth-drop {
          background: #1a1e35;
          border-color: #2a2e48;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        
        /* Dropdown User Info */
        .qmf-auth-user {
          padding: 14px 16px 10px;
          border-bottom: 1px solid var(--c-border, #e4dfd8);
        }
        [data-theme="dark"] .qmf-auth-user {
          border-color: #2a2e48;
        }
        .qmf-auth-user-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--c-text, #2c2a28);
        }
        [data-theme="dark"] .qmf-auth-user-name {
          color: #e5e7eb;
        }
        .qmf-auth-user-email {
          font-size: 0.75rem;
          color: var(--c-text-muted, #888);
          margin-top: 4px;
          max-width: 180px;
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
          padding: 12px 16px;
          font-size: 0.88rem;
          color: var(--c-text, #444);
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
          text-align: left;
          transition: background 0.15s, color 0.15s;
        }
        [data-theme="dark"] .qmf-auth-drop a,
        [data-theme="dark"] .qmf-auth-drop button {
          color: #ccc;
        }
        .qmf-auth-drop a:hover,
        .qmf-auth-drop button:hover {
          background: rgba(139, 105, 20, 0.08);
          color: var(--c-primary, #8b6914);
        }
        [data-theme="dark"] .qmf-auth-drop a:hover,
        [data-theme="dark"] .qmf-auth-drop button:hover {
          background: rgba(212, 168, 67, 0.1);
          color: #d4a843;
        }
        
        .qmf-auth-drop-divider {
          height: 1px;
          background: var(--c-border, #e4dfd8);
          margin: 4px 0;
        }
        [data-theme="dark"] .qmf-auth-drop-divider {
          background: #2a2e48;
        }
        
        /* Mobile Adjustments */
        @media (max-width: 768px) {
          .qmf-auth-user-name {
            display: none;
          }
          .qmf-auth-drop {
            right: 0;
            left: auto;
            min-width: 160px;
          }
        }
      `;
      document.head.appendChild(style);
    }

    getLang() {
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

    getInitials(name, email) {
      if (name && name.trim()) {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return parts[0].slice(0, 2).toUpperCase();
      }
      if (email) return email.slice(0, 2).toUpperCase();
      return '?';
    }

    getLoginUrl() {
      return this.config.loginUrl + '?redirect_uri=' + encodeURIComponent(window.location.href);
    }

    getAccountUrl() {
      return this.config.accountUrl;
    }

    getLogoutUrl() {
      return this.config.logoutUrl + '?redirect_uri=' + encodeURIComponent(window.location.href);
    }

    checkAuth() {
      // Quick token check - cookies, QuizzmanAuth provider, or localStorage
      const token = this.getCookie('jwt_token') || this.getCookie('authToken')
        || window.QuizzmanAuth?.getToken?.()
        || localStorage.getItem('jwt_token') || localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        this.renderLoginBtn();
        return;
      }

      // Try to get user from localStorage first (for systems without /api/auth/me)
      const cachedUser = this.getUserFromStorage();
      if (cachedUser) {
        this.user = cachedUser;
        this.renderUserChip();
        if (typeof this.config.onUserLoad === 'function') {
          this.config.onUserLoad(cachedUser);
        }
        // Still verify with backend in background
        this.verifyWithBackend();
        return;
      }

      // Verify with backend
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

    verifyWithBackend() {
      fetch(this.config.apiEndpoint, { credentials: 'include' })
        .then(res => {
          if (res.status === 404) {
            // Endpoint not found - use cached user or basic token info
            return { success: true, user: this.user || this.createBasicUser() };
          }
          return res.json();
        })
        .then(data => {
          if (data.success && data.user) {
            this.user = data.user;
            // Cache user data
            localStorage.setItem('user', JSON.stringify(data.user));
            this.renderUserChip();
            if (typeof this.config.onUserLoad === 'function') {
              this.config.onUserLoad(data.user);
            }
          } else {
            this.renderLoginBtn();
          }
        })
        .catch(() => {
          // Network error - if we have cached user, show it
          if (this.user && !this.rendered) {
            this.renderUserChip();
          } else if (!this.user) {
            this.renderLoginBtn();
          }
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
      let avatarSrc = user.avatar_url || user.avatar || '';
      
      // Fix relative avatar paths
      if (avatarSrc && avatarSrc.charAt(0) === '/') {
        avatarSrc = 'https://id.quizzman.com' + avatarSrc;
      }

      // Get tier from qmTier if available
      const tier = window.qmTier?.tier || user.tier || 'free';

      // Wrap
      const wrap = document.createElement('div');
      wrap.className = 'qmf-auth-wrap';

      // Chip button
      const chip = document.createElement('button');
      chip.className = 'qmf-auth-chip';
      chip.type = 'button';
      chip.setAttribute('aria-haspopup', 'true');
      chip.setAttribute('aria-expanded', 'false');

      const avatarHtml = avatarSrc
        ? `<div class="qmf-auth-avatar"><img src="${avatarSrc}" alt="" loading="lazy" onerror="this.parentNode.innerHTML='${initials}';this.onerror=null;"></div>`
        : `<div class="qmf-auth-avatar">${initials}</div>`;

      // Tier badge
      let tierHtml = '';
      if (this.config.showTierBadge && tier && tier !== 'free') {
        tierHtml = `<span class="qmf-auth-tier qmf-auth-tier--${tier}">${tier.toUpperCase()}</span>`;
      }

      chip.innerHTML = avatarHtml + tierHtml + '<i class="fas fa-chevron-down" style="font-size:0.65rem;opacity:0.6;margin-left:2px;"></i>';

      // Dropdown
      const drop = document.createElement('div');
      drop.className = 'qmf-auth-drop';
      drop.setAttribute('role', 'menu');

      drop.innerHTML = `
        <div class="qmf-auth-user">
          <div class="qmf-auth-user-name">${this._esc(displayName || email.split('@')[0] || lbl.account)}</div>
          ${email ? `<div class="qmf-auth-user-email">${this._esc(email)}</div>` : ''}
        </div>
        <a href="${this.getAccountUrl()}" role="menuitem"><i class="fas fa-user"></i> ${lbl.account}</a>
        <div class="qmf-auth-drop-divider"></div>
        <button class="qmf-auth-logout-btn" role="menuitem"><i class="fas fa-sign-out-alt"></i> ${lbl.logout}</button>
      `;

      wrap.appendChild(chip);
      wrap.appendChild(drop);
      this.container.insertBefore(wrap, this.container.firstChild);

      this.elements = { ...this.elements, wrap, chip, drop };
      this.rendered = true;

      // Toggle dropdown
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = drop.classList.toggle('qmf-auth-drop--open');
        chip.setAttribute('aria-expanded', String(isOpen));
      });

      // Close on outside click
      document.addEventListener('click', () => {
        drop.classList.remove('qmf-auth-drop--open');
        chip.setAttribute('aria-expanded', 'false');
      });

      // Logout
      drop.querySelector('.qmf-auth-logout-btn').addEventListener('click', () => {
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
