/**
 * @qmf/core - HTTP Client
 * Lightweight fetch wrapper with interceptors, retry, and auth integration.
 */

export interface HttpRequestConfig extends RequestInit {
  /** Request URL */
  url: string;
  /** URL query parameters */
  params?: Record<string, string | number | boolean>;
  /** Request timeout in ms */
  timeout?: number;
  /** Number of retry attempts on failure */
  retries?: number;
  /** Retry delay in ms (doubled each attempt) */
  retryDelay?: number;
  /** Skip auth header injection */
  skipAuth?: boolean;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  ok: boolean;
}

export type HttpInterceptor = (config: HttpRequestConfig) => HttpRequestConfig | Promise<HttpRequestConfig>;
export type HttpResponseInterceptor = (response: HttpResponse) => HttpResponse | Promise<HttpResponse>;
export type HttpErrorInterceptor = (error: HttpError) => void | Promise<void>;

export class HttpError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly data: unknown;
  public readonly url: string;

  constructor(response: Response, data: unknown) {
    super(`HTTP ${response.status}: ${response.statusText}`);
    this.name = 'HttpError';
    this.status = response.status;
    this.statusText = response.statusText;
    this.data = data;
    this.url = response.url;
  }
}

export interface HttpClientOptions {
  /** Base URL prepended to all requests */
  baseUrl?: string;
  /** Default timeout in ms */
  timeout?: number;
  /** Default retry count */
  retries?: number;
  /** Token getter for auth header */
  getToken?: () => string | null | Promise<string | null>;
  /** Debug mode */
  debug?: boolean;
}

export class HttpClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultRetries: number;
  private getToken?: () => string | null | Promise<string | null>;
  private debug: boolean;

  private requestInterceptors: HttpInterceptor[] = [];
  private responseInterceptors: HttpResponseInterceptor[] = [];
  private errorInterceptors: HttpErrorInterceptor[] = [];

  constructor(options: HttpClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? '';
    this.defaultTimeout = options.timeout ?? 30000;
    this.defaultRetries = options.retries ?? 0;
    this.getToken = options.getToken;
    this.debug = options.debug ?? false;
  }

  /** Add a request interceptor */
  useRequestInterceptor(interceptor: HttpInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const idx = this.requestInterceptors.indexOf(interceptor);
      if (idx !== -1) this.requestInterceptors.splice(idx, 1);
    };
  }

  /** Add a response interceptor */
  useResponseInterceptor(interceptor: HttpResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const idx = this.responseInterceptors.indexOf(interceptor);
      if (idx !== -1) this.responseInterceptors.splice(idx, 1);
    };
  }

  /** Add an error interceptor */
  useErrorInterceptor(interceptor: HttpErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const idx = this.errorInterceptors.indexOf(interceptor);
      if (idx !== -1) this.errorInterceptors.splice(idx, 1);
    };
  }

  async get<T = unknown>(url: string, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  async post<T = unknown>(url: string, body?: unknown, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers: { 'Content-Type': 'application/json', ...config?.headers },
    });
  }

  async put<T = unknown>(url: string, body?: unknown, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers: { 'Content-Type': 'application/json', ...config?.headers },
    });
  }

  async delete<T = unknown>(url: string, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }

  async request<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    let resolvedConfig = { ...config };

    // Run request interceptors
    for (const interceptor of this.requestInterceptors) {
      resolvedConfig = await interceptor(resolvedConfig);
    }

    // Build URL
    let url = resolvedConfig.url.startsWith('http')
      ? resolvedConfig.url
      : `${this.baseUrl}${resolvedConfig.url}`;

    if (resolvedConfig.params) {
      const params = new URLSearchParams();
      for (const [key, val] of Object.entries(resolvedConfig.params)) {
        params.set(key, String(val));
      }
      url += `?${params.toString()}`;
    }

    // Inject auth token
    if (!resolvedConfig.skipAuth && this.getToken) {
      const token = await this.getToken();
      if (token) {
        resolvedConfig.headers = {
          ...resolvedConfig.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    const timeout = resolvedConfig.timeout ?? this.defaultTimeout;
    const retries = resolvedConfig.retries ?? this.defaultRetries;

    if (this.debug) {
      console.debug(`[QMF:HTTP] ${resolvedConfig.method ?? 'GET'} ${url}`);
    }

    return this.fetchWithRetry<T>(url, resolvedConfig, timeout, retries, resolvedConfig.retryDelay ?? 1000);
  }

  private async fetchWithRetry<T>(
    url: string,
    config: HttpRequestConfig,
    timeout: number,
    retries: number,
    retryDelay: number,
    attempt = 0,
  ): Promise<HttpResponse<T>> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timer);

      const data = await this.parseResponse<T>(response);

      if (!response.ok) {
        throw new HttpError(response, data);
      }

      let result: HttpResponse<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        ok: response.ok,
      };

      // Run response interceptors
      for (const interceptor of this.responseInterceptors) {
        result = (await interceptor(result as HttpResponse)) as HttpResponse<T>;
      }

      return result;
    } catch (err) {
      if (err instanceof HttpError) {
        for (const interceptor of this.errorInterceptors) {
          await interceptor(err);
        }
      }

      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelay * (attempt + 1)));
        return this.fetchWithRetry<T>(url, config, timeout, retries, retryDelay, attempt + 1);
      }

      throw err;
    }
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>;
    }
    return response.text() as unknown as T;
  }
}

/**
 * Create an HTTP client instance.
 */
export function createHttpClient(options?: HttpClientOptions): HttpClient {
  return new HttpClient(options);
}
