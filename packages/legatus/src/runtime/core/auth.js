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

async function refreshFromIdSys(force = false) {
  if (typeof window === "undefined") return null;

  const idsys = window.IdSysSSO;
  if (idsys && typeof idsys.refreshAccessToken === "function") {
    try {
      const refreshed = await idsys.refreshAccessToken(force);
      if (refreshed) return refreshed;
    } catch {
      /* ignore */
    }
  }

  if (idsys && typeof idsys.getAuth === "function") {
    try {
      const auth = await idsys.getAuth(force);
      const token = auth?.token || auth?.accessToken || auth?.access_token || null;
      if (token) return token;
    } catch {
      /* ignore */
    }
  }

  if (window.QuizzmanAuth && typeof window.QuizzmanAuth.refreshAccessToken === "function") {
    try {
      const refreshed = await window.QuizzmanAuth.refreshAccessToken(force);
      if (refreshed) return refreshed;
    } catch {
      /* ignore */
    }
  }

  return null;
}

function readVisibleToken() {
  if (typeof window !== "undefined") {
    if (window.IdSysSSO?.getToken) {
      try {
        const t = window.IdSysSSO.getToken();
        if (t) return t;
      } catch {
        /* ignore */
      }
    }
    if (window.QuizzmanAuth?.getToken) {
      try {
        const t = window.QuizzmanAuth.getToken();
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
 * @param {object} opts
 * @returns {(requestOptions?: {forceRefresh?: boolean}) => Promise<string|null>}
 */
export function createTokenProvider(opts = {}) {
  if (typeof opts.tokenProvider === "function") {
    return async (requestOptions) => opts.tokenProvider(requestOptions) || null;
  }
  if (opts.token) {
    return async () => opts.token;
  }

  return async (requestOptions = {}) => {
    if (requestOptions.forceRefresh) {
      const refreshed = await refreshFromIdSys(true);
      if (refreshed) return refreshed;
    }

    const visible = readVisibleToken();
    if (visible) return visible;

    // Session may already be authenticated via HttpOnly refresh cookie.
    return refreshFromIdSys(true);
  };
}

export function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
