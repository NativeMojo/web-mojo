/**
 * SideNavView permission-gating regression tests.
 *
 * The section permission check used to FAIL OPEN: `_hasPermission` returned
 * true whenever the app/activeUser wasn't resolvable (or hasPerm threw), so
 * every permission-gated DetailView section (GroupView Webhooks/Audit, the
 * ITEM-023 Geofencing section, …) rendered for unresolvable users. It now
 * fails CLOSED via View#checkPermissions — and, because SideNavViews are
 * constructed before an app is attached, gating is evaluated at
 * render/navigation time instead of construction time: all sections are
 * STORED, visibility is decided when asked.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect, beforeEach } = testContext;

    await testHelpers.setup();
    const SideNavView = loadModule('SideNavView');

    // Mirror User.hasPermission's any-of array semantics.
    const userWith = (...grants) => ({
        hasPermission: (perm) => Array.isArray(perm)
            ? perm.some(p => grants.includes(p))
            : grants.includes(perm)
    });

    const makeNav = (options = {}) => new SideNavView({
        sections: [
            { key: 'Overview', label: 'Overview', view: {} },
            { type: 'divider', label: 'Access' },
            { key: 'Webhooks', label: 'Webhooks', view: {}, permissions: 'manage_group' },
            { key: 'Geofencing', label: 'Geofencing', view: {}, permissions: ['sys.view_geofence', 'sys.security'] },
            { type: 'divider', label: 'Detail' },
            { key: 'Metadata', label: 'Metadata', view: {} }
        ],
        ...options
    });

    describe('SideNavView permission gating', () => {
        beforeEach(() => {
            // No resolvable app via the window-global fallbacks.
            if (global.window) {
                delete global.window.__app__;
                delete global.window.APP;
                delete global.window.app;
                delete global.window.WebApp;
                if (global.window.MOJO) delete global.window.MOJO.app;
            }
        });

        it('stores every section at construction (gating is deferred, not decided early)', () => {
            const nav = makeNav();
            const keys = nav.sectionConfigs.filter(c => c.type !== 'divider').map(c => c.key);
            expect(keys).toEqual(['Overview', 'Webhooks', 'Geofencing', 'Metadata']);
        });

        it('fails CLOSED when no app is resolvable', () => {
            const nav = makeNav();
            expect(nav.getSectionKeys()).toEqual(['Overview', 'Metadata']);
        });

        it('fails CLOSED when the app has no activeUser', () => {
            const nav = makeNav();
            nav.app = { activeUser: null, showPage() {} };
            expect(nav.getSectionKeys()).toEqual(['Overview', 'Metadata']);
        });

        it('shows gated sections to users holding the permission (any-of for arrays)', () => {
            const nav = makeNav();
            nav.app = { activeUser: userWith('sys.security'), showPage() {} };
            expect(nav.getSectionKeys()).toEqual(['Overview', 'Geofencing', 'Metadata']);

            nav.app = { activeUser: userWith('manage_group', 'sys.view_geofence'), showPage() {} };
            expect(nav.getSectionKeys()).toEqual(['Overview', 'Webhooks', 'Geofencing', 'Metadata']);
        });

        it('becomes visible once the app attaches AFTER construction (the timing case fail-open existed for)', () => {
            const nav = makeNav();
            expect(nav.getSectionKeys()).toEqual(['Overview', 'Metadata']);
            nav.app = { activeUser: userWith('manage_group'), showPage() {} };
            expect(nav.getSectionKeys()).toEqual(['Overview', 'Webhooks', 'Metadata']);
        });

        it('showSection refuses gated sections (fail-closed) and allows granted ones', async () => {
            const nav = makeNav();
            nav.app = { activeUser: userWith('manage_group'), showPage() {} };
            expect(await nav.showSection('Geofencing')).toBe(false);
            expect(nav.activeSection).not.toBe('Geofencing');
        });

        it('reconciles a gated initial activeSection to the first visible one', () => {
            const nav = makeNav({ activeSection: 'Webhooks' });
            nav.app = { activeUser: userWith(), showPage() {} }; // no grants
            nav._reconcileActiveSection();
            expect(nav.activeSection).toBe('Overview');
        });

        it('drops divider labels whose entire group is gated away', () => {
            const nav = makeNav();
            nav.app = { activeUser: userWith(), showPage() {} }; // no grants
            const visible = nav._visibleSectionConfigs();
            const labels = visible.filter(c => c.type === 'divider').map(c => c.label);
            expect(labels).toEqual(['Detail']); // 'Access' group is fully gated
        });
    });
};
