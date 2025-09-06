/**
 * MOJO Auth Extension
 * Complete authentication system for MOJO Framework
 * 
 * Features:
 * - Email/password authentication
 * - Passkey support (WebAuthn)
 * - Google OAuth (configurable)
 * - Password reset flow
 * - JWT token management
 * - Auto token refresh
 * - Remember me functionality
 * - Terms & conditions support
 */

import AuthManager from './AuthManager.js';
import LoginPage from '@core/pages/LoginPage.js';
import RegisterPage from '@core/pages/RegisterPage.js';
import ForgotPasswordPage from '@core/pages/ForgotPasswordPage.js';

/**
 * Initialize auth extension for a MOJO app
 * @param {WebApp} app - The MOJO WebApp instance
 * @param {object} config - Auth configuration options
 * @returns {AuthManager} The initialized auth manager
 */
export function initAuth(app, config = {}) {
    // Default auth configuration
    const defaultConfig = {
        // Feature flags
        enablePasskeys: false,
        enableGoogleAuth: false,
        enableRememberMe: true,
        enableForgotPassword: true,
        
        // URLs
        termsUrl: null,
        privacyUrl: null,
        logoUrl: '/assets/logo.png',
        
        // App info
        appName: app.name || 'MOJO App',
        
        // Navigation
        loginRedirect: '/',
        logoutRedirect: '/login',
        
        // Token management
        tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
        autoRefreshTokens: true,
        persistSession: true,
        
        // UI messages
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
        
        // Override with user config
        ...config
    };
    
    // Create auth manager
    const authManager = new AuthManager(app, defaultConfig);
    
    // Register auth pages with the app
    app.registerPage('login', LoginPage);
    app.registerPage('register', RegisterPage);
    app.registerPage('forgot-password', ForgotPasswordPage);
    
    // Set up auth event handlers
    setupAuthEventHandlers(app, authManager);
    
    // Return auth manager for further customization
    return authManager;
}

/**
 * Set up default auth event handlers
 * @param {WebApp} app - The MOJO WebApp instance
 * @param {AuthManager} authManager - The auth manager instance
 */
function setupAuthEventHandlers(app, authManager) {
    // Handle successful login
    app.eventBus.on('auth:login-success', (user) => {
        console.log('User logged in:', user);
        app.showSuccess(`Welcome back, ${user.name || user.email}!`);
    });
    
    // Handle failed login
    app.eventBus.on('auth:login-failed', (error) => {
        console.error('Login failed:', error);
    });
    
    // Handle successful registration
    app.eventBus.on('auth:register-success', (user) => {
        console.log('User registered:', user);
        app.showSuccess(`Welcome, ${user.name || user.email}! Your account has been created.`);
    });
    
    // Handle failed registration
    app.eventBus.on('auth:register-failed', (error) => {
        console.error('Registration failed:', error);
    });
    
    // Handle logout
    app.eventBus.on('auth:logout', () => {
        console.log('User logged out');
        app.showInfo('You have been logged out');
    });
    
    // Handle token refresh
    app.eventBus.on('auth:token-refreshed', () => {
        console.log('Token refreshed successfully');
    });
    
    // Handle token expiry
    app.eventBus.on('auth:token-expired', () => {
        console.warn('Token expired');
    });
    
    // Handle password reset success
    app.eventBus.on('auth:forgot-success', (email) => {
        console.log('Password reset requested for:', email);
    });
    
    // Handle passkey events
    app.eventBus.on('auth:passkey-success', (user) => {
        console.log('Passkey authentication successful:', user);
        app.showSuccess('Signed in with passkey');
    });
    
    app.eventBus.on('auth:passkey-setup-success', () => {
        console.log('Passkey setup successful');
        app.showSuccess('Passkey has been set up successfully');
    });
}

/**
 * Create auth routes with guards
 * Helper function to protect routes that require authentication
 * @param {WebApp} app - The MOJO WebApp instance
 * @param {array} protectedRoutes - Array of route names that require auth
 */
export function createAuthGuards(app, protectedRoutes = []) {
    // Listen for route changes
    app.eventBus.on('router:before-navigate', (routeInfo) => {
        const authManager = app.auth;
        
        if (!authManager) {
            console.warn('AuthManager not initialized');
            return;
        }
        
        // Check if route requires authentication
        if (protectedRoutes.includes(routeInfo.route)) {
            if (!authManager.isAuthenticated) {
                // Prevent navigation
                routeInfo.preventDefault();
                
                // Store intended destination
                sessionStorage.setItem('auth_redirect', routeInfo.path);
                
                // Redirect to login
                app.navigate('login');
                app.showWarning('Please login to access this page');
            }
        }
    });
}

/**
 * Quick setup function for basic auth
 * Initializes auth with sensible defaults
 * @param {WebApp} app - The MOJO WebApp instance
 * @returns {AuthManager} The initialized auth manager
 */
export function quickAuthSetup(app) {
    return initAuth(app, {
        enablePasskeys: true,
        enableGoogleAuth: false,
        enableRememberMe: true,
        enableForgotPassword: true,
        autoRefreshTokens: true,
        messages: {
            loginTitle: 'Welcome Back',
            loginSubtitle: 'Sign in to continue',
            registerTitle: 'Get Started',
            registerSubtitle: 'Create your free account',
            forgotTitle: 'Forgot Password?',
            forgotSubtitle: 'No worries, we\'ll send you reset instructions'
        }
    });
}

// Export individual components for advanced usage
export {
    AuthManager,
    LoginPage,
    RegisterPage,
    ForgotPasswordPage
};

// Default export for convenience
export default {
    initAuth,
    quickAuthSetup,
    createAuthGuards,
    AuthManager,
    LoginPage,
    RegisterPage,
    ForgotPasswordPage
};