/**
 * QMF Router - Client-side routing
 * @version 1.0.0
 * @module navigation/router
 */

import eventBus from '../kernel/event-bus.js';
import guardManager from '../kernel/guard.js';
import context from '../kernel/context.js';
import mount from '../layout/mount.js';

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.previousRoute = null;
        this.history = [];
        this.maxHistory = 50;
        this.mode = 'history'; // 'history' | 'hash'
        this.base = '';
        this.beforeHooks = [];
        this.afterHooks = [];
        this.errorHandlers = [];
        this._initialized = false;
    }

    /**
     * Khởi tạo router
     */
    init(options = {}) {
        if (this._initialized) return this;

        this.mode = options.mode || 'history';
        this.base = options.base || '';

        // Setup listeners
        if (this.mode === 'history') {
            window.addEventListener('popstate', (e) => this._handlePopState(e));
        } else {
            window.addEventListener('hashchange', () => this._handleHashChange());
        }

        // Intercept link clicks
        document.addEventListener('click', (e) => this._handleLinkClick(e));

        this._initialized = true;

        // Navigate to current URL
        const initialPath = this._getCurrentPath();
        this.navigate(initialPath, { replace: true, initial: true });

        eventBus.emit('router:init', { mode: this.mode, base: this.base });

        return this;
    }

    /**
     * Đăng ký route
     */
    register(path, config) {
        const route = {
            path,
            pattern: this._pathToPattern(path),
            params: this._extractParamNames(path),
            component: config.component,
            name: config.name || path,
            meta: config.meta || {},
            guards: config.guards || [],
            children: config.children || [],
            redirect: config.redirect || null,
            props: config.props || null,
            beforeEnter: config.beforeEnter || null
        };

        this.routes.set(path, route);

        // Register children
        if (config.children) {
            for (const child of config.children) {
                const childPath = path === '/' 
                    ? `/${child.path}` 
                    : `${path}/${child.path}`;
                this.register(childPath, child);
            }
        }

        return this;
    }

    /**
     * Đăng ký nhiều routes
     */
    registerAll(routes) {
        for (const [path, config] of Object.entries(routes)) {
            this.register(path, config);
        }
        return this;
    }

    /**
     * Navigate tới path
     */
    async navigate(path, options = {}) {
        const { replace = false, initial = false, state = {} } = options;

        // Resolve path
        const fullPath = this._resolvePath(path);

        // Find matching route
        const { route, params, query } = this._matchRoute(fullPath);

        if (!route) {
            return this._handleNotFound(fullPath);
        }

        // Handle redirect
        if (route.redirect) {
            return this.navigate(route.redirect, options);
        }

        // Build navigation context
        const to = {
            path: fullPath,
            route,
            params,
            query,
            meta: route.meta,
            state
        };

        const from = this.currentRoute;

        // Run guards
        try {
            const guardResult = await this._runGuards(to, from);
            if (guardResult.type !== 'allow') {
                if (guardResult.type === 'redirect') {
                    return this.navigate(guardResult.target);
                }
                eventBus.emit('router:blocked', { to, from, reason: guardResult.reason });
                return false;
            }
        } catch (error) {
            return this._handleError(error, to, from);
        }

        // Run before hooks
        for (const hook of this.beforeHooks) {
            const result = await hook(to, from);
            if (result === false) return false;
            if (typeof result === 'string') {
                return this.navigate(result);
            }
        }

        // Emit before event
        eventBus.emit('router:before', { to, from });

        // Update browser history
        if (!initial) {
            this._updateHistory(fullPath, state, replace);
        }

        // Store previous route
        this.previousRoute = this.currentRoute;

        // Update current route
        this.currentRoute = to;

        // Store in context
        context.set('router:current', to);

        // Add to history
        this._addToHistory(to);

        // Mount component
        try {
            await this._mountRoute(route, params, query);
        } catch (error) {
            return this._handleError(error, to, from);
        }

        // Run after hooks
        for (const hook of this.afterHooks) {
            await hook(to, from);
        }

        // Emit after event
        eventBus.emit('router:after', { to, from });

        return true;
    }

    /**
     * Navigate by route name
     */
    async navigateByName(name, params = {}, query = {}) {
        const route = this._findRouteByName(name);
        if (!route) {
            throw new Error(`Route not found: ${name}`);
        }

        const path = this._buildPath(route.path, params, query);
        return this.navigate(path);
    }

    /**
     * Go back in history
     */
    back() {
        window.history.back();
    }

    /**
     * Go forward in history
     */
    forward() {
        window.history.forward();
    }

    /**
     * Go to specific history index
     */
    go(delta) {
        window.history.go(delta);
    }

    /**
     * Replace current route
     */
    replace(path, state = {}) {
        return this.navigate(path, { replace: true, state });
    }

    /**
     * Add before navigation hook
     */
    beforeEach(hook) {
        this.beforeHooks.push(hook);
        return () => {
            const index = this.beforeHooks.indexOf(hook);
            if (index > -1) this.beforeHooks.splice(index, 1);
        };
    }

    /**
     * Add after navigation hook
     */
    afterEach(hook) {
        this.afterHooks.push(hook);
        return () => {
            const index = this.afterHooks.indexOf(hook);
            if (index > -1) this.afterHooks.splice(index, 1);
        };
    }

    /**
     * Add error handler
     */
    onError(handler) {
        this.errorHandlers.push(handler);
        return () => {
            const index = this.errorHandlers.indexOf(handler);
            if (index > -1) this.errorHandlers.splice(index, 1);
        };
    }

    /**
     * Get current route
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Get route by path
     */
    getRoute(path) {
        return this.routes.get(path);
    }

    /**
     * Get all registered routes
     */
    getRoutes() {
        return Array.from(this.routes.values());
    }

    /**
     * Check if route matches current
     */
    isActive(path, exact = false) {
        if (!this.currentRoute) return false;

        if (exact) {
            return this.currentRoute.path === path;
        }

        return this.currentRoute.path.startsWith(path);
    }

    /**
     * Build URL for route
     */
    buildUrl(path, params = {}, query = {}) {
        const builtPath = this._buildPath(path, params, query);
        return `${this.base}${builtPath}`;
    }

    // ============================================
    // Private methods
    // ============================================

    _getCurrentPath() {
        if (this.mode === 'hash') {
            return window.location.hash.slice(1) || '/';
        }
        let path = window.location.pathname;
        if (this.base && path.startsWith(this.base)) {
            path = path.slice(this.base.length);
        }
        return path || '/';
    }

    _resolvePath(path) {
        if (path.startsWith('/')) return path;
        if (path.startsWith('./') && this.currentRoute) {
            const parentPath = this.currentRoute.path.split('/').slice(0, -1).join('/');
            return `${parentPath}/${path.slice(2)}`;
        }
        return `/${path}`;
    }

    _pathToPattern(path) {
        const pattern = path
            .replace(/:[^/]+/g, '([^/]+)')
            .replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`);
    }

    _extractParamNames(path) {
        const matches = path.match(/:[^/]+/g);
        return matches ? matches.map(m => m.slice(1)) : [];
    }

    _matchRoute(path) {
        // Parse query string
        const [pathname, queryString] = path.split('?');
        const query = this._parseQuery(queryString);

        for (const [, route] of this.routes) {
            const match = pathname.match(route.pattern);
            if (match) {
                const params = {};
                route.params.forEach((name, index) => {
                    params[name] = match[index + 1];
                });
                return { route, params, query };
            }
        }

        return { route: null, params: {}, query };
    }

    _parseQuery(queryString) {
        if (!queryString) return {};
        const params = new URLSearchParams(queryString);
        const query = {};
        for (const [key, value] of params) {
            query[key] = value;
        }
        return query;
    }

    _buildPath(path, params, query) {
        let builtPath = path;

        // Replace params
        for (const [key, value] of Object.entries(params)) {
            builtPath = builtPath.replace(`:${key}`, value);
        }

        // Add query string
        if (Object.keys(query).length > 0) {
            const queryString = new URLSearchParams(query).toString();
            builtPath += `?${queryString}`;
        }

        return builtPath;
    }

    _findRouteByName(name) {
        for (const [, route] of this.routes) {
            if (route.name === name) return route;
        }
        return null;
    }

    async _runGuards(to, from) {
        // Route-specific beforeEnter
        if (to.route.beforeEnter) {
            const result = await to.route.beforeEnter(to, from);
            if (result !== true) return result;
        }

        // Global guards
        return guardManager.check(to.route, {
            user: context.get('user'),
            to,
            from
        });
    }

    async _mountRoute(route, params, query) {
        if (!route.component) return;

        const props = typeof route.props === 'function'
            ? route.props({ params, query })
            : route.props || { params, query };

        // Mount to main region
        await mount.mount('main', route.component, props);
    }

    _updateHistory(path, state, replace) {
        const url = this.mode === 'hash' ? `#${path}` : `${this.base}${path}`;

        if (replace) {
            window.history.replaceState(state, '', url);
        } else {
            window.history.pushState(state, '', url);
        }
    }

    _addToHistory(route) {
        this.history.push({
            path: route.path,
            params: route.params,
            timestamp: Date.now()
        });

        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    _handlePopState(event) {
        const path = this._getCurrentPath();
        this.navigate(path, { replace: true, state: event.state });
    }

    _handleHashChange() {
        const path = this._getCurrentPath();
        this.navigate(path, { replace: true });
    }

    _handleLinkClick(event) {
        const link = event.target.closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');

        // Ignore external links
        if (href.startsWith('http') || href.startsWith('//')) return;

        // Ignore special links
        if (link.hasAttribute('target') || link.hasAttribute('download')) return;
        if (link.dataset.noRouter !== undefined) return;

        // Prevent default and navigate
        event.preventDefault();
        this.navigate(href);
    }

    _handleNotFound(path) {
        eventBus.emit('router:notFound', { path });

        // Try 404 route
        const notFoundRoute = this.routes.get('/404') || this.routes.get('*');
        if (notFoundRoute) {
            return this._mountRoute(notFoundRoute, { path }, {});
        }

        console.warn(`[Router] Route not found: ${path}`);
        return false;
    }

    _handleError(error, to, from) {
        for (const handler of this.errorHandlers) {
            handler(error, to, from);
        }
        eventBus.emit('router:error', { error, to, from });
        throw error;
    }
}

// Singleton export
const router = new Router();
export default router;
export { Router };
