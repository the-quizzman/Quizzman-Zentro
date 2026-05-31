/**
 * QMF App Config - Admin Panel
 * Configuration for admin.quizzman.com
 * @version 1.0.0
 */

export default {
    // App identification
    app: {
        id: 'admin',
        name: 'Quizzman Admin',
        shortName: 'Admin',
        description: 'System administration and management',
        version: '1.0.0'
    },
    
    // Branding
    branding: {
        logo: '/assets/admin-logo.svg',
        favicon: '/assets/admin-favicon.ico',
        color: '#dc2626', // Red
        theme: 'light'
    },
    
    // Header configuration
    header: {
        mainLogo: '/assets/qmf-logo.svg',
        subLogo: '/assets/admin-logo.svg',
        title: 'Admin',
        showSearch: true,
        showNotifications: true,
        showUserMenu: true,
        navItems: [
            { id: 'dashboard', label: 'Dashboard', href: '/', icon: 'dashboard' },
            { id: 'users', label: 'Users', href: '/users', icon: 'users' },
            { id: 'content', label: 'Content', href: '/content', icon: 'file' },
            { id: 'system', label: 'System', href: '/system', icon: 'settings' }
        ]
    },
    
    // Sidebar configuration
    sidebar: {
        collapsible: true,
        collapsed: false,
        items: [
            { heading: 'Overview' },
            { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/' },
            { id: 'analytics', label: 'Analytics', icon: 'chart', href: '/analytics' },
            { id: 'reports', label: 'Reports', icon: 'file', href: '/reports' },
            { divider: true },
            { heading: 'User Management' },
            { id: 'users', label: 'Users', icon: 'users', href: '/users', children: [
                { id: 'all-users', label: 'All Users', href: '/users' },
                { id: 'roles', label: 'Roles & Permissions', href: '/users/roles' },
                { id: 'invites', label: 'Invitations', href: '/users/invites' },
                { id: 'banned', label: 'Banned Users', href: '/users/banned' }
            ]},
            { id: 'activity', label: 'Activity Log', icon: 'activity', href: '/activity' },
            { divider: true },
            { heading: 'Content' },
            { id: 'dictionary', label: 'Dictionary', icon: 'book', href: '/content/dictionary', children: [
                { id: 'entries', label: 'Entries', href: '/content/dictionary' },
                { id: 'pending', label: 'Pending Review', href: '/content/dictionary/pending', badge: 12, badgeType: 'warning' },
                { id: 'import', label: 'Import/Export', href: '/content/dictionary/import' }
            ]},
            { id: 'quizzes', label: 'Quizzes', icon: 'quiz', href: '/content/quizzes' },
            { id: 'courses', label: 'Courses', icon: 'graduation', href: '/content/courses' },
            { id: 'media', label: 'Media Library', icon: 'image', href: '/content/media' },
            { divider: true },
            { heading: 'System' },
            { id: 'settings', label: 'Settings', icon: 'settings', href: '/system/settings' },
            { id: 'appearance', label: 'Appearance', icon: 'palette', href: '/system/appearance' },
            { id: 'api', label: 'API Management', icon: 'code', href: '/system/api' },
            { id: 'integrations', label: 'Integrations', icon: 'plug', href: '/system/integrations' },
            { id: 'backups', label: 'Backups', icon: 'database', href: '/system/backups' },
            { id: 'logs', label: 'System Logs', icon: 'terminal', href: '/system/logs' }
        ]
    },
    
    // Footer configuration
    footer: {
        minimal: true,
        showVersion: true,
        links: [
            { label: 'Documentation', href: '/docs' },
            { label: 'API Reference', href: '/api-docs' }
        ]
    },
    
    // Features enabled
    features: {
        chat: false,
        notifications: true,
        friends: false,
        darkMode: true,
        commandPalette: true,
        auditLog: true,
        twoFactor: true
    },
    
    // Routes configuration
    routes: [
        { path: '/', component: 'pages/dashboard', title: 'Dashboard', guards: ['auth', 'admin'] },
        { path: '/analytics', component: 'pages/analytics', title: 'Analytics', guards: ['auth', 'admin'] },
        { path: '/reports', component: 'pages/reports', title: 'Reports', guards: ['auth', 'admin'] },
        { path: '/users', component: 'pages/users', title: 'Users', guards: ['auth', 'admin'] },
        { path: '/users/:id', component: 'pages/user-detail', title: 'User Details', guards: ['auth', 'admin'] },
        { path: '/users/roles', component: 'pages/roles', title: 'Roles & Permissions', guards: ['auth', 'superadmin'] },
        { path: '/users/invites', component: 'pages/invites', title: 'Invitations', guards: ['auth', 'admin'] },
        { path: '/users/banned', component: 'pages/banned-users', title: 'Banned Users', guards: ['auth', 'admin'] },
        { path: '/activity', component: 'pages/activity-log', title: 'Activity Log', guards: ['auth', 'admin'] },
        { path: '/content/dictionary', component: 'pages/dictionary-entries', title: 'Dictionary Entries', guards: ['auth', 'editor'] },
        { path: '/content/dictionary/pending', component: 'pages/dictionary-pending', title: 'Pending Review', guards: ['auth', 'editor'] },
        { path: '/content/dictionary/import', component: 'pages/dictionary-import', title: 'Import/Export', guards: ['auth', 'admin'] },
        { path: '/content/quizzes', component: 'pages/quizzes', title: 'Quizzes', guards: ['auth', 'editor'] },
        { path: '/content/courses', component: 'pages/courses', title: 'Courses', guards: ['auth', 'editor'] },
        { path: '/content/media', component: 'pages/media-library', title: 'Media Library', guards: ['auth', 'editor'] },
        { path: '/system/settings', component: 'pages/settings', title: 'System Settings', guards: ['auth', 'superadmin'] },
        { path: '/system/appearance', component: 'pages/appearance', title: 'Appearance', guards: ['auth', 'admin'] },
        { path: '/system/api', component: 'pages/api-management', title: 'API Management', guards: ['auth', 'superadmin'] },
        { path: '/system/integrations', component: 'pages/integrations', title: 'Integrations', guards: ['auth', 'superadmin'] },
        { path: '/system/backups', component: 'pages/backups', title: 'Backups', guards: ['auth', 'superadmin'] },
        { path: '/system/logs', component: 'pages/system-logs', title: 'System Logs', guards: ['auth', 'superadmin'] }
    ],
    
    // Command palette commands
    commands: [
        { id: 'dashboard', label: 'Go to Dashboard', category: 'Navigation', action: () => window.location.href = '/' },
        { id: 'users', label: 'Manage Users', category: 'Navigation', action: () => window.location.href = '/users' },
        { id: 'add-user', label: 'Add New User', category: 'Actions', action: () => {} },
        { id: 'settings', label: 'System Settings', category: 'System', action: () => window.location.href = '/system/settings' },
        { id: 'logs', label: 'View System Logs', category: 'System', action: () => window.location.href = '/system/logs' },
        { id: 'clear-cache', label: 'Clear Cache', category: 'System', action: () => {} }
    ],
    
    // Admin settings
    adminSettings: {
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        requireTwoFactor: true,
        ipWhitelist: [],
        auditLogRetention: 90 // days
    },
    
    // API endpoints
    api: {
        baseUrl: '/api/admin/v1',
        endpoints: {
            users: '/users',
            user: '/users/:id',
            roles: '/roles',
            permissions: '/permissions',
            analytics: '/analytics',
            reports: '/reports',
            settings: '/settings',
            logs: '/logs',
            backups: '/backups',
            cache: '/cache'
        }
    },
    
    // Roles with permissions
    roles: {
        superadmin: ['*'],
        admin: ['users.*', 'content.*', 'analytics.view', 'reports.*'],
        editor: ['content.*', 'media.*'],
        moderator: ['users.view', 'content.review', 'activity.view']
    },
    
    // Locale/i18n
    locale: {
        default: 'en',
        supported: ['en', 'vi']
    }
};
