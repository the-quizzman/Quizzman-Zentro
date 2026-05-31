'use strict';

var core = require('@qmf/core');
var utils = require('@qmf/utils');
var ui = require('@qmf/ui');

// src/index.ts
var ChatConfigSchema = core.z.object({
  wsUrl: core.z.string().url().default("wss://chat.quizzman.com/ws"),
  apiUrl: core.z.string().url().default("https://chat.quizzman.com/api"),
  // Auth
  getToken: core.z.function().optional(),
  // Sound
  soundEnabled: core.z.boolean().default(true),
  soundUrl: core.z.string().optional(),
  // Position
  position: core.z.enum(["bottom-right", "bottom-left"]).default("bottom-right"),
  // Max open conversations
  maxOpenConversations: core.z.number().default(3),
  // Features
  enableTypingIndicator: core.z.boolean().default(true),
  enableReadReceipts: core.z.boolean().default(true),
  enableReactions: core.z.boolean().default(true),
  enableFileUpload: core.z.boolean().default(true),
  // Reconnect
  reconnectAttempts: core.z.number().default(5),
  reconnectDelay: core.z.number().default(3e3),
  debug: core.z.boolean().default(false)
});
var QMFChat = class {
  constructor(config = {}) {
    this.emitter = utils.createEventEmitter();
    this.ws = null;
    this.reconnectCount = 0;
    this.reconnectTimer = null;
    this.panel = null;
    this.fabEl = null;
    this.badgeEl = null;
    this.panelContentEl = null;
    this.containerEl = null;
    this.cleanup = null;
    this.conversations = [];
    this.activeConversation = null;
    this.messages = /* @__PURE__ */ new Map();
    this.totalUnread = 0;
    this.isOpen = false;
    this.soundAudio = null;
    this.config = core.validateConfig(ChatConfigSchema, config, "ChatEmbed");
    this.logger = utils.createLogger("ChatEmbed", this.config.debug ? "debug" : "warn");
    if (this.config.soundEnabled) {
      this.soundAudio = new Audio(this.config.soundUrl || "/assets/sounds/message.mp3");
      this.soundAudio.volume = 0.3;
    }
  }
  // ─── Public API ─────────────────────────────────────────
  mount(container) {
    this.cleanup = utils.mountComponent(container, (el) => {
      this.containerEl = el;
      this.renderFAB();
      this.renderPanel();
      this.connect();
      this.fetchConversations();
      this.logger.debug("ChatEmbed mounted");
      return () => this.destroy();
    });
  }
  /** Open the chat panel */
  open() {
    this.isOpen = true;
    this.panel?.show();
    this.fabEl?.classList.add("qmf-chat-fab--active");
    this.emitter.emit("open");
  }
  /** Close the chat panel */
  close() {
    this.isOpen = false;
    this.panel?.hide();
    this.fabEl?.classList.remove("qmf-chat-fab--active");
    this.emitter.emit("close");
  }
  /** Toggle the chat panel */
  toggle() {
    this.isOpen ? this.close() : this.open();
  }
  /** Open a specific conversation */
  openConversation(conversationId) {
    this.activeConversation = conversationId;
    this.open();
    this.loadMessages(conversationId);
    this.renderConversationView(conversationId);
  }
  /** Send a message */
  sendMessage(conversationId, content) {
    if (!content.trim()) return;
    const msg = {
      conversationId,
      content: content.trim(),
      type: "text",
      status: "sending"
    };
    this.wsSend({ type: "message:send", payload: msg });
    this.emitter.emit("message:send", msg);
  }
  /** Set typing state */
  setTyping(conversationId, isTyping) {
    if (!this.config.enableTypingIndicator) return;
    this.wsSend({ type: "typing", payload: { conversationId, isTyping } });
  }
  /** Get total unread count */
  getUnreadCount() {
    return this.totalUnread;
  }
  /** Subscribe to events */
  on(event, cb) {
    return this.emitter.on(event, cb);
  }
  /** Destroy */
  destroy() {
    this.disconnect();
    this.panel?.destroy();
    this.fabEl?.remove();
    this.emitter.clear();
    if (this.cleanup) this.cleanup();
    this.containerEl = null;
  }
  // ─── WebSocket ──────────────────────────────────────────
  connect() {
    const token = this.config.getToken ? this.config.getToken() : utils.resolveToken();
    if (!token) {
      this.logger.warn("No auth token, skipping WebSocket connection");
      return;
    }
    try {
      this.ws = new WebSocket(`${this.config.wsUrl}?token=${token}`);
      this.ws.addEventListener("open", () => {
        this.logger.debug("WebSocket connected");
        this.reconnectCount = 0;
        this.emitter.emit("ws:connected");
      });
      this.ws.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWsMessage(data);
        } catch (e) {
          this.logger.error("Failed to parse WS message", e);
        }
      });
      this.ws.addEventListener("close", () => {
        this.logger.debug("WebSocket disconnected");
        this.emitter.emit("ws:disconnected");
        this.scheduleReconnect();
      });
      this.ws.addEventListener("error", (e) => {
        this.logger.error("WebSocket error", e);
      });
    } catch (e) {
      this.logger.error("WebSocket connection failed", e);
      this.scheduleReconnect();
    }
  }
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  scheduleReconnect() {
    if (this.reconnectCount >= this.config.reconnectAttempts) {
      this.logger.warn("Max reconnect attempts reached");
      return;
    }
    this.reconnectCount++;
    const delay = this.config.reconnectDelay * this.reconnectCount;
    this.logger.debug(`Reconnecting in ${delay}ms (attempt ${this.reconnectCount})`);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
  wsSend(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
  handleWsMessage(data) {
    switch (data.type) {
      case "message:new": {
        const msg = data.payload;
        this.onNewMessage(msg);
        break;
      }
      case "message:seen": {
        const { conversationId, messageIds } = data.payload;
        this.markMessagesSeen(conversationId, messageIds);
        break;
      }
      case "typing": {
        const { conversationId, userId, isTyping } = data.payload;
        this.onTypingIndicator(conversationId, userId, isTyping);
        break;
      }
      case "conversation:update": {
        this.fetchConversations();
        break;
      }
    }
  }
  // ─── Message Handlers ───────────────────────────────────
  onNewMessage(msg) {
    const msgs = this.messages.get(msg.conversationId) || [];
    msgs.push(msg);
    this.messages.set(msg.conversationId, msgs);
    if (msg.conversationId !== this.activeConversation || !this.isOpen) {
      this.totalUnread++;
      if (this.badgeEl) ui.updateBadge(this.badgeEl, this.totalUnread);
      core.getGlobalEventBus().emit("chat:unread", this.totalUnread);
      if (this.config.soundEnabled && this.soundAudio) {
        this.soundAudio.currentTime = 0;
        this.soundAudio.play().catch(() => {
        });
      }
      ui.createToast({
        message: `${msg.content.slice(0, 80)}${msg.content.length > 80 ? "\u2026" : ""}`,
        variant: "info",
        position: "top-right",
        duration: 4e3
      });
    }
    if (this.activeConversation === msg.conversationId && this.isOpen) {
      this.appendMessageToView(msg);
      if (this.config.enableReadReceipts) {
        this.wsSend({ type: "message:seen", payload: { conversationId: msg.conversationId, messageIds: [msg.id] } });
      }
    }
    this.emitter.emit("message:new", msg);
  }
  markMessagesSeen(conversationId, messageIds) {
    const msgs = this.messages.get(conversationId);
    if (!msgs) return;
    for (const msg of msgs) {
      if (messageIds.includes(msg.id)) msg.status = "seen";
    }
  }
  onTypingIndicator(conversationId, userId, isTyping) {
    this.emitter.emit("typing", { conversationId, userId, isTyping });
    if (this.activeConversation === conversationId) {
      const indicator = this.panelContentEl?.querySelector(".qmf-chat__typing");
      if (indicator) {
        indicator.textContent = isTyping ? "\u0110ang nh\u1EADp..." : "";
      }
    }
  }
  // ─── API Calls ──────────────────────────────────────────
  async fetchConversations() {
    const token = this.config.getToken ? this.config.getToken() : utils.resolveToken();
    if (!token) return;
    const result = await utils.safeFetch(`${this.config.apiUrl}/conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (result.ok && result.data) {
      this.conversations = result.data.data || [];
      this.totalUnread = this.conversations.reduce((sum, c) => sum + c.unreadCount, 0);
      if (this.badgeEl) ui.updateBadge(this.badgeEl, this.totalUnread);
      core.getGlobalEventBus().emit("chat:unread", this.totalUnread);
      if (this.isOpen && !this.activeConversation) {
        this.renderConversationList();
      }
    }
  }
  async loadMessages(conversationId) {
    const token = this.config.getToken ? this.config.getToken() : utils.resolveToken();
    if (!token) return;
    const result = await utils.safeFetch(`${this.config.apiUrl}/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (result.ok && result.data) {
      this.messages.set(conversationId, result.data.data || []);
    }
  }
  // ─── Render ─────────────────────────────────────────────
  renderFAB() {
    if (!this.containerEl) return;
    this.fabEl = utils.createElement("button", {
      className: `qmf-chat-fab qmf-chat-fab--${this.config.position}`,
      type: "button",
      "aria-label": "Open chat"
    });
    this.fabEl.innerHTML = '<i class="fas fa-comments"></i>';
    this.badgeEl = ui.createBadge({ variant: "danger" });
    this.fabEl.appendChild(this.badgeEl);
    this.fabEl.addEventListener("click", () => this.toggle());
    this.containerEl.appendChild(this.fabEl);
  }
  renderPanel() {
    if (!this.containerEl) return;
    this.panelContentEl = utils.createElement("div", { className: "qmf-chat__content" });
    this.panel = ui.createPanel({
      position: this.config.position === "bottom-right" ? "right" : "left",
      width: "380px",
      showOverlay: false,
      onClose: () => this.close()
    });
    const header = utils.createElement("div", { className: "qmf-chat__header" });
    header.innerHTML = `
      <h3 class="qmf-chat__title">Tin nh\u1EAFn</h3>
      <button class="qmf-chat__close" type="button" aria-label="Close"><i class="fas fa-times"></i></button>
    `;
    header.querySelector(".qmf-chat__close")?.addEventListener("click", () => this.close());
    const body = this.panel.getBody();
    body.appendChild(header);
    body.appendChild(this.panelContentEl);
    this.renderConversationList();
  }
  renderConversationList() {
    if (!this.panelContentEl) return;
    this.panelContentEl.innerHTML = "";
    this.activeConversation = null;
    if (this.conversations.length === 0) {
      this.panelContentEl.innerHTML = '<div class="qmf-chat__empty">Ch\u01B0a c\xF3 cu\u1ED9c tr\xF2 chuy\u1EC7n n\xE0o</div>';
      return;
    }
    const list = utils.createElement("div", { className: "qmf-chat__list" });
    for (const conv of this.conversations) {
      const item = utils.createElement("div", {
        className: `qmf-chat__conversation${conv.unreadCount > 0 ? " qmf-chat__conversation--unread" : ""}`
      });
      const otherParticipant = conv.participants[0];
      item.innerHTML = `
        <img class="qmf-chat__conv-avatar" src="${otherParticipant?.avatar || ""}" alt="" />
        <div class="qmf-chat__conv-info">
          <div class="qmf-chat__conv-name">${otherParticipant?.name || "Unknown"}</div>
          <div class="qmf-chat__conv-preview">${conv.lastMessage?.content?.slice(0, 50) || ""}</div>
        </div>
        <div class="qmf-chat__conv-meta">
          <span class="qmf-chat__conv-time">${conv.lastMessage ? utils.formatRelativeTime(new Date(conv.lastMessage.createdAt)) : ""}</span>
          ${conv.unreadCount > 0 ? `<span class="qmf-badge qmf-badge--danger">${conv.unreadCount}</span>` : ""}
        </div>
      `;
      item.addEventListener("click", () => this.openConversation(conv.id));
      list.appendChild(item);
    }
    this.panelContentEl.appendChild(list);
  }
  renderConversationView(conversationId) {
    if (!this.panelContentEl) return;
    this.panelContentEl.innerHTML = "";
    const topBar = utils.createElement("div", { className: "qmf-chat__topbar" });
    const backBtn = utils.createElement("button", { className: "qmf-chat__back", type: "button" });
    backBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
    backBtn.addEventListener("click", () => this.renderConversationList());
    topBar.appendChild(backBtn);
    const conv = this.conversations.find((c) => c.id === conversationId);
    if (conv) {
      const name = utils.createElement("span", { className: "qmf-chat__topbar-name" }, [conv.participants[0]?.name || "Unknown"]);
      topBar.appendChild(name);
    }
    this.panelContentEl.appendChild(topBar);
    const messagesEl = utils.createElement("div", { className: "qmf-chat__messages" });
    const msgs = this.messages.get(conversationId) || [];
    for (const msg of msgs) {
      messagesEl.appendChild(this.createMessageEl(msg));
    }
    this.panelContentEl.appendChild(messagesEl);
    const typing = utils.createElement("div", { className: "qmf-chat__typing" });
    this.panelContentEl.appendChild(typing);
    const inputArea = utils.createElement("div", { className: "qmf-chat__input-area" });
    const input = utils.createElement("input", {
      className: "qmf-chat__input",
      type: "text",
      placeholder: "Nh\u1EADp tin nh\u1EAFn..."
    });
    const sendTyping = utils.debounce(() => this.setTyping(conversationId, false), 2e3);
    input.addEventListener("input", () => {
      this.setTyping(conversationId, true);
      sendTyping();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage(conversationId, input.value);
        input.value = "";
        this.setTyping(conversationId, false);
      }
    });
    const sendBtn = utils.createElement("button", {
      className: "qmf-chat__send",
      type: "button"
    });
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    sendBtn.addEventListener("click", () => {
      this.sendMessage(conversationId, input.value);
      input.value = "";
    });
    inputArea.appendChild(input);
    inputArea.appendChild(sendBtn);
    this.panelContentEl.appendChild(inputArea);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  createMessageEl(msg) {
    const el = utils.createElement("div", {
      className: `qmf-chat__msg qmf-chat__msg--${msg.status}`
    });
    el.innerHTML = `
      <div class="qmf-chat__msg-content">${this.escapeHtml(msg.content)}</div>
      <div class="qmf-chat__msg-meta">
        <span class="qmf-chat__msg-time">${utils.formatRelativeTime(new Date(msg.createdAt))}</span>
        ${msg.status === "seen" ? '<i class="fas fa-check-double qmf-chat__msg-seen"></i>' : ""}
      </div>
    `;
    return el;
  }
  appendMessageToView(msg) {
    const messagesEl = this.panelContentEl?.querySelector(".qmf-chat__messages");
    if (!messagesEl) return;
    messagesEl.appendChild(this.createMessageEl(msg));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  escapeHtml(str) {
    const div = utils.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
};
function createChatEmbed(container, config) {
  const chat = new QMFChat(config);
  chat.mount(container);
  return chat;
}
function createChatPlugin(config) {
  let instance = null;
  return {
    name: "chat-embed",
    version: "3.0.0",
    dependencies: ["auth-shell"],
    hooks: {
      onMount: () => {
        instance = new QMFChat(config);
        instance.mount("#qmf-chat");
      },
      onDestroy: () => instance?.destroy()
    },
    setup: (ctx) => {
      ctx.expose("instance", instance);
      ctx.expose("open", () => instance?.open());
      ctx.expose("close", () => instance?.close());
      ctx.expose("getUnreadCount", () => instance?.getUnreadCount());
    }
  };
}

exports.ChatConfigSchema = ChatConfigSchema;
exports.QMFChat = QMFChat;
exports.createChatEmbed = createChatEmbed;
exports.createChatPlugin = createChatPlugin;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map