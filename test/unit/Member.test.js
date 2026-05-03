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

    beforeEach(() => {
        savedAppPerms = Member.APP_PERMISSIONS.slice();
    });

    afterEach(() => {
        Member.APP_PERMISSIONS.length = 0;
        Member.APP_PERMISSIONS.push(...savedAppPerms);
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
    });
};
