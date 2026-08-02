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
            // The tabset WRAPPER is now ApiKey's own (it appends a Federation
            // tab Member must not carry), but the member tabs inside it are the
            // very objects Member.rebuildPermissions() maintains — spread copies
            // the array, not its elements. That reference identity is what keeps
            // the editor live rather than a frozen copy.
            expect(tabset).not.toBe(Member.PERMISSION_TABSET[0]);
            expect(tabset.tabs[0]).toBe(Member.PERMISSION_TABSET[0].tabs[0]);

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

    // ── Federation permissions (geoip_sync toggle) ──────────────
    //
    // geoip_sync gates POST /api/system/geoip/sync on the upstream hub. The
    // backend protects it behind APIKEY_PERMS_PROTECTION -> "sys.geoip_sync",
    // so only a global admin may grant it; these tests pin the client mirror.

    describe('ApiKey federation permissions', () => {
        const stubUser = (perms, isSuper = false) => ({
            hasPermission(permission) {
                if (isSuper) return true;
                const list = Array.isArray(permission) ? permission : [permission];
                return list.some(p => perms.includes(p));
            }
        });

        const federationTab = (canGrant) =>
            ApiKey.permissionTabset(canGrant).find(f => f.type === 'tabset')
                .tabs.find(t => t.label === 'Federation');

        it('exposes a geoip_sync switch in a Federation tab', () => {
            const tab = federationTab(true);
            expect(tab).toBeDefined();
            const field = tab.fields.find(f => f.name === 'permissions.geoip_sync');
            expect(field).toBeDefined();
            expect(field.type).toBe('switch');
            expect(field.label).toBe('GeoIP Federation Sync');
        });

        it('never leaks geoip_sync into the shared Member catalog', () => {
            // The pollution guard. A *member* grant of geoip_sync authorizes
            // nothing — the endpoint is requires_global_perms, which refuses the
            // group fallback — so offering it on the member editor would
            // advertise a grant that silently does nothing.
            const memberNames = Member.PERMISSION_TABSET[0].tabs
                .flatMap(t => t.fields.map(f => f.name));
            expect(memberNames).not.toContain('permissions.geoip_sync');
            expect(Member.BASE_PERMISSIONS.some(p => p.name === 'geoip_sync')).toBe(false);
        });

        it('disables the switch when the user cannot grant it', () => {
            const field = federationTab(false)
                .fields.find(f => f.name === 'permissions.geoip_sync');
            expect(field.disabled).toBe(true);
            // The tooltip must explain WHY, not just repeat what the perm does.
            expect(field.tooltip).toContain('global administrator');
        });

        it('enables the switch when the user can grant it', () => {
            const field = federationTab(true)
                .fields.find(f => f.name === 'permissions.geoip_sync');
            expect(field.disabled).toBeUndefined();
            expect(field.tooltip).toContain('abuse signals');
        });

        it('canGrantFederation mirrors the backend grant paths', () => {
            expect(ApiKey.canGrantFederation(stubUser(['manage_users']))).toBe(true);
            expect(ApiKey.canGrantFederation(stubUser(['manage_groups']))).toBe(true);
            expect(ApiKey.canGrantFederation(stubUser(['sys.geoip_sync']))).toBe(true);
            expect(ApiKey.canGrantFederation(stubUser([], true))).toBe(true);
            // A group admin holding only group-level perms must NOT qualify —
            // this is the hole the backend floor closes.
            expect(ApiKey.canGrantFederation(stubUser(['manage_group']))).toBe(false);
            expect(ApiKey.canGrantFederation(stubUser(['security']))).toBe(false);
        });

        it('canGrantFederation fails closed on a missing or malformed user', () => {
            expect(ApiKey.canGrantFederation(null)).toBe(false);
            expect(ApiKey.canGrantFederation({})).toBe(false);
        });

        it('the Federation tab survives Member.registerPermissions', () => {
            const priorPerms = Member.APP_PERMISSIONS.slice();
            const priorTabs = Member.APP_PERMISSION_TABS.slice();
            try {
                Member.registerPermissions({
                    permissions: [{ name: 'fed_live_perm', label: 'Fed Live Perm' }]
                });
                const labels = ApiKey.permissionTabset(true)
                    .find(f => f.type === 'tabset').tabs.map(t => t.label);
                // Both the newly registered app tab AND Federation must be there:
                // reading through to the live Member cache must not drop the
                // tab ApiKey appends.
                expect(labels).toContain('App');
                expect(labels).toContain('Federation');
            } finally {
                Member.APP_PERMISSIONS.length = 0;
                Member.APP_PERMISSIONS.push(...priorPerms);
                Member.APP_PERMISSION_TABS.length = 0;
                Member.APP_PERMISSION_TABS.push(...priorTabs);
                Member.rebuildPermissions();
            }
        });

        it('the create form carries the Federation tab', () => {
            const labels = ApiKeyForms.create.fields
                .find(f => f.type === 'tabset').tabs.map(t => t.label);
            expect(labels).toContain('Federation');
        });
    });
};
