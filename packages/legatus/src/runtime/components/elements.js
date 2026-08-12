/** Con dấu chữ Q — official Legatus / Quizzman seal icon */
import { applyTheme, ensureQuizFont, watchTheme } from "../core/theme.js";
import { openNotificationLink, resolveNotificationUrl } from "../core/deepLink.js";
import {
  bindNotificationList,
  bodyNeedsExpand,
  formatBodyHtml,
  notificationItemHtml,
} from "./item.js";

const BELL_SVG = `
<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M12 2.8 Q14.545 2.503 16.6 4.033 Q18.953 5.047 19.967 7.4 Q21.497 9.455 21.2 12 Q21.497 14.545 19.967 16.6 Q18.953 18.953 16.6 19.967 Q14.545 21.497 12 21.2 Q9.455 21.497 7.4 19.967 Q5.047 18.953 4.033 16.6 Q2.503 14.545 2.8 12 Q2.503 9.455 4.033 7.4 Q5.047 5.047 7.4 4.033 Q9.455 2.503 12 2.8 Z" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"/>
  <circle cx="12" cy="12" r="6.35" stroke="currentColor" stroke-width="1.05"/>
  <circle cx="12" cy="11.55" r="3.15" stroke="currentColor" stroke-width="1.55"/>
  <path d="M13.85 13.55 L16.15 16.05" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/>
</svg>`;

function isMobile() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches;
}

/**
 * @param {string} cssText
 * @param {import('../index.js').LegatusRuntime} runtime
 */
export function defineBell(cssText, runtime) {
  if (customElements.get("legatus-bell")) return;

  class LegatusBell extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._open = false;
      this._unsub = null;
      this._unsubLocale = null;
      this._onDoc = (e) => {
        if (!this._open) return;
        const path = e.composedPath();
        if (!path.includes(this)) this.close();
      };
      this._onKey = (e) => {
        if (e.key === "Escape") this.close();
      };
    }

    connectedCallback() {
      ensureQuizFont();
      this.render();
      this._unsub = runtime.store.subscribe((s) => this.sync(s));
      this._unsubLocale = runtime.bus.on("locale:change", () => {
        this.render();
        this.sync(runtime.store.get());
        if (this._open) this.open();
      });
      this._unsubTheme = watchTheme(() => this._syncTheme());
      runtime.ensureStarted();
      document.addEventListener("pointerdown", this._onDoc);
      document.addEventListener("keydown", this._onKey);
    }

    disconnectedCallback() {
      this._unsub?.();
      this._unsubLocale?.();
      this._unsubTheme?.();
      document.removeEventListener("pointerdown", this._onDoc);
      document.removeEventListener("keydown", this._onKey);
    }

    _syncTheme() {
      const root = this.shadowRoot?.querySelector(".lg-root");
      applyTheme(this, root);
    }

    render() {
      ensureQuizFont();
      const t = runtime.i18n.t.bind(runtime.i18n);
      const label = t("notifications");
      this.shadowRoot.innerHTML = `
        <style>${cssText}</style>
        <div class="lg-root lg-wrap">
          <button class="lg-bell" type="button" part="bell" aria-label="${escapeAttr(label)}" aria-expanded="false">
            ${BELL_SVG}
            <span class="lg-badge" hidden part="badge">0</span>
          </button>
          <div class="lg-panel" part="panel" data-open="false" role="dialog" aria-label="${escapeAttr(label)}">
            <div class="lg-panel-head">
              <h3 class="lg-panel-title">${escapeHtml(label)}</h3>
              <button class="lg-link" type="button" data-action="read-all">${escapeHtml(t("markAllRead"))}</button>
            </div>
            <div class="lg-list" data-list></div>
            <div class="lg-panel-foot">
              <button type="button" data-action="open-center">${escapeHtml(t("viewAll"))}</button>
            </div>
          </div>
          <div class="lg-sheet-backdrop" data-open="false" hidden aria-hidden="true"></div>
          <div class="lg-sheet" data-open="false" hidden aria-hidden="true" role="dialog" aria-label="${escapeAttr(label)}">
            <div class="lg-sheet-handle"></div>
            <div class="lg-panel-head">
              <h3 class="lg-panel-title">${escapeHtml(label)}</h3>
              <button class="lg-link" type="button" data-action="read-all">${escapeHtml(t("markAllRead"))}</button>
            </div>
            <div class="lg-list" data-list-mobile></div>
            <div class="lg-panel-foot">
              <button type="button" data-action="open-center">${escapeHtml(t("viewAll"))}</button>
            </div>
          </div>
        </div>
      `;
      this._syncTheme();

      const root = this.shadowRoot;
      root.querySelector(".lg-bell").addEventListener("click", () => this.toggle());
      root.querySelector(".lg-sheet-backdrop").addEventListener("click", () => this.close());
      root.querySelectorAll('[data-action="read-all"]').forEach((el) =>
        el.addEventListener("click", () => runtime.client.markAllRead().catch(() => {}))
      );
      root.querySelectorAll('[data-action="open-center"]').forEach((el) =>
        el.addEventListener("click", () => {
          this.close();
          runtime.openCenter();
        })
      );
    }

    sync(state) {
      const badge = this.shadowRoot.querySelector(".lg-badge");
      if (!badge) return;
      const n = Number(state.unread || 0);
      if (n > 0) {
        badge.hidden = false;
        badge.textContent = n > 99 ? "99+" : String(n);
      } else {
        badge.hidden = true;
      }
      this._paintLists(state);
    }

    _paintLists(state) {
      const html = this._listHtml(state);
      const desk = this.shadowRoot.querySelector("[data-list]");
      const mob = this.shadowRoot.querySelector("[data-list-mobile]");
      if (desk) desk.innerHTML = html;
      if (mob) mob.innerHTML = html;
      const onActivate = () => this.close();
      if (desk) bindNotificationList(desk, runtime, { onActivate });
      if (mob) bindNotificationList(mob, runtime, { onActivate });
    }

    _listHtml(state) {
      const t = runtime.i18n.t.bind(runtime.i18n);
      if (state.loading && !state.items.length) {
        return `<div class="lg-loading">${escapeHtml(t("loading"))}</div>`;
      }
      if (state.error && !state.items.length) {
        return `<div class="lg-error">${escapeHtml(state.error)}</div>`;
      }
      if (!state.items.length) {
        return `<div class="lg-empty">${escapeHtml(t("empty"))}</div>`;
      }
      return state.items
        .slice(0, 30)
        .map((it) => notificationItemHtml(it, runtime.i18n))
        .join("");
    }

    toggle() {
      if (this._open) this.close();
      else this.open();
    }

    async open() {
      this._open = true;
      this._syncTheme();
      const mobile = isMobile();
      const bell = this.shadowRoot.querySelector(".lg-bell");
      if (!bell) return;
      bell.setAttribute("aria-expanded", "true");
      if (mobile) {
        const sheet = this.shadowRoot.querySelector(".lg-sheet");
        const backdrop = this.shadowRoot.querySelector(".lg-sheet-backdrop");
        sheet.hidden = false;
        backdrop.hidden = false;
        sheet.dataset.open = "true";
        backdrop.dataset.open = "true";
        sheet.setAttribute("aria-hidden", "false");
        backdrop.setAttribute("aria-hidden", "false");
        this.shadowRoot.querySelector(".lg-panel").dataset.open = "false";
      } else {
        this.shadowRoot.querySelector(".lg-panel").dataset.open = "true";
        this.shadowRoot.querySelector(".lg-sheet").dataset.open = "false";
        this.shadowRoot.querySelector(".lg-sheet-backdrop").dataset.open = "false";
        this.shadowRoot.querySelector(".lg-sheet").hidden = true;
        this.shadowRoot.querySelector(".lg-sheet-backdrop").hidden = true;
        this.shadowRoot.querySelector(".lg-sheet").setAttribute("aria-hidden", "true");
        this.shadowRoot.querySelector(".lg-sheet-backdrop").setAttribute("aria-hidden", "true");
      }
      runtime.store.set({ open: true });
      try {
        await runtime.client.fetchNotifications();
        await runtime.client.fetchUnread();
      } catch {
        /* store has error */
      }
    }

    close() {
      this._open = false;
      this.shadowRoot.querySelector(".lg-bell")?.setAttribute("aria-expanded", "false");
      this.shadowRoot.querySelector(".lg-panel").dataset.open = "false";
      const sheet = this.shadowRoot.querySelector(".lg-sheet");
      const backdrop = this.shadowRoot.querySelector(".lg-sheet-backdrop");
      if (!sheet || !backdrop) return;
      sheet.dataset.open = "false";
      backdrop.dataset.open = "false";
      sheet.setAttribute("aria-hidden", "true");
      backdrop.setAttribute("aria-hidden", "true");
      const hide = () => {
        if (sheet.dataset.open === "false") {
          sheet.hidden = true;
          backdrop.hidden = true;
        }
      };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        hide();
      } else {
        window.setTimeout(hide, 260);
      }
      runtime.store.set({ open: false });
    }
  }

  customElements.define("legatus-bell", LegatusBell);
}

export function defineToastHost(cssText, runtime) {
  if (customElements.get("legatus-toasts")) return;

  class LegatusToasts extends HTMLElement {
    connectedCallback() {
      ensureQuizFont();
      this.attachShadow({ mode: "open" });
      const placement = this.getAttribute("placement") || "top-right";
      this.shadowRoot.innerHTML = `
        <style>${cssText}</style>
        <div class="lg-root lg-toasts" data-placement="${escapeAttr(placement)}"></div>
      `;
      this._syncTheme();
      this._unsubTheme = watchTheme(() => this._syncTheme());
      this._off = runtime.bus.on("toast", (payload) => this.push(payload));
    }

    disconnectedCallback() {
      this._off?.();
      this._unsubTheme?.();
    }

    _syncTheme() {
      const root = this.shadowRoot?.querySelector(".lg-root");
      applyTheme(this, root);
    }

    push(payload = {}) {
      const host = this.shadowRoot.querySelector(".lg-toasts");
      const el = document.createElement("div");
      el.className = "lg-toast";
      el.dataset.kind = payload.kind || "info";
      el.dataset.expanded = "false";
      const t = runtime.i18n.t.bind(runtime.i18n);
      const item = payload.item || null;
      const rawBody = payload.body || item?.body || "";
      const url = resolveNotificationUrl(item || payload);
      const canExpand = bodyNeedsExpand(rawBody);
      const openLabel = t("openLink");
      const linkHtml = url
        ? `<button class="lg-toast-open" type="button" data-action="open-link" title="${escapeAttr(openLabel)}" aria-label="${escapeAttr(openLabel)}"><svg class="lg-link-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path fill="currentColor" d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3zM5 5h6v2H7v10h10v-4h2v6H5V5z"/></svg></button>`
        : "";
      const expandHtml = canExpand
        ? `<button class="lg-toast-more" type="button" data-action="expand">${escapeHtml(t("readMore"))}</button>`
        : "";
      const bodyHtml = formatBodyHtml(rawBody, "lg-toast-body");
      el.innerHTML = `
        <p class="lg-toast-title">${escapeHtml(payload.title || item?.title || t("notice"))}${linkHtml}</p>
        <button type="button" class="lg-toast-dismiss" aria-label="${escapeAttr(t("dismiss"))}">✕</button>
        ${bodyHtml}
        ${expandHtml}
      `;

      let timer = null;
      const clearTimer = () => {
        if (timer) clearTimeout(timer);
        timer = null;
      };
      const scheduleRemove = (ms) => {
        clearTimer();
        timer = setTimeout(() => el.remove(), ms);
      };

      el.querySelector(".lg-toast-dismiss")?.addEventListener("click", () => {
        clearTimer();
        el.remove();
      });

      el.querySelector('[data-action="expand"]')?.addEventListener("click", () => {
        const expanded = el.dataset.expanded === "true";
        el.dataset.expanded = expanded ? "false" : "true";
        const btn = el.querySelector('[data-action="expand"]');
        if (btn) btn.textContent = t(expanded ? "readMore" : "readLess");
        // Keep open while reading the full message.
        if (!expanded) clearTimer();
        else scheduleRemove(Number(payload.ttl || 8000));
      });

      el.querySelector('[data-action="open-link"]')?.addEventListener("click", () => {
        openNotificationLink(runtime, item || payload, {
          receiverId: item?.receiver_id || payload.receiver_id || null,
        });
        clearTimer();
        el.remove();
      });

      // Pause auto-dismiss while hovering / focusing.
      el.addEventListener("mouseenter", clearTimer);
      el.addEventListener("mouseleave", () => {
        if (el.dataset.expanded !== "true") scheduleRemove(Number(payload.ttl || 8000));
      });

      host.appendChild(el);
      scheduleRemove(Number(payload.ttl || (canExpand ? 10000 : 6500)));
    }
  }

  customElements.define("legatus-toasts", LegatusToasts);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
