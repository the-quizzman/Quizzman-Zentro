export const AUTH_SESSION_TOKEN = 'svc:auth.session';

/**
 * Example service — DI token svc:auth.session
 */
export class AuthService {
  /**
   * @param {{ get: (url: string) => Promise<unknown> }} http
   * @param {string} apiEndpoint
   */
  constructor(http, apiEndpoint) {
    this.http = http;
    this.apiEndpoint = apiEndpoint;
  }

  async fetchSession() {
    try {
      const data = await this.http.get(this.apiEndpoint);
      if (!data?.id) return null;
      return { userId: data.id, tier: data.tier ?? 'free' };
    } catch {
      return null;
    }
  }
}

/**
 * @param {import('@qmf/core').PluginContext} ctx
 * @param {string} apiEndpoint
 */
export function registerAuthServices(ctx, apiEndpoint) {
  ctx.container.registerFactory(AUTH_SESSION_TOKEN, (c) => {
    const http = c.resolve('http');
    return new AuthService(http, apiEndpoint);
  });
}
