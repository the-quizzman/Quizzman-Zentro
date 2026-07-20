/**
 * Legatus Communication Hub — Activity | Mentis | Tasks
 * Desktop: modal popup · Mobile: side sheet from the right
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

const PROMPTS = [
  { key: "promptQuiz", id: "generate-quiz" },
  { key: "promptExplain", id: "explain-slide" },
  { key: "promptSummarize", id: "summarize" },
  { key: "promptTranslate", id: "translate" },
  { key: "promptImprove", id: "improve" },
];

/**
 * @param {string} cssText
 * @param {import('../index.js').LegatusRuntime} runtime
 */
export function defineCenter(cssText, runtime) {
  if (customElements.get("legatus-center")) return;

  class LegatusCenter extends HTMLElement {
    constructor() {
      super();
      this._open = false;
      this._tab = "activity";
      this._mentis = [];
      this._unsub = null;
      this._unsubLocale = null;
      this._onKey = (e) => {
        if (e.key === "Escape" && this._open) this.close();
      };
    }

    connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this.setAttribute("data-role", "hub");
      ensureQuizFont();
      this._paintShell();
      this._unsub = runtime.store.subscribe((s) => this.paintActivity(s));
      this._unsubLocale = runtime.bus.on("locale:change", () => {
        const wasOpen = this._open;
        const tab = this._tab;
        this._paintShell();
        this._setTab(tab);
        this.paintActivity(runtime.store.get());
        this.paintMentis();
        if (wasOpen) this.open({ tab });
      });
      this._unsubTheme = watchTheme(() => this._syncTheme());
      document.addEventListener("keydown", this._onKey);
      runtime.ensureStarted();
    }

    disconnectedCallback() {
      this._unsub?.();
      this._unsubLocale?.();
      this._unsubTheme?.();
      document.removeEventListener("keydown", this._onKey);
      document.documentElement.style.removeProperty("overflow");
    }

    _syncTheme() {
      const root = this.shadowRoot?.querySelector(".lg-root");
      applyTheme(this, root);
    }

    _paintShell() {
      ensureQuizFont();
      const t = runtime.i18n.t.bind(runtime.i18n);
      const title = t("brand");
      this.shadowRoot.innerHTML = `
        <style>${cssText}</style>
        <div class="lg-root lg-center-root" data-open="false" hidden>
          <div class="lg-center-backdrop" data-close></div>
          <div class="lg-center-dialog" role="dialog" aria-modal="true" aria-label="${escapeAttr(title)}">
            <div class="lg-panel-head">
              <h3 class="lg-panel-title">${escapeHtml(title)}</h3>
              <div class="lg-center-actions">
                <button class="lg-link lg-hub-readall" type="button" data-action="read-all">${escapeHtml(t("markAllRead"))}</button>
                <button class="lg-center-close" type="button" data-close aria-label="${escapeAttr(t("dismiss"))}">✕</button>
              </div>
            </div>
            <div class="lg-hub-tabs" role="tablist">
              <button type="button" role="tab" class="lg-hub-tab is-active" data-tab="activity" aria-selected="true">${escapeHtml(t("tabActivity"))}</button>
              <button type="button" role="tab" class="lg-hub-tab" data-tab="mentis" aria-selected="false">${escapeHtml(t("tabMentis"))}</button>
              <button type="button" role="tab" class="lg-hub-tab" data-tab="tasks" aria-selected="false">${escapeHtml(t("tabTasks"))}</button>
            </div>
            <div class="lg-hub-panels">
              <div class="lg-hub-panel" data-panel="activity" role="tabpanel">
                <div class="lg-list" data-list></div>
              </div>
              <div class="lg-hub-panel" data-panel="mentis" role="tabpanel" hidden>
                <div class="lg-mentis">
                  <div class="lg-mentis-thread" data-mentis-thread></div>
                  <div class="lg-mentis-composer">
                    <form data-mentis-form>
                      <input class="lg-mentis-input" type="text" name="q" autocomplete="off" placeholder="${escapeAttr(t("mentisHint"))}" />
                      <button class="lg-mentis-send" type="submit" aria-label="Send">↵</button>
                    </form>
                    <div class="lg-mentis-prompts" data-mentis-prompts></div>
                    <button class="lg-link lg-mentis-workspace" type="button" data-action="mentis-workspace">${escapeHtml(t("mentisWorkspace"))}</button>
                  </div>
                </div>
              </div>
              <div class="lg-hub-panel" data-panel="tasks" role="tabpanel" hidden>
                <div class="lg-empty" data-tasks-empty>${escapeHtml(t("emptyTasks"))}</div>
              </div>
            </div>
          </div>
        </div>
      `;
      this._syncTheme();

      this.shadowRoot.querySelectorAll("[data-close]").forEach((el) => {
        el.addEventListener("click", () => this.close());
      });
      this.shadowRoot
        .querySelector('[data-action="read-all"]')
        ?.addEventListener("click", () => runtime.client.markAllRead().catch(() => {}));
      this.shadowRoot.querySelectorAll(".lg-hub-tab").forEach((tab) => {
        tab.addEventListener("click", () => this._setTab(tab.getAttribute("data-tab")));
      });

      const form = this.shadowRoot.querySelector("[data-mentis-form]");
      form?.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = form.querySelector("input");
        const text = (input?.value || "").trim();
        if (!text) return;
        this._askMentis(text);
        if (input) input.value = "";
      });

      const prompts = this.shadowRoot.querySelector("[data-mentis-prompts]");
      if (prompts) {
        prompts.innerHTML = PROMPTS.map(
          (p) =>
            `<button type="button" class="lg-mentis-chip" data-prompt="${escapeAttr(p.id)}">${escapeHtml(t(p.key))}</button>`
        ).join("");
        prompts.querySelectorAll("[data-prompt]").forEach((btn) => {
          btn.addEventListener("click", () => this._askMentis(btn.textContent || ""));
        });
      }

      this.shadowRoot
        .querySelector('[data-action="mentis-workspace"]')
        ?.addEventListener("click", () => {
          runtime.bus.emit("mentis:open-workspace", {});
          window.dispatchEvent(new CustomEvent("mentis:open-workspace"));
        });

      this.paintMentis();
      this._setTab(this._tab);
    }

    _setTab(tab) {
      this._tab = tab || "activity";
      const root = this.shadowRoot;
      if (!root) return;
      root.querySelectorAll(".lg-hub-tab").forEach((el) => {
        const on = el.getAttribute("data-tab") === this._tab;
        el.setAttribute("aria-selected", on ? "true" : "false");
        el.classList.toggle("is-active", on);
      });
      root.querySelectorAll(".lg-hub-panel").forEach((el) => {
        el.hidden = el.getAttribute("data-panel") !== this._tab;
      });
      const readAll = root.querySelector(".lg-hub-readall");
      if (readAll) readAll.hidden = this._tab !== "activity";
      runtime.bus.emit("hub:tab", this._tab);
    }

    _askMentis(text) {
      this._mentis.push({ role: "user", text });
      this.paintMentis();
      runtime.bus.emit("mentis:thinking", { prompt: text });
      runtime.bus.emit("orb:state", { state: "thinking" });

      window.setTimeout(() => {
        runtime.bus.emit("orb:state", { state: "speaking" });
        this._mentis.push({ role: "assistant", text, stub: true });
        this.paintMentis();
        runtime.bus.emit("mentis:message", { role: "assistant", text });
        window.setTimeout(() => {
          runtime.bus.emit("orb:state", { state: null });
        }, 900);
      }, 700);
    }

    paintMentis() {
      const thread = this.shadowRoot?.querySelector("[data-mentis-thread]");
      if (!thread) return;
      const t = runtime.i18n.t.bind(runtime.i18n);
      if (!this._mentis.length) {
        thread.innerHTML = `<div class="lg-empty">${escapeHtml(t("mentisEmpty"))}</div>`;
        return;
      }
      thread.innerHTML = this._mentis
        .map((m) => {
          if (m.stub) {
            return `<div class="lg-mentis-msg" data-role="assistant"><p>${escapeHtml(
              m.text
            )}</p><p class="lg-mentis-stub">Mentis Workspace →</p></div>`;
          }
          return `<div class="lg-mentis-msg" data-role="${escapeAttr(m.role)}"><p>${escapeHtml(m.text)}</p></div>`;
        })
        .join("");
      thread.scrollTop = thread.scrollHeight;
    }

    /** @param {{ tab?: string }} [opts] */
    async open(opts = {}) {
      if (!this.shadowRoot) this.connectedCallback();
      const root = this.shadowRoot.querySelector(".lg-center-root");
      if (!root) return;
      this._syncTheme();
      if (opts.tab) this._setTab(opts.tab);
      this._open = true;
      this.setAttribute("data-open", "true");
      root.hidden = false;
      void root.offsetWidth;
      root.dataset.open = "true";
      document.documentElement.style.overflow = "hidden";
      runtime.bus.emit("center:open");
      runtime.bus.emit("hub:open", { tab: this._tab });
      try {
        await runtime.client.fetchNotifications({ limit: 50 });
        await runtime.client.fetchUnread();
      } catch {
        /* store has error */
      }
    }

    close() {
      const root = this.shadowRoot?.querySelector(".lg-center-root");
      if (!root) return;
      this._open = false;
      this.removeAttribute("data-open");
      root.dataset.open = "false";
      document.documentElement.style.removeProperty("overflow");
      runtime.bus.emit("center:close");
      runtime.bus.emit("hub:close");
      const hide = () => {
        if (root.dataset.open === "false") root.hidden = true;
      };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        hide();
      } else {
        window.setTimeout(hide, 280);
      }
    }

    paintActivity(state) {
      const list = this.shadowRoot?.querySelector("[data-list]");
      if (!list) return;
      const t = runtime.i18n.t.bind(runtime.i18n);
      if (!state.items.length) {
        list.innerHTML = state.loading
          ? `<div class="lg-loading">${escapeHtml(t("loading"))}</div>`
          : `<div class="lg-empty">${escapeHtml(t("emptyCenter"))}</div>`;
        return;
      }
      list.innerHTML = state.items
        .map(
          (it) => `
        <button class="lg-item" type="button" data-unread="${!it.read_at}" data-receiver="${escapeAttr(
            it.receiver_id
          )}" data-title="${escapeAttr(it.title)}">
          <span class="lg-dot"></span>
          <span>
            <p class="lg-item-title">${escapeHtml(it.title)}</p>
            <p class="lg-item-body">${escapeHtml(it.body || "")}</p>
            <div class="lg-item-meta">${escapeHtml(runtime.i18n.relativeTime(it.created_at))}</div>
          </span>
        </button>`
        )
        .join("");
      list.querySelectorAll("[data-receiver]").forEach((el) => {
        el.addEventListener("click", () => {
          const id = el.getAttribute("data-receiver");
          if (id) runtime.client.markRead(id).catch(() => {});
          runtime.bus.emit("notification:click", {
            receiver_id: id,
            title: el.getAttribute("data-title"),
          });
        });
      });
    }

    paint(state) {
      this.paintActivity(state);
    }
  }

  customElements.define("legatus-center", LegatusCenter);
}
