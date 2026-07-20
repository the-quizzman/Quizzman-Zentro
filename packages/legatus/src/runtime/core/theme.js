/**
 * Host theme + quiz typography helpers for Shadow DOM hosts.
 * Dark tokens must be solid — inherited --qmf-* vars often stay light.
 */

const FONT_ID = "legatus-quiz-font";
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Nunito:wght@500;600;700;800&display=swap";

const THEME_STORAGE_KEYS = ["qmf-theme", "lab-theme", "qm-theme", "theme"];

/**
 * @param {string|null|undefined} value
 * @returns {"dark"|"light"|null}
 */
function normalizeTheme(value) {
  const normalized = String(value || "").toLowerCase().trim();
  if (normalized === "dark" || normalized === "light") return normalized;
  return null;
}

/**
 * @param {string|null|undefined} explicit
 * @returns {"dark"|"light"}
 */
export function resolveHostTheme(explicit) {
  const forced = normalizeTheme(explicit);
  if (forced) return forced;

  try {
    const el = document.documentElement;
    const body = document.body;
    const attr =
      el.getAttribute("data-theme") ||
      el.getAttribute("data-color-mode") ||
      body?.getAttribute("data-theme") ||
      "";
    const fromAttr = normalizeTheme(attr);
    if (fromAttr) return fromAttr;
    if (el.classList.contains("dark") || body?.classList.contains("dark")) return "dark";
    if (el.classList.contains("light") || body?.classList.contains("light")) return "light";
  } catch {
    /* ignore */
  }

  // Prefer the app's persisted theme over a transient SSR default.
  try {
    for (const key of THEME_STORAGE_KEYS) {
      const stored = normalizeTheme(localStorage.getItem(key));
      if (stored) return stored;
    }
  } catch {
    /* private mode */
  }

  try {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {
    /* ignore */
  }
  return "light";
}

/**
 * Apply resolved theme on host (+ optional inner root).
 * @param {HTMLElement} host
 * @param {Element|null} [rootEl]
 * @returns {"dark"|"light"}
 */
export function applyTheme(host, rootEl) {
  const theme = resolveHostTheme(host.getAttribute("theme"));
  host.setAttribute("data-theme", theme);
  if (rootEl && rootEl.setAttribute) rootEl.setAttribute("data-theme", theme);
  return theme;
}

/**
 * Watch html/body theme + OS preference; call onChange when it may change.
 * @param {() => void} onChange
 * @returns {() => void} dispose
 */
export function watchTheme(onChange) {
  const run = () => {
    try {
      onChange();
    } catch {
      /* ignore */
    }
  };

  const mo = new MutationObserver(run);
  try {
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-color-mode", "class"],
    });
    if (document.body) {
      mo.observe(document.body, {
        attributes: true,
        attributeFilter: ["data-theme", "class"],
      });
    }
  } catch {
    /* ignore */
  }

  let mq = null;
  const onMq = () => run();
  try {
    mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", onMq);
    else if (mq.addListener) mq.addListener(onMq);
  } catch {
    /* ignore */
  }

  try {
    window.addEventListener("qmf:themechange", run);
    window.addEventListener("storage", run);
  } catch {
    /* ignore */
  }

  return () => {
    mo.disconnect();
    try {
      if (mq?.removeEventListener) mq.removeEventListener("change", onMq);
      else if (mq?.removeListener) mq.removeListener(onMq);
    } catch {
      /* ignore */
    }
    try {
      window.removeEventListener("qmf:themechange", run);
      window.removeEventListener("storage", run);
    } catch {
      /* ignore */
    }
  };
}

/** Load Nunito once on the document (available inside open shadow roots). */
export function ensureQuizFont() {
  try {
    if (document.getElementById(FONT_ID)) return;
    const pre = document.createElement("link");
    pre.rel = "preconnect";
    pre.href = "https://fonts.gstatic.com";
    pre.crossOrigin = "anonymous";
    if (!document.querySelector('link[href="https://fonts.gstatic.com"]')) {
      document.head.appendChild(pre);
    }
    const link = document.createElement("link");
    link.id = FONT_ID;
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    document.head.appendChild(link);
  } catch {
    /* ignore */
  }
}
