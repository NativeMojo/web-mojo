/**
 * Single Page Example - Main Application
 * Demonstrates WebApp with single page layout (no sidebar/topnav)
 */

import WebApp from '../../src/app/WebApp.js';
import LandingPage from './pages/LandingPage.js';
import LoginPage from './pages/LoginPage.js';
import RegisterPage from './pages/RegisterPage.js';

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
        baseUrl: 'https://jsonplaceholder.typicode.com',
        timeout: 30000
    },

    // No navigation configuration needed for single layout
    // Pages will handle their own navigation

    // Default route
    defaultRoute: 'landing'
});

// Register pages
app.addPage(LandingPage);
app.addPage(LoginPage);
app.addPage(RegisterPage);

// Handle authentication (example)
app.eventBus.on('auth:login', (userData) => {
    console.log('User logged in:', userData);
    app.setState('user', userData);
    app.navigate('landing');
    app.showSuccess(`Welcome back, ${userData.name}!`);
});

app.eventBus.on('auth:logout', () => {
    console.log('User logged out');
    app.setState('user', null);
    app.navigate('landing');
    app.showInfo('You have been logged out');
});

app.eventBus.on('auth:register', (userData) => {
    console.log('User registered:', userData);
    app.setState('user', userData);
    app.navigate('landing');
    app.showSuccess('Registration successful! Welcome aboard!');
});

// Start the application
app.start().then(() => {
    console.log('Single page app started successfully');
}).catch(error => {
    console.error('Failed to start app:', error);
});

// Make app globally available for debugging
window.app = app;
