/**
 * Production Auth Portal
 * Simple authentication gateway that redirects to external portal after login
 *
 * Usage:
 * https://auth.yourcompany.com/?portal=https://app.yourcompany.com&company=Acme%20Corp&api=https://api.yourcompany.com
 */

import { WebApp } from '../../src/index.js';
import { AuthApp } from '../../src/auth.js';

// Configuration from URL params or environment variables
const config = {
    apiURL: new URLSearchParams(window.location.search).get('api') ||
            window.AUTH_API_URL ||
            'http://localhost:8881',

    portalURL: new URLSearchParams(window.location.search).get('portal') ||
               window.PORTAL_URL ||
               'http://localhost:3000/examples/portal/',

    companyName: new URLSearchParams(window.location.search).get('company') ||
                 window.COMPANY_NAME ||
                 'Your Company',

    logoURL: new URLSearchParams(window.location.search).get('logo') ||
             window.LOGO_URL ||
             null

};

async function initAuthPortal() {
    try {
        console.log('Initializing Auth Portal...', {
            api: config.apiURL,
            portal: config.portalURL,
            company: config.companyName
        });

        // Create WebApp with page-container
        const app = WebApp.create({
            container: '#app',
            layout: 'custom',
            title: `${config.companyName} - Sign In`,
            basePath: '/'
        });

        // Setup Authentication
        const authApp = await AuthApp.create(app, {
            baseURL: config.apiURL,

            // Routes
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
                title: config.companyName,
                logoUrl: config.logoURL,
                loginIcon: 'bi bi-lightning-charge-fill',
                messages: {
                    loginTitle: `Welcome to ${config.companyName}`,
                    loginSubtitle: 'Sign in to continue to your account',
                    registerTitle: 'Create Account',
                    registerSubtitle: 'Join us to get started',
                    forgotTitle: 'Reset Password',
                    forgotSubtitle: 'We\'ll send you reset instructions'
                }
            },

            // Features - enable all login page features
            features: {
                registration: true,
                forgotPassword: true,
                rememberMe: true
            }
        });

        // Handle successful authentication - redirect to portal
        app.events.on('auth:login', (user) => {
            console.log('User authenticated:', user?.email);

            // Show brief success message
            app.showSuccess(`Welcome back, ${user?.name || user?.email}!`);

            // Redirect to external portal with token
            setTimeout(() => {
                redirectToPortal(user, app.auth.tokenManager.getToken());
            }, 1500);
        });

        // Handle registration success - also redirect to portal
        app.events.on('auth:register', (user) => {
            console.log('User registered:', user?.email);

            app.showSuccess(`Account created! Welcome, ${user?.name || user?.email}!`);

            setTimeout(() => {
                redirectToPortal(user, app.auth.tokenManager.getToken(), true);
            }, 1500);
        });

        // Handle auth errors
        app.events.on('auth:loginError', (error) => {
            console.error('Login failed:', error.message);
        });

        app.events.on('auth:registerError', (error) => {
            console.error('Registration failed:', error.message);
        });

        // Start the application
        await app.start();

        // Store app reference for demo navigation
        window.mojoApp = app;

        // Hide initial loader
        if (window.hideInitialLoader) {
            window.hideInitialLoader();
        }

        // Update demo bar info
        if (window.updateDemoInfo) {
            window.updateDemoInfo(config);
        }

        // Show login page by default
        await app.navigate('/login');

        console.log('Auth Portal ready');

    } catch (error) {
        console.error('Auth Portal initialization failed:', error);

        // Hide loader and show error
        if (window.hideInitialLoader) {
            window.hideInitialLoader();
        }

        // Show error in page-container
        setTimeout(() => {
            showErrorPage(error);
        }, 500);
    }
}

/**
 * Redirect user to external portal with authentication token
 */
function redirectToPortal(user, token, isNewUser = false) {
    try {
        const portalUrl = new URL(config.portalURL);
        portalUrl.searchParams.set('token', token);
        portalUrl.searchParams.set('user', user?.uid || '');

        if (isNewUser) {
            portalUrl.searchParams.set('new_user', '1');
        }

        console.log('Redirecting to portal:', portalUrl.origin);
        window.location.href = portalUrl.toString();

    } catch (error) {
        console.error('Failed to redirect to portal:', error);
        alert('Authentication successful, but failed to redirect to application. Please contact support.');
    }
}

/**
 * Show error page when initialization fails
 */
function showErrorPage(error) {
    const container = document.querySelector('#page-container');
    if (!container) return;

    container.innerHTML = `
        <div class="min-vh-100 d-flex align-items-center justify-content-center p-4">
            <div class="card shadow-lg" style="max-width: 500px; width: 100%;">
                <div class="card-body p-4 text-center">
                    <div class="text-danger mb-3">
                        <i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i>
                    </div>
                    <h4 class="card-title text-danger">Service Unavailable</h4>
                    <p class="card-text text-muted mb-3">
                        Unable to connect to the authentication service. Please try again later.
                    </p>
                    <div class="alert alert-light text-start">
                        <small>
                            <strong>Error:</strong> ${error.message}<br>
                            <strong>API Endpoint:</strong> ${config.apiURL}<br>
                            <strong>Company:</strong> ${config.companyName}
                        </small>
                    </div>
                    <div class="d-grid gap-2">
                        <button class="btn btn-primary" onclick="window.location.reload()">
                            <i class="bi bi-arrow-clockwise me-1"></i> Retry
                        </button>
                        <a href="mailto:support@${new URL(config.portalURL).hostname}"
                           class="btn btn-outline-secondary">
                            <i class="bi bi-envelope me-1"></i> Contact Support
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthPortal);
} else {
    initAuthPortal();
}

/**
 * Navigate to register page (called from demo bar)
 */
function navigateToRegister() {
    // Get the current app instance and navigate
    const pageContainer = document.querySelector('#page-container');
    if (pageContainer && window.mojoApp) {
        window.mojoApp.navigate('/register').catch(console.error);
    } else {
        console.warn('Cannot navigate to register - app not ready');
    }
}

// Export for debugging and demo bar integration
window.AuthPortal = {
    config,
    initAuthPortal,
    redirectToPortal,
    navigateToRegister
};
