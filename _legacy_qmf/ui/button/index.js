/**
 * QMF Button - Button component
 * @version 1.0.0
 * @module ui/button
 */

import eventBus from '../../kernel/event-bus.js';

// Button variants
const VARIANTS = {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    SUCCESS: 'success',
    WARNING: 'warning',
    DANGER: 'danger',
    GHOST: 'ghost',
    LINK: 'link'
};

// Button sizes
const SIZES = {
    XS: 'xs',
    SM: 'sm',
    MD: 'md',
    LG: 'lg',
    XL: 'xl'
};

class Button {
    constructor(options = {}) {
        this.id = options.id || `btn-${Date.now()}`;
        this.label = options.label || '';
        this.icon = options.icon || null;
        this.iconPosition = options.iconPosition || 'left';
        this.variant = options.variant || VARIANTS.PRIMARY;
        this.size = options.size || SIZES.MD;
        this.disabled = options.disabled || false;
        this.loading = options.loading || false;
        this.fullWidth = options.fullWidth || false;
        this.type = options.type || 'button';
        this.ariaLabel = options.ariaLabel || null;
        this.tooltip = options.tooltip || null;
        this.onClick = options.onClick || null;
        this.className = options.className || '';
        this.attributes = options.attributes || {};

        this.element = null;
    }

    /**
     * Render button
     */
    render(container = null) {
        const classes = this._getClasses();
        const attrs = this._getAttributes();

        const iconHtml = this.icon 
            ? `<span class="qmf-btn-icon">${this.icon}</span>` 
            : '';

        const labelHtml = this.label 
            ? `<span class="qmf-btn-label">${this.label}</span>` 
            : '';

        const spinnerHtml = `<span class="qmf-btn-spinner" aria-hidden="true"></span>`;

        const content = this.iconPosition === 'right'
            ? `${this.loading ? spinnerHtml : ''}${labelHtml}${iconHtml}`
            : `${this.loading ? spinnerHtml : ''}${iconHtml}${labelHtml}`;

        const html = `
            <button class="${classes}" ${attrs}>
                ${content}
            </button>
        `;

        if (container) {
            container.innerHTML = html;
            this.element = container.querySelector('button');
        } else {
            const temp = document.createElement('div');
            temp.innerHTML = html.trim();
            this.element = temp.firstElementChild;
        }

        this._bindEvents();

        return this.element;
    }

    /**
     * Update button state
     */
    update(options = {}) {
        if (options.label !== undefined) {
            this.label = options.label;
            const labelEl = this.element?.querySelector('.qmf-btn-label');
            if (labelEl) labelEl.textContent = this.label;
        }

        if (options.disabled !== undefined) {
            this.disabled = options.disabled;
            if (this.element) {
                this.element.disabled = this.disabled;
                this.element.classList.toggle('qmf-btn--disabled', this.disabled);
            }
        }

        if (options.loading !== undefined) {
            this.setLoading(options.loading);
        }

        if (options.variant !== undefined) {
            this.setVariant(options.variant);
        }

        return this;
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.loading = loading;
        if (!this.element) return this;

        this.element.classList.toggle('qmf-btn--loading', loading);
        this.element.disabled = loading || this.disabled;

        // Toggle spinner
        let spinner = this.element.querySelector('.qmf-btn-spinner');
        if (loading && !spinner) {
            spinner = document.createElement('span');
            spinner.className = 'qmf-btn-spinner';
            spinner.setAttribute('aria-hidden', 'true');
            this.element.insertBefore(spinner, this.element.firstChild);
        } else if (!loading && spinner) {
            spinner.remove();
        }

        return this;
    }

    /**
     * Set variant
     */
    setVariant(variant) {
        if (!this.element) return this;

        this.element.classList.remove(`qmf-btn--${this.variant}`);
        this.variant = variant;
        this.element.classList.add(`qmf-btn--${variant}`);

        return this;
    }

    /**
     * Focus button
     */
    focus() {
        this.element?.focus();
        return this;
    }

    /**
     * Blur button
     */
    blur() {
        this.element?.blur();
        return this;
    }

    /**
     * Click programmatically
     */
    click() {
        this.element?.click();
        return this;
    }

    /**
     * Destroy button
     */
    destroy() {
        if (this.element) {
            this.element.removeEventListener('click', this._handleClick);
            this.element.remove();
            this.element = null;
        }
    }

    _getClasses() {
        const classes = ['qmf-btn'];

        classes.push(`qmf-btn--${this.variant}`);
        classes.push(`qmf-btn--${this.size}`);

        if (this.disabled) classes.push('qmf-btn--disabled');
        if (this.loading) classes.push('qmf-btn--loading');
        if (this.fullWidth) classes.push('qmf-btn--full');
        if (!this.label && this.icon) classes.push('qmf-btn--icon-only');
        if (this.className) classes.push(this.className);

        return classes.join(' ');
    }

    _getAttributes() {
        const attrs = [
            `id="${this.id}"`,
            `type="${this.type}"`,
            `data-button`
        ];

        if (this.disabled || this.loading) {
            attrs.push('disabled');
        }

        if (this.ariaLabel) {
            attrs.push(`aria-label="${this.ariaLabel}"`);
        }

        if (this.tooltip) {
            attrs.push(`title="${this.tooltip}"`);
        }

        for (const [key, value] of Object.entries(this.attributes)) {
            attrs.push(`${key}="${value}"`);
        }

        return attrs.join(' ');
    }

    _bindEvents() {
        if (!this.element) return;

        this._handleClick = (e) => {
            if (this.disabled || this.loading) {
                e.preventDefault();
                return;
            }

            if (this.onClick) {
                this.onClick(e, this);
            }

            eventBus.emit('button:click', { button: this, event: e });
        };

        this.element.addEventListener('click', this._handleClick);
    }
}

// Factory function
function createButton(options) {
    return new Button(options);
}

// Button group
class ButtonGroup {
    constructor(buttons = [], options = {}) {
        this.buttons = buttons.map(btn => 
            btn instanceof Button ? btn : new Button(btn)
        );
        this.options = {
            vertical: false,
            size: null,
            ...options
        };
        this.element = null;
    }

    render(container = null) {
        const classes = ['qmf-btn-group'];
        if (this.options.vertical) classes.push('qmf-btn-group--vertical');

        const wrapper = document.createElement('div');
        wrapper.className = classes.join(' ');
        wrapper.setAttribute('role', 'group');

        for (const button of this.buttons) {
            if (this.options.size) button.size = this.options.size;
            wrapper.appendChild(button.render());
        }

        this.element = wrapper;

        if (container) {
            container.appendChild(wrapper);
        }

        return wrapper;
    }

    destroy() {
        for (const button of this.buttons) {
            button.destroy();
        }
        this.element?.remove();
    }
}

export default Button;
export { Button, ButtonGroup, createButton, VARIANTS, SIZES };
