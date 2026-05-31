/**
 * QMF App Config - Play (Quiz/Game subdomain)
 * Configuration for play.quizzman.com
 * @version 1.0.0
 */

export default {
    // App identification
    app: {
        id: 'play',
        name: 'Quizzman Play',
        shortName: 'Play',
        description: 'Interactive quizzes and learning games',
        version: '1.0.0'
    },
    
    // Branding
    branding: {
        logo: '/assets/play-logo.svg',
        favicon: '/assets/play-favicon.ico',
        color: '#10b981', // Green
        theme: 'light'
    },
    
    // Header configuration
    header: {
        mainLogo: '/assets/qmf-logo.svg',
        subLogo: '/assets/play-logo.svg',
        title: 'Play',
        showSearch: true,
        showNotifications: true,
        showUserMenu: true,
        navItems: [
            { id: 'home', label: 'Home', href: '/', icon: 'home' },
            { id: 'quizzes', label: 'Quizzes', href: '/quizzes', icon: 'quiz' },
            { id: 'games', label: 'Games', href: '/games', icon: 'game' },
            { id: 'leaderboard', label: 'Leaderboard', href: '/leaderboard', icon: 'trophy' }
        ]
    },
    
    // Sidebar configuration
    sidebar: {
        collapsible: true,
        collapsed: false,
        items: [
            { heading: 'Play' },
            { id: 'home', label: 'Home', icon: 'home', href: '/' },
            { id: 'daily-challenge', label: 'Daily Challenge', icon: 'calendar', href: '/daily', badge: 'New', badgeType: 'success' },
            { id: 'quick-quiz', label: 'Quick Quiz', icon: 'zap', href: '/quick' },
            { divider: true },
            { heading: 'Quizzes' },
            { id: 'all-quizzes', label: 'Browse Quizzes', icon: 'grid', href: '/quizzes' },
            { id: 'create-quiz', label: 'Create Quiz', icon: 'plus', href: '/quizzes/create' },
            { id: 'my-quizzes', label: 'My Quizzes', icon: 'user', href: '/quizzes/mine', guards: ['auth'] },
            { divider: true },
            { heading: 'Games' },
            { id: 'matching', label: 'Matching Game', icon: 'layers', href: '/games/matching' },
            { id: 'flashcards', label: 'Flashcards', icon: 'cards', href: '/games/flashcards' },
            { id: 'typing', label: 'Typing Practice', icon: 'keyboard', href: '/games/typing' },
            { id: 'memory', label: 'Memory Game', icon: 'brain', href: '/games/memory' },
            { divider: true },
            { heading: 'Progress' },
            { id: 'stats', label: 'My Stats', icon: 'chart', href: '/stats', guards: ['auth'] },
            { id: 'achievements', label: 'Achievements', icon: 'award', href: '/achievements', guards: ['auth'] },
            { id: 'history', label: 'History', icon: 'clock', href: '/history', guards: ['auth'] },
            { divider: true },
            { heading: 'Social' },
            { id: 'leaderboard', label: 'Leaderboard', icon: 'trophy', href: '/leaderboard' },
            { id: 'challenges', label: 'Challenges', icon: 'target', href: '/challenges' },
            { id: 'friends', label: 'Friends', icon: 'users', href: '/friends', guards: ['auth'] }
        ]
    },
    
    // Footer configuration
    footer: {
        minimal: true,
        showVersion: true,
        links: [
            { label: 'Rules', href: '/rules' },
            { label: 'Support', href: '/support' }
        ]
    },
    
    // Features enabled
    features: {
        chat: true,
        notifications: true,
        friends: true,
        darkMode: true,
        commandPalette: true,
        soundEffects: true,
        animations: true
    },
    
    // Routes configuration
    routes: [
        { path: '/', component: 'pages/home', title: 'Home' },
        { path: '/daily', component: 'pages/daily-challenge', title: 'Daily Challenge' },
        { path: '/quick', component: 'pages/quick-quiz', title: 'Quick Quiz' },
        { path: '/quizzes', component: 'pages/quizzes', title: 'Browse Quizzes' },
        { path: '/quizzes/create', component: 'pages/create-quiz', title: 'Create Quiz', guards: ['auth'] },
        { path: '/quizzes/mine', component: 'pages/my-quizzes', title: 'My Quizzes', guards: ['auth'] },
        { path: '/quiz/:id', component: 'pages/quiz', title: 'Quiz' },
        { path: '/quiz/:id/play', component: 'pages/quiz-play', title: 'Playing Quiz' },
        { path: '/quiz/:id/results', component: 'pages/quiz-results', title: 'Quiz Results' },
        { path: '/games', component: 'pages/games', title: 'Games' },
        { path: '/games/:type', component: 'pages/game', title: 'Game' },
        { path: '/leaderboard', component: 'pages/leaderboard', title: 'Leaderboard' },
        { path: '/stats', component: 'pages/stats', title: 'My Stats', guards: ['auth'] },
        { path: '/achievements', component: 'pages/achievements', title: 'Achievements', guards: ['auth'] },
        { path: '/history', component: 'pages/history', title: 'History', guards: ['auth'] },
        { path: '/challenges', component: 'pages/challenges', title: 'Challenges' },
        { path: '/friends', component: 'pages/friends', title: 'Friends', guards: ['auth'] },
        { path: '/profile/:id', component: 'pages/profile', title: 'Profile' }
    ],
    
    // Command palette commands
    commands: [
        { id: 'quick-quiz', label: 'Start Quick Quiz', shortcut: 'Q', category: 'Play', action: () => window.location.href = '/quick' },
        { id: 'daily', label: 'Daily Challenge', category: 'Play', action: () => window.location.href = '/daily' },
        { id: 'create', label: 'Create New Quiz', category: 'Actions', action: () => window.location.href = '/quizzes/create' },
        { id: 'leaderboard', label: 'View Leaderboard', category: 'Social', action: () => window.location.href = '/leaderboard' },
        { id: 'stats', label: 'My Statistics', category: 'Profile', action: () => window.location.href = '/stats' }
    ],
    
    // Game settings
    gameSettings: {
        defaultTimeLimit: 30, // seconds per question
        defaultLives: 3,
        pointsPerCorrect: 10,
        streakMultiplier: 1.5,
        enableHints: true,
        enableSkip: true
    },
    
    // API endpoints
    api: {
        baseUrl: '/api/v1',
        endpoints: {
            quizzes: '/quizzes',
            quiz: '/quiz/:id',
            submit: '/quiz/:id/submit',
            leaderboard: '/leaderboard',
            stats: '/user/stats',
            achievements: '/user/achievements',
            friends: '/user/friends',
            challenges: '/challenges'
        }
    },
    
    // Locale/i18n
    locale: {
        default: 'vi',
        supported: ['vi', 'en']
    }
};
