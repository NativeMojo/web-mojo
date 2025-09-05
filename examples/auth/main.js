/**
 * Production Auth Portal
 * Simple authentication gateway that redirects to external portal after login
 *
 * Usage:
 * https://auth.yourcompany.com/?portal=https://app.yourcompany.com&company=Acme%20Corp&api=https://api.yourcompany.com
 */

import AuthApp from '/src/auth/AuthApp.js';

// Configuration from URL params or environment variables
const config = {
    apiURL: new URLSearchParams(window.location.search).get('api') ||
            window.AUTH_API_URL ||
            'http://localhost:8882',

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
        console.log('Initializing Auth Portal...', config);

        // Create the AuthApp instance directly
        const app = new AuthApp({
            container: '#app',
            name: `${config.companyName} - Sign In`,
            api: {
                baseURL: config.apiURL
            },
            passwordResetMethod: 'code',
            // Auth-specific UI customizations
            ui: {
                title: config.companyName,
                logoUrl: config.logoURL,
                messages: {
                    loginTitle: `Welcome to ${config.companyName}`,
                    loginSubtitle: 'Sign in to continue to your account',
                }
            },
            // Redirect to the main portal on successful login
            loginRedirect: config.portalURL
        });

        // Handle successful authentication - redirect to portal
        app.events.on('auth:login', (user) => {
            console.log('User authenticated:', user?.email);
            redirectToPortal(user, app.auth.tokenManager.getToken());
        });

        // Handle registration success - also redirect to portal
        app.events.on('auth:register', (user) => {
            console.log('User registered:', user?.email);
            redirectToPortal(user, app.auth.tokenManager.getToken(), true);
        });

        // Start the application
        await app.start();

        // Store app reference for demo navigation
        window.mojoApp = app;

        // Hide initial loader and update demo info
        window.hideInitialLoader?.();
        window.updateDemoInfo?.(config);

        // Show login page by default if no other route is active
        if (!app.router.getCurrentRoute()) {
            await app.navigate('/login');
        }

        console.log('Auth Portal ready');

    } catch (error) {
        console.error('Auth Portal initialization failed:', error);
        window.hideInitialLoader?.();
        setTimeout(() => showErrorPage(error), 500);
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
