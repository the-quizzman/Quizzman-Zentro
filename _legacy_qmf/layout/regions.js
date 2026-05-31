/**
 * QMF Regions - Region management for header/nav/main/footer
 * @version 1.0.0
 * @module layout/regions
 */

import eventBus from '../kernel/event-bus.js';
import lifecycle from '../kernel/lifecycle.js';

// Region types
const REGION_TYPES = {
    HEADER: 'header',
    SIDEBAR: 'sidebar',
    MAIN: 'main',
    FOOTER: 'footer',
    OVERLAY: 'overlay'
};

// Slot positions
const SLOT_POSITIONS = {
    BEFORE: 'before',
    AFTER: 'after',
    REPLACE: 'replace',
    APPEND: 'append',
    PREPEND: 'prepend'
};

class RegionManager {
    constructor() {
        this.regions = new Map();
        this.slots = new Map();
        this.activeContent = new Map();
    }

    /**
     * Đăng ký region
     */
    register(name, element, options = {}) {
        if (!element) {
            throw new Error(`Region element is required: ${name}`);
        }

        const region = {
            name,
            element,
            type: options.type || 'custom',
            slots: new Map(),
            content: null,
            isVisible: true,
            options
        };

        this.regions.set(name, region);

        // Auto-discover slots
        this._discoverSlots(region);

        eventBus.emit('region:registered', { name, region });

        return region;
    }

    /**
     * Unregister region
     */
    unregister(name) {
        const region = this.regions.get(name);
        if (!region) return;

        // Clear content
        this.clearContent(name);

        this.regions.delete(name);
        eventBus.emit('region:unregistered', { name });
    }

    /**
     * Lấy region
     */
    get(name) {
        return this.regions.get(name);
    }

    /**
     * Lấy element của region
     */
    getElement(name) {
        const region = this.regions.get(name);
        return region?.element || null;
    }

    /**
     * Set content cho region
     */
    async setContent(regionName, content, options = {}) {
        const region = this.regions.get(regionName);
        if (!region) {
            throw new Error(`Region not found: ${regionName}`);
        }

        const { animate = true, replace = true } = options;

        // Emit before event
        eventBus.emit('region:beforeContent', { 
            region: regionName, 
            content,
            oldContent: region.content 
        });

        // Clear existing if replace
        if (replace) {
            await this.clearContent(regionName, animate);
        }

        // Render content
        const rendered = await this._renderContent(content, region.element);

        region.content = rendered;
        this.activeContent.set(regionName, rendered);

        // Animate in
        if (animate && rendered) {
            await this._animateIn(rendered);
        }

        eventBus.emit('region:contentSet', { region: regionName, content: rendered });

        return rendered;
    }

    /**
     * Clear content từ region
     */
    async clearContent(regionName, animate = true) {
        const region = this.regions.get(regionName);
        if (!region || !region.content) return;

        const content = region.content;

        // Animate out
        if (animate) {
            await this._animateOut(content);
        }

        // Remove from DOM
        if (content.parentNode) {
            content.parentNode.removeChild(content);
        }

        region.content = null;
        this.activeContent.delete(regionName);

        eventBus.emit('region:contentCleared', { region: regionName });
    }

    /**
     * Set content cho slot trong region
     */
    async setSlotContent(slotName, content, options = {}) {
        const slotElement = this._findSlot(slotName);
        if (!slotElement) {
            console.warn(`[Regions] Slot not found: ${slotName}`);
            return null;
        }

        const { position = SLOT_POSITIONS.REPLACE, animate = true } = options;

        // Clear existing slot content if replace
        if (position === SLOT_POSITIONS.REPLACE) {
            slotElement.innerHTML = '';
        }

        // Render content
        const rendered = await this._renderContent(content);

        if (!rendered) return null;

        // Position content
        switch (position) {
            case SLOT_POSITIONS.BEFORE:
                slotElement.parentNode.insertBefore(rendered, slotElement);
                break;
            case SLOT_POSITIONS.AFTER:
                slotElement.parentNode.insertBefore(rendered, slotElement.nextSibling);
                break;
            case SLOT_POSITIONS.PREPEND:
                slotElement.insertBefore(rendered, slotElement.firstChild);
                break;
            case SLOT_POSITIONS.APPEND:
            case SLOT_POSITIONS.REPLACE:
            default:
                slotElement.appendChild(rendered);
        }

        // Store slot content
        this.slots.set(slotName, rendered);

        // Animate
        if (animate) {
            await this._animateIn(rendered);
        }

        eventBus.emit('slot:contentSet', { slot: slotName, content: rendered });

        return rendered;
    }

    /**
     * Clear slot content
     */
    clearSlot(slotName) {
        const slotElement = this._findSlot(slotName);
        if (slotElement) {
            slotElement.innerHTML = '';
        }
        this.slots.delete(slotName);
    }

    /**
     * Show region
     */
    show(regionName, animate = true) {
        const region = this.regions.get(regionName);
        if (!region) return;

        region.isVisible = true;
        region.element.style.display = '';

        if (animate) {
            region.element.classList.add('qmf-region-entering');
            requestAnimationFrame(() => {
                region.element.classList.remove('qmf-region-entering');
            });
        }

        eventBus.emit('region:show', { region: regionName });
    }

    /**
     * Hide region
     */
    hide(regionName, animate = true) {
        const region = this.regions.get(regionName);
        if (!region) return;

        region.isVisible = false;

        if (animate) {
            region.element.classList.add('qmf-region-leaving');
            setTimeout(() => {
                region.element.style.display = 'none';
                region.element.classList.remove('qmf-region-leaving');
            }, 300);
        } else {
            region.element.style.display = 'none';
        }

        eventBus.emit('region:hide', { region: regionName });
    }

    /**
     * Toggle region visibility
     */
    toggle(regionName) {
        const region = this.regions.get(regionName);
        if (!region) return;

        if (region.isVisible) {
            this.hide(regionName);
        } else {
            this.show(regionName);
        }
    }

    /**
     * Discover slots trong region
     */
    _discoverSlots(region) {
        const slotElements = region.element.querySelectorAll('[data-slot]');

        slotElements.forEach(el => {
            const slotName = el.dataset.slot;
            region.slots.set(slotName, el);
        });
    }

    /**
     * Find slot by name
     */
    _findSlot(slotName) {
        // Search in all regions
        for (const [, region] of this.regions) {
            if (region.slots.has(slotName)) {
                return region.slots.get(slotName);
            }

            // Also try querySelector
            const slot = region.element.querySelector(`[data-slot="${slotName}"]`);
            if (slot) return slot;
        }

        // Try global search
        return document.querySelector(`[data-slot="${slotName}"]`);
    }

    /**
     * Render content (string, element, or component)
     */
    async _renderContent(content, container = null) {
        if (!content) return null;

        // String HTML
        if (typeof content === 'string') {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = content.trim();
            return wrapper.children.length === 1 
                ? wrapper.firstElementChild 
                : wrapper;
        }

        // DOM Element
        if (content instanceof HTMLElement) {
            return content;
        }

        // Component với render method
        if (typeof content.render === 'function') {
            const rendered = await content.render(container);
            if (typeof rendered === 'string') {
                return this._renderContent(rendered);
            }
            return rendered;
        }

        // Function
        if (typeof content === 'function') {
            const result = await content(container);
            return this._renderContent(result);
        }

        console.warn('[Regions] Unknown content type:', content);
        return null;
    }

    /**
     * Animate content in
     */
    async _animateIn(element) {
        if (!element) return;

        element.classList.add('qmf-content-entering');

        await new Promise(resolve => {
            requestAnimationFrame(() => {
                element.classList.add('qmf-content-enter-active');
                setTimeout(() => {
                    element.classList.remove('qmf-content-entering', 'qmf-content-enter-active');
                    resolve();
                }, 300);
            });
        });
    }

    /**
     * Animate content out
     */
    async _animateOut(element) {
        if (!element) return;

        element.classList.add('qmf-content-leaving');

        await new Promise(resolve => {
            setTimeout(() => {
                element.classList.remove('qmf-content-leaving');
                resolve();
            }, 300);
        });
    }

    /**
     * Get all registered regions
     */
    getAll() {
        return Array.from(this.regions.entries()).map(([name, region]) => ({
            name,
            type: region.type,
            isVisible: region.isVisible,
            hasContent: !!region.content,
            slots: Array.from(region.slots.keys())
        }));
    }
}

// Export constants
export { REGION_TYPES, SLOT_POSITIONS };

// Singleton export
const regions = new RegionManager();
export default regions;
export { RegionManager };
