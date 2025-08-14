/**
 * Unit tests for JWTUtils
 */

import JWTUtils from '../../src/utils/JWTUtils.js';

describe('JWTUtils', () => {
    let jwtUtils;
    
    // Sample JWT tokens for testing
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwibmFtZSI6IkpvaG4gRG9lIiwicm9sZXMiOlsiYWRtaW4iLCJ1c2VyIl0sInBlcm1pc3Npb25zIjpbInJlYWQiLCJ3cml0ZSJdLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMzYwMH0.fake-signature';
    
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDM2MDB9.fake-signature';
    
    const noExpiryToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwibmFtZSI6IkpvaG4gRG9lIn0.fake-signature';
    
    const futureToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9.fake-signature';

    beforeEach(() => {
        jwtUtils = new JWTUtils();
        // Clear storage before each test
        localStorage.clear();
        sessionStorage.clear();
    });

    afterEach(() => {
        // Clean up after each test
        localStorage.clear();
        sessionStorage.clear();
    });

    describe('decode()', () => {
        it('should decode a valid JWT token', () => {
            const payload = jwtUtils.decode(validToken);
            
            expect(payload).toBeDefined();
            expect(payload.sub).toBe('1234567890');
            expect(payload.email).toBe('user@example.com');
            expect(payload.name).toBe('John Doe');
            expect(payload.roles).toEqual(['admin', 'user']);
            expect(payload.permissions).toEqual(['read', 'write']);
        });

        it('should return null for invalid token', () => {
            expect(jwtUtils.decode('invalid')).toBeNull();
            expect(jwtUtils.decode('')).toBeNull();
            expect(jwtUtils.decode(null)).toBeNull();
            expect(jwtUtils.decode(undefined)).toBeNull();
        });

        it('should return null for malformed JWT', () => {
            expect(jwtUtils.decode('not.a.jwt')).toBeNull();
            expect(jwtUtils.decode('only.two')).toBeNull();
        });
    });

    describe('base64UrlDecode()', () => {
        it('should decode base64url strings', () => {
            const encoded = 'SGVsbG8gV29ybGQ';
            const decoded = jwtUtils.base64UrlDecode(encoded);
            expect(decoded).toBe('Hello World');
        });

        it('should handle URL-safe characters', () => {
            const encoded = 'SGVsbG8tV29ybGRfMTIz';
            const decoded = jwtUtils.base64UrlDecode(encoded);
            expect(decoded).toBe('Hello-World_123');
        });
    });

    describe('isExpired()', () => {
        it('should return true for expired token', () => {
            expect(jwtUtils.isExpired(expiredToken)).toBe(true);
        });

        it('should return false for valid future token', () => {
            expect(jwtUtils.isExpired(futureToken)).toBe(false);
        });

        it('should return true for token without expiry', () => {
            expect(jwtUtils.isExpired(noExpiryToken)).toBe(true);
        });

        it('should handle decoded payload', () => {
            const payload = jwtUtils.decode(expiredToken);
            expect(jwtUtils.isExpired(payload)).toBe(true);
        });

        it('should return true for invalid input', () => {
            expect(jwtUtils.isExpired(null)).toBe(true);
            expect(jwtUtils.isExpired('')).toBe(true);
        });
    });

    describe('getTimeUntilExpiry()', () => {
        it('should return positive milliseconds for future token', () => {
            const time = jwtUtils.getTimeUntilExpiry(futureToken);
            expect(time).toBeGreaterThan(0);
        });

        it('should return -1 for expired token', () => {
            expect(jwtUtils.getTimeUntilExpiry(expiredToken)).toBe(-1);
        });

        it('should return -1 for token without expiry', () => {
            expect(jwtUtils.getTimeUntilExpiry(noExpiryToken)).toBe(-1);
        });
    });

    describe('isExpiringSoon()', () => {
        it('should return true for expired token', () => {
            expect(jwtUtils.isExpiringSoon(expiredToken)).toBe(true);
        });

        it('should return false for token with long validity', () => {
            expect(jwtUtils.isExpiringSoon(futureToken)).toBe(false);
        });

        it('should respect custom threshold', () => {
            // With a very large threshold, even future tokens should be "expiring soon"
            const threshold = 999999999999;
            expect(jwtUtils.isExpiringSoon(futureToken, threshold)).toBe(true);
        });
    });

    describe('getClaim()', () => {
        it('should extract specific claim from token', () => {
            expect(jwtUtils.getClaim(validToken, 'email')).toBe('user@example.com');
            expect(jwtUtils.getClaim(validToken, 'sub')).toBe('1234567890');
            expect(jwtUtils.getClaim(validToken, 'name')).toBe('John Doe');
        });

        it('should return undefined for non-existent claim', () => {
            expect(jwtUtils.getClaim(validToken, 'nonexistent')).toBeUndefined();
        });

        it('should return undefined for invalid token', () => {
            expect(jwtUtils.getClaim('invalid', 'email')).toBeUndefined();
        });
    });

    describe('getUserInfo()', () => {
        it('should extract user info from token', () => {
            const userInfo = jwtUtils.getUserInfo(validToken);
            
            expect(userInfo).toBeDefined();
            expect(userInfo.id).toBe('1234567890');
            expect(userInfo.email).toBe('user@example.com');
            expect(userInfo.name).toBe('John Doe');
            expect(userInfo.roles).toEqual(['admin', 'user']);
            expect(userInfo.permissions).toEqual(['read', 'write']);
            expect(userInfo.issued).toBeInstanceOf(Date);
            expect(userInfo.expires).toBeInstanceOf(Date);
        });

        it('should return null for invalid token', () => {
            expect(jwtUtils.getUserInfo('invalid')).toBeNull();
        });
    });

    describe('hasRole()', () => {
        it('should check if token has specific role', () => {
            expect(jwtUtils.hasRole(validToken, 'admin')).toBe(true);
            expect(jwtUtils.hasRole(validToken, 'user')).toBe(true);
            expect(jwtUtils.hasRole(validToken, 'guest')).toBe(false);
        });

        it('should return false for invalid token', () => {
            expect(jwtUtils.hasRole('invalid', 'admin')).toBe(false);
        });

        it('should return false for token without roles', () => {
            expect(jwtUtils.hasRole(noExpiryToken, 'admin')).toBe(false);
        });
    });

    describe('hasPermission()', () => {
        it('should check if token has specific permission', () => {
            expect(jwtUtils.hasPermission(validToken, 'read')).toBe(true);
            expect(jwtUtils.hasPermission(validToken, 'write')).toBe(true);
            expect(jwtUtils.hasPermission(validToken, 'delete')).toBe(false);
        });

        it('should return false for invalid token', () => {
            expect(jwtUtils.hasPermission('invalid', 'read')).toBe(false);
        });

        it('should return false for token without permissions', () => {
            expect(jwtUtils.hasPermission(noExpiryToken, 'read')).toBe(false);
        });
    });

    describe('Token Storage', () => {
        describe('storeTokens()', () => {
            it('should store tokens in localStorage when remember is true', () => {
                jwtUtils.storeTokens('access123', 'refresh456', true);
                
                expect(localStorage.getItem('payomi_token')).toBe('access123');
                expect(localStorage.getItem('payomi_refresh_token')).toBe('refresh456');
                expect(sessionStorage.getItem('payomi_token')).toBeNull();
            });

            it('should store tokens in sessionStorage when remember is false', () => {
                jwtUtils.storeTokens('access789', 'refresh012', false);
                
                expect(sessionStorage.getItem('payomi_token')).toBe('access789');
                expect(sessionStorage.getItem('payomi_refresh_token')).toBe('refresh012');
                expect(localStorage.getItem('payomi_token')).toBeNull();
            });

            it('should handle missing refresh token', () => {
                jwtUtils.storeTokens('access123', null, true);
                
                expect(localStorage.getItem('payomi_token')).toBe('access123');
                expect(localStorage.getItem('payomi_refresh_token')).toBeNull();
            });
        });

        describe('getToken()', () => {
            it('should retrieve token from localStorage', () => {
                localStorage.setItem('payomi_token', 'stored_token');
                expect(jwtUtils.getToken()).toBe('stored_token');
            });

            it('should retrieve token from sessionStorage', () => {
                sessionStorage.setItem('payomi_token', 'session_token');
                expect(jwtUtils.getToken()).toBe('session_token');
            });

            it('should prefer localStorage over sessionStorage', () => {
                localStorage.setItem('payomi_token', 'local_token');
                sessionStorage.setItem('payomi_token', 'session_token');
                expect(jwtUtils.getToken()).toBe('local_token');
            });

            it('should return null when no token exists', () => {
                expect(jwtUtils.getToken()).toBeNull();
            });
        });

        describe('getRefreshToken()', () => {
            it('should retrieve refresh token from localStorage', () => {
                localStorage.setItem('payomi_refresh_token', 'refresh_local');
                expect(jwtUtils.getRefreshToken()).toBe('refresh_local');
            });

            it('should retrieve refresh token from sessionStorage', () => {
                sessionStorage.setItem('payomi_refresh_token', 'refresh_session');
                expect(jwtUtils.getRefreshToken()).toBe('refresh_session');
            });
        });

        describe('clearTokens()', () => {
            it('should clear all tokens from both storages', () => {
                localStorage.setItem('payomi_token', 'token1');
                localStorage.setItem('payomi_refresh_token', 'refresh1');
                sessionStorage.setItem('payomi_token', 'token2');
                sessionStorage.setItem('payomi_refresh_token', 'refresh2');
                
                jwtUtils.clearTokens();
                
                expect(localStorage.getItem('payomi_token')).toBeNull();
                expect(localStorage.getItem('payomi_refresh_token')).toBeNull();
                expect(sessionStorage.getItem('payomi_token')).toBeNull();
                expect(sessionStorage.getItem('payomi_refresh_token')).toBeNull();
            });
        });
    });

    describe('getAuthHeader()', () => {
        it('should create Bearer token header', () => {
            expect(jwtUtils.getAuthHeader('my_token')).toBe('Bearer my_token');
        });

        it('should use stored token if no token provided', () => {
            localStorage.setItem('payomi_token', 'stored_token');
            expect(jwtUtils.getAuthHeader()).toBe('Bearer stored_token');
        });

        it('should return null when no token available', () => {
            expect(jwtUtils.getAuthHeader()).toBeNull();
        });
    });

    describe('formatExpiry()', () => {
        it('should format expired token', () => {
            expect(jwtUtils.formatExpiry(expiredToken)).toBe('Expired');
        });

        it('should format token without expiry', () => {
            expect(jwtUtils.formatExpiry(noExpiryToken)).toBe('Never');
        });

        it('should format future token with appropriate units', () => {
            const result = jwtUtils.formatExpiry(futureToken);
            expect(result).toMatch(/\d+ (day|hour|minute)s?/);
        });
    });

    describe('isValidStructure()', () => {
        it('should validate correct JWT structure', () => {
            expect(jwtUtils.isValidStructure(validToken)).toBe(true);
            expect(jwtUtils.isValidStructure(expiredToken)).toBe(true);
        });

        it('should reject invalid JWT structure', () => {
            expect(jwtUtils.isValidStructure('invalid')).toBe(false);
            expect(jwtUtils.isValidStructure('not.a.jwt')).toBe(false);
            expect(jwtUtils.isValidStructure('only.two')).toBe(false);
            expect(jwtUtils.isValidStructure('')).toBe(false);
            expect(jwtUtils.isValidStructure(null)).toBe(false);
        });

        it('should reject JWT with empty signature', () => {
            const noSignature = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.';
            expect(jwtUtils.isValidStructure(noSignature)).toBe(false);
        });
    });
});