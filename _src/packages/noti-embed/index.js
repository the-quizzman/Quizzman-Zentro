import { z, validateConfig, getGlobalEventBus } from '@qmf/core';
import { createEventEmitter, createLogger, mountComponent, safeFetch, resolveToken, createElement, formatRelativeTime } from '@qmf/utils';
import { createToast } from '@qmf/ui';

// src/index.ts
var NotiConfigSchema = z.object({
  wsUrl: z.string().url().default("wss://noti.quizzman.com/ws"),
  apiUrl: z.string().url().default("https://noti.quizzman.com/api"),
  // Auth
  getToken: z.function().optional(),
  // Categories
  categories: z.array(z.object({
    key: z.string(),
    label: z.string(),
    icon: z.string().optional()
  })).default([
    { key: "all", label: "T\u1EA5t c\u1EA3", icon: "fas fa-globe" },
    { key: "system", label: "H\u1EC7 th\u1ED1ng", icon: "fas fa-cog" },
    { key: "social", label: "X\xE3 h\u1ED9i", icon: "fas fa-users" },
    { key: "academic", label: "H\u1ECDc t\u1EADp", icon: "fas fa-graduation-cap" }
  ]),
  // Sound
  soundEnabled: z.boolean().default(true),
  soundUrl: z.string().optional(),
  // Toast notifications for push
  showToastOnPush: z.boolean().default(true),
  // How many to fetch per page
  pageSize: z.number().default(20),
  // Reconnect
  reconnectAttempts: z.number().default(5),
  reconnectDelay: z.number().default(3e3),
  debug: z.boolean().default(false)
});
var QMFNotiEmbed = class {
  constructor(config = {}) {
    this.emitter = createEventEmitter();
    this.ws = null;
    this.reconnectCount = 0;
    this.reconnectTimer = null;
    this.containerEl = null;
    this.panelEl = null;
    this.listEl = null;
    this.cleanup = null;
    this.notifications = [];
    this.activeCategory = "all";
    this.totalUnread = 0;
    this.isOpen = false;
    this.page = 1;
    this.hasMore = true;
    this.loading = false;
    this.soundAudio = null;
    this.config = validateConfig(NotiConfigSchema, config, "NotiEmbed");
    this.logger = createLogger("NotiEmbed", this.config.debug ? "debug" : "warn");
    if (this.config.soundEnabled) {
      this.soundAudio = new Audio(this.config.soundUrl || "/assets/sounds/notification.mp3");
      this.soundAudio.volume = 0.4;
    }
  }
  // ─── Public API ─────────────────────────────────────────
  mount(container) {
    this.cleanup = mountComponent(container, (el) => {
      this.containerEl = el;
      this.renderPanel();
      this.connect();
      this.fetchNotifications();
      this.logger.debug("NotiEmbed mounted");
      return () => this.destroy();
    });
  }
  open() {
    if (!this.panelEl) return;
    this.isOpen = true;
    this.panelEl.classList.add("qmf-noti--open");
    this.emitter.emit("open");
  }
  close() {
    if (!this.panelEl) return;
    this.isOpen = false;
    this.panelEl.classList.remove("qmf-noti--open");
    this.emitter.emit("close");
  }
  toggle() {
    this.isOpen ? this.close() : this.open();
  }
  getUnreadCount() {
    return this.totalUnread;
  }
  async markAsRead(notificationId) {
    const token = this.getAuthToken();
    if (!token) return;
    await safeFetch(`${this.config.apiUrl}/notifications/${notificationId}/read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    });
    const noti = this.notifications.find((n) => n.id === notificationId);
    if (noti && !noti.isRead) {
      noti.isRead = true;
      this.totalUnread = Math.max(0, this.totalUnread - 1);
      this.broadcastUnread();
      this.renderList();
    }
  }
  async markAllAsRead() {
    const token = this.getAuthToken();
    if (!token) return;
    await safeFetch(`${this.config.apiUrl}/notifications/read-all`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    });
    for (const n of this.notifications) n.isRead = true;
    this.totalUnread = 0;
    this.broadcastUnread();
    this.renderList();
  }
  on(event, cb) {
    return this.emitter.on(event, cb);
  }
  destroy() {
    this.disconnect();
    this.panelEl?.remove();
    this.emitter.clear();
    if (this.cleanup) this.cleanup();
    this.containerEl = null;
  }
  // ─── Auth Helpers ───────────────────────────────────────
  getAuthToken() {
    return this.config.getToken ? this.config.getToken() : resolveToken();
  }
  // ─── WebSocket ──────────────────────────────────────────
  connect() {
    const token = this.getAuthToken();
    if (!token) {
      this.logger.warn("No auth token, skipping WebSocket");
      return;
    }
    try {
      this.ws = new WebSocket(`${this.config.wsUrl}?token=${token}`);
      this.ws.addEventListener("open", () => {
        this.logger.debug("WS connected");
        this.reconnectCount = 0;
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
        this.scheduleReconnect();
      });
      this.ws.addEventListener("error", (e) => {
        this.logger.error("WS error", e);
      });
    } catch (e) {
      this.logger.error("WS connection failed", e);
      this.scheduleReconnect();
    }
  }
  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
  scheduleReconnect() {
    if (this.reconnectCount >= this.config.reconnectAttempts) return;
    this.reconnectCount++;
    const delay = this.config.reconnectDelay * this.reconnectCount;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
  handleWsMessage(data) {
    switch (data.type) {
      case "notification:new": {
        const noti = data.payload;
        this.onNewNotification(noti);
        break;
      }
      case "notification:read": {
        const { id } = data.payload;
        const n = this.notifications.find((x) => x.id === id);
        if (n) n.isRead = true;
        this.recalcUnread();
        this.renderList();
        break;
      }
    }
  }
  onNewNotification(noti) {
    this.notifications.unshift(noti);
    if (!noti.isRead) {
      this.totalUnread++;
      this.broadcastUnread();
    }
    if (this.config.showToastOnPush) {
      createToast({
        message: noti.title,
        variant: "info",
        position: "top-right",
        duration: 5e3
      });
    }
    if (this.config.soundEnabled && this.soundAudio) {
      this.soundAudio.currentTime = 0;
      this.soundAudio.play().catch(() => {
      });
    }
    this.renderList();
    this.emitter.emit("notification:new", noti);
  }
  recalcUnread() {
    this.totalUnread = this.notifications.filter((n) => !n.isRead).length;
    this.broadcastUnread();
  }
  broadcastUnread() {
    getGlobalEventBus().emit("noti:unread", this.totalUnread);
  }
  // ─── API ────────────────────────────────────────────────
  async fetchNotifications() {
    const token = this.getAuthToken();
    if (!token) return;
    if (this.loading) return;
    this.loading = true;
    const category = this.activeCategory === "all" ? "" : `&category=${this.activeCategory}`;
    const result = await safeFetch(
      `${this.config.apiUrl}/notifications?page=${this.page}&limit=${this.config.pageSize}${category}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    this.loading = false;
    if (result.ok && result.data) {
      const { data, total } = result.data;
      if (this.page === 1) {
        this.notifications = data;
      } else {
        this.notifications.push(...data);
      }
      this.hasMore = this.notifications.length < total;
      this.recalcUnread();
      this.renderList();
    }
  }
  // ─── Render ─────────────────────────────────────────────
  renderPanel() {
    if (!this.containerEl) return;
    this.panelEl = createElement("div", { className: "qmf-noti" });
    const header = createElement("div", { className: "qmf-noti__header" });
    header.innerHTML = `
      <h3 class="qmf-noti__title">Th\xF4ng b\xE1o</h3>
      <button class="qmf-noti__mark-all" type="button">\u0110\xE1nh d\u1EA5u \u0111\xE3 \u0111\u1ECDc t\u1EA5t c\u1EA3</button>
    `;
    header.querySelector(".qmf-noti__mark-all")?.addEventListener("click", () => this.markAllAsRead());
    this.panelEl.appendChild(header);
    const tabs = createElement("div", { className: "qmf-noti__tabs" });
    for (const cat of this.config.categories) {
      const tab = createElement("button", {
        className: `qmf-noti__tab${cat.key === this.activeCategory ? " qmf-noti__tab--active" : ""}`,
        type: "button",
        "data-category": cat.key
      });
      if (cat.icon) tab.innerHTML = `<i class="${cat.icon}"></i> `;
      tab.appendChild(document.createTextNode(cat.label));
      tab.addEventListener("click", () => {
        this.activeCategory = cat.key;
        this.page = 1;
        this.hasMore = true;
        tabs.querySelectorAll(".qmf-noti__tab").forEach((t) => t.classList.remove("qmf-noti__tab--active"));
        tab.classList.add("qmf-noti__tab--active");
        this.fetchNotifications();
      });
      tabs.appendChild(tab);
    }
    this.panelEl.appendChild(tabs);
    this.listEl = createElement("div", { className: "qmf-noti__list" });
    this.listEl.addEventListener("scroll", () => {
      if (!this.hasMore || this.loading) return;
      const el = this.listEl;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
        this.page++;
        this.fetchNotifications();
      }
    });
    this.panelEl.appendChild(this.listEl);
    document.addEventListener("click", (e) => {
      if (this.isOpen && !this.panelEl?.contains(e.target)) {
        this.close();
      }
    });
    this.containerEl.appendChild(this.panelEl);
  }
  renderList() {
    if (!this.listEl) return;
    this.listEl.innerHTML = "";
    const filtered = this.activeCategory === "all" ? this.notifications : this.notifications.filter((n) => n.category === this.activeCategory);
    if (filtered.length === 0) {
      this.listEl.innerHTML = '<div class="qmf-noti__empty">Kh\xF4ng c\xF3 th\xF4ng b\xE1o n\xE0o</div>';
      return;
    }
    for (const noti of filtered) {
      const item = createElement("div", {
        className: `qmf-noti__item${noti.isRead ? "" : " qmf-noti__item--unread"}`
      });
      item.innerHTML = `
        <div class="qmf-noti__item-icon">
          <i class="${noti.icon || "fas fa-bell"}"></i>
        </div>
        <div class="qmf-noti__item-body">
          <div class="qmf-noti__item-title">${this.escapeHtml(noti.title)}</div>
          <div class="qmf-noti__item-text">${this.escapeHtml(noti.body)}</div>
          <div class="qmf-noti__item-time">${formatRelativeTime(new Date(noti.createdAt))}</div>
        </div>
        ${!noti.isRead ? '<div class="qmf-noti__item-dot"></div>' : ""}
      `;
      item.addEventListener("click", () => {
        this.markAsRead(noti.id);
        if (noti.link) window.location.href = noti.link;
        this.emitter.emit("notification:click", noti);
      });
      this.listEl.appendChild(item);
    }
    if (this.loading) {
      this.listEl.innerHTML += '<div class="qmf-noti__loading">\u0110ang t\u1EA3i...</div>';
    }
  }
  escapeHtml(str) {
    const div = createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
};
function createNotiEmbed(container, config) {
  const noti = new QMFNotiEmbed(config);
  noti.mount(container);
  return noti;
}
function createNotiPlugin(config) {
  let instance = null;
  return {
    name: "noti-embed",
    version: "3.0.0",
    dependencies: ["auth-shell"],
    hooks: {
      onMount: () => {
        instance = new QMFNotiEmbed(config);
        instance.mount("#qmf-notifications");
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

export { NotiConfigSchema, QMFNotiEmbed, createNotiEmbed, createNotiPlugin };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map