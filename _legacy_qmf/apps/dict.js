/**
 * QMF App Config - Dict (Dictionary subdomain)
 * Configuration for dict.quizzman.com
 * @version 1.0.0
 */

export default {
    // App identification
    app: {
        id: 'dict',
        name: 'Quizzman Dictionary',
        shortName: 'Dict',
        description: 'Comprehensive Han-Nom & Chinese dictionary',
        version: '1.0.0'
    },
    
    // Branding
    branding: {
        logo: '/assets/dict-logo.svg',
        favicon: '/assets/dict-favicon.ico',
        color: '#2563eb', // Primary blue
        theme: 'light'
    },
    
    // Header configuration
    header: {
        mainLogo: '/assets/qmf-logo.svg',
        subLogo: '/assets/dict-logo.svg',
        title: 'Dictionary',
        showSearch: true,
        showNotifications: true,
        showUserMenu: true,
        navItems: [
            { id: 'search', label: 'Search', href: '/', icon: 'search' },
            { id: 'browse', label: 'Browse', href: '/browse', icon: 'folder' },
            { id: 'radicals', label: 'Radicals', href: '/radicals', icon: 'grid' },
            { id: 'lists', label: 'Word Lists', href: '/lists', icon: 'list' }
        ]
    },
    
    // Sidebar configuration
    sidebar: {
        collapsible: true,
        collapsed: false,
        items: [
            { heading: 'Search' },
            { id: 'quick-search', label: 'Quick Search', icon: 'home', href: '/' },
            { id: 'advanced', label: 'Advanced Search', icon: 'settings', href: '/advanced' },
            { id: 'handwriting', label: 'Handwriting', icon: 'edit', href: '/handwriting' },
            { divider: true },
            { heading: 'Browse' },
            { id: 'by-radical', label: 'By Radical', icon: 'grid', href: '/radicals' },
            { id: 'by-stroke', label: 'By Stroke Count', icon: 'list', href: '/strokes' },
            { id: 'by-pinyin', label: 'By Pinyin', icon: 'a', href: '/pinyin' },
            { id: 'by-cantonese', label: 'By Cantonese', icon: 'volume', href: '/cantonese' },
            { divider: true },
            { heading: 'My Content' },
            { id: 'favorites', label: 'Favorites', icon: 'heart', href: '/favorites', badge: 0 },
            { id: 'history', label: 'History', icon: 'clock', href: '/history' },
            { id: 'word-lists', label: 'Word Lists', icon: 'folder', href: '/lists' },
            { divider: true },
            { heading: 'Tools' },
            { id: 'converter', label: 'Character Converter', icon: 'refresh', href: '/converter' },
            { id: 'decompose', label: 'Decomposition', icon: 'layers', href: '/decompose' }
        ]
    },
    
    // Footer configuration
    footer: {
        minimal: true,
        showVersion: true,
        links: [
            { label: 'About', href: '/about' },
            { label: 'API', href: '/api-docs' },
            { label: 'Help', href: '/help' }
        ]
    },
    
    // Features enabled
    features: {
        chat: false,
        notifications: true,
        friends: false,
        darkMode: true,
        commandPalette: true
    },
    
    // Routes configuration
    routes: [
        { path: '/', component: 'pages/home', title: 'Home' },
        { path: '/search', component: 'pages/search', title: 'Search Results' },
        { path: '/char/:char', component: 'pages/character', title: 'Character Details' },
        { path: '/word/:word', component: 'pages/word', title: 'Word Details' },
        { path: '/radicals', component: 'pages/radicals', title: 'Browse by Radical' },
        { path: '/strokes', component: 'pages/strokes', title: 'Browse by Stroke' },
        { path: '/pinyin', component: 'pages/pinyin', title: 'Browse by Pinyin' },
        { path: '/advanced', component: 'pages/advanced-search', title: 'Advanced Search' },
        { path: '/handwriting', component: 'pages/handwriting', title: 'Handwriting Input' },
        { path: '/favorites', component: 'pages/favorites', title: 'Favorites', guards: ['auth'] },
        { path: '/history', component: 'pages/history', title: 'Search History' },
        { path: '/lists', component: 'pages/word-lists', title: 'Word Lists', guards: ['auth'] },
        { path: '/lists/:id', component: 'pages/word-list', title: 'Word List', guards: ['auth'] },
        { path: '/converter', component: 'pages/converter', title: 'Character Converter' },
        { path: '/decompose', component: 'pages/decompose', title: 'Character Decomposition' },
        { path: '/about', component: 'pages/about', title: 'About' },
        { path: '/api-docs', component: 'pages/api-docs', title: 'API Documentation' }
    ],
    
    // Command palette commands
    commands: [
        { id: 'search', label: 'Search Dictionary', shortcut: '/', category: 'Navigation', action: () => window.location.href = '/' },
        { id: 'advanced', label: 'Advanced Search', shortcut: 'Ctrl+Shift+F', category: 'Navigation', action: () => window.location.href = '/advanced' },
        { id: 'handwriting', label: 'Handwriting Input', category: 'Tools', action: () => window.location.href = '/handwriting' },
        { id: 'radicals', label: 'Browse Radicals', category: 'Navigation', action: () => window.location.href = '/radicals' },
        { id: 'favorites', label: 'My Favorites', category: 'Navigation', action: () => window.location.href = '/favorites' },
        { id: 'converter', label: 'Character Converter', category: 'Tools', action: () => window.location.href = '/converter' }
    ],
    
    // API endpoints
    api: {
        baseUrl: '/api/v1',
        endpoints: {
            search: '/search',
            character: '/character/:char',
            word: '/word/:word',
            radicals: '/radicals',
            favorites: '/user/favorites',
            lists: '/user/lists'
        }
    },
    
    // Locale/i18n
    locale: {
        default: 'vi',
        supported: ['vi', 'en', 'zh-CN', 'zh-TW', 'ja']
    }
};
