/**
 * AuthService - Simplified authentication API service
 * Handles core authentication API calls: login, register, password reset, etc.
 */

export default class AuthService {
    constructor(config = {}) {
        this.baseURL = config.baseURL || 'http://localhost:8881';
        this.timeout = config.timeout || 30000;
    }

    /**
     * Login with username/email and password
     * @param {string} username - Username or email
     * @param {string} password - Password
     * @returns {Promise<object>} Response with user, token, and refreshToken
     */
    async login(username, password) {
        try {
            const response = await this.makeRequest('/api/login', 'POST', {
                username,
                password
            });

            return {
                success: true,
                data: response
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: error.message || 'Login failed'
            };
        }
    }

    /**
     * Register new user
     * @param {object} userData - User registration data
     * @returns {Promise<object>} Response with user, token, and refreshToken
     */
    async register(userData) {
        try {
            const response = await this.makeRequest('/api/register', 'POST', userData);

            return {
                success: true,
                data: response
            };
        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                message: error.message || 'Registration failed'
            };
        }
    }

    /**
     * Request password reset
     * @param {string} email - User email
     * @returns {Promise<object>} Response indicating success or failure
     */
    async forgotPassword(email) {
        try {
            const response = await this.makeRequest('/api/auth/forgot-password', 'POST', {
                email
            });

            return {
                success: true,
                data: response
            };
        } catch (error) {
            console.error('Forgot password error:', error);
            return {
                success: false,
                message: error.message || 'Failed to process password reset request'
            };
        }
    }

    /**
     * Reset password with token
     * @param {string} token - Reset token
     * @param {string} password - New password
     * @returns {Promise<object>} Response indicating success or failure
     */
    async resetPassword(token, password) {
        try {
            const response = await this.makeRequest('/api/auth/reset-password', 'POST', {
                token,
                password
            });

            return {
                success: true,
                data: response
            };
        } catch (error) {
            console.error('Reset password error:', error);
            return {
                success: false,
                message: error.message || 'Failed to reset password'
            };
        }
    }

    /**
     * Refresh access token
     * @param {string} refreshToken - Refresh token
     * @returns {Promise<object>} Response with new tokens
     */
    async refreshToken(refreshToken) {
        try {
            const response = await this.makeRequest('/api/auth/refresh', 'POST', {
                refreshToken
            });

            return {
                success: true,
                data: response
            };
        } catch (error) {
            console.error('Token refresh error:', error);
            return {
                success: false,
                message: error.message || 'Failed to refresh token'
            };
        }
    }

    /**
     * Logout user
     * @param {string} token - Current access token
     * @returns {Promise<object>} Response indicating success or failure
     */
    async logout(token) {
        try {
            const response = await this.makeRequest('/api/auth/logout', 'POST', null, {
                'Authorization': `Bearer ${token}`
            });

            return {
                success: true,
                data: response
            };
        } catch (error) {
            // Logout should succeed even if server call fails
            console.error('Logout error:', error);
            return {
                success: true,
                data: { message: 'Logged out locally' }
            };
        }
    }

    /**
     * Check if email/username exists
     * @param {string} identifier - Email or username to check
     * @returns {Promise<object>} Response with exists boolean
     */
    async checkIdentifierExists(identifier) {
        try {
            const response = await this.makeRequest('/api/auth/check-identifier', 'POST', {
                identifier
            });

            return {
                success: true,
                exists: response.exists
            };
        } catch (error) {
            console.error('Identifier check error:', error);
            return {
                success: false,
                message: error.message || 'Failed to check identifier'
            };
        }
    }

    /**
     * Get current user profile
     * @param {string} token - Access token
     * @returns {Promise<object>} User profile data
     */
    async getUserProfile(token) {
        try {
            const response = await this.makeRequest('/api/user/profile', 'GET', null, {
                'Authorization': `Bearer ${token}`
            });

            return {
                success: true,
                data: response
            };
        } catch (error) {
            console.error('Get user profile error:', error);
            return {
                success: false,
                message: error.message || 'Failed to get user profile'
            };
        }
    }

    /**
     * Make HTTP request with error handling and timeout
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @param {object} data - Request body data
     * @param {object} headers - Additional headers
     * @returns {Promise<object>} Response data
     */
    async makeRequest(endpoint, method = 'GET', data = null, headers = {}) {
        const url = `${this.baseURL}${endpoint}`;

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), this.timeout);
        });

        try {
            // Race between fetch and timeout
            const response = await Promise.race([
                fetch(url, options),
                timeoutPromise
            ]);

            if (!response.ok) {
                const error = await response.json().catch(() => ({ 
                    message: response.statusText 
                }));
                throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            // Re-throw with more context
            if (error.message === 'Request timeout') {
                throw new Error('Request timed out. Please check your connection and try again.');
            }
            throw error;
        }
    }
}