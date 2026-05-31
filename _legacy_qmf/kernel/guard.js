/**
 * QMF Guard - Route guards & access control
 * @version 1.0.0
 * @module kernel/guard
 */

import eventBus from './event-bus.js';
import context from './context.js';

// Guard registry
const GUARDS = new Map();
const GUARD_CHAINS = new Map();

// Guard result types
const GUARD_RESULT = {
    ALLOW: 'allow',
    DENY: 'deny',
    REDIRECT: 'redirect',
    PENDING: 'pending'
};

class Guard {
    constructor(name, checkFn, options = {}) {
        this.name = name;
        this.check = checkFn;
        this.priority = options.priority || 0;
        this.async = options.async || false;
        this.cache = options.cache || false;
        this.cacheTTL = options.cacheTTL || 60000; // 1 minute
        this._cache = new Map();
    }

    /**
     * Execute guard check
     */
    async execute(route, ctx = {}) {
        // Check cache
        if (this.cache) {
            const cacheKey = this._getCacheKey(route, ctx);
            const cached = this._cache.get(cacheKey);
            if (cached && Date.now() - cached.time < this.cacheTTL) {
                return cached.result;
            }
        }

        try {
            const result = await this.check(route, ctx);
            const normalizedResult = this._normalizeResult(result);

            // Cache result
            if (this.cache) {
                const cacheKey = this._getCacheKey(route, ctx);
                this._cache.set(cacheKey, {
                    result: normalizedResult,
                    time: Date.now()
                });
            }

            return normalizedResult;
        } catch (error) {
            console.error(`[Guard] Error in ${this.name}:`, error);
            return {
                type: GUARD_RESULT.DENY,
                reason: error.message
            };
        }
    }

    _normalizeResult(result) {
        if (typeof result === 'boolean') {
            return {
                type: result ? GUARD_RESULT.ALLOW : GUARD_RESULT.DENY
            };
        }

        if (typeof result === 'string') {
            return {
                type: GUARD_RESULT.REDIRECT,
                target: result
            };
        }

        return result;
    }

    _getCacheKey(route, ctx) {
        return `${route.path}:${JSON.stringify(ctx.user?.id || 'anonymous')}`;
    }

    clearCache() {
        this._cache.clear();
    }
}

class GuardManager {
    constructor() {
        this.defaultGuards = [];
    }

    /**
     * Đăng ký guard
     */
    register(name, checkFn, options = {}) {
        const guard = new Guard(name, checkFn, options);
        GUARDS.set(name, guard);
        return guard;
    }

    /**
     * Lấy guard theo tên
     */
    get(name) {
        return GUARDS.get(name);
    }

    /**
     * Xóa guard
     */
    unregister(name) {
        GUARDS.delete(name);
    }

    /**
     * Tạo guard chain
     */
    chain(name, guardNames) {
        GUARD_CHAINS.set(name, guardNames);
        return this;
    }

    /**
     * Set default guards cho tất cả routes
     */
    setDefaults(guardNames) {
        this.defaultGuards = guardNames;
    }

    /**
     * Check route với guards
     */
    async check(route, ctx = {}) {
        const guardNames = this._getGuardsForRoute(route);

        if (guardNames.length === 0) {
            return { type: GUARD_RESULT.ALLOW };
        }

        // Sort guards by priority
        const guards = guardNames
            .map(name => {
                // Handle chain reference
                if (GUARD_CHAINS.has(name)) {
                    return GUARD_CHAINS.get(name).map(n => GUARDS.get(n));
                }
                return GUARDS.get(name);
            })
            .flat()
            .filter(Boolean)
            .sort((a, b) => b.priority - a.priority);

        // Execute guards in order
        for (const guard of guards) {
            const result = await guard.execute(route, ctx);

            eventBus.emit('guard:checked', {
                guard: guard.name,
                route,
                result
            });

            if (result.type !== GUARD_RESULT.ALLOW) {
                eventBus.emit('guard:blocked', {
                    guard: guard.name,
                    route,
                    result
                });
                return result;
            }
        }

        return { type: GUARD_RESULT.ALLOW };
    }

    /**
     * Decorator để wrap function với guard check
     */
    protect(guardNames) {
        return (target, key, descriptor) => {
            const original = descriptor.value;

            descriptor.value = async function(...args) {
                const ctx = { user: context.get('user') };
                const route = { path: key, meta: {} };

                const result = await guardManager.check(route, ctx);

                if (result.type !== GUARD_RESULT.ALLOW) {
                    throw new Error(`Access denied: ${result.reason || 'Unauthorized'}`);
                }

                return original.apply(this, args);
            };

            return descriptor;
        };
    }

    _getGuardsForRoute(route) {
        const routeGuards = route.meta?.guards || route.guards || [];
        return [...this.defaultGuards, ...routeGuards];
    }
}

// Singleton
const guardManager = new GuardManager();

// ============================================
// Built-in Guards
// ============================================

// Auth Guard - Kiểm tra đăng nhập
guardManager.register('auth', (route, ctx) => {
    const user = ctx.user || context.get('user');
    if (!user) {
        return {
            type: GUARD_RESULT.REDIRECT,
            target: '/login',
            reason: 'Authentication required'
        };
    }
    return { type: GUARD_RESULT.ALLOW };
}, { priority: 100, cache: true });

// Role Guard - Kiểm tra role
guardManager.register('role', (route, ctx) => {
    const user = ctx.user || context.get('user');
    const requiredRoles = route.meta?.roles || [];

    if (requiredRoles.length === 0) {
        return { type: GUARD_RESULT.ALLOW };
    }

    const userRoles = user?.roles || [];
    const hasRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
        return {
            type: GUARD_RESULT.DENY,
            reason: 'Insufficient permissions'
        };
    }

    return { type: GUARD_RESULT.ALLOW };
}, { priority: 90, cache: true });

// Permission Guard - Kiểm tra permission cụ thể
guardManager.register('permission', (route, ctx) => {
    const user = ctx.user || context.get('user');
    const requiredPermissions = route.meta?.permissions || [];

    if (requiredPermissions.length === 0) {
        return { type: GUARD_RESULT.ALLOW };
    }

    const userPermissions = user?.permissions || [];
    const hasAll = requiredPermissions.every(p => userPermissions.includes(p));

    if (!hasAll) {
        return {
            type: GUARD_RESULT.DENY,
            reason: 'Missing required permissions'
        };
    }

    return { type: GUARD_RESULT.ALLOW };
}, { priority: 80 });

// Guest Guard - Chỉ cho phép chưa đăng nhập
guardManager.register('guest', (route, ctx) => {
    const user = ctx.user || context.get('user');
    if (user) {
        return {
            type: GUARD_RESULT.REDIRECT,
            target: '/',
            reason: 'Already authenticated'
        };
    }
    return { type: GUARD_RESULT.ALLOW };
}, { priority: 100 });

// Create guard chain for protected routes
guardManager.chain('protected', ['auth', 'role', 'permission']);

export default guardManager;
export { Guard, GuardManager, GUARD_RESULT };
