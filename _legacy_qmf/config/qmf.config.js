/**
 * QMF Configuration
 * Unified configuration for all QMF-enabled applications
 * Version: 2.0.0
 */

export const QMF_CONFIG = {
  version: '2.0.0',
  
  // CDN & Assets
  cdn: {
    base: 'https://ui.quizzman.com',
    qmf: 'https://ui.quizzman.com/qmf',
    dist: 'https://ui.quizzman.com/qmf/dist',
    assets: 'https://ui.quizzman.com/qmf/assets'
  },
  
  // Logo paths
  logo: {
    main: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png',
    favicon: 'https://ui.quizzman.com/qmf/assets/logo/favicon.ico',
    classroom: 'https://ui.quizzman.com/qmf/assets/logo/classroom/classroom-logo-128.png',
    play: 'https://ui.quizzman.com/qmf/assets/logo/play/play-logo-128.png',
    lms: 'https://ui.quizzman.com/qmf/assets/logo/lms/lms-logo.png',
    webmail: 'https://ui.quizzman.com/qmf/assets/logo/webmail/webmail-logo-64.png'
  },
  
  // Services endpoints
  services: {
    id: {
      base: 'https://id.quizzman.com',
      auth: 'https://id.quizzman.com/module/auth.js',
      api: 'https://id.quizzman.com/api'
    },
    main: {
      base: 'https://quizzman.com',
      api: 'https://quizzman.com/api'
    },
    classroom: {
      base: 'https://quizzman.com/classroom',
      api: 'https://quizzman.com/api/classroom'
    },
    chat: {
      socket: 'wss://quizzman.com/chat-socket',
      api: 'https://quizzman.com/api/chat'
    },
    noti: {
      socket: 'wss://quizzman.com/noti-socket',
      api: 'https://quizzman.com/api/notifications'
    },
    dictionary: {
      base: 'https://quizzman.com/dictionary',
      api: 'https://quizzman.com/api/dict'
    }
  },
  
  // External resources
  external: {
    fonts: {
      inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
    },
    icons: {
      fontAwesome: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
    }
  },
  
  // DMCA badge (from main-sys)
  dmca: {
    id: '4a61669a-dd15-4fd2-8310-c184d1a1749a',
    verificationCode: 'ejRCNEZ6NzI1YUdwNllSZk80dlpNQT090',
    badgeUrl: 'https://images.dmca.com/Badges/dmca_protected_sml_120w.png?ID=4a61669a-dd15-4fd2-8310-c184d1a1749a',
    statusUrl: '//www.dmca.com/Protection/Status.aspx?ID=4a61669a-dd15-4fd2-8310-c184d1a1749a',
    helperScript: 'https://images.dmca.com/Badges/DMCABadgeHelper.min.js'
  },
  
  // Theme configuration
  theme: {
    colors: {
      primary: '#4f46e5',
      primaryLight: '#818cf8',
      primaryDark: '#3730a3',
      success: '#22c55e',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#3b82f6'
    },
    fonts: {
      primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }
  },
  
  // Feature flags
  features: {
    chat: true,
    notifications: true,
    realtime: true,
    friends: true,
    darkMode: true
  }
};

// Application-specific configs
export const APP_CONFIGS = {
  classroom: {
    appId: 'classroom',
    appName: 'Quizzman Classroom',
    pageTitle: 'Classroom',
    logo: 'https://ui.quizzman.com/qmf/assets/logo/classroom/classroom-logo-128.png',
    favicon: 'https://ui.quizzman.com/qmf/assets/logo/classroom/favicon.ico',
    features: {
      chat: true,
      notifications: true,
      realtime: true,
      friends: true
    },
    ui: {
      theme: 'auto',
      showHamburger: true
    }
  },
  
  play: {
    appId: 'play',
    appName: 'Quizzman Play',
    pageTitle: 'Play House',
    logo: 'https://ui.quizzman.com/qmf/assets/logo/play/play-logo-128.png',
    favicon: 'https://ui.quizzman.com/qmf/assets/logo/play/favicon.ico',
    features: {
      chat: true,
      notifications: true,
      realtime: true,
      friends: true
    },
    ui: {
      theme: 'dark',
      showHamburger: true
    }
  },
  
  main: {
    appId: 'main',
    appName: 'Quizzman',
    pageTitle: 'Home',
    logo: QMF_CONFIG.logo.main,
    favicon: 'https://ui.quizzman.com/qmf/assets/logo/favicon.ico',
    features: {
      chat: true,
      notifications: true,
      realtime: true,
      friends: true
    }
  },
  
  dictionary: {
    appId: 'dictionary',
    appName: 'Quizzman Dictionary',
    pageTitle: 'Dictionary',
    logo: QMF_CONFIG.logo.main,
    favicon: 'https://ui.quizzman.com/qmf/assets/logo/favicon.ico',
    features: {
      chat: false,
      notifications: true,
      realtime: false,
      friends: false
    }
  },
  
  lms: {
    appId: 'lms',
    appName: 'Quizzman LMS',
    pageTitle: 'Learning Management',
    logo: 'https://ui.quizzman.com/qmf/assets/logo/lms/lms-logo.png',
    favicon: 'https://ui.quizzman.com/qmf/assets/logo/lms/favicon.ico',
    features: {
      chat: true,
      notifications: true,
      realtime: true,
      friends: true
    }
  }
};

// Helper to get CSS variables from theme
export function getThemeCSS() {
  const { colors, fonts } = QMF_CONFIG.theme;
  return `
    :root {
      --qmf-primary: ${colors.primary};
      --qmf-primary-light: ${colors.primaryLight};
      --qmf-primary-dark: ${colors.primaryDark};
      --qmf-success: ${colors.success};
      --qmf-warning: ${colors.warning};
      --qmf-danger: ${colors.danger};
      --qmf-info: ${colors.info};
      --qmf-font-family: ${fonts.primary};
    }
  `;
}

// Helper to generate DMCA footer HTML
export function getDMCABadgeHTML() {
  const { dmca } = QMF_CONFIG;
  return `
    <a href="${dmca.statusUrl}" title="DMCA.com Protection Status" class="dmca-badge">
      <img src="${dmca.badgeUrl}" alt="DMCA.com Protection Status">
    </a>
    <script src="${dmca.helperScript}"></script>
  `;
}

// Helper to get meta tags
export function getDMCAMetaTag() {
  return `<meta name="dmca-site-verification" content="${QMF_CONFIG.dmca.verificationCode}">`;
}

export default QMF_CONFIG;
