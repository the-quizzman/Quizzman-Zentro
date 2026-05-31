# QMF Path Registry

📍 **URL**: https://ui.quizzman.com/docs/paths

## Giới thiệu

Đây là registry chính thức công bố tất cả các đường dẫn (paths) của UI components trong Quizzman Shared UI Framework (QMF). Các site và ứng dụng có thể sử dụng registry này để import các component cần thiết.

## Cách sử dụng

### 1. Xem danh sách paths (Web UI)

Truy cập: **https://ui.quizzman.com/docs/paths**

Trang web này hiển thị tất cả các paths có sẵn, được phân loại theo:
- Core Framework (CSS, JS)
- Auth Scaffolding
- Plugins
- UI Components
- Services & Kernel
- Assets (Logos, Icons)
- App-specific configs
- Webmail templates

### 2. Import programmatically (JSON)

Tải file JSON: **https://ui.quizzman.com/docs/paths/paths.json**

```javascript
// Fetch paths registry
const response = await fetch('https://ui.quizzman.com/docs/paths/paths.json');
const registry = await response.json();

// Get specific path
const qmfCssPath = registry.baseUrl + registry.paths.core.css.latest;
// => "https://ui.quizzman.com/qmf/dist/qmf.css"

// Get logo path
const classroomLogoPath = registry.baseUrl + registry.paths.assets.logo.classroom;
// => "https://ui.quizzman.com/qmf/assets/logo/classroom/"
```

## Base URL

```
https://ui.quizzman.com
```

## Quick Reference - Common Paths

### Core Framework

```html
<!-- CSS Framework -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf.css">

<!-- JavaScript Framework -->
<script src="https://ui.quizzman.com/qmf/dist/qmf.js"></script>

<!-- Auth Scaffolding (for login pages) -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf-auth.css">
```

### ES6 Module Imports

```javascript
// Import full API
import QMF from 'https://ui.quizzman.com/qmf/public-api.js';

// Import specific modules
import { router } from 'https://ui.quizzman.com/qmf/kernel/router.js';
import { QMFButton } from 'https://ui.quizzman.com/qmf/ui/button/index.js';
import { toastManager } from 'https://ui.quizzman.com/qmf/feedback/toast.js';
```

### Logos

```html
<!-- Classroom -->
<img src="https://ui.quizzman.com/qmf/assets/logo/classroom/logo.svg">

<!-- LMS -->
<img src="https://ui.quizzman.com/qmf/assets/logo/lms/logo.svg">

<!-- Webmail -->
<img src="https://ui.quizzman.com/qmf/assets/logo/webmail/logo.svg">
```

## Versioning

QMF hỗ trợ multiple versions:

```html
<!-- Latest (recommended) -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf.css">

<!-- Specific version -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/v3.0.0/qmf.css">

<!-- Legacy version -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/v2.2.1/qmf.css">
```

## Integration Examples

### Example 1: Basic Classroom App

```html
<!DOCTYPE html>
<html>
<head>
    <title>Classroom</title>
    
    <!-- QMF Core -->
    <link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf.css">
    
    <!-- Theme -->
    <link rel="stylesheet" href="https://ui.quizzman.com/qmf/theme/dark.css">
</head>
<body>
    <div id="app"></div>
    
    <!-- QMF JS -->
    <script src="https://ui.quizzman.com/qmf/dist/qmf.js"></script>
    
    <script>
        // Initialize QMF
        QMF.runtime.init({
            appName: 'classroom',
            theme: 'dark'
        });
    </script>
</body>
</html>
```

### Example 2: Login Page with Auth Scaffolding

```html
<!DOCTYPE html>
<html>
<head>
    <title>Login - Webmail</title>
    
    <!-- QMF Core + Auth -->
    <link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf.css">
    <link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf-auth.css">
</head>
<body class="qmf-auth-page">
    <div class="qmf-auth-container">
        <img src="https://ui.quizzman.com/qmf/assets/logo/webmail/logo.svg" 
             alt="Webmail" class="qmf-auth-logo">
        
        <form class="qmf-auth-form">
            <!-- Login form -->
        </form>
    </div>
</body>
</html>
```

### Example 3: ES6 Module Import

```javascript
// app.js
import QMF from 'https://ui.quizzman.com/qmf/public-api.js';
import { authService } from 'https://ui.quizzman.com/qmf/services/auth/index.js';

// Initialize app
QMF.runtime.init({
    appName: 'lms',
    routes: [
        { path: '/', component: 'dashboard' },
        { path: '/courses', component: 'courses' }
    ]
});

// Use services
authService.login({ username, password })
    .then(() => {
        QMF.router.navigate('/dashboard');
    });
```

## For Site Integrators

Nếu bạn đang tích hợp QMF vào site của mình:

1. **Xác định components cần thiết**: Xem danh sách tại https://ui.quizzman.com/docs/paths
2. **Import paths**: Sử dụng paths từ registry
3. **Follow versioning**: Sử dụng specific version hoặc latest
4. **Test**: Đảm bảo CORS và CDN hoạt động đúng

## CORS & CDN

Tất cả resources được serve với CORS headers cho phép cross-origin requests. CDN được cấu hình để cache static assets.

## Support

- 📧 Email: admin@quizzman.com
- 📖 Full Documentation: https://ui.quizzman.com/qmf/docs/FRONTEND_CONFIG_GUIDE.md
- 🔧 Integration Guide: /opt/quizzman-backup/quizzman-new/share-ui/INTEGRATION_GUIDE.md

## Version History

- **v3.0.0** (2026-02) - Current stable, modular architecture
- **v2.2.1** (Legacy) - Maintained for backward compatibility

---

**Last Updated**: 2026-02-04  
**Registry Version**: 1.0.0
