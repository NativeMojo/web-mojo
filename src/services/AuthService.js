/**
 * Authentication Service
 * Handles all authentication-related API calls for PAYOMI
 */

export default class AuthService {
    constructor(app) {
        this.app = app;
        this.baseURL = app.rest?.config?.baseURL || null;
        this.timeout = app.rest?.config?.timeout || 30000;
    }

    /**
     * Login with email and password
     * @param {string} username - User username
     * @param {string} password - User password
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
     * Login with passkey
     * @returns {Promise<object>} Response with user, token, and refreshToken
     */
    async loginWithPasskey() {
        try {
            // Step 1: Get challenge from server
            const challengeResponse = await this.makeRequest('/api/passkey/challenge', 'POST');

            if (!challengeResponse.challenge) {
                throw new Error('No challenge received from server');
            }

            // Step 2: Create credential request options
            const credentialRequestOptions = {
                publicKey: {
                    challenge: this.base64ToArrayBuffer(challengeResponse.challenge),
                    timeout: 60000,
                    userVerification: 'preferred',
                    rpId: window.location.hostname
                }
            };

            // Step 3: Get credential from browser
            const credential = await navigator.credentials.get(credentialRequestOptions);

            if (!credential) {
                throw new Error('No credential received from authenticator');
            }

            // Step 4: Prepare credential data for server
            const credentialData = {
                id: credential.id,
                rawId: this.arrayBufferToBase64(credential.rawId),
                type: credential.type,
                response: {
                    authenticatorData: this.arrayBufferToBase64(credential.response.authenticatorData),
                    clientDataJSON: this.arrayBufferToBase64(credential.response.clientDataJSON),
                    signature: this.arrayBufferToBase64(credential.response.signature),
                    userHandle: credential.response.userHandle ?
                        this.arrayBufferToBase64(credential.response.userHandle) : null
                }
            };

            // Step 5: Send credential to server for verification
            const response = await this.makeRequest('/api/passkey/login', 'POST', {
                credential: credentialData,
                challengeId: challengeResponse.challengeId
            });

            return {
                success: true,
                data: response
            };
        } catch (error) {
            console.error('Passkey login error:', error);
            return {
                success: false,
                message: error.message || 'Passkey authentication failed'
            };
        }
    }

    /**
     * Setup passkey for current user
     * @returns {Promise<object>} Response indicating success or failure
     */
    async setupPasskey() {
        try {
            // Get current user token
            const token = localStorage.getItem('payomi_token') ||
                         sessionStorage.getItem('payomi_token');

            if (!token) {
                throw new Error('No authentication token found');
            }

            // Step 1: Get registration options from server
            const optionsResponse = await this.makeRequest('/api/passkey/register-options', 'POST', null, {
                'Authorization': `Bearer ${token}`
            });

            if (!optionsResponse.options) {
                throw new Error('No registration options received from server');
            }

            // Step 2: Create credential creation options
            const credentialCreationOptions = {
                publicKey: {
                    challenge: this.base64ToArrayBuffer(optionsResponse.options.challenge),
                    rp: {
                        name: 'PAYOMI',
                        id: window.location.hostname
                    },
                    user: {
                        id: this.base64ToArrayBuffer(optionsResponse.options.userId),
                        name: optionsResponse.options.userName,
                        displayName: optionsResponse.options.userDisplayName
                    },
                    pubKeyCredParams: [
                        { alg: -7, type: 'public-key' },  // ES256
                        { alg: -257, type: 'public-key' }  // RS256
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: 'platform',
                        userVerification: 'preferred'
                    },
                    timeout: 60000,
                    attestation: 'none'
                }
            };

            // Step 3: Create credential
            const credential = await navigator.credentials.create(credentialCreationOptions);

            if (!credential) {
                throw new Error('Failed to create credential');
            }

            // Step 4: Prepare credential data for server
            const credentialData = {
                id: credential.id,
                rawId: this.arrayBufferToBase64(credential.rawId),
                type: credential.type,
                response: {
                    attestationObject: this.arrayBufferToBase64(credential.response.attestationObject),
                    clientDataJSON: this.arrayBufferToBase64(credential.response.clientDataJSON)
                }
            };

            // Step 5: Register credential with server
            const response = await this.makeRequest('/api/passkey/register', 'POST', {
                credential: credentialData,
                optionsId: optionsResponse.optionsId
            }, {
                'Authorization': `Bearer ${token}`
            });

            return {
                success: true,
                data: response
            };
        } catch (error) {
            console.error('Passkey setup error:', error);
            return {
                success: false,
                message: error.message || 'Failed to setup passkey'
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
            const response = await this.makeRequest('/api/auth/forgot', 'POST', {
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
            const response = await this.makeRequest('/auth/reset-password', 'POST', {
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
     * Verify email with token
     * @param {string} token - Verification token
     * @returns {Promise<object>} Response indicating success or failure
     */
    async verifyEmail(token) {
        try {
            const response = await this.makeRequest('/auth/verify-email', 'POST', {
                token
            });

            return {
                success: true,
                data: response
            };
        } catch (error) {
            console.error('Email verification error:', error);
            return {
                success: false,
                message: error.message || 'Failed to verify email'
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
            const response = await this.makeRequest('/auth/refresh', 'POST', {
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
            const response = await this.makeRequest('/auth/logout', 'POST', null, {
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
     * Check if email exists
     * @param {string} email - Email to check
     * @returns {Promise<object>} Response with exists boolean
     */
    async checkEmailExists(email) {
        try {
            const response = await this.makeRequest('/auth/check-email', 'POST', {
                email
            });

            return {
                success: true,
                exists: response.exists
            };
        } catch (error) {
            console.error('Email check error:', error);
            return {
                success: false,
                message: error.message || 'Failed to check email'
            };
        }
    }

    /**
     * Make HTTP request
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
                ...this.app.api?.headers,
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
                const error = await response.json().catch(() => ({ message: response.statusText }));
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

    /**
     * Convert base64 string to ArrayBuffer
     * @param {string} base64 - Base64 string
     * @returns {ArrayBuffer} ArrayBuffer
     */
    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Convert ArrayBuffer to base64 string
     * @param {ArrayBuffer} buffer - ArrayBuffer
     * @returns {string} Base64 string
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}
