/**
 * QMF Chat Service
 * Business logic layer for chat functionality
 * UI-independent - plugins subscribe to events
 * @version 1.0.0
 */

import { eventBus } from '../../kernel/event-bus.js';
import { realtimeService } from '../realtime/index.js';
import { authService } from '../auth/index.js';
import { chatGraphQL } from '../graphql/client.js';

/**
 * Chat Service
 * Handles: rooms, messages, typing, read receipts, friends
 */
class ChatService {
    constructor() {
        this.rooms = new Map();
        this.activeRoom = null;
        this.friends = [];
        this.friendRequests = { sent: [], received: [] };
        this.blockedUsers = new Set();
        this.unreadCounts = new Map();
        this.typingUsers = new Map(); // roomId -> Set of user IDs
        this.config = null;
    }
    
    /**
     * Initialize chat service
     * @param {Object} config
     * @param {string} config.chatUrl - Chat service URL
     * @param {string} config.friendApiBase - Friend API base URL
     */
    async init(config = {}) {
        this.config = {
            chatUrl: config.chatUrl || 'https://chat.quizzman.com',
            friendApiBase: config.friendApiBase || 'https://chat.quizzman.com/api/friend'
        };
        
        // Connect to chat realtime
        await realtimeService.connect('chat');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadInitialData();
        
        eventBus.emit('chat:initialized');
    }
    
    /**
     * Setup realtime event listeners
     */
    setupEventListeners() {
        // Message events
        eventBus.on('chat:message', this.handleNewMessage.bind(this));
        eventBus.on('chat:message_sent', this.handleMessageSent.bind(this));
        eventBus.on('chat:message_read', this.handleMessageRead.bind(this));
        eventBus.on('chat:messages_read', this.handleMessagesRead.bind(this));
        
        // Typing events
        eventBus.on('chat:typing', this.handleTyping.bind(this));
        eventBus.on('chat:stop_typing', this.handleStopTyping.bind(this));
        
        // Room events
        eventBus.on('chat:room_created', this.handleRoomCreated.bind(this));
        eventBus.on('chat:room_updated', this.handleRoomUpdated.bind(this));
        eventBus.on('chat:user_joined', this.handleUserJoined.bind(this));
        eventBus.on('chat:user_left', this.handleUserLeft.bind(this));
        
        // Friend events
        eventBus.on('chat:friend_request', this.handleFriendRequest.bind(this));
        eventBus.on('chat:friend_accepted', this.handleFriendAccepted.bind(this));
        eventBus.on('chat:friend_removed', this.handleFriendRemoved.bind(this));
        
        // Presence events
        eventBus.on('chat:user_online', this.handleUserOnline.bind(this));
        eventBus.on('chat:user_offline', this.handleUserOffline.bind(this));
        
        // Connection events
        eventBus.on('realtime:connected', this.handleConnected.bind(this));
        eventBus.on('realtime:disconnected', this.handleDisconnected.bind(this));
    }
    
    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            await Promise.all([
                this.loadRooms(),
                this.loadFriends(),
                this.loadFriendRequests(),
                this.loadBlockedUsers()
            ]);
        } catch (error) {
            console.error('[Chat] Error loading initial data:', error);
        }
    }
    
    // ================== ROOMS ==================
    
    /**
     * Load user's chat rooms
     */
    async loadRooms() {
        const token = authService.getToken();
        if (!token) return;
        
        try {
            const data = await chatGraphQL.query(`
                query GetConversations {
                    conversations {
                        roomId
                        room {
                            id
                            name
                            type
                        }
                        lastMessage {
                            content
                            createdAt
                        }
                        unreadCount
                        updatedAt
                    }
                }
            `);
            
            const rooms = data.conversations || [];
            
            rooms.forEach(conv => {
                if (conv.room) {
                    this.rooms.set(conv.room.id, {
                        ...conv.room,
                        unreadCount: conv.unreadCount,
                        lastMessage: conv.lastMessage
                    });
                }
            });
            
            eventBus.emit('chat:rooms-loaded', { rooms: Array.from(this.rooms.values()) });
        } catch (error) {
            console.error('[Chat] Error loading rooms:', error);
        }
    }
    
    /**
     * Get or create direct chat room
     */
    async getDirectRoom(userId) {
        // Check existing rooms
        for (const room of this.rooms.values()) {
            if (room.type === 'direct' && room.members?.includes(userId)) {
                return room;
            }
        }
        
        // Create new room
        try {
            const response = await fetch(`${this.config.chatUrl}/api/rooms/direct`, {
                method: 'POST',
                headers: {
                    ...authService.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: userId })
            });
            
            if (response.ok) {
                const room = await response.json();
                this.rooms.set(room.id, room);
                eventBus.emit('chat:room-created', { room });
                return room;
            }
        } catch (error) {
            console.error('[Chat] Error creating direct room:', error);
        }
        
        return null;
    }
    
    /**
     * Join a room
     */
    async joinRoom(roomId) {
        this.activeRoom = roomId;
        
        // Emit to server
        realtimeService.emit('chat', 'join_room', { room_id: roomId });
        
        // Load messages
        await this.loadMessages(roomId);
        
        // Mark as read
        this.markRoomAsRead(roomId);
        
        eventBus.emit('chat:room-joined', { roomId });
    }
    
    /**
     * Leave current room
     */
    leaveRoom() {
        if (this.activeRoom) {
            realtimeService.emit('chat', 'leave_room', { room_id: this.activeRoom });
            this.activeRoom = null;
            eventBus.emit('chat:room-left');
        }
    }
    
    // ================== MESSAGES ==================
    
    /**
     * Load messages for a room
     */
    async loadMessages(roomId, limit = 50, before = null) {
        try {
            const data = await chatGraphQL.query(`
                query GetMessages($roomId: ID!, $limit: Int, $cursor: String) {
                    messages(roomId: $roomId, limit: $limit, cursor: $cursor) {
                        messages {
                            id
                            roomId
                            senderId
                            content
                            status
                            messageType
                            createdAt
                        }
                        hasMore
                        nextCursor
                    }
                }
            `, { roomId, limit, cursor: before });
            
            const messages = data.messages?.messages || [];
            
            eventBus.emit('chat:messages-loaded', { roomId, messages });
            return messages;
        } catch (error) {
            console.error('[Chat] Error loading messages:', error);
        }
        
        return [];
    }
    
    /**
     * Send a message
     */
    async sendMessage(content, roomId = null) {
        const targetRoom = roomId || this.activeRoom;
        if (!targetRoom) {
            console.error('[Chat] No active room');
            return null;
        }
        
        const message = {
            room_id: targetRoom,
            content: content.trim(),
            type: 'text',
            timestamp: Date.now()
        };
        
        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
            ...message,
            id: tempId,
            sender_id: authService.getUserId(),
            status: 'sending'
        };
        
        eventBus.emit('chat:message-sending', { message: optimisticMessage });
        
        // Send via socket
        realtimeService.emit('chat', 'send_message', message);
        
        // Stop typing
        this.stopTyping(targetRoom);
        
        return optimisticMessage;
    }
    
    /**
     * Handle new message
     */
    handleNewMessage(data) {
        const message = data.message || data;
        const roomId = message.room_id;
        
        // Update unread if not active room
        if (roomId !== this.activeRoom) {
            const count = (this.unreadCounts.get(roomId) || 0) + 1;
            this.unreadCounts.set(roomId, count);
            eventBus.emit('chat:unread-updated', { 
                roomId, 
                count,
                total: this.getTotalUnread()
            });
        }
        
        // Emit for UI
        eventBus.emit('chat:new-message', { message });
    }
    
    handleMessageSent(data) {
        eventBus.emit('chat:message-sent-success', data);
    }
    
    handleMessageRead(data) {
        eventBus.emit('chat:message-read-update', data);
    }
    
    handleMessagesRead(data) {
        const roomId = data.room_id;
        this.unreadCounts.set(roomId, 0);
        eventBus.emit('chat:unread-updated', { 
            roomId, 
            count: 0,
            total: this.getTotalUnread()
        });
    }
    
    /**
     * Mark room as read
     */
    markRoomAsRead(roomId) {
        realtimeService.emit('chat', 'mark_read', { room_id: roomId });
        this.unreadCounts.set(roomId, 0);
    }
    
    /**
     * Get total unread count
     */
    getTotalUnread() {
        let total = 0;
        for (const count of this.unreadCounts.values()) {
            total += count;
        }
        return total;
    }
    
    // ================== TYPING ==================
    
    /**
     * Send typing indicator
     */
    startTyping(roomId = null) {
        const targetRoom = roomId || this.activeRoom;
        if (!targetRoom) return;
        
        realtimeService.emit('chat', 'typing', { room_id: targetRoom });
    }
    
    /**
     * Stop typing indicator
     */
    stopTyping(roomId = null) {
        const targetRoom = roomId || this.activeRoom;
        if (!targetRoom) return;
        
        realtimeService.emit('chat', 'stop_typing', { room_id: targetRoom });
    }
    
    handleTyping(data) {
        const { room_id, user_id, user_name } = data;
        
        if (!this.typingUsers.has(room_id)) {
            this.typingUsers.set(room_id, new Set());
        }
        
        this.typingUsers.get(room_id).add(user_id);
        
        eventBus.emit('chat:typing-update', {
            roomId: room_id,
            users: Array.from(this.typingUsers.get(room_id)),
            userName: user_name
        });
    }
    
    handleStopTyping(data) {
        const { room_id, user_id } = data;
        
        if (this.typingUsers.has(room_id)) {
            this.typingUsers.get(room_id).delete(user_id);
            
            eventBus.emit('chat:typing-update', {
                roomId: room_id,
                users: Array.from(this.typingUsers.get(room_id))
            });
        }
    }
    
    // ================== FRIENDS ==================
    
    /**
     * Load friends list
     */
    async loadFriends() {
        try {
            const data = await chatGraphQL.query(`
                query GetFriends {
                    friends {
                        id
                        name
                        avatar
                        online
                        createdAt
                    }
                }
            `);
            
            this.friends = data.friends || [];
            eventBus.emit('chat:friends-loaded', { friends: this.friends });
        } catch (error) {
            console.error('[Chat] Error loading friends:', error);
        }
    }
    
    /**
     * Load friend requests
     */
    async loadFriendRequests() {
        try {
            const data = await chatGraphQL.query(`
                query GetFriendRequests {
                    friendRequestsSent {
                        id
                        receiverId
                        message
                        status
                        createdAt
                    }
                    friendRequestsReceived {
                        id
                        senderId
                        message
                        status
                        createdAt
                    }
                }
            `);
            
            this.friendRequests = {
                sent: data.friendRequestsSent || [],
                received: data.friendRequestsReceived || []
            };
            eventBus.emit('chat:friend-requests-loaded', this.friendRequests);
        } catch (error) {
            console.error('[Chat] Error loading friend requests:', error);
        }
    }
    
    /**
     * Search users
     */
    async searchUsers(query) {
        try {
            const response = await fetch(
                `${this.config.friendApiBase}/search?q=${encodeURIComponent(query)}`,
                { headers: authService.getAuthHeaders() }
            );
            
            if (response.ok) {
                const data = await response.json();
                return data.users || data;
            }
        } catch (error) {
            console.error('[Chat] Error searching users:', error);
        }
        
        return [];
    }
    
    /**
     * Send friend request
     */
    async sendFriendRequest(userId) {
        try {
            const response = await fetch(`${this.config.friendApiBase}/request`, {
                method: 'POST',
                headers: {
                    ...authService.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: userId })
            });
            
            if (response.ok) {
                eventBus.emit('chat:friend-request-sent', { userId });
                return true;
            }
        } catch (error) {
            console.error('[Chat] Error sending friend request:', error);
        }
        
        return false;
    }
    
    /**
     * Accept friend request
     */
    async acceptFriendRequest(requestId) {
        try {
            const response = await fetch(`${this.config.friendApiBase}/request/${requestId}/accept`, {
                method: 'POST',
                headers: authService.getAuthHeaders()
            });
            
            if (response.ok) {
                await this.loadFriends();
                await this.loadFriendRequests();
                return true;
            }
        } catch (error) {
            console.error('[Chat] Error accepting friend request:', error);
        }
        
        return false;
    }
    
    /**
     * Decline friend request
     */
    async declineFriendRequest(requestId) {
        try {
            const response = await fetch(`${this.config.friendApiBase}/request/${requestId}/decline`, {
                method: 'POST',
                headers: authService.getAuthHeaders()
            });
            
            if (response.ok) {
                await this.loadFriendRequests();
                return true;
            }
        } catch (error) {
            console.error('[Chat] Error declining friend request:', error);
        }
        
        return false;
    }
    
    /**
     * Remove friend
     */
    async removeFriend(friendId) {
        try {
            const response = await fetch(`${this.config.friendApiBase}/remove/${friendId}`, {
                method: 'DELETE',
                headers: authService.getAuthHeaders()
            });
            
            if (response.ok) {
                this.friends = this.friends.filter(f => f.id !== friendId);
                eventBus.emit('chat:friend-removed', { friendId });
                return true;
            }
        } catch (error) {
            console.error('[Chat] Error removing friend:', error);
        }
        
        return false;
    }
    
    // Friend event handlers
    handleFriendRequest(data) {
        this.friendRequests.received.push(data);
        eventBus.emit('chat:friend-request-received', data);
    }
    
    handleFriendAccepted(data) {
        this.friends.push(data.friend);
        eventBus.emit('chat:friend-added', data);
    }
    
    handleFriendRemoved(data) {
        this.friends = this.friends.filter(f => f.id !== data.friend_id);
        eventBus.emit('chat:friend-list-updated', { friends: this.friends });
    }
    
    // ================== BLOCKING ==================
    
    async loadBlockedUsers() {
        try {
            const response = await fetch(`${this.config.chatUrl}/api/blocked`, {
                headers: authService.getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                this.blockedUsers = new Set(data.blocked || []);
            }
        } catch (error) {
            console.error('[Chat] Error loading blocked users:', error);
        }
    }
    
    async blockUser(userId) {
        try {
            const response = await fetch(`${this.config.chatUrl}/api/block`, {
                method: 'POST',
                headers: {
                    ...authService.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: userId })
            });
            
            if (response.ok) {
                this.blockedUsers.add(userId);
                eventBus.emit('chat:user-blocked', { userId });
                return true;
            }
        } catch (error) {
            console.error('[Chat] Error blocking user:', error);
        }
        
        return false;
    }
    
    async unblockUser(userId) {
        try {
            const response = await fetch(`${this.config.chatUrl}/api/unblock`, {
                method: 'POST',
                headers: {
                    ...authService.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: userId })
            });
            
            if (response.ok) {
                this.blockedUsers.delete(userId);
                eventBus.emit('chat:user-unblocked', { userId });
                return true;
            }
        } catch (error) {
            console.error('[Chat] Error unblocking user:', error);
        }
        
        return false;
    }
    
    isBlocked(userId) {
        return this.blockedUsers.has(userId);
    }
    
    // ================== PRESENCE ==================
    
    handleUserOnline(data) {
        const { user_id } = data;
        
        // Update friend status
        const friend = this.friends.find(f => f.id === user_id);
        if (friend) {
            friend.online = true;
            eventBus.emit('chat:friend-online', { userId: user_id });
        }
    }
    
    handleUserOffline(data) {
        const { user_id } = data;
        
        // Update friend status
        const friend = this.friends.find(f => f.id === user_id);
        if (friend) {
            friend.online = false;
            eventBus.emit('chat:friend-offline', { userId: user_id });
        }
    }
    
    // ================== ROOM EVENT HANDLERS ==================
    
    handleRoomCreated(data) {
        this.rooms.set(data.room.id, data.room);
        eventBus.emit('chat:room-list-updated', { rooms: Array.from(this.rooms.values()) });
    }
    
    handleRoomUpdated(data) {
        if (this.rooms.has(data.room.id)) {
            this.rooms.set(data.room.id, { ...this.rooms.get(data.room.id), ...data.room });
            eventBus.emit('chat:room-list-updated', { rooms: Array.from(this.rooms.values()) });
        }
    }
    
    handleUserJoined(data) {
        eventBus.emit('chat:user-joined-room', data);
    }
    
    handleUserLeft(data) {
        eventBus.emit('chat:user-left-room', data);
    }
    
    // ================== CONNECTION ==================
    
    handleConnected({ namespace }) {
        if (namespace === 'chat') {
            eventBus.emit('chat:connected');
        }
    }
    
    handleDisconnected({ namespace }) {
        if (namespace === 'chat') {
            eventBus.emit('chat:disconnected');
        }
    }
    
    // ================== GETTERS ==================
    
    getRooms() {
        return Array.from(this.rooms.values());
    }
    
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    
    getFriends() {
        return this.friends;
    }
    
    getFriendRequests() {
        return this.friendRequests;
    }
    
    getActiveRoom() {
        return this.activeRoom;
    }
}

// Singleton instance
export const chatService = new ChatService();

export default chatService;
