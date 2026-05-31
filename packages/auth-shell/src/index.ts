/**
 * @qmf/auth-shell - Authentication Shell
 * Provides auth state management, token resolution, and user lifecycle.
 * Integrates with QuizzmanAuth global or custom providers.
 */

import { z, validateConfig, type QMFPlugin, createStore, getGlobalEventBus } from '@qmf/core';
import { resolveToken, resolveCurrentUser, createLogger, type Logger } from '@qmf/utils';

// ─── Config Schema ──────────────────────────────────────────

export const AuthShellConfigSchema = z.object({
  /** Login page URL */
  loginUrl: z.string().url().default('https://id.quizzman.com/login'),
  /** Logout URL */
  logoutUrl: z.string().url().default('https://id.quizzman.com/logout'),
  /** Profile URL */
  profileUrl: z.string().url().default('https://id.quizzman.com/account'),
  /** Settings URL */
  settingsUrl: z.string().url().default('https://id.quizzman.com/settings'),
  /** Custom token getter (overrides default resolution) */
  getToken: z.function().args().returns(z.string().nullable()).optional(),
  /** Custom user getter */
  getUser: z.function().args().returns(z.record(z.unknown()).nullable()).optional(),
  /** Auto redirect to login on auth failure */
  autoRedirect: z.boolean().default(false),
  /** Debug mode */
  debug: z.boolean().default(false),
});

export type AuthShellConfig = z.infer<typeof AuthShellConfigSchema>;

// ─── Auth State ─────────────────────────────────────────────

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: Record<string, unknown> | null;
  loading: boolean;
}

// ─── Auth Shell ─────────────────────────────────────────────

export class AuthShell {
  private config: AuthShellConfig;
  private store;
  private logger: Logger;

  constructor(config: Partial<AuthShellConfig> = {}) {
    this.config = validateConfig(AuthShellConfigSchema, config, 'AuthShell');
    this.logger = createLogger('AuthShell', this.config.debug ? 'debug' : 'warn');

    this.store = createStore<AuthState>(
      {
        isAuthenticated: false,
        token: null,
        user: null,
        loading: true,
      },
      { name: 'AuthShell', debug: this.config.debug },
    );
  }

  /** Get current auth state */
  getState(): Readonly<AuthState> {
    return this.store.getState();
  }

  /** Check if user is authenticated */
  get isAuthenticated(): boolean {
    return this.store.getState().isAuthenticated;
  }

  /** Get current token */
  getToken(): string | null {
    if (this.config.getToken) {
      return this.config.getToken() as string | null;
    }
    return resolveToken();
  }

  /** Get current user */
  getUser(): Record<string, unknown> | null {
    if (this.config.getUser) {
      return this.config.getUser() as Record<string, unknown> | null;
    }
    return resolveCurrentUser();
  }

  /** Check and update auth state */
  checkAuthState(): void {
    const token = this.getToken();
    const user = this.getUser();
    const isAuthenticated = !!token && !!user;

    this.store.setState({
      isAuthenticated,
      token,
      user,
      loading: false,
    });

    const bus = getGlobalEventBus();
    bus.emit('auth:stateChange', { isAuthenticated, user });

    this.logger.debug('Auth state checked:', { isAuthenticated, hasToken: !!token });
  }

  /** Redirect to login page */
  redirectToLogin(returnUrl?: string): void {
    const url = new URL(this.config.loginUrl);
    if (returnUrl) {
      url.searchParams.set('redirect', returnUrl);
    } else if (typeof window !== 'undefined') {
      url.searchParams.set('redirect', window.location.href);
    }
    window.location.href = url.toString();
  }

  /** Handle logout */
  logout(): void {
    // Clear tokens
    if (typeof localStorage !== 'undefined') {
      for (const key of ['jwt_token', 'authToken', 'token', 'user']) {
        localStorage.removeItem(key);
      }
    }

    // Clear cookies
    if (typeof document !== 'undefined') {
      for (const name of ['jwt_token', 'authToken']) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    }

    this.store.setState({
      isAuthenticated: false,
      token: null,
      user: null,
      loading: false,
    });

    const bus = getGlobalEventBus();
    bus.emit('auth:logout');

    this.logger.info('User logged out');

    if (this.config.autoRedirect) {
      window.location.href = this.config.logoutUrl;
    }
  }

  /** Subscribe to auth state changes */
  onAuthChange(listener: (state: AuthState) => void): () => void {
    return this.store.subscribe((newState) => listener(newState));
  }

  /** Initialize (check auth state and setup listeners) */
  init(): void {
    this.checkAuthState();

    // Listen for storage events (cross-tab sync)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key && ['jwt_token', 'authToken', 'token', 'user'].includes(e.key)) {
          this.checkAuthState();
        }
      });

      // Listen for QuizzmanAuth events
      window.addEventListener('auth:login', () => this.checkAuthState());
      window.addEventListener('auth:logout', () => this.logout());
    }
  }

  /** Destroy auth shell */
  destroy(): void {
    this.store.destroy();
  }
}

/** Create AuthShell as a QMF plugin */
export function createAuthShellPlugin(config?: Partial<AuthShellConfig>): QMFPlugin {
  const authShell = new AuthShell(config);

  return {
    name: 'auth-shell',
    version: '3.0.0',
    hooks: {
      onInit: () => authShell.init(),
      onDestroy: () => authShell.destroy(),
    },
    setup: (ctx) => {
      ctx.expose('instance', authShell);
      ctx.expose('getToken', () => authShell.getToken());
      ctx.expose('getUser', () => authShell.getUser());
      ctx.expose('isAuthenticated', () => authShell.isAuthenticated);
    },
  };
}

export { AuthShell as default };
