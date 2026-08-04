/**
 * QMF Auth Widget Component
 * User chip + macOS-style account menu + preferences sheet
 * @version 1.5.0
 *
 * Usage:
 * <script src="https://ui.quizzman.com/qmf/dist/modules/auth-widget/auth-widget.js"></script>
 * <script>
 *   createAuthWidget('.header-actions', {
 *     loginUrl: 'https://id.quizzman.com/login',
 *     accountUrl: 'https://id.quizzman.com/account'
 *   });
 * </script>
 */

(function() {
  'use strict';

  const VERSION = '1.5.5';
  /* System UI stack — SF Pro on Apple, Segoe on Windows; no Inter-first */
  const FONT_STACK = 'var(--qmf-font-system, -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", system-ui, "Segoe UI", sans-serif)';
  const ID_SYS = 'https://id.quizzman.com';
  const ACCOUNT_PREFS_URL = ID_SYS + '/api/account/update-profile';
  const APP_ROLES = new Set(['personal', 'teacher', 'school', 'student']);
  const THEMES = new Set(['light', 'dark']);

  function readAuthToken() {
    try {
      if (window.QuizzmanAuth?.getToken) {
        const t = window.QuizzmanAuth.getToken();
        if (t) return t;
      }
      if (window.QuizzmanSSO?.getToken) {
        const t = window.QuizzmanSSO.getToken();
        if (t) return t;
      }
    } catch (e) { /* ignore */ }
    const cookie = document.cookie || '';
    const m = cookie.match(/(?:^|; )(?:jwt_token|authToken)=([^;]*)/);
    if (m) {
      try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
    }
    try {
      return localStorage.getItem('jwt_token')
        || localStorage.getItem('authToken')
        || localStorage.getItem('token')
        || null;
    } catch (e) {
      return null;
    }
  }

  /** Persist UI prefs to account (source of truth when logged in). localStorage is cache only. */
  function persistAccountPrefs(partial) {
    if (!partial || typeof partial !== 'object') return Promise.resolve(null);
    const token = readAuthToken();
    const hasSession = !!(token || /(?:^|; )(?:jwt_token|authToken|session_id)=/.test(document.cookie || ''));
    if (!hasSession) return Promise.resolve(null);

    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;

    return fetch(ACCOUNT_PREFS_URL, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(partial),
    }).then((res) => {
      if (!res.ok) {
        console.warn('[QMF Auth] prefs save failed', res.status);
        return null;
      }
      return res.json().catch(() => ({ success: true }));
    }).catch((err) => {
      console.warn('[QMF Auth] prefs save error', err);
      return null;
    });
  }

  window.QmfAccountPrefs = {
    url: ACCOUNT_PREFS_URL,
    save: persistAccountPrefs,
  };

  const LABELS = {
    vi: {
      login: 'Đăng nhập',
      account: 'Tài khoản',
      settings: 'Thiết lập',
      logout: 'Đăng xuất',
      appearance: 'Giao diện',
      language: 'Ngôn ngữ',
      region: 'Khu vực',
      role: 'Vai trò',
      light: 'Sáng',
      dark: 'Tối',
      manageRole: 'Quản lý vai trò trên ID',
      done: 'Xong',
      prefsTitle: 'Thiết lập',
    },
    en: {
      login: 'Sign in',
      account: 'Account',
      settings: 'Settings',
      logout: 'Sign out',
      appearance: 'Appearance',
      language: 'Language',
      region: 'Region',
      role: 'Role',
      light: 'Light',
      dark: 'Dark',
      manageRole: 'Manage role on ID',
      done: 'Done',
      prefsTitle: 'Settings',
    },
    zh: {
      login: '登录',
      account: '账户',
      settings: '设置',
      logout: '退出',
      appearance: '外观',
      language: '语言',
      region: '地区',
      role: '角色',
      light: '浅色',
      dark: '深色',
      manageRole: '在 ID 管理角色',
      done: '完成',
      prefsTitle: '设置',
    },
    zht: {
      login: '登入',
      account: '帳戶',
      settings: '設定',
      logout: '登出',
      appearance: '外觀',
      language: '語言',
      region: '地區',
      role: '角色',
      light: '淺色',
      dark: '深色',
      manageRole: '在 ID 管理角色',
      done: '完成',
      prefsTitle: '設定',
    },
    kr: {
      login: '로그인',
      account: '계정',
      settings: '설정',
      logout: '로그아웃',
      appearance: '모양',
      language: '언어',
      region: '지역',
      role: '역할',
      light: '라이트',
      dark: '다크',
      manageRole: 'ID에서 역할 관리',
      done: '완료',
      prefsTitle: '설정',
    },
    jp: {
      login: 'ログイン',
      account: 'アカウント',
      settings: '設定',
      logout: 'ログアウト',
      appearance: '外観',
      language: '言語',
      region: '地域',
      role: '役割',
      light: 'ライト',
      dark: 'ダーク',
      manageRole: 'IDで役割を管理',
      done: '完了',
      prefsTitle: '設定',
    },
    fr: {
      login: 'Se connecter',
      account: 'Compte',
      settings: 'Paramètres',
      logout: 'Se déconnecter',
      appearance: 'Apparence',
      language: 'Langue',
      region: 'Région',
      role: 'Rôle',
      light: 'Clair',
      dark: 'Sombre',
      manageRole: 'Gérer le rôle sur ID',
      done: 'Terminé',
      prefsTitle: 'Paramètres',
    },
    de: {
      login: 'Anmelden',
      account: 'Konto',
      settings: 'Einstellungen',
      logout: 'Abmelden',
      appearance: 'Erscheinungsbild',
      language: 'Sprache',
      region: 'Region',
      role: 'Rolle',
      light: 'Hell',
      dark: 'Dunkel',
      manageRole: 'Rolle auf ID verwalten',
      done: 'Fertig',
      prefsTitle: 'Einstellungen',
    },
    es: {
      login: 'Iniciar sesión',
      account: 'Cuenta',
      settings: 'Ajustes',
      logout: 'Cerrar sesión',
      appearance: 'Apariencia',
      language: 'Idioma',
      region: 'Región',
      role: 'Rol',
      light: 'Claro',
      dark: 'Oscuro',
      manageRole: 'Gestionar rol en ID',
      done: 'Listo',
      prefsTitle: 'Ajustes',
    },
    th: {
      login: 'เข้าสู่ระบบ',
      account: 'บัญชี',
      settings: 'การตั้งค่า',
      logout: 'ออกจากระบบ',
      appearance: 'ธีม',
      language: 'ภาษา',
      region: 'ภูมิภาค',
      role: 'บทบาท',
      light: 'สว่าง',
      dark: 'มืด',
      manageRole: 'จัดการบทบาทที่ ID',
      done: 'เสร็จ',
      prefsTitle: 'การตั้งค่า',
    },
    pt: {
      login: 'Entrar',
      account: 'Conta',
      settings: 'Configurações',
      logout: 'Sair',
      appearance: 'Aparência',
      language: 'Idioma',
      region: 'Região',
      role: 'Função',
      light: 'Claro',
      dark: 'Escuro',
      manageRole: 'Gerenciar função no ID',
      done: 'Concluído',
      prefsTitle: 'Configurações',
    },
  };

  const LANG_OPTIONS = [
    { id: 'vi', label: 'Tiếng Việt', short: 'VI' },
    { id: 'en', label: 'English', short: 'EN' },
    { id: 'zh', label: '简体中文', short: '简' },
    { id: 'zht', label: '繁體中文', short: '繁' },
    { id: 'jp', label: '日本語', short: '日' },
    { id: 'kr', label: '한국어', short: '한' },
    { id: 'fr', label: 'Français', short: 'FR' },
    { id: 'de', label: 'Deutsch', short: 'DE' },
    { id: 'es', label: 'Español', short: 'ES' },
    { id: 'th', label: 'ไทย', short: 'TH' },
    { id: 'pt', label: 'Português', short: 'PT' },
  ];

  const REGION_OPTIONS = [
    { id: 'VN', label: 'Việt Nam' },
    { id: 'US', label: 'United States' },
    { id: 'TW', label: '台灣' },
    { id: 'CN', label: '中国大陆' },
    { id: 'JP', label: '日本' },
    { id: 'KR', label: '대한민국' },
    { id: 'SG', label: 'Singapore' },
    { id: 'AU', label: 'Australia' },
    { id: 'FR', label: 'France' },
  ];

  const ROLE_OPTIONS = [
    { id: 'personal', label: { vi: 'Cá nhân', en: 'Personal', zh: '个人', zht: '個人', kr: '개인', jp: '個人', fr: 'Personnel', de: 'Persönlich', es: 'Personal', th: 'ส่วนตัว', pt: 'Pessoal' } },
    { id: 'teacher', label: { vi: 'Giáo viên', en: 'Teacher', zh: '教师', zht: '教師', kr: '교사', jp: '教師', fr: 'Enseignant', de: 'Lehrer', es: 'Profesor', th: 'ครู', pt: 'Professor' } },
    { id: 'school', label: { vi: 'Nhà trường', en: 'School', zh: '学校', zht: '學校', kr: '학교', jp: '学校', fr: 'École', de: 'Schule', es: 'Escuela', th: 'โรงเรียน', pt: 'Escola' } },
    { id: 'student', label: { vi: 'Học sinh', en: 'Student', zh: '学生', zht: '學生', kr: '학생', jp: '生徒', fr: 'Élève', de: 'Schüler', es: 'Estudiante', th: 'นักเรียน', pt: 'Aluno' } },
  ];

  const ICONS = {
    account: '<svg class="qmf-auth-ico" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 1.75c-3.2 0-6 1.68-6 3.75V17h12v-1.5c0-2.07-2.8-3.75-6-3.75Z"/></svg>',
    settings: '<svg class="qmf-auth-ico" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10.7 2.1a1 1 0 0 0-1.4 0l-.7.7a1 1 0 0 1-1.1.22l-.95-.4a1 1 0 0 0-1.25.45l-.5.95a1 1 0 0 1-.85.55l-1.05.1a1 1 0 0 0-.9 1.05l.05 1.05a1 1 0 0 1-.35.85l-.75.7a1 1 0 0 0 0 1.4l.75.7a1 1 0 0 1 .35.85l-.05 1.05a1 1 0 0 0 .9 1.05l1.05.1a1 1 0 0 1 .85.55l.5.95a1 1 0 0 0 1.25.45l.95-.4a1 1 0 0 1 1.1.22l.7.7a1 1 0 0 0 1.4 0l.7-.7a1 1 0 0 1 1.1-.22l.95.4a1 1 0 0 0 1.25-.45l.5-.95a1 1 0 0 1 .85-.55l1.05-.1a1 1 0 0 0 .9-1.05l-.05-1.05a1 1 0 0 1 .35-.85l.75-.7a1 1 0 0 0 0-1.4l-.75-.7a1 1 0 0 1-.35-.85l.05-1.05a1 1 0 0 0-.9-1.05l-1.05-.1a1 1 0 0 1-.85-.55l-.5-.95a1 1 0 0 0-1.25-.45l-.95.4a1 1 0 0 1-1.1-.22l-.7-.7ZM10 13.25A3.25 3.25 0 1 1 10 6.75a3.25 3.25 0 0 1 0 6.5Z"/></svg>',
    logout: '<svg class="qmf-auth-ico" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M8 3.5a.75.75 0 0 0-.75.75v11.5a.75.75 0 0 0 1.5 0V4.25A.75.75 0 0 0 8 3.5Zm5.78 6.22a.75.75 0 0 0 0-1.06l-2.5-2.5a.75.75 0 1 0-1.06 1.06l1.22 1.22H4.75a.75.75 0 0 0 0 1.5h6.69l-1.22 1.22a.75.75 0 1 0 1.06 1.06l2.5-2.5Z"/></svg>',
    chevron: '<svg class="qmf-auth-chevron" viewBox="0 0 12 12" aria-hidden="true"><path fill="currentColor" d="M2.7 4.3a.75.75 0 0 1 1.06 0L6 6.54l2.24-2.24a.75.75 0 1 1 1.06 1.06l-2.77 2.77a.75.75 0 0 1-1.06 0L2.7 5.36a.75.75 0 0 1 0-1.06Z"/></svg>',
    close: '<svg class="qmf-auth-ico" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06Z"/></svg>',
  };

  const DEFAULT_CONFIG = {
    container: '.qmf-header__right, .qmf-header__actions, .qmf-header__cluster--right, .lab-header__actions, .header-actions',
    loginUrl: 'https://id.quizzman.com/login',
    accountUrl: 'https://id.quizzman.com/account',
    logoutUrl: 'https://id.quizzman.com/logout',
    settingsUrl: 'https://id.quizzman.com/account',
    apiEndpoint: '/api/auth/me',
    lang: 'vi',
    showTierBadge: true,
    showLumenBadge: true,
    showTitle: true,
    showProgressRing: true,
    showSettings: true,
    avatarSize: 28,
    onLogin: null,
    onLogout: null,
    onUserLoad: null,
    onPrefsChange: null,
  };

  class AuthWidget {
    constructor(config = {}) {
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.user = null;
      this.elements = {};
      this.prefs = this.loadPrefs();
      this.init();
    }

    init() {
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

      window.qmfAuthInitialized = true;
      this.container = container;
      this.bindLangWatch();
      this.checkAuth();
    }

    bindLangWatch() {
      if (this._langWatchBound) return;
      this._langWatchBound = true;
      this._onLangChange = () => this.applyLangLabels();
      window.addEventListener('qmf:langchange', this._onLangChange);
      window.addEventListener('qmf:lang-change', this._onLangChange);
      window.addEventListener('qmf:prefs-change', this._onLangChange);
    }

    applyLangLabels() {
      try {
        const saved = localStorage.getItem('qmf-lang') || localStorage.getItem('lab-ui-lang');
        if (saved && LABELS[saved]) this.prefs.lang = saved;
      } catch (e) { /* ignore */ }

      const lbl = this.labels();
      const login = this.elements.loginBtn
        || (this.container && this.container.querySelector('.qmf-auth-login'));
      if (login) {
        login.title = lbl.login;
        login.setAttribute('aria-label', lbl.login);
      }

      const chip = this.elements.chip;
      if (chip) {
        const name = chip.getAttribute('aria-label');
        if (!name || name === 'Account' || name === 'Tài khoản') {
          chip.setAttribute('aria-label', lbl.account);
        }
      }

      this.refreshMenuLabels();

      const sheet = this.elements.prefsSheet;
      if (sheet && sheet.classList.contains('qmf-auth-sheet-root--open')) {
        // Rebuild open prefs sheet in the new language
        this.closePrefsSheet();
        this.openPrefsSheet();
      }
    }

    _writeLangCookie(lang) {
      if (!lang) return;
      try {
        const host = location.hostname || '';
        let base = `qmf-lang=${encodeURIComponent(lang)}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
        if (location.protocol === 'https:') base += '; Secure';
        document.cookie = (host === 'quizzman.com' || host.endsWith('.quizzman.com'))
          ? `${base}; domain=.quizzman.com`
          : base;
      } catch (e) { /* ignore */ }
    }

    loadPrefs() {
      let lang = this.config.lang;
      const savedLang = localStorage.getItem('qmf-lang')
        || localStorage.getItem('lab-ui-lang')
        || localStorage.getItem('lab-lang')
        || this.getCookie('qmf-lang');
      if (savedLang && LABELS[savedLang]) lang = savedLang;

      const theme = localStorage.getItem('qmf-theme')
        || localStorage.getItem('lab-theme')
        || document.documentElement.getAttribute('data-theme')
        || 'light';

      const region = localStorage.getItem('qmf-region')
        || localStorage.getItem('qlib-region')
        || 'VN';

      const role = localStorage.getItem('qmf-role')
        || localStorage.getItem('qlib-role')
        || 'personal';

      return { lang, theme, region, role };
    }

    injectStyles() {
      let style = document.getElementById('qmf-auth-widget-styles');
      if (style && style.getAttribute('data-v') === VERSION) return;
      if (!style) {
        style = document.createElement('style');
        style.id = 'qmf-auth-widget-styles';
        document.head.appendChild(style);
      }
      style.setAttribute('data-v', VERSION);
      style.textContent = `
        .qmf-auth-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
          font-family: ${FONT_STACK};
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .qmf-auth-login {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          padding: 0;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: rgba(255, 255, 255, 0.72);
          color: #1d1d1f;
          cursor: pointer;
          font: 600 13px/1 ${FONT_STACK};
          text-decoration: none;
          transition: background 0.18s ease, border-color 0.18s ease;
          backdrop-filter: blur(16px) saturate(1.4);
          -webkit-backdrop-filter: blur(16px) saturate(1.4);
        }
        .qmf-auth-login:hover {
          background: rgba(0, 0, 0, 0.04);
          border-color: rgba(0, 0, 0, 0.18);
        }
        [data-theme="dark"] .qmf-auth-login {
          border-color: rgba(255, 255, 255, 0.14);
          background: rgba(44, 44, 46, 0.72);
          color: #f5f5f7;
        }
        [data-theme="dark"] .qmf-auth-login:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .qmf-auth-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 3px 8px 3px 3px;
          min-height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(18px) saturate(1.5);
          -webkit-backdrop-filter: blur(18px) saturate(1.5);
          color: #1d1d1f;
          cursor: pointer;
          font: 500 13px/1.2 ${FONT_STACK};
          transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
          white-space: nowrap;
        }
        [data-theme="dark"] .qmf-auth-chip {
          border-color: rgba(255, 255, 255, 0.12);
          background: rgba(44, 44, 46, 0.72);
          color: #f5f5f7;
        }
        .qmf-auth-chip:hover {
          background: rgba(0, 0, 0, 0.04);
          border-color: rgba(0, 0, 0, 0.14);
        }
        [data-theme="dark"] .qmf-auth-chip:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .qmf-auth-wrap--open .qmf-auth-chip {
          border-color: rgba(0, 122, 255, 0.45);
          box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.12);
        }

        .qmf-auth-identity {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          min-width: 34px;
        }

        .qmf-auth-avatar-wrap {
          position: relative;
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 50%;
          padding: 2.5px;
          box-sizing: border-box;
          background: var(--qmf-plan-ring);
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06);
        }
        .qmf-auth-avatar-wrap[data-tier="free"] {
          --qmf-plan-ring: conic-gradient(from 200deg, #38bdf8, #34d399, #fbbf24, #fb7185, #a78bfa, #38bdf8);
        }
        .qmf-auth-avatar-wrap[data-tier="plus"] {
          --qmf-plan-ring: conic-gradient(from 210deg, #0d9488, #22d3ee, #6ee7b7, #fcd34d, #2dd4bf, #0d9488);
        }
        .qmf-auth-avatar-wrap[data-tier="pro"],
        .qmf-auth-avatar-wrap[data-tier="premium"] {
          --qmf-plan-ring: conic-gradient(from 180deg, #ea580c, #fbbf24, #fb7185, #a855f7, #f97316, #ea580c);
        }
        .qmf-auth-avatar-wrap[data-tier="elite"],
        .qmf-auth-avatar-wrap[data-tier="enterprise"],
        .qmf-auth-avatar-wrap[data-tier="ultra"] {
          --qmf-plan-ring: conic-gradient(from 0deg, #14b8a6, #6366f1, #e11d48, #f59e0b, #06b6d4, #14b8a6);
        }
        .qmf-auth-avatar-wrap[data-tier="legend"] {
          --qmf-plan-ring: conic-gradient(from 90deg, #22d3ee, #818cf8, #e879f9, #fb7185, #fbbf24, #34d399, #22d3ee);
        }
        .qmf-auth-progress { display: none !important; }

        .qmf-auth-avatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid #fff;
          box-sizing: border-box;
          background: linear-gradient(145deg, #3a3a3c, #1d1d1f);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font: 700 11px/1 ${FONT_STACK};
          flex-shrink: 0;
          text-transform: uppercase;
          overflow: hidden;
          position: relative;
          z-index: 2;
        }
        [data-theme="dark"] .qmf-auth-avatar,
        body.dark-mode .qmf-auth-avatar {
          border-color: #1c1c1e;
        }
        .qmf-auth-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          display: block;
        }

        .qmf-auth-lumen-stack {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          width: 100%;
          min-width: 32px;
        }
        .qmf-auth-lumen-bar {
          width: 100%;
          height: 3px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }
        [data-theme="dark"] .qmf-auth-lumen-bar {
          background: rgba(255, 255, 255, 0.12);
        }
        .qmf-auth-lumen-bar__fill {
          height: 100%;
          width: var(--qmf-lumen-pct, 0%);
          border-radius: inherit;
          background: linear-gradient(90deg, #0a84ff, #30d158, #ffd60a, #ff453a);
          transition: width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .qmf-auth-lumen {
          margin: 0;
          font: 700 10px/1 ${FONT_STACK};
          letter-spacing: 0.01em;
          color: #007aff;
          font-variant-numeric: tabular-nums;
        }
        [data-theme="dark"] .qmf-auth-lumen { color: #0a84ff; }

        .qmf-auth-tier {
          font: 700 9px/1 ${FONT_STACK};
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 4px 7px;
          border-radius: 999px;
          background: #007aff;
          color: #fff;
        }
        .qmf-auth-tier--plus { background: linear-gradient(135deg, #0a84ff, #30d158); }
        .qmf-auth-tier--pro,
        .qmf-auth-tier--premium { background: linear-gradient(135deg, #5e5ce6, #bf5af2); }
        .qmf-auth-tier--elite,
        .qmf-auth-tier--enterprise,
        .qmf-auth-tier--ultra {
          background: linear-gradient(135deg, #1c1c1e, #3a3a3c);
          box-shadow: 0 0 0 1px rgba(10, 132, 255, 0.4);
        }
        .qmf-auth-tier--legend {
          background: linear-gradient(135deg, #64d2ff, #bf5af2, #ff9f0a);
          color: #1c1c1e;
        }

        .qmf-auth-chevron {
          width: 10px;
          height: 10px;
          opacity: 0.45;
          margin-left: 1px;
          transition: transform 0.18s ease, opacity 0.18s ease;
        }
        .qmf-auth-wrap--open .qmf-auth-chevron {
          transform: rotate(180deg);
          opacity: 0.7;
        }

        /* —— macOS-style dropdown —— */
        .qmf-auth-drop {
          --drop-bg: rgba(246, 246, 246, 0.82);
          --drop-border: rgba(0, 0, 0, 0.12);
          --drop-text: #1d1d1f;
          --drop-muted: #86868b;
          --drop-icon: #636366;
          --drop-divider: rgba(0, 0, 0, 0.08);
          --drop-hover: rgba(0, 0, 0, 0.05);
          --drop-active: rgba(0, 122, 255, 0.12);
          --drop-accent: #007aff;
          --drop-danger: #ff3b30;
          position: fixed;
          z-index: 10000;
          color-scheme: light;
          min-width: 248px;
          max-width: min(320px, calc(100vw - 16px));
          padding: 5px;
          border-radius: 12px;
          border: 1px solid var(--drop-border);
          background: var(--drop-bg);
          box-shadow:
            0 0 0 0.5px rgba(0, 0, 0, 0.04),
            0 12px 40px rgba(0, 0, 0, 0.18),
            0 2px 8px rgba(0, 0, 0, 0.08);
          backdrop-filter: blur(40px) saturate(1.8);
          -webkit-backdrop-filter: blur(40px) saturate(1.8);
          font-family: ${FONT_STACK};
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-4px) scale(0.98);
          transform-origin: top right;
          transition: opacity 0.16s ease, transform 0.16s cubic-bezier(0.2, 0.9, 0.3, 1.1), visibility 0.16s;
          pointer-events: none;
          overflow: hidden;
        }
        .qmf-auth-drop--open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-drop {
          --drop-bg: rgba(36, 36, 38, 0.86);
          --drop-border: rgba(255, 255, 255, 0.12);
          --drop-text: #f5f5f7;
          --drop-muted: #98989d;
          --drop-icon: #aeaeb2;
          --drop-divider: rgba(255, 255, 255, 0.1);
          --drop-hover: rgba(255, 255, 255, 0.08);
          --drop-active: rgba(10, 132, 255, 0.22);
          --drop-accent: #0a84ff;
          --drop-danger: #ff453a;
          color-scheme: dark;
          box-shadow:
            0 0 0 0.5px rgba(255, 255, 255, 0.06),
            0 16px 48px rgba(0, 0, 0, 0.55),
            0 2px 10px rgba(0, 0, 0, 0.35);
        }

        .qmf-auth-user {
          display: grid;
          grid-template-columns: 40px 1fr;
          gap: 10px;
          align-items: center;
          padding: 10px 10px 12px;
          margin: 0 0 2px;
        }
        .qmf-auth-user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          background: linear-gradient(145deg, #3a3a3c, #1d1d1f);
          color: #fff;
          font: 700 13px/40px ${FONT_STACK};
          text-align: center;
          text-transform: uppercase;
          flex-shrink: 0;
        }
        .qmf-auth-user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .qmf-auth-user-meta { min-width: 0; }
        .qmf-auth-user-name {
          font: 600 13px/1.25 ${FONT_STACK};
          color: var(--drop-text);
          letter-spacing: -0.01em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .qmf-auth-user-email {
          margin-top: 2px;
          font: 400 11px/1.3 ${FONT_STACK};
          color: var(--drop-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .qmf-auth-user-title {
          margin-top: 2px;
          font: 500 11px/1.3 ${FONT_STACK};
          color: var(--drop-muted);
        }
        .qmf-auth-user-lumen {
          margin-top: 3px;
          font: 600 11px/1.3 ${FONT_STACK};
          color: var(--drop-accent);
          font-variant-numeric: tabular-nums;
        }

        .qmf-auth-drop-divider {
          height: 1px;
          margin: 4px 8px;
          background: var(--drop-divider);
        }

        .qmf-auth-drop a.qmf-auth-item,
        .qmf-auth-drop button.qmf-auth-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          min-height: 32px;
          padding: 6px 10px;
          margin: 0;
          border: none;
          border-radius: 7px;
          background: transparent;
          color: var(--drop-text);
          font: 400 13px/1.25 ${FONT_STACK};
          letter-spacing: -0.01em;
          text-decoration: none;
          text-align: left;
          cursor: pointer;
          transition: background 0.1s ease;
        }
        .qmf-auth-drop a.qmf-auth-item:hover,
        .qmf-auth-drop button.qmf-auth-item:hover,
        .qmf-auth-drop a.qmf-auth-item:focus-visible,
        .qmf-auth-drop button.qmf-auth-item:focus-visible {
          background: var(--drop-hover);
          outline: none;
        }
        .qmf-auth-drop a.qmf-auth-item:active,
        .qmf-auth-drop button.qmf-auth-item:active {
          background: var(--drop-active);
        }
        .qmf-auth-ico {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          color: var(--drop-icon);
        }
        .qmf-auth-item__label { flex: 1; min-width: 0; }
        .qmf-auth-item__hint {
          font: 400 11px/1 ${FONT_STACK};
          color: var(--drop-muted);
        }
        .qmf-auth-logout-btn:hover,
        .qmf-auth-logout-btn:focus-visible {
          background: rgba(255, 59, 48, 0.1) !important;
          color: var(--drop-danger);
        }
        .qmf-auth-logout-btn:hover .qmf-auth-ico,
        .qmf-auth-logout-btn:focus-visible .qmf-auth-ico {
          color: var(--drop-danger);
        }

        /* —— Preferences sheet —— */
        .qmf-auth-sheet-root {
          position: fixed;
          inset: 0;
          z-index: 10050;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: ${FONT_STACK};
          -webkit-font-smoothing: antialiased;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s ease, visibility 0.2s;
        }
        .qmf-auth-sheet-root--open {
          opacity: 1;
          visibility: visible;
        }
        .qmf-auth-sheet-scrim {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.28);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-sheet-scrim {
          background: rgba(0, 0, 0, 0.55);
        }
        .qmf-auth-sheet {
          position: relative;
          width: min(400px, 100%);
          max-height: min(84vh, 640px);
          overflow: auto;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(246, 246, 246, 0.94);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(40px) saturate(1.6);
          -webkit-backdrop-filter: blur(40px) saturate(1.6);
          color: #1d1d1f;
          transform: scale(0.96) translateY(8px);
          transition: transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.05);
        }
        .qmf-auth-sheet-root--open .qmf-auth-sheet {
          transform: scale(1) translateY(0);
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-sheet {
          border-color: rgba(255, 255, 255, 0.12);
          background: rgba(36, 36, 38, 0.94);
          color: #f5f5f7;
          box-shadow: 0 28px 72px rgba(0, 0, 0, 0.55);
        }
        .qmf-auth-sheet__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 18px 10px;
          position: sticky;
          top: 0;
          background: inherit;
          z-index: 1;
        }
        .qmf-auth-sheet__title {
          margin: 0;
          font: 600 17px/1.25 ${FONT_STACK};
          letter-spacing: -0.02em;
        }
        .qmf-auth-sheet__close {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border: none;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.06);
          color: #636366;
          cursor: pointer;
          padding: 0;
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-sheet__close {
          background: rgba(255, 255, 255, 0.1);
          color: #aeaeb2;
        }
        .qmf-auth-sheet__close:hover { opacity: 0.85; }
        .qmf-auth-sheet__body { padding: 4px 14px 18px; }

        .qmf-auth-pref {
          margin-bottom: 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(0, 0, 0, 0.06);
          overflow: hidden;
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-pref {
          background: rgba(44, 44, 46, 0.72);
          border-color: rgba(255, 255, 255, 0.08);
        }
        .qmf-auth-pref__label {
          padding: 10px 12px 0;
          font: 600 11px/1.2 ${FONT_STACK};
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: #86868b;
        }
        .qmf-auth-pref__row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 10px 12px 12px;
        }
        .qmf-auth-seg {
          flex: 1 1 auto;
          min-width: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 34px;
          padding: 0 12px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: rgba(0, 0, 0, 0.04);
          color: inherit;
          font: 500 12px/1 ${FONT_STACK};
          cursor: pointer;
          transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-seg {
          background: rgba(255, 255, 255, 0.06);
        }
        .qmf-auth-seg:hover {
          background: rgba(0, 122, 255, 0.08);
        }
        .qmf-auth-seg--active {
          background: rgba(0, 122, 255, 0.12);
          border-color: rgba(0, 122, 255, 0.35);
          color: #007aff;
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-seg--active {
          color: #0a84ff;
          background: rgba(10, 132, 255, 0.18);
          border-color: rgba(10, 132, 255, 0.4);
        }
        .qmf-auth-lang-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          padding: 10px 12px 12px;
        }
        .qmf-auth-lang-grid .qmf-auth-seg {
          flex-direction: column;
          gap: 2px;
          min-height: 48px;
          padding: 8px 6px;
        }
        .qmf-auth-lang-grid .qmf-auth-seg small {
          font: 400 10px/1 ${FONT_STACK};
          color: #86868b;
        }
        .qmf-auth-seg--active small { color: inherit; opacity: 0.75; }

        .qmf-auth-role-note {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 12px 12px;
        }
        .qmf-auth-role-note a {
          font: 500 12px/1.3 ${FONT_STACK};
          color: #007aff;
          text-decoration: none;
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-role-note a {
          color: #0a84ff;
        }
        .qmf-auth-role-note a:hover { text-decoration: underline; }

        .qmf-auth-sheet__foot {
          display: flex;
          justify-content: flex-end;
          padding: 0 14px 16px;
        }
        .qmf-auth-sheet__done {
          min-width: 88px;
          height: 34px;
          padding: 0 16px;
          border: none;
          border-radius: 8px;
          background: #007aff;
          color: #fff;
          font: 600 13px/1 ${FONT_STACK};
          cursor: pointer;
        }
        .qmf-auth-sheet__done:hover { filter: brightness(1.05); }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-sheet__done {
          background: #0a84ff;
        }

        @media (max-width: 480px) {
          .qmf-auth-drop { min-width: 220px; }
          .qmf-auth-lang-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `;
    }

    getLang() {
      if (this.prefs?.lang && LABELS[this.prefs.lang]) return this.prefs.lang;
      if (this.config.lang && LABELS[this.config.lang]) return this.config.lang;
      const saved = localStorage.getItem('lab-ui-lang') || localStorage.getItem('qmf-lang');
      if (saved && LABELS[saved]) return saved;
      if (window.labI18n?.lang && LABELS[window.labI18n.lang]) return window.labI18n.lang;

      const nav = (navigator.language || 'vi').toLowerCase();
      if (nav.startsWith('zh-t') || nav === 'zht' || nav.includes('hant')) return 'zht';
      if (nav.startsWith('zh')) return 'zh';
      if (nav.startsWith('ko')) return 'kr';
      if (nav.startsWith('ja')) return 'jp';
      if (nav.startsWith('en')) return 'en';
      return 'vi';
    }

    labels() {
      return LABELS[this.getLang()] || LABELS.vi;
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
          loginBase.searchParams.set('redirect', redirect);
          return loginBase.pathname + loginBase.search;
        }
        // External IdP — keep existing query (e.g. client_id), set redirect
        loginBase.searchParams.set('redirect', window.location.href);
        return loginBase.toString();
      } catch (e) { /* fall through */ }
      const sep = String(this.config.loginUrl || '').includes('?') ? '&' : '?';
      return this.config.loginUrl + sep + 'redirect=' + encodeURIComponent(window.location.href);
    }

    getLogoutUrl() {
      const returnTo = window.location.href;
      try {
        const logoutBase = new URL(this.config.logoutUrl, window.location.origin);
        // Prefer redirect_uri (id-sys + wiki/home convention); keep redirect as alias.
        logoutBase.searchParams.set('redirect_uri', returnTo);
        logoutBase.searchParams.set('redirect', returnTo);
        if (logoutBase.origin === window.location.origin) {
          return logoutBase.pathname + logoutBase.search;
        }
        return logoutBase.toString();
      } catch (e) { /* fall through */ }
      const sep = String(this.config.logoutUrl || '').includes('?') ? '&' : '?';
      return this.config.logoutUrl + sep + 'redirect_uri=' + encodeURIComponent(returnTo);
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

    normalizeTier(raw) {
      const t = String(raw || 'free').toLowerCase().trim().replace(/^quizzman\s+/, '');
      if (['pro', 'premium', 'professional'].includes(t)) return 'pro';
      if (['plus', 'basic'].includes(t)) return 'plus';
      if (['elite', 'ultra', 'enterprise'].includes(t)) return 'elite';
      if (t === 'legend') return 'legend';
      if (t === 'free' || t === 'inactive') return 'free';
      return t || 'free';
    }

    lumenBarPct(lumen) {
      const progress = Number(lumen?.progress);
      const balance = Number(lumen?.balance ?? 0);
      if (Number.isFinite(progress) && progress >= 0) {
        return Math.max(0, Math.min(100, Math.round(progress <= 1 ? progress * 100 : progress)));
      }
      if (balance <= 0) return 0;
      return Math.min(100, Math.max(10, Math.round(Math.log10(balance + 1) * 28)));
    }

    buildAvatarEl(avatarSrc, initials, lumen, tier) {
      const identity = document.createElement('div');
      identity.className = 'qmf-auth-identity';

      const wrap = document.createElement('div');
      wrap.className = 'qmf-auth-avatar-wrap';
      wrap.setAttribute('data-tier', this.normalizeTier(tier));
      if (lumen?.frame) wrap.setAttribute('data-frame', lumen.frame);

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
      identity.appendChild(wrap);

      if (this.config.showLumenBadge && lumen && lumen.balance != null) {
        const stack = document.createElement('div');
        stack.className = 'qmf-auth-lumen-stack';
        const bar = document.createElement('div');
        bar.className = 'qmf-auth-lumen-bar';
        const fill = document.createElement('div');
        fill.className = 'qmf-auth-lumen-bar__fill';
        fill.style.setProperty('--qmf-lumen-pct', this.lumenBarPct(lumen) + '%');
        bar.appendChild(fill);
        const lumenEl = document.createElement('span');
        lumenEl.className = 'qmf-auth-lumen';
        lumenEl.title = lumen.title
          ? `${lumen.title} · Lv${lumen.level || 1}`
          : `Lv${lumen.level || 1}`;
        lumenEl.textContent = this.formatLumen(lumen.balance);
        stack.appendChild(bar);
        stack.appendChild(lumenEl);
        identity.appendChild(stack);
      }

      return identity;
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
            this.hydratePrefsFromUser(auth.user);
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
        if (userData) return JSON.parse(userData);
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
            this.hydratePrefsFromUser(data.user);
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
      return {
        id: 'unknown',
        email: '',
        display_name: 'User',
        tier: 'free'
      };
    }

    pinNotificationSlot() {
      let slot = this.container.querySelector('[data-qmf-notification-slot]');
      if (!slot) {
        slot = document.createElement('div');
        slot.className = 'lab-header__notification-slot';
        slot.setAttribute('data-qmf-notification-slot', '');
        slot.setAttribute('aria-label', 'Notifications');
        this.container.appendChild(slot);
      } else if (slot.parentElement === this.container) {
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
      if (on) {
        slot.setAttribute('data-legatus-auth', '1');
        try {
          if (typeof window.remountLegatusToVisibleSlot === 'function') {
            window.remountLegatusToVisibleSlot({ slot: slot });
          }
        } catch (e) { /* ignore */ }
      } else {
        slot.removeAttribute('data-legatus-auth');
        slot.querySelectorAll('legatus-bell').forEach((b) => b.remove());
      }
    }

    renderLoginBtn() {
      this.container.querySelectorAll('.qmf-auth-wrap, .qmf-auth-login').forEach(el => el.remove());
      this.rendered = false;

      const lbl = this.labels();
      const a = document.createElement('a');
      a.className = 'qmf-auth-login';
      a.href = this.getLoginUrl();
      a.title = lbl.login;
      a.setAttribute('aria-label', lbl.login);
      a.innerHTML = ICONS.account;

      this.container.insertBefore(a, this.container.firstChild);
      this.elements.loginBtn = a;
      this.setLegatusAuthVisible(false);

      if (typeof this.config.onLogin === 'function') {
        a.addEventListener('click', (e) => this.config.onLogin(e));
      }
    }

    renderUserChip() {
      const lbl = this.labels();

      // Drop may be portaled to <body> while open — remove it before re-render.
      if (this.elements.drop && this.elements.drop.parentElement === document.body) {
        this.elements.drop.remove();
      }
      this.container.querySelectorAll('.qmf-auth-wrap, .qmf-auth-login').forEach(el => el.remove());
      document.querySelectorAll('body > .qmf-auth-drop').forEach((el) => el.remove());

      const user = this.user;
      const displayName = user.display_name || user.username || user.name || '';
      const email = user.email || '';
      const initials = this.getInitials(displayName, email);
      const avatarSrc = this.resolveAvatarUrl(user);
      const tier = this.normalizeTier(window.qmTier?.tier || user.tier || user.plan_code || 'free');
      const lumen = user.lumen || null;
      const title = (this.config.showTitle && lumen?.title) ? lumen.title : '';
      const nameShown = displayName || email.split('@')[0] || lbl.account;

      const wrap = document.createElement('div');
      wrap.className = 'qmf-auth-wrap';

      const chip = document.createElement('button');
      chip.className = 'qmf-auth-chip';
      chip.type = 'button';
      chip.setAttribute('aria-haspopup', 'menu');
      chip.setAttribute('aria-expanded', 'false');
      chip.setAttribute('aria-label', nameShown);

      chip.appendChild(this.buildAvatarEl(avatarSrc, initials, lumen, tier));

      if (this.config.showTierBadge && tier && tier !== 'free') {
        const tierEl = document.createElement('span');
        tierEl.className = 'qmf-auth-tier qmf-auth-tier--' + tier;
        tierEl.textContent = tier === 'pro' ? 'PRO' : tier.toUpperCase();
        chip.appendChild(tierEl);
      }

      const chevronWrap = document.createElement('span');
      chevronWrap.innerHTML = ICONS.chevron;
      chip.appendChild(chevronWrap.firstChild);

      const drop = document.createElement('div');
      drop.className = 'qmf-auth-drop';
      drop.setAttribute('role', 'menu');

      const avatarBlock = avatarSrc
        ? `<div class="qmf-auth-user-avatar"><img src="${this._esc(avatarSrc)}" alt=""></div>`
        : `<div class="qmf-auth-user-avatar">${this._esc(initials)}</div>`;

      const lumenLine = (lumen && lumen.balance != null)
        ? `<div class="qmf-auth-user-lumen">${this.formatLumen(lumen.balance)} Lumen · Lv${lumen.level || 1}</div>`
        : '';
      const titleLine = title
        ? `<div class="qmf-auth-user-title">${this._esc(title)}</div>`
        : '';

      const settingsItem = this.config.showSettings
        ? `<button type="button" class="qmf-auth-item qmf-auth-settings-btn" role="menuitem">${ICONS.settings}<span class="qmf-auth-item__label">${lbl.settings}</span></button>`
        : '';

      drop.innerHTML = `
        <div class="qmf-auth-user">
          ${avatarBlock}
          <div class="qmf-auth-user-meta">
            <div class="qmf-auth-user-name">${this._esc(nameShown)}</div>
            ${titleLine}
            ${email ? `<div class="qmf-auth-user-email">${this._esc(email)}</div>` : ''}
            ${lumenLine}
          </div>
        </div>
        <div class="qmf-auth-drop-divider"></div>
        <a class="qmf-auth-item" href="${this.getAccountUrl()}" role="menuitem">${ICONS.account}<span class="qmf-auth-item__label">${lbl.account}</span></a>
        ${settingsItem}
        <div class="qmf-auth-drop-divider"></div>
        <a class="qmf-auth-item qmf-auth-logout-btn" href="${this._esc(this.getLogoutUrl())}" role="menuitem">${ICONS.logout}<span class="qmf-auth-item__label">${lbl.logout}</span></a>
      `;

      wrap.appendChild(chip);
      wrap.appendChild(drop);
      this.container.insertBefore(wrap, this.container.firstChild);
      this.setLegatusAuthVisible(true);

      try {
        const token = this.getToken() || null;
        window.dispatchEvent(new CustomEvent('qmf:auth-ready', {
          detail: { user: this.user || null, token }
        }));
      } catch (e) { /* ignore */ }

      this.elements = { ...this.elements, wrap, chip, drop };
      this.rendered = true;

      let outsideClickHandler = null;
      let onReposition = null;
      let onKeydown = null;

      const clearDropPosition = () => {
        drop.style.top = '';
        drop.style.right = '';
        drop.style.left = '';
        drop.style.bottom = '';
      };

      const positionDrop = () => {
        const rect = chip.getBoundingClientRect();
        const gap = 8;
        const viewportPad = 8;
        const dropWidth = drop.offsetWidth || 248;
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
        if (onKeydown) {
          document.removeEventListener('keydown', onKeydown);
          onKeydown = null;
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

        onKeydown = (e) => {
          if (e.key === 'Escape') closeDrop();
        };
        document.addEventListener('keydown', onKeydown);

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

      const settingsBtn = drop.querySelector('.qmf-auth-settings-btn');
      if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
          closeDrop();
          this.openPrefsSheet();
        });
      }

      const logoutBtn = drop.querySelector('.qmf-auth-logout-btn');
      if (logoutBtn) {
        // Keep href fresh (SPA navigations) and always run full logout.
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.logout();
        });
      }

      this._closeDrop = closeDrop;
    }

    openPrefsSheet() {
      this.closePrefsSheet();
      const lbl = this.labels();
      const lang = this.getLang();
      const { theme, region, role } = this.prefs;

      const root = document.createElement('div');
      root.className = 'qmf-auth-sheet-root';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', lbl.prefsTitle);

      const roleButtons = ROLE_OPTIONS.map((r) => {
        const text = r.label[lang] || r.label.en;
        const active = role === r.id ? ' qmf-auth-seg--active' : '';
        return `<button type="button" class="qmf-auth-seg${active}" data-pref="role" data-value="${r.id}">${this._esc(text)}</button>`;
      }).join('');

      const langButtons = LANG_OPTIONS.map((l) => {
        const active = lang === l.id ? ' qmf-auth-seg--active' : '';
        return `<button type="button" class="qmf-auth-seg${active}" data-pref="lang" data-value="${l.id}" title="${this._esc(l.label)}"><span>${this._esc(l.short)}</span><small>${this._esc(l.label)}</small></button>`;
      }).join('');

      const regionButtons = REGION_OPTIONS.map((r) => {
        const active = region === r.id ? ' qmf-auth-seg--active' : '';
        return `<button type="button" class="qmf-auth-seg${active}" data-pref="region" data-value="${r.id}">${this._esc(r.label)}</button>`;
      }).join('');

      root.innerHTML = `
        <div class="qmf-auth-sheet-scrim" data-sheet-dismiss></div>
        <div class="qmf-auth-sheet">
          <div class="qmf-auth-sheet__head">
            <h2 class="qmf-auth-sheet__title">${lbl.prefsTitle}</h2>
            <button type="button" class="qmf-auth-sheet__close" data-sheet-dismiss aria-label="${lbl.done}">${ICONS.close}</button>
          </div>
          <div class="qmf-auth-sheet__body">
            <section class="qmf-auth-pref">
              <div class="qmf-auth-pref__label">${lbl.appearance}</div>
              <div class="qmf-auth-pref__row">
                <button type="button" class="qmf-auth-seg${theme === 'light' ? ' qmf-auth-seg--active' : ''}" data-pref="theme" data-value="light">${lbl.light}</button>
                <button type="button" class="qmf-auth-seg${theme === 'dark' ? ' qmf-auth-seg--active' : ''}" data-pref="theme" data-value="dark">${lbl.dark}</button>
              </div>
            </section>
            <section class="qmf-auth-pref">
              <div class="qmf-auth-pref__label">${lbl.language}</div>
              <div class="qmf-auth-lang-grid">${langButtons}</div>
            </section>
            <section class="qmf-auth-pref">
              <div class="qmf-auth-pref__label">${lbl.region}</div>
              <div class="qmf-auth-pref__row">${regionButtons}</div>
            </section>
            <section class="qmf-auth-pref">
              <div class="qmf-auth-pref__label">${lbl.role}</div>
              <div class="qmf-auth-pref__row">${roleButtons}</div>
              <div class="qmf-auth-role-note">
                <a href="${ID_SYS}/account" target="_blank" rel="noopener noreferrer">${lbl.manageRole}</a>
              </div>
            </section>
          </div>
          <div class="qmf-auth-sheet__foot">
            <button type="button" class="qmf-auth-sheet__done" data-sheet-dismiss>${lbl.done}</button>
          </div>
        </div>
      `;

      document.body.appendChild(root);
      this.elements.prefsSheet = root;

      requestAnimationFrame(() => root.classList.add('qmf-auth-sheet-root--open'));

      const onKey = (e) => {
        if (e.key === 'Escape') this.closePrefsSheet();
      };
      this._prefsKeyHandler = onKey;
      document.addEventListener('keydown', onKey);

      root.addEventListener('click', (e) => {
        const dismiss = e.target.closest('[data-sheet-dismiss]');
        if (dismiss) {
          this.closePrefsSheet();
          return;
        }
        const seg = e.target.closest('[data-pref]');
        if (!seg) return;
        const key = seg.getAttribute('data-pref');
        const value = seg.getAttribute('data-value');
        this.applyPref(key, value, root);
      });
    }

    closePrefsSheet() {
      const root = this.elements.prefsSheet;
      if (!root) return;
      root.classList.remove('qmf-auth-sheet-root--open');
      if (this._prefsKeyHandler) {
        document.removeEventListener('keydown', this._prefsKeyHandler);
        this._prefsKeyHandler = null;
      }
      const remove = () => {
        root.remove();
        if (this.elements.prefsSheet === root) this.elements.prefsSheet = null;
      };
      setTimeout(remove, 200);
    }

    hydratePrefsFromUser(user) {
      if (!user) return;
      const lang = user.language || user.preferred_language;
      const region = user.region;
      const theme = user.theme || user.ui_theme;
      const appRole = user.app_role;
      let changed = false;
      const seed = {};

      if (lang && LABELS[lang]) {
        this.prefs.lang = lang;
        try {
          localStorage.setItem('qmf-lang', lang);
          localStorage.setItem('lab-lang', lang);
          localStorage.setItem('lab-ui-lang', lang);
          localStorage.setItem('qss_ui_lang', lang);
          this._writeLangCookie(lang);
        } catch (e) { /* ignore */ }
        changed = true;
      } else if (this.prefs.lang && LABELS[this.prefs.lang]) {
        seed.language = this.prefs.lang;
      }

      if (region) {
        this.prefs.region = String(region).toUpperCase();
        try { localStorage.setItem('qmf-region', this.prefs.region); } catch (e) { /* ignore */ }
        changed = true;
      } else if (this.prefs.region) {
        seed.region = this.prefs.region;
      }

      if (theme && THEMES.has(theme)) {
        this.prefs.theme = theme;
        try {
          localStorage.setItem('qmf-theme', theme);
          localStorage.setItem('lab-theme', theme);
        } catch (e) { /* ignore */ }
        document.documentElement.setAttribute('data-theme', theme);
        try { document.documentElement.style.colorScheme = theme; } catch (e) { /* ignore */ }
        changed = true;
      } else if (this.prefs.theme && THEMES.has(this.prefs.theme)) {
        seed.theme = this.prefs.theme;
      }

      if (appRole && APP_ROLES.has(appRole)) {
        this.prefs.role = appRole;
        try {
          localStorage.setItem('qmf-role', appRole);
          localStorage.setItem('qlib-role', appRole);
        } catch (e) { /* ignore */ }
        changed = true;
      } else if (this.prefs.role && APP_ROLES.has(this.prefs.role)) {
        seed.app_role = this.prefs.role;
      }

      if (changed) {
        window.dispatchEvent(new CustomEvent('qmf:prefs-change', { detail: { ...this.prefs, source: 'account' } }));
        if (window.QmfI18n && typeof window.QmfI18n.hydrateFromUser === 'function') {
          window.QmfI18n.hydrateFromUser(user);
        }
      }

      /* First login / empty account prefs: seed server from local cache once. */
      if (Object.keys(seed).length) {
        persistAccountPrefs(seed);
      }
    }

    softReload(reason) {
      if (window.QMFShell && typeof window.QMFShell.softReload === 'function') {
        window.QMFShell.softReload(reason);
        return;
      }
      try {
        const u = new URL(window.location.href);
        u.searchParams.set('_qmf', 'prefs');
        u.searchParams.set('_qmf_why', String(reason || 'prefs').slice(0, 48));
        u.searchParams.set('_t', String(Date.now()));
        window.location.replace(u.toString());
      } catch (e) {
        window.location.reload();
      }
    }

    applyPref(key, value, root) {
      if (!key || value == null) return;

      let needsSoftReload = false;
      const serverPatch = {};

      if (key === 'lang' && LABELS[value]) {
        this.prefs.lang = value;
        try {
          localStorage.setItem('qmf-lang', value);
          localStorage.setItem('lab-lang', value);
          localStorage.setItem('lab-ui-lang', value);
          localStorage.setItem('qss_ui_lang', value);
          this._writeLangCookie(value);
        } catch (e) { /* ignore */ }
        window.dispatchEvent(new CustomEvent('qmf:langchange', { detail: { lang: value } }));
        window.dispatchEvent(new CustomEvent('qmf:lang-change', { detail: { lang: value } }));
        serverPatch.language = value;
        needsSoftReload = true;
      }

      if (key === 'theme' && THEMES.has(value)) {
        this.prefs.theme = value;
        try {
          localStorage.setItem('qmf-theme', value);
          localStorage.setItem('lab-theme', value);
        } catch (e) { /* ignore */ }
        document.documentElement.setAttribute('data-theme', value);
        try { document.documentElement.style.colorScheme = value; } catch (e) { /* ignore */ }
        window.dispatchEvent(new CustomEvent('qmf:themechange', { detail: { theme: value } }));
        serverPatch.theme = value;
      }

      if (key === 'region') {
        this.prefs.region = value;
        try { localStorage.setItem('qmf-region', value); } catch (e) { /* ignore */ }
        window.dispatchEvent(new CustomEvent('qmf:region-change', { detail: { region: value } }));
        serverPatch.region = value;
        needsSoftReload = true;
      }

      if (key === 'role' && APP_ROLES.has(value)) {
        this.prefs.role = value;
        try {
          localStorage.setItem('qmf-role', value);
          localStorage.setItem('qlib-role', value);
        } catch (e) { /* ignore */ }
        window.dispatchEvent(new CustomEvent('qmf:role-change', { detail: { role: value } }));
        serverPatch.app_role = value;
      }

      window.dispatchEvent(new CustomEvent('qmf:prefs-change', { detail: { ...this.prefs } }));
      if (typeof this.config.onPrefsChange === 'function') {
        this.config.onPrefsChange({ ...this.prefs }, key, value);
      }

      if (root) {
        root.querySelectorAll(`[data-pref="${key}"]`).forEach((btn) => {
          btn.classList.toggle('qmf-auth-seg--active', btn.getAttribute('data-value') === value);
        });
      }

      /* Account is source of truth when signed in; localStorage is paint cache. */
      const save = Object.keys(serverPatch).length
        ? persistAccountPrefs(serverPatch)
        : Promise.resolve(null);

      /* Principle: lang/region resync via QMFShell soft-reload — never hard-refresh. */
      if (needsSoftReload) {
        this.closePrefsSheet();
        Promise.race([
          save,
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]).finally(() => this.softReload('prefs:' + key));
      }
    }

    refreshMenuLabels() {
      const drop = this.elements.drop;
      if (!drop) return;
      const lbl = this.labels();
      const account = drop.querySelector('a.qmf-auth-item .qmf-auth-item__label');
      const settings = drop.querySelector('.qmf-auth-settings-btn .qmf-auth-item__label');
      const logout = drop.querySelector('.qmf-auth-logout-btn .qmf-auth-item__label');
      if (account) account.textContent = lbl.account;
      if (settings) settings.textContent = lbl.settings;
      if (logout) logout.textContent = lbl.logout;
    }

    clearLocalSession() {
      const expire = 'Thu, 01 Jan 1970 00:00:00 GMT';
      ['jwt_token', 'authToken', 'session_id'].forEach((name) => {
        document.cookie = `${name}=; path=/; domain=.quizzman.com; expires=${expire}`;
        document.cookie = `${name}=; path=/; expires=${expire}`;
      });

      [
        'authToken', 'jwt_token', 'token', 'auth_token', 'session_id',
        'user', 'currentUser', 'auth_user', 'userData', 'quizzman_auth_token', 'quizzman_user_data',
      ].forEach((key) => {
        try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
        try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ }
      });

      try { window.__QM_ACCESS_TOKEN__ = null; } catch (e) { /* ignore */ }
      this.user = null;
    }

    logout() {
      const url = this.getLogoutUrl();

      // Notify SSO while token still present, then clear local state.
      // Do not await — id-sys GET /logout clears HttpOnly refresh_token.
      try {
        const sso = window.QuizzmanSSO || window.IdSysSSO || window.QuizzmanAuth;
        if (sso && typeof sso.logout === 'function') {
          Promise.resolve(sso.logout(false)).catch(() => {});
        }
      } catch (e) { /* ignore */ }

      try { this.clearLocalSession(); } catch (e) { /* ignore */ }

      try {
        if (typeof this.config.onLogout === 'function') this.config.onLogout();
      } catch (e) {
        console.warn('[QMF Auth] onLogout error', e);
      }

      try { this.setLegatusAuthVisible(false); } catch (e) { /* ignore */ }

      try {
        window.location.assign(url);
      } catch (e) {
        window.location.href = url;
      }
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

    getUser() {
      return this.user;
    }

    getPrefs() {
      return { ...this.prefs };
    }

    isAuthenticated() {
      return !!this.user;
    }

    refresh() {
      if (this.container) {
        this.container.querySelectorAll('.qmf-auth-wrap, .qmf-auth-login').forEach((el) => el.remove());
      }
      this.closePrefsSheet();
      this.checkAuth();
    }

    destroy() {
      this.closePrefsSheet();
      if (this.elements.drop && this.elements.drop.parentElement === document.body) {
        this.elements.drop.remove();
      }
      document.querySelectorAll('body > .qmf-auth-drop').forEach((el) => el.remove());
      if (this.container) {
        this.container.querySelectorAll('.qmf-auth-wrap, .qmf-auth-login').forEach((el) => el.remove());
      }
      try {
        if (window.qmfAuthInitialized) window.qmfAuthInitialized = false;
      } catch (e) { /* ignore */ }
    }
  }

  window.AuthWidget = AuthWidget;
  window.QMFAuth = AuthWidget;
  window.createAuthWidget = function(config) {
    return new AuthWidget(config);
  };

  if (window.QMF) {
    window.QMF.createAuthWidget = window.createAuthWidget;
  }

  console.log(`[QMF Auth Widget] Module loaded v${VERSION}`);
})();
