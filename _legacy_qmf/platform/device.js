/**
 * QMF Device - Device detection & info
 * @version 1.0.0
 * @module platform/device
 */

class DeviceDetector {
    constructor() {
        this._cache = null;
        this._listeners = [];
    }

    /**
     * Lấy thông tin device
     */
    getInfo() {
        if (this._cache) return this._cache;

        const ua = navigator.userAgent;

        this._cache = {
            // Device type
            type: this._detectType(),
            isMobile: this._isMobile(),
            isTablet: this._isTablet(),
            isDesktop: this._isDesktop(),

            // OS
            os: this._detectOS(),
            osVersion: this._detectOSVersion(),

            // Browser
            browser: this._detectBrowser(),
            browserVersion: this._detectBrowserVersion(),

            // Features
            isTouch: this._isTouchDevice(),
            hasPointer: this._hasPointer(),
            hasMouse: this._hasMouse(),

            // Screen
            pixelRatio: window.devicePixelRatio || 1,
            colorDepth: screen.colorDepth,

            // Hardware
            cores: navigator.hardwareConcurrency || 1,
            memory: navigator.deviceMemory || null,

            // Connection
            connection: this._getConnection(),

            // Misc
            language: navigator.language,
            languages: navigator.languages || [navigator.language],
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack === '1',

            // Timestamps
            detectedAt: Date.now()
        };

        return this._cache;
    }

    /**
     * Detect device type
     */
    _detectType() {
        if (this._isTablet()) return 'tablet';
        if (this._isMobile()) return 'mobile';
        return 'desktop';
    }

    _isMobile() {
        const ua = navigator.userAgent;
        return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    }

    _isTablet() {
        const ua = navigator.userAgent;
        return /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);
    }

    _isDesktop() {
        return !this._isMobile() && !this._isTablet();
    }

    /**
     * Detect OS
     */
    _detectOS() {
        const ua = navigator.userAgent;
        const platform = navigator.platform;

        if (/Win/i.test(platform)) return 'windows';
        if (/Mac/i.test(platform)) return 'macos';
        if (/Linux/i.test(platform)) return 'linux';
        if (/Android/i.test(ua)) return 'android';
        if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
        if (/CrOS/i.test(ua)) return 'chromeos';

        return 'unknown';
    }

    _detectOSVersion() {
        const ua = navigator.userAgent;
        let match;

        // Windows
        if ((match = ua.match(/Windows NT (\d+\.\d+)/))) {
            const versions = {
                '10.0': '10/11',
                '6.3': '8.1',
                '6.2': '8',
                '6.1': '7',
                '6.0': 'Vista'
            };
            return versions[match[1]] || match[1];
        }

        // macOS
        if ((match = ua.match(/Mac OS X (\d+[._]\d+)/))) {
            return match[1].replace('_', '.');
        }

        // iOS
        if ((match = ua.match(/OS (\d+_\d+)/))) {
            return match[1].replace('_', '.');
        }

        // Android
        if ((match = ua.match(/Android (\d+\.?\d*)/))) {
            return match[1];
        }

        return null;
    }

    /**
     * Detect browser
     */
    _detectBrowser() {
        const ua = navigator.userAgent;

        if (/Edg/i.test(ua)) return 'edge';
        if (/OPR|Opera/i.test(ua)) return 'opera';
        if (/Chrome/i.test(ua)) return 'chrome';
        if (/Safari/i.test(ua)) return 'safari';
        if (/Firefox/i.test(ua)) return 'firefox';
        if (/MSIE|Trident/i.test(ua)) return 'ie';

        return 'unknown';
    }

    _detectBrowserVersion() {
        const ua = navigator.userAgent;
        const browser = this._detectBrowser();
        let match;

        const patterns = {
            edge: /Edg\/(\d+)/,
            chrome: /Chrome\/(\d+)/,
            firefox: /Firefox\/(\d+)/,
            safari: /Version\/(\d+)/,
            opera: /OPR\/(\d+)/,
            ie: /(?:MSIE |rv:)(\d+)/
        };

        if (patterns[browser] && (match = ua.match(patterns[browser]))) {
            return parseInt(match[1]);
        }

        return null;
    }

    /**
     * Touch/pointer detection
     */
    _isTouchDevice() {
        return 'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0;
    }

    _hasPointer() {
        return window.matchMedia('(pointer: fine)').matches;
    }

    _hasMouse() {
        return window.matchMedia('(hover: hover)').matches;
    }

    /**
     * Network connection info
     */
    _getConnection() {
        const conn = navigator.connection || 
                     navigator.mozConnection || 
                     navigator.webkitConnection;

        if (!conn) return null;

        return {
            type: conn.effectiveType || conn.type,
            downlink: conn.downlink,
            rtt: conn.rtt,
            saveData: conn.saveData || false
        };
    }

    /**
     * Watch connection changes
     */
    onConnectionChange(callback) {
        const conn = navigator.connection || 
                     navigator.mozConnection || 
                     navigator.webkitConnection;

        if (!conn) return () => {};

        const handler = () => {
            callback(this._getConnection());
        };

        conn.addEventListener('change', handler);
        this._listeners.push({ type: 'connection', handler, target: conn });

        return () => conn.removeEventListener('change', handler);
    }

    /**
     * Check if device supports specific feature
     */
    supports(feature) {
        const checks = {
            touch: () => this._isTouchDevice(),
            webgl: () => {
                try {
                    const canvas = document.createElement('canvas');
                    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
                } catch (e) {
                    return false;
                }
            },
            webp: async () => {
                const img = new Image();
                return new Promise(resolve => {
                    img.onload = () => resolve(img.width > 0);
                    img.onerror = () => resolve(false);
                    img.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
                });
            },
            avif: async () => {
                const img = new Image();
                return new Promise(resolve => {
                    img.onload = () => resolve(img.width > 0);
                    img.onerror = () => resolve(false);
                    img.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKBzgABpAQ0AIyHgAAAAAAADDPiYAA';
                });
            },
            serviceWorker: () => 'serviceWorker' in navigator,
            webSocket: () => 'WebSocket' in window,
            localStorage: () => {
                try {
                    localStorage.setItem('test', 'test');
                    localStorage.removeItem('test');
                    return true;
                } catch (e) {
                    return false;
                }
            },
            indexedDB: () => 'indexedDB' in window,
            notification: () => 'Notification' in window,
            geolocation: () => 'geolocation' in navigator,
            clipboard: () => 'clipboard' in navigator,
            share: () => 'share' in navigator,
            vibrate: () => 'vibrate' in navigator,
            bluetooth: () => 'bluetooth' in navigator,
            usb: () => 'usb' in navigator
        };

        if (checks[feature]) {
            return checks[feature]();
        }

        return false;
    }

    /**
     * Clear cache và detect lại
     */
    refresh() {
        this._cache = null;
        return this.getInfo();
    }

    /**
     * Cleanup listeners
     */
    destroy() {
        for (const { target, handler, type } of this._listeners) {
            target.removeEventListener('change', handler);
        }
        this._listeners = [];
    }
}

// Singleton export
const device = new DeviceDetector();
export default device;
export { DeviceDetector };
