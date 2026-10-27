import { activityKind, activityLabel } from "../core/activity.js";
import { bindNotificationList, notificationItemHtml, mascotHtml } from "./item.js";

const PAGE_SIZE = 10;
const FILTERS = ["all", "unread", "learning", "library", "updates"];
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function dateGroup(iso, now = new Date()) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "earlier";
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  return date >= today ? "today" : date >= yesterday ? "yesterday" : "earlier";
}

/** One controller per bell/hub. Desktop and mobile share the same filter and page. */
export class InboxView {
  constructor(runtime, onChange, onActivate) {
    this.runtime = runtime;
    this.onChange = onChange;
    this.onActivate = onActivate;
    this.filter = "all";
    this.page = 0;
    this.pending = false;
  }

  reset() { this.page = 0; }

  matching(state) {
    return state.items.filter((it) => this.filter === "all" || (this.filter === "unread" ? !it.read_at : activityKind(it) === this.filter));
  }

  async next() {
    if (this.pending) return;
    let state = this.runtime.store.get();
    if ((this.page + 1) * PAGE_SIZE < this.matching(state).length) {
      this.page += 1;
      this.onChange();
      return;
    }
    if (!state.hasMore || !state.nextCursor || state.loading) return;
    this.pending = true;
    const filter = this.filter;
    const page = this.page;
    this.onChange();
    try {
      await this.runtime.client.fetchNotifications({ cursor: state.nextCursor, limit: 20 });
      state = this.runtime.store.get();
      if (this.filter === filter && this.page === page && (page + 1) * PAGE_SIZE < this.matching(state).length) this.page += 1;
    } catch { /* The error and retry control are rendered alongside the existing rows. */ }
    finally { this.pending = false; this.onChange(); }
  }

  paint(root, state) {
    if (!root) return;
    const t = this.runtime.i18n.t.bind(this.runtime.i18n);
    const matching = this.matching(state);
    this.page = Math.min(this.page, Math.max(0, Math.ceil(matching.length / PAGE_SIZE) - 1));
    const start = this.page * PAGE_SIZE;
    const visible = matching.slice(start, start + PAGE_SIZE);
    const busy = state.loading || this.pending;
    const cachedNext = start + PAGE_SIZE < matching.length;
    const canFetch = state.hasMore && state.nextCursor;
    const active = root.getRootNode().activeElement;
    const focus = active && root.contains(active) ? active.getAttribute("data-feed-action") : null;
    const scroll = root.scrollTop;
    const filters = FILTERS.map((key) => {
      const label = key === "all" ? "filterAll" : key === "unread" ? "filterUnread" : activityLabel[key];
      return `<button type="button" class="lg-filter" data-feed-action="${key}" aria-pressed="${this.filter === key}">${esc(t(label))}</button>`;
    }).join("");
    const groups = new Map();
    for (const item of visible) {
      const key = dateGroup(item.created_at);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    const rows = [...groups].map(([key, items]) => `<section class="lg-feed-group"><h4 class="lg-feed-heading">${esc(t(key))}</h4>${items.map((item) => notificationItemHtml(item, this.runtime.i18n)).join("")}</section>`).join("");
    const empty = `<div class="lg-empty lg-inbox-empty">${mascotHtml("owl")}<span>${esc(t(busy ? "loading" : state.error ? "feedError" : canFetch ? "emptyLoaded" : "emptyFilter"))}</span></div>`;
    root.innerHTML = `<div class="lg-filters" role="group" aria-label="${esc(t("filterNotifications"))}">${filters}</div>
      <div class="lg-feed-rows" aria-busy="${busy}">${rows || empty}</div>
      ${state.error ? `<div class="lg-feed-error" role="alert">${esc(t("feedError"))}<button type="button" data-feed-action="retry">${esc(t("retry"))}</button></div>` : ""}
      <nav class="lg-pagination" aria-label="${esc(t("pagination"))}">
        <button type="button" data-feed-action="previous" ${this.page === 0 || busy ? "disabled" : ""}>‹ ${esc(t("previousPage"))}</button>
        <span role="status" aria-live="polite">${esc(t("page"))} ${this.page + 1}<small>${matching.length ? `${start + 1}–${Math.min(start + PAGE_SIZE, matching.length)} / ${matching.length}${state.hasMore ? "+" : ""}` : "0"}</small></span>
        <button type="button" data-feed-action="next" ${(!cachedNext && !canFetch) || busy ? "disabled" : ""}>${esc(t(busy ? "loading" : cachedNext ? "nextPage" : canFetch ? "loadMore" : "nextPage"))} ›</button>
      </nav>`;
    root.querySelectorAll("[data-feed-action]").forEach((button) => button.addEventListener("click", async () => {
      const action = button.dataset.feedAction;
      if (FILTERS.includes(action)) { this.filter = action; this.page = 0; this.onChange(); }
      else if (action === "previous") { this.page = Math.max(0, this.page - 1); this.onChange(); }
      else if (action === "next") await this.next();
      else if (action === "retry" && !this.runtime.store.get().loading) {
        try {
          const current = this.runtime.store.get();
          await this.runtime.client.fetchNotifications(current.items.length && current.nextCursor ? { cursor: current.nextCursor } : {});
        } catch { /* Keep retry available. */ }
      }
    }));
    bindNotificationList(root, this.runtime, { onActivate: this.onActivate });
    root.scrollTop = scroll;
    if (focus) root.querySelector(`[data-feed-action="${focus}"]`)?.focus({ preventScroll: true });
  }
}
