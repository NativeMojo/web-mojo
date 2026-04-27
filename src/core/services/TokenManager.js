/**
 * AuthRequiredError - Thrown by the pre-request auth gate when the access
 * token is expired and cannot be refreshed. Rest recognizes it by name and
 * short-circuits the request to a 401 response without calling fetch.
 */
export class AuthRequiredError extends Error {
    constructor(message = 'Authentication required') {
        super(message);
        this.name = 'AuthRequiredError';
        this.reason = 'unauthorized';
    }
}

/**
 * Token - Individual JWT token handling
 * Handles decoding, validation, and data extraction for a single token
 */
class Token {
    constructor(token) {
        this.token = token;
        this.payload = null;
        this.uid = null;
        this.email = null;
        this.name = null;
        this.exp = null;
        this.iat = null;
        this.isValidToken = false;

        this._decode();
    }

    /**
     * Decode JWT token payload (client-side only, no verification)
     * @private
     */
    _decode() {
        if (!this.token || typeof this.token !== 'string') {
            return;
        }

        try {
            const parts = this.token.split('.');
            if (parts.length !== 3) {
                return;
            }

            // Decode the payload (second part)
            const payload = parts[1];

            // Handle URL-safe base64
            let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            const padding = 4 - (base64.length % 4);
            if (padding !== 4) {
                base64 += '='.repeat(padding);
            }

            const decoded = atob(base64);
            this.payload = JSON.parse(decoded);

            // Extract common properties
            this.uid = this.payload.uid || this.payload.sub || this.payload.user_id || null;
            this.email = this.payload.email || null;
            this.name = this.payload.name || this.payload.username || null;
            this.exp = this.payload.exp ? new Date(this.payload.exp * 1000) : null;
            this.iat = this.payload.iat ? new Date(this.payload.iat * 1000) : null;

            // Determine validity
            this.isValidToken = this._checkValidity();
        } catch (error) {
            this.payload = null;
        }
    }

    /**
     * Check token validity
     * @private
     * @returns {boolean} True if token is valid
     */
    _checkValidity() {
        if (!this.token || !this.payload) {
            return false;
        }

        // Check expiry if present
        if (this.payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            return now < this.payload.exp;
        }

        // If no expiry, consider valid
        return true;
    }

    /**
     * Decode JWT token payload (client-side only, no verification)
     * @returns {object|null} Decoded payload or null if invalid
     */
    decode() {
        return this.payload;
    }

    /**
     * Get user ID from token
     * @returns {string|null} User ID or null if not found
     */
    getUserId() {
        return this.uid;
    }

    /**
     * Check if token is valid (exists and not expired)
     * @returns {boolean} True if token is valid
     */
    isValid() {
        return this.isValidToken;
    }

    /**
     * Check if token will expire soon
     * @param {number} thresholdMinutes - Minutes before expiry to consider "soon"
     * @returns {boolean} True if expiring soon
     */
    isExpiringSoon(thresholdMinutes = 5) {
        if (!this.payload?.exp) {
            return false;
        }

        const now = Math.floor(Date.now() / 1000);
        const threshold = thresholdMinutes * 60;
        return (this.payload.exp - now) <= threshold;
    }

    /**
     * Check if token is expired
     * @returns {boolean} True if expired
     */
    isExpired() {
        if (!this.payload?.exp) {
            return false;
        }

        const now = Math.floor(Date.now() / 1000);
        return now >= this.payload.exp;
    }

    /**
     * Get token age in minutes
     * @returns {number|null} Age in minutes since token was issued, or null if no iat
     */
    getAgeMinutes() {
        if (!this.payload?.iat) {
            return null;
        }
        const now = Math.floor(Date.now() / 1000);
        const ageSeconds = now - this.payload.iat;
        return Math.floor(ageSeconds / 60);
    }

    /**
     * Get authorization header value
     * @returns {string|null} Bearer token string or null if no token
     */
    getAuthHeader() {
        return this.token ? `Bearer ${this.token}` : null;
    }

    /**
     * Get basic user info from token
     * @returns {object|null} User info or null
     */
    getUserInfo() {
        if (!this.payload) {
            return null;
        }

        return {
            uid: this.uid,
            email: this.email,
            name: this.name,
            exp: this.exp,
            iat: this.iat
        };
    }
}

/**
 * TokenManager - Simplified JWT token handling for MOJO Auth
 * Focuses on core token operations: storage, validation, and user ID extraction
 */

export default class TokenManager {
    constructor() {
        this.tokenKey = 'access_token';
        this.refreshTokenKey = 'refresh_token';
        this.authCodeKey = 'auth_code';
        this.tokenInstance = null;
        // Single-flight guard for refreshToken(). Holds the in-flight
        // Promise<boolean> while a refresh is pending; null otherwise.
        this._refreshPromise = null;
        // Single-flight guard for handleAuthCodeFromURL() / exchangeAuthCode().
        this._exchangePromise = null;
    }

    /**
     * Store authentication tokens
     * @param {string} token - Access token
     * @param {string} refreshToken - Refresh token (optional)
     * @param {boolean} persistent - Use localStorage if true, sessionStorage if false
     */
    setTokens(token, refreshToken = null, persistent = true) {
        const storage = persistent ? localStorage : sessionStorage;
        this.tokenInstance = new Token(token);
        if (token) {
            storage.setItem(this.tokenKey, token);
        }

        if (refreshToken) {
            storage.setItem(this.refreshTokenKey, refreshToken);
        }
    }

    /**
     * Get stored access token
     * @returns {string|null} Access token or null if not found
     */
    getToken() {
        return localStorage.getItem(this.tokenKey) ||
               sessionStorage.getItem(this.tokenKey);
    }

    /**
     * Get stored refresh token
     * @returns {string|null} Refresh token or null if not found
     */
    getRefreshToken() {
        return localStorage.getItem(this.refreshTokenKey) ||
               sessionStorage.getItem(this.refreshTokenKey);
    }

    /**
     * Clear all stored tokens
     */
    clearTokens() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.refreshTokenKey);
        sessionStorage.removeItem(this.tokenKey);
        sessionStorage.removeItem(this.refreshTokenKey);
    }

    /**
     * Get Token instance for current stored token
     * @returns {Token|null} Token instance or null if no token
     */
    getTokenInstance() {
        const currentToken = this.getToken();

        // If no token stored, clear instance and return null
        if (!currentToken) {
            this.tokenInstance = null;
            return null;
        }

        // If instance doesn't exist or token changed, create new instance
        if (!this.tokenInstance || this.tokenInstance.token !== currentToken) {
            this.tokenInstance = new Token(currentToken);
        }

        return this.tokenInstance;
    }

    /**
     * Get Token instance for refresh token
     * @returns {Token|null} Token instance or null if no refresh token
     */
    getRefreshTokenInstance() {
        const currentRefreshToken = this.getRefreshToken();

        // If no refresh token stored, clear instance and return null
        if (!currentRefreshToken) {
            this._refreshTokenInstance = null;
            return null;
        }

        // If instance doesn't exist or token changed, create new instance
        if (!this._refreshTokenInstance || this._refreshTokenInstance.token !== currentRefreshToken) {
            this._refreshTokenInstance = new Token(currentRefreshToken);
        }

        return this._refreshTokenInstance;
    }

    /**
     * Decode JWT token payload (client-side only, no verification)
     * @param {string} token - JWT token
     * @returns {object|null} Decoded payload or null if invalid
     */
    decode(token = null) {
        const jwt = token || this.getToken();
        return new Token(jwt).decode();
    }

    /**
     * Get user ID from token
     * @returns {string|null} User ID or null if not found
     */
    getUserId() {
        const currentToken = this.getTokenInstance();
        return currentToken ? currentToken.getUserId() : null;
    }

    /**
     * Check if current token is valid (exists and not expired)
     * @returns {boolean} True if token is valid
     */
    isValid() {
        const currentToken = this.getTokenInstance();
        return currentToken ? currentToken.isValid() : false;
    }

    /**
     * Check if token will expire soon
     * @param {number} thresholdMinutes - Minutes before expiry to consider "soon"
     * @returns {boolean} True if expiring soon
     */
    isExpiringSoon(thresholdMinutes = 5) {
        const currentToken = this.getTokenInstance();
        return currentToken ? currentToken.isExpiringSoon(thresholdMinutes) : false;
    }

    /**
     * Get authorization header value
     * @returns {string|null} Bearer token string or null if no token
     */
    getAuthHeader() {
        const currentToken = this.getTokenInstance();
        return currentToken ? currentToken.getAuthHeader() : null;
    }

    /**
     * Get basic user info from token
     * @returns {object|null} User info or null
     */
    getUserInfo() {
        const currentToken = this.getTokenInstance();
        return currentToken ? currentToken.getUserInfo() : null;
    }

    /**
     * Check current token status and determine what action is needed
     * @returns {object} Status object with action and details
     */
    checkTokenStatus() {
        const token = this.getTokenInstance();
        const refreshToken = this.getRefreshTokenInstance();

        // If no access token or it's invalid/expired
        if (!token || !token.isValid() || token.isExpired()) {
            // Check if refresh is possible
            if (!refreshToken || !refreshToken.isValid() || refreshToken.isExpired()) {
                return {
                    action: 'logout',
                    reason: 'Both access and refresh tokens are invalid/expired'
                };
            }

            return {
                action: 'refresh',
                reason: 'Access token invalid/expired but refresh token valid'
            };
        }

        // Access token is valid - check if it needs refreshing soon
        if (token.isExpiringSoon(10) || (token.getAgeMinutes() && token.getAgeMinutes() > 60)) {
            // Only suggest refresh if refresh token is still valid
            if (!refreshToken || !refreshToken.isValid() || refreshToken.isExpired()) {
                return {
                    action: 'none',
                    reason: 'Access token expiring but refresh token invalid'
                };
            }

            return {
                action: 'refresh',
                reason: 'Access token expiring soon or aged'
            };
        }

        return {
            action: 'none',
            reason: 'All tokens valid and not expiring soon'
        };
    }

    /**
     * Check tokens and take appropriate action
     * @param {object} app - App instance for events and API calls
     * @returns {Promise<boolean>} True if action was taken
     */
    async checkAndRefreshTokens(app) {
        const status = this.checkTokenStatus();

        switch (status.action) {
            case 'logout':
                app.events.emit("auth:unauthorized");
                this.stopAutoRefresh();
                return true;

            case 'refresh':
                await this.refreshToken(app);
                return true;

            default:
                return false;
        }
    }

    startAutoRefresh(app) {
        this.stopAutoRefresh();
        this._tokenWatcher = setInterval(() => {
            this.checkAndRefreshTokens(app);
        }, 60000);
    }

    stopAutoRefresh() {
        if (this._tokenWatcher) {
            clearInterval(this._tokenWatcher);
            this._tokenWatcher = null;
        }
    }

    /**
     * Refresh the access token using the stored refresh token.
     * Single-flight: concurrent callers share one in-flight POST.
     * @param {object} app - App instance (needs .rest and .events)
     * @returns {Promise<boolean>} true on success, false on any failure
     */
    async refreshToken(app) {
        if (this._refreshPromise) {
            return this._refreshPromise;
        }

        this._refreshPromise = this._doRefresh(app).finally(() => {
            this._refreshPromise = null;
        });

        return this._refreshPromise;
    }

    /**
     * Perform the actual refresh network call. Always resolves to a boolean;
     * never throws. Emits auth:unauthorized / auth:token:refresh:failed on
     * failure paths, matching prior behavior.
     * @private
     */
    async _doRefresh(app) {
        const refreshTokenInstance = this.getRefreshTokenInstance();

        // Double-check refresh token validity before attempting refresh
        if (!refreshTokenInstance || !refreshTokenInstance.isValid() || refreshTokenInstance.isExpired()) {
            app.events.emit("auth:unauthorized");
            this.stopAutoRefresh();
            return false;
        }

        try {
            const response = await app.rest.POST('/api/token/refresh', {
                refresh_token: refreshTokenInstance.token
            });

            const { access_token, refresh_token } = response.data.data;

            // Clear old cached instances so new tokens are loaded
            this.tokenInstance = null;
            this._refreshTokenInstance = null;

            // Store new tokens
            this.setTokens(access_token, refresh_token);
            app.rest.setAuthToken(access_token);

            // Emit success event
            app.events.emit('auth:token:refreshed', {
                newToken: access_token,
                newRefreshToken: refresh_token
            });

            console.log('Token refreshed successfully');
            return true;
        } catch (error) {
            // Check if it's an authentication error (refresh token invalid)
            if (error.status === 401 || error.status === 403) {
                app.events.emit("auth:unauthorized");
                this.stopAutoRefresh();
            } else {
                // For other errors, emit specific event but don't logout
                app.events.emit('auth:token:refresh:failed', { error });
            }
            return false;
        }
    }

    /**
     * Read an `?auth_code=` param from window.location, scrub it from the URL,
     * and exchange it for tokens. Resolves to the user dict on success or
     * null when no param is present or the exchange fails. Never throws.
     *
     * The URL scrub happens *synchronously*, before any await — the auth
     * code is held in a closure local so a slow exchange cannot leak it to
     * third-party scripts that read location.search after page load.
     *
     * Single-flight: concurrent callers (e.g. PortalApp boot + a custom
     * AuthApp boot) share the same in-flight POST.
     *
     * @param {object} app - App instance (needs .rest and .events)
     * @returns {Promise<object|null>} user dict on success, null otherwise
     */
    async handleAuthCodeFromURL(app) {
        if (this._exchangePromise) {
            return this._exchangePromise;
        }

        if (typeof window === 'undefined' || !window.location) {
            return null;
        }

        const params = new URLSearchParams(window.location.search);
        const code = params.get(this.authCodeKey);
        if (!code) {
            return null;
        }

        // Scrub before any network call.
        params.delete(this.authCodeKey);
        const remaining = params.toString();
        const cleanUrl = window.location.pathname
            + (remaining ? `?${remaining}` : '')
            + (window.location.hash || '');
        window.history.replaceState({}, '', cleanUrl);

        return this.exchangeAuthCode(app, code);
    }

    /**
     * Exchange a one-time auth handoff code for access + refresh tokens.
     * Stores tokens via setTokens() and emits 'auth:login' on success;
     * emits 'auth:exchange:failed' on any failure. Never throws.
     *
     * Single-flight: concurrent callers share one in-flight POST. Mirrors
     * the refreshToken() pattern.
     *
     * @param {object} app - App instance (needs .rest and .events)
     * @param {string} code - 32-hex auth handoff code
     * @returns {Promise<object|null>} user dict on success, null on failure
     */
    async exchangeAuthCode(app, code) {
        if (this._exchangePromise) {
            return this._exchangePromise;
        }

        this._exchangePromise = this._doExchange(app, code).finally(() => {
            this._exchangePromise = null;
        });

        return this._exchangePromise;
    }

    /**
     * Perform the actual exchange network call. Always resolves; never
     * throws. Emits auth:login on success, auth:exchange:failed on failure.
     * @private
     */
    async _doExchange(app, code) {
        try {
            const response = await app.rest.POST('/api/auth/exchange', { code });
            // Tolerate the same response wrappers the rest of the codebase
            // does: { data: { data: {...} } } | { data: {...} } | flat.
            const payload = response?.data?.data || response?.data || response;
            const access_token = payload?.access_token;
            const refresh_token = payload?.refresh_token;
            const user = payload?.user;

            if (!access_token) {
                throw new Error('No access_token in /api/auth/exchange response');
            }

            // Clear cached instances so new tokens are loaded fresh.
            this.tokenInstance = null;
            this._refreshTokenInstance = null;

            this.setTokens(access_token, refresh_token);
            app.rest.setAuthToken(access_token);

            app.events.emit('auth:login', user);
            return user;
        } catch (error) {
            app.events.emit('auth:exchange:failed', { error });
            return null;
        }
    }

    /**
     * Gate an outgoing request on token validity. Intended for use by a
     * pre-request interceptor.
     *
     * - Valid access token: returns (no network).
     * - Expired access token + valid refresh: awaits the (single-flight)
     *   refresh; throws AuthRequiredError if the refresh fails.
     * - Both tokens expired/invalid: emits auth:unauthorized and throws
     *   AuthRequiredError without hitting the network.
     *
     * @param {object} app - App instance (needs .rest and .events)
     * @throws {AuthRequiredError} when the request must not be sent
     */
    async ensureValidToken(app) {
        const status = this.checkTokenStatus();

        if (status.action === 'logout') {
            app.events.emit('auth:unauthorized');
            this.stopAutoRefresh();
            throw new AuthRequiredError('Both access and refresh tokens are invalid');
        }

        if (status.action === 'refresh') {
            const ok = await this.refreshToken(app);
            if (!ok) {
                throw new AuthRequiredError('Token refresh failed');
            }
        }
    }
}
