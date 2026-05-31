/**
 * QuizzMan Simple Modern Chat - Easy Integration
 * Can be used anywhere with just one function call
 */

class SimpleModernChat {
  // Debug flag - set to true to enable console logs
  static DEBUG = false;
  
  static log(...args) {
    if (SimpleModernChat.DEBUG) {
      console.log(...args);
    }
  }
  
  static warn(...args) {
    if (SimpleModernChat.DEBUG) {
      console.warn(...args);
    }
  }
  
  static error(...args) {
    // Always log errors
    console.error(...args);
  }
  
  constructor(options = {}) {
    // Auto-detect server URL based on environment
    this.server = options.server || this.resolveServerUrl();
    this.getToken = options.getToken || (() => this.getDefaultToken());
    this.container = null;
    this.socket = null;
    this.currentPeer = null;
    this.isConnected = false;
    this.totalUnreadCount = 0;
    this.chatButton = null;
    
    // Enable debug mode via options
    if (options.debug) {
      SimpleModernChat.DEBUG = true;
    }
    
    // Options
    this.options = {
      createChatButton: options.createChatButton !== false, // Default true
      chatButtonPosition: options.chatButtonPosition || 'bottom-right',
      chatButtonIcon: options.chatButtonIcon || '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
      ...options
    };
    
    this.injectCSS();
    this.createUI();
    if (this.options.createChatButton) {
      this.createChatButton();
    }
    this.setupSocketConnection();
  }

  resolveServerUrl() {
    // Check for explicit configuration first
    if (window.__CHAT_SERVICE_BASE_URL) {
      return window.__CHAT_SERVICE_BASE_URL;
    }
    
    if (window.CHAT_SERVICE_BASE_URL) {
      return window.CHAT_SERVICE_BASE_URL;
    }
    
    // Production default
    return 'https://chat.quizzman.com';
  }
  
  getDefaultToken() {
    // Use centralized auth utils if available
    if (window.ChatAuthUtils && typeof window.ChatAuthUtils.getAuthToken === 'function') {
      const token = window.ChatAuthUtils.getAuthToken();
      if (token) {
        SimpleModernChat.log('[SimpleModernChat] Token from ChatAuthUtils');
        return token;
      }
    }
    
    // Enhanced token retrieval with cookie support
    let token = null;
    
    // 1. Try CMS Auth first (from homework dashboard)
    if (typeof window.cmsAuth?.getToken === 'function') {
      token = window.cmsAuth.getToken();
      if (token) {
        SimpleModernChat.log('[SimpleModernChat] Token from cmsAuth');
        return token;
      }
    }
    
    // 2. Try Auth Manager (from library)
    if (typeof window.authManager?.getToken === 'function') {
      token = window.authManager.getToken();
      if (token) {
        SimpleModernChat.log('[SimpleModernChat] Token from authManager');
        return token;
      }
    }
    
    // 3. Try Auth modules
    if (typeof window.QuizzmanAuth?.getToken === 'function') {
      token = window.QuizzmanAuth.getToken();
      if (token) {
        SimpleModernChat.log('[SimpleModernChat] Token from QuizzmanAuth');
        return token;
      }
    }
    
    if (typeof window.Auth?.getToken === 'function') {
      token = window.Auth.getToken();
      if (token) {
        SimpleModernChat.log('[SimpleModernChat] Token from Auth adapter');
        return token;
      }
    }
    
    // 2. Check cookies first (priority for cross-domain auth)
    const cookieKeys = ['quizzman_auth_token', 'authToken', 'auth_token', 'token'];
    for (const key of cookieKeys) {
      try {
        const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
        if (match && match[1]) {
          token = decodeURIComponent(match[1]);
          SimpleModernChat.log(`[SimpleModernChat] Token from cookie: ${key}`);
          return token;
        }
      } catch (e) {
        // Continue to next source
      }
    }
    
    // 3. Check localStorage
    const storageKeys = ['quizzman_auth_token', 'authToken', 'auth_token', 'session_token', 'access_token', 'token'];
    for (const key of storageKeys) {
      try {
        token = localStorage.getItem(key);
        if (token) {
          SimpleModernChat.log(`[SimpleModernChat] Token from localStorage: ${key}`);
          return token;
        }
      } catch (e) {
        // Continue to next source
      }
    }
    
    // 4. Check sessionStorage
    for (const key of storageKeys) {
      try {
        token = sessionStorage.getItem(key);
        if (token) {
          SimpleModernChat.log(`[SimpleModernChat] Token from sessionStorage: ${key}`);
          return token;
        }
      } catch (e) {
        // Continue to next source
      }
    }
    
    SimpleModernChat.log('[SimpleModernChat] No token found in any source');
    return null;
  }
  
  getAvatarUrl(user) {
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
  
  injectCSS() {
    if (document.getElementById('simple-modern-chat-css')) return;
    
    // Inject anti-flash CSS immediately
    const antiFlash = document.createElement('style');
    antiFlash.id = 'simple-modern-chat-preload';
    antiFlash.textContent = `
      .smc-container { 
        visibility: hidden !important; 
        opacity: 0 !important; 
      }
    `;
    document.head.insertBefore(antiFlash, document.head.firstChild);
    
    const style = document.createElement('style');
    style.id = 'simple-modern-chat-css';
    style.textContent = `
      .smc-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 380px;
        height: 600px;
        background: #ffffff;
        border-radius: 20px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
        z-index: 99999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        visibility: visible !important;
        opacity: 1 !important;
      }
      
      .smc-container.smc-hidden { 
        opacity: 0 !important; 
        visibility: hidden !important; 
        transform: translateY(20px) !important; 
        display: flex !important;
        pointer-events: none !important;
      }
      
      .smc-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 20px 20px 0 0;
        position: relative;
        min-height: 60px;
      }
      
      .smc-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255,255,255,0.1);
        border-radius: 20px 20px 0 0;
        backdrop-filter: blur(20px);
        z-index: -1;
      }
      
      .smc-title { 
        font-weight: 600; 
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .smc-close { 
        background: none; 
        border: none; 
        color: white; 
        font-size: 20px; 
        cursor: pointer; 
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      
      .smc-close:hover { 
        background: rgba(255,255,255,0.2); 
      }
      
      .smc-tabs {
        display: flex;
        background: #f8f9fa;
        border-bottom: 1px solid #e9ecef;
      }
      
      .smc-tab {
        flex: 1;
        padding: 12px;
        border: none;
        background: none;
        cursor: pointer;
        font-weight: 500;
        color: #65676b;
        transition: all 0.2s;
        position: relative;
      }
      
      .smc-tab.active {
        color: #0084ff;
      }
      
      .smc-tab.active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: #0084ff;
      }
      
      .smc-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      
      .smc-tab-content {
        display: none;
        flex: 1;
        flex-direction: column;
        min-height: 0;
      }
      
      .smc-tab-content.active {
        display: flex;
      }
      
      .smc-messages {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 20px 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        background: linear-gradient(to bottom, #f8fafc, #ffffff);
        scroll-behavior: smooth;
      }
      
      .smc-messages::-webkit-scrollbar {
        width: 6px;
      }
      
      .smc-messages::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .smc-messages::-webkit-scrollbar-thumb {
        background: rgba(0,0,0,0.1);
        border-radius: 3px;
      }
      
      .smc-messages::-webkit-scrollbar-thumb:hover {
        background: rgba(0,0,0,0.2);
      }
      
      .smc-message {
        display: flex;
        animation: slideInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        margin-bottom: 8px;
        width: 100%;
        position: relative;
      }
      
      /* Tin nhắn của user - bên phải */
      .smc-message.own {
        justify-content: flex-end;
        align-items: flex-end;
      }
      
      /* Tin nhắn của bạn bè - bên trái */
      .smc-message.peer {
        justify-content: flex-start;
        align-items: flex-start;
      }
      
      /* Avatar cho tin nhắn peer */
      .smc-message-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        margin-right: 8px;
        margin-top: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 600;
        color: white;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        flex-shrink: 0;
      }
      
      .smc-message-avatar img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
      }
      
      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .smc-bubble {
        max-width: 75%;
        min-width: 80px;
        padding: 12px 16px;
        border-radius: 20px;
        word-wrap: break-word;
        font-size: 14px;
        line-height: 1.5;
        position: relative;
        margin: 2px 0;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        backdrop-filter: blur(10px);
      }
      
      /* Bubble tin nhắn của user - bên phải, màu gradient */
      .smc-message.own .smc-bubble {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-bottom-right-radius: 6px;
        margin-left: auto;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }
      
      /* Bubble tin nhắn của bạn bè - bên trái, màu trắng */
      .smc-message.peer .smc-bubble {
        background: #ffffff;
        color: #2d3748;
        border-bottom-left-radius: 6px;
        margin-right: auto;
        border: 1px solid rgba(0,0,0,0.05);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
            .smc-message-status {
        display: block;
        text-align: right;
        margin-top: 4px;
        font-size: 10px;
        opacity: 0.7;
      }

      .status-text {
        font-size: 10px;
        opacity: 0.8;
        font-style: italic;
      }
      
      .smc-message-time {
        font-size: 11px;
        opacity: 0.7;
        margin-top: 4px;
        font-weight: 500;
      }
      
      /* Time cho tin nhắn của user - align right */
      .smc-message.own .smc-message-time {
        text-align: right;
        color: rgba(255, 255, 255, 0.9);
      }
      
      /* Time cho tin nhắn của bạn bè - align left */
      .smc-message.peer .smc-message-time {
        text-align: left;
        color: #718096;
      }

      .smc-message-wrapper {
        position: relative;
        display: flex;
        flex-direction: row;
        max-width: 70%;
        align-items: flex-start;
      }
      
      .smc-message-content-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      
      /* Wrapper cho tin nhắn của user - align right */
      .smc-message.own .smc-message-wrapper {
        align-items: flex-end;
        margin-left: auto;
      }
      
      /* Wrapper cho tin nhắn của bạn bè - align left */
      .smc-message.peer .smc-message-wrapper {
        align-items: flex-start;
        margin-right: auto;
      }
      
      /* Sender name chỉ hiển thị cho tin nhắn peer */
      .smc-message.peer .smc-sender-name {
        font-size: 11px;
        font-weight: 500;
        color: #65676b;
        margin-bottom: 4px;
        margin-left: 4px;
      }
      
      .smc-message.own .smc-sender-name {
        display: none;
      }

      .smc-message-actions {
        position: absolute;
        top: -40px;
        display: none;
        gap: 6px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 25px;
        padding: 8px 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.2);
        z-index: 100;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      /* Actions cho tin nhắn của user - bên trái bubble */
      .smc-message.own .smc-message-actions {
        right: 0;
      }
      
      /* Actions cho tin nhắn của bạn bè - bên phải bubble */
      .smc-message.peer .smc-message-actions {
        left: 0;
      }
      
      .smc-action-btn {
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #4a5568;
      }
      
      .smc-action-btn:hover {
        background: rgba(102, 126, 234, 0.1);
        color: #667eea;
        transform: scale(1.1);
      }

      .smc-message:hover .smc-message-actions {
        display: flex;
      }

      .smc-action-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 16px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        color: #65676b;
      }

      .smc-action-btn:hover {
        background: #f0f2f5;
        transform: scale(1.1);
      }

      .smc-action-btn[data-action="delete"]:hover {
        background: #ffebee;
        color: #e53e3e;
      }

      .smc-action-btn[data-action="react"]:hover {
        background: #fff3e0;
        color: #ff9800;
      }

      .smc-action-btn[data-action="reply"]:hover {
        background: #e3f2fd;
        color: #2196f3;
      }

      .smc-message-content {
        word-break: break-word;
        line-height: 1.4;
      }

      .smc-message-actions {
        display: none;
        gap: 6px;
        margin-top: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .smc-message:hover .smc-message-actions {
        display: flex;
        opacity: 1;
      }

      .smc-action-btn {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
      }

      .smc-action-btn:hover {
        transform: scale(1.15);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }

      .smc-reply-btn:hover {
        background: #e3f2fd;
        color: #1976d2;
        border-color: #1976d2;
      }

      .smc-react-btn:hover {
        background: #fff3e0;
        color: #f57c00;
        border-color: #f57c00;
      }

      .smc-delete-btn:hover {
        background: #ffebee;
        color: #d32f2f;
        border-color: #d32f2f;
      }

      .smc-pin-btn:hover {
        background: #f3e5f5;
        color: #7b1fa2;
        border-color: #7b1fa2;
      }

      .smc-reactions {
        margin-top: 4px;
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }

      .smc-reaction {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 12px;
        padding: 2px 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
      }

      .smc-reaction:hover {
        background: #e3f2fd;
        border-color: #1976d2;
        transform: scale(1.05);
      }

      /* Chat conversations layout */
      .smc-chat-view {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .smc-conversations {
        flex: 1;
        overflow-y: auto;
      }

      .smc-chat-room {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .smc-chat-header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #e4e6ea;
        background: #f8f9fa;
      }

      .smc-back-btn {
        background: none;
        border: none;
        font-size: 14px;
        cursor: pointer;
        margin-right: 12px;
        padding: 6px 12px;
        border-radius: 6px;
        transition: background 0.2s;
      }

      .smc-back-btn:hover {
        background: #e4e6ea;
      }

      .smc-conversations-list {
        padding: 8px 0;
      }

      .smc-conversation-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid rgba(0,0,0,0.05);
        transition: background 0.2s;
      }

      .smc-conversation-item:hover {
        background: #f8f9fa;
      }

      .smc-conversation-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        margin-right: 12px;
        background: #0084ff;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        overflow: hidden;
      }
      
      .smc-conversation-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      }

      .smc-conversation-info {
        flex: 1;
        min-width: 0;
      }

      .smc-conversation-name {
        font-weight: 600;
        margin-bottom: 4px;
        color: #050505;
      }

      .smc-conversation-last {
        font-size: 13px;
        color: #65676b;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .smc-conversation-time {
        font-size: 12px;
        color: #8a8d91;
        margin-left: 8px;
      }

      .smc-conversation-unread {
        background: #0084ff;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        margin-left: 8px;
      }
      
      .smc-loading {
        text-align: center;
        padding: 20px;
        color: #666;
        font-style: italic;
      }
      
      .smc-empty {
        text-align: center;
        padding: 40px 20px;
        color: #999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
      }
      
      .smc-empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
      }
      
      .status-sending {
        width: 8px;
        height: 8px;
        border: 1px solid #fff;
        border-top: 1px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      .status-delivered {
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-bottom: 6px solid #4CAF50;
        transform: rotate(45deg);
      }
      
      .status-read {
        width: 8px;
        height: 8px;
        background: #4CAF50;
        border-radius: 50%;
      }
      
      .status-seen {
        width: 8px;
        height: 8px;
        background: #2196F3;
        border-radius: 50%;
        position: relative;
      }
      
      .status-seen::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 4px;
        height: 4px;
        background: white;
        border-radius: 50%;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .smc-reply-context {
        margin-bottom: 6px;
        opacity: 0.8;
        position: relative;
        padding-left: 12px;
      }

      .smc-reply-line {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: currentColor;
        border-radius: 2px;
        opacity: 0.6;
      }

      .smc-reply-text {
        font-size: 12px;
        opacity: 0.9;
        font-style: italic;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 200px;
      }
      
      .smc-typing-indicator {
        display: flex;
        align-items: center;
        padding: 8px 16px;
        font-style: italic;
        color: #666;
        font-size: 13px;
      }
      
      .smc-typing-dots {
        display: inline-flex;
        gap: 2px;
        margin-left: 4px;
      }
      
      .smc-typing-dot {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: #666;
        animation: typingDot 1.5s infinite ease-in-out;
      }
      
      .smc-typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .smc-typing-dot:nth-child(3) { animation-delay: 0.4s; }
      
      @keyframes typingDot {
        0%, 60%, 100% { transform: scale(0.8); opacity: 0.5; }
        30% { transform: scale(1); opacity: 1; }
      }
      
      .smc-input-area {
        padding: 20px;
        border-top: 1px solid rgba(0,0,0,0.08);
        background: #ffffff;
        border-radius: 0 0 20px 20px;
      }
      
      .smc-input-wrapper {
        display: flex;
        gap: 12px;
        align-items: flex-end;
        background: #f7fafc;
        border-radius: 25px;
        padding: 8px 16px;
        border: 2px solid transparent;
        transition: all 0.2s ease;
      }
      
      .smc-input-wrapper:focus-within {
        border-color: #667eea;
        background: #ffffff;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
      
      .smc-input {
        flex: 1;
        border: none;
        background: none;
        outline: none;
        padding: 8px 0;
        font-size: 15px;
        resize: none;
        max-height: 120px;
        min-height: 20px;
        font-family: inherit;
        color: #2d3748;
        line-height: 1.4;
      }
      
      .smc-input::placeholder {
        color: #a0aec0;
      }
      
      .smc-reply-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: linear-gradient(135deg, #fff8e1, #fff3c4);
        color: #7a5a00;
        border: 1px solid #ffe082;
        border-radius: 15px;
        padding: 8px 12px;
        margin-bottom: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      
      .smc-reply-bar.smc-hidden { 
        display: none; 
      }
      
      .smc-reply-bar-text { 
        font-size: 13px; 
        white-space: nowrap; 
        overflow: hidden; 
        text-overflow: ellipsis; 
        font-weight: 500;
      }
      
      .smc-reply-cancel { 
        background: transparent; 
        border: none; 
        font-size: 18px; 
        cursor: pointer; 
        color: #7a5a00;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s ease;
      }
      
      .smc-reply-cancel:hover {
        background: rgba(122, 90, 0, 0.1);
      }
      
      .smc-upload-btn, .smc-send-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #667eea;
        width: 40px;
        height: 40px;
      }

      .smc-upload-btn:hover, .smc-send-btn:hover {
        background: rgba(102, 126, 234, 0.1);
        transform: scale(1.05);
      }
      
      .smc-send-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
      }
      
      .smc-send-btn:hover {
        background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%) !important;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      .smc-image-preview-area {
        margin-bottom: 12px;
      }
      
      .smc-send {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 50%;
        background: #0084ff;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        transition: all 0.2s;
      }
      
      .smc-send:disabled {
        background: #bcc0c4;
        cursor: not-allowed;
      }
      
      .smc-send:not(:disabled):hover {
        background: #0066cc;
        transform: scale(1.05);
      }

      .smc-reactions { margin-top: 6px; display: flex; gap: 6px; }
      .smc-reaction { background: rgba(0,0,0,0.05); border-radius: 12px; padding: 2px 6px; font-size: 12px; }
      
      .smc-friends {
        flex: 1;
        overflow-y: auto;
        padding: 8px 0;
      }
      
      .smc-friend {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .smc-friend:hover {
        background: #f0f2f5;
      }
      
      .smc-friend-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #0084ff, #42a5f5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: 14px;
        margin-right: 12px;
        overflow: hidden;
      }
      
      .smc-friend-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      }
      
      .smc-friend-info {
        flex: 1;
      }
      
      .smc-friend-name {
        font-weight: 500;
        color: #050505;
        margin-bottom: 2px;
      }
      
      .smc-friend-status {
        font-size: 12px;
        color: #65676b;
      }
      
      .smc-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: #8a8d91;
        text-align: center;
      }
      
      .smc-empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
      }
      
      .smc-status {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-left: 8px;
      }
      
      .smc-status.connected {
        background: #42b883;
      }
      
      .smc-status.disconnected {
        background: #fa383e;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Reaction Picker */
      .smc-reaction-picker {
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        border-radius: 25px;
        padding: 8px 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        display: none;
        gap: 8px;
        z-index: 1000;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(0,0,0,0.1);
        animation: fadeIn 0.2s ease;
      }

      .smc-reaction-picker.show {
        display: flex;
      }

      .smc-emoji-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        transition: transform 0.2s ease;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .smc-emoji-btn:hover {
        transform: scale(1.3);
        background: rgba(0,0,0,0.05);
      }

      /* Drag to reply indicator */
      .smc-drag-indicator {
        position: absolute;
        left: -40px;
        top: 50%;
        transform: translateY(-50%);
        opacity: 0;
        transition: all 0.3s ease;
        color: #0084ff;
        font-size: 20px;
      }

      .smc-message.dragging .smc-drag-indicator {
        opacity: 1;
        left: -30px;
      }

      /* Drag & Drop feedback */
      .smc-chat-container.smc-drag-over {
        background: linear-gradient(135deg, rgba(24, 119, 242, 0.1), rgba(24, 119, 242, 0.05));
        border: 2px dashed #1877f2;
        position: relative;
      }
      
      .smc-chat-container.smc-drag-over::before {
        content: '📷 Thả ảnh vào đây để gửi';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(24, 119, 242, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 500;
        font-size: 14px;
        z-index: 1000;
        pointer-events: none;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }

      /* Image upload preview */
      .smc-image-preview {
        position: relative;
        max-width: 200px;
        margin: 8px 0;
        border-radius: 8px;
        overflow: hidden;
      }

      .smc-image-preview img {
        width: 100%;
        height: auto;
        display: block;
      }

      .smc-image-preview .smc-remove-image {
        position: absolute;
        top: 4px;
        right: 4px;
        background: rgba(0,0,0,0.7);
        color: white;
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Pinned message indicator */
      .smc-message.pinned {
        position: relative;
        border-left: 4px solid #7b1fa2;
        background: linear-gradient(135deg, rgba(123, 31, 162, 0.08) 0%, rgba(123, 31, 162, 0.03) 100%);
        box-shadow: 0 2px 8px rgba(123, 31, 162, 0.1);
      }
      
      .smc-message.pinned::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, #7b1fa2, #9c27b0);
      }

      .smc-pin-indicator {
        position: absolute;
        top: -8px;
        right: -8px;
        background: linear-gradient(135deg, #7b1fa2, #9c27b0);
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(123, 31, 162, 0.3);
        z-index: 10;
        animation: pinPulse 2s infinite;
      }
      
      @keyframes pinPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
      }
      
      /* Chat Floating Button */
      .smc-chat-button {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 50%;
        color: white;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4), 0 2px 6px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 9990;
        font-family: inherit;
        border: 2px solid rgba(255, 255, 255, 0.3);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }
      
      .smc-chat-button svg {
        width: 26px;
        height: 26px;
        stroke: white;
        fill: none;
      }
      
      .smc-chat-button:hover {
        transform: translateY(-3px) scale(1.05);
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5), 0 4px 10px rgba(0, 0, 0, 0.15);
        background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
      }
      
      .smc-chat-button:active {
        transform: translateY(-1px) scale(0.98);
      }
      
      .smc-chat-button.has-unread {
        animation: chatButtonPulse 2s infinite;
      }
      
      .smc-chat-button-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: linear-gradient(135deg, #ff4444, #ff6b6b);
        color: white;
        border-radius: 12px;
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(255, 68, 68, 0.4);
      }
      
      @keyframes chatButtonPulse {
        0%, 100% { box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
        50% { box-shadow: 0 4px 15px rgba(102, 126, 234, 0.6), 0 0 0 8px rgba(102, 126, 234, 0.1); }
      }
      
      @media (max-width: 768px) {
        .smc-container {
          width: calc(100vw - 40px);
          height: calc(100vh - 100px);
        }
        
        .smc-chat-button {
          bottom: 16px;
          right: 16px;
          width: 52px;
          height: 52px;
        }
        
        .smc-chat-button svg {
          width: 24px;
          height: 24px;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  createUI() {
    this.container = document.createElement('div');
    this.container.className = 'smc-container smc-hidden';
    this.container.innerHTML = `
      <div class="smc-header">
        <div class="smc-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Chat
          <div class="smc-status disconnected"></div>
        </div>
        <button class="smc-close">×</button>
      </div>
      
      <div class="smc-tabs">
        <button class="smc-tab active" data-tab="chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right: 6px;">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Chat
        </button>
        <button class="smc-tab" data-tab="friends">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right: 6px;">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Bạn bè
        </button>
      </div>
      
      <div class="smc-content">
        <div class="smc-tab-content active" data-tab="chat">
          <div class="smc-chat-view">
            <div class="smc-conversations" style="display: block;">
              <div class="smc-conversations-header">
                <h4 style="margin: 10px 0; padding: 0 16px; color: #65676b;">Cuộc trò chuyện gần đây</h4>
              </div>
              <div class="smc-conversations-list">
                <div class="smc-empty">
                  <div class="smc-empty-icon">💬</div>
                  <div>Đang tải cuộc trò chuyện...</div>
                </div>
              </div>
            </div>
            <div class="smc-chat-room" style="display: none;">
              <div class="smc-chat-header">
                <button class="smc-back-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Quay lại
                </button>
                <div class="smc-peer-info"></div>
              </div>
              <div class="smc-messages"></div>
              <div class="smc-input-area">
                <div class="smc-reply-bar smc-hidden"></div>
                <div class="smc-image-preview-area"></div>
                <div class="smc-input-wrapper">
                  <input type="file" class="smc-file-input" accept="image/*" style="display: none;">
                  <button class="smc-upload-btn" title="Gửi ảnh">📎</button>
                  <textarea class="smc-input" placeholder="Nhập tin nhắn..." rows="1"></textarea>
                  <button class="smc-send" disabled>➤</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="smc-tab-content" data-tab="friends">
          <div class="smc-friends">
            <div class="smc-empty">
              <div class="smc-empty-icon">👥</div>
              <div>Đang tải bạn bè...</div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.container);
    
    // Remove anti-flash CSS now that main CSS is loaded
    const antiFlash = document.getElementById('simple-modern-chat-preload');
    if (antiFlash) {
      antiFlash.remove();
    }
    
    this.attachEvents();
    this.bindMessageActions();
  }

  createChatButton() {
    // Check if chat button already exists
    if (document.querySelector('.smc-chat-button')) {
      SimpleModernChat.log('[SimpleModernChat] Chat button already exists');
      return;
    }

    this.chatButton = document.createElement('button');
    this.chatButton.className = 'smc-chat-button';
    this.chatButton.innerHTML = `
      ${this.options.chatButtonIcon}
      <span class="smc-chat-button-badge" style="display: none;">0</span>
    `;
    
    // Position based on options
    const positions = {
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' }
    };
    
    const pos = positions[this.options.chatButtonPosition] || positions['bottom-right'];
    Object.assign(this.chatButton.style, pos);
    
    // Click handler
    this.chatButton.addEventListener('click', () => {
      this.toggle();
    });
    
    document.body.appendChild(this.chatButton);
    SimpleModernChat.log('[SimpleModernChat] Chat button created at', this.options.chatButtonPosition);
  }

  // Update chat button badge
  updateChatButtonBadge(count) {
    if (!this.chatButton) return;
    
    const badge = this.chatButton.querySelector('.smc-chat-button-badge');
    if (!badge) return;
    
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
      this.chatButton.classList.add('has-unread');
    } else {
      badge.style.display = 'none';
      this.chatButton.classList.remove('has-unread');
    }
  }
  
  attachEvents() {
    // Close button
    this.container.querySelector('.smc-close').addEventListener('click', () => {
      this.hide();
    });
    
    // Tab switching
    this.container.querySelectorAll('.smc-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });
    
    // Message input
    const input = this.container.querySelector('.smc-input');
    const sendBtn = this.container.querySelector('.smc-send');
    
    if (!input || !sendBtn) {
      SimpleModernChat.error('[SimpleModernChat] Input elements not found:', {input: !!input, sendBtn: !!sendBtn});
      return;
    }
    
    input.addEventListener('input', (e) => {
      const hasValue = e.target.value.trim();
      sendBtn.disabled = !hasValue;
      this.autoResize(e.target);
      
      // Handle typing indicator
      if (hasValue && this.currentPeer) {
        this.sendTypingIndicator(true);
        
        // Clear existing typing timeout
        if (this.typingTimeout) {
          clearTimeout(this.typingTimeout);
        }
        
        // Stop typing after 2 seconds of no input
        this.typingTimeout = setTimeout(() => {
          this.sendTypingIndicator(false);
        }, 2000);
      } else {
        this.sendTypingIndicator(false);
      }
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendTypingIndicator(false); // Stop typing when sending
        this.sendMessage();
      }
    });
    
    sendBtn.addEventListener('click', () => this.sendMessage());
    
    // Image upload functionality
    const uploadBtn = this.container.querySelector('.smc-upload-btn');
    const fileInput = this.container.querySelector('.smc-file-input');
    
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', () => {
        fileInput.click();
      });
      
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
          this.handleImageUpload(file);
        }
      });
    } else {
      SimpleModernChat.warn('[SimpleModernChat] Upload elements not found:', {uploadBtn: !!uploadBtn, fileInput: !!fileInput});
    }

    // Drag & Drop support for images
    const chatContainer = this.container.querySelector('.smc-chat-room') || this.container.querySelector('.smc-messages');
    if (!chatContainer) {
      SimpleModernChat.warn('[SimpleModernChat] No suitable container found for drag & drop, skipping setup');
      return;
    }
    
    let dragCounter = 0;
    
    chatContainer.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      chatContainer.classList.add('smc-drag-over');
    });
    
    chatContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    chatContainer.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        chatContainer.classList.remove('smc-drag-over');
      }
    });
    
    chatContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      chatContainer.classList.remove('smc-drag-over');
      
      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length > 0) {
        // Handle first image file
        this.handleImageUpload(imageFiles[0]);
        
        // Show notification if multiple files
        if (imageFiles.length > 1) {
          this.showNotification(`Đã chọn ảnh đầu tiên. ${imageFiles.length - 1} ảnh khác bị bỏ qua.`, 'info');
        }
      } else if (files.length > 0) {
        this.showNotification('Chỉ hỗ trợ file ảnh (JPG, PNG, GIF, etc.)', 'error');
      }
    });

    // Back button functionality
    const backBtn = this.container.querySelector('.smc-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.showConversationsList();
      });
    }
  }

  handleImageUpload(file) {
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewArea = this.container.querySelector('.smc-image-preview-area');
      
      const preview = document.createElement('div');
      preview.className = 'smc-image-preview';
      preview.innerHTML = `
        <img src="${e.target.result}" alt="Preview">
        <button class="smc-remove-image">×</button>
      `;
      
      previewArea.appendChild(preview);
      
      // Remove button handler
      preview.querySelector('.smc-remove-image').addEventListener('click', () => {
        preview.remove();
      });
    };
    reader.readAsDataURL(file);
    
    // Upload to server
    this.uploadImageToServer(file);
  }

  async uploadImageToServer(file) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('peerId', this.currentPeer.id);
    
    try {
      const response = await fetch(`${this.server}/api/chat/upload-image`, {
        method: 'POST',
        headers: {
          'x-auth-token': this.getToken()
        },
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        // Send image message via socket
        if (this.socket && this.isConnected) {
          this.socket.emit('sendMessage', {
            peerId: this.currentPeer.id,
            message: result.imageUrl,
            messageType: 'image',
            messageId: 'img_' + Date.now()
          });
        }
        
        // Clear preview
        this.container.querySelector('.smc-image-preview-area').innerHTML = '';
      } else {
        this.showNotification('Upload ảnh thất bại', 3000);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      this.showNotification('Lỗi upload ảnh', 3000);
    }
  }
  
  updateHeader(context = 'chat', data = {}) {
    const titleEl = this.container.querySelector('.smc-title');
    
    switch(context) {
      case 'friends':
        titleEl.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Bạn bè
          <div class="smc-status ${this.isConnected ? 'connected' : 'disconnected'}"></div>
        `;
        break;
        
      case 'chat-room':
        const avatarUrl = this.getAvatarUrl(data.peer);
        const initial = this.getInitials(data.peerName || 'U');
        const avatarContent = avatarUrl ? 
          `<img src="${avatarUrl}" alt="${data.peerName}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; margin-right: 8px;" onerror="this.style.display='none'; this.parentNode.innerHTML='<div style=\\"width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 8px;\\">${initial}</div>';">` : 
          `<div style="width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 8px;">${initial}</div>`;
        
        titleEl.innerHTML = `
          ${avatarContent}
          <span style="flex: 1;">${this.escapeHtml(data.peerName || 'Chat')}</span>
          <div class="smc-status ${this.isConnected ? 'connected' : 'disconnected'}"></div>
        `;
        break;
        
      case 'conversations':
      default:
        titleEl.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Chat
          <div class="smc-status ${this.isConnected ? 'connected' : 'disconnected'}"></div>
        `;
        break;
    }
  }

  switchTab(tabName) {
    this.container.querySelectorAll('.smc-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    this.container.querySelectorAll('.smc-tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tab === tabName);
    });
    
    if (tabName === 'friends') {
      this.updateHeader('friends');
      this.loadFriends();
    } else if (tabName === 'chat') {
      this.updateHeader('conversations');
      this.loadConversations();
      this.showConversationsList();
    }
  }
  
  autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px';
  }
  
  async setupSocketConnection() {
    try {
      // Try to load socket.io
      if (!window.io) {
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }
      
      this.connect();
    } catch (error) {
      console.warn('Socket.IO not available:', error);
    }
  }
  
  connect() {
    const token = this.getToken();
    SimpleModernChat.log('[SimpleModernChat] Connect attempt - token:', token ? 'EXISTS' : 'NULL');
    if (!token || !window.io) {
      SimpleModernChat.log('[SimpleModernChat] Connect failed - missing token or socket.io');
      return;
    }

    SimpleModernChat.log('[SimpleModernChat] Creating socket connection to:', this.server);
    this.socket = io(this.server, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.updateStatus(true);
      SimpleModernChat.log('[SimpleModernChat] Socket connected');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.updateStatus(false);
      SimpleModernChat.log('[SimpleModernChat] Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      SimpleModernChat.error('[SimpleModernChat] Socket connection error:', error);
    });

    this.socket.on('joined', (data) => {
      SimpleModernChat.log('[SimpleModernChat] Successfully joined room:', data.roomId);
    });    this.socket.on('message', (data) => {
      SimpleModernChat.log('[SimpleModernChat] Received message event:', data);
      this.hideTypingIndicator(); // Hide typing when message received
      if (data.message) {
        const msg = data.message;
        SimpleModernChat.log('[SimpleModernChat] Adding message to UI:', msg);
        
        // Backend should include is_own field, if not available check sender_id
        const isOwn = msg.is_own !== undefined ? msg.is_own : (msg.sender_id === this.getCurrentUserId());
        if (!isOwn) {
          this.addMessageFromServer(msg);
          
          // Update unread count if chat widget is hidden or different conversation
          if (this.container.classList.contains('hidden') || 
              (this.currentPeer && this.currentPeer.id !== msg.sender_id)) {
            // Reload conversations to get updated unread counts, then update badges
            setTimeout(() => {
              this.loadConversations();
            }, 500);
          }
        }
      } else {
        SimpleModernChat.warn('[SimpleModernChat] Received message event without message data');
      }
    });
    
    this.socket.on('typing', (data) => {
      if (data.isTyping) {
        this.showTypingIndicator(data.peerName || 'User');
      } else {
        this.hideTypingIndicator();
      }
    });
    
    this.socket.on('messageStatus', (data) => {
      this.updateMessageStatus(data.messageId, data.status);
    });

    // Message deleted by sender
    this.socket.on('messageDeleted', ({ messageId }) => {
      const messageEl = this.container.querySelector(`[data-message-id="${messageId}"]`);
      if (messageEl) {
        const contentEl = messageEl.querySelector('.smc-message-content');
        if (contentEl) {
          contentEl.innerHTML = '<em style="opacity:0.7;font-size:12px;">Tin nhắn đã được thu hồi</em>';
        }
        // Hide action buttons
        const actions = messageEl.querySelector('.smc-message-actions');
        if (actions) actions.style.display = 'none';
      }
    });

    // Reactions update
    this.socket.on('messageReaction', ({ messageId, reactions }) => {
      const bubble = this.container.querySelector(`[data-message-id="${messageId}"] .smc-bubble`);
      if (!bubble) return;
      
      let reactionsEl = bubble.querySelector('.smc-reactions');
      
      if (reactions && reactions.length > 0) {
        const html = reactions.map(r => 
          `<span class="smc-reaction">${this.escapeHtml(r.emoji)} ${r.count}</span>`
        ).join('');
        
        if (reactionsEl) {
          reactionsEl.innerHTML = html;
        } else {
          bubble.insertAdjacentHTML('beforeend', `<div class="smc-reactions">${html}</div>`);
        }
      } else if (reactionsEl) {
        reactionsEl.remove();
      }
    });
    
    this.socket.on('error', (error) => {
      console.error('Chat error:', error);
    });
  }
  
  updateStatus(connected) {
    const status = this.container.querySelector('.smc-status');
    status.className = `smc-status ${connected ? 'connected' : 'disconnected'}`;
  }
  
  async loadFriends() {
    const friendsContainer = this.container.querySelector('.smc-friends');
    
    try {
      const token = this.getToken();
      SimpleModernChat.log('[SimpleModernChat] Loading friends with token:', token ? 'TOKEN_EXISTS' : 'NO_TOKEN');
      SimpleModernChat.log('[SimpleModernChat] Server URL:', this.server);
      
      if (!token) {
        friendsContainer.innerHTML = `
          <div class="smc-empty">
            <div class="smc-empty-icon">🔒</div>
            <div>Cần đăng nhập</div>
          </div>
        `;
        return;
      }
      
      // Try both endpoints to see if there's a difference
      const listUrl = `${this.server}/api/friend/list`;
      const dataUrl = `${this.server}/api/friend/data`;
      
      SimpleModernChat.log('[SimpleModernChat] Fetching friends from:', listUrl);
      
      const response = await fetch(listUrl, {
        headers: { 'x-auth-token': token }
      });
      
      SimpleModernChat.log('[SimpleModernChat] Friends response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        SimpleModernChat.log('[SimpleModernChat] Friends data from /list:', data);
        
        // Also try the /data endpoint for comparison
        try {
          const dataResponse = await fetch(dataUrl, {
            headers: { 'x-auth-token': token }
          });
          if (dataResponse.ok) {
            const dataData = await dataResponse.json();
            SimpleModernChat.log('[SimpleModernChat] Friends data from /data:', dataData);
            
            // Use the data endpoint if it has more information
            if (dataData.friends && dataData.friends.length > 0) {
              this.renderFriends(dataData.friends);
              return;
            } else if (dataData.pendingRequests && dataData.pendingRequests.length > 0) {
              SimpleModernChat.log('[SimpleModernChat] No friends but found pending requests:', dataData.pendingRequests);
            }
          }
        } catch (dataErr) {
          SimpleModernChat.warn('[SimpleModernChat] Failed to fetch from /data endpoint:', dataErr);
        }
        
        this.renderFriends(data.friends || []);
      } else {
        const errorText = await response.text();
        SimpleModernChat.error('[SimpleModernChat] Friends error:', errorText);
        throw new Error(`Failed to load friends: ${response.status}`);
      }
    } catch (error) {
      SimpleModernChat.error('[SimpleModernChat] LoadFriends error:', error);
      friendsContainer.innerHTML = `
        <div class="smc-empty">
          <div class="smc-empty-icon">❌</div>
          <div>Lỗi tải bạn bè: ${error.message}</div>
          <div style="font-size: 12px; margin-top: 8px;">
            <button onclick="window.simpleChat.loadFriends()" style="background: #1877f2; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
              Thử lại
            </button>
          </div>
        </div>
      `;
    }
  }
  
  renderFriends(friends) {
    const container = this.container.querySelector('.smc-friends');
    
    SimpleModernChat.log('[SimpleModernChat] Rendering friends:', friends);
    
    if (friends.length === 0) {
      container.innerHTML = `
        <div class="smc-empty">
          <div class="smc-empty-icon">👥</div>
          <div>Chưa có bạn bè</div>
          <div style="font-size: 12px; color: #65676b; margin-top: 8px;">
            Hãy thêm bạn bè để bắt đầu trò chuyện
          </div>
          <div style="margin-top: 8px;">
            <button onclick="window.simpleChat.openAddFriendDialog()" style="background: #1877f2; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
              Thêm bạn bè
            </button>
          </div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = friends.map(friend => {
      SimpleModernChat.log('[SimpleModernChat] Processing friend:', friend);
      const friendName = friend.name || friend.display_name || friend.username || 'Unknown';
      const friendId = friend.id || friend.user_id || friend.friend_id;
      const friendAvatar = this.getAvatarUrl(friend);
      
      return `
        <div class="smc-friend" onclick="window.simpleChat.startChat('${friendId}', '${this.escapeHtml(friendName)}')">
          <div class="smc-friend-avatar">
            ${friendAvatar ? 
              `<img src="${friendAvatar}" alt="${this.escapeHtml(friendName)}" onerror="this.style.display='none'; this.parentNode.innerHTML='${this.getInitials(friendName)}';">` 
              : this.getInitials(friendName)
            }
          </div>
          <div class="smc-friend-info">
            <div class="smc-friend-name">${this.escapeHtml(friendName)}</div>
            <div class="smc-friend-status">Đang hoạt động</div>
          </div>
        </div>
      `;
    }).join('');
  }

  openAddFriendDialog() {
    // Simple prompt for now - could be enhanced with a proper modal
    const friendEmail = prompt('Nhập email của người bạn muốn kết bạn:');
    if (friendEmail && friendEmail.trim()) {
      this.sendFriendRequest(friendEmail.trim());
    }
  }

  async sendFriendRequest(email) {
    try {
      const token = this.getToken();
      if (!token) {
        this.showNotification('Cần đăng nhập để gửi lời mời kết bạn', 'error');
        return;
      }

      const response = await fetch(`${this.server}/api/friend/request`, {
        method: 'POST',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        const data = await response.json();
        this.showNotification('Đã gửi lời mời kết bạn!', 'success');
        // Refresh friends list
        setTimeout(() => this.loadFriends(), 1000);
      } else {
        const error = await response.json();
        this.showNotification(error.message || 'Không thể gửi lời mời kết bạn', 'error');
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
      this.showNotification('Lỗi khi gửi lời mời kết bạn', 'error');
    }
  }
  
  startChat(peerId, peerName) {
    this.currentPeer = { id: peerId, name: peerName };
    
    // Update header with avatar
    this.updateHeader('chat-room', { 
      peer: this.currentPeer, 
      peerName: peerName 
    });
    
    // Only switch to chat tab if not already there, and ensure we stay in chat room view
    const activeTab = this.container.querySelector('.smc-tab.active');
    if (!activeTab || activeTab.dataset.tab !== 'chat') {
      this.switchTab('chat');
    }
    
    // Ensure we're showing chat room, not conversations list
    this.showChatRoom();
    
    // Load chat history
    this.loadChatHistory(peerId);
    
    // Join room
    if (this.socket && this.isConnected) {
      this.socket.emit('join', { peerId });
    }
    
    // Show input
    this.container.querySelector('.smc-input').focus();
    
    this.showNotification(`Đã mở chat với ${peerName}`);
  }
  
  async loadChatHistory(peerId) {
    const messages = this.container.querySelector('.smc-messages');
    
    SimpleModernChat.log('[SimpleModernChat] Loading chat history for peer:', peerId);
    
    try {
      const token = this.getToken();
      SimpleModernChat.log('[SimpleModernChat] Token for history:', token ? 'EXISTS' : 'NOT_FOUND');
      
      if (!token) {
        messages.innerHTML = '<div class="smc-empty"><div>Cần đăng nhập để xem lịch sử</div></div>';
        return;
      }
      
      // Show loading
      messages.innerHTML = '<div class="smc-loading">Đang tải lịch sử chat...</div>';
      
      const url = `${this.server}/api/chat/history/${peerId}`;
      SimpleModernChat.log('[SimpleModernChat] Fetching history from:', url);
      
      const response = await fetch(url, {
        headers: { 'x-auth-token': token }
      });
      
      SimpleModernChat.log('[SimpleModernChat] History response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        SimpleModernChat.log('[SimpleModernChat] History data received:', data);
        this.renderChatHistory(data.messages || []);
      } else {
        const errorText = await response.text();
        SimpleModernChat.error('[SimpleModernChat] History error response:', errorText);
        throw new Error(`Failed to load chat history: ${response.status}`);
      }
    } catch (error) {
      SimpleModernChat.error('[SimpleModernChat] Load history error:', error);
      messages.innerHTML = `<div class="smc-empty"><div>Không thể tải lịch sử chat: ${error.message}</div></div>`;
    }
  }
  
  renderChatHistory(messages) {
    const container = this.container.querySelector('.smc-messages');
    container.innerHTML = '';
    
    SimpleModernChat.log('[renderChatHistory] Rendering', messages.length, 'messages');
    
    if (messages.length === 0) {
      container.innerHTML = `
        <div class="smc-empty">
          <div class="smc-empty-icon">💬</div>
          <div>Chưa có tin nhắn nào</div>
          <div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">Hãy gửi tin nhắn đầu tiên!</div>
        </div>
      `;
      return;
    }

    messages.forEach((msg, index) => {
      // Backend đã xử lý is_own, không cần getCurrentUserId()
      const isOwn = msg.is_own;
      SimpleModernChat.log(`[renderChatHistory] Message #${index}:`, {
        id: msg.id?.substring(0, 8),
        sender_id: msg.sender_id,
        is_own: isOwn,
        content: msg.content?.substring(0, 30)
      });
      
      const messageEl = document.createElement('div');
      messageEl.className = `smc-message ${isOwn ? 'own' : 'peer'}${msg.pinned ? ' pinned' : ''}`;
      messageEl.setAttribute('data-message-id', msg.id);
      
      const timestamp = new Date(msg.created_at).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Show sender name for peer messages
      const senderName = !isOwn ? (this.currentPeer?.name || 'User') : '';
      
      // Handle reply context
      let replyHtml = '';
      if (msg.reply_to_id && msg.reply_content) {
        replyHtml = `
          <div class="smc-reply-context">
            <div class="smc-reply-line"></div>
            <div class="smc-reply-text">${this.escapeHtml(msg.reply_content)}</div>
          </div>
        `;
      }
      
      // Reactions display
      const reactionsHtml = msg.reactions && msg.reactions.length > 0 ? `
        <div class="smc-reactions">
          ${msg.reactions.map(r => `
            <span class="smc-reaction" data-emoji="${r.emoji}" data-count="${r.count}" data-message-id="${msg.id}" title="Xem chi tiết">
              ${r.emoji} ${r.count > 1 ? r.count : ''}
            </span>
          `).join('')}
        </div>
      ` : '';

      // Handle message content based on type
      let messageContentHtml;
      if (msg.message_type === 'image') {
        messageContentHtml = `
          <div class="smc-image-message">
            <img src="${msg.content}" alt="Hình ảnh" style="max-width: 250px; border-radius: 8px; cursor: pointer;" onclick="window.open('${msg.content}', '_blank')">
          </div>
        `;
      } else {
        messageContentHtml = `<div class="smc-message-content">${this.escapeHtml(msg.content)}</div>`;
      }

      // Message actions (below bubble)
      const actionsHtml = `
        <div class="smc-message-actions">
          <button class="smc-action-btn smc-reply-btn" data-action="reply" data-message-id="${msg.id}" data-content="${this.escapeHtml(msg.content)}" title="Trả lời">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
          </button>
          <button class="smc-action-btn smc-react-btn" data-action="react" data-message-id="${msg.id}" title="Thả cảm xúc">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </button>
          ${isOwn ? `<button class="smc-action-btn smc-delete-btn" data-action="delete" data-message-id="${msg.id}" title="Thu hồi">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>` : ''}
          <button class="smc-action-btn smc-pin-btn" data-action="pin" data-message-id="${msg.id}" title="Ghim tin nhắn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v8H6a1 1 0 0 0 0 2h5v6a1 1 0 0 0 2 0v-6h5a1 1 0 0 0 0-2h-2z"/></svg>
          </button>
        </div>
      `;
      
      const statusIcon = isOwn ? this.getStatusIcon(msg.status || 'read') : '';
      
      // Avatar for peer messages
      let avatarHtml = '';
      if (!isOwn && this.currentPeer) {
        const avatarUrl = this.getAvatarUrl(this.currentPeer);
        const initial = this.getInitials(this.currentPeer.name || this.currentPeer.username || 'U');
        avatarHtml = `
          <div class="smc-message-avatar">
            ${avatarUrl ? 
              `<img src="${avatarUrl}" alt="${this.currentPeer.name || 'User'}" onerror="this.style.display='none'; this.parentNode.innerHTML='${initial}';">` 
              : initial
            }
          </div>
        `;
      }
      
      messageEl.innerHTML = `
        <div class="smc-message-wrapper">
          ${avatarHtml}
          <div class="smc-message-content-wrapper">
            ${!isOwn && senderName ? `<div class="smc-sender-name">${this.escapeHtml(senderName)}</div>` : ''}
            <div class="smc-bubble">
              ${replyHtml}
              ${messageContentHtml}
              ${isOwn ? `<span class="smc-message-status">${statusIcon}</span>` : ''}
              <div class="smc-message-time">${timestamp}</div>
            </div>
            ${reactionsHtml}
            ${actionsHtml}
            ${msg.pinned ? '<div class="smc-pin-indicator">📌</div>' : ''}
          </div>
        </div>
      `;
      
      container.appendChild(messageEl);
    });
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }  getCurrentUserId() {
    // Cached value
    if (this._cachedUserId) {
      return this._cachedUserId;
    }

    let userId = null;
    
    // Primary: Try QuizzmanAuth (SSO cookie-based)
    if (window.QuizzmanAuth?.getCurrentUser) {
      const user = window.QuizzmanAuth.getCurrentUser();
      if (user?.id) {
        userId = user.id;
        SimpleModernChat.log('[getCurrentUserId] ✅ Got ID from QuizzmanAuth:', userId);
      }
    }
    
    // Secondary: Try decoding JWT token from QuizzmanAuth or localStorage fallback
    if (!userId) {
      const token = window.QuizzmanAuth?.getToken?.() || localStorage.getItem('authToken') || localStorage.getItem('auth_token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.user_id || payload.id || payload.userId || payload.sub;
          SimpleModernChat.log('[getCurrentUserId] ✅ Got ID from token:', userId);
        } catch (e) {
          SimpleModernChat.warn('[getCurrentUserId] Token decode failed:', e.message);
        }
      }
    }
    
    // Fallback: Try global auth objects  
    if (!userId) {
      if (window.Auth?.user?.id) {
        userId = window.Auth.user.id;
        SimpleModernChat.log('[getCurrentUserId] ✅ Got ID from window.Auth:', userId);
      } else if (window.authManager?.currentUser?.id) {
        userId = window.authManager.currentUser.id;
        SimpleModernChat.log('[getCurrentUserId] ✅ Got ID from authManager:', userId);
      }
    }
    
    // Cache result
    if (userId) {
      this._cachedUserId = userId;
    } else {
      SimpleModernChat.error('[getCurrentUserId] ❌ No user ID found!');
    }
    
    return userId;
  }

  bindMessageActions() {
    // Use event delegation for dynamically added messages
    const messagesContainer = this.container.querySelector('.smc-messages');
    if (!messagesContainer) {
      SimpleModernChat.warn('[bindMessageActions] Messages container not found!');
      return;
    }
    
    SimpleModernChat.log('[bindMessageActions] ✅ Setting up event delegation on:', messagesContainer);

    messagesContainer.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('.smc-action-btn');
      const reactionEl = e.target.closest('.smc-reaction');
      
      if (reactionEl) {
        const messageId = reactionEl.getAttribute('data-message-id');
        this.showReactionDetails(messageId);
        return;
      }
      
      if (!actionBtn) return;

      SimpleModernChat.log('[bindMessageActions] Button clicked:', {
        target: e.target,
        actionBtn: actionBtn,
        action: actionBtn.getAttribute('data-action')
      });

      const messageEl = actionBtn.closest('.smc-message');
      const messageId = messageEl?.getAttribute('data-message-id');
      if (!messageId) {
        SimpleModernChat.warn('[bindMessageActions] No message ID found');
        return;
      }

      const action = actionBtn.getAttribute('data-action');
      const bubble = messageEl.querySelector('.smc-bubble');
      const contentEl = bubble?.querySelector('.smc-message-content');
      const text = contentEl?.textContent?.trim() || '';

      SimpleModernChat.log('[bindMessageActions] Processing action:', {
        action,
        messageId: messageId.substring(0, 8),
        text: text.substring(0, 30)
      });

      switch (action) {
        case 'reply':
          this.setReplyContext({ id: messageId, text });
          break;
        case 'react':
          this.showReactionPicker(messageEl, messageId);
          break;
        case 'delete':
          if (confirm('Thu hồi tin nhắn này?')) {
            if (this.socket && this.isConnected) {
              SimpleModernChat.log('[bindMessageActions] Emitting deleteMessage');
              this.socket.emit('deleteMessage', { messageId });
            } else {
              SimpleModernChat.error('[bindMessageActions] Socket not connected!');
            }
          }
          break;
        case 'pin':
          this.togglePinMessage(messageId, messageEl);
          break;
        default:
          SimpleModernChat.warn('[bindMessageActions] Unknown action:', action);
      }
    });

    // Add touch and drag events for swipe-to-reply
    this.bindSwipeToReply(messagesContainer);
    
    // Add long press for delete
    this.bindLongPressDelete(messagesContainer);
  }

  setReplyContext({ id, text }) {
    this.replyTo = { id, text };
    SimpleModernChat.log('[setReplyContext] Setting reply to message:', {
      id: id.substring(0, 8),
      text: text.substring(0, 30)
    });
    
    const bar = this.container.querySelector('.smc-reply-bar');
    if (!bar) {
      SimpleModernChat.warn('[setReplyContext] Reply bar not found!');
      return;
    }
    
    bar.innerHTML = `
      <div class="smc-reply-bar-text">↩️ Trả lời: ${this.escapeHtml(text.substring(0, 50))}${text.length > 50 ? '...' : ''}</div>
      <button class="smc-reply-cancel">×</button>
    `;
    bar.classList.remove('hidden');
    SimpleModernChat.log('[setReplyContext] ✅ Reply bar shown');
    
    const cancel = bar.querySelector('.smc-reply-cancel');
    if (cancel) {
      cancel.onclick = () => {
        this.replyTo = null;
        bar.classList.add('hidden');
        bar.innerHTML = '';
        SimpleModernChat.log('[setReplyContext] Reply cancelled');
      };
    }

    // Focus input
    this.container.querySelector('.smc-input')?.focus();
  }
  
  sendMessage() {
    // Prevent rapid duplicate calls
    if (this.sendingMessage) return;
    this.sendingMessage = true;
    
    const input = this.container.querySelector('.smc-input');
    const message = input.value.trim();
    
    if (!message || !this.currentPeer) {
      this.sendingMessage = false;
      return;
    }
    
    // Clear input immediately to prevent double-send
    input.value = '';
    input.style.height = 'auto';
    this.container.querySelector('.smc-send').disabled = true;
    
    // Generate unique message ID
    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Add to UI with message status
    this.addMessage(message, true, messageId);
    
    // Send via socket
    if (this.socket && this.isConnected) {
      const payload = {
        peerId: this.currentPeer.id,
        message: message,
        messageId: messageId
      };
      
      // Include reply info if replying
      if (this.replyTo) {
        payload.replyToId = this.replyTo.id;
        payload.messageType = 'text';
      }
      
      this.socket.emit('sendMessage', payload);
    }
    
    // Clear reply context
    if (this.replyTo) {
      this.replyTo = null;
      const bar = this.container.querySelector('.smc-reply-bar');
      if (bar) {
        bar.classList.add('hidden');
        bar.innerHTML = '';
      }
    }
    
    // Reset sending flag after short delay
    setTimeout(() => {
      this.sendingMessage = false;
    }, 100);
  }
  
  addMessage(text, isOwn = false, messageId = null, status = 'sending') {
    const messages = this.container.querySelector('.smc-messages');
    const messageEl = document.createElement('div');
    messageEl.className = `smc-message ${isOwn ? 'own' : ''}`;
    if (messageId) {
      messageEl.setAttribute('data-message-id', messageId);
    }
    
    const statusIcon = isOwn ? this.getStatusIcon(status) : '';
    messageEl.innerHTML = `
      <div class="smc-bubble">
        ${this.escapeHtml(text)}
        ${isOwn ? `<span class="smc-message-status">${statusIcon}</span>` : ''}
      </div>
    `;
    
    messages.appendChild(messageEl);
    messages.scrollTop = messages.scrollHeight;
    
    // Auto-update status to delivered after short delay for own messages
    if (isOwn && status === 'sending') {
      setTimeout(() => {
        this.updateMessageStatus(messageId, 'delivered');
      }, 1000);
    }
  }

  addMessageFromServer(msg) {
    const messages = this.container.querySelector('.smc-messages');
    const messageEl = document.createElement('div');
    const isOwn = msg.sender_id === this.getCurrentUserId();
    
    messageEl.className = `smc-message ${isOwn ? 'own' : ''}`;
    messageEl.setAttribute('data-message-id', msg.id);
    
    let messageContent = this.escapeHtml(msg.content);
    
    // Handle reply
    if (msg.reply_to_id && msg.reply_content) {
      messageContent = `
        <div class="smc-reply-context">
          <div class="smc-reply-line"></div>
          <div class="smc-reply-text">${this.escapeHtml(msg.reply_content)}</div>
        </div>
        ${messageContent}
      `;
    }
    
    const statusIcon = isOwn ? this.getStatusIcon(msg.status || 'delivered') : '';
    messageEl.innerHTML = `
      <div class="smc-bubble">
        ${messageContent}
        ${isOwn ? `<span class="smc-message-status">${statusIcon}</span>` : ''}
      </div>
    `;
    
    messages.appendChild(messageEl);
    messages.scrollTop = messages.scrollHeight;
  }

  getCurrentUserId() {
    // Try to get user ID from token or window object
    try {
      const token = this.getToken();
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id;
      }
    } catch (e) {
      SimpleModernChat.warn('[SimpleModernChat] Could not get user ID from token');
    }
    return null;
  }
  
  getStatusIcon(status) {
    switch (status) {
      case 'sending': return '<span class="status-text">Sending</span>';
      case 'sent': return '<span class="status-text">Sent</span>';
      case 'delivered': return '<span class="status-text">Delivered</span>';
      case 'read': return '<span class="status-text">Read</span>';
      case 'seen': return '<span class="status-text">Seen</span>';
      default: return '<span class="status-text">Sent</span>';
    }
  }
  
  updateMessageStatus(messageId, newStatus) {
    if (!messageId) return;
    
    const messageEl = this.container.querySelector(`[data-message-id="${messageId}"]`);
    if (messageEl) {
      const statusEl = messageEl.querySelector('.smc-message-status');
      if (statusEl) {
        statusEl.innerHTML = this.getStatusIcon(newStatus);
      }
    }
  }
  
  sendTypingIndicator(isTyping) {
    if (!this.socket || !this.isConnected || !this.currentPeer) return;
    
    this.socket.emit('typing', {
      peerId: this.currentPeer.id,
      isTyping: isTyping
    });
  }
  
  showTypingIndicator(peerName) {
    this.hideTypingIndicator(); // Remove existing first
    
    const messages = this.container.querySelector('.smc-messages');
    const typingEl = document.createElement('div');
    typingEl.className = 'smc-typing-indicator';
    typingEl.id = 'typing-indicator';
    typingEl.innerHTML = `
      ${peerName} is typing
      <div class="smc-typing-dots">
        <div class="smc-typing-dot"></div>
        <div class="smc-typing-dot"></div>
        <div class="smc-typing-dot"></div>
      </div>
    `;
    
    messages.appendChild(typingEl);
    messages.scrollTop = messages.scrollHeight;
  }
  
  hideTypingIndicator() {
    const existing = this.container.querySelector('#typing-indicator');
    if (existing) {
      existing.remove();
    }
  }
  
  show() {
    SimpleModernChat.log('[SimpleModernChat] show() called, container:', this.container);
    this.container.classList.remove('hidden');
    // Force inline styles to defeat hostile external CSS
    this.container.style.display = 'flex';
    this.container.style.visibility = 'visible';
    this.container.style.opacity = '1';
    this.container.style.transform = 'none';
    this.container.style.pointerEvents = 'auto';
    this.container.style.zIndex = '999999'; // Ensure on top
    SimpleModernChat.log('[SimpleModernChat] Container styles applied:', {
      display: this.container.style.display,
      visibility: this.container.style.visibility,
      opacity: this.container.style.opacity,
      zIndex: this.container.style.zIndex,
      inDOM: document.body.contains(this.container)
    });
    if (!this.isConnected) {
      this.connect();
    }
    
    // Load conversations when showing chat for the first time
    if (!this._conversationsLoaded) {
      this.loadConversations();
      this._conversationsLoaded = true;
    }

    // Update badge count when showing chat
    setTimeout(() => {
      this.calculateTotalUnreadCount();
    }, 200);
  }
  
  hide() {
    this.container.classList.add('hidden');
    // Maintain layout but hide interactions/visibility
    this.container.style.display = 'flex';
    this.container.style.visibility = 'hidden';
    this.container.style.opacity = '0';
    this.container.style.transform = 'translateY(20px)';
    this.container.style.pointerEvents = 'none';
  }
  
  toggle() {
    SimpleModernChat.log('[SimpleModernChat] toggle() called, hidden:', this.container?.classList.contains('hidden'));
    if (this.container.classList.contains('hidden')) {
      this.show();
    } else {
      this.hide();
    }
  }
  
  showNotification(message, typeOrDuration = 3000) {
    // Handle both old (duration) and new (type) parameter formats
    let duration = 3000;
    let type = 'success';
    
    if (typeof typeOrDuration === 'string') {
      type = typeOrDuration;
    } else {
      duration = typeOrDuration;
    }
    
    // Color mapping for different types
    const colors = {
      success: '#0084ff',
      info: '#1877f2', 
      error: '#e74c3c',
      warning: '#f39c12'
    };
    
    // Create simple notification
    const notif = document.createElement('div');
    notif.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type] || colors.success};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 100000;
      font-family: inherit;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideInNotif 0.3s ease;
    `;
    notif.textContent = message;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
      if (notif.parentNode) {
        notif.parentNode.removeChild(notif);
      }
    }, duration);
  }

  // Update message badges - compatible with friend-manager.js logic
  updateMessageBadges(count) {
    this.totalUnreadCount = count || 0;
    
    // Update chat button badge first
    this.updateChatButtonBadge(this.totalUnreadCount);
    
    // Find all message badge elements (consistent with friend-manager.js)
    const badges = [
      document.getElementById('messageBadge'),
      document.getElementById('notiBadge'),
      document.getElementById('chatBadgeS'),
      document.querySelector('.message-badge'),
      document.querySelector('.notification-badge'),
      ...document.querySelectorAll('.smc-notification-badge')
    ].filter(badge => badge !== null);
    
    SimpleModernChat.log('[SimpleModernChat] Updating message badges:', {
      count: this.totalUnreadCount,
      foundBadges: badges.length
    });
    
    badges.forEach(badge => {
      if (!badge) return;
      
      if (this.totalUnreadCount > 0) {
        badge.textContent = this.totalUnreadCount;
        badge.classList.remove('classroom-hidden', 'hidden');
        badge.style.display = 'inline';
        badge.style.visibility = 'visible';
      } else {
        badge.textContent = '0';
        badge.classList.add('classroom-hidden');
        badge.style.display = 'none';
        badge.style.visibility = 'hidden';
      }
    });
  }

  // Calculate total unread messages from conversations
  calculateTotalUnreadCount() {
    let total = 0;
    const conversations = this.container.querySelectorAll('.smc-conversation-unread');
    conversations.forEach(badge => {
      const count = parseInt(badge.textContent) || 0;
      total += count;
    });
    
    SimpleModernChat.log('[SimpleModernChat] Calculated total unread:', total);
    this.updateMessageBadges(total);
    return total;
  }

  showReactionDetails(messageId) {
    // Create modal to show who reacted
    const modal = document.createElement('div');
    modal.className = 'smc-reaction-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      backdrop-filter: blur(2px);
    `;
    
    modal.innerHTML = `
      <div style="background: white; border-radius: 12px; padding: 20px; max-width: 350px; width: 90%; box-shadow: 0 8px 24px rgba(0,0,0,0.2); position: relative; z-index: 1000000;">
        <h4 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Reactions</h4>
        <div class="smc-reaction-list">
          <div style="text-align: center; color: #65676b; padding: 20px;">Đang tải reactions...</div>
        </div>
        <button onclick="this.closest('.smc-reaction-modal').remove()" style="margin-top: 15px; background: #e4e6ea; border: none; border-radius: 6px; padding: 10px 20px; cursor: pointer; width: 100%; font-weight: 500;">Đóng</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Load actual reaction data
    this.loadReactionDetails(messageId, modal);
  }

  async loadReactionDetails(messageId, modal) {
    try {
      const token = this.getToken();
      SimpleModernChat.log('[SimpleModernChat] Loading reaction details from:', this.server);
      SimpleModernChat.log('[SimpleModernChat] Message ID:', messageId);
      const response = await fetch(`${this.server}/api/chat/details/${messageId}`, {
        headers: { 'x-auth-token': token }
      });
      
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        SimpleModernChat.error('[SimpleModernChat] Reaction details failed:', response.status, errText);
        throw new Error('Failed to load reactions');
      }
      
      const data = await response.json();
      // Normalize reactions into an array if backend returns grouped object
      let reactions = Array.isArray(data.reactions)
        ? data.reactions
        : (data.grouped
            ? Object.entries(data.grouped).flatMap(([emoji, arr]) => arr.map(u => ({ emoji, ...u })))
            : []);
      const list = modal.querySelector('.smc-reaction-list');
      
      if (!reactions || reactions.length === 0) {
        list.innerHTML = `
          <div style="text-align: center; color: #65676b; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 8px;">😔</div>
            <div>Chưa có reaction nào</div>
          </div>
        `;
        return;
      }
      
      const currentUserId = this.getCurrentUserId();
      list.innerHTML = reactions.map(r => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e4e6ea;">
          <div style="display: flex; align-items: center;">
            <span style="font-size: 20px; margin-right: 10px;">${r.emoji}</span>
            <span style="font-weight: ${r.user_id === currentUserId ? '600' : '400'};">${r.username || r.display_name || 'Unknown'}</span>
          </div>
          ${r.user_id === currentUserId ? `
            <button onclick="window.simpleChat.removeReaction('${messageId}', '${r.emoji}')" 
                    style="background: #ff4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 12px; cursor: pointer;">
              Thu hồi
            </button>
          ` : ''}
        </div>
      `).join('');
      
    } catch (error) {
      console.error('Failed to load reaction details:', error);
      const list = modal.querySelector('.smc-reaction-list');
      list.innerHTML = `
        <div style="text-align: center; color: #ff4444; padding: 20px;">
          <div style="font-size: 48px; margin-bottom: 8px;">❌</div>
          <div>Không thể tải reactions</div>
        </div>
      `;
    }
  }

  // New enhanced features
  showReactionPicker(messageEl, messageId) {
    // Remove existing picker
    document.querySelectorAll('.smc-reaction-picker').forEach(p => p.remove());
    
    const picker = document.createElement('div');
    picker.className = 'smc-reaction-picker show';
    picker.innerHTML = `
      ${['❤️', '👍', '😂', '😮', '😢', '😡'].map(emoji => 
        `<button class="smc-emoji-btn" data-emoji="${emoji}">${emoji}</button>`
      ).join('')}
    `;
    
    messageEl.appendChild(picker);
    
    // Add click handlers
    picker.addEventListener('click', (e) => {
      if (e.target.classList.contains('smc-emoji-btn')) {
        const emoji = e.target.getAttribute('data-emoji');
        this.sendReaction(messageId, emoji);
        picker.remove();
      }
    });
    
    // Auto remove after 5s
    setTimeout(() => picker.remove(), 5000);
  }

  sendReaction(messageId, emoji) {
    if (this.socket && this.isConnected) {
      this.socket.emit('reactMessage', { messageId, emoji });
    }
  }

  async removeReaction(messageId, emoji) {
    try {
      const token = this.getToken();
      const response = await fetch(`${this.server}/api/chat/reactions/${messageId}`, {
        method: 'DELETE',
        headers: { 
          'x-auth-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emoji })
      });
      
      if (!response.ok) throw new Error('Failed to remove reaction');
      
      // Close modal and show success message
      document.querySelector('.smc-reaction-modal')?.remove();
      this.showNotification('✅ Đã thu hồi reaction', 3000);
      
      // Emit socket event to update all clients
      if (this.socket && this.isConnected) {
        this.socket.emit('removeReaction', { messageId, emoji });
      }
      
    } catch (error) {
      console.error('Failed to remove reaction:', error);
      this.showNotification('❌ Không thể thu hồi reaction', 3000);
    }
  }

  async togglePinMessage(messageId, messageEl) {
    try {
      const isPinned = messageEl.classList.contains('pinned');
      const token = this.getToken();
      
      const response = await fetch(`${this.server}/api/chat/messages/${messageId}/pin`, {
        method: 'POST',
        headers: { 
          'x-auth-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pinned: !isPinned })
      });
      
      if (!response.ok) throw new Error('Failed to toggle pin');
      
      // Update UI
      if (isPinned) {
        messageEl.classList.remove('pinned');
        messageEl.querySelector('.smc-pin-indicator')?.remove();
        this.showNotification('📌 Đã bỏ ghim tin nhắn', 2000);
      } else {
        messageEl.classList.add('pinned');
        const indicator = document.createElement('div');
        indicator.className = 'smc-pin-indicator';
        indicator.innerHTML = '📌';
        messageEl.querySelector('.smc-message-content-wrapper').appendChild(indicator);
        this.showNotification('📌 Đã ghim tin nhắn', 2000);
      }
      
      // Emit socket event
      if (this.socket && this.isConnected) {
        this.socket.emit('pinMessage', { messageId, pinned: !isPinned });
      }
      
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      this.showNotification('❌ Không thể thay đổi trạng thái ghim', 3000);
    }
  }

  bindSwipeToReply(container) {
    let startX, startY, currentX, currentY;
    let isDragging = false;
    let targetMessage = null;

    container.addEventListener('touchstart', (e) => {
      const message = e.target.closest('.smc-message');
      if (!message) return;
      
      targetMessage = message;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      
      // Add drag indicator
      if (!message.querySelector('.smc-drag-indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'smc-drag-indicator';
        indicator.innerHTML = '↩';
        message.appendChild(indicator);
      }
    });

    container.addEventListener('touchmove', (e) => {
      if (!targetMessage) return;
      
      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;
      
      const deltaX = currentX - startX;
      const deltaY = Math.abs(currentY - startY);
      
      // Check if horizontal swipe
      if (Math.abs(deltaX) > 30 && deltaY < 50) {
        isDragging = true;
        targetMessage.classList.add('dragging');
        targetMessage.style.transform = `translateX(${Math.min(deltaX, 100)}px)`;
        e.preventDefault();
      }
    });

    container.addEventListener('touchend', (e) => {
      if (targetMessage && isDragging) {
        const deltaX = currentX - startX;
        
        if (deltaX > 80) {
          // Trigger reply
          const messageId = targetMessage.getAttribute('data-message-id');
          const text = targetMessage.querySelector('.smc-message-content')?.textContent || '';
          this.setReplyContext({ id: messageId, text });
        }
        
        // Reset
        targetMessage.style.transform = '';
        targetMessage.classList.remove('dragging');
      }
      
      isDragging = false;
      targetMessage = null;
    });
  }

  bindLongPressDelete(container) {
    let pressTimer = null;
    
    container.addEventListener('touchstart', (e) => {
      const message = e.target.closest('.smc-message');
      if (!message || !message.classList.contains('own')) return;
      
      pressTimer = setTimeout(() => {
        if (confirm('Thu hồi tin nhắn này?')) {
          const messageId = message.getAttribute('data-message-id');
          if (this.socket && this.isConnected) {
            this.socket.emit('deleteMessage', { messageId });
          }
        }
      }, 800);
    });
    
    container.addEventListener('touchend', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });
    
    container.addEventListener('touchmove', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });
  }
  
  // Utilities
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  getInitials(name) {
    if (!name || typeof name !== 'string') {
      return '??';
    }
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  // Conversations management
  async loadConversations() {
    try {
      const token = this.getToken();
      if (!token) {
        SimpleModernChat.warn('[Conversations] No token available');
        
        // Try to use ChatAuthUtils for authentication if available
        if (window.ChatAuthUtils && typeof window.ChatAuthUtils.requireAuthentication === 'function') {
          // Show one-time prompt for login (avoid repeated prompts)
          if (!this._loginPromptShown) {
            this._loginPromptShown = true;
            SimpleModernChat.log('[SimpleModernChat] Offering authentication via ChatAuthUtils');
            setTimeout(() => {
              const shouldLogin = confirm('Chat yêu cầu đăng nhập để hoạt động. Bạn có muốn đăng nhập không?');
              if (shouldLogin) {
                window.ChatAuthUtils.requireAuthentication();
              }
            }, 1000); // Delay to avoid blocking page load
          }
        }
        return;
      }

      const response = await fetch(`${this.server}/api/chat/conversations`, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.renderConversations(data.conversations || []);
      } else {
        SimpleModernChat.error('[Conversations] Failed to load:', response.status);
      }
    } catch (error) {
      SimpleModernChat.error('[Conversations] Error:', error);
    }
  }

  renderConversations(conversations) {
    const container = this.container.querySelector('.smc-conversations-list');
    if (!container) return;

    if (conversations.length === 0) {
      container.innerHTML = `
        <div class="smc-empty">
          <div class="smc-empty-icon">💬</div>
          <div>Chưa có cuộc trò chuyện nào</div>
        </div>
      `;
      return;
    }

    container.innerHTML = conversations.map(conv => {
      const avatarUrl = this.getAvatarUrl(conv);
      const avatar = avatarUrl ? 
        `<img src="${avatarUrl}" alt="${conv.display_name || conv.username}" style="width: 100%; height: 100%; object-fit: cover;">` :
        this.getInitials(conv.display_name || conv.username || conv.peer_id);

      const lastMessage = conv.last_message || '';
      const timeAgo = this.formatTimeAgo(new Date(conv.last_message_time));
      const unreadCount = conv.unread_count > 0 ? `<div class="smc-conversation-unread">${conv.unread_count}</div>` : '';

      return `
        <div class="smc-conversation-item" data-peer-id="${conv.peer_id}" data-peer-name="${conv.display_name || conv.username || 'User'}">
          <div class="smc-conversation-avatar">${avatar}</div>
          <div class="smc-conversation-info">
            <div class="smc-conversation-name">${conv.display_name || conv.username || 'Unknown'}</div>
            <div class="smc-conversation-last">${this.escapeHtml(lastMessage.substring(0, 50))}${lastMessage.length > 50 ? '...' : ''}</div>
          </div>
          <div class="smc-conversation-time">${timeAgo}</div>
          ${unreadCount}
        </div>
      `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.smc-conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        const peerId = item.getAttribute('data-peer-id');
        const peerName = item.getAttribute('data-peer-name');
        this.openChatRoom(peerId, peerName);
      });
    });

    // Calculate and update total unread count after rendering
    setTimeout(() => {
      this.calculateTotalUnreadCount();
    }, 100);
  }

  showConversationsList() {
    const conversations = this.container.querySelector('.smc-conversations');
    const chatRoom = this.container.querySelector('.smc-chat-room');
    
    if (conversations) conversations.style.display = 'block';
    if (chatRoom) chatRoom.style.display = 'none';
    
    // Update header back to conversations view
    this.updateHeader('conversations');
  }

  showChatRoom() {
    const conversations = this.container.querySelector('.smc-conversations');
    const chatRoom = this.container.querySelector('.smc-chat-room');
    
    if (conversations) conversations.style.display = 'none';
    if (chatRoom) chatRoom.style.display = 'flex';
  }

  openChatRoom(peerId, peerName) {
    this.showChatRoom();
    
    // Update chat header
    const peerInfo = this.container.querySelector('.smc-peer-info');
    if (peerInfo) {
      peerInfo.textContent = peerName || 'User';
    }
    
    // Mark conversation as read and update badge
    this.markConversationAsRead(peerId);
    
    // Start chat with the peer
    this.startChat(peerId, peerName);
  }

  // Mark conversation as read when user opens it
  async markConversationAsRead(peerId) {
    try {
      const token = this.getToken();
      if (!token) return;

      // API call to mark as read
      await fetch(`${this.server}/api/chat/conversations/${peerId}/read`, {
        method: 'POST',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      // Update UI immediately - remove unread badge for this conversation
      const conversationItem = this.container.querySelector(`[data-peer-id="${peerId}"]`);
      if (conversationItem) {
        const unreadBadge = conversationItem.querySelector('.smc-conversation-unread');
        if (unreadBadge) {
          unreadBadge.remove();
        }
      }

      // Recalculate total unread count
      setTimeout(() => {
        this.calculateTotalUnreadCount();
      }, 100);

    } catch (error) {
      SimpleModernChat.error('[SimpleModernChat] Error marking conversation as read:', error);
    }
  }

  formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes}p`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('vi-VN');
  }
}

// Global initialization
window.initSimpleChat = function(options = {}) {
  if (window.simpleChat) {
    return window.simpleChat;
  }
  
  window.simpleChat = new SimpleModernChat(options);
  
  // Global API
  window.QuizzmanChat = {
    show: () => window.simpleChat.show(),
    hide: () => window.simpleChat.hide(),
    toggle: () => window.simpleChat.toggle(),
    startChat: (id, name) => window.simpleChat.startChat(id, name),
    refreshBadges: () => {
      if (window.simpleChat) {
        window.simpleChat.loadConversations();
      }
    },
    updateBadges: (count) => {
      if (window.simpleChat) {
        window.simpleChat.updateMessageBadges(count);
      }
    }
  };
  
  return window.simpleChat;
};

// QMF version - disable auto-init, let QMF control initialization
// Auto-init disabled - QMF.initChat() will handle it

// Bind existing buttons if manually initialized
document.addEventListener('DOMContentLoaded', () => {
  // Only bind if already initialized by QMF
  if (window.simpleChat) {
    const existingChatBtns = document.querySelectorAll('#chatBtn, [data-chat-btn], .chat-btn');
    if (existingChatBtns.length > 0) {
      SimpleModernChat.log('[SimpleModernChat] Binding existing chat buttons:', existingChatBtns.length);
      existingChatBtns.forEach(btn => {
        btn.addEventListener('click', () => window.simpleChat.toggle());
      });
    }
  }
});

// Add CSS animation for notifications
if (!document.getElementById('notif-animation')) {
  const style = document.createElement('style');
  style.id = 'notif-animation';
  style.textContent = `
    @keyframes slideInNotif {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

// Make available globally
window.SimpleModernChat = SimpleModernChat;
window.initSimpleChat = initSimpleChat;// Cache busting comment - Thu Oct 23 06:00:59 AM +07 2025
// Updated for chat.quizzman.com - Thu Oct 23 06:06:58 AM +07 2025
