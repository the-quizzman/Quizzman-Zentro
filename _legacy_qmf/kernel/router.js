/**
 * QMF Router
 * Simple SPA routing system
 * @version 2.0.0
 */

import { eventBus } from './event-bus.js';

class RouteManager {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.config = null;
    }
    
    /**
     * Initialize router
     */
    async init(config = {}) {
        this.config = {
            mode: config.mode || 'history', // history | hash
            base: config.base || '',
            routes: config.routes || []
        };
        
        // Register routes
        for (const route of this.config.routes) {
            this.register(route);
        }
        
        // Listen for navigation
        window.addEventListener('popstate', () => this.handleRoute());
        
        // Initial route
        await this.handleRoute();
        
        eventBus.emit('router:initialized');
    }
    
    /**
     * Register a route
     */
    register(route) {
        const pattern = this.pathToPattern(route.path);
        this.routes.set(pattern, route);
    }
    
    /**
     * Convert path to regex pattern
     */
    pathToPattern(path) {
        const pattern = path
            .replace(/\//g, '\\/')
            .replace(/:(\w+)/g, '(?<$1>[^/]+)');
        return new RegExp(`^${pattern}$`);
    }
    
    /**
     * Navigate to a path
     */
    async navigate(path, options = {}) {
        const fullPath = this.config.base + path;
        
        if (this.config.mode === 'history') {
            if (options.replace) {
                history.replaceState(null, '', fullPath);
            } else {
                history.pushState(null, '', fullPath);
            }
        } else {
            location.hash = path;
        }
        
        await this.handleRoute();
    }
    
    /**
     * Handle current route
     */
    async handleRoute() {
        const path = this.getCurrentPath();
        
        for (const [pattern, route] of this.routes) {
            const match = path.match(pattern);
            if (match) {
                const params = match.groups || {};
                
                // Check guard
                if (route.guard && typeof route.guard === 'function') {
                    const allowed = await route.guard(params);
                    if (!allowed) {
                        if (route.redirect) {
                            this.navigate(route.redirect, { replace: true });
                        }
                        return;
                    }
                }
                
                this.currentRoute = { ...route, params, path };
                
                eventBus.emit('router:route-changed', this.currentRoute);
                
                // Load component if defined
                if (route.component) {
                    await this.loadComponent(route.component, params);
                }
                
                return;
            }
        }
        
        // 404
        eventBus.emit('router:not-found', { path });
    }
    
    /**
     * Get current path
     */
    getCurrentPath() {
        if (this.config.mode === 'history') {
            let path = location.pathname;
            if (this.config.base && path.startsWith(this.config.base)) {
                path = path.slice(this.config.base.length);
            }
            return path || '/';
        } else {
            return location.hash.slice(1) || '/';
        }
    }
    
    /**
     * Load route component
     */
    async loadComponent(component, params) {
        if (typeof component === 'function') {
            const module = await component();
            if (module.default && typeof module.default === 'function') {
                await module.default(params);
            }
        }
    }
    
    /**
     * Get current route
     */
    getCurrent() {
        return this.currentRoute;
    }
}

export const routeManager = new RouteManager();
export default routeManager;
