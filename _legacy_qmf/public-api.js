/**
 * QMF Public API
 * Main entry point for QMF framework
 * @version 1.0.0
 */

// Kernel modules
import { runtime } from './kernel/runtime.js';
import { moduleLoader } from './kernel/module-loader.js';
import { lifecycle } from './kernel/lifecycle.js';
import { eventBus } from './kernel/event-bus.js';
import { context } from './kernel/context.js';
import { guardManager } from './kernel/guard.js';

// Platform modules
import { device } from './platform/device.js';
import { viewport } from './platform/viewport.js';
import { capability } from './platform/capability.js';
import { performance } from './platform/performance.js';

// Layout modules
import { appShell } from './layout/shell.js';
import { regionManager } from './layout/regions.js';
import { mountManager } from './layout/mount.js';

// Navigation modules
import { router } from './navigation/router.js';
import { menuRegistry } from './navigation/menu-registry.js';
import { breadcrumb } from './navigation/breadcrumb.js';

// UI primitives
import { QMFButton } from './ui/button/index.js';
import { QMFModal } from './ui/modal/index.js';
import { QMFDropdown } from './ui/dropdown/index.js';
import { QMFOverlay } from './ui/overlay/index.js';

// Feedback components
import { toastManager } from './feedback/toast.js';
import { loadingManager } from './feedback/loading.js';
import { dialogManager } from './feedback/dialog.js';

// Plugins
import { headerPlugin } from './plugins/header/index.js';
import { sidebarPlugin } from './plugins/sidebar/index.js';
import { footerPlugin } from './plugins/footer/index.js';
import { commandPalette } from './plugins/command-palette/index.js';
import { notificationCenter } from './plugins/notification-center/index.js';

/**
 * QMF Main Framework Object
 */
const QMF = {
    // Version
    version: '1.0.0',
    
    // Kernel
    runtime,
    moduleLoader,
    lifecycle,
    eventBus,
    context,
    guards: guardManager,
    
    // Platform
    device,
    viewport,
    capability,
    performance,
    
    // Layout
    shell: appShell,
    regions: regionManager,
    mount: mountManager,
    
    // Navigation
    router,
    menu: menuRegistry,
    breadcrumb,
    
    // UI Components
    ui: {
        Button: QMFButton,
        Modal: QMFModal,
        Dropdown: QMFDropdown,
        Overlay: QMFOverlay
    },
    
    // Feedback
    toast: toastManager,
    loading: loadingManager,
    dialog: dialogManager,
    
    // Plugins
    plugins: {
        header: headerPlugin,
        sidebar: sidebarPlugin,
        footer: footerPlugin,
        commandPalette,
        notificationCenter
    },
    
    /**
     * Initialize QMF framework
     * @param {Object} appConfig - Application configuration
     * @returns {Promise<void>}
     */
    async init(appConfig) {
        const startTime = Date.now();
        
        console.log(`[QMF] Initializing v${this.version}...`);
        
        try {
            // Store app config in context
            context.set('app', appConfig.app);
            context.set('config', appConfig);
            
            // Initialize platform detection
            device.init();
            viewport.init();
            capability.init();
            
            // Initialize runtime
            await runtime.init({
                appId: appConfig.app?.id,
                version: appConfig.app?.version
            });
            
            // Initialize guards
            guardManager.init();
            
            // Register default guards
            this._registerDefaultGuards(appConfig);
            
            // Initialize router
            router.init({
                routes: appConfig.routes || [],
                mode: 'history'
            });
            
            // Initialize shell layout
            appShell.init({
                theme: appConfig.branding?.theme || 'light'
            });
            
            // Initialize header
            if (appConfig.header) {
                headerPlugin.init(appConfig.header);
            }
            
            // Initialize sidebar
            if (appConfig.sidebar) {
                sidebarPlugin.init(appConfig.sidebar);
            }
            
            // Initialize footer
            if (appConfig.footer) {
                footerPlugin.init(appConfig.footer);
            }
            
            // Initialize command palette
            if (appConfig.features?.commandPalette !== false) {
                commandPalette.init({
                    commands: appConfig.commands || []
                });
            }
            
            // Initialize notification center
            if (appConfig.features?.notifications !== false) {
                notificationCenter.init();
            }
            
            // Mount shell
            appShell.mount(document.getElementById('app') || document.body);
            
            // Mount plugins to shell regions
            if (appConfig.header) {
                headerPlugin.mount(appShell.getRegion('header'));
            }
            
            if (appConfig.sidebar) {
                sidebarPlugin.mount(appShell.getRegion('sidebar'));
            }
            
            if (appConfig.footer) {
                footerPlugin.mount(appShell.getRegion('footer'));
            }
            
            // Start performance monitoring
            if (appConfig.features?.performanceMonitoring !== false) {
                performance.init();
            }
            
            // Apply theme
            if (appConfig.branding?.theme === 'dark') {
                document.documentElement.dataset.theme = 'dark';
            }
            
            // Apply primary color if custom
            if (appConfig.branding?.color) {
                document.documentElement.style.setProperty('--qmf-color-primary', appConfig.branding.color);
            }
            
            // Emit ready event
            const initTime = Date.now() - startTime;
            eventBus.emit('qmf:ready', { 
                app: appConfig.app?.id,
                initTime 
            });
            
            console.log(`[QMF] Initialized in ${initTime}ms`);
            
            return this;
            
        } catch (error) {
            console.error('[QMF] Initialization failed:', error);
            eventBus.emit('qmf:error', { error });
            throw error;
        }
    },
    
    /**
     * Register default guards based on config
     */
    _registerDefaultGuards(appConfig) {
        // Auth guard
        guardManager.register('auth', async (to, from) => {
            const user = context.get('user');
            if (!user) {
                // Redirect to login
                return { redirect: '/login', query: { returnUrl: to.path } };
            }
            return true;
        });
        
        // Role-based guards
        const roles = appConfig.roles || {};
        Object.keys(roles).forEach(role => {
            guardManager.register(role, async (to, from) => {
                const user = context.get('user');
                if (!user) return { redirect: '/login' };
                
                const userRoles = user.roles || [];
                if (!userRoles.includes(role) && !userRoles.includes('superadmin')) {
                    return { redirect: '/403' };
                }
                return true;
            });
        });
    },
    
    /**
     * Load app configuration dynamically
     */
    async loadApp(appId) {
        const config = await import(`./apps/${appId}.js`);
        return this.init(config.default);
    },
    
    /**
     * Quick toast notification
     */
    notify(message, type = 'info') {
        return this.toast.show({ message, type });
    },
    
    /**
     * Navigate to route
     */
    navigate(path, options = {}) {
        return router.navigate(path, options);
    },
    
    /**
     * Get current user
     */
    getUser() {
        return context.get('user');
    },
    
    /**
     * Set current user
     */
    setUser(user) {
        context.set('user', user);
        eventBus.emit('user:changed', { user });
    },
    
    /**
     * Check if user has permission
     */
    can(permission) {
        const user = this.getUser();
        if (!user) return false;
        
        const permissions = user.permissions || [];
        return permissions.includes('*') || permissions.includes(permission);
    },
    
    /**
     * Get app config
     */
    getConfig(key) {
        return key ? context.get(`config.${key}`) : context.get('config');
    }
};

// Freeze main object to prevent modifications
Object.freeze(QMF);

// Export default and named exports
export default QMF;
export {
    // Kernel
    runtime,
    moduleLoader,
    lifecycle,
    eventBus,
    context,
    guardManager,
    
    // Platform
    device,
    viewport,
    capability,
    performance,
    
    // Layout
    appShell,
    regionManager,
    mountManager,
    
    // Navigation
    router,
    menuRegistry,
    breadcrumb,
    
    // UI
    QMFButton,
    QMFModal,
    QMFDropdown,
    QMFOverlay,
    
    // Feedback
    toastManager,
    loadingManager,
    dialogManager,
    
    // Plugins
    headerPlugin,
    sidebarPlugin,
    footerPlugin,
    commandPalette,
    notificationCenter
};

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.QMF = QMF;
}
