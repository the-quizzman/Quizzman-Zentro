export const DICT_SEARCH_TOKEN = 'svc:dictionary.search';

export class DictionarySearchService {
  /**
   * @param {{ get: (url: string) => Promise<unknown> }} http
   * @param {string} apiBase
   */
  constructor(http, apiBase) {
    this.http = http;
    this.apiBase = apiBase;
  }

  /** @param {string} keyword */
  async search(keyword) {
    const data = await this.http.get(
      `${this.apiBase}/search?q=${encodeURIComponent(keyword)}`,
    );
    return data?.items ?? [];
  }
}

/**
 * @param {import('@qmf/core').PluginContext} ctx
 * @param {string} apiBase
 */
export function registerDictionaryServices(ctx, apiBase) {
  ctx.container.registerFactory(DICT_SEARCH_TOKEN, (c) => {
    const http = c.resolve('http');
    return new DictionarySearchService(http, apiBase);
  });
}
