/**
 * User permission gate tests.
 *
 * Covers the granular → category fallback and the registerCategoryMap()
 * extension point that lets app-level categories implicitly satisfy
 * gates listing app-level granular perms.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;

    await testHelpers.setup();
    const User = loadModule('User');

    // Snapshot mappings so registrations from one test don't leak to others.
    let savedCategoryMap;
    let savedAppCategories;
    let savedAppGranulars;
    let savedGranularTabs;

    beforeEach(() => {
        savedCategoryMap = JSON.parse(JSON.stringify(User.CATEGORY_GRANULAR_MAP));
        savedAppCategories = User.APP_CATEGORY_PERMISSIONS.slice();
        savedAppGranulars = User.APP_GRANULAR_PERMISSIONS.slice();
        savedGranularTabs = User.GRANULAR_PERMISSION_TABS.map(t => ({
            label: t.label,
            permissions: t.permissions.slice()
        }));
    });

    afterEach(() => {
        // Restore source arrays/maps in place, then rebuild caches.
        for (const k of Object.keys(User.CATEGORY_GRANULAR_MAP)) delete User.CATEGORY_GRANULAR_MAP[k];
        Object.assign(User.CATEGORY_GRANULAR_MAP, savedCategoryMap);

        User.APP_CATEGORY_PERMISSIONS.length = 0;
        User.APP_CATEGORY_PERMISSIONS.push(...savedAppCategories);

        User.APP_GRANULAR_PERMISSIONS.length = 0;
        User.APP_GRANULAR_PERMISSIONS.push(...savedAppGranulars);

        User.GRANULAR_PERMISSION_TABS.length = 0;
        User.GRANULAR_PERMISSION_TABS.push(...savedGranularTabs);

        User.rebuildPermissions();
    });

    describe('User.hasPermission category fallback', () => {
        it('grants a granular gate when the user holds the parent category (system)', () => {
            const u = new User({ permissions: { security: true } });
            expect(u.hasPermission('view_security')).toBe(true);
            expect(u.hasPermission('manage_security')).toBe(true);
        });

        it('denies a granular gate when the user has neither the granular nor the category', () => {
            const u = new User({ permissions: { jobs: false } });
            expect(u.hasPermission('view_security')).toBe(false);
        });

        it('grants a literal granular gate when only the granular is set', () => {
            const u = new User({ permissions: { view_security: true } });
            expect(u.hasPermission('view_security')).toBe(true);
            // The category itself isn't held, so a category-named gate should fail.
            expect(u.hasPermission('security')).toBe(false);
        });

        it('superuser passes every gate regardless of map entries', () => {
            const u = new User({ is_superuser: true, permissions: {} });
            expect(u.hasPermission('view_security')).toBe(true);
            expect(u.hasPermission('anything_at_all')).toBe(true);
        });
    });

    describe('User.registerCategoryMap', () => {
        it('extends GRANULAR_TO_CATEGORY so app categories satisfy app granular gates', () => {
            // Before registration: app granular has no parent category.
            expect(User.GRANULAR_TO_CATEGORY['view_app_thing']).toBeUndefined();

            User.registerCategoryMap({ app_cat: ['view_app_thing', 'manage_app_thing'] });

            expect(User.GRANULAR_TO_CATEGORY['view_app_thing']).toBe('app_cat');
            expect(User.GRANULAR_TO_CATEGORY['manage_app_thing']).toBe('app_cat');
            expect(User.CATEGORY_GRANULAR_MAP['app_cat']).toEqual(
                expect.arrayContaining(['view_app_thing', 'manage_app_thing'])
            );
        });

        it('lets a held app category satisfy a gate listing only the granular', () => {
            User.registerCategoryMap({ app_cat: ['view_app_thing'] });
            const u = new User({ permissions: { app_cat: true } });
            expect(u.hasPermission('view_app_thing')).toBe(true);
            // Array form (page-/view-level gates pass arrays).
            expect(u.hasPermission(['view_app_thing'])).toBe(true);
        });

        it('merges into an existing category without dropping prior entries', () => {
            const before = User.CATEGORY_GRANULAR_MAP['security'].slice();
            User.registerCategoryMap({ security: ['extra_security_perm'] });

            for (const p of before) {
                expect(User.CATEGORY_GRANULAR_MAP['security']).toContain(p);
                expect(User.GRANULAR_TO_CATEGORY[p]).toBe('security');
            }
            expect(User.GRANULAR_TO_CATEGORY['extra_security_perm']).toBe('security');
        });

        it('is a no-op for null/undefined/non-array values', () => {
            const beforeMap = { ...User.GRANULAR_TO_CATEGORY };
            User.registerCategoryMap(null);
            User.registerCategoryMap(undefined);
            User.registerCategoryMap({ bogus: 'not-an-array' });
            expect(User.GRANULAR_TO_CATEGORY).toEqual(beforeMap);
        });
    });

    describe('User.rebuildPermissions', () => {
        it('picks up a granular tab pushed onto GRANULAR_PERMISSION_TABS', () => {
            User.GRANULAR_PERMISSION_TABS.push({
                label: 'Custom',
                permissions: [
                    { name: 'view_app_thing', label: 'View App Thing' },
                    { name: 'manage_app_thing', label: 'Manage App Thing' }
                ]
            });
            User.rebuildPermissions();

            const tabset = User.GRANULAR_PERMISSION_FIELDS[0];
            expect(tabset.type).toBe('tabset');
            const labels = tabset.tabs.map(t => t.label);
            expect(labels).toContain('Custom');

            const customTab = tabset.tabs.find(t => t.label === 'Custom');
            const fieldNames = customTab.fields.map(f => f.name);
            expect(fieldNames).toEqual([
                'permissions.view_app_thing',
                'permissions.manage_app_thing'
            ]);
        });

        it('emits an "App" tab in CATEGORY_PERMISSION_FIELDS when APP_CATEGORY_PERMISSIONS is non-empty', () => {
            // Initial state: no App tab.
            const initialLabels = User.CATEGORY_PERMISSION_FIELDS[0].tabs.map(t => t.label);
            expect(initialLabels).not.toContain('App');

            User.APP_CATEGORY_PERMISSIONS.push({ name: 'app_cat', label: 'App Category' });
            User.rebuildPermissions();

            const tabset = User.CATEGORY_PERMISSION_FIELDS[0];
            const labels = tabset.tabs.map(t => t.label);
            expect(labels).toContain('App');

            const appTab = tabset.tabs.find(t => t.label === 'App');
            expect(appTab.fields[0]).toEqual({
                name: 'permissions.app_cat',
                type: 'switch',
                label: 'App Category',
                columns: 6
            });
        });

        it('reflects new CATEGORY_GRANULAR_MAP entries in GRANULAR_TO_CATEGORY', () => {
            User.CATEGORY_GRANULAR_MAP.app_cat = ['view_app_thing', 'manage_app_thing'];
            User.rebuildPermissions();

            expect(User.GRANULAR_TO_CATEGORY['view_app_thing']).toBe('app_cat');
            expect(User.GRANULAR_TO_CATEGORY['manage_app_thing']).toBe('app_cat');
            // System entries still present.
            expect(User.GRANULAR_TO_CATEGORY['view_security']).toBe('security');
        });

        it('is idempotent — two calls produce the same outputs', () => {
            User.APP_CATEGORY_PERMISSIONS.push({ name: 'app_cat', label: 'App Category' });
            User.GRANULAR_PERMISSION_TABS.push({
                label: 'Custom',
                permissions: [{ name: 'view_app_thing', label: 'View App Thing' }]
            });
            User.CATEGORY_GRANULAR_MAP.app_cat = ['view_app_thing'];

            User.rebuildPermissions();
            const firstPerms = User.PERMISSIONS.map(p => p.name);
            const firstFields = User.PERMISSION_FIELDS.map(f => f.name);
            const firstCategoryTabs = User.CATEGORY_PERMISSION_FIELDS[0].tabs.map(t => t.label);
            const firstGranularTabs = User.GRANULAR_PERMISSION_FIELDS[0].tabs.map(t => t.label);
            const firstReverse = { ...User.GRANULAR_TO_CATEGORY };

            User.rebuildPermissions();

            expect(User.PERMISSIONS.map(p => p.name)).toEqual(firstPerms);
            expect(User.PERMISSION_FIELDS.map(f => f.name)).toEqual(firstFields);
            expect(User.CATEGORY_PERMISSION_FIELDS[0].tabs.map(t => t.label)).toEqual(firstCategoryTabs);
            expect(User.GRANULAR_PERMISSION_FIELDS[0].tabs.map(t => t.label)).toEqual(firstGranularTabs);
            expect(User.GRANULAR_TO_CATEGORY).toEqual(firstReverse);
        });

        it('mutates PERMISSION_FIELDS in place so existing references stay live', () => {
            // Simulate UserForms.permissions.fields holding a reference at module-load time.
            const heldRef = User.PERMISSION_FIELDS;
            const initialLength = heldRef.length;

            User.APP_CATEGORY_PERMISSIONS.push({ name: 'app_cat', label: 'App Category' });
            User.rebuildPermissions();

            // Same reference, updated contents.
            expect(User.PERMISSION_FIELDS).toBe(heldRef);
            expect(heldRef.length).toBe(initialLength + 1);
            expect(heldRef.some(f => f.name === 'permissions.app_cat')).toBe(true);
        });
    });

    describe('User.registerPermissions', () => {
        it('applies all four extension types in a single call and rebuilds caches once', () => {
            User.registerPermissions({
                categories: [{ name: 'app_cat', label: 'App Category' }],
                granularPermissions: [{ name: 'app_perm', label: 'App Perm' }],
                granularTabs: [{
                    label: 'Custom',
                    permissions: [
                        { name: 'view_app_thing', label: 'View App Thing' }
                    ]
                }],
                categoryGranularMap: { app_cat: ['view_app_thing'] }
            });

            // Category appended to APP_CATEGORY_PERMISSIONS and reflected in flat list.
            expect(User.PERMISSIONS.some(p => p.name === 'app_cat')).toBe(true);
            // Granular added.
            expect(User.PERMISSIONS.some(p => p.name === 'app_perm')).toBe(true);
            // Granular tab added.
            const customTab = User.GRANULAR_PERMISSION_FIELDS[0].tabs.find(t => t.label === 'Custom');
            expect(customTab).toBeDefined();
            expect(customTab.fields.map(f => f.name)).toContain('permissions.view_app_thing');
            // App tab present (because APP_CATEGORY_PERMISSIONS is now non-empty).
            const appTab = User.CATEGORY_PERMISSION_FIELDS[0].tabs.find(t => t.label === 'App');
            expect(appTab).toBeDefined();
            // Reverse map entry present.
            expect(User.GRANULAR_TO_CATEGORY['view_app_thing']).toBe('app_cat');

            // End-to-end gate check: holding the category satisfies the granular gate.
            const u = new User({ permissions: { app_cat: true } });
            expect(u.hasPermission('view_app_thing')).toBe(true);
        });

        it('accepts a partial spec — only the keys provided take effect', () => {
            const before = {
                appCats: User.APP_CATEGORY_PERMISSIONS.length,
                appGrans: User.APP_GRANULAR_PERMISSIONS.length,
                tabs: User.GRANULAR_PERMISSION_TABS.length
            };

            User.registerPermissions({
                categories: [{ name: 'app_cat', label: 'App Category' }]
            });

            expect(User.APP_CATEGORY_PERMISSIONS.length).toBe(before.appCats + 1);
            expect(User.APP_GRANULAR_PERMISSIONS.length).toBe(before.appGrans);
            expect(User.GRANULAR_PERMISSION_TABS.length).toBe(before.tabs);
        });

        it('is a no-op when called with null/undefined/empty', () => {
            const before = User.PERMISSIONS.map(p => p.name);
            User.registerPermissions(null);
            User.registerPermissions(undefined);
            User.registerPermissions({});
            expect(User.PERMISSIONS.map(p => p.name)).toEqual(before);
        });

        it('merges categoryGranularMap entries without dropping framework entries', () => {
            const beforeSecurity = User.CATEGORY_GRANULAR_MAP['security'].slice();
            User.registerPermissions({
                categoryGranularMap: { security: ['extra_security_perm'] }
            });
            for (const p of beforeSecurity) {
                expect(User.CATEGORY_GRANULAR_MAP['security']).toContain(p);
            }
            expect(User.GRANULAR_TO_CATEGORY['extra_security_perm']).toBe('security');
        });
    });
};
