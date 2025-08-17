/**
 * PasskeyPlugin - WebAuthn Passkey authentication plugin for MOJO Auth
 * Adds passkey login and setup capabilities to the authentication system
 */

export default class PasskeyPlugin {
    constructor(config = {}) {
        this.name = 'passkey';
        this.config = {
            rpName: 'MOJO App',
            rpId: window?.location?.hostname || 'localhost',
            timeout: 60000,
            userVerification: 'preferred',
            authenticatorAttachment: 'platform', // 'platform', 'cross-platform', or undefined
            ...config
        };

        this.authManager = null;
        this.app = null;
        this.authService = null;
    }

    /**
     * Initialize plugin with AuthManager and WebApp
     * @param {AuthManager} authManager - Auth manager instance
     * @param {WebApp} app - WebApp instance
     */
    async initialize(authManager, app) {
        this.authManager = authManager;
        this.app = app;
        this.authService = authManager.authService;

        // Check browser support
        if (!this.isSupported()) {
            console.warn('Passkey authentication is not supported in this browser');
            return;
        }

        // Add passkey methods to auth manager
        this.authManager.loginWithPasskey = this.loginWithPasskey.bind(this);
        this.authManager.setupPasskey = this.setupPasskey.bind(this);
        this.authManager.isPasskeySupported = this.isSupported.bind(this);

        console.log('PasskeyPlugin initialized successfully');
    }

    /**
     * Check if WebAuthn is supported in this browser
     * @returns {boolean} True if supported
     */
    isSupported() {
        return window.PublicKeyCredential !== undefined &&
               navigator.credentials !== undefined &&
               typeof navigator.credentials.create === 'function' &&
               typeof navigator.credentials.get === 'function';
    }

    /**
     * Login with passkey
     * @returns {Promise<object>} Login result with user data and tokens
     */
    async loginWithPasskey() {
        if (!this.isSupported()) {
            throw new Error('Passkey authentication is not supported in this browser');
        }

        try {
            // Step 1: Get authentication challenge from server
            const challengeResponse = await this.authService.makeRequest('/api/auth/passkey/challenge', 'POST');

            if (!challengeResponse.challenge) {
                throw new Error('No authentication challenge received from server');
            }

            // Step 2: Create credential request options
            const credentialRequestOptions = {
                publicKey: {
                    challenge: this.base64ToArrayBuffer(challengeResponse.challenge),
                    timeout: this.config.timeout,
                    userVerification: this.config.userVerification,
                    rpId: this.config.rpId
                }
            };

            // Step 3: Get credential from authenticator
            const credential = await navigator.credentials.get(credentialRequestOptions);

            if (!credential) {
                throw new Error('No credential received from authenticator');
            }

            // Step 4: Prepare credential data for server verification
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

            // Step 5: Send credential to server for verification and login
            const loginResponse = await this.authService.makeRequest('/api/auth/passkey/verify', 'POST', {
                credential: credentialData,
                challengeId: challengeResponse.challengeId
            });

            const { token, refreshToken, user } = loginResponse;

            // Store tokens and set auth state
            this.authManager.tokenManager.setTokens(token, refreshToken, true);
            
            // Set auth state
            const userInfo = this.authManager.tokenManager.getUserInfo();
            this.authManager.setAuthState({ ...user, ...userInfo });
            
            // Schedule refresh
            if (this.authManager.config.autoRefresh) {
                this.authManager.scheduleTokenRefresh();
            }
            
            this.authManager.emit('login', this.authManager.user);

            return {
                success: true,
                user: this.authManager.user
            };

        } catch (error) {
            console.error('Passkey login error:', error);
            this.authManager.emit('loginError', error);
            throw new Error(error.message || 'Passkey authentication failed');
        }
    }

    /**
     * Setup passkey for current authenticated user
     * @returns {Promise<object>} Setup result
     */
    async setupPasskey() {
        if (!this.isSupported()) {
            throw new Error('Passkey authentication is not supported in this browser');
        }

        if (!this.authManager.isAuthenticated) {
            throw new Error('User must be authenticated to setup passkey');
        }

        try {
            const token = this.authManager.tokenManager.getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            // Step 1: Get registration options from server
            const optionsResponse = await this.authService.makeRequest('/api/auth/passkey/register-options', 'POST', null, {
                'Authorization': `Bearer ${token}`
            });

            if (!optionsResponse.options) {
                throw new Error('No registration options received from server');
            }

            const options = optionsResponse.options;

            // Step 2: Create credential creation options
            const credentialCreationOptions = {
                publicKey: {
                    challenge: this.base64ToArrayBuffer(options.challenge),
                    rp: {
                        name: this.config.rpName,
                        id: this.config.rpId
                    },
                    user: {
                        id: this.base64ToArrayBuffer(options.userId),
                        name: options.userName,
                        displayName: options.userDisplayName
                    },
                    pubKeyCredParams: [
                        { alg: -7, type: 'public-key' },   // ES256
                        { alg: -257, type: 'public-key' }  // RS256
                    ],
                    authenticatorSelection: {
                        userVerification: this.config.userVerification
                    },
                    timeout: this.config.timeout,
                    attestation: 'none'
                }
            };

            // Add authenticator attachment preference if specified
            if (this.config.authenticatorAttachment) {
                credentialCreationOptions.publicKey.authenticatorSelection.authenticatorAttachment = 
                    this.config.authenticatorAttachment;
            }

            // Step 3: Create credential
            const credential = await navigator.credentials.create(credentialCreationOptions);

            if (!credential) {
                throw new Error('Failed to create credential');
            }

            // Step 4: Prepare credential data for server registration
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
            const registrationResponse = await this.authService.makeRequest('/api/auth/passkey/register', 'POST', {
                credential: credentialData,
                optionsId: optionsResponse.optionsId
            }, {
                'Authorization': `Bearer ${token}`
            });

            // Emit success event
            this.authManager.emit('passkeySetupSuccess', registrationResponse);

            return {
                success: true,
                data: registrationResponse
            };

        } catch (error) {
            console.error('Passkey setup error:', error);
            this.authManager.emit('passkeySetupError', error);
            throw new Error(error.message || 'Failed to setup passkey');
        }
    }

    /**
     * Check if user has passkeys registered
     * @returns {Promise<object>} Result with passkey availability
     */
    async hasPasskeys() {
        if (!this.authManager.isAuthenticated) {
            return { success: false, hasPasskeys: false };
        }

        try {
            const token = this.authManager.tokenManager.getToken();
            const response = await this.authService.makeRequest('/api/auth/passkey/list', 'GET', null, {
                'Authorization': `Bearer ${token}`
            });

            return {
                success: true,
                hasPasskeys: response.passkeys && response.passkeys.length > 0,
                count: response.passkeys ? response.passkeys.length : 0
            };
        } catch (error) {
            console.error('Error checking passkeys:', error);
            return { success: false, hasPasskeys: false };
        }
    }

    /**
     * Remove/revoke a specific passkey
     * @param {string} credentialId - ID of credential to remove
     * @returns {Promise<object>} Result of removal
     */
    async removePasskey(credentialId) {
        if (!this.authManager.isAuthenticated) {
            throw new Error('User must be authenticated to remove passkey');
        }

        try {
            const token = this.authManager.tokenManager.getToken();
            const response = await this.authService.makeRequest('/api/auth/passkey/remove', 'DELETE', {
                credentialId
            }, {
                'Authorization': `Bearer ${token}`
            });

            this.authManager.emit('passkeyRemoved', { credentialId });

            return {
                success: true,
                data: response
            };
        } catch (error) {
            console.error('Error removing passkey:', error);
            throw new Error(error.message || 'Failed to remove passkey');
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

    /**
     * Get browser compatibility info
     * @returns {object} Compatibility information
     */
    getBrowserCompatibility() {
        return {
            webAuthnSupported: !!window.PublicKeyCredential,
            credentialsSupported: !!navigator.credentials,
            platformSupported: this.config.authenticatorAttachment === 'platform' ? 
                window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.() : true,
            conditionalMediationSupported: window.PublicKeyCredential?.isConditionalMediationAvailable?.()
        };
    }

    /**
     * Plugin cleanup
     */
    destroy() {
        // Remove methods from auth manager
        if (this.authManager) {
            delete this.authManager.loginWithPasskey;
            delete this.authManager.setupPasskey;
            delete this.authManager.isPasskeySupported;
        }
        
        this.authManager = null;
        this.app = null;
        this.authService = null;
    }
}