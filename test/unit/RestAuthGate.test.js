/**
 * Rest Auth Gate Unit Tests
 * Verifies that when a request interceptor throws AuthRequiredError,
 * Rest.request() short-circuits to a 401 response without calling fetch.
 *
 * Lives in its own file because the Rest singleton (exported as default)
 * can't be re-instantiated per test, and the file-scoped beforeEach in
 * the existing Rest.test.js tries `new Rest()` (which doesn't work —
 * the module exports the singleton, not the class).
 */

module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;

    const rest = require('../../src/core/Rest.js').default;

    describe('Rest — AuthRequiredError gate', () => {
        it('should return 401 without calling fetch when a request interceptor throws AuthRequiredError', async () => {
            const originalFetch = global.fetch;
            const originalInterceptors = rest.interceptors.request.slice();
            const fetchCalls = [];

            global.fetch = (...args) => {
                fetchCalls.push(args);
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    headers: new Map([['content-type', 'application/json']]),
                    json: async () => ({}),
                    text: async () => ''
                });
            };

            const authError = new Error('Token refresh failed');
            authError.name = 'AuthRequiredError';
            authError.reason = 'unauthorized';

            rest.addInterceptor('request', async () => { throw authError; });

            try {
                const result = await rest.GET('/users');

                expect(fetchCalls).toHaveLength(0);
                expect(result.success).toBe(false);
                expect(result.status).toBe(401);
                expect(result.reason).toBe('unauthorized');
                expect(result.message).toBe('Authentication required');
                expect(result.errors.auth).toBe('Token refresh failed');
            } finally {
                rest.interceptors.request = originalInterceptors;
                global.fetch = originalFetch;
            }
        });
    });
};
