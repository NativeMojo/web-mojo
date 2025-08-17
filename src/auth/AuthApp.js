/**
 * AuthApp - Factory for easy authentication setup with MOJO WebApp
 * Integrates authentication seamlessly with existing WebApp infrastructure
 */

import AuthManager from './AuthManager.js';
import LoginPage from './pages/LoginPage.js';
import RegisterPage from './pages/RegisterPage.js';
import ForgotPasswordPage from './pages/ForgotPasswordPage.js';
import ResetPasswordPage from './pages/ResetPasswordPage.js';
import {
    auth_pages_ForgotPasswordPage_mst,
    auth_pages_LoginPage_mst,
    auth_pages_RegisterPage_mst } from '../templates.js';

export default class AuthApp {
    constructor(app, config = {}) {
        this.app = app;
        this.config = {
            // API Configuration
            baseURL: 'http://localhost:8881',

            // Page Routes
            routes: {
                login: '/login',
                register: '/register',
                forgot: '/forgot-password',
                reset: '/reset-password'
            },

            // Navigation
            loginRedirect: '/',
            logoutRedirect: '/login',

            // Features (for future plugins)
            features: {
                forgotPassword: true,
                registration: true,
                rememberMe: true
            },

            // UI Configuration
            ui: {
                title: app.title || 'My App',
                logoUrl: '/assets/logo.png',
                messages: {
                    loginTitle: 'Welcome Back',
                    loginSubtitle: 'Sign in to your account',
                    registerTitle: 'Create Account',
                    registerSubtitle: 'Join us today',
                    forgotTitle: 'Reset Password',
                    forgotSubtitle: 'We\'ll send you reset instructions'
                }
            },

            // Plugin system
            plugins: [],

            ...config
        };

        this.authManager = null;
        this.plugins = new Map();
        this.initialized = false;
    }

    /**
     * Initialize authentication system
     */
    async initialize() {
        if (this.initialized) return;

        // Create and configure AuthManager
        this.authManager = new AuthManager(this.app, {
            baseURL: this.config.baseURL,
            autoRefresh: true,
            refreshThreshold: 5
        });

        // Register authentication pages with WebApp
        this.registerAuthPages();

        // Set up authentication integration
        this.setupAuthIntegration();

        // Set up route guards
        this.setupAuthGuards();

        // Initialize plugins
        await this.initializePlugins();

        // Make auth available globally on app
        this.app.auth = this.authManager;

        this.initialized = true;

        console.log('AuthApp initialized successfully');
    }

    /**
     * Register authentication pages with WebApp
     */
    registerAuthPages() {
        const authConfig = this.config;

        // Register login page with config
        this.app.registerPage('login', class extends LoginPage {
            constructor(options = {}) {
                super({
                    route: authConfig.routes.login,
                    authConfig: authConfig,
                    template: auth_pages_LoginPage_mst,
                    ...options
                });
            }
        }, {
            route: this.config.routes.login,
            title: 'Login'
        });

        // Register registration page if enabled
        if (this.config.features.registration) {
            this.app.registerPage('register', class extends RegisterPage {
                constructor(options = {}) {
                    super({
                        route: authConfig.routes.register,
                        authConfig: authConfig,
                        template: auth_pages_RegisterPage_mst,
                        ...options
                    });
                }
            }, {
                route: this.config.routes.register,
                title: 'Register'
            });
        }

        // Register forgot password page if enabled
        if (this.config.features.forgotPassword) {
            this.app.registerPage('forgot-password', class extends ForgotPasswordPage {
                constructor(options = {}) {
                    super({
                        route: authConfig.routes.forgot,
                        authConfig: authConfig,
                        template: auth_pages_ForgotPasswordPage_mst,
                        ...options
                    });
                }
            }, {
                route: this.config.routes.forgot,
                title: 'Reset Password'
            });

            // Register reset password completion page
            this.app.registerPage('reset-password', class extends ResetPasswordPage {
                constructor(options = {}) {
                    super({
                        route: authConfig.routes.reset,
                        authConfig: authConfig,
                        ...options
                    });
                }
            }, {
                route: this.config.routes.reset,
                title: 'Set New Password'
            });
        }
    }

    /**
     * Set up authentication integration with WebApp
     */
    setupAuthIntegration() {
        // Listen to auth events and integrate with WebApp
        this.authManager.app.events?.on('auth:login', (user) => {
            // Update WebApp state
            this.app.setState('auth', {
                isAuthenticated: true,
                user: user
            });

            // Show success message
            this.app.showSuccess(`Welcome back, ${user.name || user.email}!`);

            // Navigate to intended page or home
            this.navigateAfterLogin();
        });

        this.authManager.app.events?.on('auth:logout', () => {
            // Clear WebApp state
            this.app.setState('auth', {
                isAuthenticated: false,
                user: null
            });

            // Show logout message
            this.app.showInfo('You have been logged out');

            // Navigate to login
            this.app.navigate(this.config.logoutRedirect);
        });

        this.authManager.app.events?.on('auth:register', (user) => {
            // Update WebApp state
            this.app.setState('auth', {
                isAuthenticated: true,
                user: user
            });

            // Show welcome message
            this.app.showSuccess(`Welcome, ${user.name || user.email}! Your account has been created.`);

            // Navigate to home
            this.app.navigate(this.config.loginRedirect);
        });

        this.authManager.app.events?.on('auth:tokenExpired', () => {
            this.app.showWarning('Your session has expired. Please login again.');
            this.app.navigate(this.config.logoutRedirect);
        });

        this.authManager.app.events?.on('auth:loginError', (error) => {
            this.app.showError(error.message || 'Login failed');
        });

        this.authManager.app.events?.on('auth:registerError', (error) => {
            this.app.showError(error.message || 'Registration failed');
        });
    }

    /**
     * Set up route guards for protected pages
     */
    setupAuthGuards() {
        // Listen for route changes from WebApp's router
        this.app.events?.on('route:changed', ({ pageName, path }) => {
            const PageClass = this.app.getPage(pageName);

            // Check if page requires authentication
            if (PageClass?.requiresAuth && !this.isAuthenticated()) {
                // Store intended destination
                sessionStorage.setItem('auth_redirect', path);

                // Redirect to login
                this.app.navigate(this.config.routes.login);
                this.app.showWarning('Please login to access this page');

                return;
            }

            // If user is authenticated and trying to access auth pages, redirect home
            if (this.isAuthenticated() && this.isAuthPage(pageName)) {
                this.app.navigate(this.config.loginRedirect);
            }
        });
    }

    /**
     * Initialize plugins
     */
    async initializePlugins() {
        for (const plugin of this.config.plugins) {
            try {
                if (typeof plugin.initialize === 'function') {
                    await plugin.initialize(this.authManager, this.app);
                    this.plugins.set(plugin.name, plugin);
                }
            } catch (error) {
                console.error(`Failed to initialize auth plugin ${plugin.name}:`, error);
            }
        }
    }

    /**
     * Navigate after successful login
     */
    navigateAfterLogin() {
        // Check for stored redirect path
        const redirectPath = sessionStorage.getItem('auth_redirect');
        if (redirectPath) {
            sessionStorage.removeItem('auth_redirect');
            this.app.navigate(redirectPath);
        } else {
            this.app.navigate(this.config.loginRedirect);
        }
    }

    /**
     * Check if current user is authenticated
     */
    isAuthenticated() {
        return this.authManager?.isAuthenticated || false;
    }

    /**
     * Check if page is an auth page
     */
    isAuthPage(pageName) {
        return ['login', 'register', 'forgot-password'].includes(pageName);
    }

    /**
     * Get current user
     */
    getUser() {
        return this.authManager?.user || null;
    }

    /**
     * Add authentication plugin
     */
    addPlugin(plugin) {
        if (this.initialized) {
            // Initialize immediately if AuthApp is already initialized
            plugin.initialize(this.authManager, this.app);
            this.plugins.set(plugin.name, plugin);
        } else {
            // Add to config for later initialization
            this.config.plugins.push(plugin);
        }
    }

    /**
     * Get plugin by name
     */
    getPlugin(name) {
        return this.plugins.get(name);
    }

    /**
     * Protect a page class with authentication requirement
     */
    static requireAuth(PageClass) {
        PageClass.requiresAuth = true;
        return PageClass;
    }

    /**
     * Create and initialize AuthApp with WebApp
     */
    static async create(app, config = {}) {
        const authApp = new AuthApp(app, config);
        await authApp.initialize();
        return authApp;
    }
}

/**
 * Quick setup function for basic authentication
 * @param {WebApp} app - MOJO WebApp instance
 * @param {object} config - Configuration options
 * @returns {Promise<AuthApp>} Initialized AuthApp instance
 */
export async function setupAuth(app, config = {}) {
    return await AuthApp.create(app, config);
}

/**
 * Decorator function to protect pages with authentication
 * @param {Page} PageClass - Page class to protect
 * @returns {Page} Protected page class
 */
export function requireAuth(PageClass) {
    return AuthApp.requireAuth(PageClass);
}
