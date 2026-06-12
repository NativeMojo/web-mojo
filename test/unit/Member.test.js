/**
 * Member permission registry tests.
 *
 * Member.PERMISSIONS / Member.PERMISSION_FIELDS are now live caches
 * computed from Member.BASE_PERMISSIONS + Member.APP_PERMISSIONS via
 * Member.rebuildPermissions(). These tests cover the extension point,
 * idempotent rebuilds, and in-place mutation of cached references.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;

    await testHelpers.setup();
    const Member = loadModule('Member');

    let savedAppPerms;
    let savedAppTabs;

    beforeEach(() => {
        savedAppPerms = Member.APP_PERMISSIONS.slice();
        savedAppTabs = Member.APP_PERMISSION_TABS.slice();
    });

    afterEach(() => {
        Member.APP_PERMISSIONS.length = 0;
        Member.APP_PERMISSIONS.push(...savedAppPerms);
        Member.APP_PERMISSION_TABS.length = 0;
        Member.APP_PERMISSION_TABS.push(...savedAppTabs);
        Member.rebuildPermissions();
    });

    describe('Member permission registry', () => {
        it('initial PERMISSIONS exposes the framework BASE list', () => {
            const names = Member.PERMISSIONS.map(p => p.name);
            expect(names).toContain('manage_group');
            expect(names).toContain('view_billing');
            expect(Member.PERMISSIONS.length).toBe(Member.BASE_PERMISSIONS.length);
        });

        it('PERMISSION_FIELDS shape matches the switch field convention', () => {
            const f = Member.PERMISSION_FIELDS[0];
            expect(f.type).toBe('switch');
            expect(f.columns).toBe(6);
            expect(f.name.startsWith('permissions.')).toBe(true);
        });

        it('rebuildPermissions picks up entries pushed onto APP_PERMISSIONS', () => {
            Member.APP_PERMISSIONS.push({ name: 'app_perm', label: 'App Perm' });
            Member.rebuildPermissions();

            const names = Member.PERMISSIONS.map(p => p.name);
            expect(names).toContain('app_perm');

            const fieldNames = Member.PERMISSION_FIELDS.map(f => f.name);
            expect(fieldNames).toContain('permissions.app_perm');
        });

        it('registerPermissions appends to APP_PERMISSIONS and rebuilds in one call', () => {
            Member.registerPermissions({
                permissions: [{ name: 'manage_x', label: 'Manage X' }]
            });

            expect(Member.APP_PERMISSIONS.some(p => p.name === 'manage_x')).toBe(true);
            expect(Member.PERMISSION_FIELDS.map(f => f.name)).toContain('permissions.manage_x');
        });

        it('registerPermissions is a no-op for null / missing permissions', () => {
            const before = Member.PERMISSION_FIELDS.map(f => f.name);
            Member.registerPermissions();
            Member.registerPermissions({});
            expect(Member.PERMISSION_FIELDS.map(f => f.name)).toEqual(before);
        });

        it('PERMISSION_TABSET is one tabset whose first tab ("Standard") holds the BASE perms', () => {
            const tabset = Member.PERMISSION_TABSET[0];
            expect(tabset.type).toBe('tabset');
            expect(tabset.tabs[0].label).toBe('Standard');
            const stdNames = tabset.tabs[0].fields.map(f => f.name);
            expect(stdNames).toContain('permissions.manage_group');
            expect(stdNames.length).toBe(Member.BASE_PERMISSIONS.length);
        });

        it('registerPermissions({ tabs }) adds one named tab each — multiple app tabs', () => {
            Member.registerPermissions({
                tabs: [
                    { label: 'Verify', permissions: [{ name: 'view_verify', label: 'View Verify' }] },
                    { label: 'Wallet', permissions: [{ name: 'view_wallet', label: 'View Wallet' }] }
                ]
            });

            const labels = Member.PERMISSION_TABSET[0].tabs.map(t => t.label);
            expect(labels).toEqual(['Standard', 'Verify', 'Wallet']);

            // Tab perms also land in the flat caches / gate list.
            expect(Member.PERMISSION_FIELDS.map(f => f.name)).toContain('permissions.view_verify');
            expect(Member.PERMISSIONS.some(p => p.name === 'view_wallet')).toBe(true);
        });

        it('flat app perms produce a single "App" tab before any named tabs', () => {
            Member.registerPermissions({ permissions: [{ name: 'app_flat', label: 'App Flat' }] });
            const labels = Member.PERMISSION_TABSET[0].tabs.map(t => t.label);
            expect(labels).toEqual(['Standard', 'App']);
        });

        it('mutates PERMISSIONS / PERMISSION_FIELDS in place so existing references stay live', () => {
            const heldPerms = Member.PERMISSIONS;
            const heldFields = Member.PERMISSION_FIELDS;
            const initialPermsLen = heldPerms.length;

            Member.APP_PERMISSIONS.push({ name: 'app_perm', label: 'App Perm' });
            Member.rebuildPermissions();

            expect(Member.PERMISSIONS).toBe(heldPerms);
            expect(Member.PERMISSION_FIELDS).toBe(heldFields);
            expect(heldPerms.length).toBe(initialPermsLen + 1);
            expect(heldFields.some(f => f.name === 'permissions.app_perm')).toBe(true);
        });

        it('is idempotent — two consecutive calls produce identical state', () => {
            Member.APP_PERMISSIONS.push({ name: 'app_perm', label: 'App Perm' });

            Member.rebuildPermissions();
            const firstNames = Member.PERMISSIONS.map(p => p.name);
            const firstFields = Member.PERMISSION_FIELDS.map(f => f.name);

            Member.rebuildPermissions();
            expect(Member.PERMISSIONS.map(p => p.name)).toEqual(firstNames);
            expect(Member.PERMISSION_FIELDS.map(f => f.name)).toEqual(firstFields);
        });

        it('Member.hasPermission still does literal-only matching', () => {
            // Member intentionally has no category fallback.
            const m = new Member({ permissions: { manage_group: true } });
            expect(m.hasPermission('manage_group')).toBe(true);
            expect(m.hasPermission('view_metrics')).toBe(false);
        });

        it('group `admin` grants any (non-sys) group gate', () => {
            const m = new Member({ permissions: { admin: true } });
            expect(m.hasPermission('manage_group')).toBe(true);
            expect(m.hasPermission('view_metrics')).toBe(true);
            expect(m.hasPermission('manage_player')).toBe(true);
        });

        it('group `admin` does NOT grant sys.* gates', () => {
            const m = new Member({ permissions: { admin: true } });
            expect(m.hasPermission('sys.manage_groups')).toBe(false);
        });

        it('`admin` is grantable from the UI — registered in BASE_PERMISSIONS (ITEM-019)', () => {
            const adminPerm = Member.BASE_PERMISSIONS.find(p => p.name === 'admin');
            expect(adminPerm).toBeDefined();
            expect(adminPerm.label).toBe('Group Admin');
            expect(Member.PERMISSION_FIELDS.map(f => f.name)).toContain('permissions.admin');
        });

        it('manage_group is labeled "Manage Group", not "Group Admin" (ITEM-019)', () => {
            const mg = Member.BASE_PERMISSIONS.find(p => p.name === 'manage_group');
            expect(mg.label).toBe('Manage Group');
        });
    });
};
