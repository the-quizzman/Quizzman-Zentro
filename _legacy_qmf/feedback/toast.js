/**
 * QMF Toast - Toast notifications
 * @version 1.0.0
 * @module feedback/toast
 */

import eventBus from '../kernel/event-bus.js';

// Toast types
const TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
};

// Toast positions
const POSITIONS = {
    TOP_LEFT: 'top-left',
    TOP_CENTER: 'top-center',
    TOP_RIGHT: 'top-right',
    BOTTOM_LEFT: 'bottom-left',
    BOTTOM_CENTER: 'bottom-center',
    BOTTOM_RIGHT: 'bottom-right'
};

// Container elements by position
const containers = new Map();

// Toast queue
const toastQueue = [];
let isProcessing = false;

class ToastManager {
    constructor() {
        this.config = {
            position: POSITIONS.TOP_RIGHT,
            duration: 4000,
            maxToasts: 5,
            newestOnTop: true,
            pauseOnHover: true,
            showProgress: true,
            closeButton: true,
            animation: 'slide'
        };
    }

    /**
     * Configure toast manager
     */
    configure(options = {}) {
        this.config = { ...this.config, ...options };
        return this;
    }

    /**
     * Show toast
     */
    show(message, options = {}) {
        const toast = new Toast({
            message,
            type: options.type || TYPES.INFO,
            title: options.title || null,
            icon: options.icon || null,
            duration: options.duration ?? this.config.duration,
            position: options.position || this.config.position,
            closable: options.closable ?? this.config.closeButton,
            pauseOnHover: options.pauseOnHover ?? this.config.pauseOnHover,
            showProgress: options.showProgress ?? this.config.showProgress,
            action: options.action || null,
            className: options.className || '',
            onClick: options.onClick || null,
            onClose: options.onClose || null
        });

        this._addToast(toast);

        return toast;
    }

    /**
     * Info toast
     */
    info(message, options = {}) {
        return this.show(message, { ...options, type: TYPES.INFO });
    }

    /**
     * Success toast
     */
    success(message, options = {}) {
        return this.show(message, { ...options, type: TYPES.SUCCESS });
    }

    /**
     * Warning toast
     */
    warning(message, options = {}) {
        return this.show(message, { ...options, type: TYPES.WARNING });
    }

    /**
     * Error toast
     */
    error(message, options = {}) {
        return this.show(message, { ...options, type: TYPES.ERROR });
    }

    /**
     * Promise toast - shows loading, then success/error
     */
    promise(promise, options = {}) {
        const toast = this.show(options.loading || 'Loading...', {
            type: TYPES.INFO,
            duration: 0,
            closable: false,
            showProgress: false,
            className: 'qmf-toast--loading'
        });

        promise
            .then((result) => {
                toast.update({
                    message: typeof options.success === 'function' 
                        ? options.success(result) 
                        : options.success || 'Success!',
                    type: TYPES.SUCCESS,
                    duration: this.config.duration,
                    closable: true,
                    showProgress: this.config.showProgress,
                    className: ''
                });
            })
            .catch((error) => {
                toast.update({
                    message: typeof options.error === 'function' 
                        ? options.error(error) 
                        : options.error || error.message || 'Error!',
                    type: TYPES.ERROR,
                    duration: this.config.duration * 1.5,
                    closable: true,
                    showProgress: this.config.showProgress,
                    className: ''
                });
            });

        return toast;
    }

    /**
     * Clear all toasts
     */
    clearAll(position = null) {
        if (position) {
            const container = containers.get(position);
            if (container) {
                const toasts = container.querySelectorAll('.qmf-toast');
                toasts.forEach(t => t.remove());
            }
        } else {
            containers.forEach(container => {
                container.innerHTML = '';
            });
        }
    }

    /**
     * Get or create container for position
     */
    _getContainer(position) {
        if (containers.has(position)) {
            return containers.get(position);
        }

        const container = document.createElement('div');
        container.className = `qmf-toast-container qmf-toast-container--${position}`;
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(container);

        containers.set(position, container);
        return container;
    }

    /**
     * Add toast to container
     */
    _addToast(toast) {
        const container = this._getContainer(toast.position);

        // Check max toasts
        const existingToasts = container.querySelectorAll('.qmf-toast');
        if (existingToasts.length >= this.config.maxToasts) {
            // Remove oldest
            const oldest = this.config.newestOnTop 
                ? existingToasts[existingToasts.length - 1]
                : existingToasts[0];
            oldest.remove();
        }

        // Render toast
        const element = toast.render();

        // Add to container
        if (this.config.newestOnTop) {
            container.insertBefore(element, container.firstChild);
        } else {
            container.appendChild(element);
        }

        // Start timer
        toast.start();

        eventBus.emit('toast:show', { toast });
    }
}

class Toast {
    constructor(options = {}) {
        this.id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.message = options.message || '';
        this.title = options.title || null;
        this.type = options.type || TYPES.INFO;
        this.icon = options.icon || this._getDefaultIcon();
        this.duration = options.duration ?? 4000;
        this.position = options.position || POSITIONS.TOP_RIGHT;
        this.closable = options.closable !== false;
        this.pauseOnHover = options.pauseOnHover !== false;
        this.showProgress = options.showProgress !== false;
        this.action = options.action || null;
        this.className = options.className || '';
        this.onClick = options.onClick || null;
        this.onClose = options.onClose || null;

        this.element = null;
        this.progressBar = null;
        this.timer = null;
        this.startTime = null;
        this.remainingTime = this.duration;
        this.isPaused = false;
    }

    /**
     * Render toast
     */
    render() {
        const classes = [
            'qmf-toast',
            `qmf-toast--${this.type}`,
            this.className
        ].filter(Boolean).join(' ');

        const iconHtml = this.icon 
            ? `<span class="qmf-toast-icon">${this.icon}</span>` 
            : '';

        const titleHtml = this.title 
            ? `<strong class="qmf-toast-title">${this.title}</strong>` 
            : '';

        const closeHtml = this.closable 
            ? `<button class="qmf-toast-close" aria-label="Close">&times;</button>` 
            : '';

        const actionHtml = this.action 
            ? `<button class="qmf-toast-action">${this.action.label}</button>` 
            : '';

        const progressHtml = this.showProgress && this.duration > 0
            ? `<div class="qmf-toast-progress"><div class="qmf-toast-progress-bar"></div></div>`
            : '';

        const html = `
            <div class="${classes}" id="${this.id}" role="alert">
                ${iconHtml}
                <div class="qmf-toast-content">
                    ${titleHtml}
                    <p class="qmf-toast-message">${this.message}</p>
                </div>
                ${actionHtml}
                ${closeHtml}
                ${progressHtml}
            </div>
        `;

        const temp = document.createElement('div');
        temp.innerHTML = html.trim();
        this.element = temp.firstElementChild;

        if (this.showProgress) {
            this.progressBar = this.element.querySelector('.qmf-toast-progress-bar');
        }

        this._bindEvents();

        // Animate in
        requestAnimationFrame(() => {
            this.element.classList.add('qmf-toast--visible');
        });

        return this.element;
    }

    /**
     * Start auto-dismiss timer
     */
    start() {
        if (this.duration <= 0) return;

        this.startTime = Date.now();
        this.remainingTime = this.duration;

        this._startProgress();
        this._scheduleClose();
    }

    /**
     * Pause timer
     */
    pause() {
        if (this.isPaused || this.duration <= 0) return;

        this.isPaused = true;
        clearTimeout(this.timer);
        
        const elapsed = Date.now() - this.startTime;
        this.remainingTime = this.remainingTime - elapsed;

        if (this.progressBar) {
            this.progressBar.style.animationPlayState = 'paused';
        }
    }

    /**
     * Resume timer
     */
    resume() {
        if (!this.isPaused || this.duration <= 0) return;

        this.isPaused = false;
        this.startTime = Date.now();

        if (this.progressBar) {
            this.progressBar.style.animationPlayState = 'running';
        }

        this._scheduleClose();
    }

    /**
     * Close toast
     */
    close() {
        if (!this.element) return;

        clearTimeout(this.timer);

        // Animate out
        this.element.classList.remove('qmf-toast--visible');
        this.element.classList.add('qmf-toast--closing');

        setTimeout(() => {
            this.element.remove();
            this.element = null;

            if (this.onClose) {
                this.onClose(this);
            }

            eventBus.emit('toast:close', { toast: this });
        }, 300);
    }

    /**
     * Update toast
     */
    update(options = {}) {
        if (options.message !== undefined) {
            this.message = options.message;
            const msgEl = this.element?.querySelector('.qmf-toast-message');
            if (msgEl) msgEl.textContent = this.message;
        }

        if (options.title !== undefined) {
            this.title = options.title;
            let titleEl = this.element?.querySelector('.qmf-toast-title');
            if (titleEl) {
                titleEl.textContent = this.title;
            } else if (this.title) {
                const contentEl = this.element?.querySelector('.qmf-toast-content');
                titleEl = document.createElement('strong');
                titleEl.className = 'qmf-toast-title';
                titleEl.textContent = this.title;
                contentEl?.insertBefore(titleEl, contentEl.firstChild);
            }
        }

        if (options.type !== undefined) {
            this.element?.classList.remove(`qmf-toast--${this.type}`);
            this.type = options.type;
            this.element?.classList.add(`qmf-toast--${this.type}`);

            // Update icon
            const iconEl = this.element?.querySelector('.qmf-toast-icon');
            if (iconEl) {
                iconEl.innerHTML = options.icon || this._getDefaultIcon();
            }
        }

        if (options.duration !== undefined) {
            clearTimeout(this.timer);
            this.duration = options.duration;
            if (this.duration > 0) {
                this.start();
            }
        }

        if (options.className !== undefined) {
            this.element?.classList.remove(this.className);
            this.className = options.className;
            if (this.className) {
                this.element?.classList.add(this.className);
            }
        }

        return this;
    }

    _getDefaultIcon() {
        const icons = {
            [TYPES.INFO]: 'ℹ️',
            [TYPES.SUCCESS]: '✓',
            [TYPES.WARNING]: '⚠️',
            [TYPES.ERROR]: '✕'
        };
        return icons[this.type] || '';
    }

    _startProgress() {
        if (!this.progressBar || this.duration <= 0) return;

        this.progressBar.style.animation = `qmf-toast-progress ${this.duration}ms linear forwards`;
    }

    _scheduleClose() {
        if (this.remainingTime <= 0) return;

        this.timer = setTimeout(() => {
            this.close();
        }, this.remainingTime);
    }

    _bindEvents() {
        // Close button
        const closeBtn = this.element.querySelector('.qmf-toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.close();
            });
        }

        // Action button
        const actionBtn = this.element.querySelector('.qmf-toast-action');
        if (actionBtn && this.action?.onClick) {
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.action.onClick(this);
            });
        }

        // Pause on hover
        if (this.pauseOnHover) {
            this.element.addEventListener('mouseenter', () => this.pause());
            this.element.addEventListener('mouseleave', () => this.resume());
        }

        // Click handler
        if (this.onClick) {
            this.element.addEventListener('click', (e) => {
                this.onClick(this, e);
            });
        }
    }
}

// Singleton manager
const toast = new ToastManager();

export default toast;
export { ToastManager, Toast, TYPES, POSITIONS };
