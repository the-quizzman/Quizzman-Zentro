import { createBus } from "./bus.js";

/**
 * Reactive notification store shared by components.
 */
export function createStore(bus) {
  const state = {
    items: [],
    unread: 0,
    loading: false,
    error: null,
    nextCursor: null,
    hasMore: false,
    connected: false,
    open: false,
  };

  const listeners = new Set();

  function notify() {
    const snap = { ...state, items: state.items.slice() };
    for (const l of listeners) l(snap);
    bus.emit("state", snap);
  }

  return {
    get() {
      return { ...state, items: state.items.slice() };
    },
    subscribe(fn) {
      listeners.add(fn);
      fn(this.get());
      return () => listeners.delete(fn);
    },
    set(partial) {
      Object.assign(state, partial);
      notify();
    },
    setItems(items, { nextCursor = null, hasMore = false } = {}) {
      state.items = items;
      state.nextCursor = nextCursor;
      state.hasMore = hasMore;
      notify();
    },
    prepend(item) {
      const id = item.receiver_id || item.notification_id || item.id;
      state.items = [
        item,
        ...state.items.filter(
          (x) => (x.receiver_id || x.notification_id || x.id) !== id
        ),
      ];
      notify();
    },
    markReadLocal(receiverId) {
      state.items = state.items.map((it) =>
        it.receiver_id === receiverId
          ? { ...it, read_at: it.read_at || new Date().toISOString() }
          : it
      );
      notify();
    },
    markAllReadLocal() {
      const now = new Date().toISOString();
      state.items = state.items.map((it) => ({
        ...it,
        read_at: it.read_at || now,
      }));
      state.unread = 0;
      notify();
    },
  };
}

export { createBus };
