# QMF Frontend Configuration Guide

> **Version:** 2.1.0  
> **CDN Base:** `https://ui.quizzman.com`  
> **Last Updated:** February 2026

## Mục lục

1. [Quick Start](#quick-start)
2. [Logo & Favicon](#logo--favicon)
3. [Auth Page Themes](#auth-page-themes)
4. [Icons](#icons)
5. [CSS Framework](#css-framework)
6. [JavaScript Modules](#javascript-modules)
7. [Mail Templates](#mail-templates)

---

## Quick Start

### Minimal Setup

```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Favicon -->
    <link rel="icon" href="https://ui.quizzman.com/qmf/assets/logo/favicon.ico">
    
    <!-- QMF CSS -->
    <link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf.css">
    
    <title>My App</title>
</head>
<body>
    <!-- Your content -->
    
    <!-- QMF JS -->
    <script type="module" src="https://ui.quizzman.com/qmf/dist/qmf.js"></script>
</body>
</html>
```

### With SRI (Production)

Lấy hash từ manifest:
```bash
curl https://ui.quizzman.com/qmf/dist/manifest.json
```

```html
<link rel="stylesheet" 
      href="https://ui.quizzman.com/qmf/dist/qmf.css"
      integrity="sha384-..." 
      crossorigin="anonymous">
```

---

## Logo & Favicon

### Sử dụng Logo mặc định (Quizzman)

```html
<!-- Favicon -->
<link rel="icon" href="https://ui.quizzman.com/qmf/assets/logo/favicon.ico">

<!-- Logo image -->
<img src="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png" alt="Quizzman">

<!-- Hoặc dùng path ngắn -->
<img src="https://ui.quizzman.com/qmf/assets/logo/default/logo.png" alt="Quizzman">
```

### Sử dụng Logo theo Subsystem

| Subsystem | Logo | Favicon |
|-----------|------|---------|
| `classroom` | `/qmf/assets/logo/classroom/classroom-logo.png` | `/qmf/assets/logo/classroom/favicon.ico` |
| `lms` | `/qmf/assets/logo/lms/lms-logo.png` | `/qmf/assets/logo/lms/favicon.ico` |
| `play` | `/qmf/assets/logo/play/play-logo.png` | `/qmf/assets/logo/play/favicon.ico` |
| `webmail` | `/qmf/assets/logo/webmail/webmail-logo.png` | `/qmf/assets/logo/webmail/favicon.ico` |
| `id`, `main`, `admin`, `api` | Dùng logo mặc định | Dùng favicon mặc định |

### Logo Sizes

Mỗi subsystem có nhiều kích thước:

```html
<!-- 32x32 -->
<img src="https://ui.quizzman.com/qmf/assets/logo/classroom/classroom-logo-32.png">

<!-- 64x64 -->
<img src="https://ui.quizzman.com/qmf/assets/logo/classroom/classroom-logo-64.png">

<!-- 128x128 -->
<img src="https://ui.quizzman.com/qmf/assets/logo/classroom/classroom-logo-128.png">

<!-- 256x256 -->
<img src="https://ui.quizzman.com/qmf/assets/logo/classroom/classroom-logo-256.png">

<!-- 512x512 -->
<img src="https://ui.quizzman.com/qmf/assets/logo/classroom/classroom-logo-512.png">
```

### JavaScript Helper

```javascript
import { getLogoUrl, getFaviconUrl, applyFavicon } from 'https://ui.quizzman.com/qmf/assets/logo/logo-helper.js';

// Lấy logo URL theo subsystem
const logoUrl = await getLogoUrl('classroom');           // classroom logo
const defaultLogo = await getLogoUrl('id');              // quizzman-logo.png

// Lấy logo với size cụ thể
const logo128 = await getLogoUrl('lms', { size: 128 });

// Apply favicon vào document
await applyFavicon('webmail');

// Sync version (không cần await, cho SSR)
import { getLogoUrlsSync } from 'https://ui.quizzman.com/qmf/assets/logo/logo-helper.js';
const { logo, favicon } = getLogoUrlsSync('main');
```

---

## Auth Page Themes

### CSS File

```html
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf-auth.css">
```

### Available Themes

Thêm class vào `<body>`:

| Theme | Class | Mô tả |
|-------|-------|-------|
| Default | `qmf-auth-body` | Gradient tím (Purple/Indigo) |
| Light | `qmf-auth-body qmf-auth-body--light` | Nền sáng, gradient nhạt |
| Dark | `qmf-auth-body qmf-auth-body--dark` | Dark mode |
| Ocean | `qmf-auth-body qmf-auth-body--ocean` | Blue ocean gradient |
| Sunset | `qmf-auth-body qmf-auth-body--sunset` | Warm sunset colors |
| Forest | `qmf-auth-body qmf-auth-body--forest` | Green nature theme |
| Midnight | `qmf-auth-body qmf-auth-body--midnight` | Deep purple midnight |
| Custom | `qmf-auth-body qmf-auth-body--custom` | CSS variables |

### Ví dụ: Dark Theme

```html
<body class="qmf-auth-body qmf-auth-body--dark">
    <div class="qmf-auth-card">
        <div class="qmf-auth-header">
            <div class="qmf-auth-logo-wrapper">
                <img src="https://ui.quizzman.com/qmf/assets/logo/default/logo.png" 
                     class="qmf-brand-logo" alt="Logo">
            </div>
            <h1 class="qmf-brand-title">Quizzman</h1>
            <p class="qmf-brand-subtitle">Đăng nhập để tiếp tục</p>
        </div>
        <div class="qmf-auth-content">
            <!-- Form here -->
        </div>
    </div>
</body>
```

### Custom Theme với CSS Variables

```html
<body class="qmf-auth-body qmf-auth-body--custom">
```

```css
.qmf-auth-body--custom {
    --qmf-auth-bg-start: #1a1a2e;
    --qmf-auth-bg-mid: #16213e;
    --qmf-auth-bg-end: #0f3460;
    --qmf-auth-header-start: #e94560;
    --qmf-auth-header-end: #ff6b6b;
    --qmf-auth-primary: #e94560;
    --qmf-auth-card-bg: rgba(255, 255, 255, 0.98);
    --qmf-auth-text: #1a1a2e;
}
```

### Auth Components

#### Form Group

```html
<div class="qmf-auth-form-group">
    <label class="qmf-auth-label">Email</label>
    <div class="qmf-auth-input-wrapper">
        <span class="qmf-auth-input-icon">📧</span>
        <input type="email" class="qmf-auth-input" placeholder="you@example.com">
    </div>
</div>
```

#### Password với Toggle

```html
<div class="qmf-auth-form-group">
    <label class="qmf-auth-label">Password</label>
    <div class="qmf-auth-input-wrapper">
        <span class="qmf-auth-input-icon">🔒</span>
        <input type="password" class="qmf-auth-input" id="password">
        <button type="button" class="qmf-auth-password-toggle" onclick="togglePassword()">
            👁
        </button>
    </div>
</div>
```

#### 2FA Input

```html
<div class="qmf-auth-2fa-inputs">
    <input type="text" class="qmf-auth-2fa-input" maxlength="1">
    <input type="text" class="qmf-auth-2fa-input" maxlength="1">
    <input type="text" class="qmf-auth-2fa-input" maxlength="1">
    <input type="text" class="qmf-auth-2fa-input" maxlength="1">
    <input type="text" class="qmf-auth-2fa-input" maxlength="1">
    <input type="text" class="qmf-auth-2fa-input" maxlength="1">
</div>
```

#### Buttons

```html
<button class="qmf-auth-btn qmf-auth-btn-primary">Đăng nhập</button>
<button class="qmf-auth-btn qmf-auth-btn-secondary">Hủy</button>

<!-- Loading state -->
<button class="qmf-auth-btn qmf-auth-btn-primary qmf-auth-loading">
    <span class="qmf-auth-spinner"></span>
    Đang xử lý...
</button>
```

#### Messages

```html
<div class="qmf-auth-message qmf-auth-message--error">
    ❌ Sai mật khẩu
</div>
<div class="qmf-auth-message qmf-auth-message--success">
    ✅ Đăng nhập thành công
</div>
<div class="qmf-auth-message qmf-auth-message--warning">
    ⚠️ Tài khoản sắp hết hạn
</div>
<div class="qmf-auth-message qmf-auth-message--info">
    ℹ️ Vui lòng xác thực email
</div>
```

#### Divider

```html
<div class="qmf-auth-divider">
    <span>hoặc</span>
</div>
```

#### Social Login

```html
<div class="qmf-auth-social-grid">
    <button class="qmf-auth-social-btn">G</button>
    <button class="qmf-auth-social-btn">f</button>
    <button class="qmf-auth-social-btn">🍎</button>
</div>
```

#### Terms Checkbox

```html
<div class="qmf-auth-terms">
    <input type="checkbox" class="qmf-auth-checkbox" id="terms">
    <span class="qmf-auth-terms-text">
        Tôi đồng ý với <a href="#" class="qmf-auth-link">Điều khoản</a> 
        và <a href="#" class="qmf-auth-link">Chính sách bảo mật</a>
    </span>
</div>
```

---

## Icons

### SVG Sprites (Recommended)

```html
<!-- Include sprite once -->
<div style="display:none">
    <!-- Fetch and inject sprite.svg content -->
</div>

<!-- Use icons -->
<svg class="icon" width="24" height="24">
    <use href="https://ui.quizzman.com/qmf/assets/icons/sprite.svg#icon-user"></use>
</svg>
```

### Individual SVG

```html
<img src="https://ui.quizzman.com/qmf/assets/icons/svg/user.svg" alt="User" width="24" height="24">
```

### JavaScript Icon Loader

```javascript
import { getIcon, preloadIcons, QMFIcon } from 'https://ui.quizzman.com/qmf/assets/icons/icon-loader.js';

// Get icon SVG string
const userIcon = await getIcon('user', { 
    size: 24, 
    color: '#333',
    strokeWidth: 2 
});
document.getElementById('icon-container').innerHTML = userIcon;

// Preload common icons
await preloadIcons(['bell', 'menu', 'user', 'settings']);

// Use as custom element
// <qmf-icon name="bell" size="24" color="blue"></qmf-icon>
```

### Available Icons (80+)

```
arrow-down, arrow-left, arrow-right, arrow-up
bell, bookmark, calendar, camera
chart-bar, chart-pie, check, chevron-down, chevron-left, chevron-right, chevron-up
circle-alert, circle, clipboard, clock, copy
download, external-link, eye, eye-off
file, flag, folder, folder-open, globe
heart, house, image, info, key
link, loader, lock, log-in, log-out
mail, map-pin, maximize, menu, mic, minimize, minus, moon
navigation, pause, pencil, phone, play, plus
refresh-cw, rotate-ccw, rotate-cw
save, search, send, settings, share-2, shield, shield-check, square, star, sun
trash-2, trending-down, trending-up, triangle-alert
upload, user, user-check, user-minus, user-plus, users, user-x
video, x, zap
```

Xem full list: `https://ui.quizzman.com/qmf/assets/icons/svg/index.json`

---

## CSS Framework

### Core CSS

```html
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf.css">
```

Includes:
- CSS Reset/Normalize
- Typography
- Colors/Variables
- Utilities
- Components

### Hashed Version (Cache-busting)

```html
<!-- Check manifest.json for current hash -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf.24efe3d5.css">
```

### CSS Variables

```css
:root {
    /* Colors */
    --qmf-primary: #667eea;
    --qmf-primary-dark: #5a6fd6;
    --qmf-secondary: #764ba2;
    --qmf-success: #16a34a;
    --qmf-danger: #dc2626;
    --qmf-warning: #d97706;
    --qmf-info: #2563eb;
    
    /* Spacing */
    --qmf-spacing-xs: 4px;
    --qmf-spacing-sm: 8px;
    --qmf-spacing-md: 16px;
    --qmf-spacing-lg: 24px;
    --qmf-spacing-xl: 32px;
    
    /* Border Radius */
    --qmf-radius-sm: 4px;
    --qmf-radius-md: 8px;
    --qmf-radius-lg: 12px;
    --qmf-radius-xl: 24px;
    
    /* Shadows */
    --qmf-shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --qmf-shadow-md: 0 4px 6px rgba(0,0,0,0.1);
    --qmf-shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}
```

---

## JavaScript Modules

### Core Module

```javascript
import QMF from 'https://ui.quizzman.com/qmf/dist/qmf.js';

// Initialize
QMF.init({
    debug: false,
    theme: 'auto'
});

// Event Bus
QMF.events.on('user:login', (user) => console.log('Logged in:', user));
QMF.events.emit('user:login', { id: 1, name: 'John' });

// Context
QMF.context.set('user', { id: 1 });
const user = QMF.context.get('user');
```

### Individual Modules

```javascript
// Event Bus
import { eventBus } from 'https://ui.quizzman.com/qmf/dist/qmf.js';
eventBus.on('event', handler);
eventBus.emit('event', data);

// Context
import { context } from 'https://ui.quizzman.com/qmf/dist/qmf.js';
context.set('key', value);
context.get('key');
```

---

## Mail Templates

### Available Templates

| Template | File | Mô tả |
|----------|------|-------|
| Welcome | `welcome.html` | Email chào mừng user mới |
| Login Success | `login-success.html` | Thông báo đăng nhập thành công |
| Suspicious Login | `suspicious-login.html` | Cảnh báo đăng nhập đáng ngờ |
| Passcode OTP | `passcode-otp.html` | Gửi mã OTP |
| Reset Password | `reset-password.html` | Link đặt lại mật khẩu |
| Password Changed | `password-changed.html` | Xác nhận đổi mật khẩu |
| Verify Email | `verify-email.html` | Xác thực email |
| Account Locked | `account-locked.html` | Thông báo khóa tài khoản |
| Email Changed | `email-changed.html` | Thông báo đổi email |
| 2FA Enabled | `two-factor-enabled.html` | Xác nhận bật 2FA |

### Template Variables

Templates sử dụng format `{{variable}}`:

```html
<!-- Common variables -->
{{userName}}     - Tên user
{{userEmail}}    - Email user
{{appName}}      - Tên ứng dụng (Quizzman, Classroom, etc.)
{{supportEmail}} - Email support
{{year}}         - Năm hiện tại

<!-- Specific variables -->
{{otpCode}}      - Mã OTP (passcode-otp.html)
{{resetLink}}    - Link reset password
{{verifyLink}}   - Link xác thực email
{{loginTime}}    - Thời gian đăng nhập
{{deviceInfo}}   - Thông tin thiết bị
{{ipAddress}}    - Địa chỉ IP
{{location}}     - Vị trí địa lý
```

### i18n Support

Templates hỗ trợ đa ngôn ngữ qua file JSON:

```
/share-ui/mail/i18n/
├── vi.json    # Tiếng Việt
└── en.json    # English
```

Sử dụng trong backend:
```javascript
const i18n = require('./share-ui/mail/i18n/vi.json');
const subject = i18n.subjects.loginSuccess;
```

---

## Full Example: Login Page

```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đăng nhập - Quizzman</title>
    
    <!-- Favicon -->
    <link rel="icon" href="https://ui.quizzman.com/qmf/assets/logo/favicon.ico">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- QMF Auth CSS -->
    <link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf-auth.css">
</head>
<body class="qmf-auth-body qmf-auth-body--dark">
    <div class="qmf-auth-card">
        <!-- Header -->
        <div class="qmf-auth-header">
            <div class="qmf-auth-logo-wrapper">
                <img src="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png" 
                     class="qmf-brand-logo" 
                     alt="Quizzman">
            </div>
            <h1 class="qmf-brand-title">Quizzman</h1>
            <p class="qmf-brand-subtitle">Đăng nhập để tiếp tục</p>
        </div>
        
        <!-- Content -->
        <div class="qmf-auth-content">
            <form id="loginForm">
                <!-- Error Message (hidden by default) -->
                <div class="qmf-auth-message qmf-auth-message--error" id="errorMsg" style="display:none">
                    <span id="errorText"></span>
                </div>
                
                <!-- Email -->
                <div class="qmf-auth-form-group">
                    <label class="qmf-auth-label" for="email">Email</label>
                    <div class="qmf-auth-input-wrapper">
                        <input type="email" 
                               class="qmf-auth-input" 
                               id="email" 
                               placeholder="you@example.com"
                               required>
                    </div>
                </div>
                
                <!-- Password -->
                <div class="qmf-auth-form-group">
                    <label class="qmf-auth-label" for="password">Mật khẩu</label>
                    <div class="qmf-auth-input-wrapper">
                        <input type="password" 
                               class="qmf-auth-input" 
                               id="password" 
                               placeholder="••••••••"
                               required>
                        <button type="button" class="qmf-auth-password-toggle" onclick="togglePassword()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <!-- Remember + Forgot -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px">
                    <div class="qmf-auth-checkbox-wrapper">
                        <input type="checkbox" class="qmf-auth-checkbox" id="remember">
                        <label class="qmf-auth-checkbox-label" for="remember">Ghi nhớ đăng nhập</label>
                    </div>
                    <a href="/forgot-password" class="qmf-auth-link">Quên mật khẩu?</a>
                </div>
                
                <!-- Submit -->
                <button type="submit" class="qmf-auth-btn qmf-auth-btn-primary" id="submitBtn">
                    Đăng nhập
                </button>
            </form>
            
            <!-- Divider -->
            <div class="qmf-auth-divider">
                <span>hoặc đăng nhập với</span>
            </div>
            
            <!-- Social -->
            <div class="qmf-auth-social-grid">
                <button class="qmf-auth-social-btn" title="Google">G</button>
                <button class="qmf-auth-social-btn" title="Facebook">f</button>
                <button class="qmf-auth-social-btn" title="Apple">🍎</button>
            </div>
            
            <!-- Register link -->
            <p class="qmf-auth-text">
                Chưa có tài khoản? <a href="/register" class="qmf-auth-link">Đăng ký ngay</a>
            </p>
        </div>
        
        <!-- Footer -->
        <div class="qmf-auth-footer">
            <p class="qmf-auth-footer-text">© 2026 Quizzman. All rights reserved.</p>
        </div>
    </div>
    
    <script>
        function togglePassword() {
            const input = document.getElementById('password');
            input.type = input.type === 'password' ? 'text' : 'password';
        }
        
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            btn.classList.add('qmf-auth-loading');
            btn.innerHTML = '<span class="qmf-auth-spinner"></span> Đang xử lý...';
            
            // Your login logic here
            // await login(email, password);
        });
    </script>
</body>
</html>
```

---

## Support

- **CDN Status:** https://ui.quizzman.com/status
- **Manifest:** https://ui.quizzman.com/qmf/dist/manifest.json
- **Icons List:** https://ui.quizzman.com/qmf/assets/icons/svg/index.json
- **Logo Config:** https://ui.quizzman.com/qmf/assets/logo/logo-config.json
