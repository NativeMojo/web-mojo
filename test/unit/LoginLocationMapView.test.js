/**
 * LoginLocationMapView regression tests
 *
 * Covers two per-user bug fixes:
 *
 * Bug 1: _fetchSummary() was calling /api/account/logins/user instead of
 *        /api/account/logins/summary — now moot because per-user mode no
 *        longer uses the summary endpoint at all.
 *
 * Bug 2 (current): per-user map only showed one pin because the summary
 *        endpoint doesn't aggregate per-user geo data. Fixed by fetching raw
 *        login events from /api/account/logins, grouping by unique coordinates,
 *        and building markers from the grouped data.
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

    // ── Fixtures ──────────────────────────────────────────────────────────────

    // Raw login events as returned by /api/account/logins
    const EVENTS = [
        { id: 1088, latitude: 33.6409, longitude: -117.6031, city: 'Rancho Santa Margarita', region: 'California', country_code: 'US', is_new_country: false, is_new_region: false },
        { id: 1087, latitude: 33.6409, longitude: -117.6031, city: 'Rancho Santa Margarita', region: 'California', country_code: 'US', is_new_country: false, is_new_region: false },
        { id: 1042, latitude: 34.0522, longitude: -118.2437, city: 'Los Angeles',             region: 'California', country_code: 'US', is_new_country: false, is_new_region: false },
        { id: 1026, latitude: 34.0522, longitude: -118.2437, city: 'Los Angeles',             region: 'California', country_code: 'US', is_new_country: false, is_new_region: false },
        { id:  986, latitude: 34.0522, longitude: -118.2437, city: 'Los Angeles',             region: 'California', country_code: 'US', is_new_country: true,  is_new_region: true  },
    ];

    // ── Helpers ───────────────────────────────────────────────────────────────

    function makeMockRest(responseData = [], opts = {}) {
        const lastCall = { url: null, params: null };
        const rest = {
            async GET(url, params = {}) {
                lastCall.url = url;
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

    // ── _groupByLocation ──────────────────────────────────────────────────────

    describe('LoginLocationMapView._groupByLocation()', () => {

        it('groups events by unique lat/lng, counts each occurrence', () => {
            const view = makeView();
            const groups = view._groupByLocation(EVENTS);

            expect(groups.length).toBe(2);

            const rsm = groups.find(g => g.city === 'Rancho Santa Margarita');
            expect(rsm).toBeTruthy();
            expect(rsm.count).toBe(2);

            const la = groups.find(g => g.city === 'Los Angeles');
            expect(la).toBeTruthy();
            expect(la.count).toBe(3);
        });

        it('copies city, region, country_code from the first event at each coord', () => {
            const view = makeView();
            const [first] = view._groupByLocation(EVENTS);
            expect(first.city).toBeTruthy();
            expect(first.region).toBeTruthy();
            expect(first.country_code).toBeTruthy();
        });

        it('accumulates new_country_count and new_region_count across events', () => {
            const view = makeView();
            const groups = view._groupByLocation(EVENTS);
            const la = groups.find(g => g.city === 'Los Angeles');
            expect(la.new_country_count).toBe(1);
            expect(la.new_region_count).toBe(1);
        });

        it('skips events that have no coordinates', () => {
            const view = makeView();
            const events = [
                { id: 1, latitude: null, longitude: null, city: 'Unknown' },
                { id: 2, latitude: 34.0522, longitude: -118.2437, city: 'Los Angeles', region: 'California', country_code: 'US', is_new_country: false, is_new_region: false }
            ];
            const groups = view._groupByLocation(events);
            expect(groups.length).toBe(1);
            expect(groups[0].city).toBe('Los Angeles');
        });

        it('returns an empty array when given no events', () => {
            const view = makeView();
            expect(view._groupByLocation([])).toEqual([]);
        });
    });

    // ── _fetchAndGroupUserLogins ──────────────────────────────────────────────

    describe('LoginLocationMapView._fetchAndGroupUserLogins()', () => {

        it('calls /api/account/logins with user, size 200, sort -created, and created__gte', async () => {
            const { rest, lastCall } = makeMockRest(EVENTS);
            const view = makeView({ userId: 42 }, rest);

            await view._fetchAndGroupUserLogins();

            expect(lastCall.url).toBe('/api/account/logins');
            expect(lastCall.params.user).toBe(42);
            expect(lastCall.params.size).toBe(200);
            expect(lastCall.params.sort).toBe('-created');
            expect(typeof lastCall.params.created__gte).toBe('number');
        });

        it('created__gte is approximately 30 days ago in Unix seconds', async () => {
            const { rest, lastCall } = makeMockRest(EVENTS);
            const view = makeView({ userId: 1 }, rest);
            const before = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

            await view._fetchAndGroupUserLogins();

            const after = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
            expect(lastCall.params.created__gte).toBeGreaterThanOrEqual(before - 1);
            expect(lastCall.params.created__gte).toBeLessThanOrEqual(after + 1);
        });

        it('returns grouped location entries (2 unique coords from 5 events)', async () => {
            const { rest } = makeMockRest(EVENTS);
            const view = makeView({ userId: 1 }, rest);

            const groups = await view._fetchAndGroupUserLogins();

            expect(groups.length).toBe(2);
            expect(groups.map(g => g.count).sort((a, b) => b - a)).toEqual([3, 2]);
        });

        it('does NOT call the old /api/account/logins/user endpoint', async () => {
            const { rest, lastCall } = makeMockRest(EVENTS);
            const view = makeView({ userId: 5 }, rest);

            await view._fetchAndGroupUserLogins();

            expect(lastCall.url).not.toBe('/api/account/logins/user');
        });

        it('does NOT call the summary endpoint', async () => {
            const { rest, lastCall } = makeMockRest(EVENTS);
            const view = makeView({ userId: 5 }, rest);

            await view._fetchAndGroupUserLogins();

            expect(lastCall.url).not.toBe('/api/account/logins/summary');
        });

        it('throws when the API response indicates failure', async () => {
            const { rest } = makeMockRest([], { success: true, status: false });
            const view = makeView({ userId: 1 }, rest);

            let threw = false;
            try { await view._fetchAndGroupUserLogins(); } catch { threw = true; }
            expect(threw).toBe(true);
        });
    });

    // ── refresh() routing ─────────────────────────────────────────────────────

    describe('LoginLocationMapView.refresh() — endpoint routing', () => {

        it('system-wide (no userId): still calls /api/account/logins/summary', async () => {
            const { rest, lastCall } = makeMockRest([]);
            const view = makeView({}, rest);
            view._mapAvailable = true;
            view.mapView = { updateMarkers() {}, map: null };
            view._setStatus = () => {};

            await view.refresh();

            expect(lastCall.url).toBe('/api/account/logins/summary');
        });

        it('per-user (userId set): calls /api/account/logins, not the summary endpoint', async () => {
            const { rest, lastCall } = makeMockRest(EVENTS);
            const view = makeView({ userId: 7 }, rest);
            view._mapAvailable = true;
            view.mapView = { updateMarkers() {}, map: null };
            view._setStatus = () => {};

            await view.refresh();

            expect(lastCall.url).toBe('/api/account/logins');
            expect(lastCall.url).not.toBe('/api/account/logins/summary');
        });
    });
};
