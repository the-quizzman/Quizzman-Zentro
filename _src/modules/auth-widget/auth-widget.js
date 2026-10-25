/**
 * QMF Auth Widget Component
 * User chip + macOS-style account menu + preferences sheet
 * @version 2.0.4
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

  const VERSION = '2.0.8';
  /* System UI stack — SF Pro on Apple, Segoe on Windows; no Inter-first */
  const FONT_STACK = 'var(--qmf-font-system, -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", system-ui, "Segoe UI", sans-serif)';
  const ID_SYS = 'https://id.quizzman.com';
  const ACCOUNT_PREFS_URL = ID_SYS + '/api/account/update-profile';
  const APP_ROLES = new Set(['personal', 'teacher', 'school', 'student']);
  const THEMES = new Set(['light', 'dark']);

  function readAuthToken() {
    return null;
  }

  function persistAccountPrefs(partial) {
    if (!partial || typeof partial !== 'object') return Promise.resolve(null);
    const sso = window.QuizzmanSSO || window.QuizzmanAuth || window.IdSysSSO;

    const getHeaders = () => {
      let t = null;
      try {
        t = sso?.getToken?.()
          || localStorage.getItem('jwt_token')
          || localStorage.getItem('authToken');
      } catch (e) { /* ignore */ }
      const h = { 'Content-Type': 'application/json', Accept: 'application/json' };
      if (t) h.Authorization = 'Bearer ' + t;
      return h;
    };

    let initialToken = null;
    try {
      initialToken = sso?.getToken?.()
        || localStorage.getItem('jwt_token')
        || localStorage.getItem('authToken');
    } catch (e) { /* ignore */ }
    const hasSession = !!(initialToken || /(?:^|; )(?:qm_id|id_at|jwt_token|authToken|session_id)=/.test(document.cookie || ''));
    if (!hasSession) return Promise.resolve(null);

    const doFetch = () => fetch(ACCOUNT_PREFS_URL, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(),
      body: JSON.stringify(partial),
    });

    return doFetch().then((res) => {
      if (res.status === 401 && sso && typeof sso.refreshAccessToken === 'function') {
        return sso.refreshAccessToken().then((ok) => {
          if (ok) return doFetch();
          return res;
        });
      }
      return res;
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
      auto: 'Tự động',
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
      auto: 'Auto',
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
      auto: '自动',
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
      auto: '自動',
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
      auto: '자동',
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
      auto: '自動',
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
      auto: 'Auto',
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
      auto: 'Auto',
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
      auto: 'Auto',
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
      auto: 'อัตโนมัติ',
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
      auto: 'Automático',
    },
  };

  const LANG_OPTIONS = [
    { id: 'auto', label: 'Auto', short: 'A' },
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
    { id: 'auto', label: 'Auto', flag: null },
    { id: 'VN', label: 'Việt Nam', flag: 'vn' },
    { id: 'US', label: 'United States', flag: 'us' },
    { id: 'TW', label: '台灣', flag: 'tw' },
    { id: 'CN', label: '中国大陆', flag: 'cn' },
    { id: 'JP', label: '日本', flag: 'jp' },
    { id: 'KR', label: '대한민국', flag: 'kr' },
    { id: 'SG', label: 'Singapore', flag: 'sg' },
    { id: 'AU', label: 'Australia', flag: 'au' },
    { id: 'FR', label: 'France', flag: 'fr' },
  ];

  const ROLE_OPTIONS = [
    { id: 'personal', label: { vi: 'Cá nhân', en: 'Personal', zh: '个人', zht: '個人', kr: '개인', jp: '個人', fr: 'Personnel', de: 'Persönlich', es: 'Personal', th: 'ส่วนตัว', pt: 'Pessoal' } },
    { id: 'teacher', label: { vi: 'Giáo viên', en: 'Teacher', zh: '教师', zht: '教師', kr: '교사', jp: '教師', fr: 'Enseignant', de: 'Lehrer', es: 'Profesor', th: 'ครู', pt: 'Professor' } },
    { id: 'school', label: { vi: 'Nhà trường', en: 'School', zh: '学校', zht: '學校', kr: '학교', jp: '学校', fr: 'École', de: 'Schule', es: 'Escuela', th: 'โรงเรียน', pt: 'Escola' } },
    { id: 'student', label: { vi: 'Học sinh', en: 'Student', zh: '学生', zht: '學生', kr: '학생', jp: '生徒', fr: 'Élève', de: 'Schüler', es: 'Estudiante', th: 'นักเรียน', pt: 'Aluno' } },
  ];

  function regionFlagImg(code, size) {
    const c = String(code || 'un').toLowerCase();
    const s = size || 20;
    return `<img class="qmf-auth-flag" src="https://flagcdn.com/w40/${c}.png" srcset="https://flagcdn.com/w80/${c}.png 2x" width="${s}" height="${Math.round(s * 0.75)}" alt="" loading="lazy" decoding="async">`;
  }

  function detectLangFromBrowser() {
    const nav = String(navigator.language || (navigator.languages && navigator.languages[0]) || 'vi').toLowerCase();
    if (nav === 'zht' || nav.startsWith('zh-t') || nav.includes('hant') || nav === 'zh-tw' || nav === 'zh-hk' || nav === 'zh-mo') return 'zht';
    if (nav === 'zh' || nav.startsWith('zh-') || nav.startsWith('zh')) return 'zh';
    if (nav.startsWith('ko')) return 'kr';
    if (nav.startsWith('ja')) return 'jp';
    if (nav.startsWith('fr')) return 'fr';
    if (nav.startsWith('de')) return 'de';
    if (nav.startsWith('es')) return 'es';
    if (nav.startsWith('th')) return 'th';
    if (nav.startsWith('pt')) return 'pt';
    if (nav.startsWith('en')) return 'en';
    if (nav.startsWith('vi')) return 'vi';
    return 'vi';
  }

  const REGION_CODES = new Set(REGION_OPTIONS.map((r) => r.id).filter((id) => id !== 'auto'));

  function detectRegionFromBrowser() {
    try {
      const langs = [navigator.language].concat(navigator.languages || []).filter(Boolean);
      for (let i = 0; i < langs.length; i++) {
        const m = String(langs[i]).match(/-([A-Za-z]{2})\b/);
        if (m) {
          const code = m[1].toUpperCase();
          if (REGION_CODES.has(code)) return code;
        }
      }
      const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '');
      if (/Ho_Chi_Minh|Saigon|Bangkok/i.test(tz)) return 'VN';
      if (/Taipei/i.test(tz)) return 'TW';
      if (/Shanghai|Beijing|Chongqing|Harbin|Hong_Kong/i.test(tz)) return 'CN';
      if (/Tokyo/i.test(tz)) return 'JP';
      if (/Seoul/i.test(tz)) return 'KR';
      if (/Singapore/i.test(tz)) return 'SG';
      if (/Sydney|Melbourne|Perth|Brisbane|Adelaide/i.test(tz)) return 'AU';
      if (/Paris/i.test(tz)) return 'FR';
      if (/New_York|Los_Angeles|Chicago|Denver|Phoenix|Anchorage|Honolulu/i.test(tz)) return 'US';
    } catch (e) { /* ignore */ }
    return 'VN';
  }

  /* Solid glyphs, optically centered in the viewBox (Heroicons-style). */
  const ICONS = {
    account: '<svg class="qmf-auth-ico" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 9a7 7 0 1 1 14 0H3Z"/></svg>',
    settings: '<svg class="qmf-auth-ico" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a5.993 5.993 0 0 1 1.585.91l1.55-.572a1 1 0 0 1 1.188.392l1.18 2.044a1 1 0 0 1-.205 1.251l-1.22 1.05c.10.0.1.2.074.81s-.025.54-.074.802l1.22 1.05a1 1 0 0 1 .205 1.251l-1.18 2.044a1 1 0 0 1-1.188.392l-1.55-.572a5.993 5.993 0 0 1-1.585.91l-.331 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a5.993 5.993 0 0 1-1.585-.91l-1.55.572a1 1 0 0 1-1.188-.392l-1.18-2.044a1 1 0 0 1 .205-1.251l1.22-1.05A6.04 6.04 0 0 1 3.357 10c0-.273.025-.54.074-.802l-1.22-1.05a1 1 0 0 1-.205-1.251l1.18-2.044a1 1 0 0 1 1.188-.392l1.55.572a5.993 5.993 0 0 1 1.585-.91l.331-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>',
    logout: '<svg class="qmf-auth-ico" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .192.168.1.5.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z"/><path fill="currentColor" d="M12.288 9.22a.75.75 0 0 1 1.06 0l1.97 1.97a.75.75 0 0 1 0 1.06l-1.97 1.97a.75.75 0 1 1-1.06-1.06l.69-.69H6.75a.75.75 0 0 1 0-1.5h6.228l-.69-.69a.75.75 0 0 1 0-1.06Z"/></svg>',
    chevron: '<svg class="qmf-auth-chevron" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path fill="currentColor" d="M2.7 4.3a.75.75 0 0 1 1.06 0L6 6.54l2.24-2.24a.75.75 0 1 1 1.06 1.06l-2.77 2.77a.75.75 0 0 1-1.06 0L2.7 5.36a.75.75 0 0 1 0-1.06Z"/></svg>',
    close: '<svg class="qmf-auth-ico" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/></svg>',
    rolePersonal: '<svg class="qmf-auth-role-ico" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.42 0-8 2.24-8 5v1.5c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V19c0-2.76-3.58-5-8-5Z"/></svg>',
    roleTeacher: '<svg class="qmf-auth-role-ico" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3Zm0 12.99L4.74 12 12 8.01 19.26 12 12 15.99ZM5 16.5v2.75C6.86 21.1 9.29 22 12 22s5.14-.9 7-2.75V16.5l-7 3.82L5 16.5Z"/></svg>',
    roleSchool: '<svg class="qmf-auth-role-ico" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 3 1 9h22L12 3Zm8 7H4v10h3v-6h4v6h9V10Zm-2 8h-2v-2h2v2Zm0-4h-2v-2h2v2Zm-4 4h-2v-2h2v2Zm0-4h-2v-2h2v2Z"/></svg>',
    roleStudent: '<svg class="qmf-auth-role-ico" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2Zm0 18H6V4h2v7l2.5-1.5L13 11V4h5v16Z"/></svg>',
    themeLight: '<svg class="qmf-auth-theme-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 4.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V5.25A.75.75 0 0 1 12 4.5Zm0 12a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 12 16.5ZM5.25 12a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Zm11.25-.75a.75.75 0 0 0 0 1.5H18a.75.75 0 0 0 0-1.5h-1.5ZM7.34 7.34a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06L7.34 8.4a.75.75 0 0 1 0-1.06Zm7.2 7.2a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06Zm1.06-7.2a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM8.4 14.54a.75.75 0 0 1 0 1.06L7.34 16.66a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z"/></svg>',
    themeDark: '<svg class="qmf-auth-theme-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 2.25 12c0 5.385 4.365 9.75 9.75 9.75 3.918 0 7.31-2.31 8.752-5.648Z"/></svg>',
    globe: '<svg class="qmf-auth-globe" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2.25A9.75 9.75 0 1 0 21.75 12 9.76 9.76 0 0 0 12 2.25Zm6.97 6h-2.58a13.4 13.4 0 0 0-1.22-3.15A8.28 8.28 0 0 1 18.97 8.25ZM12 3.75c.7 0 1.95 1.62 2.62 4.5H9.38C10.05 5.37 11.3 3.75 12 3.75ZM3.75 12c0-.6.07-1.18.2-1.74h3.2a15.3 15.3 0 0 0 0 3.48h-3.2A8.2 8.2 0 0 1 3.75 12Zm1.28 3.75h2.58c.3 1.17.7 2.25 1.22 3.15a8.28 8.28 0 0 1-3.8-3.15Zm2.58-7.5H4.03a8.28 8.28 0 0 1 3.8-3.15A13.4 13.4 0 0 0 7.61 8.25Zm1.77 7.5h5.24c-.67 2.88-1.92 4.5-2.62 4.5s-1.95-1.62-2.62-4.5Zm5.24-1.5H9.38a13.8 13.8 0 0 1 0-4.5h5.24a13.8 13.8 0 0 1 0 4.5Zm.62 4.65c.52-.9.92-1.98 1.22-3.15h2.58a8.28 8.28 0 0 1-3.8 3.15ZM16.85 13.74a15.3 15.3 0 0 0 0-3.48h3.2a8.2 8.2 0 0 1 0 3.48h-3.2Z"/></svg>',
  };

  const ROLE_ICONS = {
    personal: ICONS.rolePersonal,
    teacher: ICONS.roleTeacher,
    school: ICONS.roleSchool,
    student: ICONS.roleStudent,
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
    onGuest: null,
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
        if (window.__QMF_DEBUG__) console.log('[QMF Auth] Already exists, skipping duplicate');
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
        const saved = localStorage.getItem('qmf-lang')
          || localStorage.getItem('lab-ui-lang')
          || this._readLangCookie();
        if (saved === 'auto' || (saved && LABELS[saved])) this.prefs.lang = saved;
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

    _writeLangCookie(lang, src) {
      if (!lang) return;
      try {
        const host = location.hostname || '';
        const secure = location.protocol === 'https:' ? '; Secure' : '';
        const maxAge = `; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax${secure}`;
        const isQuizzman = host === 'quizzman.com' || host.endsWith('.quizzman.com');

        // Clear host-only cookie to prevent cookie shadowing if previously set without domain
        if (isQuizzman && host !== 'quizzman.com') {
          document.cookie = `qmf-lang=; path=/; max-age=0${secure}`;
          document.cookie = `qmf-lang-src=; path=/; max-age=0${secure}`;
        }

        if (isQuizzman) {
          document.cookie = `qmf-lang=${encodeURIComponent(lang)}${maxAge}; domain=.quizzman.com`;
          document.cookie = `qmf-lang-src=${encodeURIComponent(src || 'local')}${maxAge}; domain=.quizzman.com`;
        }
        document.cookie = `qmf-lang=${encodeURIComponent(lang)}${maxAge}`;
        document.cookie = `qmf-lang-src=${encodeURIComponent(src || 'local')}${maxAge}`;
      } catch (e) { /* ignore */ }
    }

    _readLangCookie() {
      return this.getCookie('qmf-lang');
    }

    _readLangSrcCookie() {
      const src = this.getCookie('qmf-lang-src');
      return src === 'local' || src === 'account' || src === 'detect' ? src : null;
    }

    _writeThemeCookie(theme) {
      if (!theme) return;
      try {
        const host = location.hostname || '';
        const secure = location.protocol === 'https:' ? '; Secure' : '';
        const maxAge = `; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax${secure}`;
        const isQuizzman = host === 'quizzman.com' || host.endsWith('.quizzman.com');

        if (isQuizzman && host !== 'quizzman.com') {
          document.cookie = `qmf-theme=; path=/; max-age=0${secure}`;
        }
        if (isQuizzman) {
          document.cookie = `qmf-theme=${encodeURIComponent(theme)}${maxAge}; domain=.quizzman.com`;
        }
        document.cookie = `qmf-theme=${encodeURIComponent(theme)}${maxAge}`;
      } catch (e) { /* ignore */ }
    }

    _readThemeCookie() {
      return this.getCookie('qmf-theme');
    }

    _paintLang(resolved, pref) {
      const applied = resolved || this.getLang();
      if (!applied) return;
      try {
        const htmlLang = applied === 'zht' ? 'zh-Hant'
          : (applied === 'jp' ? 'ja' : (applied === 'kr' ? 'ko' : applied));
        document.documentElement.lang = htmlLang;
        document.documentElement.setAttribute('data-lang', applied);
      } catch (e) { /* ignore */ }
      try {
        if (window.labI18n && typeof window.labI18n.setLang === 'function') {
          window.labI18n.setLang(applied, false);
        }
      } catch (e2) { /* ignore */ }
      try {
        if (window.QmfI18n && typeof window.QmfI18n.setLanguage === 'function') {
          window.QmfI18n.setLanguage(pref || applied, { emit: false });
        }
      } catch (e3) { /* ignore */ }
      try {
        const h = window.QMFHeader?.instance || (window.QMFShell && window.QMFShell.header);
        if (h && typeof h.applyI18n === 'function') {
          h.applyI18n();
        }
      } catch (e4) { /* ignore */ }
    }

    _broadcastPrefs(detail) {
      try {
        if (window.QmfPrefsDetect && typeof window.QmfPrefsDetect.broadcast === 'function') {
          window.QmfPrefsDetect.broadcast(detail);
          return;
        }
      } catch (e) { /* ignore */ }
      try {
        if (!window.__qmfPrefsBc) window.__qmfPrefsBc = new BroadcastChannel('qmf-prefs');
        window.__qmfPrefsBc.postMessage(detail);
      } catch (e2) { /* ignore */ }
      try {
        localStorage.setItem('qmf_prefs_signal', JSON.stringify(Object.assign({ t: Date.now() }, detail)));
      } catch (e3) { /* ignore */ }
    }

    loadPrefs() {
      let lang = this.config.lang;
      const lsLang = localStorage.getItem('qmf-lang')
        || localStorage.getItem('lab-ui-lang')
        || localStorage.getItem('lab-lang');
      const cookieLang = this._readLangCookie();
      const src = this._readLangSrcCookie();
      if (lsLang === 'auto') lang = 'auto';
      else if (cookieLang && (src === 'local' || !lsLang || cookieLang !== lsLang) && (cookieLang === 'auto' || LABELS[cookieLang])) lang = cookieLang;
      else if (lsLang === 'auto' || (lsLang && LABELS[lsLang])) lang = lsLang;
      else if (cookieLang === 'auto' || (cookieLang && LABELS[cookieLang])) lang = cookieLang;

      const cookieTheme = this._readThemeCookie();
      const theme = (cookieTheme && THEMES.has(cookieTheme) ? cookieTheme : null)
        || localStorage.getItem('qmf-theme')
        || localStorage.getItem('lab-theme')
        || document.documentElement.getAttribute('data-theme')
        || 'light';

      let region = localStorage.getItem('qmf-region')
        || localStorage.getItem('qlib-region')
        || 'VN';
      if (String(region).toLowerCase() === 'auto') region = 'auto';
      else region = String(region).toUpperCase();

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
          display: inline-grid;
          place-items: center;
          width: 36px;
          height: 36px;
          padding: 0;
          line-height: 0;
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
        .qmf-auth-login .qmf-auth-ico {
          width: 18px;
          height: 18px;
          margin: 0;
          display: block;
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
        .qmf-auth-avatar-wrap[data-tier="pro"] {
          --qmf-plan-ring: conic-gradient(from 180deg, #5e5ce6, #bf5af2, #ff9f0a, #5e5ce6);
        }
        .qmf-auth-avatar-wrap[data-tier="ultra"] {
          --qmf-plan-ring: conic-gradient(from 0deg, #64d2ff, #6366f1, #e11d48, #f59e0b, #06b6d4, #64d2ff);
        }
        .qmf-auth-avatar-wrap[data-tier="admin"] {
          --qmf-plan-ring: conic-gradient(from 90deg, #ff3b30, #ff6482, #ffd60a, #ff3b30);
        }
        .qmf-auth-avatar-wrap[data-tier="mod"] {
          --qmf-plan-ring: conic-gradient(from 210deg, #0a84ff, #64d2ff, #30d158, #0a84ff);
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
          font: 700 10px/1 ${FONT_STACK};
          letter-spacing: 0.02em;
          padding: 4px 7px;
          border-radius: 999px;
          background: #007aff;
          color: #fff;
          white-space: nowrap;
          flex-shrink: 0;
          text-transform: none;
        }
        /* Compact plan/role badges — Pro · Ultra · Admin · Mod */
        .qmf-auth-tier--pro {
          background: linear-gradient(135deg, #5e5ce6, #bf5af2);
          color: #fff;
        }
        .qmf-auth-tier--ultra {
          background: linear-gradient(135deg, #1c1c1e, #3a3a3c);
          color: #f5f5f7;
          box-shadow: 0 0 0 1px rgba(100, 210, 255, 0.45);
        }
        .qmf-auth-tier--admin {
          background: linear-gradient(135deg, #ff3b30, #ff6482);
          color: #fff;
        }
        .qmf-auth-tier--mod {
          background: linear-gradient(135deg, #0a84ff, #64d2ff);
          color: #fff;
        }
        .qmf-auth-tier--free {
          background: rgba(60, 60, 67, 0.12);
          color: #636366;
          box-shadow: inset 0 0 0 1px rgba(60, 60, 67, 0.12);
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-tier--free {
          background: rgba(235, 235, 245, 0.14);
          color: #aeaeb2;
          box-shadow: inset 0 0 0 1px rgba(235, 235, 245, 0.16);
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-tier--ultra {
          background: linear-gradient(135deg, #2c2c2e, #48484a);
          box-shadow: 0 0 0 1px rgba(100, 210, 255, 0.35);
        }

        .qmf-auth-chevron {
          width: 10px;
          height: 10px;
          display: block;
          flex-shrink: 0;
          opacity: 0.45;
          margin: 0 0 0 1px;
          transition: transform 0.18s ease, opacity 0.18s ease;
        }
        .qmf-auth-wrap--open .qmf-auth-chip > .qmf-auth-chevron {
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
        .qmf-auth-user-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .qmf-auth-user-name {
          font: 600 13px/1.25 ${FONT_STACK};
          color: var(--drop-text);
          letter-spacing: -0.01em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }
        .qmf-auth-drop .qmf-auth-tier {
          font: 700 9px/1 ${FONT_STACK};
          padding: 3px 7px;
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
          flex: 0 0 16px;
          display: block;
          overflow: visible;
          margin: 0;
          padding: 0;
          color: var(--drop-icon);
          vertical-align: middle;
          shape-rendering: geometricPrecision;
        }
        .qmf-auth-drop .qmf-auth-item > .qmf-auth-ico {
          /* Keep glyphs in a fixed optical column so they don't drift right */
          width: 16px;
          height: 16px;
          flex: 0 0 16px;
        }
        .qmf-auth-sheet__close .qmf-auth-ico {
          width: 14px;
          height: 14px;
          display: block;
          margin: 0;
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

        /* —— Preferences sheet (terracotta / card style) —— */
        .qmf-auth-sheet-root {
          --sheet-accent: #C88141;
          --sheet-accent-soft: rgba(200, 129, 65, 0.12);
          --sheet-label: #808080;
          --sheet-text: #222222;
          --sheet-border: #E8E8E8;
          --sheet-card: #FFFFFF;
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
          width: min(360px, 100%);
          max-height: min(84vh, 640px);
          overflow: auto;
          border-radius: 16px;
          border: 1px solid var(--sheet-border);
          background: #FFFFFF;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04);
          color: var(--sheet-text);
          transform: scale(0.96) translateY(8px);
          transition: transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.05);
        }
        .qmf-auth-sheet-root--open .qmf-auth-sheet {
          transform: scale(1) translateY(0);
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-sheet-root {
          --sheet-accent: #E0A06A;
          --sheet-accent-soft: rgba(224, 160, 106, 0.16);
          --sheet-label: #9A9A9E;
          --sheet-text: #F2F2F7;
          --sheet-border: rgba(255, 255, 255, 0.12);
          --sheet-card: #2C2C2E;
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-sheet {
          border-color: var(--sheet-border);
          background: #1C1C1E;
          color: var(--sheet-text);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
        }
        .qmf-auth-sheet__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 16px 10px;
          position: sticky;
          top: 0;
          background: inherit;
          z-index: 1;
        }
        .qmf-auth-sheet__title {
          margin: 0;
          font: 700 17px/1.25 ${FONT_STACK};
          letter-spacing: -0.02em;
          color: var(--sheet-text);
        }
        .qmf-auth-sheet__close {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border: none;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.06);
          color: var(--sheet-label);
          cursor: pointer;
          padding: 0;
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-sheet__close {
          background: rgba(255, 255, 255, 0.1);
          color: var(--sheet-label);
        }
        .qmf-auth-sheet__close:hover { opacity: 0.85; }
        .qmf-auth-sheet__body { padding: 4px 14px 10px; display: flex; flex-direction: column; gap: 10px; }

        .qmf-auth-pref {
          margin: 0;
          border-radius: 12px;
          background: var(--sheet-card);
          overflow: visible;
          position: relative;
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-pref {
          background: var(--sheet-card);
        }
        .qmf-auth-pref__label {
          padding: 12px 12px 0;
          font: 700 11px/1.2 ${FONT_STACK};
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--sheet-label);
        }
        .qmf-auth-pref__row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: 10px 12px 12px;
        }
        .qmf-auth-seg {
          flex: 1 1 auto;
          min-width: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 36px;
          padding: 0 10px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--sheet-text);
          font: 500 13px/1 ${FONT_STACK};
          cursor: pointer;
          transition: color 0.12s ease, background 0.12s ease;
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-seg {
          background: transparent;
        }
        .qmf-auth-seg:hover {
          color: var(--sheet-accent);
          background: var(--sheet-accent-soft);
        }
        .qmf-auth-seg--active {
          background: transparent;
          border: none;
          color: var(--sheet-accent);
          font-weight: 700;
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-seg--active {
          color: var(--sheet-accent);
          background: transparent;
        }
        .qmf-auth-theme-ico {
          display: block;
          flex-shrink: 0;
          opacity: 0.85;
        }
        .qmf-auth-seg--active .qmf-auth-theme-ico,
        .qmf-auth-seg:hover .qmf-auth-theme-ico {
          opacity: 1;
        }

        .qmf-auth-flag {
          display: block;
          width: 20px;
          height: 15px;
          object-fit: cover;
          border-radius: 3px;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
          flex-shrink: 0;
        }
        .qmf-auth-globe {
          display: block;
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          opacity: 0.85;
          color: var(--sheet-accent);
        }
        .qmf-auth-lang-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 20px;
          padding: 0 6px;
          border-radius: 6px;
          background: var(--sheet-accent-soft);
          color: var(--sheet-accent);
          font: 700 10px/1 ${FONT_STACK};
          letter-spacing: 0.02em;
          flex-shrink: 0;
        }
        .qmf-auth-dd {
          position: relative;
          z-index: 1;
          padding: 10px 12px 12px;
        }
        .qmf-auth-dd.is-open {
          z-index: 40;
        }
        .qmf-auth-sheet.has-dd-open {
          overflow: visible;
        }
        .qmf-auth-dd-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 42px;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid var(--sheet-border);
          background: var(--sheet-bg, rgba(255, 255, 255, 0.55));
          color: var(--sheet-text);
          font: 600 13px/1.2 ${FONT_STACK};
          cursor: pointer;
          text-align: left;
          transition: border-color 0.12s ease, box-shadow 0.12s ease;
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-dd-trigger {
          background: rgba(255, 255, 255, 0.06);
        }
        .qmf-auth-dd-trigger:hover,
        .qmf-auth-dd.is-open .qmf-auth-dd-trigger {
          border-color: var(--sheet-accent);
          box-shadow: 0 0 0 3px var(--sheet-accent-soft);
        }
        .qmf-auth-dd-trigger__label {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .qmf-auth-dd-trigger .qmf-auth-chevron {
          opacity: 0.55;
          transition: transform 0.16s ease;
        }
        .qmf-auth-dd.is-open .qmf-auth-dd-trigger .qmf-auth-chevron {
          transform: rotate(180deg);
        }
        .qmf-auth-dd-menu {
          display: none;
          position: absolute;
          z-index: 50;
          left: 12px;
          right: 12px;
          top: calc(100% - 4px);
          max-height: 220px;
          overflow: auto;
          padding: 6px;
          border-radius: 12px;
          border: 1px solid var(--sheet-border);
          background: #fff;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
          -webkit-overflow-scrolling: touch;
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-dd-menu {
          background: #2c2c2e;
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
        }
        .qmf-auth-dd.is-open .qmf-auth-dd-menu { display: block; }
        .qmf-auth-dd-opt {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 38px;
          padding: 8px 10px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--sheet-text);
          font: 500 13px/1.2 ${FONT_STACK};
          cursor: pointer;
          text-align: left;
        }
        .qmf-auth-dd-opt:hover {
          background: var(--sheet-accent-soft);
        }
        .qmf-auth-dd-opt.is-active,
        .qmf-auth-dd-opt[aria-selected="true"] {
          color: var(--sheet-accent);
          font-weight: 700;
          background: var(--sheet-accent-soft);
        }

        .qmf-auth-role-current {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 10px 12px 0;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid var(--sheet-border);
          background: transparent;
        }
        .qmf-auth-role-current__ico {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          color: var(--sheet-accent);
          background: var(--sheet-accent-soft);
          flex-shrink: 0;
        }
        .qmf-auth-role-current__ico .qmf-auth-role-ico {
          opacity: 1;
        }
        .qmf-auth-role-current__meta {
          min-width: 0;
          flex: 1;
        }
        .qmf-auth-role-current__name {
          font: 700 14px/1.25 ${FONT_STACK};
          color: var(--sheet-text);
        }
        .qmf-auth-role-current__hint {
          margin-top: 2px;
          font: 400 11px/1.3 ${FONT_STACK};
          color: var(--sheet-label);
        }
        .qmf-auth-role-note {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding: 10px 12px 12px;
        }
        .qmf-auth-role-note a {
          font: 600 12px/1.3 ${FONT_STACK};
          color: var(--sheet-accent);
          text-decoration: none;
        }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-role-note a {
          color: var(--sheet-accent);
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
          border-radius: 10px;
          background: var(--sheet-accent);
          color: #fff;
          font: 600 13px/1 ${FONT_STACK};
          cursor: pointer;
        }
        .qmf-auth-sheet__done:hover { filter: brightness(1.05); }
        :where([data-theme="dark"], .dark, .dark-mode) .qmf-auth-sheet__done {
          background: var(--sheet-accent);
          color: #1C1C1E;
        }

        @media (max-width: 480px) {
          .qmf-auth-drop { min-width: 220px; }
        }
      `;
    }

    getLang() {
      const pref = this.prefs?.lang;
      if (pref === 'auto') return detectLangFromBrowser();
      if (pref && LABELS[pref]) return pref;
      if (this.config.lang && LABELS[this.config.lang]) return this.config.lang;
      const saved = localStorage.getItem('lab-ui-lang') || localStorage.getItem('qmf-lang');
      if (saved === 'auto') return detectLangFromBrowser();
      if (saved && LABELS[saved]) return saved;
      if (window.labI18n?.lang && LABELS[window.labI18n.lang]) return window.labI18n.lang;
      return detectLangFromBrowser();
    }

    getRegion() {
      const pref = this.prefs?.region;
      if (!pref || String(pref).toLowerCase() === 'auto') return detectRegionFromBrowser();
      const up = String(pref).toUpperCase();
      return REGION_CODES.has(up) ? up : detectRegionFromBrowser();
    }

    labels() {
      return LABELS[this.getLang()] || LABELS.vi;
    }

    getToken() {
      return null;
    }

    getLoginUrl() {
      return this.config.loginUrl || (ID_SYS + '/login');
    }

    getLogoutUrl() {
      // Always land on id /login?logged_out=1 so HttpOnly refresh cannot resurrect
      // the session via silent refresh on the previous app page.
      const returnTo = window.location.href;
      try {
        const land = new URL((this.config.loginUrl || (ID_SYS + '/login')), window.location.origin);
        land.searchParams.set('logged_out', '1');
        try {
          const here = new URL(returnTo);
          if (here.hostname.endsWith('quizzman.com')
              && !(here.hostname === 'id.quizzman.com' && here.pathname.startsWith('/login'))) {
            land.searchParams.set('redirect', returnTo);
          }
        } catch (e0) { /* ignore */ }

        const logoutBase = new URL(this.config.logoutUrl || (ID_SYS + '/logout'), window.location.origin);
        logoutBase.searchParams.set('redirect_uri', land.toString());
        logoutBase.searchParams.set('redirect', land.toString());
        if (logoutBase.origin === window.location.origin) {
          return logoutBase.pathname + logoutBase.search;
        }
        return logoutBase.toString();
      } catch (e) { /* fall through */ }
      const land = ID_SYS + '/login?logged_out=1';
      const sep = String(this.config.logoutUrl || '').includes('?') ? '&' : '?';
      return (this.config.logoutUrl || (ID_SYS + '/logout')) + sep + 'redirect=' + encodeURIComponent(land);
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
      let t = String(raw || 'free').toLowerCase().trim();
      t = t.replace(/^quizzman[\s_-]*/i, '').replace(/[\s_-]+/g, '');
      if (['admin', 'superadmin', 'owner', 'root'].includes(t)) return 'admin';
      if (['mod', 'moderator', 'staff'].includes(t)) return 'mod';
      if (['ultra', 'elite', 'enterprise', 'legend', 'premium'].includes(t)) return 'ultra';
      if (['pro', 'professional', 'plus', 'basic'].includes(t)) return 'pro';
      if (t === 'free' || t === 'inactive' || t === 'starter') return 'free';
      return t || 'free';
    }

    /** Compact badge labels: Pro · Ultra · Admin · Mod (no Quizzman prefix). */
    resolvePlanTier(user) {
      const roleRaw =
        user?.role
        || user?.user_role
        || (Array.isArray(user?.roles) ? user.roles[0] : '')
        || window.qmTier?.role
        || '';
      const planRaw =
        window.qmTier?.tier
        || user?.tier
        || user?.plan_code
        || user?.plan
        || user?.subscription?.plan_code
        || user?.subscription?.tier
        || '';

      let tier = this.normalizeTier(roleRaw);
      if (tier !== 'admin' && tier !== 'mod') {
        tier = this.normalizeTier(planRaw || roleRaw || 'free');
      }

      // If a display name sneaks in (e.g. "Quizzman Pro"), strip brand + map.
      const labelRaw =
        window.qmTier?.label
        || window.qmTier?.name
        || user?.plan_name
        || user?.plan_label
        || user?.subscription?.plan_name
        || '';
      if (labelRaw && tier === 'free') {
        tier = this.normalizeTier(labelRaw);
      }

      const LABELS = { pro: 'Pro', ultra: 'Ultra', admin: 'Admin', mod: 'Mod' };
      const label = LABELS[tier] || '';
      return { tier, label };
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
      return Promise.resolve(null);
    }

    checkAuth() {
      const sso = window.QuizzmanSSO || window.QuizzmanAuth || window.IdSysSSO;
      if (sso?.getAuth) {
        sso.getAuth().then(auth => {
          if (auth.authenticated && auth.user) {
            this.user = auth.user;
            this.hydratePrefsFromUser(auth.user);
            this.renderUserChip();
            if (typeof this.config.onUserLoad === 'function') {
              this.config.onUserLoad(auth.user, { token: null });
            }
          } else {
            this.renderLoginBtn();
          }
        }).catch(() => this.renderLoginBtn());
        return;
      }
      if (sso?.handleCallback) {
        Promise.resolve(sso.handleCallback()).then(() => this.checkAuthFallback()).catch(() => this.checkAuthFallback());
        return;
      }
      this.checkAuthFallback();
    }

    checkAuthFallback() {
      const hint = window.QuizzmanSSO?.hasSessionHint?.() || /(?:^|; )qm_id=/.test(document.cookie || '');
      if (!hint) {
        this.renderLoginBtn();
        return;
      }
      this.refreshAccessToken().then((ok) => {
        if (ok) this.verifyWithBackend();
        else this.renderLoginBtn();
      });
    }

    getUserFromStorage() {
      try {
        const userData = localStorage.getItem('user') || localStorage.getItem('currentUser');
        if (userData) return JSON.parse(userData);
      } catch (e) {}
      return null;
    }

    verifyWithBackend(retryAfterRefresh) {
      const fetcher = window.QuizzmanSSO?.fetchWithRefresh || fetch;
      const opts = { credentials: 'include', headers: { Accept: 'application/json' } };

      fetcher(this.config.apiEndpoint, opts)
        .then(res => {
          if (res.status === 401 && !retryAfterRefresh) {
            return this.refreshAccessToken().then(ok => {
              if (ok) return this.verifyWithBackend(true);
              return { success: false };
            });
          }
          if (!res.ok) return { success: false };
          return res.json();
        })
        .then(data => {
          if (data && data.success && data.user) {
            this.user = data.user;
            this.hydratePrefsFromUser(data.user);
            this.renderUserChip();
            if (typeof this.config.onUserLoad === 'function') {
              this.config.onUserLoad(data.user, { token: null });
            }
          } else {
            this.renderLoginBtn();
          }
        })
        .catch(() => {
          if (!this.user) this.renderLoginBtn();
        });
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
      a.addEventListener('click', (e) => {
        const sso = window.QuizzmanSSO || window.QuizzmanAuth;
        if (sso && typeof sso.startLogin === 'function') {
          e.preventDefault();
          sso.startLogin();
        }
      });

      this.container.insertBefore(a, this.container.firstChild);
      this.elements.loginBtn = a;
      this.setLegatusAuthVisible(false);

      if (typeof this.config.onLogin === 'function') {
        a.addEventListener('click', (e) => this.config.onLogin(e));
      }
      if (typeof this.config.onGuest === 'function') {
        try { this.config.onGuest(); } catch (e) { /* ignore */ }
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
      const { tier, label: tierLabel } = this.resolvePlanTier(user);
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

      // Compact bar: paid/staff badges only (header CSS may hide this). Full badge lives in dropdown.
      if (this.config.showTierBadge && tierLabel) {
        const tierEl = document.createElement('span');
        tierEl.className = 'qmf-auth-tier qmf-auth-tier--' + tier;
        tierEl.textContent = tierLabel;
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
      const planBadge = (this.config.showTierBadge && tierLabel)
        ? `<span class="qmf-auth-tier qmf-auth-tier--${this._esc(tier)}" title="${this._esc(tierLabel)}">${this._esc(tierLabel)}</span>`
        : '';

      const settingsItem = this.config.showSettings
        ? `<button type="button" class="qmf-auth-item qmf-auth-settings-btn" role="menuitem">${ICONS.settings}<span class="qmf-auth-item__label">${lbl.settings}</span></button>`
        : '';

      drop.innerHTML = `
        <div class="qmf-auth-user">
          ${avatarBlock}
          <div class="qmf-auth-user-meta">
            <div class="qmf-auth-user-name-row">
              <div class="qmf-auth-user-name">${this._esc(nameShown)}</div>
              ${planBadge}
            </div>
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
        window.dispatchEvent(new CustomEvent('qmf:auth-ready', {
          detail: { user: this.user || null, token: null }
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

      const currentLang = LANG_OPTIONS.find((l) => l.id === (this.prefs.lang || lang)) || LANG_OPTIONS[0];
      const langOptions = LANG_OPTIONS.map((l) => {
        const selected = currentLang.id === l.id;
        const label = l.id === 'auto' ? lbl.auto : l.label;
        const short = l.id === 'auto' ? 'A' : l.short;
        return `<button type="button" class="qmf-auth-dd-opt${selected ? ' is-active' : ''}" data-pref="lang" data-value="${l.id}" role="option" aria-selected="${selected ? 'true' : 'false'}"><span class="qmf-auth-lang-badge">${this._esc(short)}</span><span>${this._esc(label)}</span></button>`;
      }).join('');

      const storedRegion = this.prefs.region || region;
      const currentRegion = REGION_OPTIONS.find((r) => r.id === storedRegion) || REGION_OPTIONS.find((r) => r.id === 'auto') || REGION_OPTIONS[0];
      const regionOptions = REGION_OPTIONS.map((r) => {
        const selected = (currentRegion.id === r.id);
        const label = r.id === 'auto' ? lbl.auto : r.label;
        const mark = r.id === 'auto' ? ICONS.globe : regionFlagImg(r.flag, 20);
        return `<button type="button" class="qmf-auth-dd-opt${selected ? ' is-active' : ''}" data-pref="region" data-value="${r.id}" role="option" aria-selected="${selected ? 'true' : 'false'}">${mark}<span>${this._esc(label)}</span></button>`;
      }).join('');

      const regionTriggerMark = currentRegion.id === 'auto'
        ? ICONS.globe
        : regionFlagImg(currentRegion.flag, 22);
      const regionTriggerLabel = currentRegion.id === 'auto' ? lbl.auto : currentRegion.label;
      const langTriggerLabel = currentLang.id === 'auto' ? lbl.auto : currentLang.label;
      const langTriggerShort = currentLang.id === 'auto' ? 'A' : currentLang.short;

      const roleId = (() => {
        const fromUser = this.user?.app_role || this.user?.ui_role || this.user?.persona;
        if (fromUser && APP_ROLES.has(fromUser)) return fromUser;
        if (role && APP_ROLES.has(role)) return role;
        return 'personal';
      })();
      const roleOpt = ROLE_OPTIONS.find((r) => r.id === roleId) || ROLE_OPTIONS[0];
      const roleText = roleOpt.label[lang] || roleOpt.label.en;
      const roleIco = ROLE_ICONS[roleId] || ICONS.rolePersonal;

      root.innerHTML = `
        <div class="qmf-auth-sheet-scrim" data-sheet-dismiss></div>
        <div class="qmf-auth-sheet" data-prefs-sheet>
          <div class="qmf-auth-sheet__head">
            <h2 class="qmf-auth-sheet__title">${lbl.prefsTitle}</h2>
            <button type="button" class="qmf-auth-sheet__close" data-sheet-dismiss aria-label="${lbl.done}">${ICONS.close}</button>
          </div>
          <div class="qmf-auth-sheet__body">
            <section class="qmf-auth-pref">
              <div class="qmf-auth-pref__label">${lbl.appearance}</div>
              <div class="qmf-auth-pref__row">
                <button type="button" class="qmf-auth-seg${theme === 'light' ? ' qmf-auth-seg--active' : ''}" data-pref="theme" data-value="light">${ICONS.themeLight}<span>${lbl.light}</span></button>
                <button type="button" class="qmf-auth-seg${theme === 'dark' ? ' qmf-auth-seg--active' : ''}" data-pref="theme" data-value="dark">${ICONS.themeDark}<span>${lbl.dark}</span></button>
              </div>
            </section>
            <section class="qmf-auth-pref">
              <div class="qmf-auth-pref__label">${lbl.language}</div>
              <div class="qmf-auth-dd" data-dd="lang">
                <button type="button" class="qmf-auth-dd-trigger" data-dd-trigger aria-haspopup="listbox" aria-expanded="false">
                  <span class="qmf-auth-lang-badge" data-lang-badge>${this._esc(langTriggerShort)}</span>
                  <span class="qmf-auth-dd-trigger__label" data-lang-label>${this._esc(langTriggerLabel)}</span>
                  ${ICONS.chevron}
                </button>
                <div class="qmf-auth-dd-menu" role="listbox" hidden data-dd-menu>
                  ${langOptions}
                </div>
              </div>
            </section>
            <section class="qmf-auth-pref">
              <div class="qmf-auth-pref__label">${lbl.region}</div>
              <div class="qmf-auth-dd" data-dd="region">
                <button type="button" class="qmf-auth-dd-trigger" data-dd-trigger aria-haspopup="listbox" aria-expanded="false">
                  <span data-region-mark>${regionTriggerMark}</span>
                  <span class="qmf-auth-dd-trigger__label" data-region-label>${this._esc(regionTriggerLabel)}</span>
                  ${ICONS.chevron}
                </button>
                <div class="qmf-auth-dd-menu" role="listbox" hidden data-dd-menu>
                  ${regionOptions}
                </div>
              </div>
            </section>
            <section class="qmf-auth-pref">
              <div class="qmf-auth-pref__label">${lbl.role}</div>
              <div class="qmf-auth-role-current">
                <div class="qmf-auth-role-current__ico">${roleIco}</div>
                <div class="qmf-auth-role-current__meta">
                  <div class="qmf-auth-role-current__name">${this._esc(roleText)}</div>
                </div>
              </div>
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

      const sheetEl = root.querySelector('[data-prefs-sheet]');
      const setDdOpen = (dd, open) => {
        if (!dd) return;
        const trigger = dd.querySelector('[data-dd-trigger]');
        const menu = dd.querySelector('[data-dd-menu]');
        dd.classList.toggle('is-open', open);
        if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (menu) menu.hidden = !open;
        const anyOpen = !!root.querySelector('.qmf-auth-dd.is-open');
        if (sheetEl) sheetEl.classList.toggle('has-dd-open', anyOpen);
      };
      const closeAllDd = (except) => {
        root.querySelectorAll('.qmf-auth-dd.is-open').forEach((dd) => {
          if (dd !== except) setDdOpen(dd, false);
        });
      };

      const onKey = (e) => {
        if (e.key === 'Escape') {
          const openDd = root.querySelector('.qmf-auth-dd.is-open');
          if (openDd) {
            setDdOpen(openDd, false);
            return;
          }
          this.closePrefsSheet();
        }
      };
      this._prefsKeyHandler = onKey;
      document.addEventListener('keydown', onKey);

      root.addEventListener('click', (e) => {
        const dismiss = e.target.closest('[data-sheet-dismiss]');
        if (dismiss) {
          this.closePrefsSheet();
          return;
        }

        const trigger = e.target.closest('[data-dd-trigger]');
        if (trigger) {
          e.preventDefault();
          const dd = trigger.closest('.qmf-auth-dd');
          const willOpen = !dd.classList.contains('is-open');
          closeAllDd(dd);
          setDdOpen(dd, willOpen);
          return;
        }

        if (!e.target.closest('.qmf-auth-dd')) {
          closeAllDd();
        }

        const seg = e.target.closest('[data-pref]');
        if (!seg) return;
        const key = seg.getAttribute('data-pref');
        const value = seg.getAttribute('data-value');
        if (key === 'region' || key === 'lang') {
          const dd = seg.closest('.qmf-auth-dd');
          if (dd) setDdOpen(dd, false);
        }
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
      const appRole = user.app_role || user.ui_role || user.persona;
      let changed = false;
      const seed = {};
      const src = this._readLangSrcCookie()
        || (function () { try { return localStorage.getItem('qmf-prefs-source'); } catch (e) { return null; } })();
      const localLang = this.prefs.lang
        || (function () {
          try { return localStorage.getItem('qmf-lang') || localStorage.getItem('lab-ui-lang'); }
          catch (e) { return null; }
        })()
        || this._readLangCookie();
      const userChoseLang = src === 'local' || localLang === 'auto';

      if (lang === 'auto' || (lang && LABELS[lang])) {
        if (userChoseLang && localLang) {
          this.prefs.lang = localLang;
          const resolved = localLang === 'auto' ? detectLangFromBrowser() : localLang;
          this._paintLang(resolved, localLang);
          if (localLang !== lang) {
            seed.language = localLang;
          }
        } else if (!userChoseLang) {
          this.prefs.lang = lang;
          try {
            localStorage.setItem('qmf-lang', lang);
            localStorage.setItem('lab-lang', lang);
            localStorage.setItem('lab-ui-lang', lang);
            localStorage.setItem('qss_ui_lang', lang);
            localStorage.setItem('qmf-prefs-source', 'account');
            this._writeLangCookie(lang === 'auto' ? detectLangFromBrowser() : lang, 'account');
          } catch (e) { /* ignore */ }
          this._paintLang(lang === 'auto' ? detectLangFromBrowser() : lang, lang);
          changed = true;
        }
      } else if (this.prefs.lang === 'auto' || (this.prefs.lang && LABELS[this.prefs.lang])) {
        seed.language = this.prefs.lang;
      }

      if (region) {
        const r = String(region).toLowerCase() === 'auto' ? 'auto' : String(region).toUpperCase();
        this.prefs.region = r;
        try { localStorage.setItem('qmf-region', this.prefs.region); } catch (e) { /* ignore */ }
        changed = true;
      } else if (this.prefs.region) {
        seed.region = this.prefs.region;
      }

      const localTheme = (function () {
        try {
          return localStorage.getItem('qmf-theme') || localStorage.getItem('lab-theme');
        } catch (e) { return null; }
      })();
      const resolvedTheme = (localTheme && THEMES.has(localTheme))
        ? localTheme
        : (theme && THEMES.has(theme) ? theme : null);

      if (resolvedTheme) {
        if (theme && localTheme && THEMES.has(localTheme) && localTheme !== theme) {
          seed.theme = localTheme;
        }
        this.prefs.theme = resolvedTheme;
        try {
          localStorage.setItem('qmf-theme', resolvedTheme);
          localStorage.setItem('lab-theme', resolvedTheme);
          localStorage.setItem('qm-theme', resolvedTheme);
        } catch (e) { /* ignore */ }
        this._writeThemeCookie(resolvedTheme);
        document.documentElement.setAttribute('data-theme', resolvedTheme);
        const isDark = resolvedTheme === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
        if (document.body) {
          document.body.classList.toggle('qmf-dark', isDark);
          document.body.classList.toggle('qm-theme-light', !isDark);
        }
        try { document.documentElement.style.colorScheme = resolvedTheme; } catch (e) { /* ignore */ }
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
        window.dispatchEvent(new CustomEvent('qmf:prefs-change', {
          detail: { ...this.prefs, source: userChoseLang ? 'local' : 'account' },
        }));
        if (window.QmfI18n && typeof window.QmfI18n.hydrateFromUser === 'function' && !userChoseLang) {
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

      if (key === 'lang' && (value === 'auto' || LABELS[value])) {
        this.prefs.lang = value;
        const resolved = value === 'auto' ? detectLangFromBrowser() : value;
        try {
          localStorage.setItem('qmf-lang', value);
          localStorage.setItem('lab-lang', value);
          localStorage.setItem('lab-ui-lang', value);
          localStorage.setItem('qss_ui_lang', value);
          localStorage.setItem('preferred_language', value);
          localStorage.setItem('qmf-prefs-source', 'local');
          this._writeLangCookie(resolved, 'local');
        } catch (e) { /* ignore */ }
        this._paintLang(resolved, value);
        this._broadcastPrefs({
          lang: resolved,
          pref: value,
          theme: this.prefs.theme,
          region: this.prefs.region,
          source: 'local',
        });
        const langDetail = { lang: resolved, pref: value, source: 'local' };
        window.dispatchEvent(new CustomEvent('qmf:langchange', { detail: langDetail }));
        window.dispatchEvent(new CustomEvent('qmf:lang-change', { detail: langDetail }));
        document.dispatchEvent(new CustomEvent('qmf:langchange', { detail: langDetail }));
        document.dispatchEvent(new CustomEvent('qmf:lang-change', { detail: langDetail }));
        serverPatch.language = value;
        needsSoftReload = false;
      }

      if (key === 'theme' && THEMES.has(value)) {
        this.prefs.theme = value;
        try {
          localStorage.setItem('qmf-theme', value);
          localStorage.setItem('lab-theme', value);
          localStorage.setItem('qm-theme', value);
        } catch (e) { /* ignore */ }
        this._writeThemeCookie(value);
        document.documentElement.setAttribute('data-theme', value);
        const isDark = value === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
        if (document.body) {
          document.body.classList.toggle('qmf-dark', isDark);
          document.body.classList.toggle('qm-theme-light', !isDark);
        }
        try { document.documentElement.style.colorScheme = value; } catch (e) { /* ignore */ }
        try {
          let meta = document.querySelector('meta[name="theme-color"]');
          if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            document.head.appendChild(meta);
          }
          meta.setAttribute('content', value === 'dark' ? '#0f172a' : '#ffffff');
        } catch (e) { /* ignore */ }
        const detail = { theme: value, source: 'auth-widget' };
        window.dispatchEvent(new CustomEvent('qmf:themechange', { detail }));
        window.dispatchEvent(new CustomEvent('qmf:theme-change', { detail }));
        document.dispatchEvent(new CustomEvent('qmf:themechange', { detail }));
        document.dispatchEvent(new CustomEvent('qmf:theme-change', { detail }));
        document.dispatchEvent(new CustomEvent('qmf-theme-change', { detail: value }));
        serverPatch.theme = value;
        // Theme updates DOM live; no page reload needed
      }

      if (key === 'region' && (value === 'auto' || REGION_CODES.has(String(value).toUpperCase()))) {
        const stored = value === 'auto' ? 'auto' : String(value).toUpperCase();
        this.prefs.region = stored;
        const resolved = stored === 'auto' ? detectRegionFromBrowser() : stored;
        try { localStorage.setItem('qmf-region', stored); } catch (e) { /* ignore */ }
        window.dispatchEvent(new CustomEvent('qmf:region-change', { detail: { region: resolved, pref: stored } }));
        serverPatch.region = stored;
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

      window.dispatchEvent(new CustomEvent('qmf:prefs-change', { detail: { ...this.prefs, source: 'local' } }));
      if (typeof this.config.onPrefsChange === 'function') {
        this.config.onPrefsChange({ ...this.prefs }, key, value);
      }

      if (root) {
        root.querySelectorAll(`[data-pref="${key}"]`).forEach((btn) => {
          const on = btn.getAttribute('data-value') === value;
          btn.classList.toggle('qmf-auth-seg--active', on);
          btn.classList.toggle('qmf-auth-role-btn--active', on);
          btn.classList.toggle('is-active', on);
          if (btn.hasAttribute('aria-selected')) {
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
          }
        });
        if (key === 'region') {
          const opt = REGION_OPTIONS.find((r) => r.id === value);
          const labelEl = root.querySelector('[data-region-label]');
          const markWrap = root.querySelector('[data-region-mark]');
          if (opt && labelEl) labelEl.textContent = opt.id === 'auto' ? this.labels().auto : opt.label;
          if (opt && markWrap) {
            markWrap.innerHTML = opt.id === 'auto' ? ICONS.globe : regionFlagImg(opt.flag, 22);
          }
        }
        if (key === 'lang') {
          const opt = LANG_OPTIONS.find((l) => l.id === value);
          const labelEl = root.querySelector('[data-lang-label]');
          const badgeEl = root.querySelector('[data-lang-badge]');
          const lbl = this.labels();
          if (opt && labelEl) labelEl.textContent = opt.id === 'auto' ? lbl.auto : opt.label;
          if (opt && badgeEl) badgeEl.textContent = opt.id === 'auto' ? 'A' : opt.short;

          const titleEl = root.querySelector('.qmf-auth-sheet__title');
          if (titleEl) titleEl.textContent = lbl.prefsTitle;
          const doneBtns = root.querySelectorAll('[data-sheet-dismiss]');
          doneBtns.forEach((btn) => {
            if (btn.classList.contains('qmf-auth-sheet__done')) btn.textContent = lbl.done;
            else btn.setAttribute('aria-label', lbl.done);
          });
          const prefLabels = root.querySelectorAll('.qmf-auth-pref__label');
          if (prefLabels[0]) prefLabels[0].textContent = lbl.appearance;
          if (prefLabels[1]) prefLabels[1].textContent = lbl.language;
          if (prefLabels[2]) prefLabels[2].textContent = lbl.region;
          if (prefLabels[3]) prefLabels[3].textContent = lbl.role;
          const segLight = root.querySelector('[data-pref="theme"][data-value="light"] span');
          if (segLight) segLight.textContent = lbl.light;
          const segDark = root.querySelector('[data-pref="theme"][data-value="dark"] span');
          if (segDark) segDark.textContent = lbl.dark;
          this.refreshMenuLabels();
        }
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
      const domains = ['.quizzman.com', 'quizzman.com', window.location.hostname, ''];
      ['jwt_token', 'authToken', 'session_id', 'refresh_token'].forEach((name) => {
        domains.forEach((domain) => {
          const d = domain ? `; domain=${domain}` : '';
          document.cookie = `${name}=; path=/${d}; expires=${expire}; max-age=0; Secure; SameSite=Lax`;
          document.cookie = `${name}=; path=/${d}; expires=${expire}; max-age=0`;
        });
      });

      [
        'authToken', 'jwt_token', 'token', 'auth_token', 'session_id',
        'user', 'currentUser', 'auth_user', 'userData', 'quizzman_auth_token', 'quizzman_user_data',
      ].forEach((key) => {
        try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
        try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ }
      });

      try { sessionStorage.setItem('qm_force_logged_out', String(Date.now())); } catch (e) { /* ignore */ }
      try { window.__QM_ACCESS_TOKEN__ = null; } catch (e) { /* ignore */ }
      this.user = null;
    }

    async logout() {
      const url = this.getLogoutUrl();

      try {
        const sso = window.QuizzmanSSO || window.IdSysSSO || window.QuizzmanAuth;
        if (sso && typeof sso.logout === 'function') {
          await Promise.race([
            Promise.resolve(sso.logout(false)),
            new Promise((resolve) => setTimeout(resolve, 2000)),
          ]);
        } else {
          await Promise.race([
            fetch('https://id.quizzman.com/logout', {
              method: 'GET',
              credentials: 'include',
              redirect: 'manual',
            }).catch(() => null),
            new Promise((resolve) => setTimeout(resolve, 2000)),
          ]);
        }
      } catch (e) { /* ignore */ }

      // 2) Clear visible local cookies / storage on this subdomain
      try { this.clearLocalSession(); } catch (e) { /* ignore */ }

      try {
        if (typeof this.config.onLogout === 'function') this.config.onLogout();
      } catch (e) {
        console.warn('[QMF Auth] onLogout error', e);
      }

      try { this.setLegatusAuthVisible(false); } catch (e) { /* ignore */ }

      // 3) Navigate to GET /logout as belt-and-suspenders cookie clear + redirect
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

  if (window.__QMF_DEBUG__) console.log(`[QMF Auth Widget] Module loaded v${VERSION}`);
})();
