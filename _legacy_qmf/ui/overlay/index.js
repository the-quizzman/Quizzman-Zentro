/**
 * QMF Overlay - Overlay/Backdrop component
 * @version 1.0.0
 * @module ui/overlay
 */

import eventBus from '../../kernel/event-bus.js';

// Active overlays
const OVERLAY_STACK = [];

class Overlay {
    constructor(options = {}) {
        this.id = options.id || `overlay-${Date.now()}`;
        this.content = options.content || null;
        this.backdrop = options.backdrop !== false;
        this.backdropColor = options.backdropColor || 'rgba(0, 0, 0, 0.5)';
        this.closeOnClick = options.closeOnClick !== false;
        this.closeOnEscape = options.closeOnEscape !== false;
        this.centered = options.centered !== false;
        this.zIndex = options.zIndex || null;
        this.className = options.className || '';
        this.animate = options.animate !== false;

        // Callbacks
        this.onOpen = options.onOpen || null;
        this.onClose = options.onClose || null;

        this.element = null;
        this.contentElement = null;
        this.isOpen = false;
        this._boundKeyHandler = null;
    }

    /**
     * Render overlay
     */
    render() {
        const classes = ['qmf-overlay'];
        if (this.centered) classes.push('qmf-overlay--centered');
        if (this.className) classes.push(this.className);

        const backdropStyle = this.backdrop 
            ? `background-color: ${this.backdropColor}` 
            : '';

        const html = `
            <div class="${classes.join(' ')}" id="${this.id}" style="${backdropStyle}">
                <div class="qmf-overlay-content"></div>
            </div>
        `;

        const temp = document.createElement('div');
        temp.innerHTML = html.trim();
        this.element = temp.firstElementChild;
        this.contentElement = this.element.querySelector('.qmf-overlay-content');

        // Render content
        if (this.content) {
            this._renderContent();
        }

        this._bindEvents();

        return this.element;
    }

    /**
     * Render content
     */
    _renderContent() {
        if (!this.contentElement) return;

        if (typeof this.content === 'string') {
            this.contentElement.innerHTML = this.content;
        } else if (this.content instanceof HTMLElement) {
            this.contentElement.innerHTML = '';
            this.contentElement.appendChild(this.content);
        } else if (typeof this.content.render === 'function') {
            this.contentElement.innerHTML = '';
            this.content.render(this.contentElement);
        } else if (typeof this.content === 'function') {
            const result = this.content(this.contentElement);
            if (typeof result === 'string') {
                this.contentElement.innerHTML = result;
            }
        }
    }

    /**
     * Open overlay
     */
    async open() {
        if (this.isOpen) return this;

        // Render if needed
        if (!this.element) {
            this.render();
        }

        // Add to DOM
        document.body.appendChild(this.element);

        // Add to stack
        OVERLAY_STACK.push(this);

        // Set z-index
        if (!this.zIndex) {
            this.element.style.zIndex = 900 + OVERLAY_STACK.length;
        } else {
            this.element.style.zIndex = this.zIndex;
        }

        // Prevent body scroll
        if (OVERLAY_STACK.length === 1) {
            document.body.style.overflow = 'hidden';
        }

        // Animate in
        if (this.animate) {
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    this.element.classList.add('qmf-overlay--visible');
                    setTimeout(resolve, 300);
                });
            });
        } else {
            this.element.classList.add('qmf-overlay--visible');
        }

        this.isOpen = true;

        // Keyboard handler
        this._boundKeyHandler = this._handleKeyDown.bind(this);
        document.addEventListener('keydown', this._boundKeyHandler);

        // Callback
        if (this.onOpen) {
            await this.onOpen(this);
        }

        eventBus.emit('overlay:open', { overlay: this });

        return this;
    }

    /**
     * Close overlay
     */
    async close(result = null) {
        if (!this.isOpen) return this;

        // Animate out
        if (this.animate) {
            this.element.classList.remove('qmf-overlay--visible');
            this.element.classList.add('qmf-overlay--closing');
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Remove from stack
        const index = OVERLAY_STACK.indexOf(this);
        if (index > -1) OVERLAY_STACK.splice(index, 1);

        // Restore body scroll if last overlay
        if (OVERLAY_STACK.length === 0) {
            document.body.style.overflow = '';
        }

        // Remove keyboard handler
        if (this._boundKeyHandler) {
            document.removeEventListener('keydown', this._boundKeyHandler);
        }

        // Remove from DOM
        this.element.remove();
        this.element = null;

        this.isOpen = false;

        // Callback
        if (this.onClose) {
            await this.onClose(this, result);
        }

        eventBus.emit('overlay:close', { overlay: this, result });

        return this;
    }

    /**
     * Toggle overlay
     */
    toggle() {
        if (this.isOpen) {
            return this.close();
        } else {
            return this.open();
        }
    }

    /**
     * Set content
     */
    setContent(content) {
        this.content = content;
        if (this.contentElement) {
            this._renderContent();
        }
        return this;
    }

    /**
     * Show loading state
     */
    showLoading(message = 'Loading...') {
        this.setContent(`
            <div class="qmf-overlay-loading">
                <div class="qmf-spinner"></div>
                <p>${message}</p>
            </div>
        `);
        return this;
    }

    /**
     * Destroy overlay
     */
    destroy() {
        if (this.isOpen) {
            // Quick close without animation
            OVERLAY_STACK.splice(OVERLAY_STACK.indexOf(this), 1);
            if (this._boundKeyHandler) {
                document.removeEventListener('keydown', this._boundKeyHandler);
            }
            this.element?.remove();
        }
        this.element = null;
        this.isOpen = false;
    }

    _bindEvents() {
        if (this.closeOnClick) {
            this.element.addEventListener('click', (e) => {
                // Only close if clicking backdrop, not content
                if (e.target === this.element) {
                    this.close();
                }
            });
        }
    }

    _handleKeyDown(e) {
        // Only handle if this is the top overlay
        if (OVERLAY_STACK[OVERLAY_STACK.length - 1] !== this) return;

        if (e.key === 'Escape' && this.closeOnEscape) {
            e.preventDefault();
            this.close();
        }
    }
}

// Factory
function createOverlay(options) {
    return new Overlay(options);
}

// Quick loading overlay
async function showLoading(message = 'Loading...', options = {}) {
    const overlay = new Overlay({
        ...options,
        backdrop: true,
        closeOnClick: false,
        closeOnEscape: false
    });
    overlay.showLoading(message);
    await overlay.open();
    return overlay;
}

// Quick full-screen content
async function showFullscreen(content, options = {}) {
    const overlay = new Overlay({
        ...options,
        content,
        backdrop: true,
        className: 'qmf-overlay--fullscreen'
    });
    await overlay.open();
    return overlay;
}

export default Overlay;
export { Overlay, createOverlay, showLoading, showFullscreen };
