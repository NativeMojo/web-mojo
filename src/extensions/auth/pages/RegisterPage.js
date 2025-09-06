/**
 * RegisterPage - Simplified registration page for MOJO Auth
 * Handles user registration with name, email/username, password, and optional terms acceptance
 */

import Page from '@core/Page.js';

export default class RegisterPage extends Page {
    static pageName = 'auth-register';
    static title = 'Register';
    static icon = 'bi-person-plus';
    static route = 'register';

    constructor(options = {}) {
        super({
            ...options,
            pageName: RegisterPage.pageName,
            route: options.route || RegisterPage.route,
            pageIcon: RegisterPage.icon,
            template: options.template
        });

        // Get auth config from options (passed from AuthApp)
        this.authConfig = options.authConfig || {
            ui: {
                title: 'My App',
                logoUrl: '/assets/logo.png',
                messages: {
                    registerTitle: 'Create Account',
                    registerSubtitle: 'Join us today'
                }
            },
            features: {
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
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            acceptTerms: false,

            // UI state
            isLoading: false,
            error: null,
            showPassword: false,
            showConfirmPassword: false,

            // Validation state
            passwordStrength: null,
            passwordMatch: true
        };
    }

    async onEnter() {
        await super.onEnter();

        // Set page title
        document.title = `${RegisterPage.title} - ${this.authConfig.ui.title}`;

        // Check if already authenticated
        const auth = this.getApp().auth;
        if (auth?.isAuthenticated) {
            this.getApp().navigate('/');
            return;
        }

        // Clear form and errors
        this.updateData({
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            acceptTerms: false,
            error: null,
            isLoading: false,
            passwordStrength: null,
            passwordMatch: true
        });
    }

    async onAfterRender() {
        await super.onAfterRender();

        // Focus on name input
        const nameInput = this.element.querySelector('#registerName');
        if (nameInput) {
            nameInput.focus();
        }
    }

    /**
     * Handle field updates
     */
    async onActionUpdateField(event, element) {
        const field = element.dataset.field;
        const value = element.type === 'checkbox' ? element.checked : element.value;

        this.updateData({ [field]: value });

        // Check password strength when password changes
        if (field === 'password') {
            this.checkPasswordStrength(value);
        }

        // Check password match when either password field changes
        if (field === 'password' || field === 'confirmPassword') {
            this.checkPasswordMatch();
        }

        // Clear error on input change
        if (this.data.error) {
            this.updateData({ error: null });
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
            const input = this.element.querySelector('#registerPassword');
            if (input) {
                input.type = this.data.showPassword ? 'text' : 'password';
            }
        } else if (field === 'confirmPassword') {
            this.updateData({ showConfirmPassword: !this.data.showConfirmPassword });
            const input = this.element.querySelector('#registerConfirmPassword');
            if (input) {
                input.type = this.data.showConfirmPassword ? 'text' : 'password';
            }
        }
    }

    /**
     * Handle registration form submission
     */
    async onActionRegister(event) {
        event.preventDefault();
        await this.updateData({ error: null, isLoading: true }, true);

        // Validation
        if (!this.data.name || !this.data.email || !this.data.password || !this.data.confirmPassword) {
            await this.updateData({ error: 'Please fill in all required fields', isLoading: false }, true);
            return;
        }
        if (this.data.name.trim().length < 2) {
            await this.updateData({ error: 'Name must be at least 2 characters long', isLoading: false }, true);
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.data.email)) {
            await this.updateData({ error: 'Please enter a valid email address', isLoading: false }, true);
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

        const registrationData = {
            name: this.data.name.trim(),
            email: this.data.email.toLowerCase().trim(),
            password: this.data.password,
            acceptedTerms: this.data.acceptTerms
        };

        const result = await auth.register(registrationData);

        if (!result.success) {
            await this.updateData({
                error: result.message || 'Registration failed. Please try again.',
                isLoading: false
            }, true);
        }
        // On success, the global 'auth:register' event will trigger navigation.
    }

    /**
     * Navigate to login page
     */
    async onActionLogin(event) {
        event.preventDefault();
        this.getApp().navigate('/login');
    }

    /**
     * Handle Enter key in form fields
     */
    async onActionHandleKeyPress(event, element) {
        if (event.key === 'Enter') {
            event.preventDefault();

            // Navigate through fields on Enter
            const fieldOrder = ['registerName', 'registerEmail', 'registerPassword', 'registerConfirmPassword'];
            const currentIndex = fieldOrder.indexOf(element.id);

            if (currentIndex >= 0 && currentIndex < fieldOrder.length - 1) {
                // Move to next field
                const nextField = this.element.querySelector(`#${fieldOrder[currentIndex + 1]}`);
                if (nextField) {
                    nextField.focus();
                }
            } else if (currentIndex === fieldOrder.length - 1) {
                // Last field - submit form
                await this.onActionRegister(event);
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
