/**
 * Auth Demo Application
 * Demonstrates the simplified MOJO authentication system
 * Focuses on authentication pages: login, register, forgot password
 */

import WebApp from '../../src/app/WebApp.js';
import AuthApp from '../../src/auth/AuthApp.js';
import PasskeyPlugin from '../../src/auth/plugins/PasskeyPlugin.js';

/**
 * Main application initialization
 */
async function initApp() {
    console.log('Initializing Auth Demo App...');

    try {
        // 1. Create the main WebApp instance
        const app = WebApp.create({
            container: '#app',
            title: 'Auth Demo App',
            basePath: '/'
        });

        // 2. Set up authentication with AuthApp
        const authApp = await AuthApp.create(app, {
            // API Configuration
            baseURL: 'http://localhost:8881',
            
            // Page Routes
            routes: {
                login: '/login',
                register: '/register', 
                forgot: '/forgot-password'
            },
            
            // Navigation
            loginRedirect: '/',
            logoutRedirect: '/login',
            
            // UI Configuration
            ui: {
                title: 'Auth Demo App',
                logoUrl: '/assets/demo-logo.png',
                messages: {
                    loginTitle: 'Welcome Back',
                    loginSubtitle: 'Sign in to your demo account',
                    registerTitle: 'Join the Demo',
                    registerSubtitle: 'Create your demo account today',
                    forgotTitle: 'Reset Password',
                    forgotSubtitle: 'We\'ll help you get back in'
                }
            },

            // Features
            features: {
                registration: true,
                forgotPassword: true,
                rememberMe: true
            }
        });

        // 3. Add passkey plugin for advanced authentication
        const passkeyPlugin = new PasskeyPlugin({
            rpName: 'Auth Demo App',
            rpId: window.location.hostname,
            authenticatorAttachment: 'platform' // Use platform authenticators
        });

        authApp.addPlugin(passkeyPlugin);

        // 4. Set up navigation and status display
        setupNavigation(app);
        setupAuthStatusDisplay(app);

        // 5. Start the application
        await app.start();

        console.log('Auth Demo App initialized successfully!');
        
        // Show login page by default
        await app.navigate('/login');

        // Hide loading overlay
        if (window.hideLoading) {
            window.hideLoading();
        }

    } catch (error) {
        console.error('Failed to initialize app:', error);
        
        // Show error in app container
        const appContainer = document.querySelector('#app');
        if (appContainer) {
            appContainer.innerHTML = `
                <div class="alert alert-danger m-4">
                    <h4 class="alert-heading">Initialization Error</h4>
                    <p>Failed to initialize the authentication demo app.</p>
                    <hr>
                    <p class="mb-0"><strong>Error:</strong> ${error.message}</p>
                </div>
            `;
        }
        
        if (window.hideLoading) {
            window.hideLoading();
        }
    }
}

/**
 * Set up navigation helpers and UI updates
 */
function setupNavigation(app) {
    // Update navigation based on auth state
    app.events.on('auth:login', (user) => {
        updateNavigation(app, true);
        updateAuthStatus(app);
        console.log('User logged in:', user);
    });

    app.events.on('auth:logout', () => {
        updateNavigation(app, false);
        updateAuthStatus(app);
        console.log('User logged out');
    });

    app.events.on('auth:register', (user) => {
        updateNavigation(app, true);
        updateAuthStatus(app);
        console.log('User registered:', user);
    });

    // Initial navigation setup
    setTimeout(() => {
        updateNavigation(app, app.auth?.isAuthenticated || false);
        updateAuthStatus(app);
    }, 100);
}

/**
 * Update navigation menu based on auth state
 */
function updateNavigation(app, isAuthenticated) {
    const nav = document.querySelector('.app-nav');
    if (!nav) return;

    if (isAuthenticated) {
        nav.innerHTML = `
            <div class="alert alert-success text-center mb-0">
                <strong>✅ Authentication Demo Complete!</strong><br>
                <small>You are now logged in. In a real app, you would see protected content.</small>
            </div>
            <div class="d-flex justify-content-center mt-3 flex-wrap gap-2">
                <button class="btn btn-outline-primary" data-action="logout">
                    <i class="bi bi-box-arrow-right"></i> Logout
                </button>
                <button class="btn btn-outline-secondary" data-action="setup-passkey">
                    <i class="bi bi-fingerprint"></i> Setup Passkey
                </button>
            </div>
        `;
    } else {
        nav.innerHTML = `
            <div class="alert alert-info text-center mb-0">
                <strong>🔐 Authentication Demo</strong><br>
                <small>Try the authentication features below</small>
            </div>
            <div class="d-flex justify-content-center mt-3 flex-wrap gap-2">
                <button class="btn btn-primary" data-page="login">
                    <i class="bi bi-box-arrow-in-right"></i> Login
                </button>
                <button class="btn btn-outline-primary" data-page="register">
                    <i class="bi bi-person-plus"></i> Register
                </button>
                <button class="btn btn-outline-secondary" data-page="forgot-password">
                    <i class="bi bi-key"></i> Reset Password
                </button>
            </div>
        `;
    }

    // Add click handlers
    nav.addEventListener('click', async (event) => {
        event.preventDefault();
        const target = event.target.closest('[data-page], [data-action]');
        if (!target) return;

        try {
            if (target.dataset.page) {
                await app.showPage(target.dataset.page);
            } else if (target.dataset.action === 'logout') {
                await app.auth.logout();
            } else if (target.dataset.action === 'setup-passkey') {
                await setupPasskeyDemo(app);
            }
        } catch (error) {
            console.error('Navigation error:', error);
            app.showError('Navigation failed: ' + error.message);
        }
    });
}

/**
 * Set up real-time auth status display
 */
function setupAuthStatusDisplay(app) {
    updateAuthStatus(app);
    
    // Update every 30 seconds to show token expiry info
    setInterval(() => updateAuthStatus(app), 30000);
}

/**
 * Update auth status display
 */
function updateAuthStatus(app) {
    const statusContainer = document.querySelector('.auth-status');
    if (!statusContainer) return;

    const auth = app.auth;
    
    if (auth?.isAuthenticated) {
        const user = auth.getUser();
        const token = auth.tokenManager.getToken();
        const payload = auth.tokenManager.decode(token);
        
        let expiryInfo = '';
        if (payload?.exp) {
            const expiryDate = new Date(payload.exp * 1000);
            const now = new Date();
            const minutesLeft = Math.floor((expiryDate - now) / (1000 * 60));
            
            if (minutesLeft > 0) {
                expiryInfo = `<small class="text-muted d-block">Token expires in ${minutesLeft} minutes</small>`;
            } else {
                expiryInfo = `<small class="text-danger d-block">Token expired</small>`;
            }
        }
        
        statusContainer.innerHTML = `
            <div class="alert alert-success mb-0">
                <i class="bi bi-person-check-fill me-2"></i>
                <strong>Authenticated:</strong> ${user?.name || user?.email || 'Demo User'}
                <br>
                <small class="text-muted">User ID: ${user?.uid || 'N/A'}</small>
                ${expiryInfo}
            </div>
        `;
    } else {
        statusContainer.innerHTML = `
            <div class="alert alert-warning mb-0">
                <i class="bi bi-person-x-fill me-2"></i>
                <strong>Not authenticated</strong> - Try the login demo above
            </div>
        `;
    }
}

/**
 * Demo passkey setup
 */
async function setupPasskeyDemo(app) {
    if (!app.auth.isAuthenticated) {
        app.showWarning('Please log in first to set up passkey');
        return;
    }
    
    if (!app.auth.isPasskeySupported?.()) {
        app.showError('Passkey authentication is not supported in this browser');
        return;
    }
    
    try {
        app.showLoading('Setting up passkey...');
        await app.auth.setupPasskey();
        app.showSuccess('Passkey set up successfully! You can now use it to log in.');
    } catch (error) {
        console.error('Passkey setup error:', error);
        app.showError('Failed to set up passkey: ' + error.message);
    } finally {
        app.hideLoading();
    }
}

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Export for debugging
window.AuthDemo = {
    initApp,
    updateNavigation,
    updateAuthStatus,
    setupPasskeyDemo
};