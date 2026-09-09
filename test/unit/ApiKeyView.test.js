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
 *   - Rate limits render and mutate through the structured, fail-closed editor.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach } = testContext;

    await testHelpers.setup();
    const jest = global.jest;

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

    // ApiKeyView captures static Modal.form/confirm at module load time.
    const ModalStub = {
        form: jest.fn(),
        confirm: jest.fn()
    };
    global.Modal = ModalStub;

    const ApiKeyView = loadModule('ApiKeyView');
    delete global.FormView;
    delete global.Modal;

    // ── Fixture model ─────────────────────────────────────────
    function makeApiKeyModel(attrs = {}) {
        const data = {
            id: 41,
            name: 'CI Deploy Key',
            group: { id: 7, name: 'NativeMojo Ops' },
            is_active: true,
            permissions: { manage_group: true, view_metrics: true, view_logs: true },
            limits: {},
            created: '2026-07-03T14:14:00Z',
            last_used: null,
            ...attrs
        };
        const handlers = new Map();
        const saveCalls = [];
        const fetchCalls = [];
        return {
            attributes: data,
            errors: {},
            saveCalls,
            fetchCalls,
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
            async fetch() {
                fetchCalls.push({});
                return { success: true, data: { status: true, data: { ...data } } };
            },
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
                if (payload?.limits) {
                    const next = data.limits && typeof data.limits === 'object'
                        && !Array.isArray(data.limits) ? { ...data.limits } : {};
                    Object.entries(payload.limits).forEach(([key, value]) => {
                        if (value === null) delete next[key];
                        else next[key] = value;
                    });
                    data.limits = next;
                }
                return { success: true, status: 200, data: { status: true, data: { ...data } } };
            }
        };
    }

    describe('ApiKeyView (ITEM-025 DetailView migration)', () => {
        let view;
        let model;

        beforeEach(async () => {
            ModalStub.form.mockReset();
            ModalStub.confirm.mockReset();
            model = makeApiKeyModel();
            view = new ApiKeyView({ model });
            await view.render(false);
            await view.limitsSection.render(false);
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

        it('Permissions section exposes uncatalogued grants as removable tags', async () => {
            model = makeApiKeyModel({
                permissions: {
                    view_logs: true,
                    legacy_custom: true,
                    remove_me: true
                }
            });
            view = new ApiKeyView({ model });
            await view.render(false);

            const custom = view.permissionsSection.customFormView;
            expect(custom).toBeInstanceOf(FormViewStub);
            expect(custom.options.fields[0].type).toBe('tags');
            expect(custom.data.custom_permissions).toBe('legacy_custom,remove_me');
        });

        it('freeform permission save adds and removes only uncatalogued grants', async () => {
            model = makeApiKeyModel({
                permissions: {
                    view_logs: true,
                    legacy_custom: true,
                    remove_me: true
                }
            });
            view = new ApiKeyView({ model });
            await view.render(false);
            const section = view.permissionsSection;
            section.customFormView.getFormData = async () => ({
                custom_permissions: 'legacy_custom,new_custom'
            });

            await section.onActionSaveCustomPermissions();

            expect(model.saveCalls).toHaveLength(1);
            expect(model.saveCalls[0]).toEqual({
                payload: {
                    permissions: {
                        new_custom: true,
                        remove_me: false
                    }
                },
                options: { skipRender: true }
            });
            expect(model.get('permissions')).toEqual({
                view_logs: true,
                legacy_custom: true,
                new_custom: true
            });
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

        it('limits section renders the exact safe empty state and boundary explanation', () => {
            const text = view.limitsSection.element.textContent.replace(/\s+/g, ' ').trim();
            expect(text).toContain('Unlimited (default)');
            expect(text).toContain('No per-key hard overrides are configured.');
            expect(text).toContain('Strict endpoint limits');
            expect(text).toContain('positive decorator fallbacks');
            expect(text).toContain('enabled deployment ceilings');
        });

        it('sorts configured rows and labels limit windows in minutes', async () => {
            model = makeApiKeyModel({
                limits: {
                    zeta: { limit: 10, window: 30 },
                    alpha: { limit: 200, window: 1 }
                }
            });
            view = new ApiKeyView({ model });
            await view.render(false);
            await view.limitsSection.render(false);

            const keys = Array.from(view.limitsSection.element.querySelectorAll('tbody code'))
                .map(el => el.textContent);
            expect(keys).toEqual(['alpha', 'zeta']);
            expect(view.limitsSection.element.textContent).toContain('Window (minutes)');
        });

        it('shows malformed top-level and nested data without claiming unlimited', async () => {
            model = makeApiKeyModel({ limits: null });
            view = new ApiKeyView({ model });
            await view.render(false);
            await view.limitsSection.render(false);
            expect(view.limitsSection.element.textContent).toContain('Stored rate limits are malformed');
            expect(view.limitsSection.element.textContent).not.toContain('Unlimited (default)');

            model = makeApiKeyModel({
                limits: {
                    missing_window: { limit: 5 },
                    scalar: 'broken',
                    zero: { limit: 0, window: 1 }
                }
            });
            view = new ApiKeyView({ model });
            await view.render(false);
            await view.limitsSection.render(false);
            expect(view.limitsSection.element.querySelectorAll('tbody code')).toHaveLength(3);
            expect(view.limitsSection.element.textContent).toContain('Invalid stored override');
            expect(view.limitsSection.element.textContent)
                .toContain('The server uses the endpoint decorator default');
            expect(view.limitsSection.element.textContent).not.toContain('Unlimited (default)');
        });

        it('renders reserved __replace as invalid read-only data with honest repair copy', async () => {
            model = makeApiKeyModel({
                limits: { __replace: { limit: 5, window: 1 } }
            });
            view = new ApiKeyView({ model });
            view.limitsSection.checkPermissions = () => true;
            await view.limitsSection.render(false);

            expect(view.limitsSection.element.textContent).toContain('Reserved __replace data');
            expect(view.limitsSection.element.textContent).toContain('Repair the full stored value outside this editor.');
            expect(view.limitsSection.element.querySelector('[data-action="edit-limit"]')).toBeNull();
            expect(view.limitsSection.element.querySelector('[data-action="remove-limit"]')).toBeNull();
        });

        it('fails closed when no active user can authorize limit mutations', () => {
            const section = view.limitsSection;
            expect(section.canEditLimits).toBe(false);
            expect(section.element.querySelector('[data-action="add-limit"]')).toBeNull();
            expect(section.element.querySelector('[data-action="edit-limit"]')).toBeNull();
            expect(section.element.querySelector('[data-action="remove-limit"]')).toBeNull();
        });

        it('adds an override with the exact sparse payload and skipRender option', async () => {
            const section = view.limitsSection;
            section.checkPermissions = permissions => permissions.join(',')
                === 'manage_group,manage_groups,groups';
            ModalStub.form.mockResolvedValue({ key: 'orders', limit: '500', window: '5' });

            await section.onActionAddLimit();

            expect(ModalStub.form).toHaveBeenCalledTimes(1);
            const fields = ModalStub.form.mock.calls[0][0].fields;
            expect(fields.map(field => field.name)).toEqual(['key', 'limit', 'window']);
            expect(fields[1].min).toBe(1);
            expect(fields[1].step).toBe(1);
            expect(fields[1].max).toBeUndefined();
            expect(fields[2].label).toBe('Window (minutes)');
            expect(model.saveCalls).toEqual([{
                payload: { limits: { orders: { limit: 500, window: 5 } } },
                options: { skipRender: true }
            }]);
            expect(model.get('limits')).toEqual({ orders: { limit: 500, window: 5 } });
        });

        it('edits an override with an immutable key and exact sparse payload', async () => {
            model = makeApiKeyModel({ limits: { orders: { limit: 10, window: 1 } } });
            view = new ApiKeyView({ model });
            const section = view.limitsSection;
            section.checkPermissions = () => true;
            ModalStub.form.mockResolvedValue({ key: 'renamed', limit: 20, window: 3 });

            await section.onActionEditLimit(null, { dataset: { key: 'orders' } });

            const fields = ModalStub.form.mock.calls[0][0].fields;
            expect(fields[0].name).toBe('key');
            expect(fields[0].disabled).toBe(true);
            expect(ModalStub.form.mock.calls[0][0].data.key).toBe('orders');
            expect(model.saveCalls).toEqual([{
                payload: { limits: { orders: { limit: 20, window: 3 } } },
                options: { skipRender: true }
            }]);
            expect(model.get('limits')).toEqual({ orders: { limit: 20, window: 3 } });
        });

        it('removes one override with a null tombstone while preserving siblings', async () => {
            model = makeApiKeyModel({
                limits: {
                    orders: { limit: 10, window: 1 },
                    reports: { limit: 2, window: 60 }
                }
            });
            view = new ApiKeyView({ model });
            const section = view.limitsSection;
            section.checkPermissions = () => true;
            ModalStub.confirm.mockResolvedValue(true);

            await section.onActionRemoveLimit(null, { dataset: { key: 'orders' } });

            expect(model.saveCalls).toEqual([{
                payload: { limits: { orders: null } },
                options: { skipRender: true }
            }]);
            expect(model.get('limits')).toEqual({ reports: { limit: 2, window: 60 } });
        });

        it('returns to Unlimited (default) after removing the last override', async () => {
            model = makeApiKeyModel({ limits: { orders: { limit: 10, window: 1 } } });
            view = new ApiKeyView({ model });
            const section = view.limitsSection;
            section.checkPermissions = () => true;
            ModalStub.confirm.mockResolvedValue(true);

            await section.onActionRemoveLimit(null, { dataset: { key: 'orders' } });

            expect(model.get('limits')).toEqual({});
            expect(section.element.textContent).toContain('Unlimited (default)');
        });

        it('rejects blank, reserved, duplicate, and non-positive/non-integer inputs without saving', async () => {
            model = makeApiKeyModel({ limits: { orders: { limit: 10, window: 1 } } });
            view = new ApiKeyView({ model });
            const section = view.limitsSection;
            section.checkPermissions = () => true;
            await section.render(false);
            const invalid = [
                { key: ' ', limit: 1, window: 1 },
                { key: '__replace', limit: 1, window: 1 },
                { key: 'orders', limit: 1, window: 1 },
                { key: 'zero-limit', limit: 0, window: 1 },
                { key: 'decimal-limit', limit: 1.5, window: 1 },
                { key: 'zero-window', limit: 1, window: 0 },
                { key: 'decimal-window', limit: 1, window: 1.5 }
            ];

            for (const data of invalid) {
                ModalStub.form.mockResolvedValueOnce(data);
                await section.onActionAddLimit();
            }

            expect(model.saveCalls).toHaveLength(0);
            expect(section.element.querySelector('.api-key-limits-status').className)
                .toContain('text-danger');
        });

        it('repaints only the limits section after a confirmed successful save', async () => {
            const section = view.limitsSection;
            section.checkPermissions = () => true;
            section.render = jest.fn().mockResolvedValue(section);
            ModalStub.form.mockResolvedValue({ key: 'orders', limit: 10, window: 1 });

            await section.onActionAddLimit();

            expect(section.render).toHaveBeenCalledTimes(1);
            expect(section.render).toHaveBeenCalledWith(false);
        });

        it('fetches authoritative limits before repainting when a success response lacks them', async () => {
            const section = view.limitsSection;
            section.checkPermissions = () => true;
            section.render = jest.fn().mockResolvedValue(section);
            model.save = async (payload, options) => {
                model.saveCalls.push({ payload, options });
                model.attributes.limits = { orders: { limit: 10, window: 1 } };
                return { success: true, data: { status: true, data: { id: 41 } } };
            };
            ModalStub.form.mockResolvedValue({ key: 'orders', limit: 10, window: 1 });

            await section.onActionAddLimit();

            expect(model.fetchCalls).toHaveLength(1);
            expect(section.render).toHaveBeenCalledTimes(1);
        });

        it('preserves rows and skips repaint on resolved transport failure', async () => {
            model = makeApiKeyModel({ limits: { orders: { limit: 10, window: 1 } } });
            view = new ApiKeyView({ model });
            const section = view.limitsSection;
            section.checkPermissions = () => true;
            await section.render(false);
            section.render = jest.fn().mockResolvedValue(section);
            const toast = { error: jest.fn() };
            section.getApp = () => ({ toast });
            model.save = async () => ({ success: false, error: 'offline' });
            ModalStub.form.mockResolvedValue({ limit: 20, window: 2 });

            await section.onActionEditLimit(null, { dataset: { key: 'orders' } });

            expect(model.get('limits')).toEqual({ orders: { limit: 10, window: 1 } });
            expect(section.render).toHaveBeenCalledTimes(0);
            expect(section.element.querySelector('.api-key-limits-status').textContent).toBe('offline');
            expect(toast.error).toHaveBeenCalledWith('offline');
        });

        it('preserves rows on status-false and model.errors resolved failures', async () => {
            model = makeApiKeyModel({ limits: { orders: { limit: 10, window: 1 } } });
            view = new ApiKeyView({ model });
            const section = view.limitsSection;
            section.checkPermissions = () => true;
            await section.render(false);
            section.render = jest.fn().mockResolvedValue(section);
            ModalStub.form.mockResolvedValue({ limit: 20, window: 2 });
            model.save = async () => ({
                success: true,
                data: { status: false, error: 'not allowed' }
            });

            await section.onActionEditLimit(null, { dataset: { key: 'orders' } });
            expect(section.render).toHaveBeenCalledTimes(0);
            expect(model.get('limits')).toEqual({ orders: { limit: 10, window: 1 } });

            model.errors = { limits: 'invalid' };
            model.save = async () => ({
                success: true,
                data: { status: true, data: { ...model.attributes } }
            });
            await section.onActionEditLimit(null, { dataset: { key: 'orders' } });
            expect(section.render).toHaveBeenCalledTimes(0);
            expect(model.get('limits')).toEqual({ orders: { limit: 10, window: 1 } });
        });

        it('preserves rows and skips repaint on a rejected save promise', async () => {
            model = makeApiKeyModel({ limits: { orders: { limit: 10, window: 1 } } });
            view = new ApiKeyView({ model });
            const section = view.limitsSection;
            section.checkPermissions = () => true;
            await section.render(false);
            section.render = jest.fn().mockResolvedValue(section);
            model.save = async () => { throw new Error('network rejected'); };
            ModalStub.form.mockResolvedValue({ limit: 20, window: 2 });

            await section.onActionEditLimit(null, { dataset: { key: 'orders' } });

            expect(section.render).toHaveBeenCalledTimes(0);
            expect(model.get('limits')).toEqual({ orders: { limit: 10, window: 1 } });
            expect(section.element.querySelector('.api-key-limits-status').textContent)
                .toBe('network rejected');
        });

        it('escapes hostile legacy keys in visible text and data attributes', async () => {
            const hostile = '\"><img id="limit-injection" src=x onerror=alert(1)>';
            model = makeApiKeyModel({ limits: { [hostile]: { limit: 10, window: 1 } } });
            view = new ApiKeyView({ model });
            view.limitsSection.checkPermissions = () => true;
            await view.limitsSection.render(false);

            const code = view.limitsSection.element.querySelector('tbody code');
            const edit = view.limitsSection.element.querySelector('[data-action="edit-limit"]');
            expect(code.textContent).toBe(hostile);
            expect(edit.dataset.key).toBe(hostile);
            expect(view.limitsSection.element.querySelector('#limit-injection')).toBeNull();
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
