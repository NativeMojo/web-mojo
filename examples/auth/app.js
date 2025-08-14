/**
 * Auth Example - Complete Authentication Flow
 * Demonstrates the MOJO Auth Extension with protected portal pages
 */

import WebApp from '../../src/app/WebApp.js';
import { initAuth, createAuthGuards } from '../../src/auth/index.js';

// Import portal pages
import DashboardPage from './pages/DashboardPage.js';
import ProfilePage from './pages/ProfilePage.js';
import SettingsPage from './pages/SettingsPage.js';
import UsersPage from './pages/UsersPage.js';

// Create and configure the app
const app = new WebApp({
    name: 'MOJO Auth Portal',
    version: '1.0.0',
    debug: true,
    basePath: '/examples/auth',

    // Layout configuration - with sidebar and topnav for authenticated pages
    layout: 'sidebar',
    container: '#app',

    // API configuration
    api: {
        baseUrl: 'http://localhost:8881',
        timeout: 30000,
        headers: {
            'X-App-Name': 'MOJO-Auth-Example'
        }
    },

    // Top navigation configuration
    topnav: {
        brand: {
            name: 'MOJO Portal',
            logo: '/assets/logo.png',
            href: '#dashboard'
        },
        showSearch: true,
        searchPlaceholder: 'Search...',
        showNotifications: true,
        showUserMenu: true,
        userMenu: {
            showProfile: true,
            showSettings: true,
            showLogout: true
        }
    },

    // Sidebar navigation configuration
    sidebar: {
        width: '250px',
        collapsed: false,
        showToggle: true,
        items: [
            {
                type: 'item',
                id: 'dashboard',
                label: 'Dashboard',
                icon: 'bi-speedometer2',
                page: 'dashboard',
                badge: { text: 'New', class: 'bg-success' }
            },
            {
                type: 'item',
                id: 'profile',
                label: 'My Profile',
                icon: 'bi-person-circle',
                page: 'profile'
            },
            {
                type: 'separator'
            },
            {
                type: 'header',
                label: 'MANAGEMENT'
            },
            {
                type: 'item',
                id: 'users',
                label: 'Users',
                icon: 'bi-people',
                page: 'users',
                requiredRole: 'admin'
            },
            {
                type: 'item',
                id: 'settings',
                label: 'Settings',
                icon: 'bi-gear',
                page: 'settings'
            }
        ]
    },

    // Default route - will redirect to login if not authenticated
    defaultRoute: 'dashboard'
});

// Initialize auth extension with full configuration
const authManager = initAuth(app, {
    // Enable all features for demo
    enablePasskeys: true,
    enableGoogleAuth: false, // Set to true if you have Google OAuth configured
    enableRememberMe: true,
    enableForgotPassword: true,
    
    // URLs for terms and privacy
    termsUrl: 'https://example.com/terms',
    privacyUrl: 'https://example.com/privacy',
    
    // Branding
    logoUrl: '/assets/logo.png',
    appName: 'MOJO Portal',
    
    // Navigation after auth events
    loginRedirect: 'dashboard',
    logoutRedirect: 'login',
    
    // Token management
    tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
    autoRefreshTokens: true,
    persistSession: true,
    
    // Custom messages
    messages: {
        loginTitle: 'Welcome to MOJO Portal',
        loginSubtitle: 'Sign in to access your dashboard',
        registerTitle: 'Join MOJO Portal',
        registerSubtitle: 'Create your account in seconds',
        forgotTitle: 'Reset Your Password',
        forgotSubtitle: 'We\'ll send you reset instructions'
    }
});

// Register portal pages
app.registerPage('dashboard', DashboardPage);
app.registerPage('profile', ProfilePage);
app.registerPage('settings', SettingsPage);
app.registerPage('users', UsersPage);

// Define protected routes that require authentication
const protectedRoutes = ['dashboard', 'profile', 'settings', 'users'];
createAuthGuards(app, protectedRoutes);

// Custom authentication event handlers
app.eventBus.on('auth:login-success', (user) => {
    console.log('User authenticated:', user);
    
    // Update topnav with user info
    if (app.topnav) {
        app.topnav.updateUser({
            name: user.name || user.email,
            email: user.email,
            avatar: user.avatar || null
        });
    }
    
    // Hide sidebar for login/register pages, show for others
    if (app.sidebar) {
        app.sidebar.show();
    }
});

app.eventBus.on('auth:logout', () => {
    console.log('User logged out');
    
    // Clear user info from topnav
    if (app.topnav) {
        app.topnav.updateUser(null);
    }
    
    // Hide sidebar on logout
    if (app.sidebar) {
        app.sidebar.hide();
    }
});

// Handle user menu actions
app.eventBus.on('topnav:profile', () => {
    app.navigate('profile');
});

app.eventBus.on('topnav:settings', () => {
    app.navigate('settings');
});

app.eventBus.on('topnav:logout', async () => {
    if (confirm('Are you sure you want to logout?')) {
        await authManager.logout();
    }
});

// Handle search
app.eventBus.on('topnav:search', (query) => {
    console.log('Search query:', query);
    app.showInfo(`Searching for: ${query}`);
});

// Handle notifications
app.eventBus.on('topnav:notifications', () => {
    app.showInfo('No new notifications');
});

// Initialize app with auth check
app.eventBus.on('app:before-start', () => {
    // Check if user is already authenticated
    const isAuthenticated = authManager.checkAuth();
    
    if (isAuthenticated) {
        console.log('User session restored');
        const user = authManager.getUser();
        
        // Update UI with user info
        if (app.topnav && user) {
            app.topnav.updateUser({
                name: user.name || user.email,
                email: user.email,
                avatar: user.avatar || null
            });
        }
    } else {
        // Hide sidebar for non-authenticated pages
        if (app.sidebar) {
            app.sidebar.hide();
        }
    }
});

// Handle route changes to show/hide sidebar
app.eventBus.on('router:after-navigate', (routeInfo) => {
    const publicRoutes = ['login', 'register', 'forgot-password'];
    
    if (app.sidebar) {
        if (publicRoutes.includes(routeInfo.route)) {
            app.sidebar.hide();
        } else if (authManager.isAuthenticated) {
            app.sidebar.show();
        }
    }
});

// Development helpers
window.app = app;
window.auth = authManager;

// For testing - create mock login function
window.mockLogin = async () => {
    // This simulates a successful login for testing
    const mockUser = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        roles: ['user', 'admin']
    };
    
    authManager.setAuth(mockUser, 'mock-jwt-token-' + Date.now());
    app.eventBus.emit('auth:login-success', mockUser);
    app.navigate('dashboard');
    app.showSuccess(`Welcome back, ${mockUser.name}!`);
};

// Start the application
app.start().then(() => {
    console.log('Auth example app started successfully');
    console.log('Available routes:', [
        'login', 'register', 'forgot-password',
        ...protectedRoutes
    ]);
    
    // Show hint in console for development
    if (app.debug) {
        console.log('%c Developer Tips:', 'color: #667eea; font-weight: bold');
        console.log('- Use window.mockLogin() to simulate login without API');
        console.log('- Access app via window.app');
        console.log('- Access auth via window.auth');
        console.log('- Protected routes:', protectedRoutes);
    }
}).catch(error => {
    console.error('Failed to start app:', error);
    app.showError('Failed to initialize application');
});