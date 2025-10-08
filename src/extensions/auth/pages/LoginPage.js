/**
 * LoginPage - Simplified login page for MOJO Auth
 * Handles username/email and password authentication with optional passkey support
 */

import Page from '@core/Page.js';
import { VERSION } from '/src/version.js';

export default class LoginPage extends Page {
    static pageName = 'login';
    static title = 'Login';
    static icon = 'bi-box-arrow-in-right';
    static route = '/login';

    constructor(options = {}) {
        super({
            ...options,
            pageName: LoginPage.pageName,
            route: options.route || LoginPage.route,
            pageIcon: LoginPage.icon,
            template: options.template,
        });

        // Get auth config from options (passed from AuthApp)
        this.authConfig = options.authConfig || {
            ui: {
                title: 'My App',
                logoUrl: '/assets/logo.png',
                messages: {
                    loginTitle: 'Welcome Back',
                    loginSubtitle: 'Sign in to your account'
                }
            },
            features: {
                rememberMe: false,
                forgotPassword: true,
                registration: false
            }
        };
    }

    async onInit() {
        await super.onInit();

        // Initialize form data
        this.data = {

            // Form fields
            username: '',
            password: '',
            rememberMe: true,
            loginIcon: this.options.pageIcon,
            shaodw: "shadow-lg",
            // UI state
            isLoading: false,
            error: null,
            showPassword: false,
            version: VERSION,
            // Feature availability
            passkeySupported: this.getApp().auth?.isPasskeySupported?.() || false,
            // Config data for template
            ...this.authConfig.ui,
            ...this.authConfig.features,

        };
    }

    async onEnter() {
        await super.onEnter();

        // Set page title
        document.title = `${LoginPage.title} - ${this.authConfig.ui.title}`;

        // Check if already authenticated
        const auth = this.getApp().auth;
        if (auth?.isAuthenticated) {
            this.getApp().navigate('/');
            return;
        }

        // Clear form and errors
        this.updateData({
            username: '',
            password: '',
            error: null,
            isLoading: false
        });
    }

    async onAfterRender() {
        await super.onAfterRender();

        // Focus on username input
        const usernameInput = this.element.querySelector('#loginUsername');
        if (usernameInput) {
            usernameInput.focus();
        }
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
     * Handle login form submission
     */
    async onActionLogin(event) {
        event.preventDefault();

        // Manually get values from form inputs on submit
        this.data.username = this.element.querySelector('#loginUsername')?.value || '';
        this.data.password = this.element.querySelector('#loginPassword')?.value || '';

        await this.updateData({ error: null, isLoading: true }, true);

        const auth = this.getApp().auth;
        if (!auth) {
            await this.updateData({ error: 'Authentication system not available', isLoading: false }, true);
            return;
        }

        // Basic validation
        if (!this.data.username || !this.data.password) {
            await this.updateData({ error: 'Please enter both username and password', isLoading: false }, true);
            return;
        }

        const result = await auth.login(
            this.data.username,
            this.data.password,
            this.data.rememberMe
        );

        if (!result.success) {
            await this.updateData({
                error: result.message,
                isLoading: false
            }, true);

            // Focus password field for retry
            const passwordInput = this.element.querySelector('#loginPassword');
            if (passwordInput) {
                passwordInput.focus();
                passwordInput.select();
            }
        }
        // On success, the global 'auth:login' event will trigger navigation.
    }

    /**
     * Handle passkey login
     */
    async onActionLoginWithPasskey(event) {
        event.preventDefault();

        const auth = this.getApp().auth;
        if (!auth?.isPasskeySupported?.()) {
            this.getApp().showError('Passkey authentication is not supported');
            return;
        }

        this.updateData({ error: null, isLoading: true });

        try {
            const result = await auth.loginWithPasskey();

            if (result.success) {
                // Success handled by AuthApp event handlers
                console.log('Passkey login successful');
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
     * Navigate to registration page
     */
    async onActionRegister(event) {
        event.preventDefault();
        this.getApp().navigate('/register');
    }

    /**
     * Navigate to forgot password page
     */
    async onActionForgotPassword(event) {
        event.preventDefault();
        this.getApp().navigate('/forgot-password');
    }

    /**
     * Handle Enter key in form fields
     */
    async onActionHandleKeyPress(event, element) {
        if (event.key === 'Enter') {
            event.preventDefault();

            // Move focus or submit form
            if (element.id === 'loginUsername') {
                const passwordInput = this.element.querySelector('#loginPassword');
                if (passwordInput) {
                    passwordInput.focus();
                }
            } else if (element.id === 'loginPassword') {
                await this.onActionLogin(event);
            }
        }
    }

    /**
     * Get view data for template rendering
     */
    async getViewData() {
        return {
            ...this.data
        };
    }
}
