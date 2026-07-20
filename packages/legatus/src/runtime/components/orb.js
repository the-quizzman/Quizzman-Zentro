/**
 * Floating Orb — mobile-only entry to Legatus Communication Hub.
 * States: idle | attention | thinking | speaking | open
 */

import { applyTheme, ensureQuizFont, watchTheme } from "../core/theme.js";

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

/**
 * @param {string} cssText
 * @param {import('../index.js').LegatusRuntime} runtime
 */
export function defineOrb(cssText, runtime) {
  if (customElements.get("legatus-orb")) return;

  class LegatusOrb extends HTMLElement {
    constructor() {
      super();
      this._unsub = null;
      this._offBus = [];
      this._state = "idle";
      this._mq = null;
      this._onMq = () => this._syncVisibility();
    }

    connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this.setAttribute("data-role", "orb");
      ensureQuizFont();
      this.render();
      this._unsub = runtime.store.subscribe((s) => this.sync(s));
      this._offBus.push(
        runtime.bus.on("orb:state", (detail) => {
          const next = detail?.state;
          if (!next) {
            this._setState(Number(runtime.store.get().unread || 0) > 0 ? "attention" : "idle");
          } else {
            this._setState(next);
          }
        })
      );
      this._offBus.push(runtime.bus.on("hub:open", () => this._setState("open")));
      this._offBus.push(
        runtime.bus.on("hub:close", () => {
          this._setState(Number(runtime.store.get().unread || 0) > 0 ? "attention" : "idle");
        })
      );
      this._offBus.push(
        runtime.bus.on("locale:change", () => {
          this.render();
          this.sync(runtime.store.get());
        })
      );
      this._unsubTheme = watchTheme(() => this._syncTheme());
      this._mq = window.matchMedia("(max-width: 720px)");
      this._mq.addEventListener?.("change", this._onMq);
      this._syncVisibility();
      runtime.ensureStarted();
    }

    disconnectedCallback() {
      this._unsub?.();
      this._unsubTheme?.();
      this._offBus.forEach((off) => off?.());
      this._mq?.removeEventListener?.("change", this._onMq);
    }

    _syncTheme() {
      const root = this.shadowRoot?.querySelector(".lg-root");
      applyTheme(this, root);
    }

    _syncVisibility() {
      const mobile = this._mq?.matches ?? window.matchMedia("(max-width: 720px)").matches;
      this.hidden = !mobile;
      this.style.display = mobile ? "" : "none";
    }

    render() {
      ensureQuizFont();
      const t = runtime.i18n.t.bind(runtime.i18n);
      this.shadowRoot.innerHTML = `
        <style>${cssText}</style>
        <div class="lg-root lg-orb-host">
          <button type="button" class="lg-orb" data-state="${escapeAttr(this._state)}" aria-label="${escapeAttr(t("orbLabel"))}">
            <span class="lg-orb-ring" aria-hidden="true"></span>
            <span class="lg-orb-wave" aria-hidden="true"></span>
            <span class="lg-orb-core" aria-hidden="true"></span>
            <span class="lg-orb-badge" hidden>0</span>
          </button>
        </div>
      `;
      this._syncTheme();
      this.shadowRoot.querySelector(".lg-orb")?.addEventListener("click", () => this._activate());
    }

    sync(state) {
      const badge = this.shadowRoot?.querySelector(".lg-orb-badge");
      const n = Number(state.unread || 0);
      if (!badge) return;
      if (n > 0) {
        badge.hidden = false;
        badge.textContent = n > 99 ? "99+" : String(n);
        if (this._state === "idle") this._setState("attention");
      } else {
        badge.hidden = true;
        if (this._state === "attention") this._setState("idle");
      }
    }

    _setState(state) {
      this._state = state || "idle";
      const btn = this.shadowRoot?.querySelector(".lg-orb");
      if (btn) btn.dataset.state = this._state;
    }

    _activate() {
      const btn = this.shadowRoot?.querySelector(".lg-orb");
      if (btn) {
        btn.classList.add("is-pressing");
        window.setTimeout(() => btn.classList.remove("is-pressing"), 220);
      }
      runtime.openCenter({ tab: "activity" });
    }
  }

  customElements.define("legatus-orb", LegatusOrb);
}
