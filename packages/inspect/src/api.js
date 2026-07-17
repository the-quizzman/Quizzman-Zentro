/**
 * Runtime inspect API (browser-safe).
 */
export function createInspectApi(getSnapshot) {
  return {
    modules: () => getSnapshot().modules ?? [],
    events: (filter) => {
      const all = getSnapshot().events ?? [];
      if (!filter) return all;
      if (filter.endsWith('.*')) {
        const p = filter.slice(0, -1);
        return all.filter((e) => (e.name ?? e).startsWith(p));
      }
      return all.filter((e) => (e.name ?? e) === filter);
    },
    services: () => getSnapshot().services ?? [],
    state: (moduleId) => {
      const s = getSnapshot().state ?? {};
      return moduleId ? s[moduleId] : s;
    },
    routes: () => getSnapshot().routes ?? [],
    plugins: () => getSnapshot().plugins ?? [],
    config: (moduleId) => {
      const c = getSnapshot().config ?? {};
      return moduleId ? c[moduleId] : c;
    },
    graph: () => getSnapshot().graph ?? { modules: [], events: [] },
    contract: () => getSnapshot().contract ?? null,
    summary() {
      const snap = getSnapshot();
      const mods = (snap.modules ?? []).map((m) => m.id ?? m.name).join(', ');
      const ev = (snap.events ?? []).map((e) => e.name ?? e).join(', ');
      return `QMF inspect: modules=[${mods}] events=[${ev}]`;
    },
    toJSON() {
      return getSnapshot();
    },
  };
}
