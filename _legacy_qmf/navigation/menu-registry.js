/**
 * QMF Menu Registry - Menu & navigation management
 * @version 1.0.0
 * @module navigation/menu-registry
 */

import eventBus from '../kernel/event-bus.js';
import context from '../kernel/context.js';
import router from './router.js';

class MenuRegistry {
    constructor() {
        this.menus = new Map();
        this.menuItems = new Map();
        this.activeItems = new Set();
    }

    /**
     * Đăng ký menu mới
     */
    registerMenu(id, config = {}) {
        const menu = {
            id,
            items: [],
            position: config.position || 'sidebar',
            priority: config.priority || 0,
            visible: config.visible !== false,
            collapsible: config.collapsible || false,
            icon: config.icon || null,
            label: config.label || id,
            permissions: config.permissions || [],
            meta: config.meta || {}
        };

        this.menus.set(id, menu);
        eventBus.emit('menu:registered', { id, menu });

        return this;
    }

    /**
     * Unregister menu
     */
    unregisterMenu(id) {
        const menu = this.menus.get(id);
        if (!menu) return;

        // Remove all items
        for (const item of menu.items) {
            this.menuItems.delete(item.id);
        }

        this.menus.delete(id);
        eventBus.emit('menu:unregistered', { id });
    }

    /**
     * Thêm item vào menu
     */
    addItem(menuId, item) {
        const menu = this.menus.get(menuId);
        if (!menu) {
            console.warn(`[MenuRegistry] Menu not found: ${menuId}`);
            return null;
        }

        const menuItem = {
            id: item.id || `${menuId}-${Date.now()}`,
            label: item.label,
            icon: item.icon || null,
            path: item.path || null,
            action: item.action || null,
            children: [],
            parent: item.parent || null,
            priority: item.priority || 0,
            visible: item.visible !== false,
            disabled: item.disabled || false,
            badge: item.badge || null,
            permissions: item.permissions || [],
            meta: item.meta || {},
            external: item.external || false,
            target: item.target || null
        };

        // Add to parent if specified
        if (menuItem.parent) {
            const parentItem = this.menuItems.get(menuItem.parent);
            if (parentItem) {
                parentItem.children.push(menuItem);
            }
        } else {
            menu.items.push(menuItem);
        }

        // Store reference
        this.menuItems.set(menuItem.id, menuItem);

        // Sort items by priority
        this._sortItems(menu.items);

        eventBus.emit('menu:itemAdded', { menuId, item: menuItem });

        return menuItem;
    }

    /**
     * Thêm nhiều items
     */
    addItems(menuId, items) {
        for (const item of items) {
            this.addItem(menuId, item);
        }
        return this;
    }

    /**
     * Remove item từ menu
     */
    removeItem(itemId) {
        const item = this.menuItems.get(itemId);
        if (!item) return;

        // Remove from parent or menu
        for (const [, menu] of this.menus) {
            const index = menu.items.findIndex(i => i.id === itemId);
            if (index > -1) {
                menu.items.splice(index, 1);
                break;
            }
        }

        // Remove children recursively
        for (const child of item.children) {
            this.removeItem(child.id);
        }

        this.menuItems.delete(itemId);
        this.activeItems.delete(itemId);

        eventBus.emit('menu:itemRemoved', { itemId });
    }

    /**
     * Update item
     */
    updateItem(itemId, updates) {
        const item = this.menuItems.get(itemId);
        if (!item) return null;

        Object.assign(item, updates);
        eventBus.emit('menu:itemUpdated', { itemId, updates });

        return item;
    }

    /**
     * Set item badge
     */
    setBadge(itemId, badge) {
        return this.updateItem(itemId, { badge });
    }

    /**
     * Clear item badge
     */
    clearBadge(itemId) {
        return this.updateItem(itemId, { badge: null });
    }

    /**
     * Set item visibility
     */
    setVisible(itemId, visible) {
        return this.updateItem(itemId, { visible });
    }

    /**
     * Set item disabled state
     */
    setDisabled(itemId, disabled) {
        return this.updateItem(itemId, { disabled });
    }

    /**
     * Get menu by ID
     */
    getMenu(id) {
        return this.menus.get(id);
    }

    /**
     * Get item by ID
     */
    getItem(id) {
        return this.menuItems.get(id);
    }

    /**
     * Get all menus for a position
     */
    getMenusByPosition(position) {
        const menus = [];
        for (const [, menu] of this.menus) {
            if (menu.position === position && menu.visible) {
                menus.push(menu);
            }
        }
        return menus.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Get visible items (filtered by permissions)
     */
    getVisibleItems(menuId) {
        const menu = this.menus.get(menuId);
        if (!menu) return [];

        const user = context.get('user');
        const userPermissions = user?.permissions || [];

        return this._filterItems(menu.items, userPermissions);
    }

    /**
     * Set active item(s)
     */
    setActive(itemIds) {
        const ids = Array.isArray(itemIds) ? itemIds : [itemIds];

        // Clear previous
        this.activeItems.clear();

        // Set new
        for (const id of ids) {
            this.activeItems.add(id);
            
            // Also activate parents
            const item = this.menuItems.get(id);
            if (item?.parent) {
                this._activateParents(item.parent);
            }
        }

        eventBus.emit('menu:activeChanged', { activeItems: Array.from(this.activeItems) });
    }

    /**
     * Check if item is active
     */
    isActive(itemId) {
        return this.activeItems.has(itemId);
    }

    /**
     * Get active items
     */
    getActiveItems() {
        return Array.from(this.activeItems);
    }

    /**
     * Auto-detect active item from current route
     */
    syncWithRouter() {
        const currentRoute = router.getCurrentRoute();
        if (!currentRoute) return;

        // Find matching menu item
        for (const [id, item] of this.menuItems) {
            if (item.path === currentRoute.path) {
                this.setActive(id);
                return;
            }
        }
    }

    /**
     * Render menu to HTML
     */
    render(menuId, options = {}) {
        const menu = this.menus.get(menuId);
        if (!menu) return '';

        const items = this.getVisibleItems(menuId);
        const { 
            itemClass = 'qmf-menu-item',
            activeClass = 'qmf-menu-item--active',
            hasChildrenClass = 'qmf-menu-item--has-children',
            iconClass = 'qmf-menu-icon',
            labelClass = 'qmf-menu-label',
            badgeClass = 'qmf-menu-badge'
        } = options;

        const renderItem = (item, depth = 0) => {
            const classes = [itemClass];
            if (this.isActive(item.id)) classes.push(activeClass);
            if (item.children.length > 0) classes.push(hasChildrenClass);
            if (item.disabled) classes.push('qmf-menu-item--disabled');

            const hasChildren = item.children.length > 0;
            const childItems = hasChildren 
                ? item.children.map(child => renderItem(child, depth + 1)).join('') 
                : '';

            return `
                <li class="${classes.join(' ')}" data-menu-item="${item.id}" data-depth="${depth}">
                    <a href="${item.path || '#'}" 
                       class="qmf-menu-link"
                       ${item.external ? 'target="_blank" rel="noopener"' : ''}
                       ${item.disabled ? 'aria-disabled="true"' : ''}>
                        ${item.icon ? `<span class="${iconClass}">${item.icon}</span>` : ''}
                        <span class="${labelClass}">${item.label}</span>
                        ${item.badge ? `<span class="${badgeClass}">${item.badge}</span>` : ''}
                        ${hasChildren ? '<span class="qmf-menu-arrow"></span>' : ''}
                    </a>
                    ${hasChildren ? `<ul class="qmf-menu-children">${childItems}</ul>` : ''}
                </li>
            `;
        };

        return `
            <ul class="qmf-menu" data-menu="${menuId}" role="menu">
                ${items.map(item => renderItem(item)).join('')}
            </ul>
        `;
    }

    /**
     * Setup menu event handlers
     */
    bindEvents(container) {
        container.addEventListener('click', (e) => {
            const link = e.target.closest('.qmf-menu-link');
            if (!link) return;

            const item = link.closest('[data-menu-item]');
            if (!item) return;

            const itemId = item.dataset.menuItem;
            const menuItem = this.menuItems.get(itemId);

            if (!menuItem) return;

            // Handle disabled
            if (menuItem.disabled) {
                e.preventDefault();
                return;
            }

            // Handle action
            if (menuItem.action) {
                e.preventDefault();
                menuItem.action(menuItem);
                return;
            }

            // Handle children toggle
            if (menuItem.children.length > 0 && !menuItem.path) {
                e.preventDefault();
                item.classList.toggle('qmf-menu-item--expanded');
                return;
            }

            // Let router handle navigation
            this.setActive(itemId);
        });
    }

    // ============================================
    // Private methods
    // ============================================

    _sortItems(items) {
        items.sort((a, b) => a.priority - b.priority);
        for (const item of items) {
            if (item.children.length > 0) {
                this._sortItems(item.children);
            }
        }
    }

    _filterItems(items, permissions) {
        return items.filter(item => {
            if (!item.visible) return false;

            // Check permissions
            if (item.permissions.length > 0) {
                const hasPermission = item.permissions.some(p => permissions.includes(p));
                if (!hasPermission) return false;
            }

            // Recursively filter children
            if (item.children.length > 0) {
                item.children = this._filterItems(item.children, permissions);
            }

            return true;
        });
    }

    _activateParents(parentId) {
        this.activeItems.add(parentId);
        const parent = this.menuItems.get(parentId);
        if (parent?.parent) {
            this._activateParents(parent.parent);
        }
    }
}

// Singleton export
const menuRegistry = new MenuRegistry();
export default menuRegistry;
export { MenuRegistry };
