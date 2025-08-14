/**
 * ForgotPasswordPage - Password reset request page for MOJO Auth Extension
 * Allows users to request a password reset link via email
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
            route: ForgotPasswordPage.route,
            pageIcon: ForgotPasswordPage.icon,
            template: 'src/auth/pages/ForgotPasswordPage.mst'
        });

        // Get auth manager from app
        this.authManager = this.app?.auth;

        // Get config from auth manager or use defaults
        this.authConfig = this.authManager?.config || {
            logoUrl: '/assets/logo.png',
            appName: 'MOJO App',
            messages: {
                forgotTitle: 'Reset Password',
                forgotSubtitle: 'We\'ll send you reset instructions'
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
        document.title = `${ForgotPasswordPage.title} - ${this.authConfig.appName}`;

        // Clear form
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

        this.updateData({ [field]: value });

        // Clear any previous errors when user starts typing
        if (this.data.error) {
            this.updateData({ error: null });
        }
    }

    /**
     * Handle password reset request
     */
    async onActionResetPassword(event) {
        event.preventDefault();

        // Clear previous messages
        this.updateData({
            error: null,
            success: false,
            successMessage: null,
            isLoading: true
        });

        try {
            // Validate email
            if (!this.data.email) {
                throw new Error('Please enter your email address');
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.data.email)) {
                throw new Error('Please enter a valid email address');
            }

            // Send reset request
            if (!this.authManager) {
                // If no auth manager, use auth service directly
                const authService = new (await import('../../services/AuthService.js')).default(this.app);
                const response = await authService.forgotPassword(this.data.email);

                if (!response.success) {
                    throw new Error(response.message || 'Failed to process request');
                }

                // Show success message
                this.updateData({
                    success: true,
                    successMessage: response.message || 'Password reset instructions have been sent to your email',
                    isLoading: false
                });
            } else {
                // Use auth manager
                const result = await this.authManager.forgotPassword(this.data.email);

                if (result.success) {
                    // Show success message
                    this.updateData({
                        success: true,
                        successMessage: result.message || 'Password reset instructions have been sent to your email',
                        isLoading: false
                    });
                }
            }

            // Clear email field on success
            this.updateData({ email: '' });

            // Optional: Redirect to login after a delay
            setTimeout(() => {
                if (this.app?.showInfo) {
                    this.app.showInfo('Check your email for reset instructions');
                }
                this.app.navigate('login');
            }, 5000);

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
     * Navigate back to login
     */
    async onActionBackToLogin(event) {
        event.preventDefault();
        this.app.navigate('login');
    }

    /**
     * Navigate to registration
     */
    async onActionRegister(event) {
        event.preventDefault();
        this.app.navigate('register');
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
}
