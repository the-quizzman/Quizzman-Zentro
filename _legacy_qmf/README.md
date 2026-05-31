# QMF - Quizzman Modular Framework
## App Shell + UI Kit v2.0.0

QMF là một framework frontend nhẹ, được thiết kế như một **App Shell + UI Kit** cho các ứng dụng Quizzman.

---

## 🌐 Deployment

| Property | Value |
|----------|-------|
| **Domain** | `https://ui.quizzman.com` |
| **CDN Base** | `https://ui.quizzman.com/qmf/` |
| **Entry (stable)** | `/dist/qmf.js`, `/dist/qmf.css` |
| **Entry (immutable)** | `/dist/qmf.{hash}.js`, `/dist/qmf.{hash}.css` |
| **Manifest** | `/dist/manifest.json` |
| **Versioned** | `/v2.0.0/dist/...` (production pinned) |

---

## 📦 Dist Structure (Public Contract)

```
dist/
├── qmf.js              # Stable entry (re-export from hash bundle)
├── qmf.css             # Stable entry (import from hash css)
├── qmf.{hash}.js       # Immutable bundle (cache 1 year)
├── qmf.{hash}.css      # Immutable styles (cache 1 year)
└── manifest.json       # Version metadata + file hashes
```

**⚠️ Quan trọng**: Chỉ expose `dist/` lên CDN. Không public trực tiếp `kernel/`, `services/`, `plugins/` (source code).

---

## 🏗️ Architecture

```
qmf/
├── kernel/              # Core modules (internal)
│   ├── index.js         # Entry point, initQMF()
│   ├── event-bus.js     # Pub/Sub messaging
│   ├── core.js          # Lifecycle management
│   ├── state.js         # State management + persistence
│   ├── router.js        # SPA routing (thin integration layer)
│   └── http.js          # HTTP client adapter
│
├── services/            # Business logic layer (UI-independent)
│   ├── index.js         # Services barrel export
│   ├── realtime/        # WebSocket adapter (per-service sockets)
│   ├── auth/            # Authentication adapter (id.quizzman.com)
│   ├── chat/            # Chat logic (chat.quizzman.com socket)
│   └── notification/    # Notification logic (noti.quizzman.com socket)
│
├── plugins/             # UI components
│   ├── index.js         # UI plugins barrel export
│   ├── header/          # Header component (4-cluster layout)
│   ├── chat-panel/      # Chat panel UI
│   └── notification-panel/ # Notification panel UI
│
├── assets/              # Static assets
│   ├── logo/            # Logo images
│   ├── icons/           # Lucide icons (1668 icons)
│   ├── sounds/          # Audio files
│   └── images/          # Other images
│
├── scripts/             # Build tools
│   └── build.js         # esbuild bundler
│
├── dist/                # Built output (gitignored)
├── nginx.conf           # Nginx config for ui.quizzman.com
├── package.json
└── README.md
```

---

## 🔌 Service Architecture

Mỗi service kết nối với backend riêng, đảm bảo hoạt động độc lập:

| Service | API Base | WebSocket |
|---------|----------|-----------|
| **Auth** | `https://id.quizzman.com` | - |
| **Chat** | `https://chat.quizzman.com` | `wss://chat.quizzman.com` |
| **Notification** | `https://noti.quizzman.com` | `wss://noti.quizzman.com` |
| **Classroom** | `https://class.quizzman.com` | `wss://class.quizzman.com` |

**Lưu ý**: QMF không có API/socket chung. Mỗi service tự quản lý kết nối riêng.

---

## 🚀 Quick Start

### 1. Build

```bash
cd share-ui/qmf
npm install
npm run build:prod
```

### 2. Include QMF in HTML

```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My App</title>
    
    <!-- QMF Styles (stable entry) -->
    <link rel="stylesheet" 
          href="https://ui.quizzman.com/qmf/dist/qmf.css"
          crossorigin="anonymous">
</head>
<body>
    <!-- QMF Slots -->
    <div id="qmf-header"></div>
    <div id="app"></div>
    <div id="qmf-panels"></div>
    <div id="qmf-toasts"></div>
    
    <!-- QMF Framework (stable entry) -->
    <script type="module">
        import { 
            initQMF, 
            eventBus, 
            stateManager,
            authService,
            chatService,
            notificationService,
            initUI
        } from 'https://ui.quizzman.com/qmf/dist/qmf.js';
        
        // Initialize QMF
        await initQMF({
            appId: 'my-app',
            appName: 'My Application',
            
            // Service endpoints (mỗi service socket riêng)
            endpoints: {
                auth: 'https://id.quizzman.com',
                chat: 'https://chat.quizzman.com',
                chatSocket: 'wss://chat.quizzman.com',
                notification: 'https://noti.quizzman.com',
                notiSocket: 'wss://noti.quizzman.com'
            },
            
            // Features toggle
            features: {
                chat: true,
                notifications: true
            }
        });
        
        // Initialize UI
        await initUI({
            header: {
                container: '#qmf-header',
                brand: { logo: '/logo.png', name: 'My App' }
            },
            panels: '#qmf-panels',
            toasts: '#qmf-toasts'
        });
    </script>
</body>
</html>
```

### 3. Production với Version Pin

```html
<!-- Pin version để tránh auto-upgrade -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/v2.0.0/dist/qmf.css">
<script type="module" src="https://ui.quizzman.com/qmf/v2.0.0/dist/qmf.js"></script>
```

### 4. Với SRI (Subresource Integrity)

```html
<!-- Anti-tamper: verify hash -->
<link rel="stylesheet" 
      href="https://ui.quizzman.com/qmf/dist/qmf.css"
      integrity="sha384-HASH_HERE"
      crossorigin="anonymous">
<script type="module"
        src="https://ui.quizzman.com/qmf/dist/qmf.js"
        integrity="sha384-HASH_HERE"
        crossorigin="anonymous"></script>
```

---

## 📋 Import Rules

### ✅ Đúng: Import từ dist/qmf.js

```javascript
// Tất cả exports từ 1 entry duy nhất
import { 
    initQMF, 
    eventBus, 
    stateManager, 
    routeManager,
    authService,
    chatService,
    notificationService,
    initUI,
    getUIPlugin
} from 'https://ui.quizzman.com/qmf/dist/qmf.js';
```

### ❌ Sai: Import trực tiếp từ source paths

```javascript
// KHÔNG LÀM THẾ NÀY - sẽ không tồn tại trên CDN
import { eventBus } from '.../kernel/event-bus.js';
import { authService } from '.../services/auth/index.js';
```

---

## 🔧 API Reference

### Kernel

```javascript
// Event Bus
eventBus.on('event:name', callback);
eventBus.emit('event:name', data);
eventBus.off('event:name', callback);
eventBus.once('event:name', callback);

// State Manager
stateManager.set('key', value);
stateManager.get('key');
stateManager.subscribe('key', callback);

// Route Manager (thin layer - optional)
routeManager.navigate('/path');
routeManager.onChange(callback);
routeManager.getCurrentRoute();
```

### Services

```javascript
// Auth Service
await authService.init();
authService.getUser();
authService.getToken();
authService.logout();
authService.onAuthChange(callback);

// Chat Service (own socket)
await chatService.connect();
chatService.sendMessage(roomId, message);
chatService.onMessage(callback);
chatService.getUnreadCount();

// Notification Service (own socket)
await notificationService.connect();
notificationService.getNotifications();
notificationService.markAsRead(id);
notificationService.onNotification(callback);
notificationService.getUnreadCount();
```

### UI Plugins

```javascript
// Initialize UI
await initUI(config);

// Get plugin instance
const header = getUIPlugin('header');
header.setBrand({ logo, name });
header.updateBadges({ chat: 5, noti: 3 });

const chatPanel = getUIPlugin('chat-panel');
chatPanel.open();
chatPanel.close();

// Plugin lifecycle
plugin.mount(container, context);
plugin.unmount();
plugin.setState(partial);
```

---

## 🎨 Header Layout

### Desktop (4-Cluster)

```
┌─────────────────────────────────────────────────────────────────┐
│ [SubLogo+Title]    [MainLogo]    [Chat][Noti]    [Avatar ▼]     │
│   Cluster 1         Cluster 2      Cluster 3      Cluster 4     │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile (3-Cluster + Touch-bar)

```
┌─────────────────────────────────────────────────────────────────┐
│ [☰][SubLogo]        [Touch-bar Status]              [Avatar]    │
│  Cluster 1              Cluster 2                   Cluster 3   │
└─────────────────────────────────────────────────────────────────┘
```

### Header Config Schema

```javascript
initUI({
    header: {
        container: '#qmf-header',
        brand: {
            sub: { logo: '/app-logo.png', name: 'App Name', title: 'Page' },
            main: { logo: '/quizzman-logo.png' }
        },
        actions: ['chat', 'notifications'],  // toggle modules
        user: { dropdown: true },
        mobile: {
            hamburger: true,
            touchBar: {
                template: '{unreadNoti} thông báo • {unreadChat} tin nhắn'
            }
        }
    }
});
```

---

## 🔒 Cache Strategy

### Nginx Headers

```nginx
# Immutable files (hash in filename)
location ~* \.(js|css)$ {
    if ($uri ~* "\.[a-f0-9]{8,}\.(js|css)$") {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}

# Stable entries + manifest (short cache)
location ~* ^/qmf/dist/(qmf\.(js|css)|manifest\.json)$ {
    add_header Cache-Control "public, max-age=60";
}
```

### Cache Policy

| File Pattern | Cache-Control | TTL |
|--------------|---------------|-----|
| `qmf.{hash}.js/css` | `public, max-age=31536000, immutable` | 1 year |
| `qmf.js`, `qmf.css` | `public, max-age=60` | 1 min |
| `manifest.json` | `public, max-age=60` | 1 min |

---

## 🛠️ Build System

### Development

```bash
npm run dev      # Watch mode với source maps
npm run serve    # Serve dist folder tại localhost:9999
```

### Production

```bash
npm run build:prod   # Minified + content-hash + manifest
```

### Build Output

```javascript
// manifest.json
{
    "version": "2.0.0",
    "buildTime": "2026-01-28T10:00:00Z",
    "files": {
        "js": "qmf.a1b2c3d4.js",
        "css": "qmf.e5f6g7h8.css"
    },
    "integrity": {
        "js": "sha384-...",
        "css": "sha384-..."
    }
}
```

---

## 📡 Event Reference

### Auth Events
- `auth:login` - User logged in
- `auth:logout` - User logged out
- `auth:token-refresh` - Token refreshed
- `auth:error` - Auth error

### Chat Events
- `chat:connected` - Socket connected
- `chat:message` - New message received
- `chat:unread-update` - Unread count changed

### Notification Events
- `noti:connected` - Socket connected
- `noti:new` - New notification
- `noti:unread-update` - Unread count changed
- `noti:read` - Notification marked as read

### UI Events
- `ui:header-ready` - Header mounted
- `ui:panel-open` - Panel opened
- `ui:panel-close` - Panel closed
- `ui:touchbar-update` - Mobile touchbar data updated

---

## 🖥️ Server Setup

### 1. Copy Nginx Config

```bash
sudo cp nginx.conf /etc/nginx/sites-available/ui.quizzman.com
sudo ln -sf /etc/nginx/sites-available/ui.quizzman.com /etc/nginx/sites-enabled/
```

### 2. Test & Reload

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Required Headers

```nginx
# CORS for ESM modules
add_header Access-Control-Allow-Origin "https://*.quizzman.com";

# Content-Type
types {
    text/javascript js mjs;
    text/css css;
    application/json json;
}

# Compression
gzip on;
gzip_types text/javascript text/css application/json;
```

---

## 🌐 Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 80+ |
| Firefox | 75+ |
| Safari | 13.1+ |
| Edge | 80+ |

---

## 📝 Dependency Boundaries

### Services Layer (`services/*`)
- ✅ Dùng: `fetch`, `eventBus`, `stateManager`, WebSocket adapters
- ❌ Cấm: DOM manipulation, UI rendering

### Plugins Layer (`plugins/*`)
- ✅ Dùng: DOM, CSS, services (qua import)
- ❌ Cấm: Direct API calls (phải qua services)

### Kernel Layer (`kernel/*`)
- ✅ Provides: eventBus, stateManager, routeManager, httpClient
- ❌ Cấm: Business logic, UI code

---

## License

© 2026 Quizzman Team. All rights reserved.

Bảo lưu mọi quyền. Không được sao chép, phân phối hoặc sử dụng mà không có sự cho phép bằng văn bản.
