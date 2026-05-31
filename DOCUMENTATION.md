# Share-UI - Hướng dẫn chi tiết
## Quizzman Shared UI Framework
**Version**: 2.1.0  
**Last Updated**: 2026-01-28

---

## 📋 Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
3. [Cách sử dụng](#3-cách-sử-dụng)
4. [Auth Scaffolding](#4-auth-scaffolding)
5. [Cách chỉnh sửa](#5-cách-chỉnh-sửa)
6. [Cách scale](#6-cách-scale)
7. [Assets và Logo](#7-assets-và-logo)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Tổng quan kiến trúc

### 1.1 Share-UI là gì?

Share-UI là **static file server** cung cấp:
- **QMF Framework** (Quizzman Modular Framework) - CSS + JS core
- **QMF Auth Scaffolding** - UI cho các trang đăng nhập (Webmail)
- **Logo assets** - Logo cho các apps (classroom, lms, webmail)
- **Shared components** - Header, footer, panels

### 1.2 Domain và Endpoints

| URL | Mục đích |
|-----|----------|
| `https://ui.quizzman.com` | Main domain |
| `https://ui.quizzman.com/qmf/dist/qmf.css` | Framework CSS |
| `https://ui.quizzman.com/qmf/dist/qmf.js` | Framework JS |
| `https://ui.quizzman.com/qmf/dist/qmf-auth.css` | Auth Scaffolding CSS |
| `https://ui.quizzman.com/qmf/assets/logo/classroom/` | Classroom logos |
| `https://ui.quizzman.com/qmf/assets/logo/lms/` | LMS logos |
| `https://ui.quizzman.com/qmf/assets/logo/webmail/` | Webmail logos |

### 1.3 Serving Method

Share-UI **KHÔNG chạy trên PM2**. Nó là static files được serve bởi **Nginx** trực tiếp.

```
Nginx (443) → /opt/quizzman-backup/quizzman-new/share-ui/qmf/
```

---

## 2. Cấu trúc thư mục

```
share-ui/
├── mail/                      # Email templates (separate)
├── DOCUMENTATION.md           # This file
└── qmf/                       # QMF Framework
    ├── .qmf-version           # Version tracking
    ├── README.md              # Technical docs
    ├── package.json           # Dependencies
    ├── nginx.conf             # Nginx config template
    ├── public-api.js          # Public API exports
    │
    ├── apps/                  # App-specific configs
    ├── assets/                # Static assets
    │   ├── logo/              # Logo images
    │   │   ├── classroom/     # Classroom app logos
    │   │   │   │   ├── classroom-logo.png          # Canonical source
    │   │   │   │   ├── classroom-logo-512.png      # Generated variant
    │   │   │   │   ├── classroom-logo-256.png      # Generated variant
    │   │   │   │   ├── classroom-logo-128.png      # Generated variant
    │   │   │   │   ├── classroom-logo-64.png       # Generated variant
    │   │   │   │   ├── classroom-logo-32.png       # Generated variant
    │   │   │   │   ├── classroom-logo-512-square.png # Canonical square source
    │   │   │   └── favicon.ico
    │   │   ├── lms/           # LMS app logos (same structure)
    │   │   └── webmail/       # Webmail logos (with dark background favicon)
    │   ├── icons/             # Icon library
    │   ├── sounds/            # Audio files
    │   └── images/            # Other images
    │
    ├── config/                # Configuration files
    ├── dist/                  # Built files (served to CDN)
    │   ├── qmf.js             # Main JS bundle
    │   ├── qmf.css            # Main CSS bundle
    │   ├── qmf-auth.css       # Auth Scaffolding CSS
    │   └── manifest.json      # Version info
    │
    ├── errors/                # Error page templates
    ├── feedback/              # Feedback components
    ├── kernel/                # Core modules (internal)
    │   ├── index.js           # Entry point
    │   ├── event-bus.js       # Pub/Sub messaging
    │   ├── core.js            # Lifecycle management
    │   ├── state.js           # State management
    │   ├── router.js          # SPA routing
    │   └── http.js            # HTTP client
    │
    ├── layout/                # Layout templates
    ├── navigation/            # Navigation components
    ├── platform/              # Platform detection
    ├── plugins/               # UI plugins
    │   ├── header/            # Header component
    │   ├── chat-panel/        # Chat panel
    │   └── notification-panel/ # Notification panel
    │
    ├── templates/             # HTML templates
    │   └── auth-login-example.html  # Example login page
    │
    ├── scripts/               # Build scripts
    │   └── build.js           # esbuild bundler
    │
    ├── services/              # Business logic
    │   ├── auth/              # Authentication
    │   ├── chat/              # Chat service
    │   ├── realtime/          # WebSocket adapters
    │   └── notification/      # Notification service
    │
    ├── templates/             # HTML templates
    ├── theme/                 # Theme/styling
    └── ui/                    # UI components
```

---

## 3. Cách sử dụng

### 3.1 Include trong HTML (Cách đơn giản)

```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <!-- QMF CSS -->
    <link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf.css">
    
    <!-- Favicon -->
    <link rel="icon" href="https://ui.quizzman.com/qmf/assets/logo/classroom/favicon.ico" type="image/x-icon">
</head>
<body>
    <!-- Your content -->
    
    <!-- QMF JS (at end of body) -->
    <script src="https://ui.quizzman.com/qmf/dist/qmf.js"></script>
</body>
</html>
```

### 3.2 Sử dụng với config

```html
<script>
    // Cấu hình trước khi load QMF
    window.QMF_CONFIG = {
        appId: 'classroom',
        appName: 'QuizzMan Classroom',
        features: {
            chat: true,
            notifications: true,
            sidebar: true
        },
        endpoints: {
            auth: 'https://id.quizzman.com',
            chat: 'https://chat.quizzman.com',
            notification: 'https://noti.quizzman.com'
        }
    };
</script>
<script src="https://ui.quizzman.com/qmf/dist/qmf.js"></script>
```

### 3.3 Sử dụng ES Modules

```javascript
import { 
    initQMF,
    eventBus,
    stateManager,
    authService,
    chatService,
    notificationService
} from 'https://ui.quizzman.com/qmf/dist/qmf.js';

// Khởi tạo
await initQMF({
    appId: 'my-app',
    features: { chat: true, notifications: true }
});
```

### 3.4 QMF Functions Available

| Function | Mô tả |
|----------|-------|
| `QMF.getAuthToken()` | Lấy JWT token từ cookie |
| `QMF.switchLanguage(lang)` | Chuyển đổi ngôn ngữ |
| `QMF.initMobileSidebar(options)` | Khởi tạo sidebar mobile |
| `QMF.initNotifications(config)` | Khởi tạo notification panel |
| `QMF.initChat(config)` | Khởi tạo chat panel |
| `QMF.initFriends(config)` | Khởi tạo friends panel |
| `QMF.initQAM(config)` | Khởi tạo Quick Access Menu |
| `QMF.loadScript(url)` | Dynamic script loading |

---

## 4. Auth Scaffolding (Webmail)

QMF Auth Scaffolding cung cấp UI tiêu chuẩn cho các trang xác thực (login, forgot password, etc.).

**⚠️ Lưu ý quan trọng:**
- Đây chỉ là **UI scaffolding**, không phải hệ thống xác thực
- Không thay đổi flow xác thực của id-sys
- Chỉ áp dụng cho Webmail (hoặc các app cần auth page riêng)

### 4.1 Include Auth CSS

```html
<!-- Thay vì qmf.css, dùng qmf-auth.css cho auth pages -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf-auth.css">
```

### 4.2 Cấu trúc HTML chuẩn

```html
<body class="qmf-auth-body">
  <div class="qmf-auth-card">
    <!-- Header với logo (gradient background giải quyết vấn đề logo trắng) -->
    <div class="qmf-auth-header">
      <div class="qmf-auth-logo-wrapper">
        <img src="logo.png" class="qmf-brand-logo">
      </div>
      <h1 class="qmf-brand-title">App Name</h1>
      <p class="qmf-brand-subtitle">Tagline</p>
    </div>

    <!-- Content area cho form -->
    <div class="qmf-auth-content">
      <h2 class="qmf-auth-title">Đăng nhập</h2>
      
      <form>
        <div class="qmf-auth-form-group">
          <label class="qmf-auth-label">Email</label>
          <div class="qmf-auth-input-wrapper">
            <i class="fas fa-envelope qmf-auth-input-icon"></i>
            <input type="email" class="qmf-auth-input" placeholder="your@email.com">
          </div>
        </div>
        
        <button type="submit" class="qmf-auth-btn qmf-auth-btn-primary">
          Đăng nhập
        </button>
      </form>
    </div>

    <!-- Footer -->
    <div class="qmf-auth-footer">
      <p class="qmf-auth-footer-text">© 2025 QuizzMan</p>
    </div>
  </div>
</body>
```

### 4.3 CSS Classes Available

| Class | Mô tả |
|-------|-------|
| `.qmf-auth-body` | Body container với gradient background |
| `.qmf-auth-card` | Card container chính |
| `.qmf-auth-card--dark` | Dark theme variant |
| `.qmf-auth-header` | Header với gradient (giải quyết logo trắng) |
| `.qmf-auth-logo-wrapper` | Container cho logo với backdrop |
| `.qmf-brand-logo` | Logo image |
| `.qmf-brand-title` | Title text |
| `.qmf-auth-content` | Content container |
| `.qmf-auth-form-group` | Form group wrapper |
| `.qmf-auth-label` | Form label |
| `.qmf-auth-input` | Input field |
| `.qmf-auth-input-wrapper` | Input với icon |
| `.qmf-auth-btn` | Button base |
| `.qmf-auth-btn-primary` | Primary button với gradient |
| `.qmf-auth-message` | Alert message |
| `.qmf-auth-message--error` | Error message |
| `.qmf-auth-message--success` | Success message |
| `.qmf-auth-divider` | Divider với text |
| `.qmf-auth-social-grid` | Social login buttons grid |
| `.qmf-auth-footer` | Footer area |

### 4.4 Webmail Specific

Cho Webmail, thêm class `qmf-auth-body--webmail`:

```html
<body class="qmf-auth-body qmf-auth-body--webmail">
```

### 4.5 Webmail Logo Assets

Logo webmail có favicon với dark background để tương phản:

```
https://ui.quizzman.com/qmf/assets/logo/webmail/webmail-logo.png       (256px)
https://ui.quizzman.com/qmf/assets/logo/webmail/webmail-logo-512.png
https://ui.quizzman.com/qmf/assets/logo/webmail/webmail-logo-128.png
https://ui.quizzman.com/qmf/assets/logo/webmail/webmail-logo-64.png
https://ui.quizzman.com/qmf/assets/logo/webmail/webmail-logo-32.png
https://ui.quizzman.com/qmf/assets/logo/webmail/favicon.ico            (với dark background)
```

### 4.6 Example Template

Xem file mẫu: `/share-ui/qmf/templates/auth-login-example.html`

---

## 5. Cách chỉnh sửa

### 5.1 Chỉnh sửa CSS

1. Sửa file trong `/share-ui/qmf/theme/` hoặc `/share-ui/qmf/dist/qmf.css`
2. Reload nginx:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

### 5.2 Chỉnh sửa JavaScript

1. Sửa file trong `/share-ui/qmf/kernel/` hoặc `/share-ui/qmf/services/`
2. Build lại (nếu cần):
   ```bash
   cd /opt/quizzman-backup/quizzman-new/share-ui/qmf
   npm run build:prod
   ```
3. Reload nginx

### 5.3 Thêm/Sửa Logo

1. Chuẩn bị canonical source trong `assets/logo/<subsystem>/`:
   - Logo thường: `<subsystem>-logo.png`
   - Nếu subsystem có family vuông riêng: `<subsystem>-logo-512-square.png`
2. Không commit các file làm việc tạm kiểu `logo-original.png`, `logo-trimmed.png`, `logo-with-bg.png` vào repo.
3. Regenerate toàn bộ variants bằng script chuẩn:
   ```bash
   cd /opt/Quizzman/qmf
   pnpm assets:logos
   ```
4. Build và deploy sẽ tự chạy bước này trước khi publish, nhưng vẫn nên chạy tay khi review asset locally.

### 5.4 Logo Convention

- `assets/logo/logo-config.json` là source of truth cho các subsystem và variant path.
- `<subsystem>-logo.png` là source chuẩn cho family logo thường.
- `<subsystem>-logo-512-square.png` là source chuẩn cho family square nếu subsystem cần logo vuông.
- Các file `-32`, `-64`, `-128`, `-256`, `-512`, `-square`, `favicon-16`, `favicon-32`, `favicon-48` đều là generated assets.
- Không sửa trực tiếp generated assets nếu chưa cập nhật source chuẩn tương ứng.
- Khi thêm subsystem mới, cập nhật `logo-config.json` trước, sau đó chạy `pnpm assets:logos`.

### 5.5 Favicon với Dark Background (cho logo trắng)

Nếu logo là trắng như webmail, chuẩn bị source đã có nền phù hợp ngay trong file canonical source. Sau đó để script `pnpm assets:logos` sinh lại các favicon PNG và logo sizes.

### 5.6 DMCA Badge

Badge DMCA được quản lý bởi main-sys:
- **ID**: `4a61669a-dd15-4fd2-8310-c184d1a1749a`
- **Image**: `https://images.dmca.com/Badges/dmca_protected_sml_120w.png?ID=4a61669a-dd15-4fd2-8310-c184d1a1749a`

```html
<a href="//www.dmca.com/Protection/Status.aspx?ID=4a61669a-dd15-4fd2-8310-c184d1a1749a" 
   title="DMCA.com Protection Status" class="dmca-badge">
    <img src="https://images.dmca.com/Badges/dmca_protected_sml_120w.png?ID=4a61669a-dd15-4fd2-8310-c184d1a1749a" 
         alt="DMCA.com Protection Status">
</a>
<script src="https://images.dmca.com/Badges/DMCABadgeHelper.min.js" async></script>
```

---

## 5. Cách Scale

### 5.1 Horizontal Scaling (Multiple Servers)

Share-UI là **static files**, scale rất đơn giản:

```
                 ┌────────────────┐
                 │  Load Balancer │
                 │  (Cloudflare)  │
                 └────────┬───────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
    ┌─────────┐      ┌─────────┐      ┌─────────┐
    │ Server1 │      │ Server2 │      │ Server3 │
    │ (Nginx) │      │ (Nginx) │      │ (Nginx) │
    └─────────┘      └─────────┘      └─────────┘
```

**Steps:**
1. Copy `/share-ui/qmf/` sang server mới
2. Configure nginx với cùng config
3. Thêm server vào load balancer

### 5.2 CDN Integration

Sử dụng Cloudflare hoặc CDN khác:

```nginx
# Nginx: Enable long cache for CDN
location /qmf/dist/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Access-Control-Allow-Origin "https://*.quizzman.com";
}
```

### 5.3 Versioning Strategy

**Pin version cho production:**
```html
<!-- Production: pin version -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/v2.1.0/dist/qmf.css">
<script src="https://ui.quizzman.com/qmf/v2.1.0/dist/qmf.js"></script>

<!-- Development: latest -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf.css">
<script src="https://ui.quizzman.com/qmf/dist/qmf.js"></script>
```

### 5.4 Cache Strategy

| File Pattern | Cache TTL | Strategy |
|--------------|-----------|----------|
| `qmf.{hash}.js/css` | 1 năm | Immutable |
| `qmf.js`, `qmf.css` | 1 phút | Short cache |
| `manifest.json` | 1 phút | Short cache |
| `assets/logo/*` | 1 ngày | Medium cache |

### 5.5 Nginx Config Template

```nginx
server {
    listen 443 ssl http2;
    server_name ui.quizzman.com;
    
    root /opt/quizzman-backup/quizzman-new/share-ui/qmf;
    
    # Compression
    gzip on;
    gzip_types text/css text/javascript application/javascript application/json;
    
    # Immutable assets
    location ~* \.[a-f0-9]{8,}\.(js|css)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # Stable entries
    location ~* ^/qmf/dist/(qmf\.(js|css)|manifest\.json)$ {
        add_header Cache-Control "public, max-age=60";
    }
    
    # Logo assets
    location /qmf/assets/logo/ {
        add_header Cache-Control "public, max-age=86400";
    }
    
    # CORS
    add_header Access-Control-Allow-Origin "https://*.quizzman.com";
}
```

---

## 6. Assets và Logo

### 6.1 Logo Sizes

| Size | Use Case |
|------|----------|
| 512px | High-res displays, hero sections |
| 256px | Default logo, cards |
| 128px | Headers, navigation |
| 64px | Small headers, mobile |
| 32px | Favicons, tiny icons |
| favicon.ico | Browser tabs |

### 6.2 Logo URLs

**Classroom:**
```
https://ui.quizzman.com/qmf/assets/logo/classroom/classroom-logo.png       (256px)
https://ui.quizzman.com/qmf/assets/logo/classroom/classroom-logo-512.png
https://ui.quizzman.com/qmf/assets/logo/classroom/classroom-logo-128.png
https://ui.quizzman.com/qmf/assets/logo/classroom/classroom-logo-64.png
https://ui.quizzman.com/qmf/assets/logo/classroom/classroom-logo-32.png
https://ui.quizzman.com/qmf/assets/logo/classroom/favicon.ico
```

**LMS:**
```
https://ui.quizzman.com/qmf/assets/logo/lms/lms-logo.png                   (256px)
https://ui.quizzman.com/qmf/assets/logo/lms/lms-logo-512.png
https://ui.quizzman.com/qmf/assets/logo/lms/lms-logo-128.png
https://ui.quizzman.com/qmf/assets/logo/lms/lms-logo-64.png
https://ui.quizzman.com/qmf/assets/logo/lms/lms-logo-32.png
https://ui.quizzman.com/qmf/assets/logo/lms/favicon.ico
```

---

## 7. Troubleshooting

### 7.1 CSS/JS không load

**Kiểm tra:**
```bash
# Test nginx config
sudo nginx -t

# Check nginx status
sudo systemctl status nginx

# Test file access
curl -I https://ui.quizzman.com/qmf/dist/qmf.css
```

**Fix:**
```bash
# Reload nginx
sudo systemctl reload nginx

# Check permissions
chmod -R 755 /opt/quizzman-backup/quizzman-new/share-ui/
```

### 7.2 Logo không hiển thị

**Kiểm tra:**
```bash
# Check file exists
ls -la /opt/quizzman-backup/quizzman-new/share-ui/qmf/assets/logo/classroom/

# Check nginx mime types
grep -i "image/png" /etc/nginx/mime.types
```

### 7.3 CORS Error

**Fix trong nginx.conf:**
```nginx
location /qmf/ {
    add_header Access-Control-Allow-Origin "https://*.quizzman.com";
    add_header Access-Control-Allow-Methods "GET, OPTIONS";
    add_header Access-Control-Allow-Headers "Origin, Content-Type";
}
```

### 7.4 Cache không cập nhật

**Clear cache:**
```bash
# Clear browser cache hoặc dùng query string
https://ui.quizzman.com/qmf/dist/qmf.css?v=20250128

# Hoặc dùng versioned URL
https://ui.quizzman.com/qmf/v2.1.0/dist/qmf.css
```

---

## 8. PM2 Services (Related)

Share-UI không dùng PM2, nhưng các services liên quan:

```bash
pm2 list
┌────┬────────────────────┬──────────┬──────┬───────────┐
│ id │ name               │ mode     │ ↺    │ status    │
├────┼────────────────────┼──────────┼──────┼───────────┤
│ 0  │ classroom-sys      │ fork     │ 5    │ online    │
│ 1  │ main-sys           │ fork     │ 0    │ online    │
│ 2  │ play-sys           │ fork     │ 0    │ online    │
└────┴────────────────────┴──────────┴──────┴───────────┘
```

**Commands:**
```bash
pm2 restart classroom-sys
pm2 restart main-sys
pm2 restart play-sys
pm2 save
pm2 logs <name>
```

---

## 9. Quick Commands Reference

```bash
# Reload share-ui (nginx)
sudo nginx -t && sudo systemctl reload nginx

# Check status
curl -I https://ui.quizzman.com/qmf/dist/qmf.js

# View nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Build QMF (nếu sửa source)
cd /opt/quizzman-backup/quizzman-new/share-ui/qmf
npm run build:prod

# Restart related services
pm2 restart all
pm2 save
```

---

© 2025 QuizzMan Team. All rights reserved.
