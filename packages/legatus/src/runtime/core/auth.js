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

/**
 * Resolve an access token from options / SSO / local storage.
 * @param {object} opts
 * @returns {() => Promise<string|null>}
 */
export function createTokenProvider(opts = {}) {
  if (typeof opts.tokenProvider === "function") {
    return async (requestOptions) => opts.tokenProvider(requestOptions) || null;
  }
  if (opts.token) {
    return async () => opts.token;
  }

  return async (requestOptions = {}) => {
    if (typeof window !== "undefined") {
      if (requestOptions.forceRefresh) {
        const refresh =
          window.QuizzmanAuth?.refreshAccessToken ||
          window.IdSysSSO?.refreshAccessToken;
        if (typeof refresh === "function") {
          try {
            const refreshed = await refresh.call(
              window.QuizzmanAuth?.refreshAccessToken ? window.QuizzmanAuth : window.IdSysSSO
            );
            if (refreshed) return refreshed;
          } catch { /* ignore */ }
        }
      }
      if (window.QuizzmanAuth?.getToken) {
        try {
          const t = window.QuizzmanAuth.getToken();
          if (t) return t;
        } catch { /* ignore */ }
      }
      if (window.IdSysSSO?.getToken) {
        try {
          const t = window.IdSysSSO.getToken();
          if (t) return t;
        } catch { /* ignore */ }
      }
      if (window.SlideStudioAuth?.getToken) {
        try {
          const t = window.SlideStudioAuth.getToken();
          if (t) return t;
        } catch { /* ignore */ }
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
