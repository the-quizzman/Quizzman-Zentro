/**
 * QMF Loading - Loading indicators
 * @version 1.0.0
 * @module feedback/loading
 */

import eventBus from '../kernel/event-bus.js';

// Loading types
const TYPES = {
    SPINNER: 'spinner',
    DOTS: 'dots',
    PULSE: 'pulse',
    BAR: 'bar',
    SKELETON: 'skeleton'
};

// Loading sizes
const SIZES = {
    XS: 'xs',
    SM: 'sm',
    MD: 'md',
    LG: 'lg',
    XL: 'xl'
};

class Loading {
    constructor(options = {}) {
        this.id = options.id || `loading-${Date.now()}`;
        this.type = options.type || TYPES.SPINNER;
        this.size = options.size || SIZES.MD;
        this.message = options.message || null;
        this.overlay = options.overlay || false;
        this.blur = options.blur || false;
        this.color = options.color || null;
        this.className = options.className || '';
        this.target = options.target || null;

        this.element = null;
        this.isVisible = false;
    }

    /**
     * Render loading indicator
     */
    render() {
        const classes = [
            'qmf-loading',
            `qmf-loading--${this.type}`,
            `qmf-loading--${this.size}`,
            this.overlay ? 'qmf-loading--overlay' : '',
            this.blur ? 'qmf-loading--blur' : '',
            this.className
        ].filter(Boolean).join(' ');

        const style = this.color ? `--qmf-loading-color: ${this.color}` : '';

        const indicatorHtml = this._getIndicatorHtml();

        const messageHtml = this.message 
            ? `<p class="qmf-loading-message">${this.message}</p>` 
            : '';

        const html = `
            <div class="${classes}" id="${this.id}" style="${style}" role="status" aria-live="polite">
                <div class="qmf-loading-content">
                    ${indicatorHtml}
                    ${messageHtml}
                </div>
            </div>
        `;

        const temp = document.createElement('div');
        temp.innerHTML = html.trim();
        this.element = temp.firstElementChild;

        return this.element;
    }

    /**
     * Get indicator HTML based on type
     */
    _getIndicatorHtml() {
        switch (this.type) {
            case TYPES.SPINNER:
                return `
                    <div class="qmf-loading-spinner">
                        <svg viewBox="0 0 50 50">
                            <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4"></circle>
                        </svg>
                    </div>
                `;

            case TYPES.DOTS:
                return `
                    <div class="qmf-loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                `;

            case TYPES.PULSE:
                return `
                    <div class="qmf-loading-pulse">
                        <span></span>
                    </div>
                `;

            case TYPES.BAR:
                return `
                    <div class="qmf-loading-bar">
                        <div class="qmf-loading-bar-progress"></div>
                    </div>
                `;

            case TYPES.SKELETON:
                return `
                    <div class="qmf-loading-skeleton">
                        <div class="qmf-skeleton-line qmf-skeleton-line--title"></div>
                        <div class="qmf-skeleton-line"></div>
                        <div class="qmf-skeleton-line"></div>
                        <div class="qmf-skeleton-line qmf-skeleton-line--short"></div>
                    </div>
                `;

            default:
                return '';
        }
    }

    /**
     * Show loading
     */
    show(target = null) {
        if (this.isVisible) return this;

        // Render if needed
        if (!this.element) {
            this.render();
        }

        // Determine target
        const container = target || this.target || document.body;

        // Handle overlay
        if (this.overlay) {
            if (container !== document.body) {
                container.style.position = 'relative';
            }
        }

        container.appendChild(this.element);

        // Animate in
        requestAnimationFrame(() => {
            this.element.classList.add('qmf-loading--visible');
        });

        this.isVisible = true;
        eventBus.emit('loading:show', { loading: this });

        return this;
    }

    /**
     * Hide loading
     */
    hide() {
        if (!this.isVisible || !this.element) return this;

        this.element.classList.remove('qmf-loading--visible');

        setTimeout(() => {
            this.element.remove();
            this.isVisible = false;
            eventBus.emit('loading:hide', { loading: this });
        }, 300);

        return this;
    }

    /**
     * Update message
     */
    setMessage(message) {
        this.message = message;
        if (this.element) {
            let msgEl = this.element.querySelector('.qmf-loading-message');
            if (message) {
                if (msgEl) {
                    msgEl.textContent = message;
                } else {
                    msgEl = document.createElement('p');
                    msgEl.className = 'qmf-loading-message';
                    msgEl.textContent = message;
                    this.element.querySelector('.qmf-loading-content').appendChild(msgEl);
                }
            } else if (msgEl) {
                msgEl.remove();
            }
        }
        return this;
    }

    /**
     * Set progress (for bar type)
     */
    setProgress(percent) {
        if (this.type !== TYPES.BAR) return this;

        const bar = this.element?.querySelector('.qmf-loading-bar-progress');
        if (bar) {
            bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        }
        return this;
    }

    /**
     * Destroy loading
     */
    destroy() {
        this.hide();
        this.element = null;
    }
}

// Loading manager for global loading state
class LoadingManager {
    constructor() {
        this.activeLoaders = new Map();
        this.globalLoader = null;
    }

    /**
     * Create a new loading instance
     */
    create(options = {}) {
        return new Loading(options);
    }

    /**
     * Show global full-page loader
     */
    showGlobal(message = null, options = {}) {
        if (this.globalLoader) {
            this.globalLoader.setMessage(message);
            return this.globalLoader;
        }

        this.globalLoader = new Loading({
            ...options,
            overlay: true,
            size: SIZES.LG,
            message
        });

        this.globalLoader.show();
        return this.globalLoader;
    }

    /**
     * Hide global loader
     */
    hideGlobal() {
        if (this.globalLoader) {
            this.globalLoader.hide();
            this.globalLoader = null;
        }
    }

    /**
     * Show loading for specific element
     */
    showFor(element, options = {}) {
        const id = element.id || `element-${Date.now()}`;

        // Remove existing if any
        this.hideFor(element);

        const loader = new Loading({
            ...options,
            id: `loading-${id}`,
            overlay: true
        });

        loader.show(element);
        this.activeLoaders.set(element, loader);

        return loader;
    }

    /**
     * Hide loading for specific element
     */
    hideFor(element) {
        const loader = this.activeLoaders.get(element);
        if (loader) {
            loader.hide();
            this.activeLoaders.delete(element);
        }
    }

    /**
     * Show loading while promise resolves
     */
    async whileLoading(promise, options = {}) {
        const loader = options.element 
            ? this.showFor(options.element, options)
            : this.showGlobal(options.message, options);

        try {
            return await promise;
        } finally {
            if (options.element) {
                this.hideFor(options.element);
            } else {
                this.hideGlobal();
            }
        }
    }

    /**
     * Check if any loading is active
     */
    isLoading() {
        return this.globalLoader !== null || this.activeLoaders.size > 0;
    }

    /**
     * Hide all loaders
     */
    hideAll() {
        this.hideGlobal();
        for (const [element] of this.activeLoaders) {
            this.hideFor(element);
        }
    }
}

// Skeleton builder
function skeleton(lines = 3, options = {}) {
    const loading = new Loading({
        type: TYPES.SKELETON,
        ...options
    });

    // Override indicator HTML for custom skeleton
    if (options.template) {
        loading._getIndicatorHtml = () => options.template;
    }

    return loading;
}

// Singleton manager
const loadingManager = new LoadingManager();

export default loadingManager;
export { Loading, LoadingManager, skeleton, TYPES, SIZES };
