import { z, validateConfig, createStore, getGlobalEventBus } from '@qmf/core';
import { createLogger, resolveToken, resolveCurrentUser } from '@qmf/utils';

// src/index.ts
var AuthShellConfigSchema = z.object({
  /** Login page URL */
  loginUrl: z.string().url().default("https://id.quizzman.com/login"),
  /** Logout URL */
  logoutUrl: z.string().url().default("https://id.quizzman.com/logout"),
  /** Profile URL */
  profileUrl: z.string().url().default("https://id.quizzman.com/account"),
  /** Settings URL */
  settingsUrl: z.string().url().default("https://id.quizzman.com/account"),
  /** Custom token getter (overrides default resolution) */
  getToken: z.function().args().returns(z.string().nullable()).optional(),
  /** Custom user getter */
  getUser: z.function().args().returns(z.record(z.unknown()).nullable()).optional(),
  /** Auto redirect to login on auth failure */
  autoRedirect: z.boolean().default(false),
  /** Debug mode */
  debug: z.boolean().default(false)
});
var AuthShell = class {
  constructor(config = {}) {
    this.config = validateConfig(AuthShellConfigSchema, config, "AuthShell");
    this.logger = createLogger("AuthShell", this.config.debug ? "debug" : "warn");
    this.store = createStore(
      {
        isAuthenticated: false,
        token: null,
        user: null,
        loading: true
      },
      { name: "AuthShell", debug: this.config.debug }
    );
  }
  /** Get current auth state */
  getState() {
    return this.store.getState();
  }
  /** Check if user is authenticated */
  get isAuthenticated() {
    return this.store.getState().isAuthenticated;
  }
  /** Get current token */
  getToken() {
    if (this.config.getToken) {
      return this.config.getToken();
    }
    return resolveToken();
  }
  /** Get current user */
  getUser() {
    if (this.config.getUser) {
      return this.config.getUser();
    }
    return resolveCurrentUser();
  }
  /** Check and update auth state */
  checkAuthState() {
    const token = this.getToken();
    const user = this.getUser();
    const isAuthenticated = !!token && !!user;
    this.store.setState({
      isAuthenticated,
      token,
      user,
      loading: false
    });
    const bus = getGlobalEventBus();
    bus.emit("auth:stateChange", { isAuthenticated, user });
    this.logger.debug("Auth state checked:", { isAuthenticated, hasToken: !!token });
  }
  /** Redirect to login page */
  redirectToLogin(returnUrl) {
    const url = new URL(this.config.loginUrl);
    if (returnUrl) {
      url.searchParams.set("redirect", returnUrl);
    } else if (typeof window !== "undefined") {
      url.searchParams.set("redirect", window.location.href);
    }
    window.location.href = url.toString();
  }
  /** Handle logout */
  logout() {
    if (typeof localStorage !== "undefined") {
      for (const key of ["jwt_token", "authToken", "token", "user"]) {
        localStorage.removeItem(key);
      }
    }
    if (typeof document !== "undefined") {
      for (const name of ["jwt_token", "authToken"]) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    }
    this.store.setState({
      isAuthenticated: false,
      token: null,
      user: null,
      loading: false
    });
    const bus = getGlobalEventBus();
    bus.emit("auth:logout");
    this.logger.info("User logged out");
    if (this.config.autoRedirect) {
      window.location.href = this.config.logoutUrl;
    }
  }
  /** Subscribe to auth state changes */
  onAuthChange(listener) {
    return this.store.subscribe((newState) => listener(newState));
  }
  /** Initialize (check auth state and setup listeners) */
  init() {
    this.checkAuthState();
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key && ["jwt_token", "authToken", "token", "user"].includes(e.key)) {
          this.checkAuthState();
        }
      });
      window.addEventListener("auth:login", () => this.checkAuthState());
      window.addEventListener("auth:logout", () => this.logout());
    }
  }
  /** Destroy auth shell */
  destroy() {
    this.store.destroy();
  }
};
function createAuthShellPlugin(config) {
  const authShell = new AuthShell(config);
  return {
    name: "auth-shell",
    version: "3.0.0",
    hooks: {
      onInit: () => authShell.init(),
      onDestroy: () => authShell.destroy()
    },
    setup: (ctx) => {
      ctx.expose("instance", authShell);
      ctx.expose("getToken", () => authShell.getToken());
      ctx.expose("getUser", () => authShell.getUser());
      ctx.expose("isAuthenticated", () => authShell.isAuthenticated);
    }
  };
}

export { AuthShell, AuthShellConfigSchema, createAuthShellPlugin, AuthShell as default };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map