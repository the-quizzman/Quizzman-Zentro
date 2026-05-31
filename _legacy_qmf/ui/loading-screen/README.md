# QMF Loading Screen - Hướng dẫn sử dụng

> Component loading screen đẹp mắt với animation AI-style cho tất cả các site trong hệ thống Quizzman.

## 📁 File Location

```
share-ui/qmf/ui/loading-screen/
├── index.js          # JavaScript module
├── loading-screen.css # Standalone CSS
└── README.md         # Hướng dẫn này
```

## 🚀 Cách sử dụng

### Cách 1: Sử dụng JavaScript Module (Khuyến nghị)

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Site</title>
    <!-- Font (optional nhưng khuyến nghị) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <!-- Nội dung trang -->
    <div id="app">...</div>

    <script type="module">
        import { QMFLoadingScreen } from 'https://ui.quizzman.com/qmf/ui/loading-screen/index.js';
        
        // Cách 1: Auto mode - tự động chạy animation
        const loader = QMFLoadingScreen.auto({
            siteName: 'My Website',
            subtitle: 'Powered by Quizzman',
            siteUrl: 'https://mysite.quizzman.com'
        });

        // Cách 2: Manual mode - điều khiển thủ công
        const loader = QMFLoadingScreen.create({
            siteName: 'My Website',
            subtitle: 'AI-Powered Platform',
            siteUrl: 'https://mysite.quizzman.com'
        });
        
        loader.show();
        
        // Cập nhật progress khi load resources
        loader.setProgress(20, 'Đang tải giao diện');
        
        // Sau khi load xong
        await fetchData();
        loader.setProgress(80, 'Gần xong');
        
        // Hoàn thành
        loader.complete(); // Hiện checkmark rồi tự ẩn
    </script>
</body>
</html>
```

### Cách 2: Sử dụng HTML + CSS thuần (không cần JS)

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Site</title>
    <link rel="stylesheet" href="https://ui.quizzman.com/qmf/ui/loading-screen/loading-screen.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <!-- Loading Screen HTML -->
    <div id="qmf-loading-screen" class="qmf-loading-screen">
        <!-- Decorative Elements -->
        <div class="qmf-loading-decoration">
            <div class="qmf-loading-glow"></div>
            <div class="qmf-loading-particle"></div>
            <div class="qmf-loading-particle"></div>
            <div class="qmf-loading-particle"></div>
            <div class="qmf-loading-particle"></div>
            <div class="qmf-loading-particle"></div>
            <div class="qmf-loading-particle"></div>
        </div>

        <!-- Logo - THAY ĐỔI TÊN SITE Ở ĐÂY -->
        <div class="qmf-loading-logo">
            <h1>My Website</h1>
            <div class="qmf-loading-subtitle">AI-Powered Platform</div>
        </div>

        <!-- Loading Blocks Animation -->
        <div class="qmf-loading-blocks" id="qmf-loading-blocks">
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

        <!-- Success Checkmark -->
        <svg class="qmf-loading-checkmark" id="qmf-loading-checkmark" viewBox="0 0 52 52">
            <circle class="qmf-checkmark-circle" cx="26" cy="26" r="24"/>
            <path class="qmf-checkmark-check" d="M14 27l8 8 16-16"/>
        </svg>

        <!-- Loading Text -->
        <div class="qmf-loading-text" id="qmf-loading-text">
            Đang khởi tạo<span class="qmf-loading-dots"></span>
        </div>

        <!-- Progress Bar -->
        <div class="qmf-loading-progress">
            <div class="qmf-loading-progress-bar" id="qmf-loading-progress-bar"></div>
        </div>

        <!-- URL Footer - THAY ĐỔI LINK Ở ĐÂY -->
        <div class="qmf-loading-url">
            <a href="https://mysite.quizzman.com" target="_blank">mysite.quizzman.com</a>
        </div>
    </div>

    <!-- Nội dung trang -->
    <div id="app">...</div>

    <script>
        // Điều khiển loading screen
        function setProgress(percent, text) {
            const progressBar = document.getElementById('qmf-loading-progress-bar');
            const textEl = document.getElementById('qmf-loading-text');
            if (progressBar) progressBar.style.width = percent + '%';
            if (text && textEl) textEl.innerHTML = text + '<span class="qmf-loading-dots"></span>';
        }

        function showSuccess() {
            document.getElementById('qmf-loading-blocks').style.display = 'none';
            document.getElementById('qmf-loading-checkmark').classList.add('show');
            document.getElementById('qmf-loading-text').innerHTML = 'Sẵn sàng!';
            setProgress(100);
        }

        function hideLoader() {
            const loader = document.getElementById('qmf-loading-screen');
            loader.classList.add('fade-out');
            setTimeout(() => loader.classList.add('hidden'), 600);
        }

        // Chạy loading sequence
        setTimeout(() => setProgress(20, 'Đang tải giao diện'), 200);
        setTimeout(() => setProgress(45, 'Đang kết nối API'), 600);
        setTimeout(() => setProgress(70, 'Đang tải dữ liệu'), 1000);
        setTimeout(() => setProgress(90, 'Hoàn thiện'), 1400);
        setTimeout(() => {
            showSuccess();
            setTimeout(hideLoader, 800);
        }, 1800);
    </script>
</body>
</html>
```

### Cách 3: Inline cho trang đơn giản

Copy nguyên CSS vào `<style>` tag và HTML vào body - phù hợp cho các trang landing page đơn giản.

## ⚙️ Configuration Options

```javascript
const options = {
    // Tên site hiển thị
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
    
    // Delay trước khi ẩn sau khi hoàn thành
    successDelay: 800,
    
    // Callback khi hoàn thành
    onComplete: () => {
        console.log('Loading complete!');
    },
    
    // Theme: 'dark' (mặc định) hoặc 'light'
    theme: 'dark'
};
```

## 🎨 Themes

### Dark Theme (Mặc định)
```javascript
const loader = QMFLoadingScreen.auto({ theme: 'dark' });
```
- Gradient background tối với màu indigo/violet
- Phù hợp với các trang có giao diện tối

### Light Theme
```javascript
const loader = QMFLoadingScreen.auto({ theme: 'light' });
```
Hoặc thêm class `light`:
```html
<div class="qmf-loading-screen light">
```
- Background sáng với gradient trắng/xám
- Phù hợp với các trang có giao diện sáng

## 📱 Responsive

Component tự động responsive:
- Desktop: Logo 2rem, blocks 20px
- Mobile (<480px): Logo 1.5rem, blocks 16px

## 🔧 Methods

| Method | Mô tả |
|--------|-------|
| `show()` | Hiện loading screen |
| `hide()` | Ẩn loading screen với animation |
| `forceHide()` | Ẩn ngay lập tức (không animation) |
| `setProgress(percent, text)` | Cập nhật progress bar và text |
| `complete()` | Hiện success checkmark rồi tự ẩn |
| `updateConfig(newOptions)` | Cập nhật cấu hình |

## 📋 Ví dụ cho các site cụ thể

### Quizzman Dictionary
```javascript
QMFLoadingScreen.auto({
    siteName: 'Quizzman Dictionary',
    subtitle: 'AI-Powered Chinese Learning',
    siteUrl: 'https://dict.quizzman.com'
});
```

### Quizzman Classroom
```javascript
QMFLoadingScreen.auto({
    siteName: 'Quizzman Classroom',
    subtitle: 'Interactive Learning Platform',
    siteUrl: 'https://class.quizzman.com'
});
```

### Quizzman Quiz
```javascript
QMFLoadingScreen.auto({
    siteName: 'Quizzman Quiz',
    subtitle: 'Test Your Knowledge',
    siteUrl: 'https://quiz.quizzman.com'
});
```

### Quizzman Payment
```javascript
QMFLoadingScreen.auto({
    siteName: 'Quizzman Payment',
    subtitle: 'Secure Payment Gateway',
    siteUrl: 'https://payment.quizzman.com',
    theme: 'light' // Có thể dùng light theme cho trang payment
});
```

## 🔗 Integration với SPA Frameworks

### Vue.js
```javascript
// App.vue
import { QMFLoadingScreen } from 'https://ui.quizzman.com/qmf/ui/loading-screen/index.js';

export default {
    mounted() {
        const loader = QMFLoadingScreen.create({
            siteName: 'My Vue App',
            autoProgress: false
        });
        
        loader.show();
        
        // Sau khi app ready
        this.$nextTick(() => {
            loader.complete();
        });
    }
}
```

### React
```javascript
// App.jsx
import { useEffect } from 'react';

function App() {
    useEffect(() => {
        const loader = window.QMFLoadingScreen?.auto({
            siteName: 'My React App'
        });
        
        return () => loader?.forceHide();
    }, []);
    
    return <div>...</div>;
}
```

## 📝 Notes

1. **Font**: Khuyến nghị load font Inter để có giao diện đẹp nhất
2. **Z-index**: Loading screen có z-index: 999999 để luôn ở trên cùng
3. **Performance**: CSS animations được tối ưu với GPU acceleration
4. **Accessibility**: Loading có proper ARIA attributes

## 🆘 Troubleshooting

**Loading không hiện?**
- Kiểm tra đường dẫn import
- Kiểm tra console cho errors

**Animation giật?**
- Đảm bảo không có CSS override animations
- Kiểm tra browser support

**Font không đẹp?**
- Thêm Google Font Inter vào head
