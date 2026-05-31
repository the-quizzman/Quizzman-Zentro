'use strict';

// src/index.ts
function resolveToken() {
  const win = typeof window !== "undefined" ? window : null;
  if (win) {
    const auth = win.QuizzmanAuth;
    if (auth?.getToken) {
      const token = auth.getToken();
      if (token) return token;
    }
  }
  if (typeof document !== "undefined") {
    const cookieToken = getCookie("jwt_token") || getCookie("authToken");
    if (cookieToken) return cookieToken;
  }
  if (typeof localStorage !== "undefined") {
    for (const key of ["jwt_token", "authToken", "token"]) {
      try {
        const val = localStorage.getItem(key);
        if (val) return val;
      } catch {
      }
    }
  }
  return null;
}
function resolveCurrentUser() {
  const win = typeof window !== "undefined" ? window : null;
  if (win) {
    const auth = win.QuizzmanAuth;
    if (auth?.getUser) {
      const user = auth.getUser();
      if (user) return user;
    }
  }
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem("user");
      if (raw) return JSON.parse(raw);
    } catch {
    }
  }
  return null;
}
function getCookie(name) {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split("=");
    if (key === name && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
}
var LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
};
function createLogger(namespace, level = "info") {
  const prefix = `[QMF:${namespace}]`;
  const minLevel = LOG_LEVELS[level];
  return {
    debug: (...args) => {
      if (minLevel <= LOG_LEVELS.debug) console.debug(prefix, ...args);
    },
    info: (...args) => {
      if (minLevel <= LOG_LEVELS.info) console.info(prefix, ...args);
    },
    warn: (...args) => {
      if (minLevel <= LOG_LEVELS.warn) console.warn(prefix, ...args);
    },
    error: (...args) => {
      if (minLevel <= LOG_LEVELS.error) console.error(prefix, ...args);
    }
  };
}
function queryElement(selector) {
  if (typeof selector === "string") {
    return document.querySelector(selector);
  }
  return selector;
}
function mountComponent(container, render) {
  const el = queryElement(container);
  if (!el) {
    console.error(`[QMF:mount] Container not found: ${container}`);
    return () => {
    };
  }
  const cleanup = render(el);
  return () => {
    if (cleanup) cleanup();
    el.innerHTML = "";
  };
}
function createElement(tag, attrs, children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, val] of Object.entries(attrs)) {
      if (key === "className") {
        el.className = val;
      } else {
        el.setAttribute(key, val);
      }
    }
  }
  if (children) {
    for (const child of children) {
      if (typeof child === "string") {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    }
  }
  return el;
}
async function safeFetch(url, options) {
  try {
    const controller = new AbortController();
    const timer = options?.timeout ? setTimeout(() => controller.abort(), options.timeout) : null;
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    if (timer) clearTimeout(timer);
    const contentType = response.headers.get("content-type");
    const data = contentType?.includes("json") ? await response.json() : await response.text();
    if (!response.ok) {
      return { data: null, error: new Error(`HTTP ${response.status}`), status: response.status };
    }
    return { data, error: null, status: response.status };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)), status: 0 };
  }
}
function createEventEmitter() {
  const listeners = /* @__PURE__ */ new Map();
  return {
    on(event, cb) {
      let set = listeners.get(event);
      if (!set) {
        set = /* @__PURE__ */ new Set();
        listeners.set(event, set);
      }
      set.add(cb);
      return () => set.delete(cb);
    },
    emit(event, data) {
      const set = listeners.get(event);
      if (set) {
        for (const cb of set) {
          try {
            cb(data);
          } catch (err) {
            console.error(`[QMF:EventEmitter] Error in "${event}":`, err);
          }
        }
      }
    },
    off(event, cb) {
      if (cb) {
        listeners.get(event)?.delete(cb);
      } else {
        listeners.delete(event);
      }
    },
    clear() {
      listeners.clear();
    }
  };
}
function deepMerge(...objects) {
  const result = {};
  for (const obj of objects) {
    for (const [key, val] of Object.entries(obj)) {
      if (val && typeof val === "object" && !Array.isArray(val)) {
        result[key] = deepMerge(
          result[key] || {},
          val
        );
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}
function uniqueId(prefix = "qmf") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
function debounce(fn, delay) {
  let timer;
  return ((...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  });
}
function throttle(fn, limit) {
  let inThrottle = false;
  return ((...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  });
}
function formatRelativeTime(date) {
  const d = new Date(date);
  const now = Date.now();
  const diff = now - d.getTime();
  const seconds = Math.floor(diff / 1e3);
  if (seconds < 60) return "v\u1EEBa xong";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} ph\xFAt tr\u01B0\u1EDBc`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} gi\u1EDD tr\u01B0\u1EDBc`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} ng\xE0y tr\u01B0\u1EDBc`;
  return d.toLocaleDateString("vi-VN");
}

exports.createElement = createElement;
exports.createEventEmitter = createEventEmitter;
exports.createLogger = createLogger;
exports.debounce = debounce;
exports.deepMerge = deepMerge;
exports.formatRelativeTime = formatRelativeTime;
exports.getCookie = getCookie;
exports.mountComponent = mountComponent;
exports.queryElement = queryElement;
exports.resolveCurrentUser = resolveCurrentUser;
exports.resolveToken = resolveToken;
exports.safeFetch = safeFetch;
exports.throttle = throttle;
exports.uniqueId = uniqueId;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map