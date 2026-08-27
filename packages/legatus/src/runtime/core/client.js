/**
 * REST + live-push client for Legatus.
 *
 * Default transport is SSE (`GET /api/v1/stream`) — one HTTP stream, no
 * WebSocket. Browsers cannot receive webhooks; SSE is the HTTP analogue.
 * WebSocket is used only when `realtime: true` (rooms / presence) or when
 * SSE is unavailable. Hidden tabs drop the live socket and poll unread.
 */
export class LegatusClient {
  /**
   * @param {object} opts
   * @param {string} opts.endpoint
   * @param {(options?: {forceRefresh?: boolean}) => Promise<string|null>} opts.getToken
   * @param {import('./bus.js').createBus extends Function ? any : any} opts.bus
   * @param {ReturnType<import('./store.js').createStore>} opts.store
   * @param {'auto'|'sse'|'ws'|'poll'} [opts.transport]
   * @param {boolean} [opts.realtime]
   * @param {number} [opts.pauseHiddenMs]
   */
  constructor({ endpoint, getToken, bus, store, transport = "auto", realtime = false, pauseHiddenMs = 15000 }) {
    this.endpoint = endpoint.replace(/\/$/, "");
    this.getToken = getToken;
    this.bus = bus;
    this.store = store;
    this.preferredTransport = transport;
    this.realtime = !!realtime;
    this.pauseHiddenMs = Number(pauseHiddenMs) || 15000;

    this.ws = null;
    this._hb = null;
    this._reconnect = null;
    this._poll = null;
    this._hiddenTimer = null;
    this._sseAbort = null;
    this._closed = true;
    this._retries = 0;
    this._generation = 0;
    this._connectPromise = null;
    this._sseUnsupported = false;
    this._lifecycleBound = false;
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

  streamUrl() {
    const u = new URL(this.endpoint);
    u.pathname = "/api/v1/stream";
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
      if (err?.status !== 401) throw err;
      res = await execute(true);
    }
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

  /** Push UI locale to Legatus account prefs (source of truth for payload language). */
  async syncLocale(locale) {
    if (!locale) return null;
    try {
      return await this.request("/preferences", {
        method: "PATCH",
        body: JSON.stringify({ locale }),
      });
    } catch {
      return null;
    }
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

  /** Open the live channel (SSE by default). Idempotent. */
  async connect() {
    this._closed = false;
    this._bindLifecycle();
    return this._ensureLive();
  }

  /** User-initiated reconnect: reset backoff and open a single socket. */
  async reconnect() {
    this._retries = 0;
    this._closed = false;
    this._bindLifecycle();
    this._closeLive();
    return this._ensureLive({ force: true });
  }

  disconnect() {
    this._closed = true;
    this._retries = 0;
    this._stopTimers();
    this._closeLive();
    this._setConn({ status: "idle", connected: false, transport: null });
    this.bus.emit("disconnected");
  }

  _resolveTransport() {
    if (this.realtime || this.preferredTransport === "ws") return "ws";
    if (this.preferredTransport === "poll") return "poll";
    if (this.preferredTransport === "sse") return "sse";
    if (this._sseUnsupported) return "ws";
    return "sse";
  }

  _isLive() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return true;
    }
    return !!this._sseAbort;
  }

  _setConn(partial) {
    const connected = partial.connected ?? this.store.get().connected;
    const status = partial.status || (connected ? "live" : this.store.get().connectionStatus);
    this.store.set({
      connected: !!partial.connected,
      connectionStatus: status,
      transport: partial.transport !== undefined ? partial.transport : this.store.get().transport,
      ...(partial.error !== undefined ? { error: partial.error } : {}),
    });
    this.bus.emit("connection", this.store.get());
  }

  _bindLifecycle() {
    if (this._lifecycleBound || typeof window === "undefined") return;
    this._lifecycleBound = true;
    this._onVis = () => this._handleVisibility();
    this._onOnline = () => {
      if (!this._closed) this._ensureLive();
    };
    this._onOffline = () => {
      if (this._closed) return;
      this._closeLive();
      this._setConn({ status: "offline", connected: false });
    };
    this._onPageHide = () => {
      if (this._closed) return;
      this._enterPaused();
    };
    document.addEventListener("visibilitychange", this._onVis);
    window.addEventListener("online", this._onOnline);
    window.addEventListener("offline", this._onOffline);
    window.addEventListener("pagehide", this._onPageHide);
    window.addEventListener("freeze", this._onPageHide);
  }

  _handleVisibility() {
    if (this._closed) return;
    clearTimeout(this._hiddenTimer);
    if (typeof document !== "undefined" && document.hidden) {
      this._hiddenTimer = setTimeout(() => this._enterPaused(), this.pauseHiddenMs);
      return;
    }
    this._stopPoll();
    this._ensureLive();
  }

  _enterPaused() {
    if (this._closed) return;
    this._closeLive();
    this._setConn({ status: "paused", connected: false, transport: "poll" });
    this._startSlowPoll();
  }

  async _ensureLive({ force = false } = {}) {
    if (this._closed) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      this._setConn({ status: "offline", connected: false, transport: null });
      return;
    }
    if (typeof document !== "undefined" && document.hidden) {
      this._enterPaused();
      return;
    }
    if (!force && this._isLive()) return;
    if (!force && this._connectPromise) return this._connectPromise;

    this._stopPoll();
    const mode = this._resolveTransport();
    this._setConn({
      status: this._retries > 0 ? "reconnecting" : "connecting",
      connected: false,
      transport: mode,
      error: null,
    });

    this._connectPromise = (async () => {
      try {
        if (mode === "poll") {
          this._startSlowPoll();
          return;
        }
        if (mode === "ws") {
          await this._connectWs();
          return;
        }
        await this._connectSse();
      } finally {
        this._connectPromise = null;
      }
    })();
    return this._connectPromise;
  }

  async _connectSse() {
    const gen = ++this._generation;
    let token = await this.getToken();
    if (!token) token = await this.getToken({ forceRefresh: true });
    if (!token) {
      this._setConn({ status: "error", connected: false, error: "not authenticated" });
      return;
    }
    if (this._closed || gen !== this._generation) return;

    const ac = new AbortController();
    this._sseAbort = ac;
    let res;
    try {
      res = await fetch(this.streamUrl(), {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`,
        },
        signal: ac.signal,
        cache: "no-store",
      });
    } catch {
      if (ac.signal.aborted || this._closed || gen !== this._generation) return;
      this._sseAbort = null;
      this._scheduleReconnect();
      return;
    }

    if (res.status === 401) {
      token = await this.getToken({ forceRefresh: true });
      if (!token || this._closed || gen !== this._generation) {
        this._sseAbort = null;
        this._setConn({ status: "error", connected: false, error: "not authenticated" });
        return;
      }
      try {
        res = await fetch(this.streamUrl(), {
          method: "GET",
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${token}`,
          },
          signal: ac.signal,
          cache: "no-store",
        });
      } catch {
        if (ac.signal.aborted || this._closed || gen !== this._generation) return;
        this._sseAbort = null;
        this._scheduleReconnect();
        return;
      }
    }

    if (res.status === 404 || res.status === 405 || res.status === 501) {
      this._sseUnsupported = true;
      this._sseAbort = null;
      await this._connectWs();
      return;
    }

    if (!res.ok || !res.body) {
      this._sseAbort = null;
      this._setConn({
        status: "error",
        connected: false,
        error: res.statusText || `stream ${res.status}`,
      });
      this._scheduleReconnect();
      return;
    }

    this._retries = 0;
    this._setConn({ status: "live", connected: true, transport: "sse", error: null });
    this.bus.emit("connected", { transport: "sse" });
    try {
      await this.fetchUnread().catch(() => {});
    } catch {
      /* ignore */
    }

    try {
      await this._readSse(res.body, gen);
    } finally {
      if (this._sseAbort === ac) this._sseAbort = null;
      if (!this._closed && gen === this._generation && !documentHidden()) {
        this._setConn({ status: "reconnecting", connected: false, transport: "sse" });
        this.bus.emit("disconnected");
        this._scheduleReconnect();
      }
    }
  }

  async _readSse(body, gen) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done || this._closed || gen !== this._generation) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() || "";
      for (const block of parts) this._dispatchSseBlock(block);
    }
  }

  _dispatchSseBlock(block) {
    const dataLines = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
    }
    const raw = dataLines.join("\n").trim();
    if (!raw || raw === "keep-alive" || raw === ":") return;
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    this._onMessage(msg);
  }

  async _connectWs() {
    let token = await this.getToken();
    if (!token) token = await this.getToken({ forceRefresh: true });
    if (!token) {
      this._setConn({ status: "error", connected: false, error: "not authenticated" });
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
      this._setConn({ status: "live", connected: true, transport: "ws", error: null });
      this.bus.emit("connected", { transport: "ws" });
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
      if (this.ws === ws) this.ws = null;
      this._stopHeartbeat();
      if (this._closed) return;
      this._setConn({ status: "reconnecting", connected: false, transport: "ws" });
      this.bus.emit("disconnected");
      if (!documentHidden()) this._scheduleReconnect();
    };

    ws.onerror = () => {
      /* onclose handles reconnect */
    };
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this._hb = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "heartbeat" }));
      }
    }, 25000);
  }

  _stopHeartbeat() {
    if (this._hb) clearInterval(this._hb);
    this._hb = null;
  }

  _startSlowPoll() {
    this._stopPoll();
    const tick = () => {
      this.fetchUnread().catch(() => {});
    };
    tick();
    this._poll = setInterval(tick, 90000);
  }

  _stopPoll() {
    if (this._poll) clearInterval(this._poll);
    this._poll = null;
  }

  _scheduleReconnect() {
    if (this._closed) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      this._setConn({ status: "offline", connected: false });
      return;
    }
    if (documentHidden()) {
      this._enterPaused();
      return;
    }
    clearTimeout(this._reconnect);
    const cap = Math.min(30000, 1000 * 2 ** Math.min(this._retries, 5));
    const delay = Math.round(cap * (0.6 + Math.random() * 0.4));
    this._retries += 1;
    this._setConn({ status: "reconnecting", connected: false });
    this._reconnect = setTimeout(() => this._ensureLive(), delay);
  }

  _stopTimers() {
    clearTimeout(this._reconnect);
    clearTimeout(this._hiddenTimer);
    this._stopHeartbeat();
    this._stopPoll();
  }

  _closeLive() {
    this._generation += 1;
    if (this._sseAbort) {
      try {
        this._sseAbort.abort();
      } catch {
        /* ignore */
      }
      this._sseAbort = null;
    }
    this._stopHeartbeat();
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      try {
        ws.onclose = null;
        ws.close();
      } catch {
        /* ignore */
      }
    }
  }

  _onMessage(msg) {
    const type = msg?.type;
    if (type === "heartbeat.ack") return;

    if (type === "notification") {
      const notificationId = msg.notification_id || msg.id;
      const item = {
        receiver_id: msg.receiver_id || notificationId,
        notification_id: notificationId,
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

function documentHidden() {
  return typeof document !== "undefined" && document.hidden;
}
