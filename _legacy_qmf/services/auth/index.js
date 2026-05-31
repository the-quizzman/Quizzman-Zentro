/**
 * QMF Auth Service Adapter
 * Connects to id-sys for authentication
 * @version 1.0.0
 */

import { eventBus } from '../../kernel/event-bus.js';
import { context } from '../../kernel/context.js';

/**
 * Auth state
 */
const AuthState = {
    UNKNOWN: 'unknown',
    AUTHENTICATED: 'authenticated',
    UNAUTHENTICATED: 'unauthenticated',
    LOADING: 'loading'
};

/**
 * Auth Service
 * Provides mechanism, not business rules
 * App provides auth adapter with token source, refresh, login URL
 */
class AuthService {
    constructor() {
        this.state = AuthState.UNKNOWN;
        this.user = null;
        this.token = null;
        this.refreshToken = null;
        this.config = null;
        this.refreshTimer = null;
    }
    
    /**
     * Initialize auth service with app-specific config
     * @param {Object} config
     * @param {string} config.idSysUrl - ID-Sys base URL
     * @param {string} config.loginUrl - Login page URL
     * @param {string} config.logoutUrl - Logout endpoint
     * @param {Function} config.getToken - Custom token getter
     * @param {Function} config.onAuthChange - Callback on auth state change
     */
    init(config = {}) {
        this.config = {
            idSysUrl: config.idSysUrl || 'https://id.quizzman.com',
            loginUrl: config.loginUrl || 'https://id.quizzman.com/login',
            logoutUrl: config.logoutUrl || 'https://id.quizzman.com/api/logout',
            tokenKey: config.tokenKey || 'authToken',
            refreshTokenKey: config.refreshTokenKey || 'refreshToken',
            userKey: config.userKey || 'currentUser',
            getToken: config.getToken || null,
            onAuthChange: config.onAuthChange || null,
            autoRefresh: config.autoRefresh !== false,
            refreshThreshold: config.refreshThreshold || 5 * 60 * 1000 // 5 minutes before expiry
        };
        
        // Load from storage
        this.loadFromStorage();
        
        // Setup auto-refresh
        if (this.config.autoRefresh && this.token) {
            this.setupAutoRefresh();
        }
        
        // Listen for storage changes (cross-tab sync)
        window.addEventListener('storage', this.handleStorageChange.bind(this));
        
        eventBus.emit('auth:initialized');
    }
    
    /**
     * Load auth data from storage
     */
    loadFromStorage() {
        try {
            // Token
            this.token = localStorage.getItem(this.config.tokenKey);
            this.refreshToken = localStorage.getItem(this.config.refreshTokenKey);
            
            // User
            const userJson = localStorage.getItem(this.config.userKey);
            if (userJson) {
                this.user = JSON.parse(userJson);
            }
            
            // Update state
            if (this.token && this.user) {
                this.state = AuthState.AUTHENTICATED;
                context.set('user', this.user);
                context.set('isAuthenticated', true);
            } else {
                this.state = AuthState.UNAUTHENTICATED;
                context.set('user', null);
                context.set('isAuthenticated', false);
            }
        } catch (error) {
            console.error('[Auth] Error loading from storage:', error);
            this.state = AuthState.UNAUTHENTICATED;
        }
    }
    
    /**
     * Handle storage changes from other tabs
     */
    handleStorageChange(event) {
        if (event.key === this.config.tokenKey) {
            if (event.newValue) {
                this.token = event.newValue;
                this.loadFromStorage();
                eventBus.emit('auth:token-updated');
            } else {
                // Token removed (logged out in another tab)
                this.handleLogout(false);
            }
        }
    }
    
    /**
     * Get current token
     */
    getToken() {
        // Custom getter takes priority
        if (this.config?.getToken) {
            return this.config.getToken();
        }
        return this.token;
    }
    
    /**
     * Check if authenticated
     */
    isAuthenticated() {
        return this.state === AuthState.AUTHENTICATED && !!this.token;
    }
    
    /**
     * Get current user
     */
    getUser() {
        return this.user;
    }
    
    /**
     * Get user ID
     */
    getUserId() {
        return this.user?.id || this.user?.user_id || null;
    }
    
    /**
     * Login - redirect to ID-Sys
     * @param {string} returnUrl - URL to return after login
     */
    login(returnUrl = null) {
        const currentUrl = returnUrl || window.location.href;
        const loginUrl = new URL(this.config.loginUrl);
        loginUrl.searchParams.set('redirect_uri', currentUrl);
        window.location.href = loginUrl.toString();
    }
    
    /**
     * Handle login callback (after redirect from ID-Sys)
     * @param {Object} authData
     * @param {string} authData.token - Access token
     * @param {string} authData.refreshToken - Refresh token
     * @param {Object} authData.user - User object
     */
    handleLoginCallback(authData) {
        const { token, refreshToken, user } = authData;
        
        // Store tokens
        this.token = token;
        this.refreshToken = refreshToken;
        this.user = user;
        
        localStorage.setItem(this.config.tokenKey, token);
        if (refreshToken) {
            localStorage.setItem(this.config.refreshTokenKey, refreshToken);
        }
        localStorage.setItem(this.config.userKey, JSON.stringify(user));
        
        // Update state
        this.state = AuthState.AUTHENTICATED;
        context.set('user', user);
        context.set('isAuthenticated', true);
        
        // Setup auto-refresh
        if (this.config.autoRefresh) {
            this.setupAutoRefresh();
        }
        
        // Emit events
        eventBus.emit('auth:login', { user });
        if (this.config.onAuthChange) {
            this.config.onAuthChange(true, user);
        }
    }
    
    /**
     * Logout
     * @param {boolean} callServer - Whether to call server logout endpoint
     */
    async logout(callServer = true) {
        if (callServer && this.token) {
            try {
                await fetch(this.config.logoutUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.warn('[Auth] Logout API error:', error);
            }
        }
        
        this.handleLogout(true);
    }
    
    /**
     * Handle logout cleanup
     */
    handleLogout(emitEvent = true) {
        // Clear tokens
        this.token = null;
        this.refreshToken = null;
        this.user = null;
        
        // Clear storage
        localStorage.removeItem(this.config.tokenKey);
        localStorage.removeItem(this.config.refreshTokenKey);
        localStorage.removeItem(this.config.userKey);
        
        // Update state
        this.state = AuthState.UNAUTHENTICATED;
        context.set('user', null);
        context.set('isAuthenticated', false);
        
        // Clear refresh timer
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        // Emit events
        if (emitEvent) {
            eventBus.emit('auth:logout');
            if (this.config.onAuthChange) {
                this.config.onAuthChange(false, null);
            }
        }
    }
    
    /**
     * Refresh token
     */
    async refreshAccessToken() {
        if (!this.refreshToken) {
            console.warn('[Auth] No refresh token available');
            return false;
        }
        
        try {
            const response = await fetch(`${this.config.idSysUrl}/api/token/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh_token: this.refreshToken
                })
            });
            
            if (!response.ok) {
                throw new Error('Token refresh failed');
            }
            
            const data = await response.json();
            
            // Update token
            this.token = data.token || data.access_token;
            localStorage.setItem(this.config.tokenKey, this.token);
            
            if (data.refresh_token) {
                this.refreshToken = data.refresh_token;
                localStorage.setItem(this.config.refreshTokenKey, this.refreshToken);
            }
            
            eventBus.emit('auth:token-refreshed');
            return true;
        } catch (error) {
            console.error('[Auth] Token refresh error:', error);
            eventBus.emit('auth:refresh-failed');
            return false;
        }
    }
    
    /**
     * Setup auto-refresh timer
     */
    setupAutoRefresh() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        
        // Decode token to get expiry
        try {
            const payload = JSON.parse(atob(this.token.split('.')[1]));
            const expiresAt = payload.exp * 1000;
            const refreshAt = expiresAt - this.config.refreshThreshold;
            const now = Date.now();
            
            if (refreshAt > now) {
                const delay = refreshAt - now;
                this.refreshTimer = setTimeout(() => {
                    this.refreshAccessToken();
                }, delay);
            } else {
                // Token about to expire, refresh now
                this.refreshAccessToken();
            }
        } catch (error) {
            console.warn('[Auth] Cannot decode token for auto-refresh');
        }
    }
    
    /**
     * Verify current token with server
     */
    async verifyToken() {
        if (!this.token) return false;
        
        try {
            const response = await fetch(`${this.config.idSysUrl}/api/verify`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            return response.ok;
        } catch (error) {
            console.error('[Auth] Token verification error:', error);
            return false;
        }
    }
    
    /**
     * Get auth headers for API requests
     */
    getAuthHeaders() {
        if (!this.token) return {};
        
        return {
            'Authorization': `Bearer ${this.token}`
        };
    }
}

// Singleton instance
export const authService = new AuthService();

export { AuthState };
export default authService;
