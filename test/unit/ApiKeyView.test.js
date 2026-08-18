/**
 * ApiKeyView structure tests — ITEM-025.
 *
 * The view was rebuilt from a hand-rolled `View` (JSON <pre> permissions,
 * no × close, stray OK footer) into a DetailView matching the 13 sibling
 * admin detail views. These tests lock in:
 *   - ApiKeyView extends DetailView (header with × close renders).
 *   - Header: titleField name, activeField is_active, Edit/Delete kebab.
 *   - Permissions section wraps an autosaving FormView over the LIVE
 *     Member.PERMISSION_TABSET and a validated complete-policy JSON editor.
 *   - Section registry: Overview / Permissions / divider / Limits / Usage,
 *     with Permissions as the landing section.
 *   - Overview/limits computed fields guard corrupted (non-object) data.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach } = testContext;

    await testHelpers.setup();

    // Load primitives first so the loader satisfies ApiKeyView's deps.
    // ContextMenu must precede DetailView: the transformed DetailView module
    // captures `global.ContextMenu` at load time (header kebab).
    loadModule('View');
    loadModule('ContextMenu');
    const DetailView = loadModule('DetailView');
    loadModule('dataFormatter');
    const Member = loadModule('Member');
    loadModule('ApiKey');

    // Stub FormView — constructible, records options, renderable. The
    // Permissions section news one up in onInit.
    class FormViewStub {
        constructor(options = {}) {
            this.options = options;
            Object.assign(this, options);
            this.element = document.createElement('div');
            this.element.className = 'form-view-component';
        }
        async render() { return this; }
        async getFormData() { return { ...this.data }; }
        isMounted() { return false; }
        on() {} off() {}
    }
    global.FormView = FormViewStub;

    const ApiKeyView = loadModule('ApiKeyView');

    // ── Fixture model ─────────────────────────────────────────
    function makeApiKeyModel(attrs = {}) {
        const data = {
            id: 41,
            name: 'CI Deploy Key',
            group: { id: 7, name: 'NativeMojo Ops' },
            is_active: true,
            permissions: { manage_group: true, view_metrics: true, view_logs: true },
            limits: null,
            created: '2026-07-03T14:14:00Z',
            last_used: null,
            ...attrs
        };
        const handlers = new Map();
        const saveCalls = [];
        return {
            attributes: data,
            errors: {},
            saveCalls,
            get(k) { return data[k]; },
            set(k, v) {
                if (typeof k === 'object') Object.assign(data, k);
                else data[k] = v;
                handlers.get('change')?.forEach(fn => fn());
            },
            on(ev, fn) {
                if (!handlers.has(ev)) handlers.set(ev, []);
                handlers.get(ev).push(fn);
            },
            off(ev, fn) {
                const arr = handlers.get(ev) || [];
                const i = arr.indexOf(fn);
                if (i >= 0) arr.splice(i, 1);
            },
            toJSON() { return { ...data }; },
            async fetch() { return { success: true }; },
            async save(payload, options) {
                saveCalls.push({ payload, options });
                if (payload?.permissions) {
                    const next = { ...(data.permissions || {}) };
                    Object.entries(payload.permissions).forEach(([name, value]) => {
                        if (value) next[name] = value;
                        else delete next[name];
                    });
                    data.permissions = next;
                }
                return { success: true, status: 200, data: { status: true, data: { ...data } } };
            }
        };
    }

    describe('ApiKeyView (ITEM-025 DetailView migration)', () => {
        let view;
        let model;

        beforeEach(async () => {
            model = makeApiKeyModel();
            view = new ApiKeyView({ model });
            await view.render(false);
        });

        it('extends DetailView (not a hand-rolled View)', () => {
            expect(view).toBeInstanceOf(DetailView);
        });

        it('header renders its own × close (the old view had no close affordance)', () => {
            const close = view.element.querySelector('.dh-close');
            expect(close).toBeTruthy();
        });

        it('header drives is_active via the active switch, name via titleField', () => {
            expect(view.headerConfig.activeField).toBe('is_active');
            expect(view.headerConfig.titleField).toBe('name');
        });

        it('kebab keeps only Edit name / Delete (activate/deactivate absorbed by the switch)', () => {
            const actions = view.headerConfig.contextMenu.items
                .filter(i => i.action)
                .map(i => i.action);
            expect(actions).toEqual(['edit-key', 'delete-key']);
        });

        it('registers Overview / Permissions / divider / Rate Limits / Usage sections', () => {
            const keys = view.sectionsConfig.filter(s => s.key).map(s => s.key);
            expect(keys).toEqual(['Overview', 'Permissions', 'Limits', 'Usage']);
            expect(view.sectionsConfig.some(s => s.type === 'divider')).toBe(true);
        });

        it('lands on the Permissions section', () => {
            expect(view.initialActiveSection).toBe('Permissions');
        });

        it('Permissions section wraps an autosaving FormView over the LIVE Member tabset', () => {
            const fv = view.permissionsSection.formView;
            expect(fv).toBeInstanceOf(FormViewStub);
            expect(fv.options.autosaveModelField).toBe(true);
            expect(fv.options.model).toBe(model);
            // The wrapper is now ApiKey's own — it appends a Federation tab
            // that must never reach the Member editor — but the member tabs
            // inside it are the live objects Member.rebuildPermissions()
            // maintains, so app-registered permissions still appear for API
            // keys automatically.
            const tabs = fv.options.fields[0].tabs;
            expect(tabs[0]).toBe(Member.PERMISSION_TABSET[0].tabs[0]);
            expect(tabs.map(t => t.label)).toContain('Federation');
        });

        it('Permissions section disables the federation switch without grant rights', () => {
            // The stub view resolves no active user, so checkPermissions() fails
            // closed — the geoip_sync toggle must render disabled rather than
            // inviting a guaranteed 403.
            const tabs = view.permissionsSection.formView.options.fields[0].tabs;
            const fed = tabs.find(t => t.label === 'Federation');
            const field = fed.fields.find(f => f.name === 'permissions.geoip_sync');
            expect(field.disabled).toBe(true);
        });

        it('Permissions section includes an explicit raw JSON policy editor', () => {
            const section = view.permissionsSection;
            expect(section.rawFormView).toBeInstanceOf(FormViewStub);
            expect(section.rawFormView.options.model).toBe(model);

            const field = section.rawFormView.options.fields
                .find(f => f.name === 'permissions');
            expect(field).toBeDefined();
            expect(field.type).toBe('json');
            expect(field.label).toBe('Permissions policy (JSON)');
        });

        it('raw JSON save treats the document as complete and supports uncatalogued permissions', async () => {
            const section = view.permissionsSection;
            section.rawFormView.getFormData = async () => ({
                permissions: {
                    send_sms: true,
                    future_provider_permission: true
                }
            });

            await section.onActionSaveJsonPolicy();

            expect(model.saveCalls).toHaveLength(1);
            expect(model.saveCalls[0]).toEqual({
                payload: {
                    permissions: {
                        send_sms: true,
                        future_provider_permission: true,
                        manage_group: false,
                        view_metrics: false,
                        view_logs: false
                    }
                },
                options: { skipRender: true }
            });
            expect(model.get('permissions')).toEqual({
                send_sms: true,
                future_provider_permission: true
            });
        });

        it('overview computes group label and "never" for unused keys', () => {
            expect(view.overviewSection.groupLabel).toBe('NativeMojo Ops');
            expect(view.overviewSection.lastUsedLabel).toBe('never');
        });

        it('limits section reports no overrides for null/empty limits', () => {
            expect(view.limitsSection.hasLimits).toBe(false);
        });

        it('corrupted string permissions do not break the header perms chip', () => {
            const corrupted = makeApiKeyModel({ permissions: '[object Object]' });
            const v = new ApiKeyView({ model: corrupted });
            // The "N perms granted" chip must simply not render (countTruthy
            // guards non-objects) — resolving chips must not throw.
            const chips = v.headerConfig.chips;
            const permChip = chips.find(c => !c.icon);
            expect(permChip.when(corrupted)).toBe(false);
            expect(permChip.text(corrupted)).toBeNull();
        });
    });
};
