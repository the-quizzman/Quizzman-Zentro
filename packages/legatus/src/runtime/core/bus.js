/** Tiny typed event bus for Legatus client. */
export function createBus() {
  const map = new Map();

  return {
    on(type, handler) {
      if (!map.has(type)) map.set(type, new Set());
      map.get(type).add(handler);
      return () => map.get(type)?.delete(handler);
    },
    off(type, handler) {
      map.get(type)?.delete(handler);
    },
    emit(type, detail) {
      const set = map.get(type);
      if (!set) return;
      for (const h of [...set]) {
        try {
          h(detail);
        } catch (err) {
          console.error("[Legatus] listener error", type, err);
        }
      }
    },
  };
}
