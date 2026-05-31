/**
 * Unified Notification UI Module
 * Import this module in any frontend to get notification functionality
 * Automatically connects to notification service and manages state
 */

class NotificationManager {
  // Debug flag - set to true to enable console logs
  static DEBUG = false;
  
  static log(...args) {
    if (NotificationManager.DEBUG) {
      console.log(...args);
    }
  }
  
  static warn(...args) {
    if (NotificationManager.DEBUG) {
      console.warn(...args);
    }
  }
  
  static error(...args) {
    // Always log errors
    console.error(...args);
  }
  
  constructor(options = {}) {
    this.serviceUrl = options.serviceUrl || 'https://noti.quizzman.com';
    this.socket = null;
    this.token = options.token || null;
    this.userId = options.userId || null;
    this.notifications = [];
    this.unreadCount = 0;
    this.callbacks = {
      onNewNotification: [],
      onUnreadCountChange: [],
      onNotificationsUpdate: [],
      onConnect: [],
      onDisconnect: [],
    };
    
    // Enable debug mode via options
    if (options.debug) {
      NotificationManager.DEBUG = true;
    }
    
    // Auto-initialize if token provided
    if (this.token) {
      this.connect();
    }
  }

  // Connect to notification service via WebSocket
  connect() {
    if (!this.token) {
      NotificationManager.error('[NotificationManager] Token required for connection');
      return;
    }

    // Load Socket.IO client if not already loaded
    if (typeof io === 'undefined') {
      this.loadSocketIO(() => this.initSocket());
    } else {
      this.initSocket();
    }
  }

  loadSocketIO(callback) {
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.6.1/socket.io.min.js';
    script.onload = callback;
    document.head.appendChild(script);
  }

  initSocket() {
    this.socket = io(this.serviceUrl, {
      auth: { token: this.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 3,
      timeout: 10000,
      forceNew: true
    });

    // Connection events
    this.socket.on('connect', () => {
      NotificationManager.log('[NotificationManager] Connected, socket.connected:', this.socket.connected);
      this.trigger('onConnect');
      // Execute any pending fetch request
      this._executePendingFetch();
      // Fetch notifications on connect with small delay to ensure socket is ready
      setTimeout(() => {
        NotificationManager.log('[NotificationManager] Auto-fetching notifications after connect');
        this.fetchNotifications();
      }, 100);
    });

    this.socket.on('disconnect', () => {
      NotificationManager.log('[NotificationManager] Disconnected');
      this.trigger('onDisconnect');
    });

    this.socket.on('connect_error', (error) => {
      NotificationManager.error('[NotificationManager] Connection error:', error.message);
      NotificationManager.error('[NotificationManager] Service URL:', this.serviceUrl);
      NotificationManager.error('[NotificationManager] Token available:', !!this.token);
    });

    this.socket.on('reconnect_failed', () => {
      NotificationManager.error('[NotificationManager] Reconnection failed after max attempts');
    });

    // Notification events - match server event names
    this.socket.on('notify:new', (data) => {
      NotificationManager.log('[NotificationManager] New notification:', data);
      const notification = data.notification || data;
      this.notifications.unshift(notification);
      this.trigger('onNewNotification', notification);
      this.trigger('onNotificationsUpdate', this.notifications);
    });

    this.socket.on('notify:unread-count', (data) => {
      const count = typeof data === 'number' ? data : (data.count || 0);
      this.unreadCount = count;
      this.trigger('onUnreadCountChange', count);
    });

    this.socket.on('response:notifications', (data) => {
      NotificationManager.log('[NotificationManager] Notifications received:', data);
      this.notifications = data.notifications || [];
      this.trigger('onNotificationsUpdate', this.notifications);
    });

    this.socket.on('notify:read', (data) => {
      const notificationId = data.notification_id || data;
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.is_read = true;
        this.trigger('onNotificationsUpdate', this.notifications);
      }
    });

    this.socket.on('notify:all-read', () => {
      this.notifications.forEach(n => n.is_read = true);
      this.trigger('onNotificationsUpdate', this.notifications);
    });

    // Handle delete events
    this.socket.on('notify:deleted', (data) => {
      const notificationId = data.notification_id || data;
      this.notifications = this.notifications.filter(n => n.id !== notificationId);
      this.trigger('onNotificationsUpdate', this.notifications);
    });

    this.socket.on('notify:all-deleted', () => {
      this.notifications = [];
      this.trigger('onNotificationsUpdate', this.notifications);
    });

    this.socket.on('delete:success', (data) => {
      NotificationManager.log('[NotificationManager] Delete success:', data);
    });

    this.socket.on('delete:all-success', (data) => {
      NotificationManager.log('[NotificationManager] Delete all success:', data);
      this.notifications = [];
      this.trigger('onNotificationsUpdate', this.notifications);
    });
  }

  // Event callbacks
  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
    }
  }

  trigger(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(data));
    }
  }

  // Actions - use correct socket event names
  fetchNotifications(limit = 20, offset = 0) {
    NotificationManager.log('[NotificationManager] fetchNotifications called, socket connected:', this.socket?.connected);
    if (this.socket && this.socket.connected) {
      NotificationManager.log('[NotificationManager] Emitting request:notifications', { limit, offset });
      this.socket.emit('request:notifications', { limit, offset });
    } else {
      NotificationManager.warn('[NotificationManager] Socket not connected, will retry when connected');
      // Store pending request and execute when connected
      this._pendingFetch = { limit, offset };
      // Also try to reconnect if socket exists
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }
  }
  
  // Helper to execute pending fetch after connection
  _executePendingFetch() {
    if (this._pendingFetch) {
      const { limit, offset } = this._pendingFetch;
      this._pendingFetch = null;
      this.fetchNotifications(limit, offset);
    }
  }

  markAsRead(notificationId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('mark:read', { notification_id: notificationId });
    }
  }

  markAllAsRead() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('mark:all-read');
    }
  }

  // Delete notification
  deleteNotification(notificationId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('delete:notification', { notification_id: notificationId });
    }
  }

  // Delete all notifications
  deleteAllNotifications() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('delete:all');
    }
  }

  // REST API fallback methods
  async fetchNotificationsAPI(limit = 20, offset = 0) {
    try {
      const response = await fetch(
        `${this.serviceUrl}/api/notifications/${this.userId}?limit=${limit}&offset=${offset}`
      );
      const data = await response.json();
      if (data.success) {
        this.notifications = data.notifications;
        this.trigger('onNotificationsUpdate', data.notifications);
      }
      return data;
    } catch (error) {
      NotificationManager.error('[NotificationManager] Fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  async getUnreadCount() {
    try {
      const response = await fetch(
        `${this.serviceUrl}/api/notifications/${this.userId}/unread-count`
      );
      const data = await response.json();
      if (data.success) {
        this.unreadCount = data.count;
        this.trigger('onUnreadCountChange', data.count);
      }
      return data;
    } catch (error) {
      NotificationManager.error('[NotificationManager] Unread count error:', error);
      return { success: false, error: error.message };
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Notification UI Component
class NotificationUI {
  constructor(manager, container) {
    this.manager = manager;
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!this.container) {
      console.error('[NotificationUI] Container not found');
      return;
    }

    this.isExpanded = false;
    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
    
    // Listen to manager events
    this.manager.on('onUnreadCountChange', (count) => this.updateBadge(count));
    this.manager.on('onNotificationsUpdate', (notifications) => this.updateList(notifications));
    this.manager.on('onNewNotification', (notification) => this.showToast(notification));
  }

  render() {
    const isMobile = this.container.id === 'mobileNotificationContainer';
    
    this.container.innerHTML = `
      <div class="notification-widget${isMobile ? ' mobile-widget' : ''}">
        <button class="noti-bell-btn action-btn" id="noti-bell" title="Thông báo">
          <i class="fas fa-bell"></i>
          <span class="noti-badge" id="noti-badge" style="display: none;">0</span>
        </button>
        
        <div class="noti-dropdown" id="noti-dropdown">
          <div class="noti-header">
            <h3><i class="fas fa-bell"></i> Thông báo</h3>
            <div class="noti-header-actions">
              <button class="noti-mark-all" id="noti-mark-all" title="Đánh dấu tất cả đã đọc">
                <i class="fas fa-check-double"></i>
                <span class="btn-text">Đã đọc</span>
              </button>
              <button class="noti-delete-all" id="noti-delete-all" title="Xóa tất cả thông báo">
                <i class="fas fa-trash-alt"></i>
                <span class="btn-text">Xóa tất cả</span>
              </button>
              <button class="noti-close-btn" id="noti-close" title="Đóng">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          
          <div class="noti-list" id="noti-list">
            <div class="noti-loading">
              <div class="noti-spinner"></div>
              <span>Đang tải thông báo...</span>
            </div>
          </div>
          
          <div class="noti-footer">
            <a href="/notifications" class="noti-view-all">
              <i class="fas fa-list"></i>
              Xem tất cả thông báo
            </a>
          </div>
        </div>
      </div>
    `;

    this.injectStyles();
  }

  injectStyles() {
    if (document.getElementById('noti-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'noti-ui-styles';
    style.textContent = `
      .notification-widget {
        position: relative;
        display: inline-block;
      }
      
      .noti-bell-btn {
        position: relative;
        background: rgba(255, 255, 255, 0.15) !important;
        border: none !important;
        cursor: pointer;
        padding: 0 !important;
        width: 44px !important;
        height: 44px !important;
        border-radius: 12px !important;
        transition: all 0.3s ease;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: white !important;
        backdrop-filter: blur(10px);
      }
      
      .noti-bell-btn:hover {
        background: rgba(255, 255, 255, 0.25) !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .noti-bell-btn i {
        font-size: 1.125rem !important;
        color: white !important;
      }
      
      .noti-badge {
        position: absolute;
        top: 2px;
        right: 2px;
        background: linear-gradient(135deg, #ff4444, #ff6b6b);
        color: white;
        border-radius: 12px;
        padding: 2px 6px;
        font-size: 10px;
        font-weight: bold;
        min-width: 18px;
        text-align: center;
        box-shadow: 0 2px 6px rgba(255, 68, 68, 0.4);
        border: 2px solid rgba(255, 255, 255, 0.3);
        animation: pulse-badge 2s infinite;
      }
      
      @keyframes pulse-badge {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      
      .noti-dropdown {
        position: fixed;
        top: 70px;
        right: 20px;
        width: 380px;
        max-height: 520px;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.05);
        z-index: 99999;
        display: none;
        flex-direction: column;
        overflow: hidden;
        animation: dropdownSlideIn 0.3s ease;
      }
      
      .noti-dropdown.show {
        display: flex !important;
      }
      
      @keyframes dropdownSlideIn {
        from {
          opacity: 0;
          transform: translateY(-10px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      .noti-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      .noti-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .noti-header h3 i {
        font-size: 18px;
      }
      
      .noti-header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .noti-mark-all {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        cursor: pointer;
        font-size: 12px;
        padding: 8px;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        position: relative;
        overflow: visible;
      }
      
      .noti-mark-all .btn-text,
      .noti-delete-all .btn-text {
        position: absolute;
        right: 100%;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0, 0, 0, 0.8);
        padding: 4px 10px;
        border-radius: 6px;
        white-space: nowrap;
        font-size: 11px;
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s ease;
        margin-right: 8px;
        pointer-events: none;
      }
      
      .noti-mark-all:hover .btn-text,
      .noti-delete-all:hover .btn-text {
        opacity: 1;
        visibility: visible;
      }
      
      .noti-mark-all:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
      }
      
      .noti-delete-all {
        background: rgba(255, 100, 100, 0.3);
        border: none;
        color: white;
        cursor: pointer;
        font-size: 12px;
        padding: 8px;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        position: relative;
        overflow: visible;
      }
      
      .noti-delete-all:hover {
        background: rgba(255, 100, 100, 0.5);
        transform: scale(1.1);
      }
      
      .noti-close-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        cursor: pointer;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .noti-close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: rotate(90deg);
      }
      
      .noti-list {
        flex: 1;
        overflow-y: auto;
        max-height: 380px;
        padding: 8px 0;
      }
      
      .noti-list::-webkit-scrollbar {
        width: 6px;
      }
      
      .noti-list::-webkit-scrollbar-track {
        background: #f1f1f1;
      }
      
      .noti-list::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 3px;
      }
      
      .noti-item {
        padding: 14px 20px;
        cursor: pointer;
        transition: all 0.2s ease;
        border-left: 3px solid transparent;
        margin: 0 8px;
        border-radius: 8px;
      }
      
      .noti-item:hover {
        background: #f8f9fa;
      }
      
      .noti-item.unread {
        background: linear-gradient(90deg, rgba(102, 126, 234, 0.08), transparent);
        border-left-color: #667eea;
      }
      
      .noti-item.unread:hover {
        background: linear-gradient(90deg, rgba(102, 126, 234, 0.12), rgba(248, 249, 250, 0.8));
      }
      
      .noti-item-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 6px;
      }
      
      .noti-item-icon {
        font-size: 24px;
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #f0f4ff, #e8ecff);
        border-radius: 10px;
      }
      
      .noti-item-content {
        flex: 1;
        min-width: 0;
      }
      
      .noti-item-title {
        font-weight: 600;
        font-size: 14px;
        color: #1a1a2e;
        margin-bottom: 4px;
        line-height: 1.4;
      }
      
      .noti-item-time {
        font-size: 11px;
        color: #888;
        flex-shrink: 0;
      }
      
      .noti-item-message {
        font-size: 13px;
        color: #555;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .noti-footer {
        padding: 12px 20px;
        text-align: center;
        border-top: 1px solid #eee;
        background: #fafbfc;
      }
      
      .noti-view-all {
        color: #667eea;
        text-decoration: none;
        font-size: 13px;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 20px;
        transition: all 0.2s ease;
      }
      
      .noti-view-all:hover {
        background: rgba(102, 126, 234, 0.1);
        color: #5a67d8;
      }
      
      .noti-loading, .noti-empty {
        padding: 40px 20px;
        text-align: center;
        color: #888;
      }
      
      .noti-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      
      .noti-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #f0f0f0;
        border-top-color: #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .noti-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      
      .noti-empty i {
        font-size: 48px;
        color: #ddd;
      }
      
      .noti-empty span {
        font-size: 14px;
        color: #888;
      }
      
      .noti-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        z-index: 100000;
        max-width: 360px;
        animation: toastSlideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        border-left: 4px solid #667eea;
      }
      
      @keyframes toastSlideIn {
        from {
          transform: translateX(400px) scale(0.8);
          opacity: 0;
        }
        to {
          transform: translateX(0) scale(1);
          opacity: 1;
        }
      }
      
      /* Mobile Styles */
      .mobile-notification-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 99999;
        display: none;
        pointer-events: none;
      }
      
      .mobile-notification-container.active {
        display: block !important;
        pointer-events: auto;
      }
      
      #mobileNotificationContainer .notification-widget {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 99999 !important;
        background: rgba(0, 0, 0, 0.5) !important;
        display: none;
        align-items: center !important;
        justify-content: center !important;
        padding: 20px !important;
        pointer-events: auto;
      }
      
      #mobileNotificationContainer .notification-widget.show {
        display: flex !important;
      }
      
      #mobileNotificationContainer .noti-bell-btn {
        display: none !important;
      }
      
      #mobileNotificationContainer .noti-dropdown {
        position: relative !important;
        top: auto !important;
        right: auto !important;
        width: 100% !important;
        max-width: 420px !important;
        max-height: 80vh !important;
        margin: auto !important;
        display: flex !important;
        border-radius: 20px;
      }
      
      @media (max-width: 768px) {
        .noti-dropdown {
          position: fixed !important;
          top: 10px !important;
          left: 10px !important;
          right: 10px !important;
          width: auto !important;
          max-height: calc(100vh - 20px);
          border-radius: 20px;
        }
        
        .noti-mark-all span {
          display: none;
        }
      }
      
      /* Improved Notification Item Styles */
      .noti-item-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      
      .noti-item-icon-wrapper {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-size: 18px;
      }
      
      .noti-item-icon-wrapper.type-assignment { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
      .noti-item-icon-wrapper.type-homework { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
      .noti-item-icon-wrapper.type-class { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
      .noti-item-icon-wrapper.type-message { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
      .noti-item-icon-wrapper.type-friend { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
      .noti-item-icon-wrapper.type-event { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #333; }
      .noti-item-icon-wrapper.type-grade { background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); color: #333; }
      .noti-item-icon-wrapper.type-announcement { background: linear-gradient(135deg, #ff0844 0%, #ffb199 100%); }
      .noti-item-icon-wrapper.type-warning { background: linear-gradient(135deg, #f5af19 0%, #f12711 100%); }
      .noti-item-icon-wrapper.type-success { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
      .noti-item-icon-wrapper.type-info { background: linear-gradient(135deg, #2196f3 0%, #21cbf3 100%); }
      
      .noti-item-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 6px;
        font-size: 11px;
      }
      
      .noti-item-time {
        color: #888;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .noti-item-time i {
        font-size: 10px;
      }
      
      .noti-item-new {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .noti-item-expand {
        width: 32px;
        height: 32px;
        border: none;
        background: rgba(102, 126, 234, 0.1);
        color: #667eea;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;
        margin-left: auto;
      }
      
      .noti-item-expand:hover {
        background: #667eea;
        color: white;
        transform: translateX(2px);
      }
      
      .noti-item-delete {
        width: 28px;
        height: 28px;
        border: none;
        background: rgba(255, 68, 68, 0.1);
        color: #ff4444;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;
        opacity: 0;
        margin-left: 4px;
      }
      
      .noti-item:hover .noti-item-delete {
        opacity: 1;
      }
      
      .noti-item-delete:hover {
        background: #ff4444;
        color: white;
        transform: scale(1.1);
      }
      
      .noti-item-actions {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
        margin-left: auto;
      }
      
      /* Detail Modal Styles */
      .noti-detail-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 100001;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }
      
      .noti-detail-modal.show {
        opacity: 1;
        visibility: visible;
      }
      
      .noti-detail-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
      }
      
      .noti-detail-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.9);
        width: 90%;
        max-width: 480px;
        background: white;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      
      .noti-detail-modal.show .noti-detail-content {
        transform: translate(-50%, -50%) scale(1);
      }
      
      .noti-detail-header {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      .noti-detail-header.type-assignment { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
      .noti-detail-header.type-homework { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
      .noti-detail-header.type-message { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
      .noti-detail-header.type-friend { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
      .noti-detail-header.type-warning { background: linear-gradient(135deg, #f5af19 0%, #f12711 100%); }
      .noti-detail-header.type-success { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
      
      .noti-detail-icon {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        flex-shrink: 0;
      }
      
      .noti-detail-header-text {
        flex: 1;
        min-width: 0;
      }
      
      .noti-detail-header-text h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
        line-height: 1.4;
      }
      
      .noti-detail-time {
        font-size: 13px;
        opacity: 0.9;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .noti-detail-close {
        width: 36px;
        height: 36px;
        border: none;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      
      .noti-detail-close:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: rotate(90deg);
      }
      
      .noti-detail-body {
        padding: 24px;
        font-size: 15px;
        line-height: 1.7;
        color: #333;
      }
      
      .noti-detail-body p {
        margin: 0;
        white-space: pre-wrap;
      }
      
      .noti-detail-action {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 16px;
        padding: 10px 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        text-decoration: none;
        border-radius: 25px;
        font-weight: 500;
        font-size: 14px;
        transition: all 0.2s ease;
      }
      
      .noti-detail-action:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
      
      .noti-detail-footer {
        padding: 16px 24px;
        background: #f8f9fa;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: flex-end;
      }
      
      .noti-detail-dismiss {
        padding: 10px 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 25px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
      }
      
      .noti-detail-dismiss:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
      
      @media (max-width: 480px) {
        .noti-detail-content {
          width: 95%;
          border-radius: 16px;
        }
        
        .noti-detail-header {
          padding: 20px;
        }
        
        .noti-detail-icon {
          width: 48px;
          height: 48px;
          font-size: 20px;
        }
        
        .noti-detail-header-text h3 {
          font-size: 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  attachEventListeners() {
    const bell = this.container.querySelector('#noti-bell');
    const dropdown = this.container.querySelector('#noti-dropdown');
    const markAll = this.container.querySelector('#noti-mark-all');
    const deleteAll = this.container.querySelector('#noti-delete-all');
    const closeBtn = this.container.querySelector('#noti-close');
    const isMobile = this.container.id === 'mobileNotificationContainer';

    // Close dropdown function
    const closeDropdown = () => {
      this.isExpanded = false;
      dropdown.classList.remove('show');
      if (isMobile) {
        const widget = this.container.querySelector('.notification-widget');
        if (widget) {
          widget.classList.remove('show');
          this.container.classList.remove('active');
        }
      }
    };

    // Open dropdown function
    const openDropdown = () => {
      this.isExpanded = true;
      dropdown.classList.add('show');
      this.manager.fetchNotifications();
    };

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeDropdown();
      });
    }

    if (isMobile) {
      // Mobile: Create toggle function and overlay click handler
      this.toggleMobileNotification = () => {
        const widget = this.container.querySelector('.notification-widget');
        const isVisible = widget?.classList.contains('show');
        
        if (widget) {
          if (isVisible) {
            widget.classList.remove('show');
            this.container.classList.remove('active');
            dropdown.classList.remove('show');
          } else {
            widget.classList.add('show');
            this.container.classList.add('active');
            dropdown.classList.add('show');
            this.manager.fetchNotifications();
          }
        }
      };

      // Make mobile notification accessible globally
      window.toggleMobileNotification = this.toggleMobileNotification;

      // Close when clicking overlay background
      const widget = this.container.querySelector('.notification-widget');
      if (widget) {
        widget.addEventListener('click', (e) => {
          if (e.target === widget) {
            widget.classList.remove('show');
            this.container.classList.remove('active');
            dropdown.classList.remove('show');
          }
        });
      }
    } else {
      // Desktop: Standard dropdown behavior
      if (bell) {
        bell.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.isExpanded) {
            closeDropdown();
          } else {
            openDropdown();
          }
        });
      }

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!this.container.contains(e.target) && this.isExpanded) {
          closeDropdown();
        }
      });
      
      // Close on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isExpanded) {
          closeDropdown();
        }
      });
    }

    if (markAll) {
      markAll.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.markAllAsRead();
        // Visual feedback
        const btn = e.currentTarget;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> <span>Đã đánh dấu!</span>';
        btn.style.background = 'rgba(72, 187, 120, 0.3)';
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.style.background = '';
        }, 1500);
      });
    }

    if (deleteAll) {
      deleteAll.addEventListener('click', (e) => {
        e.stopPropagation();
        // Confirmation dialog
        if (confirm('Bạn có chắc chắn muốn xóa tất cả thông báo?')) {
          this.manager.deleteAllNotifications();
          // Visual feedback
          const btn = e.currentTarget;
          const originalHTML = btn.innerHTML;
          btn.innerHTML = '<i class="fas fa-check"></i> <span>Đã xóa!</span>';
          btn.style.background = 'rgba(72, 187, 120, 0.3)';
          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
          }, 1500);
        }
      });
    }
  }

  updateBadge(count) {
    const badge = this.container.querySelector('#noti-badge');
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }

  updateList(notifications) {
    const list = this.container.querySelector('#noti-list');
    
    if (!notifications || notifications.length === 0) {
      list.innerHTML = `
        <div class="noti-empty">
          <i class="fas fa-bell-slash"></i>
          <span>Không có thông báo mới</span>
        </div>
      `;
      return;
    }

    list.innerHTML = notifications.map((noti, index) => {
      const metadata = noti.metadata || {};
      const icon = this.getNotificationIcon(noti.type || metadata.type);
      const time = this.formatTime(noti.created_at);
      const title = noti.title || 'Thông báo';
      const message = noti.message || '';
      const typeClass = this.getTypeClass(noti.type || metadata.type);
      
      return `
        <div class="noti-item ${!noti.is_read ? 'unread' : ''} ${typeClass}" data-id="${noti.id}" data-index="${index}">
          <div class="noti-item-row">
            <div class="noti-item-icon-wrapper ${typeClass}">
              <i class="${icon}"></i>
            </div>
            <div class="noti-item-content">
              <div class="noti-item-title">${this.escapeHtml(title)}</div>
              <div class="noti-item-message">${this.escapeHtml(message)}</div>
              <div class="noti-item-meta">
                <span class="noti-item-time"><i class="fas fa-clock"></i> ${time}</span>
                ${!noti.is_read ? '<span class="noti-item-new">Mới</span>' : ''}
              </div>
            </div>
            <div class="noti-item-actions">
              <button class="noti-item-expand" title="Xem chi tiết">
                <i class="fas fa-chevron-right"></i>
              </button>
              <button class="noti-item-delete" title="Xóa thông báo" data-id="${noti.id}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click handlers
    list.querySelectorAll('.noti-item').forEach((item, idx) => {
      const expandBtn = item.querySelector('.noti-item-expand');
      const deleteBtn = item.querySelector('.noti-item-delete');
      
      // Expand/detail handler
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = item.dataset.id;
        const index = parseInt(item.dataset.index);
        const notification = notifications[index];
        
        // Mark as read
        this.manager.markAsRead(id);
        item.classList.remove('unread');
        
        // Show detail modal
        this.showDetailModal(notification);
      });
      
      // Delete handler
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(item.dataset.id);
        
        // Animate removal
        item.style.transition = 'all 0.3s ease';
        item.style.opacity = '0';
        item.style.transform = 'translateX(100%)';
        item.style.height = item.offsetHeight + 'px';
        
        setTimeout(() => {
          item.style.height = '0';
          item.style.padding = '0';
          item.style.margin = '0';
        }, 150);
        
        setTimeout(() => {
          this.manager.deleteNotification(id);
        }, 300);
      });
      
      // Click on item (not buttons) to view
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.noti-item-actions')) {
          const id = item.dataset.id;
          const index = parseInt(item.dataset.index);
          const notification = notifications[index];
          
          // Mark as read
          this.manager.markAsRead(id);
          item.classList.remove('unread');
          
          // Show detail modal
          this.showDetailModal(notification);
        }
      });
    });
  }
  
  getNotificationIcon(type) {
    const icons = {
      'assignment': 'fas fa-tasks',
      'homework': 'fas fa-book-open',
      'class': 'fas fa-graduation-cap',
      'message': 'fas fa-comment-dots',
      'friend': 'fas fa-user-plus',
      'event': 'fas fa-calendar-alt',
      'grade': 'fas fa-star',
      'announcement': 'fas fa-bullhorn',
      'reminder': 'fas fa-alarm-clock',
      'system': 'fas fa-cog',
      'warning': 'fas fa-exclamation-triangle',
      'success': 'fas fa-check-circle',
      'info': 'fas fa-info-circle',
      'default': 'fas fa-bell'
    };
    return icons[type] || icons['default'];
  }
  
  getTypeClass(type) {
    const classes = {
      'assignment': 'type-assignment',
      'homework': 'type-homework',
      'class': 'type-class',
      'message': 'type-message',
      'friend': 'type-friend',
      'event': 'type-event',
      'grade': 'type-grade',
      'announcement': 'type-announcement',
      'warning': 'type-warning',
      'success': 'type-success',
      'info': 'type-info'
    };
    return classes[type] || '';
  }
  
  showDetailModal(notification) {
    // Remove existing modal if any
    const existingModal = document.querySelector('.noti-detail-modal');
    if (existingModal) existingModal.remove();
    
    const metadata = notification.metadata || {};
    const icon = this.getNotificationIcon(notification.type || metadata.type);
    const time = this.formatTime(notification.created_at);
    const title = notification.title || 'Thông báo';
    const message = notification.message || '';
    const typeClass = this.getTypeClass(notification.type || metadata.type);
    
    const modal = document.createElement('div');
    modal.className = 'noti-detail-modal';
    modal.innerHTML = `
      <div class="noti-detail-overlay"></div>
      <div class="noti-detail-content">
        <div class="noti-detail-header ${typeClass}">
          <div class="noti-detail-icon ${typeClass}">
            <i class="${icon}"></i>
          </div>
          <div class="noti-detail-header-text">
            <h3>${this.escapeHtml(title)}</h3>
            <span class="noti-detail-time"><i class="fas fa-clock"></i> ${time}</span>
          </div>
          <button class="noti-detail-close" title="Đóng">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="noti-detail-body">
          <p>${this.escapeHtml(message)}</p>
          ${metadata.action_url ? `
            <a href="${metadata.action_url}" class="noti-detail-action">
              <i class="fas fa-external-link-alt"></i>
              ${metadata.action_text || 'Xem chi tiết'}
            </a>
          ` : ''}
        </div>
        <div class="noti-detail-footer">
          <button class="noti-detail-dismiss">
            <i class="fas fa-check"></i>
            Đã hiểu
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add animation
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });
    
    // Close handlers
    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    };
    
    modal.querySelector('.noti-detail-overlay').addEventListener('click', closeModal);
    modal.querySelector('.noti-detail-close').addEventListener('click', closeModal);
    modal.querySelector('.noti-detail-dismiss').addEventListener('click', closeModal);
    
    // Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }
  
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showToast(notification) {
    const metadata = notification.metadata || {};
    const icon = metadata.icon || '🔔';
    const title = notification.title || 'Thông báo mới';
    const message = notification.message || '';
    
    const toast = document.createElement('div');
    toast.className = 'noti-toast';
    toast.innerHTML = `
      <div style="display: flex; gap: 14px; align-items: flex-start;">
        <div style="font-size: 28px; flex-shrink: 0;">${icon}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; margin-bottom: 6px; color: #1a1a2e; font-size: 15px;">${this.escapeHtml(title)}</div>
          <div style="font-size: 14px; color: #555; line-height: 1.4;">${this.escapeHtml(message)}</div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #999; cursor: pointer; padding: 4px; font-size: 16px;">&times;</button>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      toast.style.animation = 'toastSlideIn 0.3s ease reverse';
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 300);
    }, 5000);
    
    // Click to dismiss
    toast.addEventListener('click', () => {
      toast.style.animation = 'toastSlideIn 0.3s ease reverse';
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 300);
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NotificationManager, NotificationUI };
}

// Global access
window.NotificationManager = NotificationManager;
window.NotificationUI = NotificationUI;
