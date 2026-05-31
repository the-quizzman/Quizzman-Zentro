/**
 * QMF Dropdown - Dropdown component
 * @version 1.0.0
 * @module ui/dropdown
 */

import eventBus from '../../kernel/event-bus.js';

// Dropdown positions
const POSITIONS = {
    BOTTOM_START: 'bottom-start',
    BOTTOM_END: 'bottom-end',
    BOTTOM: 'bottom',
    TOP_START: 'top-start',
    TOP_END: 'top-end',
    TOP: 'top',
    LEFT: 'left',
    RIGHT: 'right'
};

// Active dropdowns for click-outside handling
const ACTIVE_DROPDOWNS = new Set();

// Global click handler
let globalClickHandler = null;

function setupGlobalHandler() {
    if (globalClickHandler) return;

    globalClickHandler = (e) => {
        for (const dropdown of ACTIVE_DROPDOWNS) {
            if (!dropdown.element.contains(e.target)) {
                dropdown.close();
            }
        }
    };

    document.addEventListener('click', globalClickHandler);
}

class Dropdown {
    constructor(options = {}) {
        this.id = options.id || `dropdown-${Date.now()}`;
        this.trigger = options.trigger || null;
        this.content = options.content || [];
        this.position = options.position || POSITIONS.BOTTOM_START;
        this.offset = options.offset || { x: 0, y: 4 };
        this.closeOnSelect = options.closeOnSelect !== false;
        this.closeOnClickOutside = options.closeOnClickOutside !== false;
        this.width = options.width || 'auto';
        this.minWidth = options.minWidth || '160px';
        this.maxHeight = options.maxHeight || '300px';
        this.className = options.className || '';
        this.disabled = options.disabled || false;

        // Callbacks
        this.onSelect = options.onSelect || null;
        this.onOpen = options.onOpen || null;
        this.onClose = options.onClose || null;

        this.element = null;
        this.menuElement = null;
        this.isOpen = false;
    }

    /**
     * Render dropdown
     */
    render(container = null) {
        const html = `
            <div class="qmf-dropdown ${this.className}" id="${this.id}" data-position="${this.position}">
                <div class="qmf-dropdown-trigger">
                    ${typeof this.trigger === 'string' ? this.trigger : ''}
                </div>
                <div class="qmf-dropdown-menu" role="menu" style="min-width: ${this.minWidth}; max-height: ${this.maxHeight}; width: ${this.width};">
                    ${this._renderItems(this.content)}
                </div>
            </div>
        `;

        const temp = document.createElement('div');
        temp.innerHTML = html.trim();
        this.element = temp.firstElementChild;
        this.menuElement = this.element.querySelector('.qmf-dropdown-menu');

        // Render trigger if component
        if (this.trigger && typeof this.trigger !== 'string') {
            const triggerEl = this.element.querySelector('.qmf-dropdown-trigger');
            if (typeof this.trigger.render === 'function') {
                this.trigger.render(triggerEl);
            } else if (this.trigger instanceof HTMLElement) {
                triggerEl.innerHTML = '';
                triggerEl.appendChild(this.trigger);
            }
        }

        if (container) {
            container.appendChild(this.element);
        }

        this._bindEvents();

        return this.element;
    }

    /**
     * Render menu items
     */
    _renderItems(items) {
        if (!items || items.length === 0) return '';

        return items.map(item => {
            if (item.type === 'divider') {
                return '<hr class="qmf-dropdown-divider">';
            }

            if (item.type === 'header') {
                return `<div class="qmf-dropdown-header">${item.label}</div>`;
            }

            if (item.children && item.children.length > 0) {
                return `
                    <div class="qmf-dropdown-item qmf-dropdown-submenu" data-value="${item.value || ''}">
                        ${item.icon ? `<span class="qmf-dropdown-icon">${item.icon}</span>` : ''}
                        <span class="qmf-dropdown-label">${item.label}</span>
                        <span class="qmf-dropdown-arrow">›</span>
                        <div class="qmf-dropdown-menu qmf-dropdown-submenu-content">
                            ${this._renderItems(item.children)}
                        </div>
                    </div>
                `;
            }

            const classes = ['qmf-dropdown-item'];
            if (item.disabled) classes.push('qmf-dropdown-item--disabled');
            if (item.active) classes.push('qmf-dropdown-item--active');
            if (item.danger) classes.push('qmf-dropdown-item--danger');

            return `
                <div class="${classes.join(' ')}" 
                     role="menuitem"
                     data-value="${item.value || ''}"
                     ${item.disabled ? 'aria-disabled="true"' : ''}>
                    ${item.icon ? `<span class="qmf-dropdown-icon">${item.icon}</span>` : ''}
                    <span class="qmf-dropdown-label">${item.label}</span>
                    ${item.shortcut ? `<span class="qmf-dropdown-shortcut">${item.shortcut}</span>` : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * Open dropdown
     */
    open() {
        if (this.isOpen || this.disabled) return;

        setupGlobalHandler();

        this.isOpen = true;
        this.element.classList.add('qmf-dropdown--open');

        // Position menu
        this._positionMenu();

        // Add to active set
        ACTIVE_DROPDOWNS.add(this);

        // Callback
        if (this.onOpen) {
            this.onOpen(this);
        }

        eventBus.emit('dropdown:open', { dropdown: this });
    }

    /**
     * Close dropdown
     */
    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.element.classList.remove('qmf-dropdown--open');

        // Remove from active set
        ACTIVE_DROPDOWNS.delete(this);

        // Callback
        if (this.onClose) {
            this.onClose(this);
        }

        eventBus.emit('dropdown:close', { dropdown: this });
    }

    /**
     * Toggle dropdown
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Update items
     */
    setItems(items) {
        this.content = items;
        if (this.menuElement) {
            this.menuElement.innerHTML = this._renderItems(items);
            this._bindItemEvents();
        }
        return this;
    }

    /**
     * Add item
     */
    addItem(item, index = -1) {
        if (index === -1) {
            this.content.push(item);
        } else {
            this.content.splice(index, 0, item);
        }
        this.setItems(this.content);
        return this;
    }

    /**
     * Remove item by value
     */
    removeItem(value) {
        this.content = this.content.filter(item => item.value !== value);
        this.setItems(this.content);
        return this;
    }

    /**
     * Enable/disable
     */
    setDisabled(disabled) {
        this.disabled = disabled;
        this.element?.classList.toggle('qmf-dropdown--disabled', disabled);
        return this;
    }

    /**
     * Destroy dropdown
     */
    destroy() {
        this.close();
        ACTIVE_DROPDOWNS.delete(this);
        this.element?.remove();
        this.element = null;
    }

    /**
     * Position the menu
     */
    _positionMenu() {
        if (!this.menuElement) return;

        const triggerRect = this.element.querySelector('.qmf-dropdown-trigger').getBoundingClientRect();
        const menuRect = this.menuElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let top = 0;
        let left = 0;

        // Calculate position based on setting
        switch (this.position) {
            case POSITIONS.BOTTOM_START:
                top = triggerRect.bottom + this.offset.y;
                left = triggerRect.left;
                break;
            case POSITIONS.BOTTOM_END:
                top = triggerRect.bottom + this.offset.y;
                left = triggerRect.right - menuRect.width;
                break;
            case POSITIONS.BOTTOM:
                top = triggerRect.bottom + this.offset.y;
                left = triggerRect.left + (triggerRect.width - menuRect.width) / 2;
                break;
            case POSITIONS.TOP_START:
                top = triggerRect.top - menuRect.height - this.offset.y;
                left = triggerRect.left;
                break;
            case POSITIONS.TOP_END:
                top = triggerRect.top - menuRect.height - this.offset.y;
                left = triggerRect.right - menuRect.width;
                break;
            case POSITIONS.TOP:
                top = triggerRect.top - menuRect.height - this.offset.y;
                left = triggerRect.left + (triggerRect.width - menuRect.width) / 2;
                break;
            case POSITIONS.LEFT:
                top = triggerRect.top;
                left = triggerRect.left - menuRect.width - this.offset.x;
                break;
            case POSITIONS.RIGHT:
                top = triggerRect.top;
                left = triggerRect.right + this.offset.x;
                break;
        }

        // Keep within viewport
        if (left < 0) left = 0;
        if (left + menuRect.width > viewportWidth) left = viewportWidth - menuRect.width;
        if (top + menuRect.height > viewportHeight) {
            top = triggerRect.top - menuRect.height - this.offset.y;
        }
        if (top < 0) top = 0;

        this.menuElement.style.position = 'fixed';
        this.menuElement.style.top = `${top}px`;
        this.menuElement.style.left = `${left}px`;
    }

    _bindEvents() {
        const triggerEl = this.element.querySelector('.qmf-dropdown-trigger');

        triggerEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        this._bindItemEvents();
    }

    _bindItemEvents() {
        const items = this.element.querySelectorAll('.qmf-dropdown-item:not(.qmf-dropdown-submenu)');

        items.forEach(item => {
            item.addEventListener('click', (e) => {
                if (item.classList.contains('qmf-dropdown-item--disabled')) return;

                const value = item.dataset.value;
                const label = item.querySelector('.qmf-dropdown-label')?.textContent;

                if (this.onSelect) {
                    this.onSelect({ value, label, event: e });
                }

                eventBus.emit('dropdown:select', { dropdown: this, value, label });

                if (this.closeOnSelect) {
                    this.close();
                }
            });
        });
    }
}

// Factory
function createDropdown(options) {
    return new Dropdown(options);
}

export default Dropdown;
export { Dropdown, createDropdown, POSITIONS };
