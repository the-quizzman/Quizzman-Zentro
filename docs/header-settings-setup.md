# Hướng Dẫn Tạo & Cấu Hình QMF Header + Settings Float

## Tổng Quan

Hệ thống QMF (QuizzMan Frontend) cung cấp 2 component chính:
- **Unified Header**: Header đồng nhất với brand, navigation và auth widget
- **Settings Float**: Nút floating để chuyển đổi ngôn ngữ và theme

## 1. Cấu Trúc File

```
/opt/Quizzman/QMF/
├── _src/modules/
│   ├── header/
│   │   ├── unified-header.js      # Logic header
│   │   └── unified-header.css     # Style header (optional)
│   ├── auth-widget/
│   │   ├── auth-widget.js         # Widget đăng nhập/user
│   │   └── auth-widget.css        # Style auth widget
│   └── settings-float/
│       ├── settings-float.js      # Floating settings
│       └── settings-float.css     # Style settings
└── dist/modules-v3/               # Distribution (bypass CF cache)
    ├── header/unified-header.js
    ├── auth-widget/
    │   ├── auth-widget.js
    │   └── auth-widget.css
    └── settings-float/
        ├── settings-float.js
        └── settings-float.css
```

## 2. Cài Đặt Cơ Bản

### 2.1 HTML Structure

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Lab Header CSS -->
    <link rel="stylesheet" href="css/lab-header.css?v=1">
</head>
<body>
    <!-- Header Container -->
    <div id="qmfHeader"></div>
    
    <!-- Toast Container -->
    <div id="qmf-toasts" class="qmf-toasts"></div>
    
    <!-- QMF Modules -->
    <script src="https://ui.quizzman.com/qmf/dist/modules-v3/header/unified-header.js"></script>
    <script src="https://ui.quizzman.com/qmf/dist/modules-v3/auth-widget/auth-widget.js"></script>
    <script src="https://ui.quizzman.com/qmf/dist/modules-v3/settings-float/settings-float.js"></script>
    
    <!-- Init -->
    <script>
    (function() {
        // 1. Tạo Header
        createUnifiedHeader('#qmfHeader', {
            pageTitle: 'Payments',
            brandName: 'Payment System'
        });
        
        // 2. Tạo Auth Widget
        setTimeout(() => {
            createAuthWidget('.lab-header__actions', {
                container: '.lab-header__actions'
            });
        }, 100);
        
        // 3. Tạo Settings Float
        setTimeout(() => {
            createSettingsFloat({
                position: 'bottom-right',
                showTheme: true,
                showLanguage: true
            });
        }, 200);
    })();
    </script>
</body>
</html>
```

### 2.2 CSS Variables (lab-header.css)

```css
:root {
  --qmf-header-h: 64px;
  --qmf-header-h-mobile: 56px;
  --qmf-header-bg: rgba(15, 23, 42, 0.85);
  --qmf-header-border: rgba(148, 163, 184, 0.1);
  --qmf-header-blur: blur(12px);
  --qmf-header-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  --qmf-header-text: #e2e8f0;
  --qmf-header-muted: #94a3b8;
}
```

## 3. Cấu Hình Unified Header

### 3.1 Options

```javascript
createUnifiedHeader('#qmfHeader', {
    // Brand
    logoSrc: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png',
    logoSrcDark: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-dark.png',
    brandName: 'QuizzMan',
    pageTitle: 'Payments',
    
    // URLs
    mainLogoUrl: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png',
    mainLogoLink: 'https://quizzman.com',
    loginUrl: 'https://id.quizzman.com/login',
    profileUrl: 'https://id.quizzman.com/profile',
    settingsUrl: 'https://id.quizzman.com/settings'
});
```

### 3.2 HTML Output

```html
<header class="lab-header" role="banner">
  <div class="lab-header__inner">
    <!-- Brand Left -->
    <a href="/" class="lab-header__brand">
      <picture>...</picture>
      <div class="lab-header__titles">
        <span class="lab-header__name">Payments</span>
        <span class="lab-header__sub">Payment Gateway</span>
      </div>
    </a>
    
    <!-- Center Logo -->
    <a href="https://quizzman.com" class="lab-header__qm-group">
      <picture>...</picture>
      <div class="lab-header__qm-texts">
        <span class="lab-header__qm-name">QuizzMan</span>
        <span class="lab-header__qm-sub">Payment System</span>
      </div>
    </a>
    
    <!-- Actions Right -->
    <div class="lab-header__actions">
      <!-- Auth widget sẽ chèn vào đây -->
    </div>
  </div>
</header>
```

## 4. Cấu Hình Auth Widget

### 4.1 Options

```javascript
createAuthWidget('.lab-header__actions', {
    container: '.lab-header__actions',
    apiEndpoint: '/api/auth/me',  // hoặc false để dùng localStorage
    loginUrl: 'https://id.quizzman.com/login',
    
    // Callbacks
    onUserLoad: (user) => {
        console.log('User loaded:', user);
    },
    onLogin: () => {
        window.location.href = 'https://id.quizzman.com/login';
    },
    onLogout: () => {
        console.log('Logged out');
    }
});
```

### 4.2 Fallback Auth (không cần API)

```javascript
// Nếu /api/auth/me trả về 404, auth-widget tự động:
// 1. Lấy user từ localStorage
// 2. Hoặc tạo basic user từ JWT token
// 3. Vẫn hiển thị avatar + tier badge
```

## 5. Cấu Hình Settings Float

### 5.1 Options

```javascript
createSettingsFloat({
    // Vị trí
    position: 'bottom-right',  // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    
    // Tính năng
    showTheme: true,      // Toggle dark/light mode
    showLanguage: true,   // Language selector
    
    // Ngôn ngữ
    languages: ['vi', 'en', 'zh', 'zht', 'kr', 'jp'],
    defaultLang: 'vi',
    
    // Storage key
    storageKey: 'qmf_settings'
});
```

### 5.2 Vị Trí CSS

```css
/* Bottom Right (default) */
.qmf-settings-float {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

/* Bottom Left */
.qmf-settings-float--left {
  right: auto;
  left: 20px;
}
```

## 6. Responsive Design

### 6.1 Breakpoints

```css
/* Desktop */
@media (min-width: 769px) {
  .lab-header__brand { display: flex; }
  .lab-header__qm-group { display: flex; }
}

/* Mobile */
@media (max-width: 768px) {
  .lab-header__brand { display: none; }  /* Ẩn brand left */
  .lab-header__qm-group { 
    margin: 0 auto;  /* Center logo */
  }
  .lab-header__actions {
    position: absolute;
    right: 12px;
  }
}
```

## 7. Theme Support

### 7.1 Dark Mode

```javascript
// Settings Float tự động xử lý
document.documentElement.setAttribute('data-theme', 'dark');

// CSS Variables
[data-theme="dark"] {
  --qmf-header-bg: rgba(15, 23, 42, 0.95);
  --qmf-header-text: #e2e8f0;
}
```

### 7.2 Logo Swap

```javascript
// Header tự động swap logo theo theme
const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
logo.src = isDark ? logoSrcDark : logoSrc;
```

## 8. Cache & Deployment

### 8.1 Cloudflare Cache Issue

```
Vấn đề: CF cache JS với max-age=1y, ?v=N không bypass được

Giải pháp: Tạo path mới mỗi lần deploy major
- modules/     → CF cached (old)
- modules-v2/  → New path (bypass cache)
- modules-v3/  → Next version
```

### 8.2 Deployment Steps

```bash
# 1. Update source
nano /opt/Quizzman/QMF/_src/modules/header/unified-header.js

# 2. Copy to new dist path
cat /opt/Quizzman/QMF/_src/modules/header/unified-header.js > \
    /opt/Quizzman/QMF/dist/modules-v3/header/unified-header.js

# 3. Update HTML to use new path
<script src="https://ui.quizzman.com/qmf/dist/modules-v3/...

# 4. Restart server
pm2 restart payment-sys --update-env
nginx -s reload
```

## 9. Troubleshooting

### 9.1 Duplicate Auth Widget

```javascript
// Auth widget có guard để tránh duplicate
if (window.qmfAuthInitialized || document.querySelector('.qmf-auth-wrap')) {
  console.log('[QMF Auth] Already exists, skipping duplicate');
  return;
}
window.qmfAuthInitialized = true;
```

### 9.2 Missing Settings Float

```javascript
// Đảm bảo script load trước khi gọi
<script src=".../settings-float.js"></script>
<script>
  // Dùng setTimeout để đảm bảo module loaded
  setTimeout(() => {
    if (typeof createSettingsFloat === 'function') {
      createSettingsFloat({...});
    }
  }, 100);
</script>
```

### 9.3 Check File Loaded

```bash
# Kiểm tra file qua CDN
curl -sI "https://ui.quizzman.com/qmf/dist/modules-v3/header/unified-header.js"

# Output mong đợi:
# HTTP/2 200
# last-modified: [recent date]
```

## 10. API Reference

### 10.1 Global Functions

```javascript
// Header
createUnifiedHeader(container, config)
window.UnifiedHeader  // Class

// Auth
createAuthWidget(container, config)
window.AuthWidget     // Class

// Settings
createSettingsFloat(config)
window.SettingsFloat  // Class
```

### 10.2 Events

```javascript
// Theme change
document.addEventListener('qmf-theme-change', (e) => {
  console.log('Theme:', e.detail.theme);
});

// Language change
document.addEventListener('qmf-language-change', (e) => {
  console.log('Language:', e.detail.lang);
});
```

## Ví Dụ Hoàn Chỉnh

Xem: `/opt/Quizzman/payment-sys/frontend/index.html`

---

**Version**: 3.0.0  
**Last Updated**: 2026-05-12  
**Maintainer**: QMF Team
