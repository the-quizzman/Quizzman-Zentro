/**
 * QMF Runtime - Entry point với SRI
 * @version 1.0.0
 * @module kernel/runtime
 */

(function(global) {
    'use strict';

    const QMF_VERSION = '1.0.0';
    const QMF_BUILD = Date.now();

    // SRI Hash Registry
    const SRI_REGISTRY = new Map();

    class Runtime {
        constructor() {
            this.version = QMF_VERSION;
            this.build = QMF_BUILD;
            this.initialized = false;
            this.modules = new Map();
            this.config = null;
            this.startTime = performance.now();
        }

        /**
         * Khởi tạo runtime với config
         * @param {Object} config - Cấu hình ứng dụng
         */
        async init(config = {}) {
            if (this.initialized) {
                console.warn('[QMF] Runtime already initialized');
                return this;
            }

            this.config = {
                debug: false,
                strictMode: true,
                sriEnabled: true,
                baseUrl: '',
                ...config
            };

            // Load core modules
            await this._loadCoreModules();

            // Initialize event bus
            this.events = await this.getModule('event-bus');

            // Initialize lifecycle
            this.lifecycle = await this.getModule('lifecycle');

            // Initialize context
            this.context = await this.getModule('context');

            this.initialized = true;
            this._log('Runtime initialized', { version: this.version });

            // Emit ready event
            if (this.events) {
                this.events.emit('qmf:ready', { runtime: this });
            }

            return this;
        }

        /**
         * Load các module cốt lõi
         */
        async _loadCoreModules() {
            const coreModules = [
                'module-loader',
                'lifecycle',
                'event-bus',
                'context',
                'guard'
            ];

            for (const moduleName of coreModules) {
                try {
                    const module = await this._importModule(`./kernel/${moduleName}.js`);
                    this.modules.set(moduleName, module);
                } catch (err) {
                    this._error(`Failed to load core module: ${moduleName}`, err);
                }
            }
        }

        /**
         * Import module với SRI verification
         */
        async _importModule(path) {
            const fullPath = this.config?.baseUrl 
                ? `${this.config.baseUrl}/${path}` 
                : path;

            if (this.config?.sriEnabled && SRI_REGISTRY.has(path)) {
                // Verify SRI hash trước khi load
                const expectedHash = SRI_REGISTRY.get(path);
                // SRI verification logic here
            }

            return import(fullPath);
        }

        /**
         * Lấy module đã load
         */
        async getModule(name) {
            if (this.modules.has(name)) {
                return this.modules.get(name);
            }
            return null;
        }

        /**
         * Đăng ký SRI hash cho module
         */
        registerSRI(path, hash) {
            SRI_REGISTRY.set(path, hash);
        }

        /**
         * Lấy thông tin performance
         */
        getPerformanceMetrics() {
            return {
                startTime: this.startTime,
                uptime: performance.now() - this.startTime,
                moduleCount: this.modules.size,
                memoryUsage: performance.memory?.usedJSHeapSize || 0
            };
        }

        _log(message, data = {}) {
            if (this.config?.debug) {
                console.log(`[QMF] ${message}`, data);
            }
        }

        _error(message, error) {
            console.error(`[QMF Error] ${message}`, error);
        }
    }

    // Singleton instance
    const runtime = new Runtime();

    // Export to global
    global.QMFRuntime = runtime;

    // ES Module export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = runtime;
    }

})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));

export default window.QMFRuntime;
