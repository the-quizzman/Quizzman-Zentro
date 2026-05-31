/**
 * QMF App Config - LMS (Learning Management System)
 * Configuration for lms.quizzman.com
 * @version 1.0.0
 */

export default {
    // App identification
    app: {
        id: 'lms',
        name: 'Quizzman LMS',
        shortName: 'LMS',
        description: 'Learning Management System for structured courses',
        version: '1.0.0'
    },
    
    // Branding
    branding: {
        logo: '/assets/lms-logo.svg',
        favicon: '/assets/lms-favicon.ico',
        color: '#8b5cf6', // Purple
        theme: 'light'
    },
    
    // Header configuration
    header: {
        mainLogo: '/assets/qmf-logo.svg',
        subLogo: '/assets/lms-logo.svg',
        title: 'Learning',
        showSearch: true,
        showNotifications: true,
        showUserMenu: true,
        navItems: [
            { id: 'dashboard', label: 'Dashboard', href: '/', icon: 'dashboard' },
            { id: 'courses', label: 'Courses', href: '/courses', icon: 'book' },
            { id: 'my-learning', label: 'My Learning', href: '/my-learning', icon: 'graduation' },
            { id: 'community', label: 'Community', href: '/community', icon: 'users' }
        ]
    },
    
    // Sidebar configuration
    sidebar: {
        collapsible: true,
        collapsed: false,
        items: [
            { heading: 'Overview' },
            { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/' },
            { id: 'calendar', label: 'Calendar', icon: 'calendar', href: '/calendar' },
            { divider: true },
            { heading: 'Learn' },
            { id: 'all-courses', label: 'Browse Courses', icon: 'grid', href: '/courses' },
            { id: 'my-courses', label: 'My Courses', icon: 'book', href: '/my-learning', guards: ['auth'] },
            { id: 'saved', label: 'Saved', icon: 'bookmark', href: '/saved', guards: ['auth'] },
            { divider: true },
            { heading: 'Progress' },
            { id: 'progress', label: 'Learning Path', icon: 'path', href: '/progress', guards: ['auth'] },
            { id: 'certificates', label: 'Certificates', icon: 'award', href: '/certificates', guards: ['auth'] },
            { id: 'achievements', label: 'Achievements', icon: 'trophy', href: '/achievements', guards: ['auth'] },
            { divider: true },
            { heading: 'Community' },
            { id: 'discussions', label: 'Discussions', icon: 'message', href: '/discussions' },
            { id: 'study-groups', label: 'Study Groups', icon: 'users', href: '/groups' },
            { id: 'mentors', label: 'Mentors', icon: 'mentor', href: '/mentors' },
            { divider: true },
            { heading: 'Instructor' },
            { id: 'my-created', label: 'My Courses', icon: 'folder', href: '/instructor/courses', guards: ['auth', 'instructor'] },
            { id: 'create-course', label: 'Create Course', icon: 'plus', href: '/instructor/create', guards: ['auth', 'instructor'] },
            { id: 'analytics', label: 'Analytics', icon: 'chart', href: '/instructor/analytics', guards: ['auth', 'instructor'] }
        ]
    },
    
    // Footer configuration
    footer: {
        minimal: true,
        showVersion: true,
        links: [
            { label: 'About', href: '/about' },
            { label: 'Become Instructor', href: '/teach' },
            { label: 'Help', href: '/help' }
        ]
    },
    
    // Features enabled
    features: {
        chat: true,
        notifications: true,
        friends: true,
        darkMode: true,
        commandPalette: true,
        videoPlayer: true,
        offlineMode: true
    },
    
    // Routes configuration
    routes: [
        { path: '/', component: 'pages/dashboard', title: 'Dashboard' },
        { path: '/calendar', component: 'pages/calendar', title: 'Calendar' },
        { path: '/courses', component: 'pages/courses', title: 'Browse Courses' },
        { path: '/course/:id', component: 'pages/course-detail', title: 'Course' },
        { path: '/course/:id/learn', component: 'pages/course-player', title: 'Learning', guards: ['auth', 'enrolled'] },
        { path: '/course/:id/lesson/:lessonId', component: 'pages/lesson', title: 'Lesson', guards: ['auth', 'enrolled'] },
        { path: '/my-learning', component: 'pages/my-learning', title: 'My Learning', guards: ['auth'] },
        { path: '/saved', component: 'pages/saved', title: 'Saved Courses', guards: ['auth'] },
        { path: '/progress', component: 'pages/progress', title: 'Learning Path', guards: ['auth'] },
        { path: '/certificates', component: 'pages/certificates', title: 'Certificates', guards: ['auth'] },
        { path: '/achievements', component: 'pages/achievements', title: 'Achievements', guards: ['auth'] },
        { path: '/discussions', component: 'pages/discussions', title: 'Discussions' },
        { path: '/discussions/:id', component: 'pages/discussion-thread', title: 'Discussion' },
        { path: '/groups', component: 'pages/study-groups', title: 'Study Groups' },
        { path: '/groups/:id', component: 'pages/study-group', title: 'Study Group' },
        { path: '/mentors', component: 'pages/mentors', title: 'Mentors' },
        { path: '/instructor/courses', component: 'pages/instructor-courses', title: 'My Courses', guards: ['auth', 'instructor'] },
        { path: '/instructor/create', component: 'pages/create-course', title: 'Create Course', guards: ['auth', 'instructor'] },
        { path: '/instructor/course/:id/edit', component: 'pages/edit-course', title: 'Edit Course', guards: ['auth', 'instructor'] },
        { path: '/instructor/analytics', component: 'pages/instructor-analytics', title: 'Analytics', guards: ['auth', 'instructor'] }
    ],
    
    // Command palette commands
    commands: [
        { id: 'dashboard', label: 'Go to Dashboard', category: 'Navigation', action: () => window.location.href = '/' },
        { id: 'courses', label: 'Browse Courses', category: 'Navigation', action: () => window.location.href = '/courses' },
        { id: 'my-learning', label: 'My Learning', category: 'Navigation', action: () => window.location.href = '/my-learning' },
        { id: 'continue', label: 'Continue Learning', category: 'Actions', action: () => {} }, // Dynamic
        { id: 'certificates', label: 'View Certificates', category: 'Profile', action: () => window.location.href = '/certificates' }
    ],
    
    // Course settings
    courseSettings: {
        enablePreview: true,
        enableCertificates: true,
        enableDiscussions: true,
        progressTracking: true,
        enableOffline: true,
        videoPlaybackRates: [0.5, 0.75, 1, 1.25, 1.5, 2]
    },
    
    // API endpoints
    api: {
        baseUrl: '/api/v1',
        endpoints: {
            courses: '/courses',
            course: '/course/:id',
            enroll: '/course/:id/enroll',
            progress: '/course/:id/progress',
            lessons: '/course/:id/lessons',
            lesson: '/lesson/:id',
            discussions: '/discussions',
            certificates: '/user/certificates',
            groups: '/groups'
        }
    },
    
    // Roles
    roles: {
        student: ['view-courses', 'enroll', 'learn', 'discuss'],
        instructor: ['create-course', 'edit-course', 'manage-students', 'view-analytics'],
        admin: ['*']
    },
    
    // Locale/i18n
    locale: {
        default: 'vi',
        supported: ['vi', 'en', 'zh-CN']
    }
};
