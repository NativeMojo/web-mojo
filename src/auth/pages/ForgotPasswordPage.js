/**
 * ForgotPasswordPage - Simplified password reset page for MOJO Auth
 * Handles password reset request via email, supporting both 'link' and 'code' methods.
 */
import Page from '../../core/Page.js';

export default class ForgotPasswordPage extends Page {
    static pageName = 'auth-forgot-password';
    static title = 'Forgot Password';
    static icon = 'bi-key';
    static route = 'forgot-password';

    constructor(options = {}) {
        super({ ...options, template: options.template });
        this.authConfig = options.authConfig || {
            passwordResetMethod: 'code',
            ui: { title: 'My App' },
            features: {}
        };
    }

    async onInit() {
        this.data = {
            ...this.authConfig.ui,
            ...this.authConfig.features,
            passwordResetMethod: this.authConfig.passwordResetMethod,
            step: 'email', // 'email', 'code', 'link_sent', 'success'
            isLoading: false,
            error: null,
            email: '' // Store email across steps
        };
    }

    async onEnter() {
        document.title = `${ForgotPasswordPage.title} - ${this.authConfig.ui.title}`;
        this.updateData({
            step: 'email',
            isLoading: false,
            error: null,
            email: ''
        });
    }

    /**
     * Gets data from the currently visible form.
     * @param {string} formSelector - The CSS selector for the form.
     * @returns {object} An object containing the form data.
     */
    getFormData(formSelector) {
        const form = this.element.querySelector(formSelector);
        if (!form) return {};
        const formData = new FormData(form);
        return Object.fromEntries(formData.entries());
    }

    /**
     * Handles the initial request to reset a password.
     */
    async onActionRequestReset() {
        const { email } = this.getFormData('#form-request-reset');
        await this.updateData({ isLoading: true, error: null, email }, true);

        if (!email) {
            return this.updateData({ error: 'Please enter your email address', isLoading: false }, true);
        }

        const auth = this.getApp().auth;
        const resetMethod = this.authConfig.passwordResetMethod || 'code';
        const response = await auth.forgotPassword(email, resetMethod);

        if (resetMethod === 'link') {
            await this.updateData({ step: 'link_sent', isLoading: false }, true);
            if (!response.success) console.error('Forgot password (link) error:', response.message);
        } else {
            if (response.success) {
                await this.updateData({ step: 'code', isLoading: false }, true);
            } else {
                await this.updateData({ error: response.message, isLoading: false }, true);
            }
        }
    }

    /**
     * Handles the final password reset using a verification code.
     */
    async onActionResetWithCode() {
        const { code, new_password, confirm_password } = this.getFormData('#form-reset-with-code');
        await this.updateData({ isLoading: true, error: null }, true);

        if (!code || !new_password) {
            return this.updateData({ error: 'Please enter the code and your new password', isLoading: false }, true);
        }
        if (new_password !== confirm_password) {
            return this.updateData({ error: 'Passwords do not match', isLoading: false }, true);
        }

        const auth = this.getApp().auth;
        const response = await auth.resetPasswordWithCode(this.data.email, code, new_password);

        if (response.success) {
            await this.updateData({ step: 'success', isLoading: false }, true);
            setTimeout(() => this.getApp().navigate('/login'), 3000);
        } else {
            await this.updateData({ error: response.message, isLoading: false }, true);
        }
    }

    async onActionBackToLogin() {
        this.getApp().navigate('/login');
    }

    // --- Template Getters for State ---

    get isStepEmail() {
        return this.data.step === 'email';
    }

    get isStepCode() {
        return this.data.step === 'code';
    }

    get isStepLinkSent() {
        return this.data.step === 'link_sent';
    }

    get isStepSuccess() {
        return this.data.step === 'success';
    }
}
