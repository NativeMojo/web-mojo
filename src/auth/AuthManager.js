/**
 * AuthManager - Simplified authentication state management for MOJO Framework
 * Handles auth state, integrates with AuthService and TokenManager, supports plugins
 */

import TokenManager from './TokenManager.js';

export default class AuthManager {
    constructor(app, config = {}) {
        this.app = app;
        this.config = {
            autoRefresh: true,
            refreshThreshold: 5, // minutes before expiry
            plugins: {},
            ...config
        };

        // Core services
        this.tokenManager = new TokenManager();

        // Auth state
        this.isAuthenticated = false;
        this.user = null;
        this.refreshTimer = null;

        // Plugin registry
        this.plugins = new Map();

        // Initialize
        this.initialize();
    }

    /**
     * Initialize auth manager
     */
    initialize() {
        // Check for existing valid session
        this.checkAuthState();

        // Set up auto-refresh if enabled
        if (this.config.autoRefresh) {
            this.scheduleTokenRefresh();
        }

        // Make auth manager available to app
        if (this.app) {
            this.app.auth = this;
        }
    }

    /**
     * Check current authentication state from stored tokens
     */
    checkAuthState() {
        if (this.tokenManager.isValid()) {
            const userInfo = this.tokenManager.getUserInfo();
            if (userInfo) {
                this.setAuthState(userInfo);
                return true;
            }
        }

        this.clearAuthState();
        return false;
    }

    /**
     * Login with username/email and password
     * @param {string} username - Username or email
     * @param {string} password - Password
     * @param {boolean} rememberMe - Persist session
     * @returns {Promise<object>} Login result
     */
    async login(username, password, rememberMe = true) {
        const response = await this.app.rest.POST('/api/login', { username, password });

        if (response.success && response.data.status) {
            const { access_token, refresh_token, user } = response.data.data;

            // Store tokens
            this.tokenManager.setTokens(access_token, refresh_token, rememberMe);

            // Set auth state
            const userInfo = this.tokenManager.getUserInfo();
            this.setAuthState({ ...user, ...userInfo });

            // Schedule refresh
            if (this.config.autoRefresh) {
                this.scheduleTokenRefresh();
            }

            this.emit('login', this.user);
            return { success: true, user: this.user };
        }

        const message = response.data?.error || response.message || 'Login failed. Please try again.';
        this.emit('loginError', { message });
        return { success: false, message };
    }

    /**
     * Register new user
     * @param {object} userData - Registration data
     * @returns {Promise<object>} Registration result
     */
    async register(userData) {
        const response = await this.app.rest.POST('/api/register', userData);

        if (response.success && response.data.status) {
            const { token, refreshToken, user } = response.data.data;

            // Store tokens
            this.tokenManager.setTokens(token, refreshToken, true);

            // Set auth state
            const userInfo = this.tokenManager.getUserInfo();
            this.setAuthState({ ...user, ...userInfo });

            // Schedule refresh
            if (this.config.autoRefresh) {
                this.scheduleTokenRefresh();
            }

            this.emit('register', this.user);
            return { success: true, user: this.user };
        }

        const message = response.data?.error || response.message || 'Registration failed.';
        this.emit('registerError', { message });
        return { success: false, message };
    }

    /**
     * Logout current user
     */
    async logout() {
        try {
            const token = this.tokenManager.getToken();
            if (token) {
                // Call logout API but don't block logout on failure
                this.app.rest.POST('/api/auth/logout').catch(err => {
                    console.warn('Server logout failed, proceeding with local logout.', err);
                });
            }
        } finally {
            this.clearAuthState();
            this.emit('logout');
        }
    }

    /**
     * Refresh access token
     * @returns {Promise<boolean>} Success status
     */
    async refreshToken() {
        const refreshToken = this.tokenManager.getRefreshToken();
        if (!refreshToken) {
            this.clearAuthState();
            this.emit('tokenExpired');
            return false;
        }

        const response = await this.app.rest.POST('/api/auth/token/refresh', { refreshToken });

        if (response.success && response.data.status) {
            const { token, refreshToken: newRefreshToken } = response.data.data;

            // Determine persistence from current storage
            const isPersistent = !!localStorage.getItem(this.tokenManager.tokenKey);

            // Store new tokens
            this.tokenManager.setTokens(token, newRefreshToken, isPersistent);

            // Update user info
            const userInfo = this.tokenManager.getUserInfo();
            if (userInfo) {
                this.user = { ...this.user, ...userInfo };
            }

            // Schedule next refresh
            this.scheduleTokenRefresh();

            this.emit('tokenRefreshed');
            return true;
        }

        console.error('Token refresh failed:', response.data?.error || response.message);
        this.clearAuthState();
        this.emit('tokenExpired');
        return false;
    }

    /**
     * Set authentication state
     * @param {object} user - User data
     */
    setAuthState(user) {
        this.isAuthenticated = true;
        this.user = user;

        if (this.app?.setState) {
            this.app.setState('auth', {
                isAuthenticated: true,
                user: user
            });
        }
    }

    /**
     * Clear authentication state
     */
    clearAuthState() {
        this.isAuthenticated = false;
        this.user = null;
        this.tokenManager.clearTokens();

        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }

        if (this.app?.setState) {
            this.app.setState('auth', {
                isAuthenticated: false,
                user: null
            });
        }
    }

    /**
     * Schedule automatic token refresh
     */
    scheduleTokenRefresh() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        if (!this.tokenManager.isValid()) {
            return;
        }

        if (this.tokenManager.isExpiringSoon(this.config.refreshThreshold)) {
            // Token expires soon, refresh immediately
            this.refreshToken();
            return;
        }

        // Schedule refresh before expiry
        const token = this.tokenManager.getToken();
        const payload = this.tokenManager.decode(token);
        if (payload?.exp) {
            const now = Math.floor(Date.now() / 1000);
            const timeUntilRefresh = (payload.exp - now - (this.config.refreshThreshold * 60)) * 1000;

            if (timeUntilRefresh > 0) {
                this.refreshTimer = setTimeout(() => {
                    this.refreshToken();
                }, timeUntilRefresh);
            }
        }
    }

    /**
     * Register a plugin
     * @param {string} name - Plugin name
     * @param {object} plugin - Plugin instance
     */
    registerPlugin(name, plugin) {
        this.plugins.set(name, plugin);
        plugin.initialize(this, this.app);
    }

    /**
     * Get a plugin by name
     * @param {string} name - Plugin name
     * @returns {object|null} Plugin instance
     */
    getPlugin(name) {
        return this.plugins.get(name) || null;
    }

    /**
     * Request password reset
     * @param {string} email - User email
     * @returns {Promise<object>} Request result
     */
    async forgotPassword(email, method = 'code') {
        const response = await this.app.rest.POST('/api/auth/forgot', { email, method });

        if (response.success && response.data.status) {
            this.emit('forgotPasswordSuccess', { email, method });
            return { success: true, message: response.data.data?.message };
        }

        const message = response.data?.error || response.message || 'Failed to process request.';
        this.emit('forgotPasswordError', { message });
        return { success: false, message };
    }

    /**
     * Reset password with a token from an email link
     * @param {string} token - Reset token
     * @param {string} newPassword - New password
     * @returns {Promise<object>} Reset result
     */
    async resetPasswordWithToken(token, newPassword) {
        const payload = {
            token: token,
            new_password: newPassword
        };
        const response = await this.app.rest.POST('/api/auth/password/reset/token', payload);

        if (response.success && response.data.status) {
            this.emit('resetPasswordSuccess');
            return { success: true, message: response.data.data?.message };
        }

        const message = response.data?.error || response.message || 'Failed to reset password.';
        this.emit('resetPasswordError', { message });
        return { success: false, message };
    }

    /**
     * Reset password with an email and code
     * @param {string} email - User's email
     * @param {string} code - The verification code
     * @param {string} newPassword - New password
     * @returns {Promise<object>} Reset result
     */
    async resetPasswordWithCode(email, code, newPassword) {
        const payload = {
            email: email,
            code: code,
            new_password: newPassword
        };
        const response = await this.app.rest.POST('/api/auth/password/reset/code', payload);

        if (response.success && response.data.status) {
            this.emit('resetPasswordSuccess');
            return { success: true, message: response.data.data?.message };
        }

        const message = response.data?.error || response.message || 'Failed to reset password.';
        this.emit('resetPasswordError', { message });
        return { success: false, message };
    }

    /**
     * Get authorization header for API requests
     * @returns {string|null} Authorization header
     */
    getAuthHeader() {
        return this.tokenManager.getAuthHeader();
    }

    /**
     * Emit event to app
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.app?.events?.emit) {
            this.app.events.emit(`auth:${event}`, data);
        }
    }

    /**
     * Cleanup auth manager
     */
    destroy() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        this.plugins.forEach(plugin => {
            if (plugin.destroy) {
                plugin.destroy();
            }
        });

        this.plugins.clear();
    }
}
