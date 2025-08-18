/**
 * AuthManager - Simplified authentication state management for MOJO Framework
 * Handles auth state, integrates with AuthService and TokenManager, supports plugins
 */

import AuthService from '../services/AuthService.js';
import TokenManager from './TokenManager.js';

export default class AuthManager {
    constructor(app, config = {}) {
        this.app = app;
        this.config = {
            baseURL: 'http://localhost:8881',
            autoRefresh: true,
            refreshThreshold: 5, // minutes before expiry
            plugins: {},
            ...config
        };

        // Core services
        this.authService = new AuthService({
            baseURL: this.config.baseURL
        });
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
        try {
            const response = await this.authService.login(username, password);

            if (response.success) {
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

            throw new Error(response.message);
        } catch (error) {
            this.emit('loginError', error);
            throw error;
        }
    }

    /**
     * Register new user
     * @param {object} userData - Registration data
     * @returns {Promise<object>} Registration result
     */
    async register(userData) {
        try {
            const response = await this.authService.register(userData);

            if (response.success) {
                const { token, refreshToken, user } = response.data;

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

            throw new Error(response.message);
        } catch (error) {
            this.emit('registerError', error);
            throw error;
        }
    }

    /**
     * Logout current user
     */
    async logout() {
        try {
            const token = this.tokenManager.getToken();
            if (token) {
                // Call logout API (don't throw on failure)
                await this.authService.logout(token).catch(console.warn);
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
        try {
            const refreshToken = this.tokenManager.getRefreshToken();
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await this.authService.refreshToken(refreshToken);

            if (response.success) {
                const { token, refreshToken: newRefreshToken } = response.data;

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

            throw new Error(response.message);
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearAuthState();
            this.emit('tokenExpired');
            return false;
        }
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
    async forgotPassword(email) {
        try {
            const response = await this.authService.forgotPassword(email);

            if (response.success) {
                this.emit('forgotPasswordSuccess', email);
                return response;
            }

            throw new Error(response.message);
        } catch (error) {
            this.emit('forgotPasswordError', error);
            throw error;
        }
    }

    /**
     * Reset password with token
     * @param {string} token - Reset token
     * @param {string} newPassword - New password
     * @returns {Promise<object>} Reset result
     */
    async resetPassword(token, newPassword) {
        try {
            const response = await this.authService.resetPassword(token, newPassword);

            if (response.success) {
                this.emit('resetPasswordSuccess');
                return response;
            }

            throw new Error(response.message);
        } catch (error) {
            this.emit('resetPasswordError', error);
            throw error;
        }
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
