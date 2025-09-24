/**
 * AuthApp - A specialized WebApp with built-in authentication.
 * Extends the core WebApp to provide a seamless, out-of-the-box authentication system.
 */
import WebApp from '@core/WebApp.js';
import AuthManager from './AuthManager.js';
import LoginPage from '@ext/auth/pages/LoginPage.js';
import RegisterPage from '@ext/auth/pages/RegisterPage.js';
import ForgotPasswordPage from '@ext/auth/pages/ForgotPasswordPage.js';
import ResetPasswordPage from '@ext/auth/pages/ResetPasswordPage.js';
import { getTemplate } from '/src/templates.js';

export default class AuthApp extends WebApp {
    constructor(config = {}) {
        // Deep merge UI config to handle nested theme object
        const uiConfig = {
            title: config.name || 'My App',
            logoUrl: null,
            termsUrl: null,
            privacyUrl: null,
            theme: {
                background: 'auth-bg-light',
                panel: 'auth-panel-light',
                ...(config.ui?.theme || {})
            },
            messages: {
                loginTitle: 'Welcome Back',
                loginSubtitle: 'Sign in to your account',
                registerTitle: 'Create Account',
                registerSubtitle: 'Join us today',
                forgotTitle: 'Reset Password',
                forgotSubtitle: "We'll send you reset instructions",
                ...(config.ui?.messages || {})
            },
            ...(config.ui || {})
        };

        // Merge user config with auth defaults
        const authConfig = {
            ...config,
            routes: {
                login: '/login',
                register: '/register',
                forgot: '/forgot-password',
                reset: '/reset-password',
                ...(config.routes || {})
            },
            loginRedirect: config.loginRedirect || '/',
            logoutRedirect: config.logoutRedirect || '/login',
            features: {
                forgotPassword: true,
                registration: true,
                rememberMe: true,
                ...(config.features || {})
            },
            passwordResetMethod: config.passwordResetMethod || 'code',
            ui: uiConfig,
        };

        // Initialize the parent WebApp
        super(authConfig);

        // Initialize and attach the AuthManager
        this.auth = new AuthManager(this, authConfig);
        this.authConfig = authConfig;

        // Setup all authentication components
        this.applyAuthTheme();
        this.registerAuthPages();
        this.setupAuthIntegration();
        this.setupAuthGuards();
    }

    /**
     * Applies the configured background and panel themes to the body.
     */
    applyAuthTheme() {
        const theme = this.authConfig.ui.theme;
        if (!theme) return;

        // Clear any existing theme classes
        const classesToRemove = Array.from(document.body.classList).filter(
            c => c.startsWith('auth-bg-') || c.startsWith('auth-panel-')
        );
        if (classesToRemove.length) {
            document.body.classList.remove(...classesToRemove);
        }

        // Add new theme classes
        if (theme.background) {
            document.body.classList.add(theme.background);
        }
        if (theme.panel) {
            document.body.classList.add(theme.panel);
        }
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
            template: getTemplate('extensions/auth/pages/LoginPage.mst')
        });

        if (cfg.features.registration) {
            this.registerPage('register', RegisterPage, {
                route: cfg.routes.register,
                title: 'Register',
                authConfig: cfg,
                template: getTemplate('extensions/auth/pages/RegisterPage.mst')
            });
        }

        if (cfg.features.forgotPassword) {
            this.registerPage('forgot-password', ForgotPasswordPage, {
                route: cfg.routes.forgot,
                title: 'Reset Password',
                authConfig: cfg,
                template: getTemplate('extensions/auth/pages/ForgotPasswordPage.mst')
            });

            this.registerPage('reset-password', ResetPasswordPage, {
                route: cfg.routes.reset,
                title: 'Set New Password',
                authConfig: cfg,
                template: getTemplate('extensions/auth/pages/ResetPasswordPage.mst')
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
