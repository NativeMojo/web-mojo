/**
 * Page Events System Tests
 *
 * The previous tests drove events through `router.handleRoute(path, params,
 * query)` and a global `window.MOJO.eventBus` — that Router API no longer
 * exists. The current Router is simpler and page activation events are
 * emitted on the page instance itself (Page extends View → EventEmitter).
 *
 * This minimal suite exercises the current Page lifecycle contract:
 *   onEnter()  → sets isActive=true, emits 'activated' with metadata
 *   onExit()   → sets isActive=false, emits 'deactivated' with metadata
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;

    await testHelpers.setup();
    const Page = loadModule('Page');

    describe('Page lifecycle events', () => {
        it('sets isActive and emits "activated" on onEnter()', async () => {
            const page = new Page({
                pageName: 'Dashboard',
                route: '/dashboard',
                pageIcon: 'bi bi-speedometer2',
                displayName: 'Analytics Dashboard',
                pageDescription: 'Real-time metrics and insights'
            });

            let activated = null;
            page.on('activated', (payload) => { activated = payload; });

            await page.onEnter();

            expect(page.isActive).toBe(true);
            expect(activated).toBeDefined();
            expect(activated.page.name).toBe('Dashboard');
            expect(activated.page.route).toBe('/dashboard');
            expect(activated.page.icon).toBe('bi bi-speedometer2');
            expect(activated.page.displayName).toBe('Analytics Dashboard');
            expect(activated.page.description).toBe('Real-time metrics and insights');
        });

        it('clears isActive and emits "deactivated" on onExit()', async () => {
            const page = new Page({ pageName: 'Settings', route: '/settings' });
            await page.onEnter();

            let deactivated = null;
            page.on('deactivated', (payload) => { deactivated = payload; });

            await page.onExit();

            expect(page.isActive).toBe(false);
            expect(deactivated).toBeDefined();
            expect(deactivated.page.name).toBe('Settings');
        });

        it('updates document.title when pageOptions.title is set', async () => {
            const page = new Page({
                pageName: 'Billing',
                route: '/billing',
                pageOptions: { title: 'Billing — MyApp' }
            });

            const originalTitle = document.title;
            try {
                await page.onEnter();
                expect(document.title).toBe('Billing — MyApp');
            } finally {
                document.title = originalTitle;
            }
        });

        it('exposes metadata via getMetadata()', () => {
            const page = new Page({
                pageName: 'Users',
                route: '/users/:id',
                pageIcon: 'bi bi-people',
                displayName: 'User Directory'
            });

            const meta = page.getMetadata();

            expect(meta.name).toBe('Users');
            expect(meta.route).toBe('/users/:id');
            expect(meta.icon).toBe('bi bi-people');
            expect(meta.displayName).toBe('User Directory');
            expect(meta.isActive).toBe(false);
        });
    });
};
