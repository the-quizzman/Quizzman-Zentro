/**
 * QMF Chat v3.0.0 - Modern Chat Component
 * Features: typing, seen, reactions, reply, block, report, badges, message requests
 */

class QMFChat {
  static DEBUG = false;
  static VERSION = '3.0.0';
  
  static log(...args) {
    if (QMFChat.DEBUG) console.log('[QMFChat]', ...args);
  }
  
  constructor(options = {}) {
    this.options = {
      server: options.server || 'https://chat.quizzman.com',
      getToken: options.getToken || this._defaultGetToken.bind(this),
      createButton: options.createButton !== false,
      buttonPosition: options.buttonPosition || 'bottom-right',
      container: options.container || document.body,
      ...options
    };
    
    if (options.debug) QMFChat.DEBUG = true;
    
    this.socket = null;
    this.isConnected = false;
    this.currentConversation = null;
    this.conversations = [];
    this.messages = [];
    this.replyingTo = null;
    this.typingTimeout = null;
    this.peerTyping = false;
    this.currentUserId = null;
    this.unreadCount = 0;
    this.isMinimized = false;
    
    this._injectCSS();
    this._createUI();
    if (this.options.createButton) this._createButton();
    this._bindEvents();
    this._connect();
  }
  
  _defaultGetToken() {
    if (window.QMF?.getAuthToken) return window.QMF.getAuthToken();
    if (window.QuizzmanAuth?.getToken) return window.QuizzmanAuth.getToken();
    
    const keys = ['jwt_token', 'authToken', 'auth_token', 'token'];
    for (const key of keys) {
      const token = localStorage.getItem(key);
      if (token) return token;
    }
    
    const match = document.cookie.match(/(?:^|;\s*)(jwt_token|authToken)=([^;]*)/);
    return match ? decodeURIComponent(match[2]) : null;
  }
  
  _injectCSS() {
    if (document.getElementById('qmf-chat-css')) return;
    
    const link = document.createElement('link');
    link.id = 'qmf-chat-css';
    link.rel = 'stylesheet';
    link.href = 'https://ui.quizzman.com/qmf/dist/v3.0.0/modules/chat/qmf-chat.css';
    document.head.appendChild(link);
  }
  
  _createUI() {
    this.container = document.createElement('div');
    this.container.className = 'qmf-chat';
    // Ensure hidden by default with inline style (CSS backup)
    this.container.style.cssText = 'display:none;opacity:0;visibility:hidden;pointer-events:none;';
    this.container.innerHTML = this._getHTML();
    document.body.appendChild(this.container);
    
    // Cache DOM elements
    this.elements = {
      header: this.container.querySelector('.qmf-chat-header'),
      headerBack: this.container.querySelector('.qmf-chat-header-back'),
      headerAvatar: this.container.querySelector('.qmf-chat-header-avatar img'),
      headerStatus: this.container.querySelector('.qmf-chat-header-status'),
      headerBadge: this.container.querySelector('.qmf-chat-header-badge'),
      headerName: this.container.querySelector('.qmf-chat-header-name'),
      headerSubtitle: this.container.querySelector('.qmf-chat-header-subtitle'),
      headerMenu: this.container.querySelector('.qmf-chat-menu'),
      menuBtn: this.container.querySelector('.qmf-chat-header-action.menu-btn'),
      minimizeBtn: this.container.querySelector('.qmf-chat-header-action.minimize-btn'),
      closeBtn: this.container.querySelector('.qmf-chat-header-action.close-btn'),
      
      conversations: this.container.querySelector('.qmf-chat-conversations'),
      searchInput: this.container.querySelector('.qmf-chat-search-input'),
      conversationList: this.container.querySelector('.qmf-chat-list'),
      
      messagesView: this.container.querySelector('.qmf-chat-messages-view'),
      requestBanner: this.container.querySelector('.qmf-chat-request-banner'),
      messagesArea: this.container.querySelector('.qmf-chat-messages'),
      replyBar: this.container.querySelector('.qmf-chat-reply-bar'),
      replyName: this.container.querySelector('.qmf-chat-reply-bar-name'),
      replyText: this.container.querySelector('.qmf-chat-reply-bar-text'),
      replyClose: this.container.querySelector('.qmf-chat-reply-bar-close'),
      
      input: this.container.querySelector('.qmf-chat-input'),
      sendBtn: this.container.querySelector('.qmf-chat-send'),
      emojiBtn: this.container.querySelector('.qmf-chat-input-action.emoji-btn'),
      attachBtn: this.container.querySelector('.qmf-chat-input-action.attach-btn'),
    };
  }
  
  _getHTML() {
    return `
      <!-- Header -->
      <div class="qmf-chat-header">
        <button class="qmf-chat-header-back" title="Quay lại">
          <i class="fas fa-arrow-left"></i>
        </button>
        
        <div class="qmf-chat-header-avatar">
          <img src="" alt="Avatar">
          <span class="qmf-chat-header-status"></span>
          <span class="qmf-chat-header-badge" style="display:none"></span>
        </div>
        
        <div class="qmf-chat-header-info">
          <h3 class="qmf-chat-header-name">Tin nhắn</h3>
          <p class="qmf-chat-header-subtitle"></p>
        </div>
        
        <div class="qmf-chat-header-actions">
          <button class="qmf-chat-header-action menu-btn conversation-menu" title="Tùy chọn cuộc trò chuyện" style="display:none">
            <i class="fas fa-ellipsis-v"></i>
            <div class="qmf-chat-menu">
              <button class="qmf-chat-menu-item" data-action="mark-read">
                <i class="fas fa-check-double"></i>
                <span>Đánh dấu đã đọc</span>
              </button>
              <button class="qmf-chat-menu-item" data-action="mute">
                <i class="fas fa-bell-slash"></i>
                <span>Tắt thông báo</span>
              </button>
              <div class="qmf-chat-menu-divider"></div>
              <button class="qmf-chat-menu-item danger" data-action="block">
                <i class="fas fa-ban"></i>
                <span>Chặn người dùng</span>
              </button>
              <button class="qmf-chat-menu-item danger" data-action="report">
                <i class="fas fa-flag"></i>
                <span>Báo cáo</span>
              </button>
            </div>
          </button>
          <button class="qmf-chat-header-action minimize-btn" title="Thu nhỏ">
            <i class="fas fa-minus"></i>
          </button>
          <button class="qmf-chat-header-action close-btn" title="Đóng">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <!-- Conversations List -->
      <div class="qmf-chat-conversations">
        <div class="qmf-chat-search">
          <input type="text" class="qmf-chat-search-input" placeholder="Tìm kiếm cuộc trò chuyện...">
        </div>
        <div class="qmf-chat-list">
          <div class="qmf-chat-loading">
            <div class="qmf-chat-spinner"></div>
          </div>
        </div>
      </div>
      
      <!-- Messages View -->
      <div class="qmf-chat-messages-view">
        <!-- Message Request Banner -->
        <div class="qmf-chat-request-banner" style="display:none">
          <p class="qmf-chat-request-banner-text">
            <strong>Yêu cầu tin nhắn</strong> - Người này chưa phải bạn bè của bạn
          </p>
          <div class="qmf-chat-request-banner-actions">
            <button class="qmf-chat-request-btn accept">Chấp nhận</button>
            <button class="qmf-chat-request-btn decline">Từ chối</button>
            <button class="qmf-chat-request-btn spam">Báo spam</button>
          </div>
        </div>
        
        <!-- Messages Area -->
        <div class="qmf-chat-messages"></div>
        
        <!-- Reply Bar -->
        <div class="qmf-chat-reply-bar">
          <div class="qmf-chat-reply-bar-content">
            <div class="qmf-chat-reply-bar-name"></div>
            <div class="qmf-chat-reply-bar-text"></div>
          </div>
          <button class="qmf-chat-reply-bar-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <!-- Input Area -->
        <div class="qmf-chat-input-area">
          <div class="qmf-chat-input-row">
            <div class="qmf-chat-input-actions">
              <button class="qmf-chat-input-action attach-btn" title="Đính kèm">
                <i class="fas fa-paperclip"></i>
              </button>
              <button class="qmf-chat-input-action emoji-btn" title="Emoji">
                <i class="fas fa-smile"></i>
              </button>
            </div>
            <div class="qmf-chat-input-wrapper">
              <textarea class="qmf-chat-input" placeholder="Nhập tin nhắn..." rows="1"></textarea>
            </div>
            <button class="qmf-chat-send" disabled>
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  _createButton() {
    // Only create button on mobile (CSS also hides on desktop, but this is extra protection)
    if (window.innerWidth >= 768) {
      return; // Don't create button on desktop
    }
    
    this.button = document.createElement('button');
    this.button.className = 'qmf-chat-button';
    this.button.innerHTML = `
      <i class="fas fa-comments"></i>
      <span class="qmf-chat-button-badge" style="display:none">0</span>
    `;
    this.button.addEventListener('click', () => this.toggle());
    document.body.appendChild(this.button);
  }
  
  _bindEvents() {
    // Close button
    this.elements.closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });
    
    // Minimize button
    this.elements.minimizeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.minimize();
    });
    
    // Click header to restore from minimized state
    this.elements.header?.addEventListener('click', (e) => {
      if (this.isMinimized && !e.target.closest('button')) {
        this.minimize(); // Toggle back to full size
      }
    });
    
    // ESC key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible() && !this.isMinimized) {
        this.hide();
      }
    });
    
    // Back button
    this.elements.headerBack?.addEventListener('click', () => this._showConversationList());
    
    // Menu toggle
    this.elements.menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.elements.headerMenu?.classList.toggle('open');
    });
    
    // Menu items
    this.elements.headerMenu?.querySelectorAll('.qmf-chat-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const action = item.dataset.action;
        this._handleMenuAction(action);
        this.elements.headerMenu?.classList.remove('open');
      });
    });
    
    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (!this.elements.menuBtn?.contains(e.target)) {
        this.elements.headerMenu?.classList.remove('open');
      }
    });
    
    // Search
    this.elements.searchInput?.addEventListener('input', (e) => {
      this._filterConversations(e.target.value);
    });
    
    // Input handling
    this.elements.input?.addEventListener('input', () => {
      this._autoResize();
      this._updateSendButton();
      this._emitTyping();
    });
    
    this.elements.input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._sendMessage();
      }
    });
    
    // Send button
    this.elements.sendBtn?.addEventListener('click', () => this._sendMessage());
    
    // Reply close
    this.elements.replyClose?.addEventListener('click', () => this._cancelReply());
    
    // Message request buttons
    this.elements.requestBanner?.querySelector('.accept')?.addEventListener('click', () => {
      this._acceptMessageRequest();
    });
    
    this.elements.requestBanner?.querySelector('.decline')?.addEventListener('click', () => {
      this._declineMessageRequest();
    });
    
    this.elements.requestBanner?.querySelector('.spam')?.addEventListener('click', () => {
      this._reportSpam();
    });
  }
  
  _connect() {
    const token = this.options.getToken();
    if (!token) {
      QMFChat.log('No token, skipping connection');
      return;
    }
    
    if (typeof io === 'undefined') {
      this._loadSocketIO(() => this._initSocket());
    } else {
      this._initSocket();
    }
  }
  
  _loadSocketIO(callback) {
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.6.1/socket.io.min.js';
    script.onload = callback;
    document.head.appendChild(script);
  }
  
  _initSocket() {
    const token = this.options.getToken();
    
    this.socket = io(this.options.server, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    this.socket.on('connect', () => {
      QMFChat.log('Connected');
      this.isConnected = true;
      this._loadConversations();
    });
    
    this.socket.on('disconnect', () => {
      QMFChat.log('Disconnected');
      this.isConnected = false;
    });
    
    this.socket.on('message', (data) => this._handleNewMessage(data));
    this.socket.on('typing', (data) => this._handleTyping(data));
    this.socket.on('stopTyping', (data) => this._handleStopTyping(data));
    this.socket.on('messageSeen', (data) => this._handleMessageSeen(data));
    this.socket.on('reaction', (data) => this._handleReaction(data));
    this.socket.on('messageDeleted', (data) => this._handleMessageDeleted(data));
    
    // Get current user ID from socket auth
    this.socket.on('authenticated', (data) => {
      this.currentUserId = data.userId;
    });
  }
  
  async _loadConversations() {
    try {
      const token = this.options.getToken();
      const response = await fetch(`${this.options.server}/friends/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to load conversations');
      
      const data = await response.json();
      this.conversations = data.friends || data || [];
      this._renderConversationList();
    } catch (error) {
      QMFChat.log('Error loading conversations:', error);
      this.elements.conversationList.innerHTML = `
        <div class="qmf-chat-empty">
          <div class="qmf-chat-empty-icon">💬</div>
          <div class="qmf-chat-empty-title">Không có cuộc trò chuyện</div>
          <div class="qmf-chat-empty-text">Bắt đầu trò chuyện với bạn bè</div>
        </div>
      `;
    }
  }
  
  _renderConversationList() {
    if (!this.conversations.length) {
      this.elements.conversationList.innerHTML = `
        <div class="qmf-chat-empty">
          <div class="qmf-chat-empty-icon">💬</div>
          <div class="qmf-chat-empty-title">Không có cuộc trò chuyện</div>
          <div class="qmf-chat-empty-text">Bắt đầu trò chuyện với bạn bè</div>
        </div>
      `;
      return;
    }
    
    this.elements.conversationList.innerHTML = this.conversations.map(conv => {
      const user = conv.friend || conv;
      const isOnline = user.online || user.status === 'online';
      const unread = conv.unread_count || 0;
      const badge = this._getBadgeHTML(user.badge || user.role);
      
      return `
        <div class="qmf-chat-item ${unread > 0 ? 'unread' : ''}" data-user-id="${user.id}">
          <div class="qmf-chat-item-avatar">
            <img src="${this._getAvatarUrl(user)}" alt="${user.display_name || user.username}" 
                 onerror="this.onerror=null;this.src=this.dataset.fallback||'${this._getDefaultAvatarSVG()}'"
                 data-fallback="${this._getDefaultAvatarSVG()}">
            <span class="qmf-chat-item-status ${isOnline ? 'online' : ''}"></span>
            ${badge}
          </div>
          <div class="qmf-chat-item-content">
            <div class="qmf-chat-item-header">
              <span class="qmf-chat-item-name">${user.display_name || user.username || 'Unknown'}</span>
              <span class="qmf-chat-item-time">${this._formatTime(conv.last_message_at || conv.created_at)}</span>
            </div>
            <div class="qmf-chat-item-preview">
              ${conv.last_message || 'Bắt đầu cuộc trò chuyện'}
              ${unread > 0 ? `<span class="qmf-chat-item-unread-count">${unread}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Bind click events
    this.elements.conversationList.querySelectorAll('.qmf-chat-item').forEach(item => {
      item.addEventListener('click', () => {
        const userId = item.dataset.userId;
        const conv = this.conversations.find(c => (c.friend?.id || c.id) === userId);
        if (conv) this._openConversation(conv);
      });
    });
  }
  
  _getAvatarUrl(user) {
    // Priority: avatar_url > avatar > id.quizzman.com
    if (user.avatar_url && user.avatar_url.trim()) {
      return user.avatar_url;
    }
    if (user.avatar && user.avatar.trim()) {
      return user.avatar;
    }
    // Fallback to id.quizzman.com avatar service
    if (user.id) {
      return `https://id.quizzman.com/avatar/${user.id}`;
    }
    return '';
  }
  
  _getDefaultAvatarSVG() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%236366f1'/%3E%3Cstop offset='100%25' style='stop-color:%238b5cf6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='40' height='40' rx='20'/%3E%3Cpath d='M20 10c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5zm0 22c-4.42 0-8-1.79-8-4v-2c0-2.21 3.58-4 8-4s8 1.79 8 4v2c0 2.21-3.58 4-8 4z' fill='white' opacity='0.9'/%3E%3C/svg%3E";
  }
  
  _getBadgeHTML(badge) {
    if (!badge) return '';
    
    const badges = {
      vip: { icon: '👑', class: 'vip' },
      premium: { icon: '⭐', class: 'premium' },
      verified: { icon: '✓', class: 'verified' },
      admin: { icon: '🛡️', class: 'admin' },
      mod: { icon: '⚡', class: 'premium' }
    };
    
    const b = badges[badge.toLowerCase()] || null;
    if (!b) return '';
    
    return `<span class="qmf-chat-item-badge ${b.class}">${b.icon}</span>`;
  }
  
  _openConversation(conv) {
    const user = conv.friend || conv;
    this.currentConversation = conv;
    
    // Update header with avatar from id.quizzman.com fallback
    this.elements.headerAvatar.src = this._getAvatarUrl(user);
    this.elements.headerAvatar.onerror = () => {
      this.elements.headerAvatar.onerror = null;
      this.elements.headerAvatar.src = this._getDefaultAvatarSVG();
    };
    this.elements.headerName.textContent = user.display_name || user.username || 'Unknown';
    this.elements.headerStatus.className = `qmf-chat-header-status ${user.online ? 'online' : ''}`;
    this.elements.headerSubtitle.textContent = user.online ? 'Đang hoạt động' : 'Offline';
    
    // Show conversation menu button
    const convMenuBtn = this.container.querySelector('.qmf-chat-header-action.conversation-menu');
    if (convMenuBtn) convMenuBtn.style.display = 'flex';
    
    // Show badge if any
    const badge = this._getBadgeHTML(user.badge || user.role);
    if (badge) {
      this.elements.headerBadge.innerHTML = badge;
      this.elements.headerBadge.style.display = 'flex';
    } else {
      this.elements.headerBadge.style.display = 'none';
    }
    
    // Check if message request
    if (conv.is_request || conv.status === 'pending') {
      this.elements.requestBanner.style.display = 'block';
    } else {
      this.elements.requestBanner.style.display = 'none';
    }
    
    // Switch to conversation view
    this.container.classList.add('in-conversation');
    
    // Load messages
    this._loadMessages(user.id);
    
    // Join room
    if (this.socket && this.isConnected) {
      this.socket.emit('joinRoom', { peerId: user.id });
    }
  }
  
  async _loadMessages(peerId) {
    this.elements.messagesArea.innerHTML = `
      <div class="qmf-chat-loading">
        <div class="qmf-chat-spinner"></div>
      </div>
    `;
    
    try {
      const token = this.options.getToken();
      const response = await fetch(`${this.options.server}/messages/${peerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to load messages');
      
      const data = await response.json();
      this.messages = data.messages || data || [];
      this._renderMessages();
      
      // Mark as read
      if (this.socket && this.isConnected) {
        this.socket.emit('markSeen', { peerId });
      }
    } catch (error) {
      QMFChat.log('Error loading messages:', error);
      this.elements.messagesArea.innerHTML = `
        <div class="qmf-chat-empty">
          <div class="qmf-chat-empty-icon">💬</div>
          <div class="qmf-chat-empty-title">Bắt đầu cuộc trò chuyện</div>
          <div class="qmf-chat-empty-text">Gửi tin nhắn đầu tiên</div>
        </div>
      `;
    }
  }
  
  _renderMessages() {
    if (!this.messages.length) {
      this.elements.messagesArea.innerHTML = `
        <div class="qmf-chat-empty">
          <div class="qmf-chat-empty-icon">💬</div>
          <div class="qmf-chat-empty-title">Bắt đầu cuộc trò chuyện</div>
          <div class="qmf-chat-empty-text">Gửi tin nhắn đầu tiên</div>
        </div>
      `;
      return;
    }
    
    let html = '';
    let lastDate = '';
    
    this.messages.forEach((msg, index) => {
      const date = new Date(msg.created_at).toLocaleDateString('vi-VN');
      
      // Date separator
      if (date !== lastDate) {
        html += `
          <div class="qmf-chat-date-separator">
            <span>${date === new Date().toLocaleDateString('vi-VN') ? 'Hôm nay' : date}</span>
          </div>
        `;
        lastDate = date;
      }
      
      const isSent = msg.sender_id === this.currentUserId;
      const user = this.currentConversation?.friend || this.currentConversation || {};
      
      html += this._renderMessage(msg, isSent, user);
    });
    
    this.elements.messagesArea.innerHTML = html;
    this._scrollToBottom();
    this._bindMessageActions();
  }
  
  _renderMessage(msg, isSent, user) {
    const statusIcons = {
      sent: '<i class="fas fa-check"></i>',
      delivered: '<i class="fas fa-check-double"></i>',
      seen: '<i class="fas fa-check-double"></i>'
    };
    
    const status = msg.seen_at ? 'seen' : (msg.delivered_at ? 'delivered' : 'sent');
    
    let replyHTML = '';
    if (msg.reply_to) {
      replyHTML = `
        <div class="qmf-chat-message-reply">
          <div class="qmf-chat-message-reply-name">${msg.reply_to.sender_name || 'Unknown'}</div>
          <div class="qmf-chat-message-reply-text">${msg.reply_to.content || ''}</div>
        </div>
      `;
    }
    
    let reactionsHTML = '';
    if (msg.reactions && msg.reactions.length > 0) {
      const grouped = this._groupReactions(msg.reactions);
      reactionsHTML = `
        <div class="qmf-chat-message-reactions">
          ${Object.entries(grouped).map(([emoji, users]) => `
            <span class="qmf-chat-message-reaction ${users.includes(this.currentUserId) ? 'mine' : ''}" 
                  data-emoji="${emoji}" data-message-id="${msg.id}">
              ${emoji}
              ${users.length > 1 ? `<span class="qmf-chat-message-reaction-count">${users.length}</span>` : ''}
            </span>
          `).join('')}
        </div>
      `;
    }
    
    return `
      <div class="qmf-chat-message ${isSent ? 'sent' : 'received'}" data-message-id="${msg.id}">
        ${!isSent ? `
          <img class="qmf-chat-message-avatar" 
               src="${this._getAvatarUrl(user)}" 
               alt="${user.display_name || user.username}"
               onerror="this.onerror=null;this.src='${this._getDefaultAvatarSVG()}'">
        ` : ''}
        <div class="qmf-chat-message-content">
          <div class="qmf-chat-message-bubble">
            ${replyHTML}
            ${this._formatMessageContent(msg.content)}
          </div>
          <div class="qmf-chat-message-meta">
            <span>${this._formatTime(msg.created_at)}</span>
            ${isSent ? `<span class="qmf-chat-message-status ${status}">${statusIcons[status]}</span>` : ''}
          </div>
          ${reactionsHTML}
          
          <div class="qmf-chat-message-actions">
            <button class="qmf-chat-message-action react" title="Thêm reaction">
              <i class="fas fa-smile"></i>
            </button>
            <button class="qmf-chat-message-action reply" title="Trả lời">
              <i class="fas fa-reply"></i>
            </button>
            <button class="qmf-chat-message-action more" title="Thêm tùy chọn">
              <i class="fas fa-ellipsis-h"></i>
            </button>
            ${isSent ? `
              <button class="qmf-chat-message-action delete" title="Xóa">
                <i class="fas fa-trash"></i>
              </button>
            ` : ''}
          </div>
          
          <!-- Context menu for this message -->
          <div class="qmf-chat-message-context-menu" style="display:none">
            ${!isSent ? `
              <button class="qmf-chat-context-menu-item" data-action="mark-read">
                <i class="fas fa-check-double"></i>
                <span>Đánh dấu đã đọc</span>
              </button>
              <button class="qmf-chat-context-menu-item" data-action="mute">
                <i class="fas fa-bell-slash"></i>
                <span>Tắt thông báo</span>
              </button>
              <button class="qmf-chat-context-menu-item" data-action="ignore">
                <i class="fas fa-eye-slash"></i>
                <span>Bỏ qua tin nhắn này</span>
              </button>
              <div class="qmf-chat-context-menu-divider"></div>
              <button class="qmf-chat-context-menu-item danger" data-action="block">
                <i class="fas fa-ban"></i>
                <span>Chặn người dùng</span>
              </button>
              <button class="qmf-chat-context-menu-item danger" data-action="report">
                <i class="fas fa-flag"></i>
                <span>Báo cáo tin nhắn</span>
              </button>
            ` : `
              <button class="qmf-chat-context-menu-item" data-action="copy">
                <i class="fas fa-copy"></i>
                <span>Sao chép</span>
              </button>
              <button class="qmf-chat-context-menu-item" data-action="edit">
                <i class="fas fa-edit"></i>
                <span>Chỉnh sửa</span>
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }
  
  _bindMessageActions() {
    this.elements.messagesArea.querySelectorAll('.qmf-chat-message').forEach(msgEl => {
      const msgId = msgEl.dataset.messageId;
      const msg = this.messages.find(m => m.id === msgId);
      
      // Reply
      msgEl.querySelector('.reply')?.addEventListener('click', () => {
        this._setReply(msg);
      });
      
      // React
      msgEl.querySelector('.react')?.addEventListener('click', (e) => {
        this._showReactionPicker(e.target, msgId);
      });
      
      // Delete
      msgEl.querySelector('.delete')?.addEventListener('click', () => {
        this._deleteMessage(msgId);
      });
      
      // More (context menu)
      msgEl.querySelector('.more')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleMessageContextMenu(msgEl);
      });
      
      // Context menu item clicks
      msgEl.querySelectorAll('.qmf-chat-context-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = item.dataset.action;
          this._handleMessageContextAction(action, msg);
          this._closeAllContextMenus();
        });
      });
      
      // Reaction click
      msgEl.querySelectorAll('.qmf-chat-message-reaction').forEach(reactionEl => {
        reactionEl.addEventListener('click', () => {
          const emoji = reactionEl.dataset.emoji;
          this._toggleReaction(msgId, emoji);
        });
      });
    });
    
    // Close context menu on outside click
    document.addEventListener('click', () => this._closeAllContextMenus());
  }
  
  _toggleMessageContextMenu(msgEl) {
    const menu = msgEl.querySelector('.qmf-chat-message-context-menu');
    if (!menu) return;
    
    const isOpen = menu.style.display === 'block';
    
    // Close all other menus first
    this._closeAllContextMenus();
    
    if (!isOpen) {
      menu.style.display = 'block';
      // Add animation
      requestAnimationFrame(() => menu.classList.add('open'));
    }
  }
  
  _closeAllContextMenus() {
    this.elements.messagesArea.querySelectorAll('.qmf-chat-message-context-menu').forEach(menu => {
      menu.classList.remove('open');
      menu.style.display = 'none';
    });
  }
  
  _handleMessageContextAction(action, msg) {
    const user = this.currentConversation?.friend || this.currentConversation;
    
    switch (action) {
      case 'mark-read':
        this.socket?.emit('markSeen', { peerId: user?.id, messageId: msg?.id });
        this._showToast('Đã đánh dấu đã đọc');
        break;
        
      case 'mute':
        this._showToast('Đã tắt thông báo cho tin nhắn này');
        break;
        
      case 'ignore':
        this._showToast('Đã bỏ qua tin nhắn');
        break;
        
      case 'block':
        if (confirm(`Bạn có chắc muốn chặn ${user?.display_name || user?.username}?`)) {
          this._blockUser(user?.id);
        }
        break;
        
      case 'report':
        this._showReportDialog(user?.id, msg?.id);
        break;
        
      case 'copy':
        if (msg?.content) {
          navigator.clipboard?.writeText(msg.content);
          this._showToast('Đã sao chép tin nhắn');
        }
        break;
        
      case 'edit':
        this._editMessage(msg);
        break;
    }
  }
  
  _editMessage(msg) {
    // TODO: Implement message editing
    this._showToast('Tính năng chỉnh sửa đang được phát triển', 'warning');
  }
  
  _setReply(msg) {
    this.replyingTo = msg;
    this.elements.replyName.textContent = msg.sender_id === this.currentUserId ? 'Bạn' : 
      (this.currentConversation?.friend?.display_name || 'Unknown');
    this.elements.replyText.textContent = msg.content;
    this.elements.replyBar.classList.add('visible');
    this.elements.input.focus();
  }
  
  _cancelReply() {
    this.replyingTo = null;
    this.elements.replyBar.classList.remove('visible');
  }
  
  _showReactionPicker(target, msgId) {
    // Remove existing picker
    document.querySelector('.qmf-chat-reaction-picker')?.remove();
    
    const picker = document.createElement('div');
    picker.className = 'qmf-chat-reaction-picker open';
    picker.innerHTML = ['❤️', '👍', '😂', '😮', '😢', '😡'].map(emoji => `
      <button class="qmf-chat-reaction-option" data-emoji="${emoji}">${emoji}</button>
    `).join('');
    
    target.closest('.qmf-chat-message-actions').appendChild(picker);
    
    picker.querySelectorAll('.qmf-chat-reaction-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this._toggleReaction(msgId, btn.dataset.emoji);
        picker.remove();
      });
    });
    
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!picker.contains(e.target)) {
          picker.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 0);
  }
  
  _toggleReaction(msgId, emoji) {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('reaction', { messageId: msgId, emoji });
  }
  
  _deleteMessage(msgId) {
    if (!confirm('Bạn có chắc muốn xóa tin nhắn này?')) return;
    
    if (this.socket && this.isConnected) {
      this.socket.emit('deleteMessage', { messageId: msgId });
    }
  }
  
  _groupReactions(reactions) {
    const grouped = {};
    reactions.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = [];
      grouped[r.emoji].push(r.user_id);
    });
    return grouped;
  }
  
  _formatMessageContent(content) {
    if (!content) return '';
    
    // Escape HTML
    let escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Convert URLs to links
    escaped = escaped.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener">$1</a>'
    );
    
    // Convert line breaks
    escaped = escaped.replace(/\n/g, '<br>');
    
    return escaped;
  }
  
  _formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút`;
    if (diff < 86400000) return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }
  
  _sendMessage() {
    const content = this.elements.input.value.trim();
    if (!content || !this.currentConversation) return;
    
    const user = this.currentConversation.friend || this.currentConversation;
    
    const messageData = {
      peerId: user.id,
      content,
      replyTo: this.replyingTo?.id || null
    };
    
    if (this.socket && this.isConnected) {
      this.socket.emit('sendMessage', messageData);
    }
    
    // Clear input
    this.elements.input.value = '';
    this._autoResize();
    this._updateSendButton();
    this._cancelReply();
    
    // Optimistic update
    const tempMsg = {
      id: 'temp-' + Date.now(),
      sender_id: this.currentUserId,
      content,
      created_at: new Date().toISOString(),
      reply_to: this.replyingTo
    };
    
    this.messages.push(tempMsg);
    this._renderMessages();
  }
  
  _handleNewMessage(data) {
    const msg = data.message || data;
    const user = this.currentConversation?.friend || this.currentConversation;
    
    // If in conversation with this user
    if (this.currentConversation && (msg.sender_id === user?.id || msg.receiver_id === user?.id)) {
      // Remove temp message if exists
      this.messages = this.messages.filter(m => !m.id.toString().startsWith('temp-'));
      this.messages.push(msg);
      this._renderMessages();
      
      // Mark as seen
      if (msg.sender_id !== this.currentUserId) {
        this.socket?.emit('markSeen', { peerId: msg.sender_id });
      }
    }
    
    // Update conversation list
    this._loadConversations();
    
    // Update badge
    this._updateUnreadCount();
  }
  
  _handleTyping(data) {
    const user = this.currentConversation?.friend || this.currentConversation;
    if (data.userId === user?.id) {
      this.peerTyping = true;
      this.elements.headerSubtitle.innerHTML = '<span class="typing">Đang nhập...</span>';
      this._showTypingIndicator();
    }
  }
  
  _handleStopTyping(data) {
    const user = this.currentConversation?.friend || this.currentConversation;
    if (data.userId === user?.id) {
      this.peerTyping = false;
      this.elements.headerSubtitle.textContent = user.online ? 'Đang hoạt động' : 'Offline';
      this._hideTypingIndicator();
    }
  }
  
  _showTypingIndicator() {
    if (this.elements.messagesArea.querySelector('.qmf-chat-typing')) return;
    
    const user = this.currentConversation?.friend || this.currentConversation;
    const indicator = document.createElement('div');
    indicator.className = 'qmf-chat-typing';
    indicator.innerHTML = `
      <img class="qmf-chat-typing-avatar" src="${user?.avatar_url || user?.avatar || ''}" alt="">
      <div class="qmf-chat-typing-dots">
        <span class="qmf-chat-typing-dot"></span>
        <span class="qmf-chat-typing-dot"></span>
        <span class="qmf-chat-typing-dot"></span>
      </div>
    `;
    
    this.elements.messagesArea.appendChild(indicator);
    this._scrollToBottom();
  }
  
  _hideTypingIndicator() {
    this.elements.messagesArea.querySelector('.qmf-chat-typing')?.remove();
  }
  
  _handleMessageSeen(data) {
    // Update message status
    this.messages.forEach(msg => {
      if (msg.sender_id === this.currentUserId && !msg.seen_at) {
        msg.seen_at = data.seenAt || new Date().toISOString();
      }
    });
    this._renderMessages();
  }
  
  _handleReaction(data) {
    const msg = this.messages.find(m => m.id === data.messageId);
    if (msg) {
      if (!msg.reactions) msg.reactions = [];
      
      // Toggle reaction
      const existing = msg.reactions.findIndex(r => r.user_id === data.userId && r.emoji === data.emoji);
      if (existing >= 0) {
        msg.reactions.splice(existing, 1);
      } else {
        msg.reactions.push({ user_id: data.userId, emoji: data.emoji });
      }
      
      this._renderMessages();
    }
  }
  
  _handleMessageDeleted(data) {
    this.messages = this.messages.filter(m => m.id !== data.messageId);
    this._renderMessages();
  }
  
  _emitTyping() {
    if (!this.socket || !this.isConnected || !this.currentConversation) return;
    
    const user = this.currentConversation.friend || this.currentConversation;
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    this.socket.emit('typing', { peerId: user.id });
    
    this.typingTimeout = setTimeout(() => {
      this.socket.emit('stopTyping', { peerId: user.id });
    }, 2000);
  }
  
  _handleMenuAction(action) {
    const user = this.currentConversation?.friend || this.currentConversation;
    if (!user) return;
    
    switch (action) {
      case 'mark-read':
        this.socket?.emit('markSeen', { peerId: user.id });
        this._showToast('Đã đánh dấu đã đọc');
        break;
        
      case 'mute':
        this._showToast('Đã tắt thông báo');
        break;
        
      case 'ignore':
        this._showToast('Đã bỏ qua tin nhắn');
        break;
        
      case 'block':
        if (confirm(`Bạn có chắc muốn chặn ${user.display_name || user.username}?`)) {
          this._blockUser(user.id);
        }
        break;
        
      case 'report':
        this._showReportDialog(user.id);
        break;
    }
  }
  
  _blockUser(userId) {
    // TODO: Call API to block user
    this._showToast('Đã chặn người dùng', 'success');
    this._showConversationList();
  }
  
  _showReportDialog(userId) {
    // TODO: Show report dialog
    this._showToast('Tính năng báo cáo đang được phát triển', 'warning');
  }
  
  _acceptMessageRequest() {
    const user = this.currentConversation?.friend || this.currentConversation;
    if (!user) return;
    
    // TODO: Call API to accept
    this.elements.requestBanner.style.display = 'none';
    this._showToast('Đã chấp nhận tin nhắn', 'success');
  }
  
  _declineMessageRequest() {
    const user = this.currentConversation?.friend || this.currentConversation;
    if (!user) return;
    
    // TODO: Call API to decline
    this._showToast('Đã từ chối tin nhắn');
    this._showConversationList();
  }
  
  _reportSpam() {
    const user = this.currentConversation?.friend || this.currentConversation;
    if (!user) return;
    
    // TODO: Call API to report spam
    this._showToast('Đã báo cáo spam', 'success');
    this._showConversationList();
  }
  
  _showConversationList() {
    this.container.classList.remove('in-conversation');
    this.currentConversation = null;
    this.messages = [];
    this._cancelReply();
    
    // Hide conversation menu button
    const convMenuBtn = this.container.querySelector('.qmf-chat-header-action.conversation-menu');
    if (convMenuBtn) convMenuBtn.style.display = 'none';
    
    // Reset header
    this.elements.headerName.textContent = 'Tin nhắn';
    this.elements.headerSubtitle.textContent = '';
    this.elements.headerAvatar.src = this._getDefaultAvatarSVG();
  }
  
  _filterConversations(query) {
    const items = this.elements.conversationList.querySelectorAll('.qmf-chat-item');
    const q = query.toLowerCase();
    
    items.forEach(item => {
      const name = item.querySelector('.qmf-chat-item-name')?.textContent.toLowerCase() || '';
      item.style.display = name.includes(q) ? 'flex' : 'none';
    });
  }
  
  _autoResize() {
    const input = this.elements.input;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }
  
  _updateSendButton() {
    const hasContent = this.elements.input.value.trim().length > 0;
    this.elements.sendBtn.disabled = !hasContent;
  }
  
  _scrollToBottom() {
    this.elements.messagesArea.scrollTop = this.elements.messagesArea.scrollHeight;
  }
  
  _updateUnreadCount() {
    let total = 0;
    this.conversations.forEach(c => {
      total += c.unread_count || 0;
    });
    
    this.unreadCount = total;
    
    if (this.button) {
      const badge = this.button.querySelector('.qmf-chat-button-badge');
      if (total > 0) {
        badge.textContent = total > 99 ? '99+' : total;
        badge.style.display = 'flex';
        this.button.classList.add('has-unread');
      } else {
        badge.style.display = 'none';
        this.button.classList.remove('has-unread');
      }
    }
    
    // Emit event for header badge
    window.dispatchEvent(new CustomEvent('qmf:chatUnreadCount', { detail: { count: total } }));
  }
  
  _showToast(message, type = 'default') {
    const existing = document.querySelector('.qmf-chat-toast');
    existing?.remove();
    
    const toast = document.createElement('div');
    toast.className = `qmf-chat-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => toast.classList.add('visible'));
    
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  // Public API
  show() {
    // Clear inline styles and show
    this.container.style.cssText = '';
    this.container.classList.add('visible');
    this.container.classList.remove('minimized');
    this.isMinimized = false;
  }
  
  hide() {
    this.container.classList.remove('visible');
    this.container.classList.remove('minimized');
    this.isMinimized = false;
  }
  
  minimize() {
    if (this.isMinimized) {
      // Restore from minimized state
      this.container.classList.remove('minimized');
      this.isMinimized = false;
      // Update button icon
      const icon = this.elements.minimizeBtn?.querySelector('i');
      if (icon) {
        icon.className = 'fas fa-minus';
      }
      this.elements.minimizeBtn?.setAttribute('title', 'Thu nhỏ');
    } else {
      // Minimize
      this.container.classList.add('minimized');
      this.isMinimized = true;
      // Update button icon
      const icon = this.elements.minimizeBtn?.querySelector('i');
      if (icon) {
        icon.className = 'fas fa-window-maximize';
      }
      this.elements.minimizeBtn?.setAttribute('title', 'Phóng to');
    }
  }
  
  toggle() {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  isVisible() {
    return this.container.classList.contains('visible');
  }
  
  openChat(user) {
    this.show();
    this._openConversation({ friend: user });
  }
  
  destroy() {
    this.socket?.disconnect();
    this.container?.remove();
    this.button?.remove();
    document.getElementById('qmf-chat-css')?.remove();
  }
}

// Auto-init function
function initQMFChat(options = {}) {
  if (window.qmfChat) {
    return window.qmfChat;
  }
  
  window.qmfChat = new QMFChat(options);
  return window.qmfChat;
}

// Export
window.QMFChat = QMFChat;
window.initQMFChat = initQMFChat;
