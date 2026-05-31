/**
 * QMF Module Loader - Dynamic module loading với caching
 * @version 1.0.0
 * @module kernel/module-loader
 */

const MODULE_CACHE = new Map();
const LOADING_PROMISES = new Map();

class ModuleLoader {
    constructor() {
        this.baseUrl = '';
        this.versionSuffix = '';
        this.retryCount = 3;
        this.retryDelay = 1000;
    }

    /**
     * Cấu hình loader
     */
    configure(options = {}) {
        this.baseUrl = options.baseUrl || '';
        this.versionSuffix = options.version ? `.${options.version}` : '';
        this.retryCount = options.retryCount || 3;
        this.retryDelay = options.retryDelay || 1000;
    }

    /**
     * Load module với retry và caching
     * @param {string} modulePath - Đường dẫn module
     * @param {Object} options - Tùy chọn load
     */
    async load(modulePath, options = {}) {
        const fullPath = this._resolvePath(modulePath);
        const cacheKey = `${fullPath}:${options.version || 'latest'}`;

        // Check cache
        if (MODULE_CACHE.has(cacheKey) && !options.forceReload) {
            return MODULE_CACHE.get(cacheKey);
        }

        // Check if already loading
        if (LOADING_PROMISES.has(cacheKey)) {
            return LOADING_PROMISES.get(cacheKey);
        }

        // Start loading
        const loadPromise = this._loadWithRetry(fullPath, options);
        LOADING_PROMISES.set(cacheKey, loadPromise);

        try {
            const module = await loadPromise;
            MODULE_CACHE.set(cacheKey, module);
            return module;
        } finally {
            LOADING_PROMISES.delete(cacheKey);
        }
    }

    /**
     * Load nhiều modules cùng lúc
     */
    async loadAll(modulePaths, options = {}) {
        const promises = modulePaths.map(path => this.load(path, options));
        return Promise.all(promises);
    }

    /**
     * Load module với retry mechanism
     */
    async _loadWithRetry(path, options, attempt = 1) {
        try {
            const module = await this._doLoad(path, options);
            return module;
        } catch (error) {
            if (attempt < this.retryCount) {
                await this._delay(this.retryDelay * attempt);
                return this._loadWithRetry(path, options, attempt + 1);
            }
            throw new Error(`Failed to load module after ${this.retryCount} attempts: ${path}`);
        }
    }

    /**
     * Thực hiện load module
     */
    async _doLoad(path, options = {}) {
        // Append version suffix nếu có
        const versionedPath = options.version 
            ? path.replace(/\.js$/, `.${options.version}.js`)
            : path;

        if (options.type === 'script') {
            return this._loadScript(versionedPath);
        }

        if (options.type === 'style') {
            return this._loadStyle(versionedPath);
        }

        // Default: ES module import
        return import(versionedPath);
    }

    /**
     * Load script tag
     */
    _loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => resolve({ src, type: 'script' });
            script.onerror = () => reject(new Error(`Script load failed: ${src}`));
            document.head.appendChild(script);
        });
    }

    /**
     * Load stylesheet
     */
    _loadStyle(href) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => resolve({ href, type: 'style' });
            link.onerror = () => reject(new Error(`Style load failed: ${href}`));
            document.head.appendChild(link);
        });
    }

    /**
     * Preload module (không execute)
     */
    preload(modulePath) {
        const fullPath = this._resolvePath(modulePath);
        const link = document.createElement('link');
        link.rel = 'modulepreload';
        link.href = fullPath;
        document.head.appendChild(link);
    }

    /**
     * Xóa module khỏi cache
     */
    invalidate(modulePath) {
        const fullPath = this._resolvePath(modulePath);
        for (const [key] of MODULE_CACHE) {
            if (key.startsWith(fullPath)) {
                MODULE_CACHE.delete(key);
            }
        }
    }

    /**
     * Xóa toàn bộ cache
     */
    clearCache() {
        MODULE_CACHE.clear();
    }

    /**
     * Resolve đường dẫn đầy đủ
     */
    _resolvePath(modulePath) {
        if (modulePath.startsWith('http') || modulePath.startsWith('/')) {
            return modulePath;
        }
        return `${this.baseUrl}/${modulePath}`;
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton export
const moduleLoader = new ModuleLoader();

export default moduleLoader;
export { ModuleLoader };
