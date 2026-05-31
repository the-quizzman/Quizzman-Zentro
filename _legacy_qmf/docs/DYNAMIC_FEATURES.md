# QMF Dynamic Features Module

## Giới thiệu

Module Dynamic Features cung cấp 2 component UI động cho hệ thống QuizzMan:

1. **Featured Tools Banner** - Banner trượt ngang hiển thị các công cụ nổi bật
2. **Dynamic Island** - Thông báo kiểu iPhone Dynamic Island

## Quick Start

### 1. Import CSS và JS

```html
<!-- Trong <head> -->
<link href="https://ui.quizzman.com/qmf/dist/modules/dynamic-features/dynamic-features.css" rel="stylesheet">

<!-- Trước </body> -->
<script src="https://ui.quizzman.com/qmf/dist/modules/dynamic-features/dynamic-features.js"></script>
```

### 2. Khởi tạo

```javascript
const df = new QMFDynamicFeatures({
    apiEndpoint: 'https://quizzman.com/api/configs',
    bannerEnabled: true,
    islandEnabled: true
});
```

## API Endpoints

Module sử dụng các API sau:

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/configs/banner/featured-tools` | GET | Lấy danh sách công cụ nổi bật |
| `/api/configs/notifications/active` | GET | Lấy thông báo đang active |

## Configuration Options

| Option | Type | Default | Mô tả |
|--------|------|---------|-------|
| `apiEndpoint` | string | '' | Base URL cho API |
| `bannerEnabled` | boolean | true | Bật/tắt Featured Banner |
| `islandEnabled` | boolean | true | Bật/tắt Dynamic Island |
| `bannerTitle` | string | 'Công cụ nổi bật' | Tiêu đề banner |
| `autoHideDelay` | number | 5000 | Thời gian ẩn Island (ms) |
| `notificationCycleDelay` | number | 15000 | Chu kỳ thay đổi notification |

## Public Methods

```javascript
// Thêm công cụ mới vào banner
df.addTool({
    title: 'Tên công cụ',
    description: 'Mô tả',
    icon: 'fas fa-icon',
    url: 'https://...',
    color: '#ff6b9d'
});

// Thêm thông báo mới
df.addNotification({
    title: 'Tiêu đề',
    message: 'Nội dung',
    icon: 'fas fa-bell',
    priority: 'high'
});

// Hiển thị notification ngay
df.showNotification('Title', 'Message', {
    icon: 'fas fa-info',
    color: '#667eea',
    priority: 'medium'
});

// Ẩn/hiện tất cả
df.hide();
df.show();

// Destroy instance
df.destroy();
```

## Demo

Xem demo đầy đủ tại:
https://ui.quizzman.com/qmf/dist/modules/dynamic-features/demo.html

## CSS Classes

### Banner Classes
```css
.qmf-featured-banner        /* Container chính */
.qmf-banner-title           /* Tiêu đề banner */
.qmf-banner-carousel        /* Container carousel */
.qmf-tool-card              /* Card công cụ */
.qmf-tool-icon              /* Icon container */
.qmf-tool-info              /* Info container */
```

### Island Classes
```css
.qmf-dynamic-island         /* Container chính */
.qmf-dynamic-island.active  /* Khi hiển thị */
.qmf-dynamic-island.expanded /* Khi mở rộng */
.qmf-island-indicator       /* Chỉ báo màu */
.qmf-island-content         /* Nội dung */
```

## Responsive

Module tự động responsive:
- **Desktop**: Full width banner, centered island
- **Tablet**: Adjusted sizing
- **Mobile**: Stacked layout, full-width island

## Changelog

### v1.0.0 (2025-02-04)
- Initial release
- Featured Tools Banner với carousel
- Dynamic Island notifications
- API integration
- Auto-hide functionality
