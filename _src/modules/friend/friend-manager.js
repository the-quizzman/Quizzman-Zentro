/**
 * Friend Manager Module
 * Unified friend management UI for all Quizzman frontends
 * Serves via chat-service for consistent UX across platforms
 */

(function() {
  'use strict';

  const STYLE_ID = 'classroom-friend-manager-style';

  function resolveChatServiceBase() {
    if (typeof window === 'undefined') {
      return 'https://chat.quizzman.com';
    }

    const explicit =
      window.__CHAT_SERVICE_BASE_URL ||
      window.CHAT_SERVICE_BASE_URL ||
      window.QuizzmanChatServiceBase ||
      window.QuizzmanChatServer;

    if (explicit && typeof explicit === 'string') {
      return explicit.replace(/\/+$/, '');
    }

    return 'https://chat.quizzman.com';
  }

  const CHAT_SERVICE_BASE = resolveChatServiceBase();
  if (typeof window !== 'undefined' && !window.__CHAT_SERVICE_BASE_URL) {
    window.__CHAT_SERVICE_BASE_URL = CHAT_SERVICE_BASE;
  }

  function normalizeServerUrl(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }
    return url.replace(/\/+$/, '');
  }

  const CSS_PATH = '/chat/friend-manager.css';
  const CSS_VERSION = 'v2025120101'; // Cache busting version

  // Auto-inject CSS
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = CHAT_SERVICE_BASE + CSS_PATH + '?' + CSS_VERSION;
    document.head.appendChild(link);
    
    // Inject friend button CSS
    injectFriendButtonCSS();
  }
  
  // Inject CSS for friend button
  function injectFriendButtonCSS() {
    if (document.getElementById('friend-manager-button-style')) return;
    
    const style = document.createElement('style');
    style.id = 'friend-manager-button-style';
    style.textContent = `
      .fm-friend-button {
        position: fixed;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        border: none;
        border-radius: 50%;
        color: white;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 6px 20px rgba(40, 167, 69, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 9998;
        font-family: inherit;
        border: 3px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
      }
      
      .fm-friend-button:hover {
        transform: scale(1.1);
        box-shadow: 0 8px 25px rgba(40, 167, 69, 0.4);
        background: linear-gradient(135deg, #218838 0%, #1ea480 100%);
      }
      
      .fm-friend-button:active {
        transform: scale(0.95);
      }
      
      .fm-friend-button i {
        font-size: 24px;
        transition: transform 0.3s ease;
      }
      
      .fm-friend-button:hover i {
        transform: scale(1.1);
      }
      
      .fm-friend-button.has-requests {
        animation: friendButtonPulse 2s infinite;
      }
      
      .fm-friend-button-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #dc3545;
        color: white;
        border-radius: 50%;
        min-width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      
      @keyframes friendButtonPulse {
        0%, 100% { box-shadow: 0 6px 20px rgba(40, 167, 69, 0.3); }
        50% { box-shadow: 0 6px 20px rgba(40, 167, 69, 0.6), 0 0 0 10px rgba(40, 167, 69, 0.1); }
      }
      
      @media (max-width: 768px) {
        .fm-friend-button {
          width: 55px;
          height: 55px;
          font-size: 22px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Helper functions
  function getAuthToken() {
    // Use centralized auth utils if available
    if (window.ChatAuthUtils && typeof window.ChatAuthUtils.getAuthToken === 'function') {
      const token = window.ChatAuthUtils.getAuthToken();
      if (token) return token;
    }
    
    // Fallback to legacy token retrieval
    // 1. CMS Auth (if available - from homework dashboard)
    if (window.cmsAuth && typeof window.cmsAuth.getToken === 'function') {
      const token = window.cmsAuth.getToken();
      if (token) return token;
    }
    
    // 2. Auth Manager (if available - from library)
    if (window.authManager && typeof window.authManager.getToken === 'function') {
      const token = window.authManager.getToken();
      if (token) return token;
    }
    
    // 3. QuizzmanAuth global (if available)
    if (window.QuizzmanAuth && typeof window.QuizzmanAuth.getToken === 'function') {
      const token = window.QuizzmanAuth.getToken();
      if (token) return token;
    }
    // 2. localStorage (common storage) - check quizzman_auth_token first
    const storageKeys = ['quizzman_auth_token', 'authToken', 'auth_token', 'session_token', 'access_token', 'token'];
    for (const key of storageKeys) {
      try {
        const token = localStorage.getItem(key);
        if (token) return token;
      } catch (_) {}
    }
    // 3. Cookie fallback
    try {
      const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
      if (match) return match[1];
    } catch (_) {}
    return null;
  }

  function fetchJSON(url, options = {}) {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // Add token to headers if available
    if (token) {
      headers['x-auth-token'] = token;
    } else {
      console.warn('[FriendManager] No token available for request:', url);
    }

    return fetch(url, {
      credentials: 'include', // Send cookies for authentication
      ...options,
      headers
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) {
        console.error('[FriendManager] Request failed:', {
          url,
          status: res.status,
          error: data.error || data.message,
          hasToken: !!token
        });
        throw new Error(data.error || data.message || 'Request failed');
      }
      return data;
    });
  }

  function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  }

  function getAvatarUrl(user) {
    if (!user) return null;
    
    // If user has avatar_url, use it directly
    if (user.avatar_url) {
      // If it's already a full URL (Google, external), use as-is
      if (user.avatar_url.startsWith('http')) {
        return user.avatar_url;
      }
      // If it's a relative path, prefix with id-sys domain
      return `https://id.quizzman.com${user.avatar_url}`;
    }
    
    // Check for legacy avatar field
    if (user.avatar) {
      if (user.avatar.startsWith('http')) {
        return user.avatar;
      }
      return `https://id.quizzman.com${user.avatar}`;
    }
    
    // No avatar available
    return null;
  }

  // Toast notification
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `classroom-friend-toast classroom-friend-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('classroom-friend-toast-show'), 10);
    setTimeout(() => {
      toast.classList.remove('classroom-friend-toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Create Friend Manager UI
  function createFriendManagerUI() {
    ensureStyle();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'classroom-friend-overlay';
    overlay.id = 'classroomFriendOverlay';

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'classroom-friend-popup';
    popup.id = 'classroomFriendPopup';
    popup.innerHTML = `
      <div class="classroom-friend-popup-header">
      <h2 class="classroom-friend-popup-title"><i class="fas fa-users"></i> Quản lý bạn bè</h2>
      <button class="classroom-friend-popup-close" id="classroomFriendClose"><i class="fas fa-times"></i></button>
      </div>
      <div class="classroom-friend-popup-tabs">
      <button class="classroom-friend-popup-tab classroom-active" data-tab="search">
        <i class="fas fa-search"></i> Tìm kiếm
      </button>
      <button class="classroom-friend-popup-tab" data-tab="sent">
        <i class="fas fa-paper-plane"></i> Đã gửi <span class="classroom-friend-tab-badge classroom-hidden" id="sentBadge">0</span>
      </button>
      <button class="classroom-friend-popup-tab" data-tab="requests">
        <i class="fas fa-inbox"></i> Lời mời <span class="classroom-friend-tab-badge classroom-hidden" id="requestsBadge">0</span>
      </button>
      <button class="classroom-friend-popup-tab" data-tab="friends">
        <i class="fas fa-star"></i> Bạn bè
      </button>
      <button class="classroom-friend-popup-tab" data-tab="blocked">
        <i class="fas fa-ban"></i> Đã chặn
      </button>
      </div>
      <div class="classroom-friend-popup-content">
      <!-- Search Tab -->
      <div class="classroom-friend-tab-view classroom-active" id="searchTab">
        <div class="classroom-friend-search-container">
        <input type="text" class="classroom-friend-search-input" id="friendSearchInput" placeholder="Tìm kiếm bằng tên, email hoặc ID...">
        </div>
        <div id="searchResults"></div>
      </div>

      <!-- Sent Requests Tab -->
      <div class="classroom-friend-tab-view" id="sentTab">
        <div id="sentRequestsList"></div>
      </div>

      <!-- Friend Requests Tab -->
      <div class="classroom-friend-tab-view" id="requestsTab">
        <div id="friendRequestsList"></div>
      </div>

      <!-- Friends List Tab -->
      <div class="classroom-friend-tab-view" id="friendsTab">
        <div class="classroom-friends-grid" id="friendsList"></div>
      </div>

      <!-- Blocked Users Tab -->
      <div class="classroom-friend-tab-view" id="blockedTab">
        <div class="classroom-friends-grid" id="blockedList"></div>
      </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    return { overlay, popup };
  }

  // Create confirmation container
  function createConfirmContainer() {
    const container = document.createElement('div');
    container.className = 'classroom-friend-confirm-container';
    container.id = 'classroomFriendConfirm';
    container.innerHTML = `
      <div class="classroom-friend-confirm-header">
        <div class="classroom-friend-confirm-title">
          📥 Lời mời kết bạn
          <span class="classroom-friend-badge classroom-hidden" id="confirmBadge">0</span>
        </div>
        <button class="classroom-friend-manage-btn" id="openFriendManager">Quản lý</button>
      </div>
      <div id="confirmRequestsList"></div>
    `;
    return container;
  }

  // Friend Manager Class
  class FriendManager {
    constructor(options = {}) {
      const resolvedServer = normalizeServerUrl(
        typeof options.server === 'string' && options.server
          ? options.server
          : CHAT_SERVICE_BASE
      ) || CHAT_SERVICE_BASE;

      const resolvedGetToken =
        typeof options.getToken === 'function' ? options.getToken : getAuthToken;

      const wrappedGetToken = (...args) => resolvedGetToken.apply(this, args);

      this.options = {
        ...options,
        server: resolvedServer,
        createFriendButton: options.createFriendButton !== false,
        friendButtonPosition: options.friendButtonPosition || 'bottom-left',
        friendButtonIcon: options.friendButtonIcon || '<i class="fas fa-user-friends"></i>',
        onChatStart: options.onChatStart,
        debug: options.debug || false
      };

      this.options.getToken = wrappedGetToken;
      this.server = resolvedServer;
      this.getToken = wrappedGetToken;
      this.options.server = this.server;
      
      this.state = {
        friends: [],
        pendingRequests: [],
        searchResults: [],
        currentTab: 'friends'
      };
      
      // Initialize blocked users set
      this.blockedUsers = new Set();
      
      // Create UI elements
      this.ui = createFriendManagerUI();
      this.confirmContainer = createConfirmContainer();
      this.friendButton = null;
      this.init();
    }
    
    log(...args) {
      if (this.options.debug) {
        console.log('[FriendManager]', ...args);
      }
    }

    init() {
      this.bindEvents();
      this.loadPendingRequests();
      this.startPolling();
      
      // Create friend button if enabled
      if (this.options.createFriendButton) {
        this.createFriendButton();
      }
    }

    bindEvents() {
      const { overlay, popup } = this.ui;

      // Close handlers
      overlay.addEventListener('click', () => this.close());
      popup.querySelector('#classroomFriendClose').addEventListener('click', () => this.close());

      // Tab switching
      popup.querySelectorAll('.classroom-friend-popup-tab').forEach(tab => {
        tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
      });

      // Search input
      const searchInput = popup.querySelector('#friendSearchInput');
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.search(e.target.value), 300);
      });
    }

    createFriendButton() {
      // Check if friend button already exists
      if (document.querySelector('.fm-friend-button')) {
        this.log('Friend button already exists');
        return;
      }

      this.friendButton = document.createElement('button');
      this.friendButton.className = 'fm-friend-button';
      this.friendButton.innerHTML = `
        ${this.options.friendButtonIcon}
        <span class="fm-friend-button-badge" style="display: none;">0</span>
      `;
      
      // Position based on options
      const positions = {
        'bottom-left': { bottom: '20px', left: '20px' },
        'bottom-right': { bottom: '20px', right: '90px' }, // Offset to avoid chat button
        'top-left': { top: '20px', left: '20px' },
        'top-right': { top: '20px', right: '20px' }
      };
      
      const pos = positions[this.options.friendButtonPosition] || positions['bottom-left'];
      Object.assign(this.friendButton.style, pos);
      
      // Click handler
      this.friendButton.addEventListener('click', () => {
        this.open();
      });
      
      document.body.appendChild(this.friendButton);
      this.log('Friend button created at', this.options.friendButtonPosition);
    }

    // Update friend button badge
    updateFriendButtonBadge(count) {
      if (!this.friendButton) return;
      
      const badge = this.friendButton.querySelector('.fm-friend-button-badge');
      if (!badge) return;
      
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
        this.friendButton.classList.add('has-requests');
      } else {
        badge.style.display = 'none';
        this.friendButton.classList.remove('has-requests');
      }
    }

    attachToButton(buttonElement) {
      if (!buttonElement) return;

      // Wrap button with container for badge
      const wrapper = document.createElement('div');
      wrapper.className = 'classroom-friend-btn-wrapper';
      buttonElement.parentNode.insertBefore(wrapper, buttonElement);
      wrapper.appendChild(buttonElement);

      // Add badge
      const badge = document.createElement('span');
      badge.className = 'classroom-friend-badge classroom-hidden';
      badge.id = 'friendBtnBadge';
      wrapper.appendChild(badge);

      // Add confirmation container
      this.confirmContainer = createConfirmContainer();
      wrapper.appendChild(this.confirmContainer);

      // Button click to toggle confirm container
      buttonElement.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleConfirmContainer();
      });

      // Manage button opens popup
      this.confirmContainer.querySelector('#openFriendManager').addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideConfirmContainer();
        this.open();
      });

      // Close confirm container when clicking outside
      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
          this.hideConfirmContainer();
        }
      });
    }

    toggleConfirmContainer() {
      this.confirmContainer.classList.toggle('classroom-show');
      if (this.confirmContainer.classList.contains('classroom-show')) {
        this.loadConfirmRequests();
      }
    }

    hideConfirmContainer() {
      this.confirmContainer.classList.remove('classroom-show');
    }

    open() {
      this.ui.overlay.classList.add('classroom-show');
      this.ui.popup.classList.add('classroom-show');
      
      // Pre-fetch all data when opening
      this.loadPendingRequests();
      this.loadSentRequests();
      this.loadFriendRequests();
      this.loadFriendsList();
      this.updateBadge();
      
      this.switchTab('search');
      document.body.style.overflow = 'hidden';
    }

    close() {
      this.ui.overlay.classList.remove('classroom-show');
      this.ui.popup.classList.remove('classroom-show');
      this.hideConfirmContainer();
      document.body.style.overflow = '';
    }

    switchTab(tabName) {
      // Update tabs
      this.ui.popup.querySelectorAll('.classroom-friend-popup-tab').forEach(tab => {
        tab.classList.toggle('classroom-active', tab.dataset.tab === tabName);
      });

      // Update views
      this.ui.popup.querySelectorAll('.classroom-friend-tab-view').forEach(view => {
        view.classList.remove('classroom-active');
      });
      this.ui.popup.querySelector(`#${tabName}Tab`).classList.add('classroom-active');

      // Load data for tab
      switch(tabName) {
        case 'sent':
          this.loadSentRequests();
          break;
        case 'requests':
          this.loadFriendRequests();
          break;
        case 'friends':
          this.loadFriendsList();
          break;
        case 'blocked':
          this.loadBlockedUsers();
          break;
      }
    }

    async search(query) {
      const resultsContainer = this.ui.popup.querySelector('#searchResults');
      
      if (!query || query.length < 2) {
        resultsContainer.innerHTML = `
          <div class="classroom-friend-empty-state">
            <div class="classroom-friend-empty-icon">🔍</div>
            <div class="classroom-friend-empty-text">Nhập ít nhất 2 ký tự để tìm kiếm</div>
          </div>
        `;
        return;
      }

      resultsContainer.innerHTML = `
        <div class="classroom-friend-loading">
          <div class="classroom-friend-spinner"></div>
          <div class="classroom-friend-loading-text">Đang tìm kiếm...</div>
        </div>
      `;

      try {
        const token = this.getToken();
        const data = await fetchJSON(`${this.server}/api/friend/search?q=${encodeURIComponent(query)}`, {
          headers: { 'x-auth-token': token }
        });

        if (!data.results || data.results.length === 0) {
          resultsContainer.innerHTML = `
            <div class="classroom-friend-empty-state">
              <div class="classroom-friend-empty-icon">😔</div>
              <div class="classroom-friend-empty-text">Không tìm thấy kết quả</div>
            </div>
          `;
          return;
        }

        resultsContainer.innerHTML = data.results.map(user => this.renderSearchUser(user)).join('');
        
        // Bind send request buttons
        resultsContainer.querySelectorAll('[data-action="send"]').forEach(btn => {
          btn.addEventListener('click', () => this.sendFriendRequest(btn.dataset.userId));
        });
      } catch (error) {
        console.error('Search error:', error);
        resultsContainer.innerHTML = `
          <div class="classroom-friend-empty-state">
            <div class="classroom-friend-empty-icon">❌</div>
            <div class="classroom-friend-empty-text">Lỗi: ${error.message}</div>
          </div>
        `;
      }
    }

    renderSearchUser(user) {
      const initial = (user.display_name || user.name || user.username || user.email || '?')[0].toUpperCase();
      const avatarUrl = getAvatarUrl(user);
      const avatarContent = avatarUrl
        ? `<img src="${avatarUrl}" alt="${user.display_name || user.username}" onerror="this.style.display='none'; this.parentNode.innerHTML='${initial}';")>` 
        : initial;

      return `
        <div class="classroom-friend-user-item">
          <div class="classroom-friend-user-avatar">${avatarContent}</div>
          <div class="classroom-friend-user-info">
            <div class="classroom-friend-user-name">${user.display_name || user.name || user.username || 'User'}</div>
            <div class="classroom-friend-user-email">${user.email || user.username || user.id}</div>
          </div>
          <div class="classroom-friend-user-action">
            <button class="classroom-friend-btn classroom-friend-btn-primary" data-action="send" data-user-id="${user.id}">
              + Kết bạn
            </button>
          </div>
        </div>
      `;
    }

    async sendFriendRequest(userId) {
      try {
        const token = this.getToken();
        await fetchJSON(`${this.server}/api/friend/request`, {
          method: 'POST',
          headers: { 'x-auth-token': token },
          body: JSON.stringify({ to_user_id: userId })
        });

        showToast('✅ Đã gửi lời mời kết bạn!', 'success');
        
        // Update button to "Thu hồi" immediately
        const button = this.ui.popup.querySelector(`button[data-user-id="${userId}"][data-action="send"]`);
        if (button) {
          button.textContent = '↩ Thu hồi';
          button.className = 'classroom-friend-btn classroom-friend-btn-secondary';
          button.dataset.action = 'recall';
        }
        
        this.loadSentRequests();
        this.updateBadge();
      } catch (error) {
        console.error('Send request error:', error);
        showToast('❌ Lỗi: ' + error.message, 'error');
      }
    }

    async loadSentRequests() {
      const container = this.ui.popup.querySelector('#sentRequestsList');
      container.innerHTML = `
        <div class="classroom-friend-loading">
          <div class="classroom-friend-spinner"></div>
          <div class="classroom-friend-loading-text">Đang tải...</div>
        </div>
      `;

      try {
        const token = this.getToken();
        const data = await fetchJSON(`${this.server}/api/friend/sent`, {
          headers: { 'x-auth-token': token }
        });

        if (!data.requests || data.requests.length === 0) {
          container.innerHTML = `
            <div class="classroom-friend-empty-state">
              <div class="classroom-friend-empty-icon"></div>
              <div class="classroom-friend-empty-text">Chưa có lời mời nào được gửi</div>
            </div>
          `;
          return;
        }

        container.innerHTML = `<div class="classroom-friend-sent-list">
          ${data.requests.map(req => this.renderSentRequest(req)).join('')}
        </div>`;

        // Update badge
        const badge = this.ui.popup.querySelector('#sentBadge');
        if (data.requests.length > 0) {
          badge.textContent = data.requests.length;
          badge.classList.remove('classroom-hidden');
        } else {
          badge.classList.add('classroom-hidden');
        }

        // Bind recall buttons
        container.querySelectorAll('[data-action="recall"]').forEach(btn => {
          btn.addEventListener('click', () => this.recallRequest(btn.dataset.requestId));
        });
      } catch (error) {
        console.error('Load sent requests error:', error);
        container.innerHTML = `
          <div class="classroom-friend-empty-state">
            <div class="classroom-friend-empty-icon">❌</div>
            <div class="classroom-friend-empty-text">Lỗi: ${error.message}</div>
          </div>
        `;
      }
    }

    renderSentRequest(request) {
      const user = request.to_user || {};
      const initial = (user.display_name || user.username || '?')[0].toUpperCase();
      const avatarUrl = user.avatar_url || request.receiver_avatar;
      const avatarContent = avatarUrl
        ? `<img src="${avatarUrl}" alt="${user.display_name || user.username}">` 
        : initial;
      
      const userName = user.display_name || user.username || request.receiver_name || 'User';

      return `
        <div class="classroom-friend-sent-item">
          <div class="classroom-friend-sent-avatar">${avatarContent}</div>
          <div class="classroom-friend-sent-info">
            <div class="classroom-friend-sent-name">${userName}</div>
            <div class="classroom-friend-sent-status">Đã gửi ${formatTimeAgo(request.created_at)}</div>
          </div>
          <div class="classroom-friend-sent-actions">
            <button class="classroom-friend-btn classroom-friend-btn-recall" data-action="recall" data-request-id="${request.id}">
              Thu hồi
            </button>
          </div>
        </div>
      `;
    }

    async recallRequest(requestId) {
      if (!confirm('Bạn có chắc muốn thu hồi lời mời này?')) return;

      try {
        const token = this.getToken();
        await fetchJSON(`${this.server}/api/friend/recall/${requestId}`, {
          method: 'DELETE',
          headers: { 'x-auth-token': token }
        });

        showToast('✅ Đã thu hồi lời mời', 'success');
        this.loadSentRequests();
        this.updateBadge();
      } catch (error) {
        console.error('Recall error:', error);
        showToast('❌ Lỗi: ' + error.message, 'error');
      }
    }

    async loadFriendRequests() {
      const container = this.ui.popup.querySelector('#friendRequestsList');
      container.innerHTML = `
        <div class="classroom-friend-loading">
          <div class="classroom-friend-spinner"></div>
          <div class="classroom-friend-loading-text">Đang tải...</div>
        </div>
      `;

      try {
        const token = this.getToken();
        const data = await fetchJSON(`${this.server}/api/friend/pending`, {
          headers: { 'x-auth-token': token }
        });

        if (!data.requests || data.requests.length === 0) {
          container.innerHTML = `
            <div class="classroom-friend-empty-state">
              <div class="classroom-friend-empty-icon"></div>
              <div class="classroom-friend-empty-text">Không có lời mời nào</div>
            </div>
          `;
          this.updateBadges(0);
          return;
        }

        container.innerHTML = data.requests.map(req => this.renderFriendRequest(req)).join('');
        this.updateBadges(data.requests.length);

        // Bind action buttons
        container.querySelectorAll('[data-action="accept"]').forEach(btn => {
          btn.addEventListener('click', () => this.acceptRequest(btn.dataset.requestId));
        });
        container.querySelectorAll('[data-action="reject"]').forEach(btn => {
          btn.addEventListener('click', () => this.rejectRequest(btn.dataset.requestId));
        });
      } catch (error) {
        console.error('Load requests error:', error);
        container.innerHTML = `
          <div class="classroom-friend-empty-state">
            <div class="classroom-friend-empty-icon">❌</div>
            <div class="classroom-friend-empty-text">Lỗi: ${error.message}</div>
          </div>
        `;
      }
    }

    async loadConfirmRequests() {
      const container = this.confirmContainer.querySelector('#confirmRequestsList');
      
      try {
        const token = this.getToken();
        const data = await fetchJSON(`${this.server}/api/friend/pending`, {
          headers: { 'x-auth-token': token }
        });

        if (!data.requests || data.requests.length === 0) {
          container.innerHTML = `
            <div class="classroom-friend-empty-state">
              <div class="classroom-friend-empty-icon">✨</div>
              <div class="classroom-friend-empty-text">Không có lời mời mới</div>
            </div>
          `;
          return;
        }

        // Show only first 3 requests in confirm container
        const limitedRequests = data.requests.slice(0, 3);
        container.innerHTML = limitedRequests.map(req => this.renderConfirmRequest(req)).join('');

        // Bind buttons
        container.querySelectorAll('[data-action="accept"]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.acceptRequest(btn.dataset.requestId);
          });
        });
        container.querySelectorAll('[data-action="reject"]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.rejectRequest(btn.dataset.requestId);
          });
        });
      } catch (error) {
        console.error('Load confirm requests error:', error);
      }
    }

    renderFriendRequest(request) {
      const user = request.from_user || {};
      const initial = (user.display_name || user.username || '?')[0].toUpperCase();
      const avatarUrl = getAvatarUrl(user);
      const avatarContent = avatarUrl 
        ? `<img src="${avatarUrl}" alt="${user.display_name}" onerror="this.style.display='none'; this.parentNode.innerHTML='${initial}';")>` 
        : initial;

      return `
        <div class="classroom-friend-request-item">
          <div class="classroom-friend-request-avatar">${avatarContent}</div>
          <div class="classroom-friend-request-info">
            <div class="classroom-friend-request-name">${user.display_name || user.username || 'User'}</div>
            <div class="classroom-friend-request-time">${formatTimeAgo(request.created_at)}</div>
          </div>
          <div class="classroom-friend-request-actions">
            <button class="classroom-friend-request-accept" data-action="accept" data-request-id="${request.id}">Chấp nhận</button>
            <button class="classroom-friend-request-reject" data-action="reject" data-request-id="${request.id}">Từ chối</button>
          </div>
        </div>
      `;
    }

    renderConfirmRequest(request) {
      return this.renderFriendRequest(request);
    }

    async acceptRequest(requestId) {
      try {
        const token = this.getToken();
        await fetchJSON(`${this.server}/api/friend/accept/${requestId}`, {
          method: 'POST',
          headers: { 'x-auth-token': token }
        });

        showToast('✅ Đã chấp nhận lời mời kết bạn!', 'success');
        this.loadFriendRequests();
        this.loadConfirmRequests();
        this.loadPendingRequests();
        this.updateBadge();
      } catch (error) {
        console.error('Accept error:', error);
        showToast('❌ Lỗi: ' + error.message, 'error');
      }
    }

    async rejectRequest(requestId) {
      try {
        const token = this.getToken();
        await fetchJSON(`${this.server}/api/friend/reject/${requestId}`, {
          method: 'POST',
          headers: { 'x-auth-token': token }
        });

        showToast('✅ Đã từ chối lời mời', 'success');
        this.loadFriendRequests();
        this.loadConfirmRequests();
        this.loadPendingRequests();
        this.updateBadge();
      } catch (error) {
        console.error('Reject error:', error);
        showToast('❌ Lỗi: ' + error.message, 'error');
      }
    }

    async loadFriendsList() {
      const container = this.ui.popup.querySelector('#friendsList');
      if (!container) {
        console.error('[FriendManager] Friends list container not found');
        return;
      }
      
      container.innerHTML = `
        <div class="classroom-friend-loading">
          <div class="classroom-friend-spinner"></div>
          <div class="classroom-friend-loading-text">Đang tải danh sách bạn bè...</div>
        </div>
      `;

      try {
        const token = this.getToken();
        
        // Load friends and blocked users in parallel
        const [friendsData, blockedData] = await Promise.all([
          fetchJSON(`${this.server}/api/friend/list`, {
            headers: { 'x-auth-token': token }
          }),
          fetchJSON(`${this.server}/api/friend/blocked`, {
            headers: { 'x-auth-token': token }
          }).catch(() => []) // Fallback to empty array if blocked endpoint fails
        ]);
        
        // Update blocked users set
        this.blockedUsers.clear();
        if (Array.isArray(blockedData)) {
          blockedData.forEach(user => this.blockedUsers.add(user.id));
        }

        if (!friendsData.friends || friendsData.friends.length === 0) {
          container.innerHTML = `
            <div class="classroom-friend-empty-state">
              <div class="classroom-friend-empty-icon"><i class="fas fa-user-friends"></i></div>
              <div class="classroom-friend-empty-text">Chưa có bạn bè nào</div>
            </div>
          `;
          return;
        }

        container.innerHTML = friendsData.friends.map(friend => this.renderFriendCard(friend)).join('');

        // Bind action buttons
        container.querySelectorAll('[data-action="chat"]').forEach(btn => {
          btn.addEventListener('click', () => this.startChat(btn.dataset.userId, btn.dataset.userName));
        });
        container.querySelectorAll('[data-action="star"]').forEach(btn => {
          btn.addEventListener('click', () => this.toggleBestFriend(btn.dataset.userId));
        });
        container.querySelectorAll('[data-action="block"]').forEach(btn => {
          btn.addEventListener('click', () => this.blockFriend(btn.dataset.userId));
        });
        container.querySelectorAll('[data-action="remove"]').forEach(btn => {
          btn.addEventListener('click', () => this.removeFriend(btn.dataset.userId));
        });
        container.querySelectorAll('[data-action="unblock"]').forEach(btn => {
          btn.addEventListener('click', () => this.unblockFriend(btn.dataset.userId));
        });
      } catch (error) {
        console.error('Load friends error:', error);
        if (container) {
          container.innerHTML = `
            <div class="classroom-friend-empty-state">
              <div class="classroom-friend-empty-icon">❌</div>
              <div class="classroom-friend-empty-text">Lỗi: ${error.message}</div>
            </div>
          `;
        }
      }
    }

    renderFriendCard(friend) {
      const user = friend.friend_user || friend;
      const initial = (user.display_name || user.username || '?')[0].toUpperCase();
      const avatarUrl = getAvatarUrl(user);
      const avatarContent = avatarUrl 
      ? `<img src="${avatarUrl}" alt="${user.display_name}" onerror="this.style.display='none'; this.parentNode.innerHTML='${initial}';")>` 
      : initial;
      
      const isBestFriend = this.bestFriends.has(user.id);
      const isBlocked = this.blockedUsers.has(user.id);
      const bestFriendBadge = isBestFriend ? '<div class="classroom-friend-bestfriend-badge">⭐</div>' : '';

      return `
      <div class="classroom-friend-card">
        <div class="classroom-friend-card-avatar">
        ${avatarContent}
        ${bestFriendBadge}
        </div>
        <div class="classroom-friend-card-name">${user.display_name || user.username || 'User'}</div>
        <div class="classroom-friend-card-status">${user.email || user.id}</div>
        <div class="classroom-friend-card-actions">
        <button class="classroom-friend-icon-btn classroom-friend-icon-btn-primary" 
            data-action="chat" 
            data-user-id="${user.id}" 
            data-user-name="${user.display_name || user.username}"
            title="Nhắn tin">
          <i class="fas fa-comment-dots"></i>
        </button>
        <button class="classroom-friend-icon-btn ${isBestFriend ? 'classroom-friend-icon-btn-warning' : 'classroom-friend-icon-btn-light'}" 
            data-action="star" 
            data-user-id="${user.id}"
            title="${isBestFriend ? 'Bỏ đánh dấu' : 'Đánh dấu bạn thân'}">
          <i class="fas fa-star ${isBestFriend ? '' : 'far'}"></i>
        </button>
        <button class="classroom-friend-icon-btn ${isBlocked ? 'classroom-friend-icon-btn-success' : 'classroom-friend-icon-btn-danger'}" 
            data-action="${isBlocked ? 'unblock' : 'block'}" 
            data-user-id="${user.id}"
            title="${isBlocked ? 'Bỏ chặn' : 'Chặn'}">
          <i class="fas ${isBlocked ? 'fa-check-circle' : 'fa-ban'}"></i>
        </button>
        </button>
        <button class="classroom-friend-icon-btn classroom-friend-icon-btn-secondary" 
            data-action="remove" 
            data-user-id="${user.id}"
            title="Xóa bạn">
          <i class="fas fa-user-minus"></i>
        </button>
        </div>
      </div>
      `;
    }

    startChat(userId, userName) {
      this.close();
      if (this.onChatStart) {
        this.onChatStart(userId, userName);
      } else {
        // this.log('Start chat with:', userId, userName);
      }
    }

    async toggleBestFriend(userId) {
      const isBestFriend = this.bestFriends.has(userId);
      
      try {
        const token = this.getToken();
        await fetchJSON(`${this.server}/api/friend/bestfriend/${userId}`, {
          method: isBestFriend ? 'DELETE' : 'POST',
          headers: { 'x-auth-token': token }
        });

        if (isBestFriend) {
          this.bestFriends.delete(userId);
          showToast('✅ Đã bỏ đánh dấu bạn thân', 'success');
        } else {
          this.bestFriends.add(userId);
          showToast('✅ Đã đánh dấu là bạn thân', 'success');
        }
        
        this.loadFriendsList();
      } catch (error) {
        console.error('Toggle best friend error:', error);
        showToast('❌ Lỗi: ' + error.message, 'error');
      }
    }

    async blockFriend(userId) {
      if (!confirm('Bạn có chắc muốn chặn người này?')) return;

      try {
        const token = this.getToken();
        await fetchJSON(`${this.server}/api/friend/block/${userId}`, {
          method: 'POST',
          headers: { 'x-auth-token': token }
        });

        showToast('✅ Đã chặn người dùng', 'success');
        this.blockedUsers.add(userId); // Add to blocked set
        this.loadFriendsList();
      } catch (error) {
        console.error('Block error:', error);
        showToast('❌ Lỗi: ' + error.message, 'error');
      }
    }

    async unblockFriend(userId) {
      if (!confirm('Bạn có chắc muốn bỏ chặn người này?')) return;

      try {
        const token = this.getToken();
        await fetchJSON(`${this.server}/api/friend/unblock/${userId}`, {
          method: 'POST',
          headers: { 'x-auth-token': token }
        });

        showToast('✅ Đã bỏ chặn người dùng', 'success');
        this.blockedUsers.delete(userId); // Remove from blocked set
        this.loadFriendsList();
      } catch (error) {
        console.error('Unblock error:', error);
        showToast('❌ Lỗi: ' + error.message, 'error');
      }
    }

    async removeFriend(userId) {
      if (!confirm('Bạn có chắc muốn xóa bạn bè này?')) return;

      try {
        const token = this.getToken();
        await fetchJSON(`${this.server}/api/friend/remove/${userId}`, {
          method: 'DELETE',
          headers: { 'x-auth-token': token }
        });

        showToast('✅ Đã xóa bạn bè', 'success');
        this.loadFriendsList();
      } catch (error) {
        console.error('Remove error:', error);
        showToast('❌ Lỗi: ' + error.message, 'error');
      }
    }

    async loadPendingRequests() {
      try {
        const token = this.getToken();
        if (!token) {
          console.warn('[FriendManager] No auth token found. Skipping pending requests.');
          this.stopPolling(); // Stop polling if no token
          
          // Try to use ChatAuthUtils for authentication if available
          if (window.ChatAuthUtils && typeof window.ChatAuthUtils.requireAuthentication === 'function') {
            // Show one-time prompt for login (avoid repeated prompts)
            if (!this._loginPromptShown) {
              this._loginPromptShown = true;
              console.log('[FriendManager] Offering authentication via ChatAuthUtils');
              setTimeout(() => {
                const shouldLogin = confirm('Friend manager yêu cầu đăng nhập để hoạt động. Bạn có muốn đăng nhập không?');
                if (shouldLogin) {
                  window.ChatAuthUtils.requireAuthentication();
                }
              }, 1000); // Delay to avoid blocking page load
            }
          }
          return;
        }
        
        const data = await fetchJSON(`${this.server}/api/friend/pending`, {
          headers: { 'x-auth-token': token }
        });

        const count = data.requests ? data.requests.length : 0;
        this.updateBadges(count);
      } catch (error) {
        // If unauthorized, stop polling to prevent spam
        if (error.message === 'Unauthorized') {
          console.warn('[FriendManager] Unauthorized - stopping polling. Please login.');
          this.stopPolling();
          return;
        }
        console.error('Load pending error:', error);
      }
    }

    updateBadges(count) {
      // Update friend button badge first
      this.updateFriendButtonBadge(count);
      
      const badges = [
        document.getElementById('friendBtnBadge'),
        document.getElementById('confirmBadge'),
        this.ui.popup.querySelector('#requestsBadge')
      ];

      badges.forEach(badge => {
        if (!badge) return;
        if (count > 0) {
          badge.textContent = count;
          badge.classList.remove('classroom-hidden');
        } else {
          badge.classList.add('classroom-hidden');
        }
      });
    }

    async updateBadge() {
      // Fetch and update badge count (friend requests + unread messages)
      try {
        const token = this.getToken();
        
        // Get friend request count
        const friendData = await fetchJSON(`${this.server}/api/friend/pending`, {
          headers: { 'x-auth-token': token }
        });
        const friendRequestCount = friendData.requests ? friendData.requests.length : 0;
        
        // Get unread message count
        let unreadMessageCount = 0;
        try {
          const unreadData = await fetchJSON(`${this.server}/api/unread`, {
            headers: { 'x-auth-token': token }
          });
          unreadMessageCount = unreadData.unreadCount || 0;
        } catch (unreadError) {
          console.warn('Could not fetch unread count:', unreadError);
        }
        
        const totalCount = friendRequestCount + unreadMessageCount;
        // this.log('Badge update - Friends:', friendRequestCount, 'Messages:', unreadMessageCount, 'Total:', totalCount);
        this.updateBadges(totalCount);
      } catch (error) {
        console.error('Update badge error:', error);
      }
    }

    startPolling() {
      // Stop any existing polling first
      this.stopPolling();
      
      // Poll for new requests every 30 seconds
      this.pollInterval = setInterval(() => {
        this.loadPendingRequests();
      }, 30000);
    }

    stopPolling() {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    }

    async loadBlockedUsers() {
      const container = this.ui.popup.querySelector('#blockedList');
      
      container.innerHTML = `
        <div class="classroom-friend-loading">
          <div class="classroom-friend-spinner"></div>
          <div class="classroom-friend-loading-text">Đang tải danh sách đã chặn...</div>
        </div>
      `;

      try {
        const token = this.getToken();
        const data = await fetchJSON(`${this.server}/api/friend/blocked`, {
          headers: { 'x-auth-token': token }
        });

        if (data.length === 0) {
          container.innerHTML = `
            <div class="classroom-friend-empty-state">
              <div class="classroom-friend-empty-icon"></div>
              <div class="classroom-friend-empty-text">Không có ai bị chặn</div>
            </div>
          `;
          return;
        }

        container.innerHTML = data.map(user => {
          const initial = (user.display_name || user.username || '?')[0].toUpperCase();
          const avatarUrl = getAvatarUrl(user);
          const avatarContent = avatarUrl 
            ? `<img src="${avatarUrl}" alt="${user.display_name || user.username}" onerror="this.style.display='none'; this.parentNode.innerHTML='${initial}';")>` 
            : initial;
            
          return `
          <div class="classroom-friend-card" data-user-id="${user.id}">
            <div class="classroom-friend-avatar">
              ${avatarContent}
            </div>
            <div class="classroom-friend-info">
              <div class="classroom-friend-name">${user.display_name || user.username || 'User'}</div>
              <div class="classroom-friend-details">Đã chặn</div>
            </div>
            <div class="classroom-friend-actions">
              <button class="classroom-friend-icon-btn classroom-friend-icon-btn-unblock" 
                      data-action="unblock" 
                      data-user-id="${user.id}"
                      title="Bỏ chặn">
                ✅
              </button>
            </div>
          </div>
          `;
        }).join('');

        // Add event listeners for unblock buttons
        container.querySelectorAll('[data-action="unblock"]').forEach(btn => {
          btn.addEventListener('click', () => this.unblockFriend(btn.dataset.userId));
        });

      } catch (error) {
        console.error('Load blocked users error:', error);
        container.innerHTML = `
          <div class="classroom-friend-empty-state">
            <div class="classroom-friend-empty-icon">❌</div>
            <div class="classroom-friend-empty-text">Lỗi: ${error.message}</div>
          </div>
        `;
      }
    }
  }

  // Export to window
  window.FriendManager = FriendManager;

  // Convenience init function
  window.initFriendManager = function(options = {}) {
    if (window.friendManager) {
      return window.friendManager;
    }
    
    window.friendManager = new FriendManager(options);
    
    // Global API
    window.QuizzmanFriends = {
      show: () => window.friendManager.open(),
      hide: () => window.friendManager.close(),
      createButton: (position = 'bottom-left') => {
        if (window.friendManager && !window.friendManager.friendButton) {
          window.friendManager.options.friendButtonPosition = position;
          window.friendManager.createFriendButton();
        }
      },
      removeButton: () => {
        if (window.friendManager && window.friendManager.friendButton) {
          window.friendManager.friendButton.remove();
          window.friendManager.friendButton = null;
        }
      }
    };
    
    return window.friendManager;
  };

  // QMF version - disable auto-init, let QMF control initialization
  // Auto-init disabled - QMF.initFriends() will handle it

})();
// QMF Module version - auto-init disabled
