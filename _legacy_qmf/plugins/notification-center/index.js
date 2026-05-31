/**
 * QMF Notification Center Plugin
 * Central notification management and display
 * @version 1.0.0
 */

import { eventBus } from '../kernel/event-bus.js';
import { context } from '../kernel/context.js';

/**
 * @typedef {Object} Notification
 * @property {string} id - Unique ID
 * @property {string} title - Notification title
 * @property {string} message - Notification message
 * @property {string} type - info|success|warning|error
 * @property {string} category - Notification category
 * @property {number} timestamp - Unix timestamp
 * @property {boolean} read - Read status
 * @property {string} href - Action link
 * @property {Object} meta - Additional metadata
 */

class NotificationCenterPlugin {
    constructor() {
        this.element = null;
        this.config = {};
        this.isOpen = false;
        this.notifications = [];
        
        this._defaults = {
            maxNotifications: 100,
            autoMarkReadOnView: true,
            groupByDate: true,
            persistToStorage: true,
            storageKey: 'qmf_notifications',
            fetchUrl: null,
            pollInterval: 0, // 0 = no polling
            categories: [
                { id: 'all', label: 'All' },
                { id: 'system', label: 'System' },
                { id: 'social', label: 'Social' },
                { id: 'updates', label: 'Updates' }
            ],
            emptyMessage: 'No notifications yet'
        };
    }
    
    /**
     * Initialize notification center
     */
    init(config = {}) {
        this.config = { ...this._defaults, ...config };
        this._loadNotifications();
        this._createNotificationCenter();
        this._bindEvents();
        
        if (this.config.pollInterval > 0 && this.config.fetchUrl) {
            this._startPolling();
        }
        
        eventBus.emit('notification-center:initialized', { config: this.config });
        
        return this;
    }
    
    /**
     * Create notification center DOM
     */
    _createNotificationCenter() {
        this.element = document.createElement('div');
        this.element.id = 'qmf-notification-center';
        this.element.className = 'qmf-notification-center';
        
        this.element.innerHTML = `
            <div class="qmf-notification-center__backdrop"></div>
            <div class="qmf-notification-center__panel">
                <div class="qmf-notification-center__header">
                    <h3 class="qmf-notification-center__title">Notifications</h3>
                    <div class="qmf-notification-center__actions">
                        <button class="qmf-notification-center__action" data-action="mark-all-read" title="Mark all as read">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                        </button>
                        <button class="qmf-notification-center__action" data-action="settings" title="Settings">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                            </svg>
                        </button>
                        <button class="qmf-notification-center__close" data-action="close">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="qmf-notification-center__tabs">
                    ${this.config.categories.map((cat, i) => `
                        <button class="qmf-notification-center__tab ${i === 0 ? 'qmf-notification-center__tab--active' : ''}"
                                data-category="${cat.id}">
                            ${cat.label}
                            <span class="qmf-notification-center__tab-count" data-count="${cat.id}">0</span>
                        </button>
                    `).join('')}
                </div>
                
                <div class="qmf-notification-center__body">
                    <div class="qmf-notification-center__list"></div>
                    <div class="qmf-notification-center__empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        <p>${this.config.emptyMessage}</p>
                    </div>
                </div>
                
                <div class="qmf-notification-center__footer">
                    <button class="qmf-notification-center__view-all">View all notifications</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.element);
        this._injectStyles();
        this._render();
    }
    
    /**
     * Bind events
     */
    _bindEvents() {
        const backdrop = this.element.querySelector('.qmf-notification-center__backdrop');
        const closeBtn = this.element.querySelector('[data-action="close"]');
        const markAllBtn = this.element.querySelector('[data-action="mark-all-read"]');
        const settingsBtn = this.element.querySelector('[data-action="settings"]');
        const tabs = this.element.querySelectorAll('.qmf-notification-center__tab');
        const viewAllBtn = this.element.querySelector('.qmf-notification-center__view-all');
        
        // Close handlers
        backdrop.addEventListener('click', () => this.close());
        closeBtn.addEventListener('click', () => this.close());
        
        // Mark all read
        markAllBtn.addEventListener('click', () => this.markAllAsRead());
        
        // Settings
        settingsBtn.addEventListener('click', () => {
            eventBus.emit('notification-center:settings-click');
            this.close();
        });
        
        // Tab switching
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('qmf-notification-center__tab--active'));
                tab.classList.add('qmf-notification-center__tab--active');
                this._render(tab.dataset.category);
            });
        });
        
        // View all
        viewAllBtn.addEventListener('click', () => {
            eventBus.emit('notification-center:view-all');
            this.close();
        });
        
        // Notification item clicks
        this.element.querySelector('.qmf-notification-center__list').addEventListener('click', (e) => {
            const item = e.target.closest('.qmf-notification-center__item');
            if (!item) return;
            
            const id = item.dataset.id;
            const action = e.target.closest('[data-action]')?.dataset.action;
            
            if (action === 'delete') {
                e.stopPropagation();
                this.remove(id);
            } else {
                this._handleNotificationClick(id);
            }
        });
        
        // Listen for open events
        eventBus.on('header:notifications-click', () => this.toggle());
        eventBus.on('notification-center:open', () => this.open());
        eventBus.on('notification-center:close', () => this.close());
        
        // Keyboard escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
    
    /**
     * Render notifications
     */
    _render(category = 'all') {
        const listEl = this.element.querySelector('.qmf-notification-center__list');
        const emptyEl = this.element.querySelector('.qmf-notification-center__empty');
        
        // Filter by category
        let filtered = category === 'all' 
            ? this.notifications 
            : this.notifications.filter(n => n.category === category);
        
        // Update tab counts
        this._updateTabCounts();
        
        if (filtered.length === 0) {
            listEl.style.display = 'none';
            emptyEl.style.display = 'flex';
            return;
        }
        
        listEl.style.display = 'block';
        emptyEl.style.display = 'none';
        
        // Group by date if enabled
        let html = '';
        
        if (this.config.groupByDate) {
            const grouped = this._groupByDate(filtered);
            
            for (const [date, items] of Object.entries(grouped)) {
                html += `<div class="qmf-notification-center__date-group">${date}</div>`;
                html += items.map(n => this._renderNotification(n)).join('');
            }
        } else {
            html = filtered.map(n => this._renderNotification(n)).join('');
        }
        
        listEl.innerHTML = html;
    }
    
    /**
     * Render single notification
     */
    _renderNotification(notification) {
        const typeIcons = {
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
        };
        
        const icon = typeIcons[notification.type] || typeIcons.info;
        const timeAgo = this._formatTimeAgo(notification.timestamp);
        
        return `
            <div class="qmf-notification-center__item ${notification.read ? '' : 'qmf-notification-center__item--unread'}"
                 data-id="${notification.id}"
                 data-type="${notification.type}">
                <div class="qmf-notification-center__item-icon qmf-notification-center__item-icon--${notification.type}">
                    ${icon}
                </div>
                <div class="qmf-notification-center__item-content">
                    <div class="qmf-notification-center__item-title">${notification.title}</div>
                    <div class="qmf-notification-center__item-message">${notification.message}</div>
                    <div class="qmf-notification-center__item-time">${timeAgo}</div>
                </div>
                <button class="qmf-notification-center__item-delete" data-action="delete" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `;
    }
    
    /**
     * Group notifications by date
     */
    _groupByDate(notifications) {
        const groups = {};
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        notifications.forEach(n => {
            const date = new Date(n.timestamp).toDateString();
            let label;
            
            if (date === today) {
                label = 'Today';
            } else if (date === yesterday) {
                label = 'Yesterday';
            } else {
                label = new Date(n.timestamp).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                });
            }
            
            if (!groups[label]) groups[label] = [];
            groups[label].push(n);
        });
        
        return groups;
    }
    
    /**
     * Format timestamp as relative time
     */
    _formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        
        return new Date(timestamp).toLocaleDateString();
    }
    
    /**
     * Update tab counts
     */
    _updateTabCounts() {
        const counts = { all: 0 };
        
        this.notifications.forEach(n => {
            if (!n.read) {
                counts.all++;
                counts[n.category] = (counts[n.category] || 0) + 1;
            }
        });
        
        this.element.querySelectorAll('[data-count]').forEach(el => {
            const cat = el.dataset.count;
            const count = counts[cat] || 0;
            el.textContent = count;
            el.style.display = count > 0 ? 'inline-flex' : 'none';
        });
        
        // Update context for header badge
        context.set('notifications.unreadCount', counts.all);
    }
    
    /**
     * Handle notification click
     */
    _handleNotificationClick(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (!notification) return;
        
        // Mark as read
        if (!notification.read && this.config.autoMarkReadOnView) {
            this.markAsRead(id);
        }
        
        // Navigate if has href
        if (notification.href) {
            window.location.href = notification.href;
        }
        
        eventBus.emit('notification-center:notification-click', { notification });
        this.close();
    }
    
    /**
     * Add notification
     */
    add(notification) {
        const newNotif = {
            id: notification.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            title: notification.title,
            message: notification.message,
            type: notification.type || 'info',
            category: notification.category || 'system',
            timestamp: notification.timestamp || Date.now(),
            read: notification.read || false,
            href: notification.href,
            meta: notification.meta || {}
        };
        
        // Add to beginning
        this.notifications.unshift(newNotif);
        
        // Trim to max
        if (this.notifications.length > this.config.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.config.maxNotifications);
        }
        
        this._saveNotifications();
        this._render();
        this._updateTabCounts();
        
        eventBus.emit('notification-center:added', { notification: newNotif });
        
        return newNotif.id;
    }
    
    /**
     * Remove notification
     */
    remove(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index === -1) return;
        
        const removed = this.notifications.splice(index, 1)[0];
        
        this._saveNotifications();
        this._render();
        this._updateTabCounts();
        
        eventBus.emit('notification-center:removed', { notification: removed });
    }
    
    /**
     * Mark notification as read
     */
    markAsRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (!notification || notification.read) return;
        
        notification.read = true;
        
        this._saveNotifications();
        this._updateTabCounts();
        
        // Update UI
        const el = this.element.querySelector(`[data-id="${id}"]`);
        el?.classList.remove('qmf-notification-center__item--unread');
        
        eventBus.emit('notification-center:read', { notification });
    }
    
    /**
     * Mark all as read
     */
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        
        this._saveNotifications();
        this._render();
        this._updateTabCounts();
        
        eventBus.emit('notification-center:all-read');
    }
    
    /**
     * Clear all notifications
     */
    clear() {
        this.notifications = [];
        
        this._saveNotifications();
        this._render();
        this._updateTabCounts();
        
        eventBus.emit('notification-center:cleared');
    }
    
    /**
     * Get unread count
     */
    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }
    
    /**
     * Load from storage
     */
    _loadNotifications() {
        if (!this.config.persistToStorage) {
            this.notifications = [];
            return;
        }
        
        try {
            const stored = localStorage.getItem(this.config.storageKey);
            this.notifications = stored ? JSON.parse(stored) : [];
        } catch (e) {
            this.notifications = [];
        }
    }
    
    /**
     * Save to storage
     */
    _saveNotifications() {
        if (!this.config.persistToStorage) return;
        
        try {
            localStorage.setItem(this.config.storageKey, JSON.stringify(this.notifications));
        } catch (e) {}
    }
    
    /**
     * Start polling for new notifications
     */
    _startPolling() {
        this._pollInterval = setInterval(() => {
            this._fetchNotifications();
        }, this.config.pollInterval);
    }
    
    /**
     * Fetch notifications from server
     */
    async _fetchNotifications() {
        if (!this.config.fetchUrl) return;
        
        try {
            const response = await fetch(this.config.fetchUrl);
            const data = await response.json();
            
            if (Array.isArray(data)) {
                data.forEach(n => {
                    if (!this.notifications.find(existing => existing.id === n.id)) {
                        this.add(n);
                    }
                });
            }
        } catch (e) {
            console.warn('Failed to fetch notifications:', e);
        }
    }
    
    /**
     * Open notification center
     */
    open() {
        this.isOpen = true;
        this.element.classList.add('qmf-notification-center--open');
        document.body.style.overflow = 'hidden';
        
        eventBus.emit('notification-center:opened');
    }
    
    /**
     * Close notification center
     */
    close() {
        this.isOpen = false;
        this.element.classList.remove('qmf-notification-center--open');
        document.body.style.overflow = '';
        
        eventBus.emit('notification-center:closed');
    }
    
    /**
     * Toggle notification center
     */
    toggle() {
        this.isOpen ? this.close() : this.open();
    }
    
    /**
     * Destroy plugin
     */
    destroy() {
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
        }
        
        this.element?.remove();
    }
    
    /**
     * Inject styles
     */
    _injectStyles() {
        if (document.getElementById('qmf-notification-center-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'qmf-notification-center-styles';
        style.textContent = `
            .qmf-notification-center {
                position: fixed;
                inset: 0;
                z-index: var(--qmf-z-modal);
                display: none;
            }
            
            .qmf-notification-center--open {
                display: block;
            }
            
            .qmf-notification-center__backdrop {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.3);
                animation: qmf-fade-in var(--qmf-duration-fast) var(--qmf-easing-out);
            }
            
            .qmf-notification-center__panel {
                position: absolute;
                top: 0;
                right: 0;
                width: 100%;
                max-width: 420px;
                height: 100%;
                background: var(--qmf-color-surface);
                box-shadow: var(--qmf-shadow-2xl);
                display: flex;
                flex-direction: column;
                animation: qmf-slide-in-right var(--qmf-duration-normal) var(--qmf-easing-out);
            }
            
            .qmf-notification-center__header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--qmf-space-4);
                border-bottom: 1px solid var(--qmf-color-border);
            }
            
            .qmf-notification-center__title {
                margin: 0;
                font-size: var(--qmf-font-size-lg);
                font-weight: var(--qmf-font-weight-semibold);
            }
            
            .qmf-notification-center__actions {
                display: flex;
                gap: var(--qmf-space-1);
            }
            
            .qmf-notification-center__action,
            .qmf-notification-center__close {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                background: none;
                border: none;
                cursor: pointer;
                color: var(--qmf-color-text-secondary);
                border-radius: var(--qmf-radius);
                transition: var(--qmf-transition-fast);
            }
            
            .qmf-notification-center__action:hover,
            .qmf-notification-center__close:hover {
                background: var(--qmf-color-bg-secondary);
                color: var(--qmf-color-text);
            }
            
            .qmf-notification-center__action svg,
            .qmf-notification-center__close svg {
                width: 18px;
                height: 18px;
            }
            
            .qmf-notification-center__tabs {
                display: flex;
                padding: var(--qmf-space-2) var(--qmf-space-4);
                gap: var(--qmf-space-1);
                border-bottom: 1px solid var(--qmf-color-border);
                overflow-x: auto;
            }
            
            .qmf-notification-center__tab {
                display: flex;
                align-items: center;
                gap: var(--qmf-space-2);
                padding: var(--qmf-space-2) var(--qmf-space-3);
                background: none;
                border: none;
                cursor: pointer;
                font-size: var(--qmf-font-size-sm);
                color: var(--qmf-color-text-secondary);
                border-radius: var(--qmf-radius);
                white-space: nowrap;
                transition: var(--qmf-transition-fast);
            }
            
            .qmf-notification-center__tab:hover {
                background: var(--qmf-color-bg-secondary);
            }
            
            .qmf-notification-center__tab--active {
                background: var(--qmf-color-primary-50);
                color: var(--qmf-color-primary);
            }
            
            .qmf-notification-center__tab-count {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 18px;
                height: 18px;
                padding: 0 5px;
                background: var(--qmf-color-danger);
                color: white;
                font-size: 11px;
                font-weight: var(--qmf-font-weight-medium);
                border-radius: var(--qmf-radius-full);
            }
            
            .qmf-notification-center__body {
                flex: 1;
                overflow-y: auto;
            }
            
            .qmf-notification-center__date-group {
                padding: var(--qmf-space-2) var(--qmf-space-4);
                font-size: var(--qmf-font-size-xs);
                font-weight: var(--qmf-font-weight-semibold);
                color: var(--qmf-color-text-tertiary);
                background: var(--qmf-color-bg-secondary);
                position: sticky;
                top: 0;
            }
            
            .qmf-notification-center__item {
                display: flex;
                gap: var(--qmf-space-3);
                padding: var(--qmf-space-3) var(--qmf-space-4);
                cursor: pointer;
                transition: background var(--qmf-duration-fast) var(--qmf-easing-default);
                border-bottom: 1px solid var(--qmf-color-border-light);
                position: relative;
            }
            
            .qmf-notification-center__item:hover {
                background: var(--qmf-color-bg-secondary);
            }
            
            .qmf-notification-center__item--unread {
                background: var(--qmf-color-primary-50);
            }
            
            .qmf-notification-center__item--unread::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 3px;
                background: var(--qmf-color-primary);
            }
            
            .qmf-notification-center__item-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                border-radius: var(--qmf-radius-full);
                flex-shrink: 0;
            }
            
            .qmf-notification-center__item-icon svg {
                width: 18px;
                height: 18px;
            }
            
            .qmf-notification-center__item-icon--info {
                background: var(--qmf-color-info-100);
                color: var(--qmf-color-info);
            }
            
            .qmf-notification-center__item-icon--success {
                background: var(--qmf-color-success-100);
                color: var(--qmf-color-success);
            }
            
            .qmf-notification-center__item-icon--warning {
                background: var(--qmf-color-warning-100);
                color: var(--qmf-color-warning);
            }
            
            .qmf-notification-center__item-icon--error {
                background: var(--qmf-color-danger-100);
                color: var(--qmf-color-danger);
            }
            
            .qmf-notification-center__item-content {
                flex: 1;
                min-width: 0;
            }
            
            .qmf-notification-center__item-title {
                font-weight: var(--qmf-font-weight-medium);
                color: var(--qmf-color-text);
                margin-bottom: 2px;
            }
            
            .qmf-notification-center__item-message {
                font-size: var(--qmf-font-size-sm);
                color: var(--qmf-color-text-secondary);
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            
            .qmf-notification-center__item-time {
                font-size: var(--qmf-font-size-xs);
                color: var(--qmf-color-text-tertiary);
                margin-top: var(--qmf-space-1);
            }
            
            .qmf-notification-center__item-delete {
                position: absolute;
                top: var(--qmf-space-2);
                right: var(--qmf-space-2);
                display: none;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                background: var(--qmf-color-bg);
                border: 1px solid var(--qmf-color-border);
                border-radius: var(--qmf-radius);
                cursor: pointer;
                color: var(--qmf-color-text-tertiary);
                transition: var(--qmf-transition-fast);
            }
            
            .qmf-notification-center__item:hover .qmf-notification-center__item-delete {
                display: flex;
            }
            
            .qmf-notification-center__item-delete:hover {
                background: var(--qmf-color-danger-50);
                color: var(--qmf-color-danger);
                border-color: var(--qmf-color-danger-100);
            }
            
            .qmf-notification-center__item-delete svg {
                width: 14px;
                height: 14px;
            }
            
            .qmf-notification-center__empty {
                display: none;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: var(--qmf-space-12);
                text-align: center;
                color: var(--qmf-color-text-tertiary);
            }
            
            .qmf-notification-center__empty svg {
                width: 48px;
                height: 48px;
                margin-bottom: var(--qmf-space-4);
                opacity: 0.5;
            }
            
            .qmf-notification-center__footer {
                padding: var(--qmf-space-3) var(--qmf-space-4);
                border-top: 1px solid var(--qmf-color-border);
            }
            
            .qmf-notification-center__view-all {
                width: 100%;
                padding: var(--qmf-space-2);
                background: none;
                border: 1px solid var(--qmf-color-border);
                border-radius: var(--qmf-radius);
                cursor: pointer;
                font-size: var(--qmf-font-size-sm);
                color: var(--qmf-color-text-secondary);
                transition: var(--qmf-transition-fast);
            }
            
            .qmf-notification-center__view-all:hover {
                background: var(--qmf-color-bg-secondary);
                color: var(--qmf-color-text);
            }
            
            @media (max-width: 480px) {
                .qmf-notification-center__panel {
                    max-width: 100%;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

export const notificationCenter = new NotificationCenterPlugin();
export default notificationCenter;
