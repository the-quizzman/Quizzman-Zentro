# QMF Settings Float Component

Floating settings button with Language + Theme toggle for all QMF applications.

## Features

- 🌍 **6 Languages**: VI, EN, 中 (ZH), 繁 (ZHT), 한 (KR), 日 (JP)
- 🌓 **Theme Toggle**: Light/Dark mode
- 📱 **Responsive**: Works on desktop & mobile
- ⚙️ **Configurable**: Customizable position, languages, callbacks
- 🎨 **Theme-aware**: Uses CSS variables from host app

## Usage

### Basic (Auto-inject)

```html
<script src="https://ui.quizzman.com/qmf/dist/modules/settings-float/settings-float.js"></script>
<script>
  createSettingsFloat();
</script>
```

### With Configuration

```html
<script src="https://ui.quizzman.com/qmf/dist/modules/settings-float/settings-float.js"></script>
<script>
  createSettingsFloat({
    lang: 'en',
    theme: 'dark',
    position: 'bottom-left',
    onLangChange: (lang) => console.log('Language:', lang),
    onThemeChange: (theme) => console.log('Theme:', theme)
  });
</script>
```

### With CSS (recommended)

```html
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/settings-float/settings-float.css">
<script src="https://ui.quizzman.com/qmf/dist/modules/settings-float/settings-float.js"></script>
<script>
  createSettingsFloat();
</script>
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `lang` | string | 'vi' | Initial language code |
| `theme` | string | 'light' | Initial theme (light/dark) |
| `position` | string | 'bottom-right' | Position: 'bottom-right' or 'bottom-left' |
| `languages` | array | ['vi', 'en', 'zh', 'zht', 'kr', 'jp'] | Available languages |
| `onLangChange` | function | null | Callback when language changes |
| `onThemeChange` | function | null | Callback when theme changes |
| `autoInject` | boolean | true | Auto-inject to body |

## API

```javascript
const settings = createSettingsFloat({ lang: 'en' });

// Get current values
settings.getLang();    // 'en'
settings.getTheme();   // 'light'

// Set values programmatically
settings.setLanguage('vi');
settings.setTheme('dark');

// Destroy
settings.destroy();
```

## Events

```javascript
// Listen for changes
window.addEventListener('qmf:langchange', (e) => {
  console.log('Language changed to:', e.detail.lang);
});

window.addEventListener('qmf:themechange', (e) => {
  console.log('Theme changed to:', e.detail.theme);
});
```

## CSS Variables

The component uses these CSS variables from the host application:

```css
:root {
  --c-primary: #8b6914;
  --c-primary-subtle: rgba(139, 105, 20, 0.08);
  --c-surface: #fff;
  --c-border: #e4dfd8;
  --c-text-secondary: #666;
  --c-text-muted: #9c958e;
  --c-card-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  --c-card-shadow-hover: 0 4px 16px rgba(0, 0, 0, 0.08);
  --font-sans: 'Inter', system-ui, sans-serif;
}
```

## Integration with QMF Header

```html
<!-- QMF Header -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/header/unified-header.css">
<script src="https://ui.quizzman.com/qmf/dist/modules/header/unified-header.js"></script>

<!-- QMF Settings Float -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/settings-float/settings-float.css">
<script src="https://ui.quizzman.com/qmf/dist/modules/settings-float/settings-float.js"></script>

<script>
  // Create header
  createUnifiedHeader('#header', {
    pageTitle: 'Science Lab'
  });
  
  // Create settings float
  createSettingsFloat({
    onLangChange: (lang) => {
      // Sync with your i18n system
      window.labI18n?.setLang(lang);
    }
  });
</script>
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

MIT © QuizzMan
