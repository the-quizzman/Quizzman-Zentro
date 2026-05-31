/**
 * QMF Notification Panel Plugin
 * UI layer for notifications - subscribes to notificationService events
 * Features: Dropdown panel, categories, grouping, actions, badge
 * @version 2.0.0
 */

import { eventBus } from '../../kernel/event-bus.js';
import { getIcon } from '../../assets/icons/icon-loader.js';
import { notificationService, NotificationCategory, NotificationPriority } from '../../services/notification/index.js';

/**
 * Panel States
 */
const PanelState = {
    CLOSED: 'closed',
    OPEN: 'open'
};

/**
 * Category Icons & Colors
 */
const CATEGORY_META = {
    [NotificationCategory.SYSTEM]: { icon: 'settings', color: '#6b7280', label: 'Hệ thống' },
    [NotificationCategory.SOCIAL]: { icon: 'users', color: '#3b82f6', label: 'Xã hội' },
    [NotificationCategory.CLASSROOM]: { icon: 'book-open', color: '#22c55e', label: 'Lớp học' },
    [NotificationCategory.CONTENT]: { icon: 'file-text', color: '#f59e0b', label: 'Nội dung' },
    [NotificationCategory.ACCOUNT]: { icon: 'user', color: '#8b5cf6', label: 'Tài khoản' },
    [NotificationCategory.GAME]: { icon: 'gamepad-2', color: '#ec4899', label: 'Trò chơi' }
};

/**
 * Priority Styles
 */
const PRIORITY_STYLES = {
    [NotificationPriority.LOW]: { bg: 'transparent', text: 'inherit' },
    [NotificationPriority.NORMAL]: { bg: 'transparent', text: 'inherit' },
    [NotificationPriority.HIGH]: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
    [NotificationPriority.URGENT]: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' }
};

/**
 * Notification Panel Plugin
 */
class NotificationPanel {
    constructor() {
        this.element = null;
        this.state = PanelState.CLOSED;
        this.config = null;
        this.activeCategory = 'all';
    }
    
    /**
     * Initialize notification panel
     */
    async init(config = {}) {
        this.config = {
            container: config.container || document.body,
            width: config.width || 380,
            maxHeight: config.maxHeight || 520,
            position: config.position || 'bottom-right'
        };
        
        await this.createPanel();
        this.setupEventListeners();
        
        eventBus.emit('noti-panel:initialized');
    }
    
    /**
     * Create panel element
     */
    async createPanel() {
        const icons = await this.loadIcons();
        
        this.element = document.createElement('div');
        this.element.className = 'qmf-noti-panel';
        this.element.innerHTML = `
            <div class="qmf-noti-panel__header">
                <h3 class="qmf-noti-panel__title">
                    ${icons['bell']}
                    <span>Thông báo</span>
                </h3>
                <div class="qmf-noti-panel__header-actions">
                    <button class="qmf-noti-panel__btn" data-action="mark-all-read" title="Đánh dấu tất cả đã đọc">
                        ${icons['check-check']}
                    </button>
                    <button class="qmf-noti-panel__btn" data-action="settings" title="Cài đặt thông báo">
                        ${icons['settings']}
                    </button>
                    <button class="qmf-noti-panel__btn" data-action="close" title="Đóng">
                        ${icons['x']}
                    </button>
                </div>
            </div>
            
            <div class="qmf-noti-panel__filters">
                <button class="qmf-noti-panel__filter active" data-category="all">
                    Tất cả
                    <span class="qmf-noti-panel__filter-badge" id="filter-badge-all"></span>
                </button>
                ${Object.entries(CATEGORY_META).map(([key, meta]) => `
                    <button class="qmf-noti-panel__filter" data-category="${key}" title="${meta.label}">
                        ${icons[meta.icon] || icons['bell']}
                        <span class="qmf-noti-panel__filter-badge" id="filter-badge-${key}"></span>
                    </button>
                `).join('')}
            </div>
            
            <div class="qmf-noti-panel__content">
                <div class="qmf-noti-panel__list" id="notification-list">
                    <div class="qmf-noti-panel__empty">
                        ${icons['bell-off']}
                        <p>Không có thông báo nào</p>
                    </div>
                </div>
            </div>
            
            <div class="qmf-noti-panel__footer">
                <a href="/notifications" class="qmf-noti-panel__view-all">
                    Xem tất cả thông báo
                    ${icons['arrow-right']}
                </a>
            </div>
        `;
        
        this.config.container.appendChild(this.element);
    }
    
    /**
     * Load icons
     */
    async loadIcons() {
        const iconNames = [
            'bell', 'bell-off', 'x', 'check', 'check-check', 'settings',
            'arrow-right', 'trash-2', 'eye', 'external-link',
            'users', 'book-open', 'file-text', 'user', 'gamepad-2',
            'message-circle', 'heart', 'trophy', 'star', 'gift'
        ];
        
        const icons = {};
        await Promise.all(iconNames.map(async name => {
            icons[name] = await getIcon(name, { size: 18 });
        }));
        
        return icons;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle panel from header
        eventBus.on('noti:toggle-panel', () => this.toggle());
        
        // Notification service events
        eventBus.on('noti:list-updated', ({ notifications }) => this.renderNotifications(notifications));
        eventBus.on('noti:new', ({ notification }) => this.handleNewNotification(notification));
        eventBus.on('noti:count-updated', ({ count }) => this.updateBadges());
        
        // Panel interactions
        this.bindPanelEvents();
    }
    
    /**
     * Bind panel event handlers
     */
    bindPanelEvents() {
        if (!this.element) return;
        
        // Action buttons
        this.element.addEventListener('click', async (e) => {
            const actionEl = e.target.closest('[data-action]');
            if (actionEl) {
                await this.handleAction(actionEl.dataset.action, e);
            }
            
            // Category filter
            const filterEl = e.target.closest('[data-category]');
            if (filterEl) {
                this.filterByCategory(filterEl.dataset.category);
            }
            
            // Notification item click
            const notiItem = e.target.closest('.qmf-noti-panel__item');
            if (notiItem && !e.target.closest('[data-item-action]')) {
                await this.handleNotificationClick(notiItem.dataset.notiId);
            }
            
            // Item action buttons
            const itemActionEl = e.target.closest('[data-item-action]');
            if (itemActionEl) {
                e.stopPropagation();
                await this.handleItemAction(
                    itemActionEl.dataset.itemAction,
                    itemActionEl.closest('.qmf-noti-panel__item').dataset.notiId
                );
            }
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.state === PanelState.OPEN) {
                if (!e.target.closest('.qmf-noti-panel') && 
                    !e.target.closest('[data-action="toggle-noti"]')) {
                    this.close();
                }
            }
        });
    }
    
    /**
     * Handle action
     */
    async handleAction(action, e) {
        switch (action) {
            case 'close':
                this.close();
                break;
            case 'mark-all-read':
                await notificationService.markAllAsRead();
                break;
            case 'settings':
                eventBus.emit('noti:open-settings');
                this.close();
                break;
        }
    }
    
    /**
     * Toggle panel
     */
    toggle() {
        if (this.state === PanelState.CLOSED) {
            this.open();
        } else {
            this.close();
        }
    }
    
    /**
     * Open panel
     */
    open() {
        this.element.classList.add('open');
        this.state = PanelState.OPEN;
        
        // Load notifications
        notificationService.loadNotifications();
        
        eventBus.emit('noti-panel:opened');
    }
    
    /**
     * Close panel
     */
    close() {
        this.element.classList.remove('open');
        this.state = PanelState.CLOSED;
        eventBus.emit('noti-panel:closed');
    }
    
    /**
     * Filter by category
     */
    filterByCategory(category) {
        this.activeCategory = category;
        
        // Update filter buttons
        this.element.querySelectorAll('.qmf-noti-panel__filter').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        
        // Re-render with filter
        const notifications = notificationService.getNotifications();
        this.renderNotifications(notifications);
    }
    
    /**
     * Render notifications
     */
    async renderNotifications(notifications) {
        const container = this.element.querySelector('#notification-list');
        if (!container) return;
        
        // Filter by category
        let filtered = notifications;
        if (this.activeCategory !== 'all') {
            filtered = notifications.filter(n => n.category === this.activeCategory);
        }
        
        if (filtered.length === 0) {
            const icons = await this.loadIcons();
            container.innerHTML = `
                <div class="qmf-noti-panel__empty">
                    ${icons['bell-off']}
                    <p>Không có thông báo nào</p>
                </div>
            `;
            return;
        }
        
        const icons = await this.loadIcons();
        
        // Group by date
        const grouped = this.groupByDate(filtered);
        
        let html = '';
        for (const [date, items] of Object.entries(grouped)) {
            html += `<div class="qmf-noti-panel__group-label">${date}</div>`;
            html += items.map(noti => this.renderNotificationItem(noti, icons)).join('');
        }
        
        container.innerHTML = html;
        
        // Update badges
        this.updateBadges();
    }
    
    /**
     * Render single notification item
     */
    renderNotificationItem(noti, icons) {
        const categoryMeta = CATEGORY_META[noti.category] || CATEGORY_META[NotificationCategory.SYSTEM];
        const priorityStyle = PRIORITY_STYLES[noti.priority] || PRIORITY_STYLES[NotificationPriority.NORMAL];
        const isUnread = !noti.read;
        
        return `
            <div class="qmf-noti-panel__item ${isUnread ? 'unread' : ''}" 
                 data-noti-id="${noti.id}"
                 style="background: ${priorityStyle.bg};">
                <div class="qmf-noti-panel__item-icon" style="background: ${categoryMeta.color}20; color: ${categoryMeta.color};">
                    ${this.getNotificationIcon(noti, icons)}
                </div>
                <div class="qmf-noti-panel__item-content">
                    <div class="qmf-noti-panel__item-title">${this.escapeHtml(noti.title)}</div>
                    <div class="qmf-noti-panel__item-message">${this.escapeHtml(noti.message)}</div>
                    <div class="qmf-noti-panel__item-time">${this.formatTime(noti.created_at)}</div>
                </div>
                <div class="qmf-noti-panel__item-actions">
                    ${isUnread ? `
                        <button class="qmf-noti-panel__item-btn" data-item-action="read" title="Đánh dấu đã đọc">
                            ${icons['eye']}
                        </button>
                    ` : ''}
                    <button class="qmf-noti-panel__item-btn" data-item-action="delete" title="Xóa">
                        ${icons['trash-2']}
                    </button>
                </div>
                ${isUnread ? '<div class="qmf-noti-panel__unread-dot"></div>' : ''}
            </div>
        `;
    }
    
    /**
     * Get notification icon based on type
     */
    getNotificationIcon(noti, icons) {
        // Map notification types to icons
        const typeIconMap = {
            'friend_request': 'user',
            'friend_accepted': 'users',
            'new_message': 'message-circle',
            'like': 'heart',
            'achievement': 'trophy',
            'badge': 'star',
            'gift': 'gift',
            'class_invite': 'book-open',
            'quiz_reminder': 'gamepad-2'
        };
        
        const iconName = typeIconMap[noti.type] || CATEGORY_META[noti.category]?.icon || 'bell';
        return icons[iconName] || icons['bell'];
    }
    
    /**
     * Group notifications by date
     */
    groupByDate(notifications) {
        const groups = {};
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        notifications.forEach(noti => {
            const date = new Date(noti.created_at);
            let label;
            
            if (this.isSameDay(date, today)) {
                label = 'Hôm nay';
            } else if (this.isSameDay(date, yesterday)) {
                label = 'Hôm qua';
            } else if (this.isThisWeek(date)) {
                label = 'Tuần này';
            } else {
                label = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }
            
            if (!groups[label]) {
                groups[label] = [];
            }
            groups[label].push(noti);
        });
        
        return groups;
    }
    
    /**
     * Handle notification click
     */
    async handleNotificationClick(notiId) {
        const notification = notificationService.getNotification(notiId);
        if (!notification) return;
        
        // Mark as read
        if (!notification.read) {
            await notificationService.markAsRead(notiId);
        }
        
        // Navigate if has URL
        if (notification.url) {
            window.location.href = notification.url;
            this.close();
        }
        
        // Emit event for custom handling
        eventBus.emit('noti:clicked', { notification });
    }
    
    /**
     * Handle item action
     */
    async handleItemAction(action, notiId) {
        switch (action) {
            case 'read':
                await notificationService.markAsRead(notiId);
                this.updateNotificationItem(notiId);
                break;
            case 'delete':
                await notificationService.deleteNotification(notiId);
                this.removeNotificationItem(notiId);
                break;
        }
    }
    
    /**
     * Handle new notification
     */
    async handleNewNotification(notification) {
        // If panel is open, prepend to list
        if (this.state === PanelState.OPEN) {
            const container = this.element.querySelector('#notification-list');
            if (container) {
                const icons = await this.loadIcons();
                const itemHtml = this.renderNotificationItem(notification, icons);
                
                // Check if empty state
                const empty = container.querySelector('.qmf-noti-panel__empty');
                if (empty) {
                    container.innerHTML = `<div class="qmf-noti-panel__group-label">Hôm nay</div>` + itemHtml;
                } else {
                    // Add after first group label
                    const firstLabel = container.querySelector('.qmf-noti-panel__group-label');
                    if (firstLabel && firstLabel.textContent === 'Hôm nay') {
                        firstLabel.insertAdjacentHTML('afterend', itemHtml);
                    } else {
                        container.insertAdjacentHTML('afterbegin', 
                            `<div class="qmf-noti-panel__group-label">Hôm nay</div>` + itemHtml
                        );
                    }
                }
                
                // Animate new item
                const newItem = container.querySelector(`[data-noti-id="${notification.id}"]`);
                if (newItem) {
                    newItem.classList.add('new');
                    setTimeout(() => newItem.classList.remove('new'), 500);
                }
            }
        }
        
        // Update badges
        this.updateBadges();
    }
    
    /**
     * Update notification item (after marking read)
     */
    updateNotificationItem(notiId) {
        const item = this.element.querySelector(`[data-noti-id="${notiId}"]`);
        if (item) {
            item.classList.remove('unread');
            const dot = item.querySelector('.qmf-noti-panel__unread-dot');
            if (dot) dot.remove();
            
            const readBtn = item.querySelector('[data-item-action="read"]');
            if (readBtn) readBtn.remove();
        }
        this.updateBadges();
    }
    
    /**
     * Remove notification item
     */
    removeNotificationItem(notiId) {
        const item = this.element.querySelector(`[data-noti-id="${notiId}"]`);
        if (item) {
            item.style.animation = 'slideOut 0.2s ease forwards';
            setTimeout(() => {
                item.remove();
                
                // Check if container empty
                const container = this.element.querySelector('#notification-list');
                if (container && !container.querySelector('.qmf-noti-panel__item')) {
                    this.loadIcons().then(icons => {
                        container.innerHTML = `
                            <div class="qmf-noti-panel__empty">
                                ${icons['bell-off']}
                                <p>Không có thông báo nào</p>
                            </div>
                        `;
                    });
                }
            }, 200);
        }
        this.updateBadges();
    }
    
    /**
     * Update filter badges
     */
    updateBadges() {
        const notifications = notificationService.getNotifications();
        const unreadByCategory = {};
        
        notifications.forEach(n => {
            if (!n.read) {
                unreadByCategory[n.category] = (unreadByCategory[n.category] || 0) + 1;
            }
        });
        
        // Total unread
        const totalUnread = Object.values(unreadByCategory).reduce((a, b) => a + b, 0);
        const allBadge = this.element.querySelector('#filter-badge-all');
        if (allBadge) {
            allBadge.textContent = totalUnread > 0 ? totalUnread : '';
        }
        
        // By category
        Object.keys(CATEGORY_META).forEach(cat => {
            const badge = this.element.querySelector(`#filter-badge-${cat}`);
            if (badge) {
                const count = unreadByCategory[cat] || 0;
                badge.textContent = count > 0 ? count : '';
            }
        });
    }
    
    /**
     * Helper: Check if same day
     */
    isSameDay(d1, d2) {
        return d1.getDate() === d2.getDate() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getFullYear() === d2.getFullYear();
    }
    
    /**
     * Helper: Check if this week
     */
    isThisWeek(date) {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return date >= startOfWeek;
    }
    
    /**
     * Format time
     */
    formatTime(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Vừa xong';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} ngày trước`;
        
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    }
    
    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Destroy
     */
    destroy() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
}

// Factory
export function createNotificationPanel(config) {
    const panel = new NotificationPanel();
    panel.init(config);
    return panel;
}

export default NotificationPanel;
