/**
 * RegisterPage - User registration page for MOJO Auth Extension
 * Supports email/password registration with optional terms acceptance
 */

import Page from '../../core/Page.js';

export default class RegisterPage extends Page {
    static pageName = 'auth-register';
    static title = 'Register';
    static icon = 'bi-person-plus';
    static route = 'register';

    constructor(options = {}) {
        super({
            ...options,
            pageName: RegisterPage.pageName,
            route: RegisterPage.route,
            pageIcon: RegisterPage.icon,
            template: 'src/auth/pages/RegisterPage.mst'
        });

        // Get auth manager from app
        this.authManager = this.app?.auth;

        // Get config from auth manager or use defaults
        this.authConfig = this.authManager?.config || {
            termsUrl: null,
            privacyUrl: null,
            logoUrl: '/assets/logo.png',
            appName: 'MOJO App',
            messages: {
                registerTitle: 'Create Account',
                registerSubtitle: 'Join us today'
            }
        };
    }

    async onInit() {
        // Initialize page data
        this.data = {
            // Config
            ...this.authConfig,

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
        document.title = `${RegisterPage.title} - ${this.authConfig.appName}`;

        // Check if already authenticated
        if (this.authManager?.isAuthenticated) {
            this.app.navigate('/');
            this.app.showInfo('You are already logged in');
            return;
        }

        // Clear form
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

        this.updateData({ [field]: value });

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

        this.updateData({ passwordStrength: strength });
    }

    /**
     * Check if passwords match
     */
    checkPasswordMatch() {
        const match = !this.data.confirmPassword ||
                     this.data.password === this.data.confirmPassword;
        this.updateData({ passwordMatch: match });
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
     * Handle registration
     */
    async onActionRegister(event) {
        event.preventDefault();

        // Clear previous errors
        this.updateData({ error: null, isLoading: true });

        try {
            // Validate all fields
            if (!this.data.name || !this.data.email || !this.data.password || !this.data.confirmPassword) {
                throw new Error('Please fill in all required fields');
            }

            // Validate name
            if (this.data.name.trim().length < 2) {
                throw new Error('Name must be at least 2 characters long');
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.data.email)) {
                throw new Error('Please enter a valid email address');
            }

            // Validate password length
            if (this.data.password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            // Check password match
            if (this.data.password !== this.data.confirmPassword) {
                throw new Error('Passwords do not match');
            }

            // Check terms acceptance if required
            if (this.authConfig.termsUrl && !this.data.acceptTerms) {
                throw new Error('You must accept the terms and conditions');
            }

            // Prepare registration data
            const registrationData = {
                name: this.data.name.trim(),
                email: this.data.email.toLowerCase().trim(),
                password: this.data.password,
                acceptedTerms: this.data.acceptTerms
            };

            // Perform registration
            if (!this.authManager) {
                // If no auth manager, try basic registration via auth service
                const authService = new (await import('../../services/AuthService.js')).default(this.app);
                const response = await authService.register(registrationData);

                if (!response.success) {
                    throw new Error(response.message || 'Registration failed');
                }

                // Store tokens and redirect
                const jwtUtils = new (await import('../../utils/JWTUtils.js')).default();
                jwtUtils.storeTokens(response.data.token, response.data.refreshToken, true);

                this.app.navigate('/');
                this.app.showSuccess('Registration successful! Welcome aboard!');
            } else {
                // Use auth manager
                const result = await this.authManager.register(registrationData);

                if (result.success) {
                    // Success - redirect to home or onboarding
                    this.app.navigate('/');
                    this.app.showSuccess(`Welcome, ${result.user.name}! Your account has been created.`);
                }
            }

        } catch (error) {
            console.error('Registration error:', error);
            this.updateData({
                error: error.message || 'Registration failed. Please try again.',
                isLoading: false
            });

            // Scroll to top to show error
            this.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * Navigate to login
     */
    async onActionLogin(event) {
        event.preventDefault();
        this.app.navigate('login');
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
                // Last field - submit form if terms are accepted (or not required)
                if (!this.authConfig.termsUrl || this.data.acceptTerms) {
                    await this.onActionRegister(event);
                }
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
