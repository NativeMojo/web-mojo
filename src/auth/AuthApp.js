/**
 * AuthApp - A specialized WebApp with built-in authentication.
 * Extends the core WebApp to provide a seamless, out-of-the-box authentication system.
 */
import WebApp from '../app/WebApp.js';
import AuthManager from './AuthManager.js';
import LoginPage from './pages/LoginPage.js';
import RegisterPage from './pages/RegisterPage.js';
import ForgotPasswordPage from './pages/ForgotPasswordPage.js';
import ResetPasswordPage from './pages/ResetPasswordPage.js';
import {
    auth_pages_ForgotPasswordPage_mst,
    auth_pages_LoginPage_mst,
    auth_pages_RegisterPage_mst
} from '../templates.js';

export default class AuthApp extends WebApp {
    constructor(config = {}) {
        // Merge user config with auth defaults
        const authConfig = {
            // Default auth routes
            routes: {
                login: '/login',
                register: '/register',
                forgot: '/forgot-password',
                reset: '/reset-password',
                ...config.routes
            },
            // Default navigation redirects
            loginRedirect: config.loginRedirect || '/',
            logoutRedirect: config.logoutRedirect || '/login',
            // Default features
            features: {
                forgotPassword: true,
                registration: true,
                rememberMe: true,
                ...config.features
            },
            // Default password reset method
            passwordResetMethod: config.passwordResetMethod || 'code',
            // Default UI messages and branding
            ui: {
                title: config.name || 'My App',
                logoUrl: config.logoUrl || null,
                messages: {
                    loginTitle: 'Welcome Back',
                    loginSubtitle: 'Sign in to your account',
                    registerTitle: 'Create Account',
                    registerSubtitle: 'Join us today',
                    forgotTitle: 'Reset Password',
                    forgotSubtitle: "We'll send you reset instructions",
                    ...(config.ui?.messages || {})
                }
            },
            ...config
        };

        // Initialize the parent WebApp
        super(authConfig);

        // Initialize and attach the AuthManager
        this.auth = new AuthManager(this, authConfig);
        this.authConfig = authConfig;

        // Setup all authentication components
        this.registerAuthPages();
        this.setupAuthIntegration();
        this.setupAuthGuards();
    }

    /**
     * Registers all the standard authentication pages with the application.
     */
    registerAuthPages() {
        const cfg = this.authConfig;

        this.registerPage('login', LoginPage, {
            route: cfg.routes.login,
            title: 'Login',
            authConfig: cfg,
            template: auth_pages_LoginPage_mst
        });

        if (cfg.features.registration) {
            this.registerPage('register', RegisterPage, {
                route: cfg.routes.register,
                title: 'Register',
                authConfig: cfg,
                template: auth_pages_RegisterPage_mst
            });
        }

        if (cfg.features.forgotPassword) {
            this.registerPage('forgot-password', ForgotPasswordPage, {
                route: cfg.routes.forgot,
                title: 'Reset Password',
                authConfig: cfg,
                template: auth_pages_ForgotPasswordPage_mst
            });

            this.registerPage('reset-password', ResetPasswordPage, {
                route: cfg.routes.reset,
                title: 'Set New Password',
                authConfig: cfg
            });
        }
    }

    /**
     * Sets up global event listeners to integrate AuthManager state with the app.
     */
    setupAuthIntegration() {
        this.events.on('auth:login', (user) => {
            this.showSuccess(`Welcome back, ${user.name || user.email}!`);
            this.navigateAfterLogin();
        });

        this.events.on('auth:logout', () => {
            this.showInfo('You have been logged out.');
            this.navigate(this.authConfig.logoutRedirect);
        });

        this.events.on('auth:register', (user) => {
            this.showSuccess(`Welcome, ${user.name || user.email}! Your account is ready.`);
            this.navigate(this.authConfig.loginRedirect);
        });

        this.events.on('auth:tokenExpired', () => {
            this.showWarning('Your session has expired. Please login again.');
            this.navigate(this.authConfig.logoutRedirect);
        });
    }

    /**
     * Sets up route guards to protect pages.
     */
    setupAuthGuards() {
        this.events.on('route:changed', ({ pageName, path }) => {
            const page = this.getOrCreatePage(pageName);
            if (!page) return;

            const PageClass = page.constructor;
            const isAuthenticated = this.auth.isAuthenticated;
            const isAuthPage = ['login', 'register', 'forgot-password', 'reset-password'].includes(pageName);

            // If page requires auth and user is not logged in, redirect to login
            if (PageClass.requiresAuth && !isAuthenticated) {
                sessionStorage.setItem('auth_redirect', path);
                this.navigate(this.authConfig.routes.login);
                this.showWarning('Please login to access this page.');
                return;
            }

            // If user is logged in and tries to access an auth page, redirect away
            if (isAuthenticated && isAuthPage) {
                this.navigate(this.authConfig.loginRedirect);
            }
        });
    }

    /**
     * Navigates to the intended page after a successful login.
     */
    navigateAfterLogin() {
        const redirectPath = sessionStorage.getItem('auth_redirect');
        if (redirectPath) {
            sessionStorage.removeItem('auth_redirect');
            this.navigate(redirectPath);
        } else {
            this.navigate(this.authConfig.loginRedirect);
        }
    }

    /**
     * Helper to protect a Page class.
     * @param {Page} PageClass - The class to protect.
     * @returns {Page} The protected class.
     */
    static requireAuth(PageClass) {
        PageClass.requiresAuth = true;
        return PageClass;
    }
}