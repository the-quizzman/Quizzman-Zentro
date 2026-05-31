/**
 * QMF HTTP Client
 * Centralized HTTP adapter with auth injection, retry, and timeout
 * @module kernel/http
 */

import { eventBus } from './event-bus.js';
import { stateManager } from './state.js';

/**
 * HTTP Client class
 */
class HttpClient {
    constructor() {
        this.config = {
            timeout: 30000,
            retries: 3,
            retryDelay: 1000,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        this.interceptors = {
            request: [],
            response: []
        };
    }

    /**
     * Configure HTTP client
     */
    configure(options) {
        this.config = { ...this.config, ...options };
    }

    /**
     * Add request interceptor
     */
    addRequestInterceptor(fn) {
        this.interceptors.request.push(fn);
        return () => {
            const idx = this.interceptors.request.indexOf(fn);
            if (idx > -1) this.interceptors.request.splice(idx, 1);
        };
    }

    /**
     * Add response interceptor
     */
    addResponseInterceptor(fn) {
        this.interceptors.response.push(fn);
        return () => {
            const idx = this.interceptors.response.indexOf(fn);
            if (idx > -1) this.interceptors.response.splice(idx, 1);
        };
    }

    /**
     * Apply request interceptors
     */
    async applyRequestInterceptors(config) {
        let result = config;
        for (const interceptor of this.interceptors.request) {
            result = await interceptor(result);
        }
        return result;
    }

    /**
     * Apply response interceptors
     */
    async applyResponseInterceptors(response, config) {
        let result = response;
        for (const interceptor of this.interceptors.response) {
            result = await interceptor(result, config);
        }
        return result;
    }

    /**
     * Get auth token from state
     */
    getAuthToken() {
        const auth = stateManager.get('auth');
        return auth?.token || null;
    }

    /**
     * Create fetch request with timeout
     */
    async fetchWithTimeout(url, options, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            return response;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Main request method
     */
    async request(url, options = {}) {
        // Build config
        let config = {
            url,
            method: options.method || 'GET',
            headers: { ...this.config.headers, ...options.headers },
            body: options.body,
            credentials: options.credentials || 'include',
            timeout: options.timeout || this.config.timeout,
            retries: options.retries ?? this.config.retries
        };

        // Inject auth token
        const token = this.getAuthToken();
        if (token && !config.headers['Authorization']) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        // Apply request interceptors
        config = await this.applyRequestInterceptors(config);

        // Prepare fetch options
        const fetchOptions = {
            method: config.method,
            headers: config.headers,
            credentials: config.credentials
        };

        if (config.body && config.method !== 'GET') {
            fetchOptions.body = typeof config.body === 'string' 
                ? config.body 
                : JSON.stringify(config.body);
        }

        // Retry logic
        let lastError;
        for (let attempt = 0; attempt <= config.retries; attempt++) {
            try {
                const response = await this.fetchWithTimeout(
                    config.url, 
                    fetchOptions, 
                    config.timeout
                );

                // Apply response interceptors
                const processedResponse = await this.applyResponseInterceptors(response, config);

                // Handle errors
                if (!processedResponse.ok) {
                    const error = new Error(`HTTP ${processedResponse.status}`);
                    error.status = processedResponse.status;
                    error.response = processedResponse;

                    // Handle 401 - emit auth error
                    if (processedResponse.status === 401) {
                        eventBus.emit('auth:error', { status: 401, url: config.url });
                    }

                    throw error;
                }

                // Parse response
                const contentType = processedResponse.headers.get('content-type');
                if (contentType?.includes('application/json')) {
                    return await processedResponse.json();
                }
                return await processedResponse.text();

            } catch (error) {
                lastError = error;

                // Don't retry on abort or auth errors
                if (error.name === 'AbortError' || error.status === 401) {
                    throw error;
                }

                // Wait before retry
                if (attempt < config.retries) {
                    await new Promise(r => setTimeout(r, this.config.retryDelay * (attempt + 1)));
                }
            }
        }

        throw lastError;
    }

    /**
     * GET request
     */
    get(url, options = {}) {
        return this.request(url, { ...options, method: 'GET' });
    }

    /**
     * POST request
     */
    post(url, body, options = {}) {
        return this.request(url, { ...options, method: 'POST', body });
    }

    /**
     * PUT request
     */
    put(url, body, options = {}) {
        return this.request(url, { ...options, method: 'PUT', body });
    }

    /**
     * PATCH request
     */
    patch(url, body, options = {}) {
        return this.request(url, { ...options, method: 'PATCH', body });
    }

    /**
     * DELETE request
     */
    delete(url, options = {}) {
        return this.request(url, { ...options, method: 'DELETE' });
    }
}

// Singleton instance
export const httpClient = new HttpClient();

// Setup default auth interceptor
httpClient.addResponseInterceptor(async (response, config) => {
    // Handle token refresh on 401
    if (response.status === 401) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            // Retry original request with new token
            return httpClient.request(config.url, config);
        }
    }
    return response;
});

/**
 * Try to refresh auth token
 */
async function tryRefreshToken() {
    try {
        const auth = stateManager.get('auth');
        if (!auth?.refreshToken) return false;

        const response = await fetch('https://id.quizzman.com/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: auth.refreshToken })
        });

        if (response.ok) {
            const data = await response.json();
            stateManager.set('auth', { ...auth, token: data.token });
            eventBus.emit('auth:token-refresh', data);
            return true;
        }
    } catch (e) {
        // Silent fail
    }
    return false;
}
