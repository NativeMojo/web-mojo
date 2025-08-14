/**
 * JWT Utilities
 * Handles JWT token operations for the PAYOMI portal
 */

export default class JWTUtils {
    constructor() {
        this.tokenKey = 'payomi_token';
        this.refreshTokenKey = 'payomi_refresh_token';
    }

    /**
     * Decode a JWT token (without verification)
     * Verification should be done server-side
     * @param {string} token - JWT token string
     * @returns {object|null} Decoded token payload or null if invalid
     */
    decode(token) {
        if (!token || typeof token !== 'string') {
            console.error('Invalid token provided to decode');
            return null;
        }

        try {
            // JWT structure: header.payload.signature
            const parts = token.split('.');
            
            if (parts.length !== 3) {
                console.error('Invalid JWT structure');
                return null;
            }

            // Decode the payload (second part)
            const payload = parts[1];
            
            // Base64 decode (handle URL-safe base64)
            const decoded = this.base64UrlDecode(payload);
            
            return JSON.parse(decoded);
        } catch (error) {
            console.error('Error decoding JWT:', error);
            return null;
        }
    }

    /**
     * Decode base64url encoded string
     * @param {string} str - Base64url encoded string
     * @returns {string} Decoded string
     */
    base64UrlDecode(str) {
        // Replace URL-safe characters
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        
        // Add padding if necessary
        const padding = 4 - (base64.length % 4);
        if (padding !== 4) {
            base64 += '='.repeat(padding);
        }
        
        // Decode base64
        const decoded = atob(base64);
        
        // Handle UTF-8 decoding
        return decodeURIComponent(
            decoded.split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join('')
        );
    }

    /**
     * Check if a token is expired
     * @param {object|string} tokenOrPayload - Token string or decoded payload
     * @returns {boolean} True if expired, false otherwise
     */
    isExpired(tokenOrPayload) {
        let payload = tokenOrPayload;
        
        // If string, decode it first
        if (typeof tokenOrPayload === 'string') {
            payload = this.decode(tokenOrPayload);
        }
        
        if (!payload || !payload.exp) {
            // No expiry claim, consider it expired
            return true;
        }
        
        // Check if current time is past expiry
        // JWT exp is in seconds, Date.now() is in milliseconds
        const now = Math.floor(Date.now() / 1000);
        return now >= payload.exp;
    }

    /**
     * Get time until token expiry
     * @param {object|string} tokenOrPayload - Token string or decoded payload
     * @returns {number} Milliseconds until expiry, or -1 if expired/invalid
     */
    getTimeUntilExpiry(tokenOrPayload) {
        let payload = tokenOrPayload;
        
        // If string, decode it first
        if (typeof tokenOrPayload === 'string') {
            payload = this.decode(tokenOrPayload);
        }
        
        if (!payload || !payload.exp) {
            return -1;
        }
        
        const now = Date.now();
        const expiryTime = payload.exp * 1000; // Convert to milliseconds
        const timeUntilExpiry = expiryTime - now;
        
        return timeUntilExpiry > 0 ? timeUntilExpiry : -1;
    }

    /**
     * Check if token will expire soon
     * @param {object|string} tokenOrPayload - Token string or decoded payload
     * @param {number} threshold - Threshold in milliseconds (default 5 minutes)
     * @returns {boolean} True if expiring soon, false otherwise
     */
    isExpiringSoon(tokenOrPayload, threshold = 5 * 60 * 1000) {
        const timeUntilExpiry = this.getTimeUntilExpiry(tokenOrPayload);
        
        if (timeUntilExpiry === -1) {
            return true; // Already expired or invalid
        }
        
        return timeUntilExpiry <= threshold;
    }

    /**
     * Extract specific claim from token
     * @param {string} token - JWT token string
     * @param {string} claim - Claim name to extract
     * @returns {any} Claim value or undefined if not found
     */
    getClaim(token, claim) {
        const payload = this.decode(token);
        return payload ? payload[claim] : undefined;
    }

    /**
     * Get user info from token
     * @param {string} token - JWT token string
     * @returns {object|null} User info object or null
     */
    getUserInfo(token) {
        const payload = this.decode(token);
        
        if (!payload) {
            return null;
        }
        
        // Extract standard user claims
        return {
            id: payload.sub || payload.user_id || payload.id,
            email: payload.email,
            name: payload.name || payload.username,
            roles: payload.roles || [],
            permissions: payload.permissions || [],
            issued: payload.iat ? new Date(payload.iat * 1000) : null,
            expires: payload.exp ? new Date(payload.exp * 1000) : null
        };
    }

    /**
     * Check if token has specific role
     * @param {string} token - JWT token string
     * @param {string} role - Role to check
     * @returns {boolean} True if has role, false otherwise
     */
    hasRole(token, role) {
        const payload = this.decode(token);
        
        if (!payload || !payload.roles) {
            return false;
        }
        
        const roles = Array.isArray(payload.roles) ? payload.roles : [payload.roles];
        return roles.includes(role);
    }

    /**
     * Check if token has specific permission
     * @param {string} token - JWT token string
     * @param {string} permission - Permission to check
     * @returns {boolean} True if has permission, false otherwise
     */
    hasPermission(token, permission) {
        const payload = this.decode(token);
        
        if (!payload || !payload.permissions) {
            return false;
        }
        
        const permissions = Array.isArray(payload.permissions) ? 
            payload.permissions : [payload.permissions];
        return permissions.includes(permission);
    }

    /**
     * Store tokens in storage
     * @param {string} token - Access token
     * @param {string} refreshToken - Refresh token
     * @param {boolean} remember - Use localStorage if true, sessionStorage if false
     */
    storeTokens(token, refreshToken, remember = false) {
        const storage = remember ? localStorage : sessionStorage;
        
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
     * Create authorization header value
     * @param {string} token - Token to use (defaults to stored token)
     * @returns {string|null} Bearer token string or null if no token
     */
    getAuthHeader(token = null) {
        const accessToken = token || this.getToken();
        return accessToken ? `Bearer ${accessToken}` : null;
    }

    /**
     * Format expiry time for display
     * @param {object|string} tokenOrPayload - Token string or decoded payload
     * @returns {string} Formatted expiry time or 'Never' if no expiry
     */
    formatExpiry(tokenOrPayload) {
        let payload = tokenOrPayload;
        
        // If string, decode it first
        if (typeof tokenOrPayload === 'string') {
            payload = this.decode(tokenOrPayload);
        }
        
        if (!payload || !payload.exp) {
            return 'Never';
        }
        
        const expiryDate = new Date(payload.exp * 1000);
        const now = new Date();
        
        // If expired
        if (expiryDate < now) {
            return 'Expired';
        }
        
        // Calculate time difference
        const diff = expiryDate - now;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''}`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''}`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''}`;
        } else {
            return 'Less than a minute';
        }
    }

    /**
     * Validate token structure (not cryptographic validation)
     * @param {string} token - Token to validate
     * @returns {boolean} True if valid structure, false otherwise
     */
    isValidStructure(token) {
        if (!token || typeof token !== 'string') {
            return false;
        }
        
        // Check basic JWT structure
        const parts = token.split('.');
        if (parts.length !== 3) {
            return false;
        }
        
        // Try to decode each part
        try {
            // Header
            JSON.parse(this.base64UrlDecode(parts[0]));
            
            // Payload
            JSON.parse(this.base64UrlDecode(parts[1]));
            
            // Signature should be present (but we don't verify it)
            return parts[2].length > 0;
        } catch {
            return false;
        }
    }
}