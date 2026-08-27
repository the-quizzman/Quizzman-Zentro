/** Shared connection-status chrome for bell + hub. */

const STATUS_KEY = {
  live: "connLive",
  connecting: "connConnecting",
  reconnecting: "connReconnecting",
  paused: "connPaused",
  offline: "connOffline",
  error: "connError",
  idle: "connPaused",
};

export function connectionStatusOf(state) {
  if (state?.connectionStatus) return state.connectionStatus;
  return state?.connected ? "live" : "idle";
}

export function paintConnection(root, state, t) {
  if (!root) return;
  const status = connectionStatusOf(state);
  const labelEl = root.querySelector("[data-conn-label]");
  const btn = root.querySelector('[data-action="reconnect"]');
  const host = root.querySelector("[data-conn]") || root;
  host.dataset.status = status;
  if (labelEl) labelEl.textContent = t(STATUS_KEY[status] || "connError");
  if (btn) {
    const show = status !== "live" && status !== "connecting";
    btn.hidden = !show;
    btn.textContent = t("reconnect");
  }
}

export function connectionBarHtml(t) {
  return `
    <div class="lg-conn" data-conn data-status="idle">
      <span class="lg-conn-dot" aria-hidden="true"></span>
      <span class="lg-conn-label" data-conn-label>${escapeHtml(t("connConnecting"))}</span>
      <button type="button" class="lg-link lg-conn-retry" data-action="reconnect" hidden>${escapeHtml(t("reconnect"))}</button>
    </div>`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
