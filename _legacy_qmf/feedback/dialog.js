/**
 * QMF Dialog - Dialog component (Alert, Confirm, Prompt)
 * @version 1.0.0
 * @module feedback/dialog
 */

import eventBus from '../kernel/event-bus.js';
import Modal from '../ui/modal/index.js';

// Dialog types
const TYPES = {
    ALERT: 'alert',
    CONFIRM: 'confirm',
    PROMPT: 'prompt',
    CUSTOM: 'custom'
};

class Dialog {
    constructor(options = {}) {
        this.type = options.type || TYPES.ALERT;
        this.title = options.title || this._getDefaultTitle();
        this.message = options.message || '';
        this.icon = options.icon || this._getDefaultIcon();
        this.confirmText = options.confirmText || 'OK';
        this.cancelText = options.cancelText || 'Cancel';
        this.inputType = options.inputType || 'text';
        this.inputPlaceholder = options.inputPlaceholder || '';
        this.inputValue = options.inputValue || '';
        this.inputValidation = options.inputValidation || null;
        this.dangerous = options.dangerous || false;
        this.className = options.className || '';

        this.modal = null;
        this._resolve = null;
        this._reject = null;
    }

    /**
     * Show dialog and return promise
     */
    show() {
        return new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;

            this.modal = new Modal({
                title: this.title,
                content: this._getContent(),
                footer: this._getFooter(),
                size: 'sm',
                centered: true,
                closeOnEscape: this.type !== TYPES.ALERT,
                closeOnOverlay: false,
                closable: this.type !== TYPES.ALERT,
                className: `qmf-dialog qmf-dialog--${this.type} ${this.className}`,
                onClose: () => this._handleClose()
            });

            this.modal.open();

            // Focus input if prompt
            if (this.type === TYPES.PROMPT) {
                setTimeout(() => {
                    const input = this.modal.element.querySelector('.qmf-dialog-input');
                    if (input) {
                        input.focus();
                        input.select();
                    }
                }, 100);
            }

            // Bind events
            this._bindEvents();
        });
    }

    /**
     * Get dialog content
     */
    _getContent() {
        const iconHtml = this.icon 
            ? `<div class="qmf-dialog-icon">${this.icon}</div>` 
            : '';

        let inputHtml = '';
        if (this.type === TYPES.PROMPT) {
            inputHtml = `
                <div class="qmf-dialog-input-wrapper">
                    <input 
                        type="${this.inputType}" 
                        class="qmf-dialog-input qmf-input" 
                        placeholder="${this.inputPlaceholder}"
                        value="${this.inputValue}"
                    >
                    <p class="qmf-dialog-error" style="display: none;"></p>
                </div>
            `;
        }

        return `
            <div class="qmf-dialog-body">
                ${iconHtml}
                <div class="qmf-dialog-message">${this.message}</div>
                ${inputHtml}
            </div>
        `;
    }

    /**
     * Get dialog footer
     */
    _getFooter() {
        const confirmClass = this.dangerous 
            ? 'qmf-btn--danger' 
            : 'qmf-btn--primary';

        if (this.type === TYPES.ALERT) {
            return `
                <button class="qmf-btn ${confirmClass}" data-action="confirm">
                    ${this.confirmText}
                </button>
            `;
        }

        return `
            <button class="qmf-btn qmf-btn--secondary" data-action="cancel">
                ${this.cancelText}
            </button>
            <button class="qmf-btn ${confirmClass}" data-action="confirm">
                ${this.confirmText}
            </button>
        `;
    }

    /**
     * Get default title
     */
    _getDefaultTitle() {
        const titles = {
            [TYPES.ALERT]: 'Alert',
            [TYPES.CONFIRM]: 'Confirm',
            [TYPES.PROMPT]: 'Input',
            [TYPES.CUSTOM]: ''
        };
        return titles[this.type] || '';
    }

    /**
     * Get default icon
     */
    _getDefaultIcon() {
        if (this.dangerous) return '⚠️';

        const icons = {
            [TYPES.ALERT]: 'ℹ️',
            [TYPES.CONFIRM]: '❓',
            [TYPES.PROMPT]: '✏️',
            [TYPES.CUSTOM]: null
        };
        return icons[this.type] || null;
    }

    /**
     * Bind events
     */
    _bindEvents() {
        const confirmBtn = this.modal.element.querySelector('[data-action="confirm"]');
        const cancelBtn = this.modal.element.querySelector('[data-action="cancel"]');
        const input = this.modal.element.querySelector('.qmf-dialog-input');

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this._handleConfirm());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this._handleCancel());
        }

        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this._handleConfirm();
                }
            });
        }
    }

    /**
     * Handle confirm
     */
    async _handleConfirm() {
        if (this.type === TYPES.PROMPT) {
            const input = this.modal.element.querySelector('.qmf-dialog-input');
            const value = input.value;

            // Validate if needed
            if (this.inputValidation) {
                const error = await this.inputValidation(value);
                if (error) {
                    const errorEl = this.modal.element.querySelector('.qmf-dialog-error');
                    if (errorEl) {
                        errorEl.textContent = error;
                        errorEl.style.display = 'block';
                    }
                    input.classList.add('qmf-input--error');
                    return;
                }
            }

            this.modal.close();
            this._resolve(value);
        } else if (this.type === TYPES.CONFIRM) {
            this.modal.close();
            this._resolve(true);
        } else {
            this.modal.close();
            this._resolve();
        }
    }

    /**
     * Handle cancel
     */
    _handleCancel() {
        this.modal.close();
        
        if (this.type === TYPES.CONFIRM) {
            this._resolve(false);
        } else if (this.type === TYPES.PROMPT) {
            this._resolve(null);
        }
    }

    /**
     * Handle close (X button or escape)
     */
    _handleClose() {
        if (this.type === TYPES.CONFIRM) {
            this._resolve(false);
        } else if (this.type === TYPES.PROMPT) {
            this._resolve(null);
        } else {
            this._resolve();
        }
    }
}

// Dialog manager with static methods
class DialogManager {
    /**
     * Show alert dialog
     */
    static alert(message, options = {}) {
        const dialog = new Dialog({
            ...options,
            type: TYPES.ALERT,
            message
        });
        return dialog.show();
    }

    /**
     * Show confirm dialog
     */
    static confirm(message, options = {}) {
        const dialog = new Dialog({
            ...options,
            type: TYPES.CONFIRM,
            message
        });
        return dialog.show();
    }

    /**
     * Show prompt dialog
     */
    static prompt(message, options = {}) {
        const dialog = new Dialog({
            ...options,
            type: TYPES.PROMPT,
            message
        });
        return dialog.show();
    }

    /**
     * Show danger confirm dialog
     */
    static danger(message, options = {}) {
        return this.confirm(message, {
            ...options,
            dangerous: true,
            title: options.title || 'Warning',
            confirmText: options.confirmText || 'Delete'
        });
    }

    /**
     * Show success alert
     */
    static success(message, options = {}) {
        return this.alert(message, {
            ...options,
            icon: '✓',
            title: options.title || 'Success',
            className: 'qmf-dialog--success'
        });
    }

    /**
     * Show error alert
     */
    static error(message, options = {}) {
        return this.alert(message, {
            ...options,
            icon: '✕',
            title: options.title || 'Error',
            className: 'qmf-dialog--error'
        });
    }

    /**
     * Show custom dialog
     */
    static custom(options = {}) {
        const dialog = new Dialog({
            ...options,
            type: TYPES.CUSTOM
        });
        return dialog.show();
    }
}

// Export aliases
const alert = DialogManager.alert.bind(DialogManager);
const confirm = DialogManager.confirm.bind(DialogManager);
const prompt = DialogManager.prompt.bind(DialogManager);
const danger = DialogManager.danger.bind(DialogManager);

export default DialogManager;
export { Dialog, DialogManager, TYPES, alert, confirm, prompt, danger };
