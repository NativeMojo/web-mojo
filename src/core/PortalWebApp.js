/**
 * PortalWebApp - Opinionated portal base class with auth-gated lifecycle
 *
 * Extends PortalApp with:
 * - Auth-gated start: router only starts after successful authentication
 * - Automatic WebSocket setup after auth (configurable)
 * - Configurable auth failure handling with countdown redirect
 * - Clean lifecycle events: user:ready, ws:ready, ws:lost, user:logout
 * - Overridable hook: onAuthFailed(error)
 *
 * Usage:
 *   const app = new PortalWebApp({
 *     name: 'Acme Portal',
 *     container: '#app',
 *     api: { baseUrl: 'https://api.acme.com' },
 *     auth: { loginUrl: '/login' },
 *     ws: true,
 *     sidebar: { ... },
 *     topbar: { ... },
 *     defaultRoute: 'home'
 *   });
 *
 *   app.registerPage('home', HomePage);
 *   const result = await app.start();
 *   // { success: true, user } or { success: false, error }
 */

import PortalApp from '@core/PortalApp.js';
import WebSocketClient from '@core/services/WebSocketClient.js';

export default class PortalWebApp extends PortalApp {
    constructor(config = {}) {
        super(config);

        // Auth configuration — default: enabled with /login redirect
        if (config.auth === false) {
            this._authEnabled = false;
            this._authConfig = {};
        } else {
            this._authEnabled = true;
            this._authConfig = typeof config.auth === 'object' ? config.auth : {};
            if (!this._authConfig.loginUrl) {
                this._authConfig.loginUrl = '/login';
            }
        }
        this._authConfig.redirectDelay = this._authConfig.redirectDelay || 3000;

        // WebSocket configuration — default: enabled
        this._wsEnabled = config.ws !== false;

        // WebSocket instance (created in start)
        this.ws = null;
    }

    /**
     * Start the portal with auth-gated lifecycle.
     *
     * Lifecycle:
     *   1. Register auth event handlers (before auth check — no race)
     *   2. Check auth status (if enabled)
     *   3. Emit 'user:ready'
     *   4. Check active group
     *   5. Connect WebSocket (if enabled)
     *   6. Start router
     *   7. Emit 'app:ready'
     *
     * @returns {{ success: boolean, user?: object, error?: string }}
     */
    async start() {
        if (this.isStarted) {
            console.warn('PortalWebApp already started');
            return { success: true, user: this.activeUser };
        }

        // 1. Register auth event handlers BEFORE auth check (fixes race condition)
        this._registerAuthHandlers();

        // 2. Authenticate (if enabled)
        if (this._authEnabled) {
            const authOk = await this.checkAuthStatus();

            if (!authOk) {
                const error = 'Authentication failed';
                await this._handleAuthFailure(error);
                return { success: false, error };
            }

            // Emit user:ready after successful auth, before WS/router
            this.events.emit('user:ready', { user: this.activeUser });
        }

        // 3. Check active group (inherited from PortalApp)
        if (this.activeUser) {
            await this.checkActiveGroup();
        }

        // 4. Connect WebSocket (if enabled)
        if (this._wsEnabled) {
            await this._setupWebSocket();
        }

        // 5. Register portal action handler
        this.events.on('portal:action', this.onPortalAction.bind(this));

        // 6. Register browser focus handler for token refresh
        this.events.on('browser:focus', () => {
            if (!this.activeUser) return;
            this.tokenManager.checkAndRefreshTokens(this);
        });

        // 7. Start router
        await this.setupRouter();

        // Mark as started
        this.isStarted = true;

        // 8. Emit app:ready
        this.events.emit('app:ready', { app: this });

        // 9. Passkey setup prompt (inherited behavior)
        if (this.activeUser && !this.activeUser.get('has_passkey')) {
            this.showPasskeySetup();
        }

        return { success: true, user: this.activeUser };
    }

    /**
     * Register auth event handlers before auth check to avoid race conditions.
     * @private
     */
    _registerAuthHandlers() {
        this.events.on('auth:unauthorized', () => {
            this._handleLogout();
        });

        this.events.on('auth:logout', () => {
            this._handleLogout();
        });
    }

    /**
     * Handle logout: clear tokens, disconnect WS, redirect.
     * @private
     */
    _handleLogout() {
        this.tokenManager.clearTokens();
        this.rest.clearAuth();
        this.setActiveUser(null);

        // Disconnect and clear WebSocket if connected
        if (this.ws) {
            this.ws.disconnect();
            this.ws = null;
        }

        // Emit user:logout event
        this.events.emit('user:logout');

        // Redirect to login if configured
        if (this._authConfig.loginUrl) {
            window.location.href = this._authConfig.loginUrl;
        }
    }

    /**
     * Handle auth failure: call hook, then default redirect.
     * @private
     */
    async _handleAuthFailure(error) {
        // Call overridable hook — if subclass overrides, it handles everything
        const handled = await this.onAuthFailed(error);
        if (handled) return;

        // Default behavior: show countdown and redirect to login
        const loginUrl = this._authConfig.loginUrl;
        if (!loginUrl) return;

        const delay = this._authConfig.redirectDelay;
        const seconds = Math.ceil(delay / 1000);

        // Show countdown page in the portal container
        const container = typeof this.container === 'string'
            ? document.querySelector(this.container)
            : this.container;

        if (container) {
            container.innerHTML = `
                <div class="d-flex align-items-center justify-content-center" style="min-height: 100vh;">
                    <div class="text-center">
                        <i class="bi bi-shield-lock fs-1 text-muted mb-3 d-block"></i>
                        <h5 class="text-muted">Authentication Required</h5>
                        <p class="text-muted">Redirecting to login in <span id="auth-countdown">${seconds}</span> seconds...</p>
                    </div>
                </div>
            `;

            // Countdown timer
            let remaining = seconds;
            const countdownEl = container.querySelector('#auth-countdown');
            const timer = setInterval(() => {
                remaining--;
                if (countdownEl) countdownEl.textContent = remaining;
                if (remaining <= 0) clearInterval(timer);
            }, 1000);
        }

        // Redirect after delay
        setTimeout(() => {
            window.location.href = loginUrl;
        }, delay);
    }

    /**
     * Override this in subclasses for custom auth failure handling.
     * Return true to prevent the default countdown redirect.
     *
     * @param {string} error - Error description
     * @returns {boolean} true if handled (skips default redirect)
     */
    async onAuthFailed(_error) {
        // Default: not handled, let _handleAuthFailure show countdown
        return false;
    }

    /**
     * Setup WebSocket connection after authentication.
     * @private
     */
    async _setupWebSocket() {
        try {
            const baseUrl = this.config.api?.baseUrl;
            if (!baseUrl) {
                console.warn('[PortalWebApp] Cannot setup WebSocket: no api.baseUrl configured');
                return;
            }

            const url = WebSocketClient.deriveURL(baseUrl, '/ws/realtime/');

            this.ws = new WebSocketClient({
                url,
                tokenPrefix: 'bearer',
                getToken: () => this.tokenManager?.getToken(),
                app: this
            });

            // Bridge WS events to app EventBus
            this.ws.on('connected', () => {
                this.events.emit('ws:ready');
            });

            this.ws.on('disconnected', (data) => {
                this.events.emit('ws:lost', data);
            });

            this.ws.on('reconnecting', (data) => {
                this.events.emit('ws:reconnecting', data);
            });

            await this.ws.connect();
        } catch (_err) {
            console.warn('[PortalWebApp] WebSocket connection failed:', _err.message);
            // WS failure is non-fatal — app still works without realtime
        }
    }

    /**
     * Clean up all resources.
     */
    async destroy() {
        // Destroy WebSocket
        if (this.ws) {
            this.ws.destroy();
            this.ws = null;
        }

        // Call parent destroy (handles sidebar, topbar, router, pages)
        await super.destroy();
    }
}
