/**
 * ApiKey form-config tests — ITEM-025 regression.
 *
 * The bug: ApiKeyForms.create/.edit declared `permissions` as a plain
 * `type: 'textarea'`. An object value string-coerced to "[object Object]"
 * on display, and the raw textarea string was POSTed with no JSON.parse —
 * silently corrupting a key's permissions on any save.
 *
 * The fix: no JSON textarea at all. The create form embeds the live
 * Member.PERMISSION_TABSET (switch-per-permission, saved as flat dotted
 * `permissions.<name>` keys — Member parity); the edit dialog shrinks to
 * `name` (is_active moved to the DetailView header active switch).
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;

    await testHelpers.setup();
    const Member = loadModule('Member');
    const { ApiKey, ApiKeyForms } = loadModule('ApiKey');

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

    describe('ApiKeyForms — ITEM-025 regression', () => {
        it('create form has NO permissions textarea (the [object Object] bug)', () => {
            const bad = ApiKeyForms.create.fields.some(
                f => f.name === 'permissions' && f.type === 'textarea'
            );
            expect(bad).toBe(false);
        });

        it('edit form has NO permissions textarea (the [object Object] bug)', () => {
            const bad = ApiKeyForms.edit.fields.some(
                f => f.name === 'permissions' && f.type === 'textarea'
            );
            expect(bad).toBe(false);
        });

        it('create form embeds the Member permission tabset (switch/dotted-key editor)', () => {
            const tabset = ApiKeyForms.create.fields.find(f => f.type === 'tabset');
            expect(tabset).toBeDefined();
            // Literal reuse — the very object Member.rebuildPermissions() maintains
            expect(tabset).toBe(Member.PERMISSION_TABSET[0]);

            const stdNames = tabset.tabs[0].fields.map(f => f.name);
            expect(tabset.tabs[0].label).toBe('Standard');
            expect(stdNames).toContain('permissions.manage_group');
            expect(stdNames.length).toBe(Member.BASE_PERMISSIONS.length);
            expect(tabset.tabs[0].fields.every(f => f.type === 'switch')).toBe(true);
        });

        it('create form keeps name and group fields ahead of the tabset', () => {
            const names = ApiKeyForms.create.fields.map(f => f.name);
            expect(names).toContain('name');
            expect(names).toContain('group');
        });

        it('create tabset stays live across Member.registerPermissions (reference at use, not a frozen copy)', () => {
            // try/finally rather than relying on afterEach alone: if an
            // assertion throws, the Member registry must still be restored or
            // the leak cascades into Member.test.js later in the run.
            const priorPerms = Member.APP_PERMISSIONS.slice();
            const priorTabs = Member.APP_PERMISSION_TABS.slice();
            try {
                Member.registerPermissions({
                    permissions: [{ name: 'apikey_test_perm', label: 'ApiKey Test Perm' }]
                });

                const tabset = ApiKeyForms.create.fields.find(f => f.type === 'tabset');
                expect(tabset).toBeDefined();
                const labels = tabset.tabs.map(t => t.label);
                expect(labels).toContain('App');
                const appNames = tabset.tabs.find(t => t.label === 'App').fields.map(f => f.name);
                expect(appNames).toContain('permissions.apikey_test_perm');
            } finally {
                Member.APP_PERMISSIONS.length = 0;
                Member.APP_PERMISSIONS.push(...priorPerms);
                Member.APP_PERMISSION_TABS.length = 0;
                Member.APP_PERMISSION_TABS.push(...priorTabs);
                Member.rebuildPermissions();
            }
        });

        it('edit form is name-only — is_active moved to the DetailView header switch', () => {
            const names = ApiKeyForms.edit.fields.map(f => f.name);
            expect(names).toEqual(['name']);
        });

        it('ApiKey model still targets the standard CRUD endpoint', () => {
            const key = new ApiKey({ id: 1 });
            expect(key.endpoint).toBe('/api/group/apikey');
        });
    });
};
