/**
 * AuthManager - Main authentication orchestrator for MOJO Framework
 * Manages authentication flow, token handling, and auth state
 */

import AuthService from '../services/AuthService.js';
import JWTUtils from '../utils/JWTUtils.js';

export default class AuthManager {
    constructor(app, config = {}) {
        this.app = app;
        this.config = {
            // Default configuration
            enablePasskeys: false,
            enableGoogleAuth: false,
            enableRememberMe: true,
            enableForgotPassword: true,
            termsUrl: null,
            privacyUrl: null,
            logoUrl: '/assets/logo.png',
            appName: app.name || 'MOJO App',
            loginRedirect: '/',
            logoutRedirect: '/login',
            tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
            autoRefreshTokens: true,
            persistSession: true,
            customStyles: {},
            messages: {
                loginTitle: 'Welcome Back',
                loginSubtitle: 'Sign in to your account',
                registerTitle: 'Create Account',
                registerSubtitle: 'Join us today',
                forgotTitle: 'Reset Password',
                forgotSubtitle: 'We\'ll send you reset instructions',
                resetTitle: 'Set New Password',
                resetSubtitle: 'Choose a strong password'
            },
            ...config
        };

        // Initialize services
        this.authService = new AuthService(app);
        this.jwtUtils = new JWTUtils();
        
        // Auth state
        this.currentUser = null;
        this.isAuthenticated = false;
        this.refreshTimer = null;

        // Bind methods
        this.login = this.login.bind(this);
        this.logout = this.logout.bind(this);
        this.register = this.register.bind(this);
        this.forgotPassword = this.forgotPassword.bind(this);
        this.resetPassword = this.resetPassword.bind(this);
        this.loginWithPasskey = this.loginWithPasskey.bind(this);
        this.loginWithGoogle = this.loginWithGoogle.bind(this);
        this.refreshToken = this.refreshToken.bind(this);
        this.checkAuth = this.checkAuth.bind(this);

        // Initialize on app start
        this.initialize();
    }

    /**
     * Initialize auth manager
     */
    initialize() {
        // Check for existing session
        this.checkAuth();

        // Set up token refresh if enabled
        if (this.config.autoRefreshTokens) {
            this.setupTokenRefresh();
        }

        // Listen for auth events
        this.setupEventListeners();

        // Make auth manager globally available
        if (this.app) {
            this.app.auth = this;
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        if (!this.app?.eventBus) return;

        // Listen for auth required events
        this.app.eventBus.on('auth:required', () => {
            this.redirectToLogin();
        });

        // Listen for token expired events
        this.app.eventBus.on('auth:token-expired', () => {
            this.handleTokenExpired();
        });
    }

    /**
     * Check current authentication status
     * @returns {boolean} True if authenticated
     */
    checkAuth() {
        const token = this.jwtUtils.getToken();
        
        if (!token) {
            this.clearAuth();
            return false;
        }

        // Check if token is valid and not expired
        if (!this.jwtUtils.isValidStructure(token) || this.jwtUtils.isExpired(token)) {
            this.clearAuth();
            return false;
        }

        // Extract user info from token
        const userInfo = this.jwtUtils.getUserInfo(token);
        if (userInfo) {
            this.setAuth(userInfo, token);
            return true;
        }

        this.clearAuth();
        return false;
    }

    /**
     * Login with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {boolean} rememberMe - Whether to persist session
     * @returns {Promise<object>} Login result
     */
    async login(email, password, rememberMe = false) {
        try {
            // Call auth service
            const response = await this.authService.login(email, password);

            if (!response.success) {
                throw new Error(response.message || 'Login failed');
            }

            const { token, refreshToken, user } = response.data;

            // Store tokens
            this.jwtUtils.storeTokens(token, refreshToken, rememberMe);

            // Set auth state
            const userInfo = this.jwtUtils.getUserInfo(token);
            this.setAuth({ ...user, ...userInfo }, token, refreshToken);

            // Emit success event
            this.app?.eventBus?.emit('auth:login-success', this.currentUser);

            return {
                success: true,
                user: this.currentUser
            };
        } catch (error) {
            console.error('Login error:', error);
            this.app?.eventBus?.emit('auth:login-failed', error);
            throw error;
        }
    }

    /**
     * Register new user
     * @param {object} userData - User registration data
     * @returns {Promise<object>} Registration result
     */
    async register(userData) {
        try {
            // Call auth service (assuming it has a register method)
            const response = await this.authService.register(userData);

            if (!response.success) {
                throw new Error(response.message || 'Registration failed');
            }

            const { token, refreshToken, user } = response.data;

            // Store tokens
            this.jwtUtils.storeTokens(token, refreshToken, userData.rememberMe);

            // Set auth state
            const userInfo = this.jwtUtils.getUserInfo(token);
            this.setAuth({ ...user, ...userInfo }, token, refreshToken);

            // Emit success event
            this.app?.eventBus?.emit('auth:register-success', this.currentUser);

            return {
                success: true,
                user: this.currentUser
            };
        } catch (error) {
            console.error('Registration error:', error);
            this.app?.eventBus?.emit('auth:register-failed', error);
            throw error;
        }
    }

    /**
     * Login with passkey
     * @returns {Promise<object>} Login result
     */
    async loginWithPasskey() {
        if (!this.config.enablePasskeys) {
            throw new Error('Passkey authentication is not enabled');
        }

        try {
            const response = await this.authService.loginWithPasskey();

            if (!response.success) {
                throw new Error(response.message || 'Passkey authentication failed');
            }

            const { token, refreshToken, user } = response.data;

            // Store tokens (passkey login usually remembers)
            this.jwtUtils.storeTokens(token, refreshToken, true);

            // Set auth state
            const userInfo = this.jwtUtils.getUserInfo(token);
            this.setAuth({ ...user, ...userInfo }, token, refreshToken);

            // Emit success event
            this.app?.eventBus?.emit('auth:passkey-success', this.currentUser);

            return {
                success: true,
                user: this.currentUser
            };
        } catch (error) {
            console.error('Passkey login error:', error);
            this.app?.eventBus?.emit('auth:passkey-failed', error);
            throw error;
        }
    }

    /**
     * Setup passkey for current user
     * @returns {Promise<object>} Setup result
     */
    async setupPasskey() {
        if (!this.config.enablePasskeys) {
            throw new Error('Passkey authentication is not enabled');
        }

        if (!this.isAuthenticated) {
            throw new Error('User must be authenticated to setup passkey');
        }

        try {
            const response = await this.authService.setupPasskey();

            if (!response.success) {
                throw new Error(response.message || 'Passkey setup failed');
            }

            // Emit success event
            this.app?.eventBus?.emit('auth:passkey-setup-success', response.data);

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Passkey setup error:', error);
            this.app?.eventBus?.emit('auth:passkey-setup-failed', error);
            throw error;
        }
    }

    /**
     * Login with Google OAuth
     * @returns {Promise<object>} Login result
     */
    async loginWithGoogle() {
        if (!this.config.enableGoogleAuth) {
            throw new Error('Google authentication is not enabled');
        }

        try {
            // This would typically involve redirecting to Google OAuth
            // For now, we'll throw a not implemented error
            throw new Error('Google OAuth not yet implemented');
        } catch (error) {
            console.error('Google login error:', error);
            this.app?.eventBus?.emit('auth:google-failed', error);
            throw error;
        }
    }

    /**
     * Request password reset
     * @param {string} email - User email
     * @returns {Promise<object>} Request result
     */
    async forgotPassword(email) {
        try {
            const response = await this.authService.forgotPassword(email);

            if (!response.success) {
                throw new Error(response.message || 'Failed to process request');
            }

            // Emit success event
            this.app?.eventBus?.emit('auth:forgot-success', email);

            return {
                success: true,
                message: 'Password reset instructions sent to your email'
            };
        } catch (error) {
            console.error('Forgot password error:', error);
            this.app?.eventBus?.emit('auth:forgot-failed', error);
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

            if (!response.success) {
                throw new Error(response.message || 'Failed to reset password');
            }

            // Emit success event
            this.app?.eventBus?.emit('auth:reset-success');

            return {
                success: true,
                message: 'Password reset successful'
            };
        } catch (error) {
            console.error('Reset password error:', error);
            this.app?.eventBus?.emit('auth:reset-failed', error);
            throw error;
        }
    }

    /**
     * Logout current user
     * @returns {Promise<void>}
     */
    async logout() {
        try {
            const token = this.jwtUtils.getToken();
            
            // Call logout API if token exists
            if (token) {
                await this.authService.logout(token);
            }
        } catch (error) {
            console.error('Logout API error:', error);
            // Continue with local logout even if API fails
        }

        // Clear local auth state
        this.clearAuth();

        // Emit logout event
        this.app?.eventBus?.emit('auth:logout');

        // Redirect to login if configured
        if (this.config.logoutRedirect && this.app?.navigate) {
            this.app.navigate(this.config.logoutRedirect);
        }
    }

    /**
     * Refresh access token
     * @returns {Promise<object>} Refresh result
     */
    async refreshToken() {
        const refreshToken = this.jwtUtils.getRefreshToken();
        
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await this.authService.refreshToken(refreshToken);

            if (!response.success) {
                throw new Error(response.message || 'Token refresh failed');
            }

            const { token: newToken, refreshToken: newRefreshToken } = response.data;

            // Determine if we should persist
            const isPersistent = !!localStorage.getItem(this.jwtUtils.tokenKey);

            // Store new tokens
            this.jwtUtils.storeTokens(newToken, newRefreshToken, isPersistent);

            // Update auth state
            const userInfo = this.jwtUtils.getUserInfo(newToken);
            this.setAuth({ ...this.currentUser, ...userInfo }, newToken, newRefreshToken);

            // Emit refresh event
            this.app?.eventBus?.emit('auth:token-refreshed');

            return {
                success: true,
                token: newToken
            };
        } catch (error) {
            console.error('Token refresh error:', error);
            this.app?.eventBus?.emit('auth:refresh-failed', error);
            
            // Clear auth on refresh failure
            this.clearAuth();
            throw error;
        }
    }

    /**
     * Set up automatic token refresh
     */
    setupTokenRefresh() {
        // Clear any existing timer
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        const token = this.jwtUtils.getToken();
        if (!token) return;

        const timeUntilExpiry = this.jwtUtils.getTimeUntilExpiry(token);
        if (timeUntilExpiry <= 0) return;

        // Schedule refresh before token expires
        const refreshTime = Math.max(
            timeUntilExpiry - this.config.tokenRefreshThreshold,
            10000 // Minimum 10 seconds
        );

        this.refreshTimer = setTimeout(async () => {
            try {
                await this.refreshToken();
                // Set up next refresh
                this.setupTokenRefresh();
            } catch (error) {
                console.error('Auto token refresh failed:', error);
                this.handleTokenExpired();
            }
        }, refreshTime);
    }

    /**
     * Handle token expiration
     */
    handleTokenExpired() {
        this.clearAuth();
        
        // Show notification
        if (this.app?.showWarning) {
            this.app.showWarning('Your session has expired. Please login again.');
        }

        // Redirect to login
        this.redirectToLogin();
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        if (this.app?.navigate) {
            // Store current path for redirect after login
            const currentPath = window.location.pathname;
            if (currentPath && currentPath !== this.config.logoutRedirect) {
                sessionStorage.setItem('auth_redirect', currentPath);
            }

            this.app.navigate(this.config.logoutRedirect);
        }
    }

    /**
     * Set authentication state
     * @param {object} user - User data
     * @param {string} token - Access token
     * @param {string} refreshToken - Refresh token
     */
    setAuth(user, token, refreshToken = null) {
        this.currentUser = user;
        this.isAuthenticated = true;

        // Update app state
        if (this.app?.setState) {
            this.app.setState('user', user);
            this.app.setState('isAuthenticated', true);
        }

        // Set up token refresh if configured
        if (this.config.autoRefreshTokens && token) {
            this.setupTokenRefresh();
        }
    }

    /**
     * Clear authentication state
     */
    clearAuth() {
        this.currentUser = null;
        this.isAuthenticated = false;

        // Clear tokens
        this.jwtUtils.clearTokens();

        // Clear refresh timer
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }

        // Update app state
        if (this.app?.setState) {
            this.app.setState('user', null);
            this.app.setState('isAuthenticated', false);
        }
    }

    /**
     * Check if user has a specific role
     * @param {string} role - Role to check
     * @returns {boolean} True if user has role
     */
    hasRole(role) {
        const token = this.jwtUtils.getToken();
        return token ? this.jwtUtils.hasRole(token, role) : false;
    }

    /**
     * Check if user has a specific permission
     * @param {string} permission - Permission to check
     * @returns {boolean} True if user has permission
     */
    hasPermission(permission) {
        const token = this.jwtUtils.getToken();
        return token ? this.jwtUtils.hasPermission(token, permission) : false;
    }

    /**
     * Get current user
     * @returns {object|null} Current user or null
     */
    getUser() {
        return this.currentUser;
    }

    /**
     * Get authentication header
     * @returns {string|null} Bearer token or null
     */
    getAuthHeader() {
        return this.jwtUtils.getAuthHeader();
    }

    /**
     * Check if passkeys are supported
     * @returns {boolean} True if passkeys are supported
     */
    isPasskeySupported() {
        return this.config.enablePasskeys && 
               window.PublicKeyCredential !== undefined &&
               navigator.credentials !== undefined;
    }

    /**
     * Check if Google auth is enabled
     * @returns {boolean} True if Google auth is enabled
     */
    isGoogleAuthEnabled() {
        return this.config.enableGoogleAuth;
    }
}