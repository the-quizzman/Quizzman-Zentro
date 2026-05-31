/**
 * QMF Header Plugin - Complete Redesign
 * Desktop: 4 clusters (SUB logo+title | Quizzman Logo | Social buttons | User dropdown)
 * Responsive: Merged branding + Touch-bar status + User dropdown
 * @version 2.0.0
 */

import { eventBus } from '../../kernel/event-bus.js';
import { context } from '../../kernel/context.js';
import { getIcon } from '../../assets/icons/icon-loader.js';
import { authService } from '../../services/auth/index.js';
import { chatService } from '../../services/chat/index.js';
import { notificationService } from '../../services/notification/index.js';

/**
 * Header States
 */
const HeaderState = {
    DESKTOP_LOGGED_IN: 'desktop-logged-in',
    DESKTOP_LOGGED_OUT: 'desktop-logged-out',
    MOBILE_LOGGED_IN: 'mobile-logged-in',
    MOBILE_LOGGED_OUT: 'mobile-logged-out'
};

/**
 * Header Plugin
 */
class QMFHeader {
    constructor() {
        this.element = null;
        this.config = null;
        this.state = null;
        this.statusMessages = [];
        this.statusIndex = 0;
        this.statusInterval = null;
    }
    
    /**
     * Initialize header
     * @param {Object} config
     */
    async init(config = {}) {
        this.config = {
            // Branding
            mainLogo: config.mainLogo || '/assets/logo/quizzman-logo.png',
            subLogo: config.subLogo || null,
            subTitle: config.subTitle || 'App',
            mainLogoLink: config.mainLogoLink || 'https://quizzman.com',
            subLogoLink: config.subLogoLink || '/',
            
            // Navigation items (desktop)
            navItems: config.navItems || [],
            
            // Features
            showSearch: config.showSearch !== false,
            showChat: config.showChat !== false,
            showNotifications: config.showNotifications !== false,
            
            // Login
            loginUrl: config.loginUrl || 'https://id.quizzman.com/login',
            loginText: config.loginText || 'Đăng nhập',
            
            // User menu items
            userMenuItems: config.userMenuItems || [
                { id: 'profile', label: 'Hồ sơ', icon: 'user', href: '/profile' },
                { id: 'settings', label: 'Cài đặt', icon: 'settings', href: '/settings' },
                { divider: true },
                { id: 'logout', label: 'Đăng xuất', icon: 'log-out', action: 'logout' }
            ],
            
            // Responsive breakpoint
            mobileBreakpoint: config.mobileBreakpoint || 768,
            
            // Container
            container: config.container || '#qmf-header'
        };
        
        // Create header element
        await this.render();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup responsive handler
        this.setupResponsive();
        
        // Start status bar updates (mobile)
        this.startStatusUpdates();
        
        eventBus.emit('header:initialized');
    }
    
    /**
     * Render header
     */
    async render() {
        const container = document.querySelector(this.config.container);
        if (!container) {
            console.error('[Header] Container not found:', this.config.container);
            return;
        }
        
        const isAuthenticated = authService.isAuthenticated();
        const user = authService.getUser();
        const isMobile = window.innerWidth < this.config.mobileBreakpoint;
        
        // Determine state
        if (isMobile) {
            this.state = isAuthenticated ? HeaderState.MOBILE_LOGGED_IN : HeaderState.MOBILE_LOGGED_OUT;
        } else {
            this.state = isAuthenticated ? HeaderState.DESKTOP_LOGGED_IN : HeaderState.DESKTOP_LOGGED_OUT;
        }
        
        // Preload icons
        const icons = await this.loadIcons();
        
        // Build header HTML
        const html = isMobile 
            ? this.renderMobile(isAuthenticated, user, icons)
            : this.renderDesktop(isAuthenticated, user, icons);
        
        container.innerHTML = html;
        this.element = container.firstElementChild;
        
        // Bind event handlers
        this.bindEvents();
    }
    
    /**
     * Load icons
     */
    async loadIcons() {
        const iconNames = [
            'message-circle', 'bell', 'search', 'menu', 'x',
            'chevron-down', 'user', 'settings', 'log-out'
        ];
        
        const icons = {};
        await Promise.all(iconNames.map(async name => {
            icons[name] = await getIcon(name, { size: 20 });
        }));
        
        return icons;
    }
    
    /**
     * Render desktop header
     */
    renderDesktop(isAuthenticated, user, icons) {
        const chatUnread = chatService.getTotalUnread();
        const notiUnread = notificationService.getUnreadCount();
        
        return `
            <header class="qmf-header qmf-header--desktop">
                <div class="qmf-header__inner">
                    <!-- Left: Site Logo + Title -->
                    <div class="qmf-header__cluster qmf-header__cluster--left">
                        <a href="${this.config.subLogoLink}" class="qmf-header__sub-link">
                            ${this.config.subLogo 
                                ? `<img src="${this.config.subLogo}" alt="${this.config.subTitle}" class="qmf-header__sub-logo">`
                                : `<div class="qmf-header__sub-icon">${this.config.subTitle.charAt(0)}</div>`
                            }
                            <span class="qmf-header__sub-title">${this.config.subTitle}</span>
                        </a>
                    </div>
                    
                    <!-- Center: Quizzman Logo + Name -->
                    <div class="qmf-header__cluster qmf-header__cluster--center">
                        <a href="${this.config.mainLogoLink}" class="qmf-header__main-link" title="Quizzman">
                            <img src="${this.config.mainLogo}" alt="Quizzman" class="qmf-header__main-logo">
                            <span class="qmf-header__main-name">Quizzman</span>
                        </a>
                    </div>
                    
                    <!-- Right: Social + User -->
                    <div class="qmf-header__cluster qmf-header__cluster--right">
                        ${isAuthenticated ? `
                            <!-- Social Buttons -->
                            <div class="qmf-header__social">
                                ${this.config.showChat ? `
                                    <button class="qmf-header__btn qmf-header__btn--chat" data-action="toggle-chat" aria-label="Chat">
                                        ${icons['message-circle']}
                                        ${chatUnread > 0 ? `<span class="qmf-header__badge">${chatUnread > 99 ? '99+' : chatUnread}</span>` : ''}
                                    </button>
                                ` : ''}
                                
                                ${this.config.showNotifications ? `
                                    <button class="qmf-header__btn qmf-header__btn--noti" data-action="toggle-noti" aria-label="Thông báo">
                                        ${icons['bell']}
                                        ${notiUnread > 0 ? `<span class="qmf-header__badge">${notiUnread > 99 ? '99+' : notiUnread}</span>` : ''}
                                    </button>
                                ` : ''}
                            </div>
                            
                            <!-- User Dropdown -->
                            <div class="qmf-header__user">
                                <button class="qmf-header__avatar-btn" data-action="toggle-user-menu" aria-label="Menu tài khoản">
                                    ${this.renderAvatar(user)}
                                </button>
                                <div class="qmf-header__user-menu hidden" id="qmf-user-menu">
                                    <div class="qmf-header__user-info">
                                        <div class="qmf-header__user-name">${user?.display_name || user?.name || 'User'}</div>
                                    <div class="qmf-header__user-email">${user?.email || ''}</div>
                                </div>
                                <div class="qmf-header__user-menu-items">
                                    ${this.renderUserMenuItems(icons)}
                                </div>
                            </div>
                        </div>
                    ` : `
                        <!-- Login CTA -->
                        <a href="${this.config.loginUrl}" class="qmf-header__login-btn">
                            ${this.config.loginText}
                        </a>
                    `}
                    </div>
                </div>
            </header>
        `;
    }
    
    /**
     * Render mobile header
     */
    renderMobile(isAuthenticated, user, icons) {
        return `
            <header class="qmf-header qmf-header--mobile">
                <!-- Cluster 1: Merged Logo + Subtitle -->
                <div class="qmf-header__cluster qmf-header__cluster--brand">
                    <a href="${this.config.mainLogoLink}" class="qmf-header__brand-link">
                        <img src="${this.config.mainLogo}" alt="Quizzman" class="qmf-header__brand-logo">
                        <span class="qmf-header__brand-divider">|</span>
                        <span class="qmf-header__brand-sub">${this.config.subTitle}</span>
                    </a>
                </div>
                
                <!-- Cluster 2: Touch-bar Status -->
                <div class="qmf-header__cluster qmf-header__cluster--status">
                    <div class="qmf-header__status-bar" data-action="toggle-status-panel">
                        <span class="qmf-header__status-text" id="qmf-status-text">
                            ${this.getCurrentStatusMessage()}
                        </span>
                    </div>
                </div>
                
                <!-- Cluster 3: User -->
                <div class="qmf-header__cluster qmf-header__cluster--user">
                    ${isAuthenticated ? `
                        <button class="qmf-header__avatar-btn" data-action="toggle-user-menu" aria-label="Menu">
                            ${this.renderAvatar(user, 32)}
                        </button>
                    ` : `
                        <a href="${this.config.loginUrl}" class="qmf-header__login-btn qmf-header__login-btn--compact">
                            ${icons['user']}
                        </a>
                    `}
                </div>
                
                <!-- Status Panel (hidden) -->
                <div class="qmf-header__status-panel hidden" id="qmf-status-panel">
                    <div class="qmf-header__status-panel-content">
                        ${this.renderStatusPanel(icons)}
                    </div>
                </div>
                
                <!-- Mobile User Menu -->
                ${isAuthenticated ? `
                    <div class="qmf-header__user-menu qmf-header__user-menu--mobile hidden" id="qmf-user-menu">
                        ${this.renderMobileUserMenu(user, icons)}
                    </div>
                ` : ''}
            </header>
        `;
    }
    
    /**
     * Render avatar
     */
    renderAvatar(user, size = 36) {
        const avatarUrl = user?.avatar || user?.avatar_url;
        const name = user?.display_name || user?.name || 'U';
        const initial = name.charAt(0).toUpperCase();
        
        if (avatarUrl) {
            return `<img src="${avatarUrl}" alt="${name}" class="qmf-header__avatar" style="width:${size}px;height:${size}px;">`;
        }
        
        return `<div class="qmf-header__avatar qmf-header__avatar--fallback" style="width:${size}px;height:${size}px;">${initial}</div>`;
    }
    
    /**
     * Render user menu items
     */
    renderUserMenuItems(icons) {
        return this.config.userMenuItems.map(item => {
            if (item.divider) {
                return '<div class="qmf-header__menu-divider"></div>';
            }
            
            const icon = icons[item.icon] || '';
            
            if (item.action) {
                return `
                    <button class="qmf-header__menu-item" data-action="${item.action}">
                        <span class="qmf-header__menu-icon">${icon}</span>
                        <span class="qmf-header__menu-label">${item.label}</span>
                    </button>
                `;
            }
            
            return `
                <a href="${item.href}" class="qmf-header__menu-item">
                    <span class="qmf-header__menu-icon">${icon}</span>
                    <span class="qmf-header__menu-label">${item.label}</span>
                </a>
            `;
        }).join('');
    }
    
    /**
     * Render mobile user menu
     */
    renderMobileUserMenu(user, icons) {
        return `
            <div class="qmf-header__mobile-menu-header">
                ${this.renderAvatar(user, 48)}
                <div class="qmf-header__mobile-menu-info">
                    <div class="qmf-header__user-name">${user?.display_name || user?.name || 'User'}</div>
                    <div class="qmf-header__user-email">${user?.email || ''}</div>
                </div>
                <button class="qmf-header__mobile-menu-close" data-action="close-user-menu">
                    ${icons['x']}
                </button>
            </div>
            
            <!-- Quick actions -->
            <div class="qmf-header__mobile-quick-actions">
                ${this.config.showChat ? `
                    <button class="qmf-header__quick-action" data-action="toggle-chat">
                        ${icons['message-circle']}
                        <span>Chat</span>
                        <span class="qmf-header__badge" id="qmf-chat-badge-mobile">${chatService.getTotalUnread() || ''}</span>
                    </button>
                ` : ''}
                ${this.config.showNotifications ? `
                    <button class="qmf-header__quick-action" data-action="toggle-noti">
                        ${icons['bell']}
                        <span>Thông báo</span>
                        <span class="qmf-header__badge" id="qmf-noti-badge-mobile">${notificationService.getUnreadCount() || ''}</span>
                    </button>
                ` : ''}
            </div>
            
            <!-- Menu items -->
            <div class="qmf-header__mobile-menu-items">
                ${this.renderUserMenuItems(icons)}
            </div>
        `;
    }
    
    /**
     * Render status panel for mobile
     */
    renderStatusPanel(icons) {
        const chatUnread = chatService.getTotalUnread();
        const notiUnread = notificationService.getUnreadCount();
        
        return `
            <div class="qmf-header__status-item" data-action="toggle-noti">
                ${icons['bell']}
                <span>${notiUnread > 0 ? `${notiUnread} thông báo mới` : 'Không có thông báo mới'}</span>
            </div>
            <div class="qmf-header__status-item" data-action="toggle-chat">
                ${icons['message-circle']}
                <span>${chatUnread > 0 ? `${chatUnread} tin nhắn chưa đọc` : 'Không có tin nhắn mới'}</span>
            </div>
        `;
    }
    
    /**
     * Get current status message
     */
    getCurrentStatusMessage() {
        const messages = [];
        
        const notiCount = notificationService.getUnreadCount();
        const chatCount = chatService.getTotalUnread();
        
        if (notiCount > 0) {
            messages.push(`${notiCount} thông báo mới`);
        }
        if (chatCount > 0) {
            messages.push(`${chatCount} tin nhắn`);
        }
        
        // Add custom status messages
        messages.push(...this.statusMessages);
        
        if (messages.length === 0) {
            return '✓ Tất cả đã cập nhật';
        }
        
        return messages[this.statusIndex % messages.length];
    }
    
    /**
     * Start status bar rotation (mobile)
     */
    startStatusUpdates() {
        this.stopStatusUpdates();
        
        this.statusInterval = setInterval(() => {
            this.statusIndex++;
            const statusText = document.getElementById('qmf-status-text');
            if (statusText) {
                statusText.textContent = this.getCurrentStatusMessage();
            }
        }, 5000);
    }
    
    stopStatusUpdates() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
    }
    
    /**
     * Add custom status message
     */
    addStatusMessage(message, duration = null) {
        this.statusMessages.push(message);
        
        if (duration) {
            setTimeout(() => {
                this.removeStatusMessage(message);
            }, duration);
        }
    }
    
    removeStatusMessage(message) {
        this.statusMessages = this.statusMessages.filter(m => m !== message);
    }
    
    /**
     * Bind event handlers
     */
    bindEvents() {
        if (!this.element) return;
        
        // Action buttons
        this.element.addEventListener('click', async (e) => {
            const actionEl = e.target.closest('[data-action]');
            if (!actionEl) return;
            
            const action = actionEl.dataset.action;
            
            switch (action) {
                case 'toggle-chat':
                    eventBus.emit('chat:toggle-panel');
                    break;
                    
                case 'toggle-noti':
                    eventBus.emit('noti:toggle-panel');
                    break;
                    
                case 'toggle-user-menu':
                    this.toggleUserMenu();
                    break;
                    
                case 'close-user-menu':
                    this.closeUserMenu();
                    break;
                    
                case 'toggle-status-panel':
                    this.toggleStatusPanel();
                    break;
                    
                case 'logout':
                    await authService.logout();
                    window.location.reload();
                    break;
            }
        });
        
        // Close menus on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.qmf-header__user')) {
                this.closeUserMenu();
            }
            if (!e.target.closest('.qmf-header__status-bar, .qmf-header__status-panel')) {
                this.closeStatusPanel();
            }
        });
    }
    
    toggleUserMenu() {
        const menu = document.getElementById('qmf-user-menu');
        if (menu) {
            menu.classList.toggle('hidden');
        }
    }
    
    closeUserMenu() {
        const menu = document.getElementById('qmf-user-menu');
        if (menu) {
            menu.classList.add('hidden');
        }
    }
    
    toggleStatusPanel() {
        const panel = document.getElementById('qmf-status-panel');
        if (panel) {
            panel.classList.toggle('hidden');
        }
    }
    
    closeStatusPanel() {
        const panel = document.getElementById('qmf-status-panel');
        if (panel) {
            panel.classList.add('hidden');
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Auth changes
        eventBus.on('auth:login', () => this.render());
        eventBus.on('auth:logout', () => this.render());
        
        // Unread updates
        eventBus.on('chat:unread-updated', ({ total }) => {
            this.updateBadge('.qmf-header__btn--chat', total);
            this.updateBadge('#qmf-chat-badge-mobile', total);
        });
        
        eventBus.on('noti:unread-changed', ({ count }) => {
            this.updateBadge('.qmf-header__btn--noti', count);
            this.updateBadge('#qmf-noti-badge-mobile', count);
        });
    }
    
    /**
     * Update badge count
     */
    updateBadge(selector, count) {
        const el = this.element?.querySelector(selector);
        if (!el) return;
        
        let badge = el.querySelector('.qmf-header__badge');
        
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'qmf-header__badge';
                el.appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : count;
        } else if (badge) {
            badge.remove();
        }
    }
    
    /**
     * Setup responsive handler
     */
    setupResponsive() {
        const mediaQuery = window.matchMedia(`(max-width: ${this.config.mobileBreakpoint - 1}px)`);
        
        const handleChange = (e) => {
            const newState = e.matches
                ? (authService.isAuthenticated() ? HeaderState.MOBILE_LOGGED_IN : HeaderState.MOBILE_LOGGED_OUT)
                : (authService.isAuthenticated() ? HeaderState.DESKTOP_LOGGED_IN : HeaderState.DESKTOP_LOGGED_OUT);
            
            if (newState !== this.state) {
                this.render();
            }
        };
        
        mediaQuery.addEventListener('change', handleChange);
    }
    
    /**
     * Destroy header
     */
    destroy() {
        this.stopStatusUpdates();
        
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
}

// Factory function
export function createHeader(config) {
    const header = new QMFHeader();
    header.init(config);
    return header;
}

export default QMFHeader;
