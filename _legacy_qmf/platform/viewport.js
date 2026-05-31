/**
 * QMF Viewport - Responsive viewport management
 * @version 1.0.0
 * @module platform/viewport
 */

import eventBus from '../kernel/event-bus.js';

// Breakpoint definitions (có thể override)
const DEFAULT_BREAKPOINTS = {
    xs: 0,      // Extra small: phones
    sm: 576,    // Small: large phones
    md: 768,    // Medium: tablets
    lg: 992,    // Large: desktops
    xl: 1200,   // Extra large: large desktops
    xxl: 1400   // Extra extra large: very large screens
};

class ViewportManager {
    constructor(breakpoints = DEFAULT_BREAKPOINTS) {
        this.breakpoints = breakpoints;
        this._currentBreakpoint = null;
        this._watchers = [];
        this._resizeObserver = null;
        this._mediaQueries = new Map();
        this._throttleTimer = null;
        this._throttleDelay = 100;

        this._init();
    }

    /**
     * Initialize viewport tracking
     */
    _init() {
        // Initial detection
        this._updateState();

        // Resize listener với throttle
        window.addEventListener('resize', this._onResize.bind(this));

        // Orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this._updateState(), 100);
        });

        // Setup media query listeners
        this._setupMediaQueries();
    }

    /**
     * Lấy thông tin viewport hiện tại
     */
    getState() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            breakpoint: this._currentBreakpoint,
            orientation: this.getOrientation(),
            aspectRatio: this.getAspectRatio(),
            isPortrait: this.isPortrait(),
            isLandscape: this.isLandscape(),
            scrollY: window.scrollY,
            scrollX: window.scrollX,
            documentHeight: document.documentElement.scrollHeight,
            documentWidth: document.documentElement.scrollWidth
        };
    }

    /**
     * Lấy breakpoint hiện tại
     */
    getCurrentBreakpoint() {
        const width = window.innerWidth;
        let current = 'xs';

        for (const [name, minWidth] of Object.entries(this.breakpoints)) {
            if (width >= minWidth) {
                current = name;
            }
        }

        return current;
    }

    /**
     * Check breakpoint có active không
     */
    isBreakpoint(name) {
        return this._currentBreakpoint === name;
    }

    /**
     * Check viewport >= breakpoint
     */
    isBreakpointUp(name) {
        const currentMin = this.breakpoints[this._currentBreakpoint] || 0;
        const targetMin = this.breakpoints[name] || 0;
        return currentMin >= targetMin;
    }

    /**
     * Check viewport <= breakpoint
     */
    isBreakpointDown(name) {
        const currentMin = this.breakpoints[this._currentBreakpoint] || 0;
        const targetMin = this.breakpoints[name] || 0;
        return currentMin <= targetMin;
    }

    /**
     * Check viewport trong range
     */
    isBreakpointBetween(min, max) {
        return this.isBreakpointUp(min) && this.isBreakpointDown(max);
    }

    /**
     * Lấy orientation
     */
    getOrientation() {
        if (window.screen?.orientation?.type) {
            return window.screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape';
        }
        return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    }

    isPortrait() {
        return this.getOrientation() === 'portrait';
    }

    isLandscape() {
        return this.getOrientation() === 'landscape';
    }

    /**
     * Lấy aspect ratio
     */
    getAspectRatio() {
        return window.innerWidth / window.innerHeight;
    }

    /**
     * Set custom breakpoints
     */
    setBreakpoints(breakpoints) {
        this.breakpoints = { ...DEFAULT_BREAKPOINTS, ...breakpoints };
        this._setupMediaQueries();
        this._updateState();
    }

    /**
     * Watch breakpoint changes
     */
    onBreakpointChange(callback) {
        this._watchers.push(callback);

        // Return unsubscribe
        return () => {
            const index = this._watchers.indexOf(callback);
            if (index > -1) this._watchers.splice(index, 1);
        };
    }

    /**
     * Watch specific breakpoint
     */
    onBreakpoint(name, callback) {
        return this.onBreakpointChange((newBp, oldBp) => {
            if (newBp === name) {
                callback({ entered: true, from: oldBp });
            } else if (oldBp === name) {
                callback({ entered: false, to: newBp });
            }
        });
    }

    /**
     * Match media query
     */
    matchMedia(query) {
        return window.matchMedia(query).matches;
    }

    /**
     * Watch media query
     */
    onMediaQuery(query, callback) {
        const mql = window.matchMedia(query);
        const handler = (e) => callback(e.matches);

        mql.addEventListener('change', handler);

        // Initial call
        callback(mql.matches);

        return () => mql.removeEventListener('change', handler);
    }

    /**
     * CSS custom properties for breakpoints
     */
    injectCSSVariables() {
        const style = document.createElement('style');
        style.id = 'qmf-viewport-vars';

        let css = ':root {\n';
        for (const [name, value] of Object.entries(this.breakpoints)) {
            css += `  --qmf-breakpoint-${name}: ${value}px;\n`;
        }
        css += `  --qmf-viewport-width: ${window.innerWidth}px;\n`;
        css += `  --qmf-viewport-height: ${window.innerHeight}px;\n`;
        css += '}';

        style.textContent = css;
        document.head.appendChild(style);
    }

    /**
     * Update CSS variables on resize
     */
    _updateCSSVariables() {
        const root = document.documentElement;
        root.style.setProperty('--qmf-viewport-width', `${window.innerWidth}px`);
        root.style.setProperty('--qmf-viewport-height', `${window.innerHeight}px`);
    }

    /**
     * Setup media query listeners
     */
    _setupMediaQueries() {
        // Clear existing
        for (const [, { mql, handler }] of this._mediaQueries) {
            mql.removeEventListener('change', handler);
        }
        this._mediaQueries.clear();

        // Setup new
        const sortedBreakpoints = Object.entries(this.breakpoints)
            .sort(([, a], [, b]) => a - b);

        for (let i = 0; i < sortedBreakpoints.length; i++) {
            const [name, minWidth] = sortedBreakpoints[i];
            const nextWidth = sortedBreakpoints[i + 1]?.[1];

            let query = `(min-width: ${minWidth}px)`;
            if (nextWidth) {
                query += ` and (max-width: ${nextWidth - 0.02}px)`;
            }

            const mql = window.matchMedia(query);
            const handler = (e) => {
                if (e.matches) {
                    const oldBreakpoint = this._currentBreakpoint;
                    this._currentBreakpoint = name;
                    this._notifyWatchers(name, oldBreakpoint);
                }
            };

            mql.addEventListener('change', handler);
            this._mediaQueries.set(name, { mql, handler });

            // Check initial match
            if (mql.matches) {
                this._currentBreakpoint = name;
            }
        }
    }

    /**
     * Handle resize event
     */
    _onResize() {
        if (this._throttleTimer) return;

        this._throttleTimer = setTimeout(() => {
            this._throttleTimer = null;
            this._updateState();
        }, this._throttleDelay);
    }

    /**
     * Update state
     */
    _updateState() {
        const newBreakpoint = this.getCurrentBreakpoint();
        const oldBreakpoint = this._currentBreakpoint;

        if (newBreakpoint !== oldBreakpoint) {
            this._currentBreakpoint = newBreakpoint;
            this._notifyWatchers(newBreakpoint, oldBreakpoint);
        }

        this._updateCSSVariables();

        // Emit event
        eventBus.emit('viewport:resize', this.getState());
    }

    /**
     * Notify watchers
     */
    _notifyWatchers(newBreakpoint, oldBreakpoint) {
        for (const callback of this._watchers) {
            try {
                callback(newBreakpoint, oldBreakpoint);
            } catch (e) {
                console.error('[Viewport] Watcher error:', e);
            }
        }

        eventBus.emit('viewport:breakpoint', { 
            current: newBreakpoint, 
            previous: oldBreakpoint 
        });
    }

    /**
     * Cleanup
     */
    destroy() {
        window.removeEventListener('resize', this._onResize);
        for (const [, { mql, handler }] of this._mediaQueries) {
            mql.removeEventListener('change', handler);
        }
        this._mediaQueries.clear();
        this._watchers = [];
    }
}

// Singleton export
const viewport = new ViewportManager();
export default viewport;
export { ViewportManager, DEFAULT_BREAKPOINTS };
