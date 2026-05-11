/**
 * LoginLocationMapView regression tests
 *
 * Regression: per-user map was calling /api/account/logins/user (raw events)
 * instead of /api/account/logins/summary?user=<id> (aggregated geo data),
 * causing only one pin to appear on the Locations tab map.
 *
 * Fix: _fetchSummary() always calls /api/account/logins/summary and passes
 * `user: this.userId` as a query param — consistent with every other per-user
 * collection in UserView (e.g. loginsCollection uses params: { user: userId }).
 */

const path = require('path');
const { testHelpers } = require('../utils/test-helpers');
const { moduleLoader, loadModule } = require('../utils/simple-module-loader');

const LLMV_PATH = path.join(
    __dirname,
    '../../src/extensions/admin/account/devices/LoginLocationMapView.js'
);

module.exports = async function (testContext) {
    const { describe, it, expect } = testContext;

    await testHelpers.setup();

    // Load View so it's available as a global before loading the target module.
    loadModule('View');

    // MapLibreView is not in the test registry — the module loader will stub
    // it as an empty class, which is fine because we only test _fetchSummary
    // and never call onInit() (which is where MapLibre is instantiated).
    const LoginLocationMapView = moduleLoader.loadModuleFromFile(LLMV_PATH, 'LoginLocationMapView');

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Build a minimal mock REST client that captures the last GET call.
     * Returns { rest, lastCall } where lastCall is { url, params }.
     */
    function makeMockRest(responseData = []) {
        const lastCall = { url: null, params: null };
        const rest = {
            async GET(url, params = {}) {
                lastCall.url = url;
                lastCall.params = { ...params };
                return {
                    success: true,
                    data: { status: true, data: responseData }
                };
            }
        };
        return { rest, lastCall };
    }

    /**
     * Create an instance with getApp() wired to the provided rest mock.
     */
    function makeView(options = {}, rest = null) {
        const view = new LoginLocationMapView(options);
        view.getApp = () => ({ rest });
        return view;
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    describe('LoginLocationMapView._fetchSummary() — endpoint selection', () => {

        it('system-wide (no userId): calls /api/account/logins/summary with no user param', async () => {
            const { rest, lastCall } = makeMockRest();
            const view = makeView({}, rest);

            await view._fetchSummary();

            expect(lastCall.url).toBe('/api/account/logins/summary');
            expect(lastCall.params.user).toBeUndefined();
            expect(lastCall.params.user_id).toBeUndefined();
        });

        it('per-user (userId set): calls /api/account/logins/summary with user param', async () => {
            const { rest, lastCall } = makeMockRest();
            const view = makeView({ userId: 42 }, rest);

            await view._fetchSummary();

            expect(lastCall.url).toBe('/api/account/logins/summary');
            expect(lastCall.params.user).toBe(42);
        });

        it('per-user: does NOT call the old /api/account/logins/user endpoint', async () => {
            const { rest, lastCall } = makeMockRest();
            const view = makeView({ userId: 99 }, rest);

            await view._fetchSummary();

            expect(lastCall.url).not.toBe('/api/account/logins/user');
            expect(lastCall.params.user_id).toBeUndefined();
        });

        it('per-user drill-down: passes user + country_code + region on summary endpoint', async () => {
            const { rest, lastCall } = makeMockRest();
            const view = makeView({ userId: 7 }, rest);

            await view._fetchSummary('US');

            expect(lastCall.url).toBe('/api/account/logins/summary');
            expect(lastCall.params.user).toBe(7);
            expect(lastCall.params.country_code).toBe('US');
            expect(lastCall.params.region).toBe(true);
        });

        it('system-wide drill-down: passes country_code + region on summary endpoint, no user', async () => {
            const { rest, lastCall } = makeMockRest();
            const view = makeView({}, rest);

            await view._fetchSummary('DE');

            expect(lastCall.url).toBe('/api/account/logins/summary');
            expect(lastCall.params.country_code).toBe('DE');
            expect(lastCall.params.region).toBe(true);
            expect(lastCall.params.user).toBeUndefined();
        });

        it('passes date-range params when drStart/drEnd are set', async () => {
            const { rest, lastCall } = makeMockRest();
            const view = makeView({ userId: 5, drStart: '2025-01-01', drEnd: '2025-03-31' }, rest);

            await view._fetchSummary();

            expect(lastCall.params.dr_start).toBe('2025-01-01');
            expect(lastCall.params.dr_end).toBe('2025-03-31');
            expect(lastCall.params.user).toBe(5);
        });
    });
};
