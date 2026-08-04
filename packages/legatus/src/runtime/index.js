import { createTokenProvider } from "./core/auth.js";
import { createBus } from "./core/bus.js";
import { LegatusClient } from "./core/client.js";
import { createStore } from "./core/store.js";
import { createI18n, detectLang, normalizeLang, watchLang } from "./core/i18n.js";
import { defineBell, defineToastHost } from "./components/elements.js";
import { defineCenter } from "./components/hub.js";
import { defineOrb } from "./components/orb.js";
import cssText from "./styles.css";

const DEFAULT_ENDPOINT = "https://legatus.quizzman.com";

/** @type {import('./index.js').LegatusRuntime | null} */
let runtime = null;

/**
 * @typedef {object} LegatusInitOptions
 * @property {string} [endpoint]
 * @property {string} [token]
 * @property {() => (string|null|Promise<string|null>)} [tokenProvider]
 * @property {string} [sso]
 * @property {string} [locale]
 * @property {string} [lang]
 * @property {boolean} [autoConnect]
 * @property {boolean} [toastHost]
 */

/**
 * @typedef {object} LegatusRuntime
 * @property {ReturnType<typeof createBus>} bus
 * @property {ReturnType<typeof createStore>} store
 * @property {LegatusClient} client
 * @property {ReturnType<typeof createI18n>} i18n
 * @property {LegatusInitOptions} options
 * @property {() => string} getLocale
 * @property {(lang: string) => void} setLocale
 * @property {() => Promise<void>} ensureStarted
 * @property {() => void} openCenter
 * @property {() => void} closeCenter
 */

function createRuntime(options) {
  const bus = createBus();
  const store = createStore(bus);
  let getToken = createTokenProvider(options);
  const client = new LegatusClient({
    endpoint: options.endpoint || DEFAULT_ENDPOINT,
    getToken: (requestOptions) => getToken(requestOptions),
    bus,
    store,
  });

  let locale = detectLang(options.locale || options.lang);
  const i18n = createI18n(() => locale);
  let started = false;
  let startPromise = null;

  /** @type {LegatusRuntime} */
  const rt = {
    bus,
    store,
    client,
    i18n,
    options,
    getLocale() {
      return locale;
    },
    setLocale(lang) {
      const next = normalizeLang(lang);
      if (next === locale) return;
      locale = next;
      bus.emit("locale:change", locale);
      // Keep Legatus prefs in sync with UI lang, then re-fetch localized payloads.
      void (async () => {
        await client.syncLocale?.(next);
        await client.fetchNotifications?.({ limit: 20 }).catch(() => {});
        await client.fetchUnread?.().catch(() => {});
      })();
    },
    rebindAuth(nextOptions = {}) {
      Object.assign(options, nextOptions || {});
      getToken = createTokenProvider(options);
      client.getToken = (requestOptions) => getToken(requestOptions);
      if (nextOptions.endpoint) {
        client.endpoint = String(nextOptions.endpoint).replace(/\/$/, "");
      }
    },
    async ensureStarted({ force = false } = {}) {
      if (started && !force) return startPromise;
      if (startPromise && !force) return startPromise;
      started = true;
      startPromise = (async () => {
        store.set({ error: null });
        try {
          await client.syncLocale?.(locale);
          await client.fetchUnread();
        } catch {
          /* anonymous / offline */
        }
        if (options.autoConnect !== false) {
          await client.connect();
        }
      })();
      return startPromise;
    },
    openCenter(opts = {}) {
      let el = document.querySelector("legatus-center");
      if (!el) {
        el = document.createElement("legatus-center");
        document.body.appendChild(el);
      }
      if (typeof el.open === "function") el.open(opts);
    },
    closeCenter() {
      const el = document.querySelector("legatus-center");
      if (el && typeof el.close === "function") el.close();
    },
    ensureOrb() {
      let el = document.querySelector("legatus-orb");
      if (!el) {
        el = document.createElement("legatus-orb");
        document.documentElement.appendChild(el);
      }
      return el;
    },
    removeHeaderBells() {
      document.querySelectorAll("legatus-bell").forEach((b) => b.remove());
    },
  };

  defineBell(cssText, rt);
  defineCenter(cssText, rt);
  defineOrb(cssText, rt);
  defineToastHost(cssText, rt);

  if (options.toastHost !== false && !document.querySelector("legatus-toasts")) {
    const host = document.createElement("legatus-toasts");
    document.documentElement.appendChild(host);
  }

  // Mobile: always mount the floating orb once runtime exists.
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches) {
    rt.ensureOrb();
  }

  watchLang((lang) => rt.setLocale(lang));

  return rt;
}

const api = {
  version: typeof __LEGATUS_SDK_VERSION__ !== "undefined" ? __LEGATUS_SDK_VERSION__ : "0.1.0",

  /**
   * Initialize the SDK (idempotent).
   * @param {LegatusInitOptions} [options]
   */
  init(options = {}) {
    if (runtime) {
      runtime.rebindAuth(options);
      if (options.locale || options.lang) {
        runtime.setLocale(options.locale || options.lang);
      }
      // Re-auth after SSO finishes (or when a fresh tokenProvider is supplied).
      if (options.tokenProvider || options.token || options.forceRestart) {
        void runtime.ensureStarted({ force: true });
      }
      return api;
    }
    runtime = createRuntime({
      endpoint: options.endpoint || inferEndpoint(),
      autoConnect: options.autoConnect !== false,
      toastHost: options.toastHost !== false,
      ...options,
    });
    runtime.ensureStarted();
    return api;
  },

  /** @param {string} lang */
  setLocale(lang) {
    this.init();
    runtime.setLocale(lang);
    return api;
  },

  getLocale() {
    return runtime?.getLocale() || detectLang();
  },

  /**
   * Mount a bell into a selector or element.
   * @param {string|Element} target
   * @param {object} [attrs]
   */
  mount(target, attrs = {}) {
    this.init();
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) throw new Error(`[Legatus] mount target not found: ${target}`);
    let bell = el.querySelector("legatus-bell");
    if (!bell) {
      bell = document.createElement("legatus-bell");
      el.appendChild(bell);
    }
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      bell.setAttribute(k, String(v));
    }
    return bell;
  },

  on(type, handler) {
    this.init();
    return runtime.bus.on(type, handler);
  },

  off(type, handler) {
    runtime?.bus.off(type, handler);
  },

  emit(type, detail) {
    this.init();
    if (type === "toast") {
      runtime.bus.emit("toast", detail);
      return;
    }
    runtime.bus.emit(type, detail);
  },

  async refresh() {
    this.init();
    await runtime.client.fetchUnread();
    return runtime.client.fetchNotifications();
  },

  openCenter(opts) {
    this.init();
    runtime.openCenter(opts || {});
  },

  closeCenter() {
    runtime?.closeCenter();
  },

  ensureOrb() {
    this.init();
    return runtime.ensureOrb();
  },

  getState() {
    return runtime?.store.get() || null;
  },

  get client() {
    this.init();
    return runtime.client;
  },
};

function inferEndpoint() {
  try {
    const scripts = document.getElementsByTagName("script");
    for (let i = scripts.length - 1; i >= 0; i--) {
      const src = scripts[i].src || "";
      if (src.includes("/sdk/legatus")) {
        return new URL(src).origin;
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_ENDPOINT;
}

// Auto-init when custom elements are already in the DOM
if (typeof window !== "undefined") {
  const boot = () => {
    if (document.querySelector("legatus-bell, legatus-center, legatus-toasts, legatus-orb")) {
      api.init();
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}

export default api;
