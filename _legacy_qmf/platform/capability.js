/**
 * QMF Capability - Feature detection & capability checks
 * @version 1.0.0
 * @module platform/capability
 */

import eventBus from '../kernel/event-bus.js';

// Capability cache
const CAPABILITY_CACHE = new Map();

class CapabilityDetector {
    constructor() {
        this._asyncCapabilities = new Map();
    }

    /**
     * Check tất cả capabilities
     */
    async detectAll() {
        const capabilities = {
            // Storage
            localStorage: this.check('localStorage'),
            sessionStorage: this.check('sessionStorage'),
            indexedDB: this.check('indexedDB'),
            cacheAPI: this.check('cacheAPI'),

            // Network
            fetch: this.check('fetch'),
            webSocket: this.check('webSocket'),
            webRTC: this.check('webRTC'),
            serviceWorker: this.check('serviceWorker'),
            beacon: this.check('beacon'),

            // Media
            webGL: this.check('webGL'),
            webGL2: this.check('webGL2'),
            canvas: this.check('canvas'),
            webAudio: this.check('webAudio'),
            mediaRecorder: this.check('mediaRecorder'),
            mediaDevices: this.check('mediaDevices'),
            
            // Image formats (async)
            webp: await this.checkAsync('webp'),
            avif: await this.checkAsync('avif'),

            // Input
            touch: this.check('touch'),
            pointer: this.check('pointer'),
            gamepad: this.check('gamepad'),
            clipboard: this.check('clipboard'),
            
            // Notifications
            notification: this.check('notification'),
            pushManager: this.check('pushManager'),
            vibrate: this.check('vibrate'),

            // Performance
            performanceAPI: this.check('performanceAPI'),
            intersectionObserver: this.check('intersectionObserver'),
            resizeObserver: this.check('resizeObserver'),
            mutationObserver: this.check('mutationObserver'),
            requestIdleCallback: this.check('requestIdleCallback'),
            
            // Security
            crypto: this.check('crypto'),
            credentials: this.check('credentials'),
            
            // Misc
            share: this.check('share'),
            bluetooth: this.check('bluetooth'),
            usb: this.check('usb'),
            geolocation: this.check('geolocation'),
            webXR: this.check('webXR'),
            wasm: this.check('wasm'),
            customElements: this.check('customElements'),
            shadowDOM: this.check('shadowDOM'),
            cssGrid: this.check('cssGrid'),
            cssVariables: this.check('cssVariables'),
            cssContainerQueries: this.check('cssContainerQueries')
        };

        // Cache all
        for (const [key, value] of Object.entries(capabilities)) {
            CAPABILITY_CACHE.set(key, value);
        }

        eventBus.emit('capability:detected', capabilities);

        return capabilities;
    }

    /**
     * Check single capability (sync)
     */
    check(capability) {
        // Return cached if available
        if (CAPABILITY_CACHE.has(capability)) {
            return CAPABILITY_CACHE.get(capability);
        }

        const checks = {
            // Storage
            localStorage: () => {
                try {
                    const test = '__qmf_test__';
                    localStorage.setItem(test, test);
                    localStorage.removeItem(test);
                    return true;
                } catch (e) {
                    return false;
                }
            },
            sessionStorage: () => {
                try {
                    const test = '__qmf_test__';
                    sessionStorage.setItem(test, test);
                    sessionStorage.removeItem(test);
                    return true;
                } catch (e) {
                    return false;
                }
            },
            indexedDB: () => 'indexedDB' in window,
            cacheAPI: () => 'caches' in window,

            // Network
            fetch: () => 'fetch' in window,
            webSocket: () => 'WebSocket' in window,
            webRTC: () => 'RTCPeerConnection' in window,
            serviceWorker: () => 'serviceWorker' in navigator,
            beacon: () => 'sendBeacon' in navigator,

            // Media
            webGL: () => {
                try {
                    const canvas = document.createElement('canvas');
                    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
                } catch (e) {
                    return false;
                }
            },
            webGL2: () => {
                try {
                    const canvas = document.createElement('canvas');
                    return !!canvas.getContext('webgl2');
                } catch (e) {
                    return false;
                }
            },
            canvas: () => {
                const canvas = document.createElement('canvas');
                return !!(canvas.getContext && canvas.getContext('2d'));
            },
            webAudio: () => 'AudioContext' in window || 'webkitAudioContext' in window,
            mediaRecorder: () => 'MediaRecorder' in window,
            mediaDevices: () => 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,

            // Input
            touch: () => 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            pointer: () => 'PointerEvent' in window,
            gamepad: () => 'getGamepads' in navigator,
            clipboard: () => 'clipboard' in navigator,

            // Notifications
            notification: () => 'Notification' in window,
            pushManager: () => 'PushManager' in window,
            vibrate: () => 'vibrate' in navigator,

            // Performance
            performanceAPI: () => 'performance' in window && 'now' in performance,
            intersectionObserver: () => 'IntersectionObserver' in window,
            resizeObserver: () => 'ResizeObserver' in window,
            mutationObserver: () => 'MutationObserver' in window,
            requestIdleCallback: () => 'requestIdleCallback' in window,

            // Security
            crypto: () => 'crypto' in window && 'subtle' in crypto,
            credentials: () => 'credentials' in navigator,

            // Misc
            share: () => 'share' in navigator,
            bluetooth: () => 'bluetooth' in navigator,
            usb: () => 'usb' in navigator,
            geolocation: () => 'geolocation' in navigator,
            webXR: () => 'xr' in navigator,
            wasm: () => typeof WebAssembly === 'object',
            customElements: () => 'customElements' in window,
            shadowDOM: () => 'attachShadow' in Element.prototype,
            
            // CSS
            cssGrid: () => CSS.supports('display', 'grid'),
            cssVariables: () => CSS.supports('--test', '0'),
            cssContainerQueries: () => CSS.supports('container-type', 'inline-size')
        };

        const result = checks[capability] ? checks[capability]() : false;
        CAPABILITY_CACHE.set(capability, result);

        return result;
    }

    /**
     * Check async capabilities (như image formats)
     */
    async checkAsync(capability) {
        if (CAPABILITY_CACHE.has(capability)) {
            return CAPABILITY_CACHE.get(capability);
        }

        // Prevent duplicate async checks
        if (this._asyncCapabilities.has(capability)) {
            return this._asyncCapabilities.get(capability);
        }

        const checks = {
            webp: () => this._checkImageFormat(
                'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA='
            ),
            avif: () => this._checkImageFormat(
                'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQ=='
            ),
            jxl: () => this._checkImageFormat(
                'data:image/jxl;base64,/woIELASCAgQAFwASxLFgoAA'
            )
        };

        if (!checks[capability]) {
            return false;
        }

        const promise = checks[capability]();
        this._asyncCapabilities.set(capability, promise);

        try {
            const result = await promise;
            CAPABILITY_CACHE.set(capability, result);
            return result;
        } catch (e) {
            CAPABILITY_CACHE.set(capability, false);
            return false;
        }
    }

    /**
     * Check image format support
     */
    _checkImageFormat(dataUri) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img.width > 0 && img.height > 0);
            img.onerror = () => resolve(false);
            img.src = dataUri;
        });
    }

    /**
     * Require capabilities - throw if not available
     */
    require(capabilities) {
        const missing = [];

        for (const cap of capabilities) {
            if (!this.check(cap)) {
                missing.push(cap);
            }
        }

        if (missing.length > 0) {
            const error = new Error(`Missing required capabilities: ${missing.join(', ')}`);
            error.missingCapabilities = missing;
            throw error;
        }

        return true;
    }

    /**
     * Get polyfill recommendations
     */
    getPolyfillRecommendations() {
        const recommendations = [];

        if (!this.check('fetch')) {
            recommendations.push({
                capability: 'fetch',
                polyfill: 'whatwg-fetch',
                url: 'https://github.com/github/fetch'
            });
        }

        if (!this.check('intersectionObserver')) {
            recommendations.push({
                capability: 'intersectionObserver',
                polyfill: 'intersection-observer',
                url: 'https://github.com/w3c/IntersectionObserver'
            });
        }

        if (!this.check('resizeObserver')) {
            recommendations.push({
                capability: 'resizeObserver',
                polyfill: 'resize-observer-polyfill',
                url: 'https://github.com/que-etc/resize-observer-polyfill'
            });
        }

        if (!this.check('customElements')) {
            recommendations.push({
                capability: 'customElements',
                polyfill: '@webcomponents/webcomponentsjs',
                url: 'https://github.com/webcomponents/polyfills'
            });
        }

        return recommendations;
    }

    /**
     * Clear cache
     */
    clearCache() {
        CAPABILITY_CACHE.clear();
        this._asyncCapabilities.clear();
    }
}

// Singleton export
const capability = new CapabilityDetector();
export default capability;
export { CapabilityDetector };
