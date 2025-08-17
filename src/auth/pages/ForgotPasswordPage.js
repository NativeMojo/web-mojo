/**
 * ForgotPasswordPage - Simplified password reset page for MOJO Auth
 * Handles password reset request via email
 */

import Page from '../../core/Page.js';

export default class ForgotPasswordPage extends Page {
    static pageName = 'auth-forgot-password';
    static title = 'Forgot Password';
    static icon = 'bi-key';
    static route = 'forgot-password';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ForgotPasswordPage.pageName,
            route: options.route || ForgotPasswordPage.route,
            pageIcon: ForgotPasswordPage.icon,
            template: options.template
        });

        // Get auth config from options (passed from AuthApp)
        this.authConfig = options.authConfig || {
            ui: {
                title: 'My App',
                logoUrl: '/assets/logo.png',
                messages: {
                    forgotTitle: 'Reset Password',
                    forgotSubtitle: 'We\'ll send you reset instructions'
                }
            },
            features: {
                forgotPassword: true,
                registration: true
            }
        };
    }

    async onInit() {
        await super.onInit();

        // Initialize form data
        this.data = {
            // Config data for template
            ...this.authConfig.ui,
            ...this.authConfig.features,

            // Form fields
            email: '',

            // UI state
            isLoading: false,
            error: null,
            success: false,
            successMessage: null
        };
    }

    async onEnter() {
        await super.onEnter();

        // Set page title
        document.title = `${ForgotPasswordPage.title} - ${this.authConfig.ui.title}`;

        // Clear form and reset state
        this.updateData({
            email: '',
            error: null,
            success: false,
            successMessage: null,
            isLoading: false
        });
    }

    async onAfterRender() {
        await super.onAfterRender();

        // Focus on email input
        const emailInput = this.element.querySelector('#forgotEmail');
        if (emailInput) {
            emailInput.focus();
        }
    }

    /**
     * Handle field updates
     */
    async onActionUpdateField(event, element) {
        const field = element.dataset.field;
        const value = element.value;

        this.updateData({
            [field]: value,
            error: null // Clear error on input change
        });
    }

    /**
     * Handle password reset request
     */
    async onActionResetPassword(event) {
        event.preventDefault();

        // Clear previous messages and show loading
        this.updateData({
            error: null,
            success: false,
            successMessage: null,
            isLoading: true
        });

        try {
            // Basic validation
            if (!this.data.email) {
                throw new Error('Please enter your email address');
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.data.email)) {
                throw new Error('Please enter a valid email address');
            }

            // Get auth manager
            const auth = this.getApp().auth;
            if (!auth) {
                throw new Error('Authentication system not available');
            }

            // Send reset request
            const response = await auth.forgotPassword(this.data.email);

            if (response.success) {
                // Show success state
                this.updateData({
                    success: true,
                    successMessage: response.message || 'Password reset instructions have been sent to your email',
                    isLoading: false,
                    email: '' // Clear email field
                });

                // Optional: Redirect to login after delay
                setTimeout(() => {
                    this.getApp().showInfo('Check your email for reset instructions');
                    this.getApp().navigate('/login');
                }, 5000);
            } else {
                throw new Error(response.message || 'Failed to process request');
            }

        } catch (error) {
            console.error('Forgot password error:', error);
            this.updateData({
                error: error.message || 'Failed to process request. Please try again.',
                isLoading: false
            });

            // Re-focus on email input for retry
            const emailInput = this.element.querySelector('#forgotEmail');
            if (emailInput) {
                emailInput.focus();
                emailInput.select();
            }
        }
    }

    /**
     * Navigate back to login page
     */
    async onActionBackToLogin(event) {
        event.preventDefault();
        this.getApp().navigate('/login');
    }

    /**
     * Navigate to registration page
     */
    async onActionRegister(event) {
        event.preventDefault();
        this.getApp().navigate('/register');
    }

    /**
     * Handle Enter key in email field
     */
    async onActionHandleKeyPress(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            await this.onActionResetPassword(event);
        }
    }

    /**
     * Resend reset email (when in success state)
     */
    async onActionResendEmail(event) {
        event.preventDefault();

        // Reset to initial state
        this.updateData({
            success: false,
            successMessage: null,
            error: null
        });

        // Focus back on email input
        const emailInput = this.element.querySelector('#forgotEmail');
        if (emailInput) {
            emailInput.focus();
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
