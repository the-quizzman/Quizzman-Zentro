/**
 * QMF Sidebar Plugin
 * Collapsible sidebar navigation component
 * @version 1.0.0
 */

import { eventBus } from '../kernel/event-bus.js';
import { context } from '../kernel/context.js';
import { viewport } from '../platform/viewport.js';

/**
 * @typedef {Object} SidebarConfig
 * @property {Array} items - Menu items
 * @property {boolean} collapsible - Can collapse
 * @property {boolean} collapsed - Initial collapsed state
 * @property {boolean} mini - Mini mode when collapsed
 * @property {boolean} overlay - Overlay mode on mobile
 * @property {string} position - 'left' or 'right'
 */

class SidebarPlugin {
    constructor() {
        this.element = null;
        this.config = {};
        this.isCollapsed = false;
        this.isOpen = false;
        
        this._defaults = {
            items: [],
            collapsible: true,
            collapsed: false,
            mini: true,
            overlay: true,
            position: 'left',
            width: 'var(--qmf-sidebar-width)',
            collapsedWidth: 'var(--qmf-sidebar-collapsed-width)',
            header: null,
            footer: null
        };
    }
    
    /**
     * Initialize sidebar
     */
    init(config = {}) {
        this.config = { ...this._defaults, ...config };
        this.isCollapsed = this.config.collapsed;
        
        this._createSidebar();
        this._bindEvents();
        this._watchViewport();
        this._restoreState();
        
        eventBus.emit('sidebar:initialized', { config: this.config });
        
        return this;
    }
    
    /**
     * Create sidebar DOM
     */
    _createSidebar() {
        this.element = document.createElement('aside');
        this.element.id = 'qmf-sidebar';
        this.element.className = 'qmf-sidebar';
        this.element.classList.toggle('qmf-sidebar--collapsed', this.isCollapsed);
        this.element.dataset.position = this.config.position;
        
        this.element.innerHTML = this._renderContent();
        this._injectStyles();
    }
    
    /**
     * Render sidebar content
     */
    _renderContent() {
        return `
            ${this.config.header ? `
                <div class="qmf-sidebar__header">
                    ${typeof this.config.header === 'function' ? this.config.header() : this.config.header}
                </div>
            ` : ''}
            
            <nav class="qmf-sidebar__nav">
                ${this._renderMenuItems(this.config.items)}
            </nav>
            
            ${this.config.footer ? `
                <div class="qmf-sidebar__footer">
                    ${typeof this.config.footer === 'function' ? this.config.footer() : this.config.footer}
                </div>
            ` : ''}
            
            ${this.config.collapsible ? `
                <button class="qmf-sidebar__toggle" aria-label="Toggle sidebar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m15 18-6-6 6-6"/>
                    </svg>
                </button>
            ` : ''}
        `;
    }
    
    /**
     * Render menu items recursively
     */
    _renderMenuItems(items, level = 0) {
        return `
            <ul class="qmf-sidebar__menu qmf-sidebar__menu--level-${level}">
                ${items.map(item => this._renderMenuItem(item, level)).join('')}
            </ul>
        `;
    }
    
    /**
     * Render single menu item
     */
    _renderMenuItem(item, level) {
        if (item.divider) {
            return '<li class="qmf-sidebar__divider"></li>';
        }
        
        if (item.heading) {
            return `
                <li class="qmf-sidebar__heading">
                    <span>${item.heading}</span>
                </li>
            `;
        }
        
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = item.expanded || false;
        const isActive = this._isItemActive(item);
        
        return `
            <li class="qmf-sidebar__item ${isActive ? 'qmf-sidebar__item--active' : ''} ${hasChildren ? 'qmf-sidebar__item--has-children' : ''} ${isExpanded ? 'qmf-sidebar__item--expanded' : ''}"
                data-id="${item.id || ''}"
                data-level="${level}">
                <a href="${item.href || '#'}" 
                   class="qmf-sidebar__link"
                   ${item.external ? 'target="_blank" rel="noopener"' : ''}
                   ${hasChildren ? 'data-toggle="submenu"' : ''}>
                    ${item.icon ? `
                        <span class="qmf-sidebar__icon">${this._renderIcon(item.icon)}</span>
                    ` : ''}
                    <span class="qmf-sidebar__label">${item.label}</span>
                    ${item.badge ? `
                        <span class="qmf-sidebar__badge qmf-sidebar__badge--${item.badgeType || 'default'}">${item.badge}</span>
                    ` : ''}
                    ${hasChildren ? `
                        <svg class="qmf-sidebar__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m9 18 6-6-6-6"/>
                        </svg>
                    ` : ''}
                </a>
                ${hasChildren ? `
                    <div class="qmf-sidebar__submenu">
                        ${this._renderMenuItems(item.children, level + 1)}
                    </div>
                ` : ''}
            </li>
        `;
    }
    
    /**
     * Render icon (SVG or class)
     */
    _renderIcon(icon) {
        if (icon.startsWith('<svg')) {
            return icon;
        }
        
        // Built-in icons
        const icons = {
            home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
            dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
            users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
            settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
            file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
            folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
            chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
            message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
            help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
        };
        
        return icons[icon] || `<span class="qmf-sidebar__icon-class ${icon}"></span>`;
    }
    
    /**
     * Check if item is active
     */
    _isItemActive(item) {
        const currentPath = window.location.pathname;
        
        if (item.href === currentPath) return true;
        if (item.match && new RegExp(item.match).test(currentPath)) return true;
        
        return false;
    }
    
    /**
     * Bind events
     */
    _bindEvents() {
        // Toggle button
        const toggleBtn = this.element.querySelector('.qmf-sidebar__toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
        
        // Submenu toggles
        this.element.querySelectorAll('[data-toggle="submenu"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const item = link.closest('.qmf-sidebar__item');
                if (item.classList.contains('qmf-sidebar__item--has-children')) {
                    e.preventDefault();
                    this._toggleSubmenu(item);
                }
            });
        });
        
        // Menu item clicks
        this.element.querySelectorAll('.qmf-sidebar__link:not([data-toggle])').forEach(link => {
            link.addEventListener('click', (e) => {
                const item = link.closest('.qmf-sidebar__item');
                const itemId = item.dataset.id;
                
                eventBus.emit('sidebar:item-click', { 
                    id: itemId, 
                    href: link.href,
                    event: e 
                });
                
                // Close mobile sidebar
                if (viewport.isMobile()) {
                    this.close();
                }
            });
        });
        
        // Listen for toggle events
        eventBus.on('sidebar:toggle', () => this.toggle());
        eventBus.on('sidebar:open', () => this.open());
        eventBus.on('sidebar:close', () => this.close());
        
        // Route changes
        eventBus.on('router:navigate', () => this._updateActiveItem());
    }
    
    /**
     * Watch viewport
     */
    _watchViewport() {
        viewport.on('change', ({ breakpoint }) => {
            const isMobile = ['xs', 'sm'].includes(breakpoint);
            
            this.element.classList.toggle('qmf-sidebar--overlay', isMobile && this.config.overlay);
            
            if (isMobile) {
                this.close();
            }
        });
    }
    
    /**
     * Restore saved state
     */
    _restoreState() {
        const saved = localStorage.getItem('qmf_sidebar_collapsed');
        if (saved !== null) {
            this.isCollapsed = saved === 'true';
            this.element.classList.toggle('qmf-sidebar--collapsed', this.isCollapsed);
        }
    }
    
    /**
     * Toggle submenu
     */
    _toggleSubmenu(item) {
        const isExpanded = item.classList.contains('qmf-sidebar__item--expanded');
        
        // Close siblings
        const siblings = item.parentElement.querySelectorAll('.qmf-sidebar__item--expanded');
        siblings.forEach(sibling => {
            if (sibling !== item) {
                sibling.classList.remove('qmf-sidebar__item--expanded');
            }
        });
        
        item.classList.toggle('qmf-sidebar__item--expanded', !isExpanded);
        
        eventBus.emit('sidebar:submenu-toggle', {
            id: item.dataset.id,
            expanded: !isExpanded
        });
    }
    
    /**
     * Update active menu item
     */
    _updateActiveItem() {
        const currentPath = window.location.pathname;
        
        this.element.querySelectorAll('.qmf-sidebar__item').forEach(item => {
            const link = item.querySelector('.qmf-sidebar__link');
            const href = link?.getAttribute('href');
            const isActive = href === currentPath;
            
            item.classList.toggle('qmf-sidebar__item--active', isActive);
            
            // Expand parent if active child
            if (isActive) {
                let parent = item.parentElement?.closest('.qmf-sidebar__item');
                while (parent) {
                    parent.classList.add('qmf-sidebar__item--expanded');
                    parent = parent.parentElement?.closest('.qmf-sidebar__item');
                }
            }
        });
    }
    
    /**
     * Toggle sidebar collapsed state
     */
    toggle() {
        if (viewport.isMobile()) {
            this.isOpen ? this.close() : this.open();
        } else {
            this.isCollapsed = !this.isCollapsed;
            this.element.classList.toggle('qmf-sidebar--collapsed', this.isCollapsed);
            localStorage.setItem('qmf_sidebar_collapsed', this.isCollapsed);
            
            eventBus.emit('sidebar:collapse-toggle', { collapsed: this.isCollapsed });
        }
    }
    
    /**
     * Open sidebar (mobile)
     */
    open() {
        this.isOpen = true;
        this.element.classList.add('qmf-sidebar--open');
        document.body.classList.add('qmf-sidebar-open');
        
        eventBus.emit('sidebar:open');
    }
    
    /**
     * Close sidebar (mobile)
     */
    close() {
        this.isOpen = false;
        this.element.classList.remove('qmf-sidebar--open');
        document.body.classList.remove('qmf-sidebar-open');
        
        eventBus.emit('sidebar:close');
    }
    
    /**
     * Set menu items
     */
    setItems(items) {
        this.config.items = items;
        const nav = this.element.querySelector('.qmf-sidebar__nav');
        if (nav) {
            nav.innerHTML = this._renderMenuItems(items);
            this._bindEvents();
        }
    }
    
    /**
     * Add menu item
     */
    addItem(item, parentId = null) {
        if (parentId) {
            const parent = this._findItem(this.config.items, parentId);
            if (parent) {
                parent.children = parent.children || [];
                parent.children.push(item);
            }
        } else {
            this.config.items.push(item);
        }
        
        this.setItems(this.config.items);
    }
    
    /**
     * Remove menu item
     */
    removeItem(itemId) {
        this.config.items = this._removeItemRecursive(this.config.items, itemId);
        this.setItems(this.config.items);
    }
    
    /**
     * Find item by ID
     */
    _findItem(items, id) {
        for (const item of items) {
            if (item.id === id) return item;
            if (item.children) {
                const found = this._findItem(item.children, id);
                if (found) return found;
            }
        }
        return null;
    }
    
    /**
     * Remove item recursively
     */
    _removeItemRecursive(items, id) {
        return items.filter(item => {
            if (item.id === id) return false;
            if (item.children) {
                item.children = this._removeItemRecursive(item.children, id);
            }
            return true;
        });
    }
    
    /**
     * Set badge on item
     */
    setBadge(itemId, badge, type = 'default') {
        const item = this._findItem(this.config.items, itemId);
        if (item) {
            item.badge = badge;
            item.badgeType = type;
            
            const el = this.element.querySelector(`[data-id="${itemId}"] .qmf-sidebar__badge`);
            if (el) {
                el.textContent = badge;
                el.className = `qmf-sidebar__badge qmf-sidebar__badge--${type}`;
            } else {
                this.setItems(this.config.items);
            }
        }
    }
    
    /**
     * Mount sidebar
     */
    mount(target) {
        const container = typeof target === 'string' 
            ? document.querySelector(target) 
            : target;
            
        if (container && this.element) {
            container.appendChild(this.element);
            eventBus.emit('sidebar:mounted');
        }
        
        return this;
    }
    
    /**
     * Unmount sidebar
     */
    unmount() {
        if (this.element?.parentNode) {
            this.element.parentNode.removeChild(this.element);
            eventBus.emit('sidebar:unmounted');
        }
    }
    
    /**
     * Inject styles
     */
    _injectStyles() {
        if (document.getElementById('qmf-sidebar-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'qmf-sidebar-styles';
        style.textContent = `
            .qmf-sidebar {
                display: flex;
                flex-direction: column;
                width: var(--qmf-sidebar-width);
                height: 100%;
                background: var(--qmf-color-surface);
                border-right: 1px solid var(--qmf-color-border);
                transition: width var(--qmf-duration-normal) var(--qmf-easing-default),
                            transform var(--qmf-duration-normal) var(--qmf-easing-default);
                z-index: var(--qmf-z-fixed);
                overflow: hidden;
            }
            
            .qmf-sidebar[data-position="right"] {
                border-right: none;
                border-left: 1px solid var(--qmf-color-border);
            }
            
            .qmf-sidebar--collapsed {
                width: var(--qmf-sidebar-collapsed-width);
            }
            
            .qmf-sidebar--collapsed .qmf-sidebar__label,
            .qmf-sidebar--collapsed .qmf-sidebar__badge,
            .qmf-sidebar--collapsed .qmf-sidebar__arrow,
            .qmf-sidebar--collapsed .qmf-sidebar__heading,
            .qmf-sidebar--collapsed .qmf-sidebar__submenu {
                display: none;
            }
            
            .qmf-sidebar--collapsed .qmf-sidebar__toggle svg {
                transform: rotate(180deg);
            }
            
            .qmf-sidebar__header {
                padding: var(--qmf-space-4);
                border-bottom: 1px solid var(--qmf-color-border);
            }
            
            .qmf-sidebar__nav {
                flex: 1;
                overflow-y: auto;
                overflow-x: hidden;
                padding: var(--qmf-space-2);
            }
            
            .qmf-sidebar__menu {
                list-style: none;
                margin: 0;
                padding: 0;
            }
            
            .qmf-sidebar__heading {
                padding: var(--qmf-space-3) var(--qmf-space-3) var(--qmf-space-2);
                font-size: var(--qmf-font-size-xs);
                font-weight: var(--qmf-font-weight-semibold);
                color: var(--qmf-color-text-tertiary);
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            
            .qmf-sidebar__divider {
                height: 1px;
                margin: var(--qmf-space-2) var(--qmf-space-3);
                background: var(--qmf-color-border);
            }
            
            .qmf-sidebar__item {
                margin-bottom: 2px;
            }
            
            .qmf-sidebar__link {
                display: flex;
                align-items: center;
                gap: var(--qmf-space-3);
                padding: var(--qmf-space-2) var(--qmf-space-3);
                color: var(--qmf-color-text-secondary);
                text-decoration: none;
                font-size: var(--qmf-font-size-sm);
                border-radius: var(--qmf-radius);
                transition: var(--qmf-transition-fast);
            }
            
            .qmf-sidebar__link:hover {
                color: var(--qmf-color-text);
                background: var(--qmf-color-bg-secondary);
            }
            
            .qmf-sidebar__item--active > .qmf-sidebar__link {
                color: var(--qmf-color-primary);
                background: var(--qmf-color-primary-50);
                font-weight: var(--qmf-font-weight-medium);
            }
            
            .qmf-sidebar__icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                flex-shrink: 0;
            }
            
            .qmf-sidebar__icon svg {
                width: 100%;
                height: 100%;
            }
            
            .qmf-sidebar__label {
                flex: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .qmf-sidebar__badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 20px;
                height: 20px;
                padding: 0 var(--qmf-space-1);
                font-size: 11px;
                font-weight: var(--qmf-font-weight-medium);
                border-radius: var(--qmf-radius-full);
                background: var(--qmf-color-gray-200);
                color: var(--qmf-color-text-secondary);
            }
            
            .qmf-sidebar__badge--primary {
                background: var(--qmf-color-primary);
                color: white;
            }
            
            .qmf-sidebar__badge--success {
                background: var(--qmf-color-success);
                color: white;
            }
            
            .qmf-sidebar__badge--warning {
                background: var(--qmf-color-warning);
                color: white;
            }
            
            .qmf-sidebar__badge--danger {
                background: var(--qmf-color-danger);
                color: white;
            }
            
            .qmf-sidebar__arrow {
                width: 16px;
                height: 16px;
                color: var(--qmf-color-text-tertiary);
                transition: transform var(--qmf-duration-fast) var(--qmf-easing-default);
            }
            
            .qmf-sidebar__item--expanded > .qmf-sidebar__link .qmf-sidebar__arrow {
                transform: rotate(90deg);
            }
            
            .qmf-sidebar__submenu {
                max-height: 0;
                overflow: hidden;
                transition: max-height var(--qmf-duration-normal) var(--qmf-easing-default);
            }
            
            .qmf-sidebar__item--expanded > .qmf-sidebar__submenu {
                max-height: 500px;
            }
            
            .qmf-sidebar__submenu .qmf-sidebar__menu {
                padding-left: var(--qmf-space-6);
            }
            
            .qmf-sidebar__footer {
                padding: var(--qmf-space-4);
                border-top: 1px solid var(--qmf-color-border);
            }
            
            .qmf-sidebar__toggle {
                position: absolute;
                bottom: var(--qmf-space-4);
                right: var(--qmf-space-2);
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                background: var(--qmf-color-bg-secondary);
                border: 1px solid var(--qmf-color-border);
                border-radius: var(--qmf-radius-full);
                cursor: pointer;
                color: var(--qmf-color-text-tertiary);
                transition: var(--qmf-transition-fast);
            }
            
            .qmf-sidebar__toggle:hover {
                color: var(--qmf-color-text);
                background: var(--qmf-color-bg-tertiary);
            }
            
            .qmf-sidebar__toggle svg {
                width: 16px;
                height: 16px;
                transition: transform var(--qmf-duration-fast) var(--qmf-easing-default);
            }
            
            /* Overlay mode for mobile */
            .qmf-sidebar--overlay {
                position: fixed;
                top: 0;
                left: 0;
                height: 100vh;
                transform: translateX(-100%);
                box-shadow: var(--qmf-shadow-xl);
            }
            
            .qmf-sidebar--overlay[data-position="right"] {
                left: auto;
                right: 0;
                transform: translateX(100%);
            }
            
            .qmf-sidebar--overlay.qmf-sidebar--open {
                transform: translateX(0);
            }
            
            /* Backdrop */
            body.qmf-sidebar-open::before {
                content: '';
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: calc(var(--qmf-z-fixed) - 1);
            }
            
            @media (max-width: 768px) {
                .qmf-sidebar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    height: 100vh;
                    transform: translateX(-100%);
                    box-shadow: var(--qmf-shadow-xl);
                }
                
                .qmf-sidebar--open {
                    transform: translateX(0);
                }
                
                .qmf-sidebar__toggle {
                    display: none;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

export const sidebarPlugin = new SidebarPlugin();
export default sidebarPlugin;
