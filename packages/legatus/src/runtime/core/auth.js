const TOKEN_KEYS = [
  "jwt_token",
  "access_token",
  "accessToken",
  "qm_access_token",
  "quizzman_access_token",
  "auth_token",
  "authToken",
  "token",
];

const ID_REFRESH_URL = "https://id.quizzman.com/api/auth/refresh";
/** Refresh a bit before exp so clock skew / in-flight requests stay valid. */
const EXPIRY_SKEW_SECS = 45;

export function decodeJwtPayload(token) {
  try {
    const part = String(token || "").split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenUsable(token) {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  // Non-JWT opaque tokens: keep and let the API decide.
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp > Math.floor(Date.now() / 1000) + EXPIRY_SKEW_SECS;
}

function clearStoredTokens() {
  if (typeof window === "undefined") return;
  for (const k of TOKEN_KEYS) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* private mode */
    }
  }
  try {
    document.cookie =
      "jwt_token=; path=/; domain=.quizzman.com; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "jwt_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  } catch {
    /* ignore */
  }
}

function persistToken(token) {
  if (!token || typeof window === "undefined") return;
  try {
    localStorage.setItem("jwt_token", token);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `jwt_token=${encodeURIComponent(token)}; path=/; domain=.quizzman.com; max-age=${90 * 24 * 60 * 60}; SameSite=Lax; Secure`;
  } catch {
    /* ignore */
  }
  try {
    window.__QM_ACCESS_TOKEN__ = token;
  } catch {
    /* ignore */
  }
}

async function refreshViaCookie() {
  if (typeof window === "undefined" || typeof fetch !== "function") return null;
  try {
    const res = await fetch(ID_REFRESH_URL, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const token = data?.token || data?.accessToken || data?.access_token || null;
    if (data?.success && token) {
      persistToken(token);
      return token;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function ssoOwners() {
  if (typeof window === "undefined") return [];
  const seen = new Set();
  const out = [];
  for (const owner of [window.IdSysSSO, window.QuizzmanAuth, window.QuizzmanSSO]) {
    if (!owner || seen.has(owner)) continue;
    seen.add(owner);
    out.push(owner);
  }
  return out;
}

async function refreshFromIdSys(force = false) {
  if (typeof window === "undefined") return null;

  for (const owner of ssoOwners()) {
    if (typeof owner.refreshAccessToken === "function") {
      try {
        const refreshed = await owner.refreshAccessToken(force);
        if (refreshed && isTokenUsable(refreshed)) {
          persistToken(refreshed);
          return refreshed;
        }
      } catch {
        /* ignore */
      }
    }
    if (typeof owner.getAuth === "function") {
      try {
        const auth = await owner.getAuth(force);
        const token = auth?.token || auth?.accessToken || auth?.access_token || null;
        if (token && isTokenUsable(token)) {
          persistToken(token);
          return token;
        }
      } catch {
        /* ignore */
      }
    }
    if (typeof owner.ensureToken === "function") {
      try {
        const ensured = await owner.ensureToken();
        if (ensured && isTokenUsable(ensured)) {
          persistToken(ensured);
          return ensured;
        }
      } catch {
        /* ignore */
      }
    }
  }

  // Sites without SSO script — refresh via HttpOnly cookie.
  return refreshViaCookie();
}

function readVisibleToken() {
  if (typeof window !== "undefined") {
    for (const owner of ssoOwners()) {
      if (typeof owner.getToken !== "function") continue;
      try {
        const t = owner.getToken();
        if (t) return t;
      } catch {
        /* ignore */
      }
    }
    if (window.SlideStudioAuth?.getToken) {
      try {
        const t = window.SlideStudioAuth.getToken();
        if (t) return t;
      } catch {
        /* ignore */
      }
    }
  }

  for (const k of TOKEN_KEYS) {
    try {
      const v = localStorage.getItem(k);
      if (v) return v;
    } catch {
      /* private mode */
    }
  }

  if (typeof window !== "undefined" && window.__QM_ACCESS_TOKEN__) {
    return window.__QM_ACCESS_TOKEN__;
  }
  return null;
}

/**
 * Resolve an access token from options / SSO / local storage.
 * Never returns an expired JWT — refreshes via SSO or id.quizzman.com cookie first.
 * @param {object} opts
 * @returns {(requestOptions?: {forceRefresh?: boolean}) => Promise<string|null>}
 */
export function createTokenProvider(opts = {}) {
  if (typeof opts.tokenProvider === "function") {
    return async (requestOptions) => opts.tokenProvider(requestOptions) || null;
  }
  if (opts.token) {
    return async () => (isTokenUsable(opts.token) ? opts.token : null);
  }

  return async (requestOptions = {}) => {
    if (requestOptions.forceRefresh) {
      const refreshed = await refreshFromIdSys(true);
      if (refreshed) return refreshed;
    }

    const visible = readVisibleToken();
    if (visible && isTokenUsable(visible)) return visible;

    if (visible && !isTokenUsable(visible)) {
      clearStoredTokens();
    }

    // Session may already be authenticated via HttpOnly refresh cookie.
    return refreshFromIdSys(true);
  };
}
