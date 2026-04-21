/**
 * TokenManager Unit Tests
 * Covers the single-flight refresh guard and the ensureValidToken() gate
 * used by the PortalApp pre-request auth interceptor.
 *
 * NOTE: This repo's test runner executes every `it()` in a file
 * concurrently (all test promises are collected with Promise.all). So
 * every test must own its own TokenManager instance AND its own unique
 * storage keys — no shared state and no reliance on beforeEach ordering.
 */

module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;

    // In-memory localStorage/sessionStorage stubs shared across tests but
    // each test uses unique tokenKey / refreshTokenKey so they don't collide.
    // jsdom installs a getter for these globals, so plain assignment can be
    // shadowed — use defineProperty to force-override for this test suite.
    function makeStorage() {
        const map = new Map();
        return {
            getItem: (k) => (map.has(k) ? map.get(k) : null),
            setItem: (k, v) => { map.set(k, String(v)); },
            removeItem: (k) => { map.delete(k); },
            clear: () => map.clear()
        };
    }
    Object.defineProperty(global, 'localStorage', {
        value: makeStorage(), configurable: true, writable: true
    });
    Object.defineProperty(global, 'sessionStorage', {
        value: makeStorage(), configurable: true, writable: true
    });

    const TokenManagerModule = require('../../src/core/services/TokenManager.js');
    const TokenManager = TokenManagerModule.default;
    const { AuthRequiredError } = TokenManagerModule;

    let keyCounter = 0;
    function freshManager() {
        const tm = new TokenManager();
        const suffix = `_${Date.now()}_${keyCounter++}`;
        tm.tokenKey = 'access_token' + suffix;
        tm.refreshTokenKey = 'refresh_token' + suffix;
        return tm;
    }

    function makeJwt(expOffsetSeconds) {
        const now = Math.floor(Date.now() / 1000);
        const header = { alg: 'HS256', typ: 'JWT' };
        const payload = {
            sub: 'user-1',
            uid: 'user-1',
            iat: now,
            exp: now + expOffsetSeconds
        };
        const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64')
            .replace(/=+$/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
        return `${encode(header)}.${encode(payload)}.sig`;
    }

    function makeEvents() {
        const emitted = [];
        return {
            emit: (name, payload) => { emitted.push({ name, payload }); },
            emitted
        };
    }

    function makeApp({ refreshResponse, rejectWith = null } = {}) {
        const events = makeEvents();
        const postCalls = [];
        // Use a microtask-scheduled promise — jsdom's setTimeout recurses
        // when it ends up as the Node global in this harness.
        const defer = (fn) => Promise.resolve().then(fn);
        return {
            events,
            postCalls,
            rest: {
                POST: (url, body) => {
                    postCalls.push({ url, body });
                    return new Promise((resolve, reject) => {
                        defer(() => {
                            if (rejectWith) return reject(rejectWith);
                            resolve(refreshResponse);
                        });
                    });
                },
                setAuthToken: () => {}
            }
        };
    }

    function refreshResp() {
        return { data: { data: {
            access_token: makeJwt(60 * 60),
            refresh_token: makeJwt(24 * 60 * 60)
        } } };
    }

    describe('TokenManager — AuthRequiredError export', () => {
        it('should export AuthRequiredError with correct name and reason', () => {
            const err = new AuthRequiredError('nope');
            expect(err.name).toBe('AuthRequiredError');
            expect(err.reason).toBe('unauthorized');
            expect(err.message).toBe('nope');
            expect(err).toBeInstanceOf(Error);
        });
    });

    describe('TokenManager — single-flight refreshToken', () => {
        it('should share a single in-flight refresh across concurrent callers', async () => {
            const tm = freshManager();
            tm.setTokens(makeJwt(-60), makeJwt(60 * 60));
            const app = makeApp({ refreshResponse: refreshResp() });

            const results = await Promise.all([
                tm.refreshToken(app),
                tm.refreshToken(app),
                tm.refreshToken(app)
            ]);

            expect(app.postCalls).toHaveLength(1);
            expect(app.postCalls[0].url).toBe('/api/token/refresh');
            expect(results[0]).toBe(true);
            expect(results[1]).toBe(true);
            expect(results[2]).toBe(true);
            expect(tm._refreshPromise).toBe(null);
        });

        it('should clear the in-flight promise after success so a later call triggers a new POST', async () => {
            const tm = freshManager();
            const validRefresh = makeJwt(60 * 60);
            tm.setTokens(makeJwt(-60), validRefresh);
            const app = makeApp({ refreshResponse: refreshResp() });

            await tm.refreshToken(app);
            // Force another expired access so a second refresh is warranted.
            tm.setTokens(makeJwt(-60), validRefresh);
            await tm.refreshToken(app);

            expect(app.postCalls).toHaveLength(2);
        });

        it('should resolve false and emit auth:unauthorized when refresh token is expired', async () => {
            const tm = freshManager();
            tm.setTokens(makeJwt(-60), makeJwt(-60));
            const app = makeApp({});

            const result = await tm.refreshToken(app);

            expect(result).toBe(false);
            expect(app.postCalls).toHaveLength(0);
            const names = app.events.emitted.map(e => e.name);
            expect(names).toContain('auth:unauthorized');
        });

        it('should resolve false on refresh POST network failure without throwing', async () => {
            const tm = freshManager();
            tm.setTokens(makeJwt(-60), makeJwt(60 * 60));
            const app = makeApp({ rejectWith: new Error('boom') });

            const result = await tm.refreshToken(app);

            expect(result).toBe(false);
            expect(app.postCalls).toHaveLength(1);
            const names = app.events.emitted.map(e => e.name);
            expect(names).toContain('auth:token:refresh:failed');
        });
    });

    describe('TokenManager — ensureValidToken gate', () => {
        it('should return without network call when access token is valid', async () => {
            const tm = freshManager();
            tm.setTokens(makeJwt(60 * 60), makeJwt(24 * 60 * 60));
            const app = makeApp({});

            await tm.ensureValidToken(app);

            expect(app.postCalls).toHaveLength(0);
        });

        it('should refresh once when access expired but refresh valid', async () => {
            const tm = freshManager();
            tm.setTokens(makeJwt(-60), makeJwt(60 * 60));
            const app = makeApp({ refreshResponse: refreshResp() });

            await tm.ensureValidToken(app);

            expect(app.postCalls).toHaveLength(1);
            expect(app.postCalls[0].url).toBe('/api/token/refresh');
        });

        it('should share a single POST across concurrent ensureValidToken callers', async () => {
            const tm = freshManager();
            tm.setTokens(makeJwt(-60), makeJwt(60 * 60));
            const app = makeApp({ refreshResponse: refreshResp() });

            await Promise.all([
                tm.ensureValidToken(app),
                tm.ensureValidToken(app),
                tm.ensureValidToken(app),
                tm.ensureValidToken(app),
                tm.ensureValidToken(app)
            ]);

            expect(app.postCalls).toHaveLength(1);
        });

        it('should throw AuthRequiredError and emit auth:unauthorized when both tokens expired', async () => {
            const tm = freshManager();
            tm.setTokens(makeJwt(-60), makeJwt(-60));
            const app = makeApp({});

            let thrown = null;
            try {
                await tm.ensureValidToken(app);
            } catch (e) {
                thrown = e;
            }

            expect(thrown).toBeTruthy();
            expect(thrown.name).toBe('AuthRequiredError');
            expect(thrown.reason).toBe('unauthorized');
            expect(app.postCalls).toHaveLength(0);
            const names = app.events.emitted.map(e => e.name);
            expect(names).toContain('auth:unauthorized');
        });

        it('should throw AuthRequiredError when the refresh POST itself fails', async () => {
            const tm = freshManager();
            tm.setTokens(makeJwt(-60), makeJwt(60 * 60));
            const app = makeApp({ rejectWith: new Error('network down') });

            let thrown = null;
            try {
                await tm.ensureValidToken(app);
            } catch (e) {
                thrown = e;
            }

            expect(thrown).toBeTruthy();
            expect(thrown.name).toBe('AuthRequiredError');
        });
    });
};
