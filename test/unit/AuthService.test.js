/**
 * Unit tests for AuthService
 */

import AuthService from '../../src/services/AuthService.js';

describe('AuthService', () => {
    let authService;
    let mockApp;
    let originalFetch;
    let originalNavigator;
    let originalLocalStorage;
    let originalSessionStorage;

    beforeEach(() => {
        // Mock app configuration
        mockApp = {
            api: {
                baseUrl: 'http://localhost:8080/api',
                timeout: 30000,
                headers: {
                    'X-API-Key': 'test-key'
                }
            }
        };

        authService = new AuthService(mockApp);

        // Store original implementations
        originalFetch = global.fetch;
        originalNavigator = global.navigator;
        originalLocalStorage = global.localStorage;
        originalSessionStorage = global.sessionStorage;

        // Mock fetch
        global.fetch = jest.fn();

        // Mock navigator.credentials for passkey tests
        global.navigator = {
            credentials: {
                create: jest.fn(),
                get: jest.fn()
            }
        };

        // Mock storage
        const localStorageMock = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn()
        };
        const sessionStorageMock = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn()
        };
        global.localStorage = localStorageMock;
        global.sessionStorage = sessionStorageMock;
    });

    afterEach(() => {
        // Restore original implementations
        global.fetch = originalFetch;
        global.navigator = originalNavigator;
        global.localStorage = originalLocalStorage;
        global.sessionStorage = originalSessionStorage;
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with app configuration', () => {
            expect(authService.baseUrl).toBe('http://localhost:8080/api');
            expect(authService.timeout).toBe(30000);
            expect(authService.app).toBe(mockApp);
        });

        it('should use defaults when no API config provided', () => {
            const minimalApp = {};
            const service = new AuthService(minimalApp);
            expect(service.baseUrl).toBe('http://localhost:8080/api');
            expect(service.timeout).toBe(30000);
        });
    });

    describe('login()', () => {
        it('should successfully login with valid credentials', async () => {
            const mockResponse = {
                user: { id: 1, email: 'user@example.com' },
                token: 'access-token',
                refreshToken: 'refresh-token'
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await authService.login('user@example.com', 'password123');

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/auth/login',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'X-API-Key': 'test-key'
                    }),
                    body: JSON.stringify({
                        email: 'user@example.com',
                        password: 'password123'
                    })
                })
            );
        });

        it('should handle login failure', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                json: async () => ({ message: 'Invalid credentials' })
            });

            const result = await authService.login('user@example.com', 'wrong');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Invalid credentials');
        });

        it('should handle network error', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await authService.login('user@example.com', 'password');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Network error');
        });
    });

    describe('loginWithPasskey()', () => {
        it('should successfully authenticate with passkey', async () => {
            // Mock challenge response
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    challenge: 'Y2hhbGxlbmdl', // base64 'challenge'
                    challengeId: 'challenge-123'
                })
            });

            // Mock credential
            const mockCredential = {
                id: 'credential-id',
                rawId: new ArrayBuffer(8),
                type: 'public-key',
                response: {
                    authenticatorData: new ArrayBuffer(16),
                    clientDataJSON: new ArrayBuffer(32),
                    signature: new ArrayBuffer(64),
                    userHandle: new ArrayBuffer(8)
                }
            };
            global.navigator.credentials.get.mockResolvedValueOnce(mockCredential);

            // Mock login response
            const mockLoginResponse = {
                user: { id: 1, email: 'user@example.com' },
                token: 'access-token',
                refreshToken: 'refresh-token'
            };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockLoginResponse
            });

            const result = await authService.loginWithPasskey();

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockLoginResponse);
            expect(global.navigator.credentials.get).toHaveBeenCalled();
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        it('should handle missing challenge', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            });

            const result = await authService.loginWithPasskey();

            expect(result.success).toBe(false);
            expect(result.message).toBe('No challenge received from server');
        });

        it('should handle credential creation failure', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    challenge: 'Y2hhbGxlbmdl',
                    challengeId: 'challenge-123'
                })
            });

            global.navigator.credentials.get.mockResolvedValueOnce(null);

            const result = await authService.loginWithPasskey();

            expect(result.success).toBe(false);
            expect(result.message).toBe('No credential received from authenticator');
        });
    });

    describe('setupPasskey()', () => {
        beforeEach(() => {
            global.localStorage.getItem.mockReturnValue('test-token');
        });

        it('should successfully setup passkey', async () => {
            // Mock registration options
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    options: {
                        challenge: 'Y2hhbGxlbmdl',
                        userId: 'dXNlcjEyMw==', // base64 'user123'
                        userName: 'user@example.com',
                        userDisplayName: 'John Doe'
                    },
                    optionsId: 'options-123'
                })
            });

            // Mock credential creation
            const mockCredential = {
                id: 'credential-id',
                rawId: new ArrayBuffer(8),
                type: 'public-key',
                response: {
                    attestationObject: new ArrayBuffer(128),
                    clientDataJSON: new ArrayBuffer(64)
                }
            };
            global.navigator.credentials.create.mockResolvedValueOnce(mockCredential);

            // Mock registration response
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            const result = await authService.setupPasskey();

            expect(result.success).toBe(true);
            expect(global.navigator.credentials.create).toHaveBeenCalled();
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        it('should fail when no token found', async () => {
            global.localStorage.getItem.mockReturnValue(null);
            global.sessionStorage.getItem.mockReturnValue(null);

            const result = await authService.setupPasskey();

            expect(result.success).toBe(false);
            expect(result.message).toBe('No authentication token found');
        });

        it('should handle missing registration options', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            });

            const result = await authService.setupPasskey();

            expect(result.success).toBe(false);
            expect(result.message).toBe('No registration options received from server');
        });
    });

    describe('forgotPassword()', () => {
        it('should successfully request password reset', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Reset email sent' })
            });

            const result = await authService.forgotPassword('user@example.com');

            expect(result.success).toBe(true);
            expect(result.data.message).toBe('Reset email sent');
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/auth/forgot-password',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ email: 'user@example.com' })
                })
            );
        });

        it('should handle request failure', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ message: 'User not found' })
            });

            const result = await authService.forgotPassword('nonexistent@example.com');

            expect(result.success).toBe(false);
            expect(result.message).toBe('User not found');
        });
    });

    describe('resetPassword()', () => {
        it('should successfully reset password', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Password reset successful' })
            });

            const result = await authService.resetPassword('reset-token', 'newPassword123');

            expect(result.success).toBe(true);
            expect(result.data.message).toBe('Password reset successful');
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/auth/reset-password',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        token: 'reset-token',
                        password: 'newPassword123'
                    })
                })
            );
        });
    });

    describe('verifyEmail()', () => {
        it('should successfully verify email', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ verified: true })
            });

            const result = await authService.verifyEmail('verify-token');

            expect(result.success).toBe(true);
            expect(result.data.verified).toBe(true);
        });
    });

    describe('refreshToken()', () => {
        it('should successfully refresh token', async () => {
            const mockResponse = {
                token: 'new-access-token',
                refreshToken: 'new-refresh-token'
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await authService.refreshToken('old-refresh-token');

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });
    });

    describe('logout()', () => {
        it('should successfully logout', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Logged out' })
            });

            const result = await authService.logout('access-token');

            expect(result.success).toBe(true);
            expect(result.data.message).toBe('Logged out');
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/auth/logout',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer access-token'
                    })
                })
            );
        });

        it('should succeed even if server call fails', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await authService.logout('access-token');

            expect(result.success).toBe(true);
            expect(result.data.message).toBe('Logged out locally');
        });
    });

    describe('checkEmailExists()', () => {
        it('should check if email exists', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ exists: true })
            });

            const result = await authService.checkEmailExists('user@example.com');

            expect(result.success).toBe(true);
            expect(result.exists).toBe(true);
        });

        it('should handle check failure', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await authService.checkEmailExists('user@example.com');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Network error');
        });
    });

    describe('makeRequest()', () => {
        it('should make GET request', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: 'test' })
            });

            const result = await authService.makeRequest('/test', 'GET');

            expect(result).toEqual({ data: 'test' });
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/test',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    })
                })
            );
        });

        it('should handle timeout', async () => {
            // Create a promise that never resolves
            global.fetch.mockImplementationOnce(() => new Promise(() => {}));

            // Use a short timeout for testing
            authService.timeout = 100;

            await expect(authService.makeRequest('/test')).rejects.toThrow(
                'Request timed out. Please check your connection and try again.'
            );
        });

        it('should handle HTTP errors', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: async () => ({ message: 'Server error' })
            });

            await expect(authService.makeRequest('/test')).rejects.toThrow('Server error');
        });

        it('should handle non-JSON error responses', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: async () => { throw new Error('Not JSON'); }
            });

            await expect(authService.makeRequest('/test')).rejects.toThrow(
                'HTTP 500: Internal Server Error'
            );
        });
    });

    describe('base64ToArrayBuffer()', () => {
        it('should convert base64 to ArrayBuffer', () => {
            const base64 = 'SGVsbG8='; // 'Hello' in base64
            const buffer = authService.base64ToArrayBuffer(base64);
            
            expect(buffer).toBeInstanceOf(ArrayBuffer);
            expect(buffer.byteLength).toBe(5);
            
            const view = new Uint8Array(buffer);
            expect(view[0]).toBe(72); // 'H'
            expect(view[1]).toBe(101); // 'e'
            expect(view[2]).toBe(108); // 'l'
            expect(view[3]).toBe(108); // 'l'
            expect(view[4]).toBe(111); // 'o'
        });
    });

    describe('arrayBufferToBase64()', () => {
        it('should convert ArrayBuffer to base64', () => {
            const buffer = new ArrayBuffer(5);
            const view = new Uint8Array(buffer);
            view[0] = 72; // 'H'
            view[1] = 101; // 'e'
            view[2] = 108; // 'l'
            view[3] = 108; // 'l'
            view[4] = 111; // 'o'
            
            const base64 = authService.arrayBufferToBase64(buffer);
            expect(base64).toBe('SGVsbG8=');
        });
    });
});