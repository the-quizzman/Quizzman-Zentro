/**
 * QMF Context - Application state & dependency injection
 * @version 1.0.0
 * @module kernel/context
 */

import eventBus from './event-bus.js';

// Context storage
const CONTEXT_STORE = new Map();
const PROVIDERS = new Map();
const COMPUTED = new Map();

class Context {
    constructor(namespace = 'global') {
        this.namespace = namespace;
        this._watchers = new Map();
    }

    /**
     * Set giá trị trong context
     * @param {string} key - Key
     * @param {any} value - Value
     * @param {Object} options - { persist, reactive }
     */
    set(key, value, options = {}) {
        const fullKey = this._getFullKey(key);
        const oldValue = CONTEXT_STORE.get(fullKey);

        CONTEXT_STORE.set(fullKey, value);

        // Persist to localStorage if needed
        if (options.persist) {
            try {
                localStorage.setItem(`qmf:${fullKey}`, JSON.stringify(value));
            } catch (e) {
                console.warn(`[Context] Failed to persist ${key}:`, e);
            }
        }

        // Notify watchers
        if (options.reactive !== false && oldValue !== value) {
            this._notifyWatchers(key, value, oldValue);
            eventBus.emit(`context:changed:${fullKey}`, { key, value, oldValue });
        }

        return value;
    }

    /**
     * Get giá trị từ context
     */
    get(key, defaultValue = null) {
        const fullKey = this._getFullKey(key);

        if (CONTEXT_STORE.has(fullKey)) {
            return CONTEXT_STORE.get(fullKey);
        }

        // Try localStorage
        try {
            const stored = localStorage.getItem(`qmf:${fullKey}`);
            if (stored) {
                const value = JSON.parse(stored);
                CONTEXT_STORE.set(fullKey, value);
                return value;
            }
        } catch (e) {}

        return defaultValue;
    }

    /**
     * Check key tồn tại
     */
    has(key) {
        return CONTEXT_STORE.has(this._getFullKey(key));
    }

    /**
     * Xóa key
     */
    delete(key) {
        const fullKey = this._getFullKey(key);
        const value = CONTEXT_STORE.get(fullKey);
        CONTEXT_STORE.delete(fullKey);
        localStorage.removeItem(`qmf:${fullKey}`);
        this._notifyWatchers(key, undefined, value);
        return true;
    }

    /**
     * Watch thay đổi của key
     */
    watch(key, callback, options = { immediate: false }) {
        if (!this._watchers.has(key)) {
            this._watchers.set(key, []);
        }

        this._watchers.get(key).push(callback);

        // Immediate callback
        if (options.immediate) {
            callback(this.get(key), undefined);
        }

        // Return unwatch function
        return () => {
            const watchers = this._watchers.get(key);
            const index = watchers.indexOf(callback);
            if (index > -1) watchers.splice(index, 1);
        };
    }

    /**
     * Tạo computed value
     */
    computed(key, computeFn, dependencies = []) {
        const fullKey = this._getFullKey(key);

        // Store compute function
        COMPUTED.set(fullKey, {
            fn: computeFn,
            deps: dependencies,
            value: null,
            dirty: true
        });

        // Watch dependencies
        for (const dep of dependencies) {
            this.watch(dep, () => {
                const computed = COMPUTED.get(fullKey);
                computed.dirty = true;
            });
        }

        // Return getter
        return () => {
            const computed = COMPUTED.get(fullKey);
            if (computed.dirty) {
                computed.value = computed.fn(this);
                computed.dirty = false;
            }
            return computed.value;
        };
    }

    /**
     * Register dependency provider
     */
    provide(key, providerFn) {
        PROVIDERS.set(this._getFullKey(key), providerFn);
    }

    /**
     * Inject dependency
     */
    inject(key) {
        const fullKey = this._getFullKey(key);
        const provider = PROVIDERS.get(fullKey);

        if (!provider) {
            throw new Error(`Provider not found: ${key}`);
        }

        return provider(this);
    }

    /**
     * Merge object vào context
     */
    merge(obj, options = {}) {
        for (const [key, value] of Object.entries(obj)) {
            this.set(key, value, options);
        }
    }

    /**
     * Lấy tất cả values trong namespace
     */
    getAll() {
        const prefix = `${this.namespace}:`;
        const result = {};

        for (const [key, value] of CONTEXT_STORE) {
            if (key.startsWith(prefix)) {
                const shortKey = key.substring(prefix.length);
                result[shortKey] = value;
            }
        }

        return result;
    }

    /**
     * Clear toàn bộ namespace
     */
    clear() {
        const prefix = `${this.namespace}:`;

        for (const key of CONTEXT_STORE.keys()) {
            if (key.startsWith(prefix)) {
                CONTEXT_STORE.delete(key);
            }
        }

        this._watchers.clear();
    }

    /**
     * Tạo child context với namespace mới
     */
    createChild(namespace) {
        return new Context(`${this.namespace}:${namespace}`);
    }

    /**
     * Serialize context thành JSON
     */
    toJSON() {
        return JSON.stringify(this.getAll());
    }

    /**
     * Restore từ JSON
     */
    fromJSON(json, options = {}) {
        const data = typeof json === 'string' ? JSON.parse(json) : json;
        this.merge(data, options);
    }

    _getFullKey(key) {
        return `${this.namespace}:${key}`;
    }

    _notifyWatchers(key, newValue, oldValue) {
        const watchers = this._watchers.get(key);
        if (!watchers) return;

        for (const callback of watchers) {
            try {
                callback(newValue, oldValue);
            } catch (e) {
                console.error(`[Context] Watcher error for ${key}:`, e);
            }
        }
    }
}

// Global context singleton
const globalContext = new Context('global');
const context = globalContext;

// App context factory
function createContext(namespace) {
    return new Context(namespace);
}

export default globalContext;
export { Context, createContext, context };
