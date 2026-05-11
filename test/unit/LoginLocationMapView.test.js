/**
 * LoginLocationMapView regression tests
 *
 * Covers the correct endpoint selection per mode and userId:
 *
 * summary / global  : GET /api/account/logins/summary
 * summary / per-user: GET /api/account/logins/user?user_id=<id>   (server-aggregated)
 * list    / global  : GET /api/account/logins?graph=list&size=500
 * list    / per-user: GET /api/account/logins?user=<id>&graph=list&size=500
 *
 * Also covers _applyListMarkers event coloring and the mode-toggle action.
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
    loadModule('View');

    const LoginLocationMapView = moduleLoader.loadModuleFromFile(LLMV_PATH, 'LoginLocationMapView');

    // ── Helpers ───────────────────────────────────────────────────────────────

    function makeMockRest(responseData = [], opts = {}) {
        const lastCall = { url: null, params: null };
        const rest = {
            async GET(url, params = {}) {
                lastCall.url    = url;
                lastCall.params = { ...params };
                const status = opts.status !== undefined ? opts.status : true;
                return {
                    success: opts.success !== undefined ? opts.success : true,
                    data: { status, data: responseData }
                };
            }
        };
        return { rest, lastCall };
    }

    function makeView(options = {}, rest = null) {
        const view = new LoginLocationMapView(options);
        view.getApp = () => ({ rest });
        return view;
    }

    // Minimal summary entries (as returned by /api/account/logins/summary or /user)
    const SUMMARY_ENTRIES = [
        { country_code: 'US', count: 10, latitude: 37.09, longitude: -95.71, new_country_count: 0, new_region_count: 0 },
        { country_code: 'DE', count:  3, latitude: 51.17, longitude:  10.45, new_country_count: 1, new_region_count: 0 }
    ];

    // Raw login events (as returned by /api/account/logins?graph=list)
    const LOGIN_EVENTS = [
        { id: 1, latitude: 33.64, longitude: -117.60, city: 'Rancho Santa Margarita', region: 'California', country_code: 'US', ip_address: '1.2.3.4', event_type: 'success', created: 1700000000 },
        { id: 2, latitude: 34.05, longitude: -118.24, city: 'Los Angeles',             region: 'California', country_code: 'US', ip_address: '5.6.7.8', event_type: 'failed',  created: 1700001000 },
        { id: 3, latitude: 52.52, longitude:   13.41, city: 'Berlin',                  region: null,         country_code: 'DE', ip_address: '9.0.1.2', event_type: 'suspicious', created: 1700002000 }
    ];

    // ── _fetchSummary — endpoint selection ────────────────────────────────────

    describe('LoginLocationMapView._fetchSummary() — endpoint selection', () => {

        it('global (no userId): calls /api/account/logins/summary', async () => {
            const { rest, lastCall } = makeMockRest(SUMMARY_ENTRIES);
            const view = makeView({}, rest);
            await view._fetchSummary();
            expect(lastCall.url).toBe('/api/account/logins/summary');
            expect(lastCall.params.user_id).toBeUndefined();
        });

        it('per-user: calls /api/account/logins/user with user_id', async () => {
            const { rest, lastCall } = makeMockRest(SUMMARY_ENTRIES);
            const view = makeView({ userId: 42 }, rest);
            await view._fetchSummary();
            expect(lastCall.url).toBe('/api/account/logins/user');
            expect(lastCall.params.user_id).toBe(42);
        });

        it('drill-down: adds country_code and region=true params', async () => {
            const { rest, lastCall } = makeMockRest([]);
            const view = makeView({ userId: 7 }, rest);
            await view._fetchSummary('US');
            expect(lastCall.params.country_code).toBe('US');
            expect(lastCall.params.region).toBe(true);
        });

        it('passes dr_start / dr_end when set', async () => {
            const { rest, lastCall } = makeMockRest(SUMMARY_ENTRIES);
            const view = makeView({ drStart: '2025-01-01', drEnd: '2025-03-31' }, rest);
            await view._fetchSummary();
            expect(lastCall.params.dr_start).toBe('2025-01-01');
            expect(lastCall.params.dr_end).toBe('2025-03-31');
        });
    });

    // ── _fetchList — endpoint selection ──────────────────────────────────────

    describe('LoginLocationMapView._fetchList() — endpoint selection', () => {

        it('always calls /api/account/logins with graph=list and size=500', async () => {
            const { rest, lastCall } = makeMockRest(LOGIN_EVENTS);
            const view = makeView({}, rest);
            await view._fetchList();
            expect(lastCall.url).toBe('/api/account/logins');
            expect(lastCall.params.graph).toBe('list');
            expect(lastCall.params.size).toBe(500);
        });

        it('global (no userId): no user param', async () => {
            const { rest, lastCall } = makeMockRest(LOGIN_EVENTS);
            const view = makeView({}, rest);
            await view._fetchList();
            expect(lastCall.params.user).toBeUndefined();
        });

        it('per-user: adds user param (not user_id)', async () => {
            const { rest, lastCall } = makeMockRest(LOGIN_EVENTS);
            const view = makeView({ userId: 42 }, rest);
            await view._fetchList();
            expect(lastCall.params.user).toBe(42);
            expect(lastCall.params.user_id).toBeUndefined();
        });
    });

    // ── refresh() routing ─────────────────────────────────────────────────────

    describe('LoginLocationMapView.refresh() — mode routing', () => {

        it('summary mode calls /api/account/logins/summary (global)', async () => {
            const { rest, lastCall } = makeMockRest(SUMMARY_ENTRIES);
            const view = makeView({ viewMode: 'summary' }, rest);
            view._mapAvailable = true;
            view.mapView = { updateMarkers() {} };
            view._setStatus = () => {};
            await view.refresh();
            expect(lastCall.url).toBe('/api/account/logins/summary');
        });

        it('summary mode per-user calls /api/account/logins/user', async () => {
            const { rest, lastCall } = makeMockRest(SUMMARY_ENTRIES);
            const view = makeView({ userId: 5, viewMode: 'summary' }, rest);
            view._mapAvailable = true;
            view.mapView = { updateMarkers() {} };
            view._setStatus = () => {};
            await view.refresh();
            expect(lastCall.url).toBe('/api/account/logins/user');
        });

        it('list mode calls /api/account/logins with graph=list', async () => {
            const { rest, lastCall } = makeMockRest(LOGIN_EVENTS);
            const view = makeView({ viewMode: 'list' }, rest);
            view._mapAvailable = true;
            view.mapView = { updateMarkers() {} };
            view._setStatus = () => {};
            await view.refresh();
            expect(lastCall.url).toBe('/api/account/logins');
            expect(lastCall.params.graph).toBe('list');
        });
    });

    // ── _getEventColor ────────────────────────────────────────────────────────

    describe('LoginLocationMapView._getEventColor()', () => {
        it('returns teal for success events', () => {
            const view = makeView();
            expect(view._getEventColor('success')).toContain('32, 201, 151');
            expect(view._getEventColor('login')).toContain('32, 201, 151');
            expect(view._getEventColor('success_login')).toContain('32, 201, 151');
        });

        it('returns red for failed events', () => {
            const view = makeView();
            expect(view._getEventColor('failed')).toContain('220, 53, 69');
            expect(view._getEventColor('failure')).toContain('220, 53, 69');
            expect(view._getEventColor('failed_login')).toContain('220, 53, 69');
        });

        it('returns amber for suspicious / mfa events', () => {
            const view = makeView();
            expect(view._getEventColor('suspicious')).toContain('255, 193, 7');
            expect(view._getEventColor('mfa_required')).toContain('255, 193, 7');
        });

        it('returns gray for unrecognized event types', () => {
            const view = makeView();
            expect(view._getEventColor('unknown')).toContain('108, 117, 125');
            expect(view._getEventColor(null)).toContain('108, 117, 125');
        });
    });
};
