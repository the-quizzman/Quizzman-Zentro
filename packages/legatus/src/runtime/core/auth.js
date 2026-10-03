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

function clearStoredTokens() {
  if (typeof window === "undefined") return;
  for (const k of TOKEN_KEYS) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* private mode */
    }
  }
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

async function refreshFromIdSys() {
  if (typeof window === "undefined") return null;
  for (const owner of ssoOwners()) {
    if (typeof owner.refreshAccessToken === "function") {
      try {
        const ok = await owner.refreshAccessToken();
        if (ok) return true;
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

/**
 * Access JWT is HttpOnly. This provider never returns a readable token;
 * Legatus uses cookie credentials instead.
 */
export function createTokenProvider(opts = {}) {
  if (typeof opts.tokenProvider === "function") {
    return async (requestOptions = {}) => {
      if (requestOptions.forceRefresh) {
        await refreshFromIdSys();
      }
      const token = await opts.tokenProvider(requestOptions);
      return token || null;
    };
  }
  if (opts.token) {
    return async () => opts.token;
  }

  return async (requestOptions = {}) => {
    if (requestOptions.forceRefresh) {
      await refreshFromIdSys();
    }
    clearStoredTokens();
    return null;
  };
}
