/**
 * LoginPage - Login page for single page example
 */

import Page from '../../../src/core/Page.js';

class LoginPage extends Page {
    static pageName = 'login';
    static title = 'Login - MOJO Framework';
    static icon = 'bi-box-arrow-in-right';
    static route = 'login';
    
    constructor(options = {}) {
        super({
            ...options,
            pageName: LoginPage.pageName,
            route: LoginPage.route,
            pageIcon: LoginPage.icon,
            template: 'templates/login.html'
        });
    }
    
    async onInit() {
        // Initialize page data
        this.data = {
            title: 'Welcome Back',
            subtitle: 'Sign in to your account',
            email: '',
            password: '',
            rememberMe: false,
            isLoading: false,
            error: null
        };
    }
    

    
    async onEnter() {
        await super.onEnter();
        console.log('LoginPage entered');
        
        // Set page title
        document.title = LoginPage.title;
        
        // Check if user is already logged in
        if (window.APP) {
            const user = window.APP.getState('user');
            if (user) {
                window.APP.navigate('landing');
                window.APP.showInfo('You are already logged in');
            }
        }
        
        // Clear any previous errors
        this.updateData({ error: null, isLoading: false });
    }
    
    async onActionUpdateField(event, element) {
        const field = element.dataset.field;
        const value = element.type === 'checkbox' ? element.checked : element.value;
        
        this.data[field] = value;
    }
    
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
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // In a real app, this would be an API call
            // For demo, we'll accept any password and create a mock user
            if (this.data.password.length < 6) {
                throw new Error('Invalid email or password');
            }
            
            // Create mock user data
            const userData = {
                id: 1,
                name: this.data.email.split('@')[0],
                email: this.data.email,
                token: 'mock-jwt-token-' + Date.now()
            };
            
            // Store remember me preference
            if (this.data.rememberMe) {
                localStorage.setItem('rememberMe', 'true');
            }
            
            // Update loading state
            this.updateData({ isLoading: false });
            
            // Emit login event
            if (window.APP) {
                window.APP.eventBus.emit('auth:login', userData);
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.updateData({ 
                error: error.message || 'Login failed',
                isLoading: false 
            });
        }
    }
    
    async onActionForgotPassword(event) {
        event.preventDefault();
        
        if (window.APP) {
            window.APP.showInfo('Password reset functionality would be implemented here');
        }
        
        // In a real app, this would navigate to a password reset page
        console.log('Forgot password clicked');
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
        
        // Focus on email input
        const emailInput = this.element.querySelector('#email');
        if (emailInput) {
            emailInput.focus();
        }
    }
}

export default LoginPage;