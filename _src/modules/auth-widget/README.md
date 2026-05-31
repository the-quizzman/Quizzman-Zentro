# QMF Auth Widget Component

User authentication dropdown with avatar, tier badge, and account menu.

## Features

- 🔐 **Smart Auth Detection**: Auto-detects login state via cookies
- 👤 **User Chip**: Avatar + tier badge + dropdown menu
- 🌍 **i18n Ready**: 6 languages (VI, EN, ZH, ZHT, KR, JP)
- 🎨 **Theme Aware**: Light/Dark mode support
- 🏷️ **Tier Badges**: PRO, PREMIUM, ENTERPRISE badges
- 📱 **Responsive**: Works on all screen sizes

## Usage

### Basic

```html
<script src="https://ui.quizzman.com/qmf/dist/modules/auth-widget/auth-widget.js"></script>
<script>
  createAuthWidget('.header-actions');
</script>
```

### With QMF Header

```html
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/header/unified-header.css">
<script src="https://ui.quizzman.com/qmf/dist/modules/header/unified-header.js"></script>

<script src="https://ui.quizzman.com/qmf/dist/modules/auth-widget/auth-widget.js"></script>

<script>
  // Create header
  createUnifiedHeader('#header', {
    pageTitle: 'Science Lab'
  });
  
  // Add auth widget to header
  createAuthWidget('.qmf-header__actions');
</script>
```

### Full Combo (Header + Auth + Settings)

```html
<!-- Styles -->
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/header/unified-header.css">
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/auth-widget/auth-widget.css">
<link rel="stylesheet" href="https://ui.quizzman.com/qmf/dist/modules/settings-float/settings-float.css">

<!-- Scripts -->
<script src="https://ui.quizzman.com/qmf/dist/modules/header/unified-header.js"></script>
<script src="https://ui.quizzman.com/qmf/dist/modules/auth-widget/auth-widget.js"></script>
<script src="https://ui.quizzman.com/qmf/dist/modules/settings-float/settings-float.js"></script>

<script>
  // 1. Header with auth widget
  createUnifiedHeader('#header', {
    pageTitle: 'Science Lab',
    showUserDropdown: false // We'll use auth-widget instead
  });
  
  // 2. Auth widget (in header)
  createAuthWidget('.qmf-header__actions', {
    onUserLoad: (user) => console.log('User:', user),
    onLogout: () => console.log('Logged out')
  });
  
  // 3. Settings float (bottom-right corner)
  createSettingsFloat({
    onLangChange: (lang) => {
      // Sync with auth widget
      window.qmfAuthWidget?.refresh();
    }
  });
</script>
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | string/Element | '.qmf-header__actions' | Target container selector |
| `loginUrl` | string | 'https://id.quizzman.com/login' | Login page URL |
| `accountUrl` | string | 'https://id.quizzman.com/account' | Account page URL |
| `logoutUrl` | string | 'https://id.quizzman.com/logout' | Logout URL |
| `apiEndpoint` | string | '/api/auth/me' | Auth verification endpoint |
| `showTierBadge` | boolean | true | Show tier badge (PRO, etc.) |
| `onUserLoad` | function | null | Callback when user loaded |
| `onLogout` | function | null | Callback on logout |

## API

```javascript
const auth = createAuthWidget('.header-actions');

// Check auth state
auth.isAuthenticated(); // true/false

// Get user data
auth.getUser(); // { id, email, display_name, avatar_url, tier }

// Refresh (re-check auth)
auth.refresh();

// Destroy
auth.destroy();
```

## CSS Classes

| Class | Description |
|-------|-------------|
| `.qmf-auth-wrap` | Widget container |
| `.qmf-auth-login` | Login button |
| `.qmf-auth-chip` | User chip (avatar + badge) |
| `.qmf-auth-avatar` | Avatar circle |
| `.qmf-auth-tier` | Tier badge |
| `.qmf-auth-drop` | Dropdown menu |
| `.qmf-auth-drop--open` | Dropdown visible state |

## Tier Badges

| Tier | Class | Style |
|------|-------|-------|
| PRO | `.qmf-auth-tier--pro` | Gold gradient |
| PREMIUM | `.qmf-auth-tier--premium` | Purple gradient |
| ENTERPRISE | `.qmf-auth-tier--enterprise` | Green gradient |

## Backend Requirements

The widget expects an endpoint that returns:

```json
{
  "success": true,
  "user": {
    "id": "123",
    "email": "user@example.com",
    "display_name": "John Doe",
    "avatar_url": "https://...",
    "tier": "pro"
  }
}
```

Or for guest users:

```json
{
  "success": false
}
```

## Integration with qmTier

If `tier-auth.js` is loaded, the widget will read tier from `window.qmTier`:

```html
<script src="https://id.quizzman.com/module/tier-auth.js"></script>
<script src="https://ui.quizzman.com/qmf/dist/modules/auth-widget/auth-widget.js"></script>
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

MIT © QuizzMan
