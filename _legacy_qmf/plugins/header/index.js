/**
 * QMF Header Plugin
 * Shared header component with dual-logo support
 * @version 1.0.0
 */

import { eventBus } from '../kernel/event-bus.js';
import { context } from '../kernel/context.js';
import { viewport } from '../platform/viewport.js';

/**
 * @typedef {Object} HeaderConfig
 * @property {string} mainLogo - Main QMF logo URL
 * @property {string} subLogo - Subdomain-specific logo URL
 * @property {string} title - Header title
 * @property {boolean} showSearch - Show search bar
 * @property {boolean} showNotifications - Show notification bell
 * @property {boolean} showUserMenu - Show user dropdown
 * @property {Array} navItems - Navigation items
 * @property {Object} theme - Theme configuration
 */

class HeaderPlugin {
    constructor() {
        this.element = null;
        this.config = {};
        this.isCollapsed = false;
        this.mobileMenuOpen = false;
        
        this._defaults = {
            mainLogo: '/assets/logo.svg',
            subLogo: null,
            title: 'Quizzman',
            showSearch: true,
            showNotifications: true,
            showUserMenu: true,
            sticky: true,
            navItems: [],
            userMenuItems: [
                { id: 'profile', label: 'Profile', icon: 'user' },
                { id: 'settings', label: 'Settings', icon: 'cog' },
                { divider: true },
                { id: 'logout', label: 'Logout', icon: 'logout', danger: true }
            ],
            theme: {
                background: 'var(--qmf-color-surface)',
                border: true,
                blur: false
            }
        };
    }
    
    /**
     * Initialize header plugin
     * @param {HeaderConfig} config 
     */
    init(config = {}) {
        this.config = { ...this._defaults, ...config };
        this._createHeader();
        this._bindEvents();
        this._watchViewport();
        
        eventBus.emit('header:initialized', { config: this.config });
        
        return this;
    }
    
    /**
     * Create header DOM structure
     */
    _createHeader() {
        this.element = document.createElement('header');
        this.element.id = 'qmf-header';
        this.element.className = 'qmf-header';
        
        if (this.config.sticky) {
            this.element.classList.add('qmf-header--sticky');
        }
        
        if (this.config.theme.blur) {
            this.element.classList.add('qmf-header--blur');
        }
        
        this.element.innerHTML = this._renderContent();
        this._injectStyles();
    }
    
    /**
     * Render header HTML content
     */
    _renderContent() {
        const user = context.get('user');
        
        return `
            <div class="qmf-header__container">
                <!-- Left: Logo & Title -->
                <div class="qmf-header__left">
                    <button class="qmf-header__menu-toggle" aria-label="Toggle menu">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 12h18M3 6h18M3 18h18"/>
                        </svg>
                    </button>
                    
                    <a href="/" class="qmf-header__brand">
                        <img src="${this.config.mainLogo}" alt="Logo" class="qmf-header__logo qmf-header__logo--main">
                        ${this.config.subLogo ? `
                            <span class="qmf-header__logo-divider"></span>
                            <img src="${this.config.subLogo}" alt="Sub Logo" class="qmf-header__logo qmf-header__logo--sub">
                        ` : ''}
                        <span class="qmf-header__title">${this.config.title}</span>
                    </a>
                </div>
                
                <!-- Center: Navigation -->
                <nav class="qmf-header__nav">
                    ${this._renderNavItems()}
                </nav>
                
                <!-- Right: Actions -->
                <div class="qmf-header__right">
                    ${this.config.showSearch ? this._renderSearch() : ''}
                    ${this.config.showNotifications ? this._renderNotifications() : ''}
                    ${this.config.showUserMenu && user ? this._renderUserMenu(user) : ''}
                    ${!user ? this._renderAuthButtons() : ''}
                </div>
            </div>
            
            <!-- Mobile Navigation -->
            <div class="qmf-header__mobile-nav">
                ${this._renderNavItems()}
            </div>
        `;
    }
    
    /**
     * Render navigation items
     */
    _renderNavItems() {
        return this.config.navItems.map(item => `
            <a href="${item.href || '#'}" 
               class="qmf-header__nav-item ${item.active ? 'qmf-header__nav-item--active' : ''}"
               ${item.external ? 'target="_blank" rel="noopener"' : ''}>
                ${item.icon ? `<span class="qmf-header__nav-icon">${item.icon}</span>` : ''}
                <span>${item.label}</span>
                ${item.badge ? `<span class="qmf-header__badge">${item.badge}</span>` : ''}
            </a>
        `).join('');
    }
    
    /**
     * Render search box
     */
    _renderSearch() {
        return `
            <div class="qmf-header__search">
                <button class="qmf-header__search-toggle" aria-label="Search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                </button>
                <div class="qmf-header__search-box">
                    <input type="search" placeholder="Search... (⌘K)" class="qmf-header__search-input">
                    <kbd class="qmf-header__search-kbd">⌘K</kbd>
                </div>
            </div>
        `;
    }
    
    /**
     * Render notifications bell
     */
    _renderNotifications() {
        const count = context.get('notifications.unreadCount') || 0;
        
        return `
            <button class="qmf-header__action qmf-header__notifications" aria-label="Notifications">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                ${count > 0 ? `<span class="qmf-header__notification-count">${count > 99 ? '99+' : count}</span>` : ''}
            </button>
        `;
    }
    
    /**
     * Render user menu
     */
    _renderUserMenu(user) {
        return `
            <div class="qmf-header__user">
                <button class="qmf-header__user-toggle" aria-label="User menu">
                    <img src="${user.avatar || '/assets/default-avatar.png'}" 
                         alt="${user.name}" 
                         class="qmf-header__avatar">
                    <span class="qmf-header__user-name">${user.name}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="qmf-header__chevron">
                        <path d="m6 9 6 6 6-6"/>
                    </svg>
                </button>
                <div class="qmf-header__user-dropdown">
                    <div class="qmf-header__user-info">
                        <img src="${user.avatar || '/assets/default-avatar.png'}" alt="${user.name}" class="qmf-header__dropdown-avatar">
                        <div>
                            <div class="qmf-header__dropdown-name">${user.name}</div>
                            <div class="qmf-header__dropdown-email">${user.email || ''}</div>
                        </div>
                    </div>
                    <div class="qmf-header__dropdown-divider"></div>
                    ${this._renderUserMenuItems()}
                </div>
            </div>
        `;
    }
    
    /**
     * Render user menu items
     */
    _renderUserMenuItems() {
        return this.config.userMenuItems.map(item => {
            if (item.divider) {
                return '<div class="qmf-header__dropdown-divider"></div>';
            }
            return `
                <button class="qmf-header__dropdown-item ${item.danger ? 'qmf-header__dropdown-item--danger' : ''}"
                        data-action="${item.id}">
                    <span class="qmf-header__dropdown-icon">${this._getIcon(item.icon)}</span>
                    <span>${item.label}</span>
                </button>
            `;
        }).join('');
    }
    
    /**
     * Render auth buttons for logged out state
     */
    _renderAuthButtons() {
        return `
            <div class="qmf-header__auth">
                <a href="/login" class="qmf-header__auth-link">Login</a>
                <a href="/register" class="qmf-header__auth-button">Sign Up</a>
            </div>
        `;
    }
    
    /**
     * Get icon SVG
     */
    _getIcon(name) {
        const icons = {
            user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
            cog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
            logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'
        };
        return icons[name] || '';
    }
    
    /**
     * Bind event listeners
     */
    _bindEvents() {
        // Menu toggle
        const menuToggle = this.element.querySelector('.qmf-header__menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        // User dropdown
        const userToggle = this.element.querySelector('.qmf-header__user-toggle');
        if (userToggle) {
            userToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this._toggleUserDropdown();
            });
        }
        
        // User menu actions
        this.element.querySelectorAll('.qmf-header__dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                eventBus.emit('header:user-action', { action });
                this._closeUserDropdown();
            });
        });
        
        // Search toggle
        const searchToggle = this.element.querySelector('.qmf-header__search-toggle');
        if (searchToggle) {
            searchToggle.addEventListener('click', () => this._openSearch());
        }
        
        // Notification click
        const notifBtn = this.element.querySelector('.qmf-header__notifications');
        if (notifBtn) {
            notifBtn.addEventListener('click', () => {
                eventBus.emit('header:notifications-click');
            });
        }
        
        // Mobile nav toggle
        this.element.querySelector('.qmf-header__menu-toggle')?.addEventListener('click', () => {
            this._toggleMobileNav();
        });
        
        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target)) {
                this._closeUserDropdown();
            }
        });
        
        // Keyboard shortcut for search
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this._openSearch();
            }
        });
        
        // Listen for context changes
        context.watch('user', () => this.refresh());
        context.watch('notifications.unreadCount', () => this._updateNotificationCount());
    }
    
    /**
     * Watch viewport changes
     */
    _watchViewport() {
        viewport.on('change', ({ breakpoint }) => {
            this.element.dataset.viewport = breakpoint;
            if (breakpoint !== 'xs' && breakpoint !== 'sm') {
                this._closeMobileNav();
            }
        });
    }
    
    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        eventBus.emit('sidebar:toggle');
    }
    
    /**
     * Toggle user dropdown
     */
    _toggleUserDropdown() {
        const dropdown = this.element.querySelector('.qmf-header__user-dropdown');
        const isOpen = dropdown?.classList.contains('qmf-header__user-dropdown--open');
        
        if (isOpen) {
            this._closeUserDropdown();
        } else {
            dropdown?.classList.add('qmf-header__user-dropdown--open');
        }
    }
    
    /**
     * Close user dropdown
     */
    _closeUserDropdown() {
        const dropdown = this.element.querySelector('.qmf-header__user-dropdown');
        dropdown?.classList.remove('qmf-header__user-dropdown--open');
    }
    
    /**
     * Toggle mobile navigation
     */
    _toggleMobileNav() {
        this.mobileMenuOpen = !this.mobileMenuOpen;
        this.element.classList.toggle('qmf-header--mobile-open', this.mobileMenuOpen);
        eventBus.emit('header:mobile-nav-toggle', { open: this.mobileMenuOpen });
    }
    
    /**
     * Close mobile navigation
     */
    _closeMobileNav() {
        this.mobileMenuOpen = false;
        this.element.classList.remove('qmf-header--mobile-open');
    }
    
    /**
     * Open search
     */
    _openSearch() {
        eventBus.emit('command-palette:open', { mode: 'search' });
    }
    
    /**
     * Update notification count
     */
    _updateNotificationCount() {
        const count = context.get('notifications.unreadCount') || 0;
        const badge = this.element.querySelector('.qmf-header__notification-count');
        
        if (count > 0) {
            if (badge) {
                badge.textContent = count > 99 ? '99+' : count;
            } else {
                const btn = this.element.querySelector('.qmf-header__notifications');
                if (btn) {
                    const span = document.createElement('span');
                    span.className = 'qmf-header__notification-count';
                    span.textContent = count > 99 ? '99+' : count;
                    btn.appendChild(span);
                }
            }
        } else if (badge) {
            badge.remove();
        }
    }
    
    /**
     * Update configuration
     */
    configure(config) {
        this.config = { ...this.config, ...config };
        this.refresh();
    }
    
    /**
     * Set navigation items
     */
    setNavItems(items) {
        this.config.navItems = items;
        const nav = this.element.querySelector('.qmf-header__nav');
        const mobileNav = this.element.querySelector('.qmf-header__mobile-nav');
        
        if (nav) nav.innerHTML = this._renderNavItems();
        if (mobileNav) mobileNav.innerHTML = this._renderNavItems();
    }
    
    /**
     * Set active nav item
     */
    setActiveNavItem(id) {
        this.element.querySelectorAll('.qmf-header__nav-item').forEach(item => {
            item.classList.toggle('qmf-header__nav-item--active', item.dataset.id === id);
        });
    }
    
    /**
     * Refresh header content
     */
    refresh() {
        if (this.element) {
            const container = this.element.querySelector('.qmf-header__container');
            if (container) {
                this.element.innerHTML = this._renderContent();
                this._bindEvents();
            }
        }
    }
    
    /**
     * Mount header to DOM
     */
    mount(target) {
        const container = typeof target === 'string' 
            ? document.querySelector(target) 
            : target;
            
        if (container && this.element) {
            container.appendChild(this.element);
            eventBus.emit('header:mounted');
        }
        
        return this;
    }
    
    /**
     * Unmount header
     */
    unmount() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
            eventBus.emit('header:unmounted');
        }
    }
    
    /**
     * Inject header styles
     */
    _injectStyles() {
        if (document.getElementById('qmf-header-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'qmf-header-styles';
        style.textContent = `
            .qmf-header {
                display: flex;
                flex-direction: column;
                width: 100%;
                height: var(--qmf-header-height);
                background: var(--qmf-color-surface);
                border-bottom: 1px solid var(--qmf-color-border);
                z-index: var(--qmf-z-fixed);
            }
            
            .qmf-header--sticky {
                position: sticky;
                top: 0;
            }
            
            .qmf-header--blur {
                backdrop-filter: blur(8px);
                background: rgba(255, 255, 255, 0.8);
            }
            
            [data-theme="dark"] .qmf-header--blur {
                background: rgba(24, 24, 27, 0.8);
            }
            
            .qmf-header__container {
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 100%;
                padding: 0 var(--qmf-space-4);
                gap: var(--qmf-space-4);
            }
            
            .qmf-header__left {
                display: flex;
                align-items: center;
                gap: var(--qmf-space-3);
            }
            
            .qmf-header__menu-toggle {
                display: none;
                padding: var(--qmf-space-2);
                background: none;
                border: none;
                cursor: pointer;
                color: var(--qmf-color-text);
                border-radius: var(--qmf-radius);
                transition: var(--qmf-transition-fast);
            }
            
            .qmf-header__menu-toggle:hover {
                background: var(--qmf-color-bg-secondary);
            }
            
            .qmf-header__menu-toggle svg {
                width: 24px;
                height: 24px;
            }
            
            .qmf-header__brand {
                display: flex;
                align-items: center;
                gap: var(--qmf-space-3);
                text-decoration: none;
                color: var(--qmf-color-text);
            }
            
            .qmf-header__logo {
                height: 32px;
                width: auto;
            }
            
            .qmf-header__logo-divider {
                width: 1px;
                height: 24px;
                background: var(--qmf-color-border);
            }
            
            .qmf-header__title {
                font-size: var(--qmf-font-size-lg);
                font-weight: var(--qmf-font-weight-semibold);
            }
            
            .qmf-header__nav {
                display: flex;
                align-items: center;
                gap: var(--qmf-space-1);
            }
            
            .qmf-header__nav-item {
                display: flex;
                align-items: center;
                gap: var(--qmf-space-2);
                padding: var(--qmf-space-2) var(--qmf-space-3);
                color: var(--qmf-color-text-secondary);
                text-decoration: none;
                font-size: var(--qmf-font-size-sm);
                font-weight: var(--qmf-font-weight-medium);
                border-radius: var(--qmf-radius);
                transition: var(--qmf-transition-fast);
            }
            
            .qmf-header__nav-item:hover {
                color: var(--qmf-color-text);
                background: var(--qmf-color-bg-secondary);
            }
            
            .qmf-header__nav-item--active {
                color: var(--qmf-color-primary);
                background: var(--qmf-color-primary-50);
            }
            
            .qmf-header__badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 18px;
                height: 18px;
                padding: 0 var(--qmf-space-1);
                background: var(--qmf-color-danger);
                color: white;
                font-size: 11px;
                font-weight: var(--qmf-font-weight-medium);
                border-radius: var(--qmf-radius-full);
            }
            
            .qmf-header__right {
                display: flex;
                align-items: center;
                gap: var(--qmf-space-2);
            }
            
            .qmf-header__action {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                background: none;
                border: none;
                cursor: pointer;
                color: var(--qmf-color-text-secondary);
                border-radius: var(--qmf-radius);
                transition: var(--qmf-transition-fast);
                position: relative;
            }
            
            .qmf-header__action:hover {
                color: var(--qmf-color-text);
                background: var(--qmf-color-bg-secondary);
            }
            
            .qmf-header__action svg {
                width: 20px;
                height: 20px;
            }
            
            .qmf-header__notification-count {
                position: absolute;
                top: 4px;
                right: 4px;
                min-width: 16px;
                height: 16px;
                padding: 0 4px;
                background: var(--qmf-color-danger);
                color: white;
                font-size: 10px;
                font-weight: var(--qmf-font-weight-bold);
                border-radius: var(--qmf-radius-full);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .qmf-header__search {
                position: relative;
            }
            
            .qmf-header__search-toggle {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                background: none;
                border: none;
                cursor: pointer;
                color: var(--qmf-color-text-secondary);
                border-radius: var(--qmf-radius);
                transition: var(--qmf-transition-fast);
            }
            
            .qmf-header__search-toggle:hover {
                color: var(--qmf-color-text);
                background: var(--qmf-color-bg-secondary);
            }
            
            .qmf-header__search-toggle svg {
                width: 20px;
                height: 20px;
            }
            
            .qmf-header__search-box {
                display: none;
            }
            
            .qmf-header__user {
                position: relative;
            }
            
            .qmf-header__user-toggle {
                display: flex;
                align-items: center;
                gap: var(--qmf-space-2);
                padding: var(--qmf-space-1) var(--qmf-space-2);
                background: none;
                border: none;
                cursor: pointer;
                border-radius: var(--qmf-radius);
                transition: var(--qmf-transition-fast);
            }
            
            .qmf-header__user-toggle:hover {
                background: var(--qmf-color-bg-secondary);
            }
            
            .qmf-header__avatar {
                width: 32px;
                height: 32px;
                border-radius: var(--qmf-radius-full);
                object-fit: cover;
            }
            
            .qmf-header__user-name {
                font-size: var(--qmf-font-size-sm);
                font-weight: var(--qmf-font-weight-medium);
                color: var(--qmf-color-text);
            }
            
            .qmf-header__chevron {
                width: 16px;
                height: 16px;
                color: var(--qmf-color-text-tertiary);
                transition: var(--qmf-transition-fast);
            }
            
            .qmf-header__user-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                margin-top: var(--qmf-space-2);
                min-width: 220px;
                background: var(--qmf-color-surface);
                border: 1px solid var(--qmf-color-border);
                border-radius: var(--qmf-radius-lg);
                box-shadow: var(--qmf-shadow-lg);
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: var(--qmf-transition-fast);
                z-index: var(--qmf-z-dropdown);
            }
            
            .qmf-header__user-dropdown--open {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            
            .qmf-header__user-info {
                display: flex;
                align-items: center;
                gap: var(--qmf-space-3);
                padding: var(--qmf-space-3);
            }
            
            .qmf-header__dropdown-avatar {
                width: 40px;
                height: 40px;
                border-radius: var(--qmf-radius-full);
                object-fit: cover;
            }
            
            .qmf-header__dropdown-name {
                font-weight: var(--qmf-font-weight-medium);
                color: var(--qmf-color-text);
            }
            
            .qmf-header__dropdown-email {
                font-size: var(--qmf-font-size-sm);
                color: var(--qmf-color-text-secondary);
            }
            
            .qmf-header__dropdown-divider {
                height: 1px;
                background: var(--qmf-color-border);
                margin: var(--qmf-space-1) 0;
            }
            
            .qmf-header__dropdown-item {
                display: flex;
                align-items: center;
                gap: var(--qmf-space-3);
                width: 100%;
                padding: var(--qmf-space-2) var(--qmf-space-3);
                background: none;
                border: none;
                cursor: pointer;
                font-size: var(--qmf-font-size-sm);
                color: var(--qmf-color-text);
                text-align: left;
                transition: var(--qmf-transition-fast);
            }
            
            .qmf-header__dropdown-item:hover {
                background: var(--qmf-color-bg-secondary);
            }
            
            .qmf-header__dropdown-item--danger {
                color: var(--qmf-color-danger);
            }
            
            .qmf-header__dropdown-icon {
                width: 16px;
                height: 16px;
            }
            
            .qmf-header__dropdown-icon svg {
                width: 100%;
                height: 100%;
            }
            
            .qmf-header__auth {
                display: flex;
                align-items: center;
                gap: var(--qmf-space-3);
            }
            
            .qmf-header__auth-link {
                font-size: var(--qmf-font-size-sm);
                font-weight: var(--qmf-font-weight-medium);
                color: var(--qmf-color-text);
                text-decoration: none;
            }
            
            .qmf-header__auth-button {
                padding: var(--qmf-space-2) var(--qmf-space-4);
                background: var(--qmf-color-primary);
                color: white;
                font-size: var(--qmf-font-size-sm);
                font-weight: var(--qmf-font-weight-medium);
                text-decoration: none;
                border-radius: var(--qmf-radius);
                transition: var(--qmf-transition-fast);
            }
            
            .qmf-header__auth-button:hover {
                background: var(--qmf-color-primary-hover);
                text-decoration: none;
            }
            
            .qmf-header__mobile-nav {
                display: none;
                flex-direction: column;
                padding: var(--qmf-space-3);
                background: var(--qmf-color-surface);
                border-top: 1px solid var(--qmf-color-border);
            }
            
            @media (max-width: 768px) {
                .qmf-header {
                    height: auto;
                    min-height: var(--qmf-header-height);
                }
                
                .qmf-header__menu-toggle {
                    display: flex;
                }
                
                .qmf-header__nav {
                    display: none;
                }
                
                .qmf-header__title {
                    display: none;
                }
                
                .qmf-header__user-name {
                    display: none;
                }
                
                .qmf-header__search-box {
                    display: none !important;
                }
                
                .qmf-header--mobile-open .qmf-header__mobile-nav {
                    display: flex;
                }
                
                .qmf-header__mobile-nav .qmf-header__nav-item {
                    width: 100%;
                    padding: var(--qmf-space-3);
                }
            }
            
            @media (min-width: 1024px) {
                .qmf-header__search-toggle {
                    display: none;
                }
                
                .qmf-header__search-box {
                    display: flex;
                    align-items: center;
                    position: relative;
                }
                
                .qmf-header__search-input {
                    width: 240px;
                    padding: var(--qmf-space-2) var(--qmf-space-3);
                    padding-right: 48px;
                    background: var(--qmf-color-bg-secondary);
                    border: 1px solid var(--qmf-color-border);
                    border-radius: var(--qmf-radius);
                    font-size: var(--qmf-font-size-sm);
                    color: var(--qmf-color-text);
                    transition: var(--qmf-transition-fast);
                }
                
                .qmf-header__search-input:focus {
                    outline: none;
                    border-color: var(--qmf-color-primary);
                    box-shadow: var(--qmf-focus-ring);
                }
                
                .qmf-header__search-kbd {
                    position: absolute;
                    right: 8px;
                    padding: 2px 6px;
                    background: var(--qmf-color-bg-tertiary);
                    border: 1px solid var(--qmf-color-border);
                    border-radius: var(--qmf-radius-sm);
                    font-size: 11px;
                    color: var(--qmf-color-text-tertiary);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

export const headerPlugin = new HeaderPlugin();
export default headerPlugin;
