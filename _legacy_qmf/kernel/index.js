/**
 * QMF Kernel - Entry Point
 * Main initialization and exports
 * @version 2.0.0
 */

import { eventBus } from './event-bus.js';
import { kernel } from './core.js';
import { stateManager } from './state.js';
import { routeManager } from './router.js';

/**
 * QMF Configuration
 */
const defaultConfig = {
    appId: 'qmf-app',
    version: '2.0.0',
    debug: false,
    
    // API endpoints
    apiBase: 'https://api.quizzman.com',
    idApiBase: 'https://id.quizzman.com',
    socketUrl: 'wss://socket.quizzman.com',
    chatApiBase: 'https://chat.quizzman.com',
    notiApiBase: 'https://noti.quizzman.com',
    
    // Feature flags
    features: {
        chat: true,
        notifications: true,
        realtime: true
    },
    
    // UI options
    ui: {
        theme: 'auto', // auto | light | dark
        headerLayout: 'default',
        sidebarEnabled: false
    }
};

/**
 * QMF Instance
 */
class QMF {
    constructor() {
        this.config = { ...defaultConfig };
        this.initialized = false;
        this.services = null;
        this.plugins = new Map();
    }
    
    /**
     * Initialize QMF framework
     */
    async init(userConfig = {}) {
        if (this.initialized) {
            console.warn('[QMF] Already initialized');
            return this;
        }
        
        // Merge config
        this.config = this.mergeConfig(defaultConfig, userConfig);
        
        console.log(`[QMF] Initializing v${this.config.version}...`);
        
        // Initialize kernel components
        await kernel.init(this.config);
        
        // Initialize state manager
        stateManager.init({
            persist: ['auth', 'preferences']
        });
        
        // Initialize router if SPA mode
        if (this.config.routing) {
            await routeManager.init(this.config.routing);
        }
        
        // Load services
        if (this.config.features.realtime || this.config.features.chat || this.config.features.notifications) {
            await this.loadServices();
        }
        
        // Apply theme
        this.applyTheme(this.config.ui.theme);
        
        this.initialized = true;
        eventBus.emit('qmf:initialized', { config: this.config });
        
        console.log('[QMF] Initialized successfully');
        return this;
    }
    
    /**
     * Load services bundle
     */
    async loadServices() {
        try {
            const { initServices } = await import('../services/index.js');
            this.services = await initServices({
                apiBase: this.config.apiBase,
                idApiBase: this.config.idApiBase,
                socketUrl: this.config.socketUrl,
                chatApiBase: this.config.chatApiBase,
                notiApiBase: this.config.notiApiBase,
                features: this.config.features
            });
            console.log('[QMF] Services loaded');
        } catch (error) {
            console.error('[QMF] Failed to load services:', error);
        }
    }
    
    /**
     * Load UI plugins
     */
    async loadUI() {
        try {
            const { initUI } = await import('../plugins/index.js');
            await initUI({
                header: this.config.ui.headerLayout !== 'none',
                chat: this.config.features.chat,
                notifications: this.config.features.notifications,
                container: this.config.container || document.body
            });
            console.log('[QMF] UI plugins loaded');
        } catch (error) {
            console.error('[QMF] Failed to load UI:', error);
        }
    }
    
    /**
     * Register a plugin
     */
    registerPlugin(name, plugin) {
        if (this.plugins.has(name)) {
            console.warn(`[QMF] Plugin '${name}' already registered`);
            return;
        }
        
        this.plugins.set(name, plugin);
        
        if (typeof plugin.init === 'function') {
            plugin.init(this.config);
        }
        
        eventBus.emit('qmf:plugin-registered', { name, plugin });
    }
    
    /**
     * Get plugin instance
     */
    getPlugin(name) {
        return this.plugins.get(name);
    }
    
    /**
     * Apply theme
     */
    applyTheme(theme) {
        const root = document.documentElement;
        
        if (theme === 'auto') {
            // Use system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.toggle('qmf-dark', prefersDark);
            
            // Listen for changes
            window.matchMedia('(prefers-color-scheme: dark)')
                .addEventListener('change', e => {
                    root.classList.toggle('qmf-dark', e.matches);
                });
        } else {
            root.classList.toggle('qmf-dark', theme === 'dark');
        }
    }
    
    /**
     * Deep merge config objects
     */
    mergeConfig(defaults, overrides) {
        const result = { ...defaults };
        
        for (const key in overrides) {
            if (overrides[key] && typeof overrides[key] === 'object' && !Array.isArray(overrides[key])) {
                result[key] = this.mergeConfig(result[key] || {}, overrides[key]);
            } else {
                result[key] = overrides[key];
            }
        }
        
        return result;
    }
    
    /**
     * Destroy QMF instance
     */
    destroy() {
        this.plugins.forEach((plugin, name) => {
            if (typeof plugin.destroy === 'function') {
                plugin.destroy();
            }
        });
        
        this.plugins.clear();
        this.initialized = false;
        
        eventBus.emit('qmf:destroyed');
    }
}

// Singleton instance
const qmf = new QMF();

/**
 * Quick init function
 */
export async function initQMF(config) {
    return qmf.init(config);
}

// ==================== KERNEL EXPORTS ====================
export { qmf as default, qmf };
export { eventBus } from './event-bus.js';
export { kernel } from './core.js';
export { stateManager } from './state.js';
export { routeManager } from './router.js';
export { httpClient } from './http.js';

// ==================== SERVICES EXPORTS ====================
// Re-export all services for single entry import
export { 
    initServices,
    realtimeService,
    authService,
    chatService,
    notificationService
} from '../services/index.js';

// ==================== UI PLUGINS EXPORTS ====================
// Re-export UI plugins for single entry import
export { 
    initUI,
    getUIPlugin,
    registerUIPlugin
} from '../plugins/index.js';
