/**
 * QMF Notification Service
 * Business logic layer for notifications
 * UI-independent - plugins subscribe to events
 * @version 1.0.0
 */

import { eventBus } from '../../kernel/event-bus.js';
import { realtimeService } from '../realtime/index.js';
import { authService } from '../auth/index.js';
import { notiGraphQL } from '../graphql/client.js';

/**
 * Notification priority levels
 */
const NotificationPriority = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent'
};

/**
 * Notification categories
 */
const NotificationCategory = {
    SYSTEM: 'system',
    SOCIAL: 'social',         // friends, chat
    CLASSROOM: 'classroom',   // assignments, posts
    CONTENT: 'content',       // homework, quiz
    ACCOUNT: 'account',       // login, password, profile
    GAME: 'game'              // achievements, invites
};

/**
 * Notification Service
 */
class NotificationService {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.preferences = {};
        this.config = null;
    }
    
    /**
     * Initialize notification service
     * @param {Object} config
     * @param {string} config.notiUrl - Notification service URL
     */
    async init(config = {}) {
        this.config = {
            notiUrl: config.notiUrl || 'https://noti.quizzman.com',
            maxNotifications: config.maxNotifications || 100,
            autoMarkRead: config.autoMarkRead !== false
        };
        
        // Connect to notification realtime
        await realtimeService.connect('noti');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadNotifications();
        
        eventBus.emit('noti:initialized');
    }
    
    /**
     * Setup realtime event listeners
     */
    setupEventListeners() {
        // New notification
        eventBus.on('noti:notify:new', this.handleNewNotification.bind(this));
        
        // Unread count update
        eventBus.on('noti:notify:unread-count', this.handleUnreadCount.bind(this));
        
        // Notification responses
        eventBus.on('noti:response:notifications', this.handleNotificationsResponse.bind(this));
        
        // Read events
        eventBus.on('noti:notify:read', this.handleNotificationRead.bind(this));
        eventBus.on('noti:notify:all-read', this.handleAllRead.bind(this));
        
        // Delete events
        eventBus.on('noti:notify:deleted', this.handleNotificationDeleted.bind(this));
        eventBus.on('noti:notify:all-deleted', this.handleAllDeleted.bind(this));
        
        // Connection events
        eventBus.on('realtime:connected', this.handleConnected.bind(this));
        eventBus.on('realtime:disconnected', this.handleDisconnected.bind(this));
    }
    
    // ================== LOAD & FETCH ==================
    
    /**
     * Load notifications from server
     */
    async loadNotifications(limit = 20, offset = 0) {
        // Via socket if connected
        if (realtimeService.isConnected('noti')) {
            realtimeService.emit('noti', 'request:notifications', { limit, offset });
            return;
        }
        
        // Fallback to GraphQL
        try {
            const data = await notiGraphQL.query(`
                query GetNotifications($limit: Int, $offset: Int) {
                    notifications(limit: $limit, offset: $offset) {
                        id
                        type
                        title
                        message
                        data
                        read
                        priority
                        createdAt
                    }
                    notificationCount {
                        total
                        unread
                    }
                }
            `, { limit, offset });
            
            this.notifications = data.notifications || [];
            this.unreadCount = data.notificationCount?.unread || this.countUnread();
            
            eventBus.emit('noti:loaded', {
                notifications: this.notifications,
                unreadCount: this.unreadCount
            });
        } catch (error) {
            console.error('[Noti] Error loading notifications:', error);
        }
    }
    
    /**
     * Load more notifications (pagination)
     */
    async loadMore() {
        const offset = this.notifications.length;
        await this.loadNotifications(20, offset);
    }
    
    // ================== MARK READ ==================
    
    /**
     * Mark single notification as read
     */
    async markAsRead(notificationId) {
        if (realtimeService.isConnected('noti')) {
            realtimeService.emit('noti', 'mark:read', { notification_id: notificationId });
        } else {
            // GraphQL fallback
            try {
                await notiGraphQL.mutate(`
                    mutation MarkRead($id: ID!) {
                        markNotificationRead(id: $id)
                    }
                `, { id: notificationId });
            } catch (error) {
                console.error('[Noti] Error marking as read:', error);
            }
        }
        
        // Optimistic update
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.is_read) {
            notification.is_read = true;
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            
            eventBus.emit('noti:updated', {
                notifications: this.notifications,
                unreadCount: this.unreadCount
            });
        }
    }
    
    /**
     * Mark all notifications as read
     */
    async markAllAsRead() {
        if (realtimeService.isConnected('noti')) {
            realtimeService.emit('noti', 'mark:all-read', {});
        } else {
            try {
                await notiGraphQL.mutate(`
                    mutation MarkAllRead {
                        markAllNotificationsRead
                    }
                `);
            } catch (error) {
                console.error('[Noti] Error marking all as read:', error);
            }
        }
        
        // Optimistic update
        this.notifications.forEach(n => n.is_read = true);
        this.unreadCount = 0;
        
        eventBus.emit('noti:updated', {
            notifications: this.notifications,
            unreadCount: 0
        });
    }
    
    // ================== DELETE ==================
    
    /**
     * Delete single notification
     */
    deleteNotification(notificationId) {
        if (realtimeService.isConnected('noti')) {
            realtimeService.emit('noti', 'delete:notification', { notification_id: notificationId });
        } else {
            fetch(`${this.config.notiUrl}/api/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: authService.getAuthHeaders()
            }).catch(console.error);
        }
        
        // Optimistic update
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.is_read) {
            this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
        
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        
        eventBus.emit('noti:updated', {
            notifications: this.notifications,
            unreadCount: this.unreadCount
        });
    }
    
    /**
     * Delete all notifications
     */
    deleteAll() {
        if (realtimeService.isConnected('noti')) {
            realtimeService.emit('noti', 'delete:all', {});
        } else {
            fetch(`${this.config.notiUrl}/api/notifications`, {
                method: 'DELETE',
                headers: authService.getAuthHeaders()
            }).catch(console.error);
        }
        
        this.notifications = [];
        this.unreadCount = 0;
        
        eventBus.emit('noti:updated', {
            notifications: [],
            unreadCount: 0
        });
    }
    
    // ================== FILTERING ==================
    
    /**
     * Get notifications by category
     */
    getByCategory(category) {
        return this.notifications.filter(n => this.getCategory(n) === category);
    }
    
    /**
     * Get unread notifications
     */
    getUnread() {
        return this.notifications.filter(n => !n.is_read);
    }
    
    /**
     * Get notification category from type
     */
    getCategory(notification) {
        const type = notification.type || '';
        
        if (type.startsWith('id_sys')) return NotificationCategory.ACCOUNT;
        if (type.startsWith('classroom')) return NotificationCategory.CLASSROOM;
        if (type.startsWith('cms_sys')) return NotificationCategory.CONTENT;
        if (type.startsWith('chat') || type.startsWith('friend')) return NotificationCategory.SOCIAL;
        if (type.startsWith('game') || type.startsWith('achievement')) return NotificationCategory.GAME;
        
        return NotificationCategory.SYSTEM;
    }
    
    /**
     * Group notifications by category
     */
    groupByCategory() {
        const groups = {};
        
        for (const notification of this.notifications) {
            const category = this.getCategory(notification);
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(notification);
        }
        
        return groups;
    }
    
    // ================== EVENT HANDLERS ==================
    
    handleNewNotification(data) {
        const notification = data.notification || data;
        
        // Add to list
        this.notifications.unshift(notification);
        
        // Trim if too many
        if (this.notifications.length > this.config.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.config.maxNotifications);
        }
        
        // Update unread
        if (!notification.is_read) {
            this.unreadCount++;
        }
        
        // Emit events
        eventBus.emit('noti:new', { notification });
        eventBus.emit('noti:updated', {
            notifications: this.notifications,
            unreadCount: this.unreadCount
        });
        
        // Show toast based on priority
        this.showNotificationToast(notification);
    }
    
    handleUnreadCount(data) {
        const count = typeof data === 'number' ? data : (data.count || 0);
        this.unreadCount = count;
        
        eventBus.emit('noti:unread-changed', { count });
    }
    
    handleNotificationsResponse(data) {
        this.notifications = data.notifications || [];
        this.unreadCount = this.countUnread();
        
        eventBus.emit('noti:loaded', {
            notifications: this.notifications,
            unreadCount: this.unreadCount
        });
    }
    
    handleNotificationRead(data) {
        const id = data.notification_id || data;
        const notification = this.notifications.find(n => n.id === id);
        
        if (notification && !notification.is_read) {
            notification.is_read = true;
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            
            eventBus.emit('noti:updated', {
                notifications: this.notifications,
                unreadCount: this.unreadCount
            });
        }
    }
    
    handleAllRead() {
        this.notifications.forEach(n => n.is_read = true);
        this.unreadCount = 0;
        
        eventBus.emit('noti:updated', {
            notifications: this.notifications,
            unreadCount: 0
        });
    }
    
    handleNotificationDeleted(data) {
        const id = data.notification_id || data;
        const notification = this.notifications.find(n => n.id === id);
        
        if (notification && !notification.is_read) {
            this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
        
        this.notifications = this.notifications.filter(n => n.id !== id);
        
        eventBus.emit('noti:updated', {
            notifications: this.notifications,
            unreadCount: this.unreadCount
        });
    }
    
    handleAllDeleted() {
        this.notifications = [];
        this.unreadCount = 0;
        
        eventBus.emit('noti:updated', {
            notifications: [],
            unreadCount: 0
        });
    }
    
    handleConnected({ namespace }) {
        if (namespace === 'noti') {
            // Fetch notifications after connection
            setTimeout(() => this.loadNotifications(), 100);
            eventBus.emit('noti:connected');
        }
    }
    
    handleDisconnected({ namespace }) {
        if (namespace === 'noti') {
            eventBus.emit('noti:disconnected');
        }
    }
    
    // ================== TOAST ==================
    
    /**
     * Show toast for notification
     */
    showNotificationToast(notification) {
        const priority = notification.priority || NotificationPriority.NORMAL;
        
        // Only show toast for high priority notifications
        if (priority === NotificationPriority.LOW) return;
        
        eventBus.emit('toast:show', {
            type: priority === NotificationPriority.URGENT ? 'warning' : 'info',
            title: notification.title || 'Notification',
            message: notification.message || notification.body,
            duration: priority === NotificationPriority.URGENT ? 10000 : 5000,
            action: notification.action_url ? {
                label: 'View',
                onClick: () => {
                    window.location.href = notification.action_url;
                }
            } : null
        });
    }
    
    // ================== HELPERS ==================
    
    countUnread() {
        return this.notifications.filter(n => !n.is_read).length;
    }
    
    getNotifications() {
        return this.notifications;
    }
    
    getUnreadCount() {
        return this.unreadCount;
    }
    
    /**
     * Format notification time
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Vừa xong';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} ngày trước`;
        
        return date.toLocaleDateString('vi-VN');
    }
    
    /**
     * Get notification icon by type
     */
    getIcon(notification) {
        const category = this.getCategory(notification);
        
        const icons = {
            [NotificationCategory.SYSTEM]: 'bell',
            [NotificationCategory.SOCIAL]: 'users',
            [NotificationCategory.CLASSROOM]: 'school',
            [NotificationCategory.CONTENT]: 'file-text',
            [NotificationCategory.ACCOUNT]: 'user',
            [NotificationCategory.GAME]: 'gamepad-2'
        };
        
        return icons[category] || 'bell';
    }
}

// Singleton instance
export const notificationService = new NotificationService();

export { NotificationPriority, NotificationCategory };
export default notificationService;
