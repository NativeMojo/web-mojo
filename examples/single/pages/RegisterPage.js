/**
 * RegisterPage - Registration page for single page example
 */

import Page from '../../../src/core/Page.js';

class RegisterPage extends Page {
    static pageName = 'register';
    static title = 'Sign Up - MOJO Framework';
    static icon = 'bi-person-plus';
    static route = 'register';
    
    constructor(options = {}) {
        super({
            ...options,
            pageName: RegisterPage.pageName,
            route: RegisterPage.route,
            pageIcon: RegisterPage.icon,
            template: 'templates/register.html'
        });
    }
    
    async onInit() {
        // Initialize page data
        this.data = {
            title: 'Create Account',
            subtitle: 'Join the MOJO community',
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            agreeToTerms: false,
            isLoading: false,
            error: null,
            validationErrors: {}
        };
    }
    

    
    async onEnter() {
        await super.onEnter();
        console.log('RegisterPage entered');
        
        // Set page title
        document.title = RegisterPage.title;
        
        // Check if user is already logged in
        if (window.APP) {
            const user = window.APP.getState('user');
            if (user) {
                window.APP.navigate('landing');
                window.APP.showInfo('You are already logged in');
            }
        }
        
        // Clear form data
        this.data = {
            ...this.data,
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            agreeToTerms: false,
            isLoading: false,
            error: null,
            validationErrors: {}
        };
    }
    
    async onActionUpdateField(event, element) {
        const field = element.dataset.field;
        const value = element.type === 'checkbox' ? element.checked : element.value;
        
        this.data[field] = value;
        
        // Clear validation error for this field when user types
        if (this.data.validationErrors[field]) {
            delete this.data.validationErrors[field];
            this.updateData({ validationErrors: this.data.validationErrors });
        }
    }
    
    validateForm() {
        const errors = {};
        
        // Validate name
        if (!this.data.name || this.data.name.trim().length < 2) {
            errors.name = 'Please enter your full name (at least 2 characters)';
        }
        
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!this.data.email) {
            errors.email = 'Email is required';
        } else if (!emailRegex.test(this.data.email)) {
            errors.email = 'Please enter a valid email address';
        }
        
        // Validate password
        if (!this.data.password) {
            errors.password = 'Password is required';
        } else if (this.data.password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }
        
        // Validate password confirmation
        if (!this.data.confirmPassword) {
            errors.confirmPassword = 'Please confirm your password';
        } else if (this.data.password !== this.data.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }
        
        // Validate terms agreement
        if (!this.data.agreeToTerms) {
            errors.agreeToTerms = 'You must agree to the terms to create an account';
        }
        
        return errors;
    }
    
    async onActionRegister(event) {
        event.preventDefault();
        
        // Clear previous errors
        this.updateData({ error: null, validationErrors: {} });
        
        // Validate form
        const errors = this.validateForm();
        if (Object.keys(errors).length > 0) {
            this.updateData({ validationErrors: errors });
            return;
        }
        
        // Show loading state
        this.updateData({ isLoading: true });
        
        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // In a real app, this would be an API call to create the account
            // For demo, we'll create a mock user
            const userData = {
                id: Date.now(),
                name: this.data.name,
                email: this.data.email,
                token: 'mock-jwt-token-' + Date.now(),
                createdAt: new Date().toISOString()
            };
            
            // Update loading state
            this.updateData({ isLoading: false });
            
            // Emit registration event
            if (window.APP) {
                window.APP.eventBus.emit('auth:register', userData);
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            this.updateData({ 
                error: error.message || 'Registration failed. Please try again.',
                isLoading: false 
            });
        }
    }
    
    async onActionShowTerms(event) {
        event.preventDefault();
        
        if (window.APP) {
            window.APP.showInfo('Terms of Service would be displayed here');
        }
        
        // In a real app, this would open a modal or navigate to terms page
        console.log('Show terms clicked');
    }
    
    async onActionShowPrivacy(event) {
        event.preventDefault();
        
        if (window.APP) {
            window.APP.showInfo('Privacy Policy would be displayed here');
        }
        
        // In a real app, this would open a modal or navigate to privacy page
        console.log('Show privacy clicked');
    }
    
    async onActionNavigate(event, element) {
        event.preventDefault();
        const page = element.dataset.page;
        if (page && window.APP) {
            window.APP.navigate(page);
        }
    }
    
    async onAfterMount() {
        await super.onAfterMount();
        
        // Focus on name input
        const nameInput = this.element.querySelector('#name');
        if (nameInput) {
            nameInput.focus();
        }
    }
}

export default RegisterPage;