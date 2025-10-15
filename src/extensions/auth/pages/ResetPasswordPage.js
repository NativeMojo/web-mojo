/**
 * ResetPasswordPage - Password reset completion page for MOJO Auth
 * Handles password reset when user clicks email link with reset token
 */

import Page from '@core/Page.js';

export default class ResetPasswordPage extends Page {
    static pageName = 'auth-reset-password';
    static title = 'Reset Password';
    static icon = 'bi-key-fill';
    static route = 'reset-password';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ResetPasswordPage.pageName,
            route: options.route || ResetPasswordPage.route,
            pageIcon: ResetPasswordPage.icon,
            template: 'auth/pages/ResetPasswordPage.mst'
        });

        // Get auth config from options (passed from AuthApp)
        this.authConfig = options.authConfig || {
            ui: {
                title: 'My App',
                logoUrl: '/assets/logo.png',
                messages: {
                    resetTitle: 'Set New Password',
                    resetSubtitle: 'Choose a strong password'
                }
            },
            features: {
                registration: true
            }
        };

        // Extract reset token from URL
        this.resetToken = null;
    }

    async onInit() {
        await super.onInit();

        // Initialize form data
        this.data = {
            // Config data for template
            ...this.authConfig.ui,
            ...this.authConfig.features,

            // Form fields
            password: '',
            confirmPassword: '',
            resetToken: '',

            // UI state
            isLoading: false,
            error: null,
            success: false,
            successMessage: null,
            showPassword: false,
            showConfirmPassword: false,

            // Validation state
            passwordStrength: null,
            passwordMatch: true,
            tokenValid: false
        };
    }

    async onEnter() {
        await super.onEnter();

        // Set page title
        document.title = `${ResetPasswordPage.title} - ${this.authConfig.ui.title}`;

        // Extract reset token from URL parameters (support both 'token' and 'login_token')
        const urlParams = new URLSearchParams(window.location.search);
        this.resetToken = urlParams.get('token') || urlParams.get('login_token') || '';

        if (!this.resetToken) {
            // No token provided, show error
            this.updateData({
                error: 'Invalid or missing reset token. Please request a new password reset.',
                tokenValid: false
            });
            return;
        }

        // Token exists, mark as valid for UI
        this.updateData({
            resetToken: this.resetToken,
            tokenValid: true,
            error: null,
            success: false
        });
    }

    async onAfterRender() {
        await super.onAfterRender();

        // Focus on password input if token is valid
        if (this.data.tokenValid) {
            const passwordInput = this.element.querySelector('#resetPassword');
            if (passwordInput) {
                passwordInput.focus();
            }
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

        // Check password strength when password changes
        if (field === 'password') {
            this.checkPasswordStrength(value);
        }

        // Check password match when either password field changes
        if (field === 'password' || field === 'confirmPassword') {
            this.checkPasswordMatch();
        }
    }

    /**
     * Check password strength
     */
    checkPasswordStrength(password) {
        let strength = null;

        if (password.length === 0) {
            strength = null;
        } else if (password.length < 6) {
            strength = 'weak';
        } else if (password.length < 8) {
            strength = 'fair';
        } else if (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)) {
            strength = 'strong';
        } else if (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            strength = 'good';
        } else {
            strength = 'fair';
        }

        this.updateData({ passwordStrength: strength }, true);
    }

    /**
     * Check if passwords match
     */
    checkPasswordMatch() {
        const match = !this.data.confirmPassword ||
                     this.data.password === this.data.confirmPassword;
        this.updateData({ passwordMatch: match }, true);
    }

    /**
     * Toggle password visibility
     */
    async onActionTogglePassword(event, element) {
        event.preventDefault();
        const field = element.dataset.passwordField;

        if (field === 'password') {
            this.updateData({ showPassword: !this.data.showPassword });
            const input = this.element.querySelector('#resetPassword');
            if (input) {
                input.type = this.data.showPassword ? 'text' : 'password';
            }
        } else if (field === 'confirmPassword') {
            this.updateData({ showConfirmPassword: !this.data.showConfirmPassword });
            const input = this.element.querySelector('#resetConfirmPassword');
            if (input) {
                input.type = this.data.showConfirmPassword ? 'text' : 'password';
            }
        }
    }

    /**
     * Handle password reset submission
     */
    async onActionResetPassword(event) {
        event.preventDefault();
        await this.updateData({ error: null, isLoading: true }, true);

        // Basic validation
        if (!this.data.password || !this.data.confirmPassword) {
            await this.updateData({ error: 'Please enter and confirm your new password', isLoading: false }, true);
            return;
        }
        if (this.data.password.length < 6) {
            await this.updateData({ error: 'Password must be at least 6 characters long', isLoading: false }, true);
            return;
        }
        if (this.data.password !== this.data.confirmPassword) {
            await this.updateData({ error: 'Passwords do not match', isLoading: false }, true);
            return;
        }

        const auth = this.getApp().auth;
        if (!auth) {
            await this.updateData({ error: 'Authentication system not available', isLoading: false }, true);
            return;
        }

        const response = await auth.resetPasswordWithToken(this.resetToken, this.data.password);

        if (response.success) {
            await this.updateData({
                success: true,
                successMessage: 'Password reset successful! Logging you in...',
                isLoading: false
            }, true);

            // User is now authenticated, redirect to home/dashboard
            setTimeout(() => {
                this.getApp().showSuccess('Password reset complete. Welcome back!');
                this.getApp().navigate('/');
            }, 2000);
        } else {
            await this.updateData({
                error: response.message || 'Password reset failed. Please try again.',
                isLoading: false
            }, true);
        }
    }

    /**
     * Navigate to login page
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
     * Request new reset email
     */
    async onActionRequestNew(event) {
        event.preventDefault();
        this.getApp().navigate('/forgot-password');
    }

    /**
     * Handle Enter key in form fields
     */
    async onActionHandleKeyPress(event, element) {
        if (event.key === 'Enter') {
            event.preventDefault();

            // Navigate through fields on Enter
            const fieldOrder = ['resetPassword', 'resetConfirmPassword'];
            const currentIndex = fieldOrder.indexOf(element.id);

            if (currentIndex >= 0 && currentIndex < fieldOrder.length - 1) {
                // Move to next field
                const nextField = this.element.querySelector(`#${fieldOrder[currentIndex + 1]}`);
                if (nextField) {
                    nextField.focus();
                }
            } else if (currentIndex === fieldOrder.length - 1) {
                // Last field - submit form
                await this.onActionResetPassword(event);
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