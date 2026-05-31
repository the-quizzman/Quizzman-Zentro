/**
 * Quizzman Notification Embeddable Module v1.0
 * 
 * Lightweight, auto-initializing notification widget for all *.quizzman.com services
 * 
 * Features:
 * - SVG bell icon with animated badge
 * - Desktop: Embeds in #header with dropdown panel
 * - Mobile: Full-screen modal triggered from sidebar
 * - Auto-connects to noti-service via WebSocket
 * - Uses QuizzmanAuth for authentication
 * 
 * Usage:
 * <script src="https://noti.quizzman.com/module-frontend/noti-embed.js"></script>
 * <script>
 *   NotiEmbed.init({ containerId: 'header' });
 * </script>
 */

(function (global) {
    'use strict';

    const NOTI_SERVICE_URL = 'https://noti.quizzman.com';
    const SOCKET_IO_URL = 'https://cdn.socket.io/4.6.1/socket.io.min.js';

    const DEFAULT_CONFIG = {
        containerId: 'header',
        mobileContainerId: 'sidebar-left',
        mobileBreakpoint: 768,
        position: 'right',
        autoConnect: true,
        showToasts: true,
        maxNotifications: 50,
        debug: false
    };

    const SVG_ICONS = {
        bell: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </svg>`,
        bellRing: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
      <path d="M4 2C2.8 3.7 2 5.7 2 8"/>
      <path d="M22 8c0-2.3-.8-4.3-2-6"/>
    </svg>`,
        close: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`,
        check: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20,6 9,17 4,12"/>
    </svg>`,
        checkAll: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>
    </svg>`,
        trash: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>`,
        clock: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
    </svg>`,
        chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9,18 15,12 9,6"/>
    </svg>`,
        bellOff: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/>
      <path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"/>
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
      <path d="m2 2 20 20"/>
    </svg>`
    };

    const NOTIFICATION_ICONS = {
        'info': '📋',
        'success': '✅',
        'warning': '⚠️',
        'error': '❌',
        'system': '⚙️',
        'message': '💬',
        'assignment': '📚',
        'homework': '📝',
        'class': '🎓',
        'friend': '👥',
        'event': '📅',
        'grade': '⭐',
        'announcement': '📢',
        'default': '🔔'
    };

    class NotiEmbed {
        constructor() {
            this.config = { ...DEFAULT_CONFIG };
            this.socket = null;
            this.token = null;
            this.notifications = [];
            this.unreadCount = 0;
            this.isOpen = false;
            this.isMobile = false;
            this.container = null;
            this.mobileContainer = null;
            this.initialized = false;
        }

        init(options = {}) {
            if (this.initialized) {
                this.log('Already initialized');
                return this;
            }

            this.config = { ...DEFAULT_CONFIG, ...options };
            this.isMobile = window.innerWidth <= this.config.mobileBreakpoint;

            this.injectStyles();
            this.createWidget();
            this.attachEventListeners();

            if (this.config.autoConnect) {
                this.connect();
            }

            this.initialized = true;
            this.log('Initialized', this.config);
            return this;
        }

        log(...args) {
            if (this.config.debug) {
                console.log('[NotiEmbed]', ...args);
            }
        }

        async connect() {
            this.token = this.getToken();
            if (!this.token) {
                this.log('No auth token found, waiting for login...');
                this.showConnectionStatus('disconnected');
                return;
            }

            await this.loadSocketIO();
            this.initSocket();
        }

        getToken() {
            if (typeof QuizzmanAuth !== 'undefined') {
                return QuizzmanAuth.getToken();
            }
            const match = document.cookie.match(/(?:^|; )jwt_token=([^;]*)/);
            return match ? decodeURIComponent(match[1]) : null;
        }

        loadSocketIO() {
            return new Promise((resolve) => {
                if (typeof io !== 'undefined') {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = SOCKET_IO_URL;
                script.onload = resolve;
                script.onerror = () => {
                    this.log('Failed to load Socket.IO');
                    resolve();
                };
                document.head.appendChild(script);
            });
        }

        initSocket() {
            if (typeof io === 'undefined') {
                this.log('Socket.IO not available');
                return;
            }

            this.socket = io(NOTI_SERVICE_URL, {
                auth: { token: this.token },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 2000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5,
                timeout: 10000
            });

            this.socket.on('connect', () => {
                this.log('Connected to notification service');
                this.showConnectionStatus('connected');
                setTimeout(() => this.fetchNotifications(), 100);
            });

            this.socket.on('disconnect', () => {
                this.log('Disconnected from notification service');
                this.showConnectionStatus('disconnected');
            });

            this.socket.on('connect_error', (error) => {
                this.log('Connection error:', error.message);
                this.showConnectionStatus('error');
            });

            this.socket.on('notify:new', (data) => {
                const notification = data.notification || data;
                this.log('New notification:', notification);
                this.notifications.unshift(notification);
                this.updateUnreadCount(this.unreadCount + 1);
                this.renderNotifications();
                if (this.config.showToasts) {
                    this.showToast(notification);
                }
                this.animateBell();
            });

            this.socket.on('notify:unread-count', (data) => {
                const count = typeof data === 'number' ? data : (data.count || 0);
                this.updateUnreadCount(count);
            });

            this.socket.on('response:notifications', (data) => {
                this.log('Notifications received:', data.notifications?.length);
                this.notifications = data.notifications || [];
                this.renderNotifications();
            });

            this.socket.on('notify:read', (data) => {
                const id = data.notification_id || data;
                const noti = this.notifications.find(n => n.id === id);
                if (noti) {
                    noti.is_read = true;
                    this.renderNotifications();
                }
            });

            this.socket.on('notify:all-read', () => {
                this.notifications.forEach(n => n.is_read = true);
                this.updateUnreadCount(0);
                this.renderNotifications();
            });

            this.socket.on('notify:deleted', (data) => {
                const id = data.notification_id || data;
                this.notifications = this.notifications.filter(n => n.id !== id);
                this.renderNotifications();
            });

            this.socket.on('notify:all-deleted', () => {
                this.notifications = [];
                this.updateUnreadCount(0);
                this.renderNotifications();
            });
        }

        fetchNotifications(limit = 50, offset = 0) {
            if (this.socket?.connected) {
                this.socket.emit('request:notifications', { limit, offset });
            }
        }

        markAsRead(id) {
            if (this.socket?.connected) {
                this.socket.emit('mark:read', { notification_id: id });
            }
        }

        markAllAsRead() {
            if (this.socket?.connected) {
                this.socket.emit('mark:all-read');
            }
        }

        deleteNotification(id) {
            if (this.socket?.connected) {
                this.socket.emit('delete:notification', { notification_id: id });
            }
        }

        deleteAllNotifications() {
            if (this.socket?.connected && confirm('Bạn có chắc chắn muốn xóa tất cả thông báo?')) {
                this.socket.emit('delete:all');
            }
        }

        updateUnreadCount(count) {
            this.unreadCount = count;
            const badge = document.getElementById('noti-embed-badge');
            if (badge) {
                if (count > 0) {
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        }

        showConnectionStatus(status) {
            const indicator = document.getElementById('noti-embed-status');
            if (indicator) {
                indicator.className = `noti-embed-status ${status}`;
                indicator.title = status === 'connected' ? 'Đã kết nối' :
                    status === 'error' ? 'Lỗi kết nối' : 'Đã ngắt kết nối';
            }
        }

        animateBell() {
            const bell = document.getElementById('noti-embed-bell');
            if (bell) {
                bell.classList.add('ring');
                setTimeout(() => bell.classList.remove('ring'), 1000);
            }
        }

        createWidget() {
            this.container = document.getElementById(this.config.containerId);
            if (!this.container) {
                this.log(`Container #${this.config.containerId} not found, creating floating button`);
                this.createFloatingButton();
                return;
            }

            const widget = document.createElement('div');
            widget.id = 'noti-embed-widget';
            widget.className = 'noti-embed-widget';
            widget.innerHTML = this.renderBellButton() + this.renderDropdown();

            if (this.config.position === 'left') {
                this.container.insertBefore(widget, this.container.firstChild);
            } else {
                this.container.appendChild(widget);
            }

            if (this.config.mobileContainerId) {
                this.createMobileTrigger();
            }
        }

        createFloatingButton() {
            const floating = document.createElement('div');
            floating.id = 'noti-embed-floating';
            floating.className = 'noti-embed-floating';
            floating.innerHTML = this.renderBellButton() + this.renderDropdown();
            document.body.appendChild(floating);
            this.container = floating;
        }

        createMobileTrigger() {
            this.mobileContainer = document.getElementById(this.config.mobileContainerId);
            if (!this.mobileContainer) return;

            const trigger = document.createElement('div');
            trigger.id = 'noti-embed-mobile-trigger';
            trigger.className = 'noti-embed-mobile-trigger';
            trigger.innerHTML = `
        <button class="noti-embed-mobile-btn" aria-label="Thông báo">
          ${SVG_ICONS.bell}
          <span id="noti-embed-mobile-badge" class="noti-embed-badge" style="display:none">0</span>
        </button>
        <span class="noti-embed-mobile-label">Thông báo</span>
      `;
            trigger.addEventListener('click', () => this.openMobilePanel());
            this.mobileContainer.appendChild(trigger);
        }

        renderBellButton() {
            return `
        <button id="noti-embed-bell" class="noti-embed-bell" aria-label="Thông báo" title="Thông báo">
          <span class="noti-embed-bell-icon">${SVG_ICONS.bell}</span>
          <span id="noti-embed-badge" class="noti-embed-badge" style="display:none">0</span>
          <span id="noti-embed-status" class="noti-embed-status disconnected"></span>
        </button>
      `;
        }

        renderDropdown() {
            return `
        <div id="noti-embed-dropdown" class="noti-embed-dropdown">
          <div class="noti-embed-header">
            <h3>${SVG_ICONS.bell} Thông báo</h3>
            <div class="noti-embed-header-actions">
              <button id="noti-embed-mark-all" class="noti-embed-action-btn" title="Đánh dấu tất cả đã đọc">
                ${SVG_ICONS.checkAll}
              </button>
              <button id="noti-embed-delete-all" class="noti-embed-action-btn danger" title="Xóa tất cả">
                ${SVG_ICONS.trash}
              </button>
              <button id="noti-embed-close" class="noti-embed-action-btn" title="Đóng">
                ${SVG_ICONS.close}
              </button>
            </div>
          </div>
          <div id="noti-embed-list" class="noti-embed-list">
            <div class="noti-embed-loading">
              <div class="noti-embed-spinner"></div>
              <span>Đang tải thông báo...</span>
            </div>
          </div>
          <div class="noti-embed-footer">
            <a href="/notifications" class="noti-embed-view-all">Xem tất cả thông báo</a>
          </div>
        </div>
      `;
        }

        renderNotifications() {
            const list = document.getElementById('noti-embed-list');
            if (!list) return;

            if (!this.notifications.length) {
                list.innerHTML = `
          <div class="noti-embed-empty">
            ${SVG_ICONS.bellOff}
            <span>Không có thông báo mới</span>
          </div>
        `;
                return;
            }

            list.innerHTML = this.notifications.map((noti, index) => {
                const content = typeof noti.content === 'string' ? JSON.parse(noti.content) : (noti.content || {});
                const title = noti.title || content.title || 'Thông báo';
                const message = noti.message || content.message || '';
                const type = noti.type || 'info';
                const icon = content.icon || NOTIFICATION_ICONS[type.split('.').pop()] || NOTIFICATION_ICONS.default;
                const time = this.formatTime(noti.created_at);
                const isRead = noti.is_read || noti.read;

                return `
          <div class="noti-embed-item ${isRead ? '' : 'unread'}" data-id="${noti.id}" data-index="${index}">
            <div class="noti-embed-item-icon">${icon}</div>
            <div class="noti-embed-item-content">
              <div class="noti-embed-item-title">${this.escapeHtml(title)}</div>
              <div class="noti-embed-item-message">${this.escapeHtml(message)}</div>
              <div class="noti-embed-item-time">${SVG_ICONS.clock} ${time}</div>
            </div>
            <div class="noti-embed-item-actions">
              ${!isRead ? `<span class="noti-embed-item-new">Mới</span>` : ''}
              <button class="noti-embed-item-delete" data-id="${noti.id}" title="Xóa">
                ${SVG_ICONS.trash}
              </button>
            </div>
          </div>
        `;
            }).join('');

            list.querySelectorAll('.noti-embed-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.noti-embed-item-delete')) {
                        e.stopPropagation();
                        const id = parseInt(e.target.closest('.noti-embed-item-delete').dataset.id);
                        this.deleteNotification(id);
                        return;
                    }
                    const id = item.dataset.id;
                    this.markAsRead(id);
                    item.classList.remove('unread');
                    this.showNotificationDetail(this.notifications[item.dataset.index]);
                });
            });
        }

        showNotificationDetail(notification) {
            const existing = document.querySelector('.noti-embed-detail-modal');
            if (existing) existing.remove();

            const content = typeof notification.content === 'string'
                ? JSON.parse(notification.content)
                : (notification.content || {});
            const title = notification.title || content.title || 'Thông báo';
            const message = notification.message || content.message || '';
            const type = notification.type || 'info';
            const icon = content.icon || NOTIFICATION_ICONS[type.split('.').pop()] || NOTIFICATION_ICONS.default;
            const time = this.formatTime(notification.created_at);

            const modal = document.createElement('div');
            modal.className = 'noti-embed-detail-modal';
            modal.innerHTML = `
        <div class="noti-embed-detail-overlay"></div>
        <div class="noti-embed-detail-content">
          <div class="noti-embed-detail-header">
            <div class="noti-embed-detail-icon">${icon}</div>
            <div class="noti-embed-detail-header-text">
              <h3>${this.escapeHtml(title)}</h3>
              <span class="noti-embed-detail-time">${SVG_ICONS.clock} ${time}</span>
            </div>
            <button class="noti-embed-detail-close">${SVG_ICONS.close}</button>
          </div>
          <div class="noti-embed-detail-body">
            <p>${this.escapeHtml(message)}</p>
            ${content.action_url ? `
              <a href="${content.action_url}" class="noti-embed-detail-action">
                Xem chi tiết ${SVG_ICONS.chevronRight}
              </a>
            ` : ''}
          </div>
          <div class="noti-embed-detail-footer">
            <button class="noti-embed-detail-dismiss">
              ${SVG_ICONS.check} Đã hiểu
            </button>
          </div>
        </div>
      `;

            document.body.appendChild(modal);
            requestAnimationFrame(() => modal.classList.add('show'));

            const closeModal = () => {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            };

            modal.querySelector('.noti-embed-detail-overlay').addEventListener('click', closeModal);
            modal.querySelector('.noti-embed-detail-close').addEventListener('click', closeModal);
            modal.querySelector('.noti-embed-detail-dismiss').addEventListener('click', closeModal);
        }

        showToast(notification) {
            const content = typeof notification.content === 'string'
                ? JSON.parse(notification.content)
                : (notification.content || {});
            const title = notification.title || content.title || 'Thông báo mới';
            const message = notification.message || content.message || '';
            const type = notification.type || 'info';
            const icon = content.icon || NOTIFICATION_ICONS[type.split('.').pop()] || NOTIFICATION_ICONS.default;

            const toast = document.createElement('div');
            toast.className = 'noti-embed-toast';
            toast.innerHTML = `
        <div class="noti-embed-toast-icon">${icon}</div>
        <div class="noti-embed-toast-content">
          <div class="noti-embed-toast-title">${this.escapeHtml(title)}</div>
          <div class="noti-embed-toast-message">${this.escapeHtml(message)}</div>
        </div>
        <button class="noti-embed-toast-close">${SVG_ICONS.close}</button>
      `;

            document.body.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));

            const dismiss = () => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            };

            toast.querySelector('.noti-embed-toast-close').addEventListener('click', dismiss);
            toast.addEventListener('click', () => {
                dismiss();
                this.openDropdown();
            });

            setTimeout(dismiss, 5000);
        }

        openDropdown() {
            const dropdown = document.getElementById('noti-embed-dropdown');
            if (dropdown) {
                this.isOpen = true;
                dropdown.classList.add('show');
                this.fetchNotifications();
            }
        }

        closeDropdown() {
            const dropdown = document.getElementById('noti-embed-dropdown');
            if (dropdown) {
                this.isOpen = false;
                dropdown.classList.remove('show');
            }
        }

        toggleDropdown() {
            if (this.isMobile) {
                this.openMobilePanel();
            } else if (this.isOpen) {
                this.closeDropdown();
            } else {
                this.openDropdown();
            }
        }

        openMobilePanel() {
            let panel = document.getElementById('noti-embed-mobile-panel');
            if (!panel) {
                panel = document.createElement('div');
                panel.id = 'noti-embed-mobile-panel';
                panel.className = 'noti-embed-mobile-panel';
                panel.innerHTML = `
          <div class="noti-embed-mobile-overlay"></div>
          <div class="noti-embed-mobile-content">
            ${this.renderDropdown().replace('noti-embed-dropdown', 'noti-embed-mobile-dropdown')}
          </div>
        `;
                document.body.appendChild(panel);

                panel.querySelector('.noti-embed-mobile-overlay').addEventListener('click', () => this.closeMobilePanel());
                panel.querySelector('#noti-embed-close')?.addEventListener('click', () => this.closeMobilePanel());
                panel.querySelector('#noti-embed-mark-all')?.addEventListener('click', () => this.markAllAsRead());
                panel.querySelector('#noti-embed-delete-all')?.addEventListener('click', () => this.deleteAllNotifications());
            }

            requestAnimationFrame(() => panel.classList.add('show'));
            this.fetchNotifications();

            const mobileList = panel.querySelector('.noti-embed-list');
            if (mobileList) {
                mobileList.id = 'noti-embed-list';
                this.renderNotifications();
            }
        }

        closeMobilePanel() {
            const panel = document.getElementById('noti-embed-mobile-panel');
            if (panel) {
                panel.classList.remove('show');
            }
        }

        attachEventListeners() {
            document.getElementById('noti-embed-bell')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });

            document.getElementById('noti-embed-close')?.addEventListener('click', () => this.closeDropdown());
            document.getElementById('noti-embed-mark-all')?.addEventListener('click', () => this.markAllAsRead());
            document.getElementById('noti-embed-delete-all')?.addEventListener('click', () => this.deleteAllNotifications());

            document.addEventListener('click', (e) => {
                if (this.isOpen && !e.target.closest('#noti-embed-widget') && !e.target.closest('#noti-embed-floating')) {
                    this.closeDropdown();
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeDropdown();
                    this.closeMobilePanel();
                }
            });

            window.addEventListener('resize', () => {
                this.isMobile = window.innerWidth <= this.config.mobileBreakpoint;
            });

            window.addEventListener('auth:tokenReceived', () => {
                this.connect();
            });
        }

        formatTime(timestamp) {
            const now = new Date();
            const time = new Date(timestamp);
            const diff = now - time;

            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);

            if (minutes < 1) return 'Vừa xong';
            if (minutes < 60) return `${minutes} phút trước`;
            if (hours < 24) return `${hours} giờ trước`;
            if (days < 7) return `${days} ngày trước`;
            return time.toLocaleDateString('vi-VN');
        }

        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        injectStyles() {
            if (document.getElementById('noti-embed-styles')) return;

            const link = document.createElement('link');
            link.id = 'noti-embed-styles';
            link.rel = 'stylesheet';
            link.href = `${NOTI_SERVICE_URL}/module-frontend/noti-embed.css`;
            document.head.appendChild(link);
        }

        disconnect() {
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
            }
        }

        setToken(token) {
            this.token = token;
            if (this.socket) {
                this.socket.disconnect();
            }
            this.connect();
        }
    }

    const instance = new NotiEmbed();

    global.NotiEmbed = {
        init: (options) => instance.init(options),
        connect: () => instance.connect(),
        disconnect: () => instance.disconnect(),
        setToken: (token) => instance.setToken(token),
        fetchNotifications: () => instance.fetchNotifications(),
        markAsRead: (id) => instance.markAsRead(id),
        markAllAsRead: () => instance.markAllAsRead(),
        deleteNotification: (id) => instance.deleteNotification(id),
        deleteAllNotifications: () => instance.deleteAllNotifications(),
        openDropdown: () => instance.openDropdown(),
        closeDropdown: () => instance.closeDropdown(),
        openMobilePanel: () => instance.openMobilePanel(),
        closeMobilePanel: () => instance.closeMobilePanel(),
        get notifications() { return instance.notifications; },
        get unreadCount() { return instance.unreadCount; },
        get isConnected() { return instance.socket?.connected || false; }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.querySelector('[data-noti-auto-init]')) {
                instance.init();
            }
        });
    } else {
        if (document.querySelector('[data-noti-auto-init]')) {
            instance.init();
        }
    }

})(typeof window !== 'undefined' ? window : this);
