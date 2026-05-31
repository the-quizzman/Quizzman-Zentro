/**
 * QMF Chat Panel Plugin
 * UI layer for chat - subscribes to chatService events
 * Features: Dropdown panel, popup chat, typing indicator, friend management
 * @version 2.0.0
 */

import { eventBus } from '../../kernel/event-bus.js';
import { getIcon } from '../../assets/icons/icon-loader.js';
import { chatService } from '../../services/chat/index.js';
import { authService } from '../../services/auth/index.js';

/**
 * Chat Panel States
 */
const PanelState = {
    CLOSED: 'closed',
    DROPDOWN: 'dropdown',
    POPUP: 'popup'
};

/**
 * Chat Panel Plugin
 */
class ChatPanel {
    constructor() {
        this.element = null;
        this.popupElement = null;
        this.state = PanelState.CLOSED;
        this.activeConversation = null;
        this.typingTimeout = null;
        this.config = null;
    }
    
    /**
     * Initialize chat panel
     */
    async init(config = {}) {
        this.config = {
            container: config.container || document.body,
            dropdownWidth: config.dropdownWidth || 360,
            dropdownHeight: config.dropdownHeight || 500,
            popupWidth: config.popupWidth || 400,
            popupHeight: config.popupHeight || 600,
            position: config.position || 'bottom-right'
        };
        
        // Create panel elements
        await this.createDropdownPanel();
        await this.createPopupContainer();
        
        // Setup event listeners
        this.setupEventListeners();
        
        eventBus.emit('chat-panel:initialized');
    }
    
    /**
     * Create dropdown panel
     */
    async createDropdownPanel() {
        const icons = await this.loadIcons();
        
        this.element = document.createElement('div');
        this.element.className = 'qmf-chat-panel';
        this.element.innerHTML = `
            <div class="qmf-chat-panel__header">
                <h3 class="qmf-chat-panel__title">
                    ${icons['message-circle']}
                    <span>Tin nhắn</span>
                </h3>
                <div class="qmf-chat-panel__header-actions">
                    <button class="qmf-chat-panel__btn" data-action="new-chat" title="Cuộc trò chuyện mới">
                        ${icons['plus']}
                    </button>
                    <button class="qmf-chat-panel__btn" data-action="popup" title="Mở rộng">
                        ${icons['maximize-2']}
                    </button>
                    <button class="qmf-chat-panel__btn" data-action="close" title="Đóng">
                        ${icons['x']}
                    </button>
                </div>
            </div>
            
            <div class="qmf-chat-panel__tabs">
                <button class="qmf-chat-panel__tab active" data-tab="chats">Trò chuyện</button>
                <button class="qmf-chat-panel__tab" data-tab="friends">
                    Bạn bè
                    <span class="qmf-chat-panel__tab-badge" id="friend-requests-badge"></span>
                </button>
            </div>
            
            <div class="qmf-chat-panel__content">
                <!-- Chats Tab -->
                <div class="qmf-chat-panel__tab-content active" data-tab-content="chats">
                    <div class="qmf-chat-panel__search">
                        <input type="text" placeholder="Tìm kiếm cuộc trò chuyện..." class="qmf-chat-panel__search-input">
                        ${icons['search']}
                    </div>
                    <div class="qmf-chat-panel__room-list" id="chat-room-list">
                        <div class="qmf-chat-panel__empty">
                            ${icons['message-circle']}
                            <p>Chưa có cuộc trò chuyện nào</p>
                        </div>
                    </div>
                </div>
                
                <!-- Friends Tab -->
                <div class="qmf-chat-panel__tab-content" data-tab-content="friends">
                    <div class="qmf-chat-panel__friends-tabs">
                        <button class="qmf-chat-panel__friends-tab active" data-friends-tab="list">Danh sách</button>
                        <button class="qmf-chat-panel__friends-tab" data-friends-tab="requests">
                            Lời mời
                            <span class="qmf-chat-panel__tab-badge" id="friend-requests-count"></span>
                        </button>
                        <button class="qmf-chat-panel__friends-tab" data-friends-tab="add">Thêm</button>
                    </div>
                    
                    <!-- Friends List -->
                    <div class="qmf-chat-panel__friends-content active" data-friends-content="list">
                        <div class="qmf-chat-panel__search">
                            <input type="text" placeholder="Tìm bạn bè..." class="qmf-chat-panel__search-input" id="friend-search-input">
                            ${icons['search']}
                        </div>
                        <div class="qmf-chat-panel__friend-list" id="friend-list"></div>
                    </div>
                    
                    <!-- Friend Requests -->
                    <div class="qmf-chat-panel__friends-content" data-friends-content="requests">
                        <div class="qmf-chat-panel__friend-list" id="friend-requests-list"></div>
                    </div>
                    
                    <!-- Add Friend -->
                    <div class="qmf-chat-panel__friends-content" data-friends-content="add">
                        <div class="qmf-chat-panel__add-friend">
                            <input type="text" placeholder="Nhập email hoặc tên..." class="qmf-chat-panel__add-input" id="add-friend-input">
                            <button class="qmf-chat-panel__add-btn" id="search-users-btn">Tìm</button>
                        </div>
                        <div class="qmf-chat-panel__search-results" id="user-search-results"></div>
                    </div>
                </div>
                
                <!-- Conversation View -->
                <div class="qmf-chat-panel__conversation hidden" id="chat-conversation">
                    <div class="qmf-chat-panel__conv-header">
                        <button class="qmf-chat-panel__back-btn" data-action="back-to-list">
                            ${icons['arrow-left']}
                        </button>
                        <div class="qmf-chat-panel__conv-user">
                            <div class="qmf-chat-panel__conv-avatar" id="conv-avatar"></div>
                            <div class="qmf-chat-panel__conv-info">
                                <div class="qmf-chat-panel__conv-name" id="conv-name"></div>
                                <div class="qmf-chat-panel__conv-status" id="conv-status">Online</div>
                            </div>
                        </div>
                        <button class="qmf-chat-panel__btn" data-action="conv-menu">
                            ${icons['more-vertical']}
                        </button>
                    </div>
                    
                    <div class="qmf-chat-panel__messages" id="chat-messages"></div>
                    
                    <div class="qmf-chat-panel__typing hidden" id="typing-indicator">
                        <span id="typing-text">Đang nhập</span>
                        <div class="qmf-chat-panel__typing-dots">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                    
                    <div class="qmf-chat-panel__input-area">
                        <button class="qmf-chat-panel__input-btn" data-action="attach">
                            ${icons['paperclip']}
                        </button>
                        <textarea class="qmf-chat-panel__input" id="message-input" placeholder="Nhập tin nhắn..." rows="1"></textarea>
                        <button class="qmf-chat-panel__send-btn" id="send-btn" disabled>
                            ${icons['send']}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.config.container.appendChild(this.element);
    }
    
    /**
     * Create popup container for expanded chat
     */
    async createPopupContainer() {
        const icons = await this.loadIcons();
        
        this.popupElement = document.createElement('div');
        this.popupElement.className = 'qmf-chat-popup hidden';
        this.popupElement.innerHTML = `
            <div class="qmf-chat-popup__header">
                <h3 class="qmf-chat-popup__title">
                    ${icons['message-circle']}
                    <span>Chat</span>
                </h3>
                <div class="qmf-chat-popup__actions">
                    <button class="qmf-chat-popup__btn" data-action="minimize">
                        ${icons['minimize-2']}
                    </button>
                    <button class="qmf-chat-popup__btn" data-action="close-popup">
                        ${icons['x']}
                    </button>
                </div>
            </div>
            <div class="qmf-chat-popup__body">
                <div class="qmf-chat-popup__sidebar">
                    <div class="qmf-chat-popup__search">
                        <input type="text" placeholder="Tìm kiếm..." class="qmf-chat-popup__search-input">
                    </div>
                    <div class="qmf-chat-popup__rooms" id="popup-room-list"></div>
                </div>
                <div class="qmf-chat-popup__main">
                    <div class="qmf-chat-popup__empty">
                        <p>Chọn một cuộc trò chuyện</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.popupElement);
    }
    
    /**
     * Load icons
     */
    async loadIcons() {
        const iconNames = [
            'message-circle', 'x', 'plus', 'maximize-2', 'minimize-2',
            'search', 'arrow-left', 'more-vertical', 'paperclip', 'send',
            'check', 'check-check', 'user', 'user-plus', 'user-minus'
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
        eventBus.on('chat:toggle-panel', () => this.toggle());
        
        // Chat service events
        eventBus.on('chat:rooms-loaded', ({ rooms }) => this.renderRoomList(rooms));
        eventBus.on('chat:friends-loaded', ({ friends }) => this.renderFriendList(friends));
        eventBus.on('chat:friend-requests-loaded', (data) => this.renderFriendRequests(data));
        eventBus.on('chat:new-message', ({ message }) => this.handleNewMessage(message));
        eventBus.on('chat:typing-update', (data) => this.updateTypingIndicator(data));
        eventBus.on('chat:messages-loaded', ({ messages }) => this.renderMessages(messages));
        eventBus.on('chat:unread-updated', () => this.updateUnreadBadges());
        
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
            
            // Tab switching
            const tabEl = e.target.closest('[data-tab]');
            if (tabEl) {
                this.switchTab(tabEl.dataset.tab);
            }
            
            // Friends sub-tabs
            const friendsTabEl = e.target.closest('[data-friends-tab]');
            if (friendsTabEl) {
                this.switchFriendsTab(friendsTabEl.dataset.friendsTab);
            }
            
            // Room selection
            const roomEl = e.target.closest('.qmf-chat-panel__room-item');
            if (roomEl) {
                await this.openConversation(roomEl.dataset.roomId);
            }
            
            // Friend actions
            const friendActionEl = e.target.closest('[data-friend-action]');
            if (friendActionEl) {
                await this.handleFriendAction(friendActionEl);
            }
        });
        
        // Message input
        const messageInput = this.element.querySelector('#message-input');
        if (messageInput) {
            messageInput.addEventListener('input', () => {
                this.handleMessageInput(messageInput);
            });
            
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        // Send button
        const sendBtn = this.element.querySelector('#send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }
        
        // User search
        const searchUsersBtn = this.element.querySelector('#search-users-btn');
        if (searchUsersBtn) {
            searchUsersBtn.addEventListener('click', () => this.searchUsers());
        }
        
        // Popup events
        if (this.popupElement) {
            this.popupElement.addEventListener('click', async (e) => {
                const actionEl = e.target.closest('[data-action]');
                if (actionEl) {
                    await this.handleAction(actionEl.dataset.action, e);
                }
            });
        }
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.state === PanelState.DROPDOWN) {
                if (!e.target.closest('.qmf-chat-panel') && 
                    !e.target.closest('[data-action="toggle-chat"]')) {
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
            case 'popup':
                this.openPopup();
                break;
            case 'close-popup':
            case 'minimize':
                this.closePopup();
                break;
            case 'new-chat':
                this.switchTab('friends');
                this.switchFriendsTab('list');
                break;
            case 'back-to-list':
                this.closeConversation();
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
     * Open dropdown panel
     */
    open() {
        this.element.classList.add('open');
        this.state = PanelState.DROPDOWN;
        eventBus.emit('chat-panel:opened');
    }
    
    /**
     * Close panel
     */
    close() {
        this.element.classList.remove('open');
        this.state = PanelState.CLOSED;
        eventBus.emit('chat-panel:closed');
    }
    
    /**
     * Open popup mode
     */
    openPopup() {
        this.close();
        this.popupElement.classList.remove('hidden');
        this.state = PanelState.POPUP;
        eventBus.emit('chat-panel:popup-opened');
    }
    
    /**
     * Close popup
     */
    closePopup() {
        this.popupElement.classList.add('hidden');
        this.state = PanelState.CLOSED;
        eventBus.emit('chat-panel:popup-closed');
    }
    
    /**
     * Switch main tabs
     */
    switchTab(tab) {
        // Update tab buttons
        this.element.querySelectorAll('.qmf-chat-panel__tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Update content
        this.element.querySelectorAll('.qmf-chat-panel__tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tabContent === tab);
        });
    }
    
    /**
     * Switch friends sub-tabs
     */
    switchFriendsTab(tab) {
        this.element.querySelectorAll('.qmf-chat-panel__friends-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.friendsTab === tab);
        });
        
        this.element.querySelectorAll('.qmf-chat-panel__friends-content').forEach(content => {
            content.classList.toggle('active', content.dataset.friendsContent === tab);
        });
    }
    
    /**
     * Render room list
     */
    async renderRoomList(rooms) {
        const container = this.element.querySelector('#chat-room-list');
        if (!container) return;
        
        if (rooms.length === 0) {
            container.innerHTML = `
                <div class="qmf-chat-panel__empty">
                    <p>Chưa có cuộc trò chuyện nào</p>
                </div>
            `;
            return;
        }
        
        const icons = await this.loadIcons();
        
        container.innerHTML = rooms.map(room => {
            const unread = chatService.unreadCounts.get(room.id) || 0;
            const lastMessage = room.last_message || {};
            
            return `
                <div class="qmf-chat-panel__room-item ${unread > 0 ? 'unread' : ''}" data-room-id="${room.id}">
                    <div class="qmf-chat-panel__room-avatar">
                        ${this.renderAvatar(room)}
                    </div>
                    <div class="qmf-chat-panel__room-content">
                        <div class="qmf-chat-panel__room-header">
                            <span class="qmf-chat-panel__room-name">${room.name || 'Chat'}</span>
                            <span class="qmf-chat-panel__room-time">${this.formatTime(lastMessage.created_at)}</span>
                        </div>
                        <div class="qmf-chat-panel__room-preview">
                            <span class="qmf-chat-panel__room-message">${lastMessage.content || ''}</span>
                            ${unread > 0 ? `<span class="qmf-chat-panel__room-badge">${unread}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Render friend list
     */
    async renderFriendList(friends) {
        const container = this.element.querySelector('#friend-list');
        if (!container) return;
        
        if (friends.length === 0) {
            container.innerHTML = `
                <div class="qmf-chat-panel__empty">
                    <p>Chưa có bạn bè</p>
                </div>
            `;
            return;
        }
        
        const icons = await this.loadIcons();
        
        container.innerHTML = friends.map(friend => `
            <div class="qmf-chat-panel__friend-item">
                <div class="qmf-chat-panel__friend-avatar ${friend.online ? 'online' : ''}">
                    ${this.renderAvatar(friend)}
                    <div class="qmf-chat-panel__online-dot"></div>
                </div>
                <div class="qmf-chat-panel__friend-info">
                    <span class="qmf-chat-panel__friend-name">${friend.display_name || friend.name}</span>
                    <span class="qmf-chat-panel__friend-status">${friend.online ? 'Đang hoạt động' : 'Offline'}</span>
                </div>
                <div class="qmf-chat-panel__friend-actions">
                    <button class="qmf-chat-panel__friend-btn" data-friend-action="chat" data-friend-id="${friend.id}" title="Nhắn tin">
                        ${icons['message-circle']}
                    </button>
                    <button class="qmf-chat-panel__friend-btn danger" data-friend-action="remove" data-friend-id="${friend.id}" title="Huỷ kết bạn">
                        ${icons['user-minus']}
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Render friend requests
     */
    async renderFriendRequests(data) {
        const container = this.element.querySelector('#friend-requests-list');
        if (!container) return;
        
        const { received = [], sent = [] } = data;
        const icons = await this.loadIcons();
        
        // Update badge
        const badge = this.element.querySelector('#friend-requests-count');
        if (badge) {
            badge.textContent = received.length > 0 ? received.length : '';
        }
        
        if (received.length === 0 && sent.length === 0) {
            container.innerHTML = `
                <div class="qmf-chat-panel__empty">
                    <p>Không có lời mời nào</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        if (received.length > 0) {
            html += `<div class="qmf-chat-panel__section-title">Đã nhận</div>`;
            html += received.map(req => `
                <div class="qmf-chat-panel__friend-item">
                    <div class="qmf-chat-panel__friend-avatar">
                        ${this.renderAvatar(req.sender)}
                    </div>
                    <div class="qmf-chat-panel__friend-info">
                        <span class="qmf-chat-panel__friend-name">${req.sender?.display_name || 'User'}</span>
                        <span class="qmf-chat-panel__friend-status">Muốn kết bạn</span>
                    </div>
                    <div class="qmf-chat-panel__friend-actions">
                        <button class="qmf-chat-panel__friend-btn success" data-friend-action="accept" data-request-id="${req.id}">
                            ${icons['check']}
                        </button>
                        <button class="qmf-chat-panel__friend-btn danger" data-friend-action="decline" data-request-id="${req.id}">
                            ${icons['x']}
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        if (sent.length > 0) {
            html += `<div class="qmf-chat-panel__section-title">Đã gửi</div>`;
            html += sent.map(req => `
                <div class="qmf-chat-panel__friend-item">
                    <div class="qmf-chat-panel__friend-avatar">
                        ${this.renderAvatar(req.receiver)}
                    </div>
                    <div class="qmf-chat-panel__friend-info">
                        <span class="qmf-chat-panel__friend-name">${req.receiver?.display_name || 'User'}</span>
                        <span class="qmf-chat-panel__friend-status">Đang chờ</span>
                    </div>
                    <div class="qmf-chat-panel__friend-actions">
                        <button class="qmf-chat-panel__friend-btn" data-friend-action="cancel" data-request-id="${req.id}">
                            ${icons['x']}
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        container.innerHTML = html;
    }
    
    /**
     * Handle friend action
     */
    async handleFriendAction(el) {
        const action = el.dataset.friendAction;
        const friendId = el.dataset.friendId;
        const requestId = el.dataset.requestId;
        
        switch (action) {
            case 'chat':
                const room = await chatService.getDirectRoom(friendId);
                if (room) {
                    await this.openConversation(room.id);
                }
                break;
            case 'accept':
                await chatService.acceptFriendRequest(requestId);
                break;
            case 'decline':
                await chatService.declineFriendRequest(requestId);
                break;
            case 'remove':
                if (confirm('Bạn có chắc muốn huỷ kết bạn?')) {
                    await chatService.removeFriend(friendId);
                }
                break;
            case 'add':
                await chatService.sendFriendRequest(el.dataset.userId);
                el.disabled = true;
                el.textContent = 'Đã gửi';
                break;
        }
    }
    
    /**
     * Search users
     */
    async searchUsers() {
        const input = this.element.querySelector('#add-friend-input');
        const container = this.element.querySelector('#user-search-results');
        
        if (!input || !container) return;
        
        const query = input.value.trim();
        if (query.length < 2) {
            container.innerHTML = '<p class="qmf-chat-panel__hint">Nhập ít nhất 2 ký tự</p>';
            return;
        }
        
        container.innerHTML = '<div class="qmf-chat-panel__loading"><div class="qmf-spinner"></div></div>';
        
        const users = await chatService.searchUsers(query);
        const icons = await this.loadIcons();
        
        if (users.length === 0) {
            container.innerHTML = '<p class="qmf-chat-panel__hint">Không tìm thấy người dùng</p>';
            return;
        }
        
        container.innerHTML = users.map(user => `
            <div class="qmf-chat-panel__friend-item">
                <div class="qmf-chat-panel__friend-avatar">
                    ${this.renderAvatar(user)}
                </div>
                <div class="qmf-chat-panel__friend-info">
                    <span class="qmf-chat-panel__friend-name">${user.display_name || user.name}</span>
                    <span class="qmf-chat-panel__friend-status">${user.email || ''}</span>
                </div>
                <button class="qmf-chat-panel__add-user-btn" data-friend-action="add" data-user-id="${user.id}">
                    ${icons['user-plus']} Kết bạn
                </button>
            </div>
        `).join('');
    }
    
    /**
     * Open conversation
     */
    async openConversation(roomId) {
        this.activeConversation = roomId;
        
        // Show conversation view
        const convView = this.element.querySelector('#chat-conversation');
        const tabContents = this.element.querySelectorAll('.qmf-chat-panel__tab-content');
        
        tabContents.forEach(c => c.classList.add('hidden'));
        convView.classList.remove('hidden');
        
        // Load and display messages
        await chatService.joinRoom(roomId);
        
        // Update header
        const room = chatService.getRoom(roomId);
        if (room) {
            const nameEl = this.element.querySelector('#conv-name');
            const avatarEl = this.element.querySelector('#conv-avatar');
            
            if (nameEl) nameEl.textContent = room.name || 'Chat';
            if (avatarEl) avatarEl.innerHTML = this.renderAvatar(room);
        }
    }
    
    /**
     * Close conversation
     */
    closeConversation() {
        chatService.leaveRoom();
        this.activeConversation = null;
        
        // Hide conversation view
        const convView = this.element.querySelector('#chat-conversation');
        const tabContents = this.element.querySelectorAll('.qmf-chat-panel__tab-content');
        
        convView.classList.add('hidden');
        tabContents.forEach((c, i) => {
            if (i === 0) c.classList.remove('hidden');
        });
    }
    
    /**
     * Render messages
     */
    renderMessages(messages) {
        const container = this.element.querySelector('#chat-messages');
        if (!container) return;
        
        const currentUserId = authService.getUserId();
        
        container.innerHTML = messages.map(msg => {
            const isOwn = msg.sender_id === currentUserId;
            
            return `
                <div class="qmf-chat-panel__message ${isOwn ? 'own' : ''}">
                    ${!isOwn ? `<div class="qmf-chat-panel__msg-avatar">${this.renderAvatar(msg.sender, 28)}</div>` : ''}
                    <div class="qmf-chat-panel__msg-content">
                        <div class="qmf-chat-panel__msg-bubble">${this.escapeHtml(msg.content)}</div>
                        <div class="qmf-chat-panel__msg-time">${this.formatTime(msg.created_at)}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }
    
    /**
     * Handle new message
     */
    handleNewMessage(message) {
        if (message.room_id === this.activeConversation) {
            const container = this.element.querySelector('#chat-messages');
            if (!container) return;
            
            const currentUserId = authService.getUserId();
            const isOwn = message.sender_id === currentUserId;
            
            const msgEl = document.createElement('div');
            msgEl.className = `qmf-chat-panel__message ${isOwn ? 'own' : ''} new`;
            msgEl.innerHTML = `
                ${!isOwn ? `<div class="qmf-chat-panel__msg-avatar">${this.renderAvatar(message.sender, 28)}</div>` : ''}
                <div class="qmf-chat-panel__msg-content">
                    <div class="qmf-chat-panel__msg-bubble">${this.escapeHtml(message.content)}</div>
                    <div class="qmf-chat-panel__msg-time">${this.formatTime(message.created_at)}</div>
                </div>
            `;
            
            container.appendChild(msgEl);
            container.scrollTop = container.scrollHeight;
        }
    }
    
    /**
     * Handle message input
     */
    handleMessageInput(input) {
        const sendBtn = this.element.querySelector('#send-btn');
        const hasContent = input.value.trim().length > 0;
        
        if (sendBtn) {
            sendBtn.disabled = !hasContent;
        }
        
        // Auto-resize
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        
        // Typing indicator
        if (hasContent) {
            chatService.startTyping();
            
            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
                chatService.stopTyping();
            }, 3000);
        }
    }
    
    /**
     * Send message
     */
    async sendMessage() {
        const input = this.element.querySelector('#message-input');
        if (!input) return;
        
        const content = input.value.trim();
        if (!content) return;
        
        await chatService.sendMessage(content);
        
        input.value = '';
        input.style.height = 'auto';
        
        const sendBtn = this.element.querySelector('#send-btn');
        if (sendBtn) sendBtn.disabled = true;
    }
    
    /**
     * Update typing indicator
     */
    updateTypingIndicator({ roomId, users, userName }) {
        if (roomId !== this.activeConversation) return;
        
        const indicator = this.element.querySelector('#typing-indicator');
        const textEl = this.element.querySelector('#typing-text');
        
        if (!indicator) return;
        
        if (users && users.length > 0) {
            indicator.classList.remove('hidden');
            if (textEl) {
                textEl.textContent = userName ? `${userName} đang nhập` : 'Đang nhập';
            }
        } else {
            indicator.classList.add('hidden');
        }
    }
    
    /**
     * Update unread badges
     */
    updateUnreadBadges() {
        const rooms = chatService.getRooms();
        this.renderRoomList(rooms);
    }
    
    /**
     * Render avatar
     */
    renderAvatar(obj, size = 40) {
        const avatarUrl = obj?.avatar || obj?.avatar_url;
        const name = obj?.display_name || obj?.name || 'U';
        const initial = name.charAt(0).toUpperCase();
        
        if (avatarUrl) {
            return `<img src="${avatarUrl}" alt="${name}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;">`;
        }
        
        return `<div class="qmf-avatar-fallback" style="width:${size}px;height:${size}px;">${initial}</div>`;
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
        if (diff < 3600000) return `${Math.floor(diff / 60000)} phút`;
        if (diff < 86400000) return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    }
    
    /**
     * Escape HTML
     */
    escapeHtml(text) {
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
        
        if (this.popupElement) {
            this.popupElement.remove();
            this.popupElement = null;
        }
    }
}

// Factory
export function createChatPanel(config) {
    const panel = new ChatPanel();
    panel.init(config);
    return panel;
}

export default ChatPanel;
