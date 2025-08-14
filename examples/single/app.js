/**
 * Single Page Example - Main Application
 * Demonstrates WebApp with single page layout (no sidebar/topnav)
 */

import WebApp from '../../src/app/WebApp.js';
import LandingPage from './pages/LandingPage.js';
import { initAuth } from '../../src/auth/index.js';

// Create and configure the app
const app = new WebApp({
    name: 'Single Page Example',
    version: '1.0.0',
    debug: true,
    basePath: '/examples/single',

    // Layout configuration - single page mode
    layout: 'single',
    container: '#app',

    // API configuration
    api: {
        baseUrl: 'http://localhost:8881',
        timeout: 30000
    },

    // No navigation configuration needed for single layout
    // Pages will handle their own navigation

    // Default route
    defaultRoute: 'landing'
});

// Register landing page
app.registerPage('landing', LandingPage);

// Initialize auth extension with configuration
const authManager = initAuth(app, {
    enablePasskeys: true,
    enableGoogleAuth: false,
    enableRememberMe: true,
    enableForgotPassword: true,
    termsUrl: 'https://example.com/terms',
    privacyUrl: 'https://example.com/privacy',
    logoUrl: '/assets/logo.png',
    appName: 'MOJO Single Page App',
    loginRedirect: 'landing',
    logoutRedirect: 'login',
    messages: {
        loginTitle: 'Welcome Back',
        loginSubtitle: 'Sign in to your MOJO account',
        registerTitle: 'Join MOJO',
        registerSubtitle: 'Create your free account',
        forgotTitle: 'Reset Password',
        forgotSubtitle: 'We\'ll help you get back in'
    }
});

// Custom auth event handlers (optional - auth extension provides defaults)
app.eventBus.on('auth:login-success', (user) => {
    console.log('Custom handler: User logged in', user);
    // Additional custom logic if needed
});

app.eventBus.on('auth:logout', () => {
    console.log('Custom handler: User logged out');
    // Additional custom logic if needed
});

// Start the application
app.start().then(() => {
    console.log('Single page app started successfully');
}).catch(error => {
    console.error('Failed to start app:', error);
});

// Make app globally available for debugging
window.app = app;
