/**
 * QMF Kernel Core
 * Core initialization and lifecycle management
 * @version 2.0.0
 */

import { eventBus } from './event-bus.js';

class Kernel {
    constructor() {
        this.config = null;
        this.initialized = false;
        this.modules = new Map();
    }
    
    /**
     * Initialize kernel
     */
    async init(config) {
        if (this.initialized) {
            return this;
        }
        
        this.config = config;
        
        // Setup global error handling
        this.setupErrorHandling();
        
        // Setup performance monitoring
        if (config.debug) {
            this.setupPerformanceMonitoring();
        }
        
        this.initialized = true;
        eventBus.emit('kernel:initialized');
        
        return this;
    }
    
    /**
     * Register a module
     */
    register(name, module) {
        this.modules.set(name, module);
        eventBus.emit('kernel:module-registered', { name });
    }
    
    /**
     * Get a module
     */
    get(name) {
        return this.modules.get(name);
    }
    
    /**
     * Setup global error handling
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            eventBus.emit('kernel:error', {
                type: 'error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            eventBus.emit('kernel:error', {
                type: 'unhandledrejection',
                reason: event.reason
            });
        });
    }
    
    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    eventBus.emit('kernel:performance', entry);
                }
            });
            
            observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
        }
    }
    
    /**
     * Get config value
     */
    getConfig(path) {
        if (!path) return this.config;
        
        return path.split('.').reduce((obj, key) => obj?.[key], this.config);
    }
}

export const kernel = new Kernel();
export default kernel;
