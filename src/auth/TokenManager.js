/**
 * TokenManager - Simplified JWT token handling for MOJO Auth
 * Focuses on core token operations: storage, validation, and user ID extraction
 */

export default class TokenManager {
    constructor() {
        this.tokenKey = 'mojo_auth_token';
        this.refreshTokenKey = 'mojo_auth_refresh_token';
    }

    /**
     * Store authentication tokens
     * @param {string} token - Access token
     * @param {string} refreshToken - Refresh token (optional)
     * @param {boolean} persistent - Use localStorage if true, sessionStorage if false
     */
    setTokens(token, refreshToken = null, persistent = false) {
        const storage = persistent ? localStorage : sessionStorage;
        
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
     * Decode JWT token payload (client-side only, no verification)
     * @param {string} token - JWT token
     * @returns {object|null} Decoded payload or null if invalid
     */
    decode(token = null) {
        const jwt = token || this.getToken();
        
        if (!jwt || typeof jwt !== 'string') {
            return null;
        }

        try {
            const parts = jwt.split('.');
            if (parts.length !== 3) {
                return null;
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
            return JSON.parse(decoded);
        } catch (error) {
            console.error('Failed to decode JWT:', error);
            return null;
        }
    }

    /**
     * Get user ID from token
     * @returns {string|null} User ID or null if not found
     */
    getUserId() {
        const payload = this.decode();
        return payload?.uid || payload?.sub || payload?.user_id || null;
    }

    /**
     * Check if current token is valid (exists and not expired)
     * @returns {boolean} True if token is valid
     */
    isValid() {
        const token = this.getToken();
        if (!token) {
            return false;
        }

        const payload = this.decode(token);
        if (!payload) {
            return false;
        }

        // Check expiry if present
        if (payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            return now < payload.exp;
        }

        // If no expiry, consider valid
        return true;
    }

    /**
     * Check if token will expire soon
     * @param {number} thresholdMinutes - Minutes before expiry to consider "soon"
     * @returns {boolean} True if expiring soon
     */
    isExpiringSoon(thresholdMinutes = 5) {
        const payload = this.decode();
        if (!payload?.exp) {
            return false;
        }

        const now = Math.floor(Date.now() / 1000);
        const threshold = thresholdMinutes * 60;
        return (payload.exp - now) <= threshold;
    }

    /**
     * Get authorization header value
     * @returns {string|null} Bearer token string or null if no token
     */
    getAuthHeader() {
        const token = this.getToken();
        return token ? `Bearer ${token}` : null;
    }

    /**
     * Get basic user info from token
     * @returns {object|null} User info or null
     */
    getUserInfo() {
        const payload = this.decode();
        if (!payload) {
            return null;
        }

        return {
            uid: payload.uid || payload.sub || payload.user_id,
            email: payload.email,
            name: payload.name || payload.username,
            exp: payload.exp ? new Date(payload.exp * 1000) : null,
            iat: payload.iat ? new Date(payload.iat * 1000) : null
        };
    }
}