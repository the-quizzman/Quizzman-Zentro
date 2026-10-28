const ORIGIN = 'https://legatus.quizzman.com';
const KEY = Symbol.for('quizzman.legatus.shared.v1');

/** A private MessagePort connects this document to the first-party broker iframe. */
class SharedTransport {
  constructor() {
    this.clients = new Set();
    this.pending = new Map();
    this.nextId = 0;
    this.identity = undefined;
    this.ready = null;
    this.port = null;
    this.frame = null;
    this.disabled = false;
  }

  async ensure() {
    if (typeof MessageChannel === 'undefined') {
      this.disabled = true;
      this.notifyConnection({ status: 'error', connected: false, transport: 'shared-sse', error: 'Shared connection unsupported' });
    }
    if (this.disabled) throw Object.assign(new Error('Shared connection unavailable'), { status: 503 });
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      const frame = document.createElement('iframe');
      frame.hidden = true;
      frame.setAttribute('aria-hidden', 'true');
      frame.setAttribute('title', 'Legatus connection');
      frame.src = `${ORIGIN}/bridge/`;
      frame.referrerPolicy = 'origin';
      this.frame = frame;
      const channel = new MessageChannel();
      this.port = channel.port1;
      const fail = reason => {
        clearTimeout(timeout);
        this.disabled = true;
        this.port?.close();
        frame.remove();
        const error = Object.assign(new Error(reason), { status: 503 });
        for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
        this.pending.clear();
        reject(error);
        this.notifyConnection({ status: 'error', connected: false, transport: 'shared-sse', error: reason });
      };
      const timeout = setTimeout(() => fail('Shared connection timed out'), 12000);
      this.port.onmessage = event => {
        const message = event.data;
        if (message?.type === 'ready' && message.protocol === 1) {
          clearTimeout(timeout); resolve(); this.state();
        } else if (message?.type === 'unavailable') fail(message.reason || 'Shared connection unavailable');
        else this.receive(message);
      };
      this.port.start();
      frame.addEventListener('load', () => {
        frame.contentWindow?.postMessage({ type: 'legatus:attach', protocol: 1 }, ORIGIN, [channel.port2]);
      }, { once: true });
      frame.addEventListener('error', () => fail('Shared connection blocked'), { once: true });
      document.documentElement.appendChild(frame);
    });
    this.ready.catch(() => {});
    return this.ready;
  }

  state() {
    if (!this.port || this.disabled) return;
    const enabled = [...this.clients].some(client => !client._closed);
    this.port.postMessage({ type: 'state', enabled, visible: !document.hidden });
  }

  attach(client) {
    this.clients.add(client);
    if (!this.lifecycle) {
      this.lifecycle = true;
      document.addEventListener('visibilitychange', () => this.state());
      window.addEventListener('pageshow', () => { void this.ensure().then(() => this.state()).catch(() => {}); });
      window.addEventListener('online', () => this.state());
      window.addEventListener('qmf:auth-logout', () => this.authChanged(true));
      window.addEventListener('qmf:auth-ready', () => this.authChanged());
      window.addEventListener('idsys:ready', () => this.authChanged());
      window.addEventListener('pagehide', () => {
        this.port?.postMessage({ type: 'detach' });
        this.port?.close(); this.port = null;
        this.frame?.remove(); this.frame = null; this.ready = null;
        for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new Error('Page suspended')); }
        this.pending.clear();
      });
      this.ping = setInterval(() => {
        if (!this.disabled && this.port) this.port.postMessage({ type: 'ping' });
      }, 30000);
    }
    return this.ensure().then(() => this.state());
  }

  authChanged(logout = false) {
    this.port?.postMessage({ type: 'auth-changed', logout });
  }

  notifyConnection(message) {
    for (const client of this.clients) if (!client._closed) client._setConn(message);
  }

  receive(message) {
    if (!message || typeof message !== 'object') return;
    if (message.type === 'result') {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id); clearTimeout(pending.timer);
      if (message.error) pending.reject(Object.assign(new Error(message.error), { status: message.status }));
      else pending.resolve(message.data);
      return;
    }
    if (message.type === 'auth-required') {
      const client = [...this.clients].find(client => !client._closed);
      if (client) void client.getToken({ forceRefresh: true }).then(() => this.authChanged()).catch(() => {});
      return;
    }
    if (message.type === 'connection') {
      this.notifyConnection(message);
      return;
    }
    if (message.type === 'identity') {
      if (message.userId !== this.identity) {
        this.identity = message.userId;
        for (const client of this.clients) {
          client.store.setItems([]);
          client.store.set({ unread: 0, error: null });
          client.bus.emit('identity', { userId: message.userId });
        }
      }
      return;
    }
    for (const client of this.clients) {
      if (client._closed) continue;
      if (message.type === 'frame') client._onMessage(message.frame);
      else if (message.type === 'unread') {
        client.store.set({ unread: Number(message.count) || 0 });
        client.bus.emit('unread', message.count);
      } else if (message.type === 'read') {
        if (message.all) client.store.markAllReadLocal();
        else {
          const item = client.store.get().items.find(item => item.receiver_id === message.receiverId);
          if (item && !item.read_at) {
            client.store.markReadLocal(message.receiverId);
            client.store.set({ unread: Math.max(0, client.store.get().unread - 1) });
          }
        }
        client.bus.emit('read-sync', message);
      } else if (message.type === 'resync' && client.store.get().items.length) {
        void client.fetchNotifications({ limit: 20 }).catch(() => {});
      }
    }
  }

  async request(client, path, options) {
    this.clients.add(client);
    await this.attach(client);
    if (this.pending.size >= 16) throw Object.assign(new Error('Too many pending requests'), { status: 429 });
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(Object.assign(new Error('Legatus request timed out'), { status: 503 }));
      }, 25000);
      this.pending.set(id, { resolve, reject, timer });
      this.port.postMessage({ type: 'request', id, path, options: { method: options.method || 'GET', body: options.body } });
    });
  }
}

export function sharedTransport(endpoint) {
  if (typeof window === 'undefined' || new URL(endpoint).origin !== ORIGIN) return null;
  return window[KEY] ||= new SharedTransport();
}
