/**
 * LoginPage - Comprehensive login page for MOJO Auth Extension
 * Supports email/password, passkeys, Google OAuth, and forgot password flow
 */

import Page from '../../core/Page.js';
import { getTemplate } from '../../templates.js';

export default class LoginPage extends Page {
    static pageName = 'auth-login';
    static title = 'Login';
    static icon = 'bi-box-arrow-in-right';
    static route = 'login';

    constructor(options = {}) {
        super({
            ...options,
            pageName: LoginPage.pageName,
            route: LoginPage.route,
            pageIcon: LoginPage.icon,
            template: getTemplate('auth/pages/LoginPage.mst')
        });

        // Get auth manager from app
        this.authManager = this.app?.auth;

        // Get config from auth manager or use defaults
        this.authConfig = this.authManager?.config || {
            enablePasskeys: false,
            enableGoogleAuth: false,
            enableRememberMe: true,
            enableForgotPassword: true,
            termsUrl: null,
            privacyUrl: null,
            logoUrl: '/assets/logo.png',
            appName: 'MOJO App',
            messages: {
                loginTitle: 'Welcome Back',
                loginSubtitle: 'Sign in to your account'
            }
        };
    }

    async onInit() {
        // Initialize page data
        this.data = {
            // Config
            ...this.authConfig,

            // Form fields
            email: '',
            password: '',
            rememberMe: false,

            // UI state
            isLoading: false,
            error: null,
            showPassword: false,

            // Feature flags
            passkeySupported: this.authManager?.isPasskeySupported() || false,
            googleEnabled: this.authManager?.isGoogleAuthEnabled() || false
        };
    }

    async onEnter() {
        await super.onEnter();

        // Set page title
        document.title = `${LoginPage.title} - ${this.authConfig.appName}`;

        // Check if already authenticated
        if (this.authManager?.isAuthenticated) {
            const redirectPath = sessionStorage.getItem('auth_redirect') || '/';
            sessionStorage.removeItem('auth_redirect');
            this.app.navigate(redirectPath);
            this.app.showInfo('You are already logged in');
            return;
        }

        // Clear any previous errors
        this.updateData({
            error: null,
            isLoading: false,
            email: '',
            password: '',
            rememberMe: false
        });
    }

    async onAfterRender() {
        await super.onAfterRender();

        // Focus on email input
        const emailInput = this.element.querySelector('#loginEmail');
        if (emailInput) {
            emailInput.focus();
        }

        // Initialize Bootstrap tooltips if any
        const tooltips = this.element.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(el => {
            new bootstrap.Tooltip(el);
        });
    }

    /**
     * Handle field updates
     */
    async onActionUpdateField(event, element) {
        const field = element.dataset.field;
        const value = element.type === 'checkbox' ? element.checked : element.value;

        this.updateData({
            [field]: value,
            error: null // Clear error on input change
        });
    }

    /**
     * Toggle password visibility
     */
    async onActionTogglePassword(event) {
        event.preventDefault();
        this.updateData({ showPassword: !this.data.showPassword });

        // Update input type
        const passwordInput = this.element.querySelector('#loginPassword');
        if (passwordInput) {
            passwordInput.type = this.data.showPassword ? 'text' : 'password';
        }
    }

    /**
     * Handle email/password login
     */
    async onActionLogin(event) {
        event.preventDefault();

        // Clear previous errors
        this.updateData({ error: null, isLoading: true });

        try {
            // Validate inputs
            if (!this.data.email || !this.data.password) {
                throw new Error('Please enter both email and password');
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.data.email)) {
                throw new Error('Please enter a valid email address');
            }

            // Validate password length
            if (this.data.password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            // Perform login
            if (!this.authManager) {
                throw new Error('Authentication service not available');
            }

            const result = await this.authManager.login(
                this.data.email,
                this.data.password,
                this.data.rememberMe
            );

            if (result.success) {
                // Success - redirect to intended page or home
                const redirectPath = sessionStorage.getItem('auth_redirect') ||
                                   this.authConfig.loginRedirect || '/';
                sessionStorage.removeItem('auth_redirect');

                this.app.navigate(redirectPath);
                this.app.showSuccess(`Welcome back, ${result.user.name || result.user.email}!`);
            }

        } catch (error) {
            console.error('Login error:', error);
            this.updateData({
                error: error.message || 'Login failed. Please try again.',
                isLoading: false
            });

            // Focus on password field for retry
            const passwordInput = this.element.querySelector('#loginPassword');
            if (passwordInput) {
                passwordInput.focus();
                passwordInput.select();
            }
        }
    }

    /**
     * Handle passkey login
     */
    async onActionLoginWithPasskey(event) {
        event.preventDefault();

        if (!this.authManager?.isPasskeySupported()) {
            this.app.showError('Passkey authentication is not supported on this device');
            return;
        }

        this.updateData({ error: null, isLoading: true });

        try {
            const result = await this.authManager.loginWithPasskey();

            if (result.success) {
                // Success - redirect
                const redirectPath = sessionStorage.getItem('auth_redirect') ||
                                   this.authConfig.loginRedirect || '/';
                sessionStorage.removeItem('auth_redirect');

                this.app.navigate(redirectPath);
                this.app.showSuccess(`Welcome back, ${result.user.name || 'User'}!`);
            }

        } catch (error) {
            console.error('Passkey login error:', error);
            this.updateData({
                error: 'Passkey authentication failed. Please try another method.',
                isLoading: false
            });
        }
    }

    /**
     * Handle Google OAuth login
     */
    async onActionLoginWithGoogle(event) {
        event.preventDefault();

        if (!this.authManager?.isGoogleAuthEnabled()) {
            this.app.showError('Google authentication is not enabled');
            return;
        }

        this.updateData({ error: null, isLoading: true });

        try {
            await this.authManager.loginWithGoogle();
            // Google OAuth typically redirects, so we may not reach here

        } catch (error) {
            console.error('Google login error:', error);
            this.updateData({
                error: 'Google authentication is currently unavailable.',
                isLoading: false
            });
        }
    }

    /**
     * Navigate to forgot password
     */
    async onActionForgotPassword(event) {
        event.preventDefault();

        if (!this.authConfig.enableForgotPassword) {
            this.app.showInfo('Password reset is not enabled');
            return;
        }

        // Navigate to forgot password page
        this.app.navigate('forgot-password');
    }

    /**
     * Navigate to registration
     */
    async onActionRegister(event) {
        event.preventDefault();
        this.app.navigate('register');
    }

    /**
     * Handle Enter key in form fields
     */
    async onActionHandleKeyPress(event, element) {
        if (event.key === 'Enter') {
            event.preventDefault();

            // If in email field, move to password
            if (element.id === 'loginEmail') {
                const passwordInput = this.element.querySelector('#loginPassword');
                if (passwordInput) {
                    passwordInput.focus();
                }
            }
            // If in password field, submit form
            else if (element.id === 'loginPassword') {
                await this.onActionLogin(event);
            }
        }
    }

    /**
     * Handle external link clicks
     */
    async onActionOpenLink(event, element) {
        event.preventDefault();
        const url = element.dataset.url;
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }

    async onExit() {
        await super.onExit();

        // Clean up tooltips
        const tooltips = this.element.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(el => {
            const tooltipInstance = bootstrap.Tooltip.getInstance(el);
            if (tooltipInstance) {
                tooltipInstance.dispose();
            }
        });
    }
}
