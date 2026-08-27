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
    connectionStatus: "idle",
    transport: null,
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
      state.error = null;
      notify();
    },
    prepend(item) {
      const rid = item.receiver_id != null ? String(item.receiver_id) : "";
      const nid = item.notification_id != null
        ? String(item.notification_id)
        : item.id != null
          ? String(item.id)
          : "";
      state.items = [
        item,
        ...state.items.filter((x) => {
          const xRid = x.receiver_id != null ? String(x.receiver_id) : "";
          const xNid =
            x.notification_id != null
              ? String(x.notification_id)
              : x.id != null
                ? String(x.id)
                : "";
          if (rid && xRid && xRid === rid) return false;
          if (nid && xNid && xNid === nid) return false;
          // WS upsert may temporarily use notification id as receiver_id
          if (nid && xRid && xRid === nid) return false;
          if (rid && xNid && xNid === rid) return false;
          return true;
        }),
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
