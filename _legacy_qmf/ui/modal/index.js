/**
 * QMF Modal - Modal/Dialog component
 * @version 1.0.0
 * @module ui/modal
 */

import eventBus from '../../kernel/event-bus.js';

// Modal sizes
const SIZES = {
    SM: 'sm',
    MD: 'md',
    LG: 'lg',
    XL: 'xl',
    FULL: 'full'
};

// Active modals stack
const MODAL_STACK = [];

class Modal {
    constructor(options = {}) {
        this.id = options.id || `modal-${Date.now()}`;
        this.title = options.title || '';
        this.content = options.content || '';
        this.footer = options.footer || null;
        this.size = options.size || SIZES.MD;
        this.closable = options.closable !== false;
        this.closeOnEscape = options.closeOnEscape !== false;
        this.closeOnOverlay = options.closeOnOverlay !== false;
        this.showHeader = options.showHeader !== false;
        this.showFooter = options.showFooter !== false;
        this.centered = options.centered || false;
        this.scrollable = options.scrollable || false;
        this.persistent = options.persistent || false;
        this.className = options.className || '';
        this.zIndex = options.zIndex || null;

        // Callbacks
        this.onOpen = options.onOpen || null;
        this.onClose = options.onClose || null;
        this.onConfirm = options.onConfirm || null;
        this.onCancel = options.onCancel || null;

        this.element = null;
        this.isOpen = false;
        this._previousActiveElement = null;
        this._boundKeyHandler = null;
    }

    /**
     * Render modal
     */
    render() {
        const classes = this._getClasses();

        const headerHtml = this.showHeader ? `
            <header class="qmf-modal-header">
                <h2 class="qmf-modal-title">${this.title}</h2>
                ${this.closable ? `
                    <button class="qmf-modal-close" type="button" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                ` : ''}
            </header>
        ` : '';

        const footerHtml = this.showFooter && this.footer ? `
            <footer class="qmf-modal-footer">
                ${typeof this.footer === 'string' ? this.footer : ''}
            </footer>
        ` : '';

        const contentHtml = typeof this.content === 'string' 
            ? this.content 
            : '';

        const html = `
            <div class="${classes}" id="${this.id}" role="dialog" aria-modal="true" aria-labelledby="${this.id}-title" tabindex="-1">
                <div class="qmf-modal-overlay"></div>
                <div class="qmf-modal-container">
                    <div class="qmf-modal-dialog">
                        ${headerHtml}
                        <div class="qmf-modal-body">
                            ${contentHtml}
                        </div>
                        ${footerHtml}
                    </div>
                </div>
            </div>
        `;

        const temp = document.createElement('div');
        temp.innerHTML = html.trim();
        this.element = temp.firstElementChild;

        // Render content if component
        if (typeof this.content === 'function' || typeof this.content?.render === 'function') {
            const bodyEl = this.element.querySelector('.qmf-modal-body');
            if (typeof this.content.render === 'function') {
                this.content.render(bodyEl);
            } else {
                bodyEl.innerHTML = '';
                bodyEl.appendChild(this.content());
            }
        }

        // Render footer if component
        if (this.showFooter && this.footer && typeof this.footer !== 'string') {
            const footerEl = this.element.querySelector('.qmf-modal-footer');
            if (footerEl && typeof this.footer.render === 'function') {
                this.footer.render(footerEl);
            }
        }

        this._bindEvents();

        return this.element;
    }

    /**
     * Open modal
     */
    async open() {
        if (this.isOpen) return this;

        // Save current focus
        this._previousActiveElement = document.activeElement;

        // Render if not already
        if (!this.element) {
            this.render();
        }

        // Add to DOM
        document.body.appendChild(this.element);

        // Add to stack
        MODAL_STACK.push(this);

        // Set z-index based on stack
        if (!this.zIndex) {
            this.element.style.zIndex = 1000 + MODAL_STACK.length;
        }

        // Prevent body scroll
        document.body.classList.add('qmf-modal-open');
        document.body.style.paddingRight = this._getScrollbarWidth() + 'px';

        // Animate in
        requestAnimationFrame(() => {
            this.element.classList.add('qmf-modal--visible');
        });

        this.isOpen = true;

        // Setup keyboard handler
        this._boundKeyHandler = this._handleKeyDown.bind(this);
        document.addEventListener('keydown', this._boundKeyHandler);

        // Focus modal
        this.element.focus();

        // Trap focus
        this._trapFocus();

        // Callback
        if (this.onOpen) {
            await this.onOpen(this);
        }

        eventBus.emit('modal:open', { modal: this });

        return this;
    }

    /**
     * Close modal
     */
    async close(result = null) {
        if (!this.isOpen) return this;

        // Animate out
        this.element.classList.remove('qmf-modal--visible');
        this.element.classList.add('qmf-modal--closing');

        // Wait for animation
        await new Promise(resolve => setTimeout(resolve, 300));

        // Remove from stack
        const index = MODAL_STACK.indexOf(this);
        if (index > -1) MODAL_STACK.splice(index, 1);

        // Remove keyboard handler
        if (this._boundKeyHandler) {
            document.removeEventListener('keydown', this._boundKeyHandler);
        }

        // Restore body scroll if no more modals
        if (MODAL_STACK.length === 0) {
            document.body.classList.remove('qmf-modal-open');
            document.body.style.paddingRight = '';
        }

        // Remove from DOM
        if (!this.persistent) {
            this.element.remove();
            this.element = null;
        } else {
            this.element.classList.remove('qmf-modal--closing');
        }

        this.isOpen = false;

        // Restore focus
        if (this._previousActiveElement) {
            this._previousActiveElement.focus();
        }

        // Callback
        if (this.onClose) {
            await this.onClose(this, result);
        }

        eventBus.emit('modal:close', { modal: this, result });

        return this;
    }

    /**
     * Confirm and close
     */
    async confirm(data = null) {
        if (this.onConfirm) {
            const result = await this.onConfirm(data, this);
            if (result === false) return this;
        }
        return this.close({ confirmed: true, data });
    }

    /**
     * Cancel and close
     */
    async cancel() {
        if (this.onCancel) {
            await this.onCancel(this);
        }
        return this.close({ confirmed: false });
    }

    /**
     * Update content
     */
    setContent(content) {
        this.content = content;
        if (this.element) {
            const bodyEl = this.element.querySelector('.qmf-modal-body');
            if (typeof content === 'string') {
                bodyEl.innerHTML = content;
            } else if (typeof content.render === 'function') {
                bodyEl.innerHTML = '';
                content.render(bodyEl);
            }
        }
        return this;
    }

    /**
     * Update title
     */
    setTitle(title) {
        this.title = title;
        if (this.element) {
            const titleEl = this.element.querySelector('.qmf-modal-title');
            if (titleEl) titleEl.textContent = title;
        }
        return this;
    }

    /**
     * Destroy modal
     */
    destroy() {
        if (this.isOpen) {
            this.close();
        }
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }

    _getClasses() {
        const classes = ['qmf-modal'];

        classes.push(`qmf-modal--${this.size}`);
        if (this.centered) classes.push('qmf-modal--centered');
        if (this.scrollable) classes.push('qmf-modal--scrollable');
        if (this.className) classes.push(this.className);

        return classes.join(' ');
    }

    _bindEvents() {
        // Close button
        const closeBtn = this.element.querySelector('.qmf-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Overlay click
        if (this.closeOnOverlay) {
            const overlay = this.element.querySelector('.qmf-modal-overlay');
            overlay?.addEventListener('click', () => this.close());
        }
    }

    _handleKeyDown(e) {
        // Only handle if this is the top modal
        if (MODAL_STACK[MODAL_STACK.length - 1] !== this) return;

        if (e.key === 'Escape' && this.closeOnEscape) {
            e.preventDefault();
            this.close();
        }

        if (e.key === 'Tab') {
            this._handleTabKey(e);
        }
    }

    _handleTabKey(e) {
        const focusableElements = this.element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstEl) {
                e.preventDefault();
                lastEl.focus();
            }
        } else {
            if (document.activeElement === lastEl) {
                e.preventDefault();
                firstEl.focus();
            }
        }
    }

    _trapFocus() {
        const focusableElements = this.element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }

    _getScrollbarWidth() {
        return window.innerWidth - document.documentElement.clientWidth;
    }
}

// Factory functions
function createModal(options) {
    return new Modal(options);
}

async function openModal(options) {
    const modal = new Modal(options);
    await modal.open();
    return modal;
}

// Convenience dialogs
async function alert(message, title = 'Alert') {
    return new Promise(resolve => {
        const modal = new Modal({
            title,
            content: `<p>${message}</p>`,
            size: SIZES.SM,
            footer: `<button class="qmf-btn qmf-btn--primary" data-action="ok">OK</button>`,
            onClose: () => resolve()
        });
        modal.render();
        modal.element.querySelector('[data-action="ok"]').addEventListener('click', () => modal.close());
        modal.open();
    });
}

async function confirm(message, title = 'Confirm') {
    return new Promise(resolve => {
        const modal = new Modal({
            title,
            content: `<p>${message}</p>`,
            size: SIZES.SM,
            footer: `
                <button class="qmf-btn qmf-btn--secondary" data-action="cancel">Cancel</button>
                <button class="qmf-btn qmf-btn--primary" data-action="confirm">Confirm</button>
            `,
            onClose: (m, result) => resolve(result?.confirmed || false)
        });
        modal.render();
        modal.element.querySelector('[data-action="cancel"]').addEventListener('click', () => modal.cancel());
        modal.element.querySelector('[data-action="confirm"]').addEventListener('click', () => modal.confirm());
        modal.open();
    });
}

async function prompt(message, defaultValue = '', title = 'Input') {
    return new Promise(resolve => {
        const inputId = `prompt-${Date.now()}`;
        const modal = new Modal({
            title,
            content: `
                <p>${message}</p>
                <input type="text" id="${inputId}" class="qmf-input" value="${defaultValue}">
            `,
            size: SIZES.SM,
            footer: `
                <button class="qmf-btn qmf-btn--secondary" data-action="cancel">Cancel</button>
                <button class="qmf-btn qmf-btn--primary" data-action="confirm">OK</button>
            `,
            onClose: (m, result) => {
                if (result?.confirmed) {
                    resolve(result.data);
                } else {
                    resolve(null);
                }
            }
        });
        modal.render();
        modal.element.querySelector('[data-action="cancel"]').addEventListener('click', () => modal.cancel());
        modal.element.querySelector('[data-action="confirm"]').addEventListener('click', () => {
            const input = modal.element.querySelector(`#${inputId}`);
            modal.confirm(input.value);
        });
        modal.open();
    });
}

export default Modal;
export { Modal, createModal, openModal, alert, confirm, prompt, SIZES };
