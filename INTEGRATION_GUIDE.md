# Share-UI Integration Guide
## Hướng dẫn nhúng Header, Chat, Notification, Footer cho các ứng dụng QuizzMan

**Version**: 2.3.0  
**Last Updated**: 2026-02-03

---

## 📋 Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Quick Start](#2-quick-start)
3. [Header Component](#3-header-component)
   - [3.5 Header 3-Zone Layout (v2.1.0+)](#35-header-3-zone-layout-v210)
4. [Chat Component](#4-chat-component)
5. [Notification Component](#5-notification-component)
6. [Footer Component](#6-footer-component)
7. [Loading Screen Component](#7-loading-screen-component) ⭐ NEW
8. [URL Path Configuration](#8-url-path-configuration)
9. [Authentication Integration](#9-authentication-integration)
10. [Event System](#10-event-system)
11. [Advanced Customization](#11-advanced-customization)
12. [Troubleshooting](#12-troubleshooting)
13. [Complete Example](#13-complete-example)

---

## 1. Tổng quan

Share-UI (`ui.quizzman.com`) là CDN chính cung cấp **tất cả frontend modules** dùng chung cho hệ sinh thái QuizzMan, bao gồm cả UI modules của Chat và Notification.

### 1.1 Kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                     ui.quizzman.com (Share-UI)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Header  │  │   Chat   │  │   Noti   │  │  Footer + Utils  │ │
│  │    UI    │  │    UI    │  │    UI    │  │                  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                │              │
         │                │              │
         ▼                ▼              ▼
    (Static files)   WebSocket      WebSocket
                     connection     connection
                         │              │
                         ▼              ▼
              ┌──────────────┐  ┌──────────────┐
              │chat.quizzman │  │noti.quizzman │
              │   .com       │  │   .com       │
              │  (Backend)   │  │  (Backend)   │
              └──────────────┘  └──────────────┘
```

### 1.2 Components

| Component | Chức năng | UI Module (Share-UI) | Backend Service |
|-----------|-----------|----------------------|-----------------|
| **Header** | Navigation, Logo, User dropdown | `unified-header.js` | - |
| **Chat** | Realtime messaging, typing, reactions | `qmf-chat.js` | `chat.quizzman.com` |
| **Notification** | Push notifications, categories | `noti-embed.js` | `noti.quizzman.com` |
| **Footer** | Copyright, links, social icons | `footer.js` | - |

### 1.3 CDN Base URLs (tất cả từ Share-UI)

```plaintext
# Main CDN - Host tất cả UI modules
https://ui.quizzman.com/qmf/dist/

# Versioned (recommended for production)
https://ui.quizzman.com/qmf/dist/v3.0.0/

# UI Modules (tất cả host trên Share-UI)
https://ui.quizzman.com/qmf/dist/modules/header/    # Header UI
https://ui.quizzman.com/qmf/dist/modules/chat/      # Chat UI (frontend only)
https://ui.quizzman.com/qmf/dist/modules/notification/  # Notification UI (frontend only)

# Backend Services (WebSocket connections)
wss://chat.quizzman.com/socket      # Chat backend
wss://noti.quizzman.com/socket      # Notification backend
```

> **Lưu ý quan trọng:** Share-UI chỉ host **frontend/UI code** (CSS, JS). Các kết nối WebSocket realtime vẫn connect đến backend services riêng (`chat.quizzman.com`, `noti.quizzman.com`).

---

## 2. Quick Start

### 2.1 Cách nhúng đơn giản nhất (Full QMF)

```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My App - QuizzMan</title>
    
    <!-- ⭐ IMPORTANT: Preload CSS to prevent FOUC (Flash of Unstyled Content) -->
    <link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf-friends-preload.css">
    
    <!-- QMF Core CSS -->
    <link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf.css">
    
    <!-- Font Awesome (for icons) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Favicon -->
    <link rel="icon" href="https://ui.quizzman.com/qmf/assets/logo/default/favicon.ico">
</head>
<body>
    <!-- Header container -->
    <div id="qmf-header"></div>
    
    <!-- Main content -->
    <main id="app">
        <!-- Your content -->
    </main>
    
    <!-- Footer container -->
    <div id="qmf-footer"></div>

    <!-- QMF Core JS -->
    <script src="https://ui.quizzman.com/qmf/dist/qmf.js"></script>
    
    <script>
        // Initialize QMF
        QMF.init({
            appId: 'my-app',
            header: { pageTitle: 'My App' },
            footer: { copyright: '© 2026 QuizzMan' },
            features: {
                chat: true,
                notifications: true
            }
        });
    </script>
</body>
</html>
```

### 2.2 Cách nhúng từng module riêng lẻ

Nếu chỉ cần một số component, nhúng riêng lẻ:

```html
<!-- ⭐ IMPORTANT: Always include preload CSS FIRST to prevent FOUC -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf-friends-preload.css">

<!-- Header only -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/header/unified-header.css">
<script src="https://ui.quizzman.com/qmf/dist/modules/header/unified-header.js"></script>

<!-- Chat only -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/chat/qmf-chat.css">
<script src="https://ui.quizzman.com/qmf/dist/modules/chat/qmf-chat.js"></script>

<!-- Notification only -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/notification/noti-embed.css">
<script src="https://ui.quizzman.com/qmf/dist/modules/notification/noti-embed.js"></script>
```

---

## 3. Header Component

### 3.1 Basic Integration

```html
<!-- Container for header -->
<div id="qmf-header"></div>

<!-- Load CSS & JS -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/header/unified-header.css">
<script src="https://ui.quizzman.com/qmf/dist/modules/header/unified-header.js"></script>

<script>
    // Create header
    createUnifiedHeader('#qmf-header', {
        pageTitle: 'Classroom',
        showHamburger: true,
        showChat: true,
        showFriend: true,
        showNotification: true
    });
</script>
```

### 3.2 Full Configuration Options

```javascript
createUnifiedHeader('#qmf-header', {
    // Branding
    logoSrc: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png',
    brandName: 'QuizzMan',
    pageTitle: 'Classroom',              // Subtitle sau brand name
    
    // Features
    showHamburger: true,                  // Nút hamburger (sidebar toggle)
    showChat: true,                       // Nút chat
    showFriend: true,                     // Nút bạn bè
    showNotification: true,               // Nút notification
    showUserDropdown: true,               // User dropdown menu
    
    // URLs - Quan trọng cho navigation
    loginUrl: 'https://id.quizzman.com/login',
    profileUrl: 'https://id.quizzman.com/account',
    settingsUrl: 'https://id.quizzman.com/settings',
    
    // Event handlers
    onHamburgerClick: () => {
        // Custom sidebar toggle logic
        document.getElementById('sidebar').classList.toggle('open');
    },
    onChatClick: () => {
        // Custom chat open logic
        window.QMFChat?.toggle();
    },
    onFriendClick: () => {
        // Custom friend panel logic
        window.location.href = '/friends';
    },
    onNotificationClick: () => {
        // Custom notification logic
        NotiEmbed.toggle();
    },
    
    // User menu items
    userMenuItems: [
        { icon: 'fas fa-user', label: 'Hồ sơ', action: 'profile' },
        { icon: 'fas fa-cog', label: 'Cài đặt', action: 'settings' },
        { icon: 'fas fa-palette', label: 'Giao diện', action: 'theme' },
        { divider: true },
        { icon: 'fas fa-question-circle', label: 'Trợ giúp', action: 'help' },
        { icon: 'fas fa-sign-out-alt', label: 'Đăng xuất', action: 'logout', danger: true }
    ],
    
    // Token & User getters (for auth integration)
    getToken: () => {
        return window.QuizzmanAuth?.getToken() || localStorage.getItem('jwt_token');
    },
    getUser: () => {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }
});
```

### 3.3 Header API Methods

```javascript
// Get header instance
const header = window.qmfHeader;

// Update badges
header.updateChatBadge(5);           // Chat badge count
header.updateFriendBadge(2);         // Friend request count
header.updateNotificationBadge(10);  // Notification count

// Update user info
header.updateUserInfo({
    display_name: 'Nguyen Van A',
    avatar: 'https://example.com/avatar.jpg'
});

// Refresh auth state
header.checkAuthState();

// Handle menu actions
header.on('menu:action', (action) => {
    switch (action) {
        case 'profile':
            window.location.href = '/profile';
            break;
        case 'logout':
            QuizzmanAuth.logout();
            break;
    }
});
```

### 3.4 Header với Dual Logo

Hiển thị logo QuizzMan chính + logo sub-app:

```javascript
createUnifiedHeader('#qmf-header', {
    // Main QuizzMan logo
    logoSrc: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png',
    brandName: 'QuizzMan',
    
    // Sub-app logo (optional)
    subLogo: 'https://ui.quizzman.com/qmf/assets/logo/classroom/classroom-logo-64.png',
    subTitle: 'Classroom',
    
    // Links
    mainLogoLink: 'https://quizzman.com',      // Click QuizzMan logo
    subLogoLink: 'https://quizzman.com/classroom'  // Click Classroom logo
});
```

### 3.5 Header 3-Zone Layout (v2.1.0+)

> **🆕 New in v2.1.0:** Header sử dụng layout 3 vùng: Trái | Giữa | Phải

```
┌──────────────────────────────────────────────────────────────────┐
│  [LEFT]                    [CENTER]                    [RIGHT]   │
│  Site Logo + Title    Quizzman Logo + Name    Social + User      │
│                                                                  │
│  ┌─────────────┐      ┌──────────────────┐    ┌──────────────┐   │
│  │ 🏫 Classroom│      │  🎯 Quizzman     │    │ 💬 🔔 👤 ▼   │   │
│  └─────────────┘      └──────────────────┘    └──────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

#### HTML Structure

```html
<header class="qmf-header">
    <div class="qmf-header__inner">
        <!-- LEFT: Site Logo + Title -->
        <div class="qmf-header__cluster qmf-header__cluster--left">
            <a href="/" class="qmf-header__brand">
                <img src="[site-logo]" class="qmf-header__logo">
                <div class="qmf-header__brand-text">
                    <span class="qmf-header__brand-name">QuizzMan</span>
                    <span class="qmf-header__page-title">Classroom</span>
                </div>
            </a>
        </div>

        <!-- CENTER: Main Quizzman Logo + Name (absolute centered) -->
        <div class="qmf-header__cluster qmf-header__cluster--center">
            <a href="https://quizzman.com" class="qmf-header__main-logo">
                <img src="[quizzman-logo]" class="qmf-header__logo-img">
                <span class="qmf-header__main-name">Quizzman</span>
            </a>
        </div>

        <!-- RIGHT: Social Buttons + User Dropdown -->
        <div class="qmf-header__cluster qmf-header__cluster--right">
            <!-- Social buttons (chat, notification, etc.) -->
            <button class="qmf-header__btn" id="qmfChatBtn">
                <i class="fas fa-comments"></i>
                <span class="qmf-header__badge">5</span>
            </button>
            <button class="qmf-header__btn" id="qmfNotificationBtn">
                <i class="fas fa-bell"></i>
            </button>
            
            <!-- User dropdown -->
            <div class="qmf-header__user">
                <button class="qmf-header__user-toggle">
                    <img src="[avatar]" class="qmf-header__avatar">
                    <span class="qmf-header__user-name">User Name</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <!-- Dropdown menu -->
            </div>
        </div>
    </div>
</header>
```

#### CSS Classes (3-Zone Layout)

| Class | Mô tả |
|-------|-------|
| `.qmf-header__cluster--left` | Vùng trái: Site logo + Brand text |
| `.qmf-header__cluster--center` | Vùng giữa: Main Quizzman logo (absolute centered) |
| `.qmf-header__cluster--right` | Vùng phải: Social buttons + User dropdown |
| `.qmf-header__main-logo` | Link bao quanh logo chính + tên |
| `.qmf-header__logo-img` | Ảnh logo chính (32px height) |
| `.qmf-header__main-name` | Tên "Quizzman" với gradient text |

#### CSS Styles (Key)

```css
/* Inner container với relative positioning */
.qmf-header__inner {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 1600px;
    margin: 0 auto;
}

/* Left zone: flex start */
.qmf-header__cluster--left {
    flex: 1 1 0;
    justify-content: flex-start;
}

/* Center zone: absolute centered */
.qmf-header__cluster--center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
}

/* Right zone: flex end */
.qmf-header__cluster--right {
    flex: 1 1 0;
    justify-content: flex-end;
    gap: 0.5rem;
}

/* Main name with gradient */
.qmf-header__main-name {
    font-size: 1.25rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
```

#### JavaScript Configuration (v2.1.0+)

```javascript
createUnifiedHeader('#qmf-header', {
    // Site branding (LEFT)
    logoSrc: 'https://ui.quizzman.com/qmf/assets/logo/classroom/classroom-logo-64.png',
    brandName: 'QuizzMan',
    pageTitle: 'Classroom',
    
    // Main Quizzman logo (CENTER) - NEW in v2.1.0
    mainLogoUrl: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png',
    mainLogoLink: 'https://quizzman.com',
    
    // Features (RIGHT)
    showChat: true,
    showFriend: true,
    showNotification: true,
    showUserDropdown: true,
    
    // ... other options
});
```

---

## 4. Chat Component

> **📦 UI Module:** Host trên `ui.quizzman.com` (Share-UI)  
> **🔌 Backend:** WebSocket connect đến `chat.quizzman.com`

### 4.1 Basic Integration

```html
<!-- Chat UI Module (từ Share-UI) -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/chat/qmf-chat.css">
<script src="https://ui.quizzman.com/qmf/dist/modules/chat/qmf-chat.js"></script>

<script>
    // Initialize chat
    // UI load từ share-ui, WebSocket connect đến chat backend
    const chat = new QMFChat({
        server: 'https://chat.quizzman.com',  // Backend WebSocket server
        createButton: true,           // Tạo floating button
        buttonPosition: 'bottom-right'
    });
</script>
```

### 4.2 Full Configuration

```javascript
const chat = new QMFChat({
    // Server
    server: 'https://chat.quizzman.com',
    
    // UI Options
    createButton: true,                // Create floating chat button
    buttonPosition: 'bottom-right',    // 'bottom-right' | 'bottom-left'
    container: document.body,          // Container element
    
    // Features
    enableTyping: true,                // Typing indicator
    enableSeen: true,                  // Message seen status
    enableReactions: true,             // Message reactions
    enableReply: true,                 // Reply to message
    enableBlock: true,                 // Block user
    enableReport: true,                // Report message
    
    // Debugging
    debug: false,                      // Enable debug logs
    
    // Auth
    getToken: () => {
        // Custom token getter
        return window.QuizzmanAuth?.getToken() || 
               localStorage.getItem('jwt_token');
    },
    
    // Callbacks
    onOpen: () => {
        console.log('Chat opened');
    },
    onClose: () => {
        console.log('Chat closed');
    },
    onNewMessage: (message) => {
        console.log('New message:', message);
    },
    onUnreadChange: (count) => {
        // Update header badge
        window.qmfHeader?.updateChatBadge(count);
    }
});
```

### 4.3 Chat API Methods

```javascript
// Get instance
const chat = window.QMFChat;

// Toggle chat panel
chat.toggle();

// Open/close
chat.open();
chat.close();

// Check state
chat.isOpen;              // boolean
chat.isConnected;         // boolean

// Get unread count
const unread = chat.unreadCount;

// Open specific conversation
chat.openConversation(conversationId);

// Send message
chat.sendMessage({
    to: 'user_id_123',
    content: 'Hello!'
});

// Connect/disconnect
chat.connect();
chat.disconnect();

// Event listeners
chat.on('message', (msg) => console.log(msg));
chat.on('typing', (data) => console.log(data.user, 'is typing'));
chat.on('seen', (data) => console.log('Message seen'));
```

### 4.4 Chat Integration với Header

```javascript
// Initialize header with chat button
createUnifiedHeader('#qmf-header', {
    showChat: true,
    onChatClick: () => {
        window.chatInstance.toggle();
    }
});

// Initialize chat
const chatInstance = new QMFChat({
    server: 'https://chat.quizzman.com',
    createButton: false,  // Don't create floating button (using header)
    onUnreadChange: (count) => {
        window.qmfHeader.updateChatBadge(count);
    }
});

window.chatInstance = chatInstance;
```

---

## 5. Notification Component

> **📦 UI Module:** Host trên `ui.quizzman.com` (Share-UI)  
> **🔌 Backend:** WebSocket connect đến `noti.quizzman.com`

### 5.1 Basic Integration

```html
<!-- Notification UI Module (từ Share-UI) -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/notification/noti-embed.css">
<script src="https://ui.quizzman.com/qmf/dist/modules/notification/noti-embed.js"></script>

<script>
    // Initialize notifications
    // UI load từ share-ui, WebSocket connect đến noti backend
    NotiEmbed.init({
        containerId: 'header',    // ID of container (usually header)
        autoConnect: true         // Auto connect đến noti.quizzman.com
    });
</script>
```

### 5.2 Full Configuration

```javascript
NotiEmbed.init({
    // Container IDs
    containerId: 'qmf-header',           // Desktop container
    mobileContainerId: 'sidebar-left',   // Mobile container
    
    // Responsive
    mobileBreakpoint: 768,               // Mobile breakpoint (px)
    
    // Positioning
    position: 'right',                   // 'left' | 'right'
    
    // Features
    autoConnect: true,                   // Auto connect to WebSocket
    showToasts: true,                    // Show toast notifications
    maxNotifications: 50,                // Max notifications to cache
    
    // Debugging
    debug: false,
    
    // Callbacks
    onNotification: (notification) => {
        console.log('New notification:', notification);
    },
    onUnreadChange: (count) => {
        window.qmfHeader?.updateNotificationBadge(count);
    },
    onClick: (notification) => {
        // Handle notification click
        if (notification.action_url) {
            window.location.href = notification.action_url;
        }
    }
});
```

### 5.3 Notification API Methods

```javascript
// Get instance
const noti = window.NotiEmbed;

// Toggle panel
noti.toggle();
noti.open();
noti.close();

// Get counts
noti.unreadCount;            // Unread count
noti.notifications;          // All notifications array

// Mark as read
noti.markAsRead(notificationId);
noti.markAllAsRead();

// Delete notification
noti.delete(notificationId);
noti.deleteAll();

// Refresh
noti.refresh();

// Connection
noti.connect();
noti.disconnect();
noti.isConnected;

// Event listeners
noti.on('notification', (data) => {
    console.log('New notification:', data);
});
noti.on('unread-change', (count) => {
    console.log('Unread count:', count);
});
```

### 5.4 Notification Categories

```javascript
// Filter by category
noti.filterByCategory('classroom');

// Available categories
const categories = {
    'system': 'Hệ thống',
    'social': 'Xã hội',
    'classroom': 'Lớp học',
    'content': 'Nội dung',
    'account': 'Tài khoản',
    'game': 'Trò chơi'
};
```

---

## 6. Footer Component

### 6.1 Basic Integration

```html
<!-- Footer container -->
<footer id="qmf-footer"></footer>

<script>
// Using QMF
QMF.plugins.footer.init({
    copyright: '© 2026 QuizzMan. All rights reserved.',
    links: [
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
        { label: 'Help', href: '/help' }
    ]
}).mount(document.getElementById('qmf-footer'));
</script>
```

### 6.2 Full Configuration

```javascript
QMF.plugins.footer.init({
    // Copyright text
    copyright: '© 2026 QuizzMan. All rights reserved.',
    
    // Navigation links
    links: [
        { label: 'Điều khoản', href: '/terms' },
        { label: 'Chính sách', href: '/privacy' },
        { label: 'Trợ giúp', href: '/help' },
        { label: 'API Docs', href: '/docs', external: true }
    ],
    
    // Social links
    socialLinks: [
        { icon: 'github', href: 'https://github.com/the-quizzman', label: 'GitHub' },
        { icon: 'facebook', href: 'https://facebook.com/quizzman', label: 'Facebook' },
        { icon: 'youtube', href: 'https://youtube.com/quizzman', label: 'YouTube' }
    ],
    
    // Version display
    showVersion: true,
    version: '2.1.0',
    
    // Style options
    sticky: false,       // Sticky to bottom
    minimal: false,      // Minimal mode
    theme: {
        background: 'var(--qmf-color-bg-secondary)',
        border: true
    }
});
```

### 6.3 DMCA Badge

```html
<!-- DMCA Badge (in footer) -->
<a href="//www.dmca.com/Protection/Status.aspx?ID=4a61669a-dd15-4fd2-8310-c184d1a1749a" 
   title="DMCA.com Protection Status" 
   class="dmca-badge">
    <img src="https://images.dmca.com/Badges/dmca_protected_sml_120w.png?ID=4a61669a-dd15-4fd2-8310-c184d1a1749a" 
         alt="DMCA.com Protection Status">
</a>
<script src="https://images.dmca.com/Badges/DMCABadgeHelper.min.js" async></script>
```

---

## 7. Loading Screen Component ⭐ NEW

Loading Screen là component hiển thị màn hình chờ đẹp mắt với animation khi trang đang tải. Thiết kế AI-style với gradient, particles và progress bar animation.

### 7.1 Quick Start

#### Cách 1: JavaScript Module (Khuyến nghị)

```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Site</title>
    <!-- Font (khuyến nghị) -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div id="app">...</div>

    <script type="module">
        import { QMFLoadingScreen } from 'https://ui.quizzman.com/qmf/ui/loading-screen/index.js';
        
        // Auto mode - tự động chạy animation
        QMFLoadingScreen.auto({
            siteName: 'My Website',
            subtitle: 'Powered by Quizzman',
            siteUrl: 'https://mysite.quizzman.com'
        });
    </script>
</body>
</html>
```

#### Cách 2: Manual Control

```javascript
import { QMFLoadingScreen } from 'https://ui.quizzman.com/qmf/ui/loading-screen/index.js';

// Tạo loader với manual control
const loader = QMFLoadingScreen.create({
    siteName: 'My Website',
    subtitle: 'AI Platform',
    siteUrl: 'https://mysite.quizzman.com',
    theme: 'dark' // hoặc 'light'
});

loader.show();

// Cập nhật progress khi load resources
loader.setProgress(20, 'Đang tải giao diện');
await loadStyles();

loader.setProgress(50, 'Đang kết nối API');
await initAPI();

loader.setProgress(80, 'Đang tải dữ liệu');
await fetchData();

// Hoàn thành - hiện checkmark rồi tự ẩn
loader.complete();
```

### 7.2 Configuration Options

```javascript
const options = {
    // Tên site hiển thị (required)
    siteName: 'Quizzman Dictionary',
    
    // Subtitle/tagline
    subtitle: 'AI-Powered Chinese Learning',
    
    // URL hiển thị ở footer
    siteUrl: 'https://dict.quizzman.com',
    
    // Có hiện URL footer không
    showUrl: true,
    
    // Tự động chạy animation progress
    autoProgress: true,
    
    // Custom progress steps (nếu autoProgress: true)
    progressSteps: [
        { percent: 20, text: 'Đang tải giao diện', delay: 200 },
        { percent: 45, text: 'Đang kết nối API', delay: 600 },
        { percent: 70, text: 'Đang tải dữ liệu', delay: 1000 },
        { percent: 90, text: 'Hoàn thiện', delay: 1400 }
    ],
    
    // Delay trước khi ẩn sau khi hoàn thành (ms)
    successDelay: 800,
    
    // Callback khi hoàn thành
    onComplete: () => console.log('Loading complete!'),
    
    // Theme: 'dark' (mặc định) hoặc 'light'
    theme: 'dark'
};
```

### 7.3 Methods

| Method | Mô tả |
|--------|-------|
| `show()` | Hiện loading screen |
| `hide()` | Ẩn loading screen với animation fade-out |
| `forceHide()` | Ẩn ngay lập tức (không animation) |
| `setProgress(percent, text)` | Cập nhật progress bar và text |
| `complete()` | Hiện success checkmark rồi tự ẩn |
| `updateConfig(options)` | Cập nhật cấu hình |

### 7.4 Static Methods

```javascript
// Quick auto-loading với default animation
const loader = QMFLoadingScreen.auto(options);

// Manual control mode
const loader = QMFLoadingScreen.create(options);
```

### 7.5 Themes

#### Dark Theme (Mặc định)
```javascript
QMFLoadingScreen.auto({ theme: 'dark', siteName: 'My Site' });
```
- Gradient background tối (indigo/violet)
- Phù hợp với giao diện tối

#### Light Theme
```javascript
QMFLoadingScreen.auto({ theme: 'light', siteName: 'My Site' });
```
- Background sáng (trắng/xám)
- Phù hợp với giao diện sáng

### 7.6 Ví dụ cho các site

```javascript
// Quizzman Dictionary
QMFLoadingScreen.auto({
    siteName: 'Quizzman Dictionary',
    subtitle: 'AI-Powered Chinese Learning',
    siteUrl: 'https://dict.quizzman.com'
});

// Quizzman Classroom
QMFLoadingScreen.auto({
    siteName: 'Quizzman Classroom',
    subtitle: 'Interactive Learning Platform',
    siteUrl: 'https://classroom.quizzman.com'
});

// Quizzman Payment (light theme)
QMFLoadingScreen.auto({
    siteName: 'Quizzman Payment',
    subtitle: 'Secure Payment Gateway',
    siteUrl: 'https://payment.quizzman.com',
    theme: 'light'
});
```

### 7.7 CSS-Only Usage

Nếu không muốn dùng JavaScript, có thể include CSS và HTML trực tiếp:

```html
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/ui/loading-screen/loading-screen.css">

<div id="qmf-loading-screen" class="qmf-loading-screen">
    <div class="qmf-loading-decoration">
        <div class="qmf-loading-glow"></div>
        <div class="qmf-loading-particle"></div>
        <div class="qmf-loading-particle"></div>
        <div class="qmf-loading-particle"></div>
        <div class="qmf-loading-particle"></div>
        <div class="qmf-loading-particle"></div>
        <div class="qmf-loading-particle"></div>
    </div>

    <div class="qmf-loading-logo">
        <h1>My Website</h1>
        <div class="qmf-loading-subtitle">AI-Powered Platform</div>
    </div>

    <div class="qmf-loading-blocks">
        <div class="qmf-loading-block"></div>
        <div class="qmf-loading-block"></div>
        <div class="qmf-loading-block"></div>
        <div class="qmf-loading-block"></div>
        <div class="qmf-loading-block"></div>
        <div class="qmf-loading-block"></div>
        <div class="qmf-loading-block"></div>
        <div class="qmf-loading-block"></div>
        <div class="qmf-loading-block"></div>
    </div>

    <svg class="qmf-loading-checkmark" viewBox="0 0 52 52">
        <circle class="qmf-checkmark-circle" cx="26" cy="26" r="24"/>
        <path class="qmf-checkmark-check" d="M14 27l8 8 16-16"/>
    </svg>

    <div class="qmf-loading-text">Đang khởi tạo<span class="qmf-loading-dots"></span></div>

    <div class="qmf-loading-progress">
        <div class="qmf-loading-progress-bar" id="qmf-loading-progress-bar"></div>
    </div>

    <div class="qmf-loading-url">
        <a href="https://mysite.quizzman.com">mysite.quizzman.com</a>
    </div>
</div>
```

Xem thêm chi tiết tại: [Loading Screen README](qmf/ui/loading-screen/README.md)

---

## 8. URL Path Configuration

### 7.1 Service Endpoints

```javascript
// Global QMF configuration
window.QMF_CONFIG = {
    services: {
        // Auth service
        id: {
            base: 'https://id.quizzman.com',
            login: 'https://id.quizzman.com/login',
            logout: 'https://id.quizzman.com/logout',
            register: 'https://id.quizzman.com/register',
            api: 'https://id.quizzman.com/api'
        },
        
        // Main site
        main: {
            base: 'https://quizzman.com',
            api: 'https://quizzman.com/api'
        },
        
        // Chat service
        chat: {
            base: 'https://chat.quizzman.com',
            socket: 'wss://chat.quizzman.com/socket',
            api: 'https://chat.quizzman.com/api'
        },
        
        // Notification service
        noti: {
            base: 'https://noti.quizzman.com',
            socket: 'wss://noti.quizzman.com/socket',
            api: 'https://noti.quizzman.com/api'
        },
        
        // UI assets
        ui: {
            base: 'https://ui.quizzman.com',
            qmf: 'https://ui.quizzman.com/qmf/dist',
            assets: 'https://ui.quizzman.com/qmf/assets'
        }
    }
};
```

### 7.2 Logo URLs

```javascript
const LOGO_URLS = {
    // Main QuizzMan logo
    main: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png',
    
    // App-specific logos
    classroom: {
        logo: 'https://ui.quizzman.com/qmf/assets/logo/classroom/classroom-logo.png',
        logo128: 'https://ui.quizzman.com/qmf/assets/logo/classroom/classroom-logo-128.png',
        logo64: 'https://ui.quizzman.com/qmf/assets/logo/classroom/classroom-logo-64.png',
        favicon: 'https://ui.quizzman.com/qmf/assets/logo/classroom/favicon.ico'
    },
    
    lms: {
        logo: 'https://ui.quizzman.com/qmf/assets/logo/lms/lms-logo.png',
        favicon: 'https://ui.quizzman.com/qmf/assets/logo/lms/favicon.ico'
    },
    
    webmail: {
        logo: 'https://ui.quizzman.com/qmf/assets/logo/webmail/webmail-logo.png',
        favicon: 'https://ui.quizzman.com/qmf/assets/logo/webmail/favicon.ico'
    },
    
    play: {
        logo: 'https://ui.quizzman.com/qmf/assets/logo/play/play-logo.png',
        favicon: 'https://ui.quizzman.com/qmf/assets/logo/play/favicon.ico'
    },
    
    // Default fallback
    default: {
        logo: 'https://ui.quizzman.com/qmf/assets/logo/default/logo.png',
        favicon: 'https://ui.quizzman.com/qmf/assets/logo/default/favicon.ico'
    }
};
```

### 7.3 Navigation URLs cho Header

```javascript
createUnifiedHeader('#qmf-header', {
    // Core URLs
    loginUrl: 'https://id.quizzman.com/login',
    profileUrl: 'https://id.quizzman.com/account',
    settingsUrl: 'https://id.quizzman.com/settings',
    
    // App links (for navigation)
    navItems: [
        { label: 'Trang chủ', href: '/', active: true },
        { label: 'Khóa học', href: '/courses' },
        { label: 'Lớp học', href: '/classrooms' },
        { label: 'Bài kiểm tra', href: '/quizzes' }
    ],
    
    // User menu items with URLs
    userMenuItems: [
        { 
            icon: 'fas fa-user', 
            label: 'Hồ sơ', 
            action: 'profile',
            url: 'https://id.quizzman.com/account'
        },
        { 
            icon: 'fas fa-cog', 
            label: 'Cài đặt', 
            action: 'settings',
            url: 'https://id.quizzman.com/settings'
        },
        { divider: true },
        { 
            icon: 'fas fa-sign-out-alt', 
            label: 'Đăng xuất', 
            action: 'logout',
            danger: true 
        }
    ]
});
```

### 7.4 Dynamic URL Based on Environment

```javascript
// Detect environment
const ENV = (() => {
    const host = window.location.hostname;
    if (host.includes('localhost') || host.includes('127.0.0.1')) return 'local';
    if (host.includes('staging') || host.includes('dev')) return 'staging';
    return 'production';
})();

// Environment-specific URLs
const URLS = {
    local: {
        id: 'http://localhost:4001',
        chat: 'http://localhost:4002',
        noti: 'http://localhost:4003',
        ui: 'http://localhost:4000'
    },
    staging: {
        id: 'https://id.staging.quizzman.com',
        chat: 'https://chat.staging.quizzman.com',
        noti: 'https://noti.staging.quizzman.com',
        ui: 'https://ui.staging.quizzman.com'
    },
    production: {
        id: 'https://id.quizzman.com',
        chat: 'https://chat.quizzman.com',
        noti: 'https://noti.quizzman.com',
        ui: 'https://ui.quizzman.com'
    }
};

// Use in initialization
createUnifiedHeader('#header', {
    loginUrl: `${URLS[ENV].id}/login`
});

new QMFChat({
    server: URLS[ENV].chat
});

NotiEmbed.init({
    serverUrl: URLS[ENV].noti
});
```

---

## 9. Authentication Integration

### 8.1 QuizzmanAuth Integration

```html
<!-- Load QuizzmanAuth FIRST -->
<script src="https://id.quizzman.com/module/auth.js"></script>

<!-- Then load QMF components -->
<script src="https://ui.quizzman.com/qmf/dist/modules/header/unified-header.js"></script>

<script>
    // QuizzmanAuth will auto-initialize
    // Header will detect auth state automatically
    
    // Listen for auth changes
    window.addEventListener('auth:login', (e) => {
        window.qmfHeader?.checkAuthState();
        window.chatInstance?.connect();
        window.NotiEmbed?.connect();
    });
    
    window.addEventListener('auth:logout', () => {
        window.location.href = 'https://id.quizzman.com/login';
    });
</script>
```

### 8.2 Custom Token Provider

```javascript
// If not using QuizzmanAuth
createUnifiedHeader('#header', {
    getToken: () => {
        // Custom token logic
        return myAuthService.getAccessToken();
    },
    getUser: () => {
        return myAuthService.getCurrentUser();
    }
});

new QMFChat({
    getToken: () => myAuthService.getAccessToken()
});
```

### 8.3 Token từ Cookies

```javascript
// Default token resolution order:
// 1. window.QuizzmanAuth.getToken()
// 2. Cookie: jwt_token
// 3. Cookie: authToken
// 4. localStorage: jwt_token
// 5. localStorage: authToken
// 6. localStorage: token

// Custom cookie name
createUnifiedHeader('#header', {
    getToken: () => {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'my_custom_token') {
                return decodeURIComponent(value);
            }
        }
        return null;
    }
});
```

---

## 10. Event System

### 9.1 Header Events

```javascript
// User menu actions
window.addEventListener('qmf:menu-action', (e) => {
    const { action } = e.detail;
    
    switch (action) {
        case 'profile':
            window.location.href = '/profile';
            break;
        case 'settings':
            window.location.href = '/settings';
            break;
        case 'theme':
            toggleDarkMode();
            break;
        case 'logout':
            QuizzmanAuth.logout();
            break;
    }
});

// Badge updates
window.addEventListener('qmf:badge-update', (e) => {
    const { type, count } = e.detail;
    console.log(`${type} badge updated to ${count}`);
});
```

### 9.2 Chat Events

```javascript
const chat = new QMFChat({ ... });

// New message received
chat.on('message', (message) => {
    console.log('New message:', message);
    // Show notification if chat is closed
    if (!chat.isOpen) {
        showDesktopNotification(message);
    }
});

// Typing indicator
chat.on('typing', (data) => {
    console.log(`${data.userName} is typing...`);
});

// Message seen
chat.on('seen', (data) => {
    console.log(`Message ${data.messageId} seen by ${data.userId}`);
});

// Connection state
chat.on('connect', () => console.log('Connected'));
chat.on('disconnect', () => console.log('Disconnected'));

// Unread count change
chat.on('unread', (count) => {
    window.qmfHeader?.updateChatBadge(count);
});
```

### 9.3 Notification Events

```javascript
NotiEmbed.on('notification', (noti) => {
    console.log('New notification:', noti);
    
    // Custom toast
    if (noti.priority === 'urgent') {
        showCustomToast(noti, 'error');
    }
});

NotiEmbed.on('unread-change', (count) => {
    window.qmfHeader?.updateNotificationBadge(count);
    
    // Update document title
    document.title = count > 0 
        ? `(${count}) QuizzMan Classroom` 
        : 'QuizzMan Classroom';
});

NotiEmbed.on('click', (noti) => {
    // Handle notification click
    if (noti.action_url) {
        window.location.href = noti.action_url;
    }
});
```

---

## 11. Advanced Customization

### 10.1 Custom CSS Variables

```css
:root {
    /* Brand colors */
    --qmf-color-primary: #4f46e5;
    --qmf-color-primary-light: #818cf8;
    --qmf-color-primary-dark: #3730a3;
    
    /* Status colors */
    --qmf-color-success: #22c55e;
    --qmf-color-warning: #f59e0b;
    --qmf-color-danger: #ef4444;
    --qmf-color-info: #3b82f6;
    
    /* Header specific */
    --qmf-header-height: 56px;
    --qmf-header-bg: #ffffff;
    --qmf-header-border: #e5e7eb;
    --qmf-header-shadow: 0 1px 3px rgba(0,0,0,0.1);
    
    /* Dark mode */
    --qmf-dark-bg: #1f2937;
    --qmf-dark-surface: #374151;
    --qmf-dark-text: #f9fafb;
}

/* Dark mode */
[data-theme="dark"] {
    --qmf-header-bg: var(--qmf-dark-surface);
    --qmf-header-border: #4b5563;
}
```

### 10.2 Override Component Styles

```css
/* Custom header height */
.qmf-header {
    height: 64px !important;
}

/* Custom logo size */
.qmf-header__logo {
    height: 40px !important;
    width: auto !important;
}

/* Custom button styles */
.qmf-header__btn {
    background: linear-gradient(135deg, #667eea, #764ba2) !important;
    color: white !important;
}

/* Custom badge color */
.qmf-header__badge {
    background: #ef4444 !important;
}

/* Chat panel size */
.qmf-chat {
    width: 400px !important;
    height: 600px !important;
}
```

### 10.3 Theming

```javascript
// Apply dark theme
document.documentElement.setAttribute('data-theme', 'dark');

// Toggle theme
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
```

---

## 12. Troubleshooting

### 12.1 Common Issues

#### ⭐ FOUC (Flash of Unstyled Content) - Friend Panel hiện chớp

**Vấn đề:** Khi load trang, phần quản lý bạn bè (friend panel) hiện lên rồi biến mất, gây hiện tượng chớp sáng.

**Nguyên nhân:** JavaScript chưa kịp chạy để thêm class ẩn nhưng HTML đã render.

**Giải pháp:**
```html
<!-- Thêm preload CSS TRƯỚC tất cả CSS khác -->
<head>
    <link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf-friends-preload.css">
    <link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/qmf.css">
    <!-- ... other CSS -->
</head>
```

**Chi tiết:**
- File `qmf-friends-preload.css` chứa CSS tối thiểu để ẩn friend panel ngay từ đầu
- CSS này sử dụng `!important` để đảm bảo ưu tiên cao nhất
- Khi JavaScript init xong, nó sẽ thêm class `.visible` để hiển thị panel

#### Header không hiển thị
```javascript
// Check container exists
console.log(document.querySelector('#qmf-header'));

// Check CSS loaded
const cssLoaded = [...document.styleSheets].some(
    sheet => sheet.href?.includes('unified-header.css')
);
console.log('CSS loaded:', cssLoaded);

// Check JS loaded
console.log('createUnifiedHeader:', typeof createUnifiedHeader);
```

#### Chat không kết nối
```javascript
// Check token
console.log('Token:', window.QMFChat?.options?.getToken?.());

// Check WebSocket
console.log('Connected:', window.chatInstance?.isConnected);

// Enable debug
new QMFChat({ debug: true });
```

#### Notification không nhận được
```javascript
// Check connection
console.log('NotiEmbed connected:', NotiEmbed.isConnected);

// Check token
console.log('Token:', NotiEmbed.token);

// Reconnect
NotiEmbed.connect();
```

### 11.2 CORS Issues

```nginx
# Nginx config cho share-ui
location /qmf/ {
    add_header Access-Control-Allow-Origin "https://*.quizzman.com";
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
    add_header Access-Control-Allow-Headers "Origin, Content-Type, Authorization";
    add_header Access-Control-Allow-Credentials "true";
}
```

### 11.3 Cache Issues

```bash
# Clear browser cache
# Or use versioned URLs
https://ui.quizzman.com/qmf/dist/v3.0.0/modules/header/unified-header.js?v=20260203

# Force refresh in JS
fetch(url, { cache: 'no-cache' });
```

### 11.4 Debug Mode

```javascript
// Enable debug for all components
window.QMF_DEBUG = true;

// Or per-component
new QMFChat({ debug: true });
NotiEmbed.init({ debug: true });
```

### 11.5 API Errors (500/404)

Các lỗi HTTP phổ biến từ backend services:

#### Chat API Errors

| Error | Nguyên nhân | Giải pháp |
|-------|-------------|-----------|
| `GET /friends/list 404` | Endpoint không đúng hoặc chưa có user auth | Đảm bảo đã đăng nhập và token hợp lệ |
| `GET /friends/requests 404` | Endpoint không đúng | Kiểm tra URL API trong config |
| `GET /friends/blocked 404` | Endpoint không đúng | Kiểm tra URL API trong config |
| `column u.username does not exist` | Database schema chưa đúng | Chạy migration: `npm run migrate` |

```javascript
// Check chat connection
console.log('Chat connected:', window.chatInstance?.isConnected);
console.log('Chat token:', window.chatInstance?.options?.getToken?.());

// Correct API endpoints
const CHAT_API = {
    friends: 'https://chat.quizzman.com/api/friends',
    list: 'https://chat.quizzman.com/api/friends/list',
    conversations: 'https://chat.quizzman.com/api/conversations'
};
```

#### Notification API Errors

| Error | Nguyên nhân | Giải pháp |
|-------|-------------|-----------|
| `GET /api/unread-count 404` | Endpoint không đúng | Sử dụng `https://noti.quizzman.com/api/notifications/unread-count` |
| `Ident authentication failed` | PostgreSQL auth config sai | Kiểm tra pg_hba.conf và user permissions |

```javascript
// Check noti connection
console.log('Noti connected:', NotiEmbed?.isConnected);

// Correct API endpoints
const NOTI_API = {
    base: 'https://noti.quizzman.com/api',
    unreadCount: 'https://noti.quizzman.com/api/notifications/unread-count',
    list: 'https://noti.quizzman.com/api/notifications'
};
```

#### Classroom API Errors

| Error | Nguyên nhân | Giải pháp |
|-------|-------------|-----------|
| `GET /api/classroom/my-classes 500` | Database error hoặc thiếu table | Kiểm tra logs: `pm2 logs classroom-sys` |
| `relation "X" does not exist` | Table chưa được tạo | Chạy migration: `npm run migrate` |
| `GET /api/classroom/invitations 500` | Database query error | Kiểm tra database connection |

```bash
# Check backend logs
pm2 logs classroom-sys --lines 50 --nostream | grep -i error

# Run migrations
cd /path/to/classroom-sys/backend && npm run migrate

# Restart service
pm2 restart classroom-sys
```

### 11.6 DMCA Badge Error

```
DMCABadgeHelper.min.js: Cannot read properties of undefined (reading 'getAttribute')
```

**Nguyên nhân:** Script DMCA chạy trước khi DOM element được render.

**Giải pháp:**

```html
<!-- Option 1: Đặt script ở cuối body -->
<body>
    <!-- ... content ... -->
    <a href="//www.dmca.com/Protection/Status.aspx?ID=xxx" class="dmca-badge">
        <img src="https://images.dmca.com/Badges/dmca_protected_sml_120w.png?ID=xxx" 
             alt="DMCA.com Protection Status">
    </a>
    <!-- Script ở cuối -->
    <script src="https://images.dmca.com/Badges/DMCABadgeHelper.min.js" async></script>
</body>

<!-- Option 2: Defer loading -->
<script src="https://images.dmca.com/Badges/DMCABadgeHelper.min.js" defer></script>

<!-- Option 3: Load sau khi DOM ready -->
<script>
document.addEventListener('DOMContentLoaded', () => {
    const script = document.createElement('script');
    script.src = 'https://images.dmca.com/Badges/DMCABadgeHelper.min.js';
    document.body.appendChild(script);
});
</script>
```

---

## 13. Complete Example

```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="dmca-site-verification" content="ejRCNEZ2NzI1YUdwNllSZk80dlpNQT090">
    <title>Classroom - QuizzMan</title>
    
    <!-- Favicon -->
    <link rel="icon" href="https://ui.quizzman.com/qmf/assets/logo/classroom/favicon.ico">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- QMF Components CSS -->
    <link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/header/unified-header.css">
    <link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/chat/qmf-chat.css">
    <link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/notification/noti-embed.css">
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', sans-serif; 
            padding-top: 56px; /* Header height */
        }
        main { padding: 20px; max-width: 1200px; margin: 0 auto; }
    </style>
</head>
<body>
    <!-- Header Container -->
    <div id="qmf-header"></div>
    
    <!-- Main Content -->
    <main id="app">
        <h1>Welcome to Classroom</h1>
        <p>Your content here...</p>
    </main>
    
    <!-- Footer -->
    <footer style="text-align: center; padding: 20px; background: #f9fafb;">
        <p>© 2026 QuizzMan. All rights reserved.</p>
    </footer>

    <!-- Auth Module -->
    <script src="https://id.quizzman.com/module/auth.js"></script>
    
    <!-- QMF Components JS -->
    <script src="https://ui.quizzman.com/qmf/dist/modules/header/unified-header.js"></script>
    <script src="https://ui.quizzman.com/qmf/dist/modules/chat/qmf-chat.js"></script>
    <script src="https://ui.quizzman.com/qmf/dist/modules/notification/noti-embed.js"></script>

    <script>
        // Initialize Header
        createUnifiedHeader('#qmf-header', {
            logoSrc: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png',
            brandName: 'QuizzMan',
            pageTitle: 'Classroom',
            showChat: true,
            showNotification: true,
            loginUrl: 'https://id.quizzman.com/login',
            onChatClick: () => window.chatInstance?.toggle(),
            onNotificationClick: () => NotiEmbed.toggle()
        });

        // Initialize Chat
        window.chatInstance = new QMFChat({
            server: 'https://chat.quizzman.com',
            createButton: false,
            onUnreadChange: (count) => {
                window.qmfHeader?.updateChatBadge(count);
            }
        });

        // Initialize Notifications
        NotiEmbed.init({
            containerId: 'qmf-header',
            autoConnect: true,
            onUnreadChange: (count) => {
                window.qmfHeader?.updateNotificationBadge(count);
            }
        });

        // Auth state changes
        window.addEventListener('auth:login', () => {
            window.qmfHeader?.checkAuthState();
            window.chatInstance?.connect();
            NotiEmbed.connect();
        });

        window.addEventListener('auth:logout', () => {
            window.location.href = 'https://id.quizzman.com/login';
        });
    </script>
</body>
</html>
```

---

## 📚 Reference Links

### UI Modules (tất cả từ Share-UI)

| Module | URL |
|--------|-----|
| QMF Core | https://ui.quizzman.com/qmf/dist/qmf.js |
| Header UI | https://ui.quizzman.com/qmf/dist/modules/header/unified-header.js |
| Chat UI | https://ui.quizzman.com/qmf/dist/modules/chat/qmf-chat.js |
| Notification UI | https://ui.quizzman.com/qmf/dist/modules/notification/noti-embed.js |
| Logo Assets | https://ui.quizzman.com/qmf/assets/logo/ |

### Backend Services

| Service | URL | Mục đích |
|---------|-----|----------|
| Auth Module | https://id.quizzman.com/module/auth.js | Authentication |
| Chat Backend | https://chat.quizzman.com | WebSocket server cho chat |
| Noti Backend | https://noti.quizzman.com | WebSocket server cho notifications |

---

© 2026 QuizzMan Team. All rights reserved.
