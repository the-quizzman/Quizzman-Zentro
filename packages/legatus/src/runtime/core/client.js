/**
 * REST + WebSocket client for Legatus API.
 */
export class LegatusClient {
  /**
   * @param {object} opts
   * @param {string} opts.endpoint
   * @param {(options?: {forceRefresh?: boolean}) => Promise<string|null>} opts.getToken
   * @param {import('./bus.js').createBus extends Function ? any : any} opts.bus
   * @param {ReturnType<import('./store.js').createStore>} opts.store
   */
  constructor({ endpoint, getToken, bus, store }) {
    this.endpoint = endpoint.replace(/\/$/, "");
    this.getToken = getToken;
    this.bus = bus;
    this.store = store;
    this.ws = null;
    this._hb = null;
    this._reconnect = null;
    this._closed = false;
    this._retries = 0;
  }

  apiUrl(path) {
    return `${this.endpoint}/api/v1${path}`;
  }

  wsUrl() {
    const u = new URL(this.endpoint);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = "/api/v1/ws";
    u.search = "";
    return u.toString();
  }

  async headers(forceRefresh = false) {
    const token = await this.getToken({ forceRefresh });
    const h = { Accept: "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  async request(path, options = {}) {
    const execute = async (forceRefresh = false) => {
      const authHeaders = await this.headers(forceRefresh);
      if (!authHeaders.Authorization) {
        const err = new Error("not authenticated");
        err.status = 401;
        err.code = "TOKEN_MISSING";
        throw err;
      }
      return fetch(this.apiUrl(path), {
        ...options,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...authHeaders,
          ...(options.headers || {}),
        },
      });
    };

    let res;
    try {
      res = await execute(false);
    } catch (err) {
      // The visible UI can already be authenticated through an HttpOnly
      // IdSys session while no access token is readable by JavaScript yet.
      // Force-refresh once before surfacing a false "not authenticated".
      if (err?.status !== 401) throw err;
      res = await execute(true);
    }
    // Match Quizzman SSO semantics: refresh the short-lived access token
    // through IdSys, then retry the API request exactly once.
    if (res.status === 401) {
      res = await execute(true);
    }
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const body = await res.json();
        msg = body.message || msg;
      } catch {
        /* ignore */
      }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async fetchUnread() {
    const data = await this.request("/notifications/unread-count");
    this.store.set({ unread: Number(data.count || 0) });
    this.bus.emit("unread", data.count);
    return data.count;
  }

  async fetchNotifications({ cursor, limit = 20 } = {}) {
    this.store.set({ loading: true, error: null });
    try {
      const q = new URLSearchParams({ limit: String(limit) });
      if (cursor) q.set("cursor", cursor);
      const data = await this.request(`/notifications?${q}`);
      if (cursor) {
        this.store.setItems([...this.store.get().items, ...(data.items || [])], {
          nextCursor: data.next_cursor || null,
          hasMore: !!data.has_more,
        });
      } else {
        this.store.setItems(data.items || [], {
          nextCursor: data.next_cursor || null,
          hasMore: !!data.has_more,
        });
      }
      return data;
    } catch (err) {
      this.store.set({ error: err.message || String(err) });
      throw err;
    } finally {
      this.store.set({ loading: false });
    }
  }

  async markRead(receiverId) {
    await this.request(`/notifications/${receiverId}/read`, { method: "POST" });
    this.store.markReadLocal(receiverId);
    const unread = Math.max(0, this.store.get().unread - 1);
    this.store.set({ unread });
    this.bus.emit("read", { receiverId });
  }

  async markAllRead() {
    const data = await this.request("/notifications/read-all", { method: "POST" });
    this.store.markAllReadLocal();
    this.bus.emit("read-all", data);
    return data;
  }

  async connect() {
    this._closed = false;
    let token = await this.getToken();
    if (!token) token = await this.getToken({ forceRefresh: true });
    if (!token) {
      this.store.set({ connected: false, error: "not authenticated" });
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = `${this.wsUrl()}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this._retries = 0;
      this.store.set({ connected: true, error: null });
      this.bus.emit("connected");
      this._startHeartbeat();
    };

    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      this._onMessage(msg);
    };

    ws.onclose = () => {
      this.store.set({ connected: false });
      this.bus.emit("disconnected");
      this._stopHeartbeat();
      if (!this._closed) this._scheduleReconnect();
    };

    ws.onerror = () => {
      /* onclose handles reconnect */
    };
  }

  disconnect() {
    this._closed = true;
    this._stopHeartbeat();
    clearTimeout(this._reconnect);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
    }
    this.ws = null;
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this._hb = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "heartbeat" }));
      }
    }, 20000);
  }

  _stopHeartbeat() {
    if (this._hb) clearInterval(this._hb);
    this._hb = null;
  }

  _scheduleReconnect() {
    clearTimeout(this._reconnect);
    const delay = Math.min(15000, 800 * 2 ** this._retries);
    this._retries += 1;
    this._reconnect = setTimeout(() => this.connect(), delay);
  }

  _onMessage(msg) {
    const type = msg?.type;
    if (type === "heartbeat.ack") return;

    if (type === "notification") {
      const item = {
        receiver_id: msg.receiver_id || msg.id,
        notification_id: msg.id || msg.notification_id,
        title: msg.title || "Notification",
        body: msg.body || "",
        data: msg.data || {},
        channel: msg.channel || "realtime",
        read_at: null,
        created_at: msg.created_at || new Date().toISOString(),
      };
      this.store.prepend(item);
      this.store.set({ unread: this.store.get().unread + 1 });
      this.bus.emit("notification", item);
      return;
    }

    if (type === "event") {
      this.bus.emit("event", msg);
      return;
    }

    if (type === "error") {
      this.bus.emit("error", msg);
      return;
    }

    this.bus.emit("message", msg);
  }
}
