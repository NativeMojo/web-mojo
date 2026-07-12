/**
 * MemberView structure tests.
 *
 * Locks in two enhancements over the base DetailView-migrated MemberView:
 *   - The "Audit" section gate mirrors the server LogList VIEW_PERMS
 *     [manage_logs, view_logs, security, admin] instead of a bare
 *     'view_logs' (a `security`/`manage_logs`-only operator keeps the tab).
 *   - An "Edit membership" kebab action edits metadata.role via
 *     showModelForm — role only (is_active is the header switch per ITEM-025,
 *     Display Name is a User field owned by UserView).
 *
 * Construction-only (no render): assertions read constructor state
 * (headerConfig / sectionsConfig / auditSection) or drive the action handler
 * directly, so the onInit section children never mount.
 *
 * TableView + LogList are new'd in the constructor, so constructible stubs are
 * captured on `global` BEFORE loadModule, then deleted (the transformed module
 * keeps its own captured references) so they cannot leak into later files.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach } = testContext;

    await testHelpers.setup();

    // ContextMenu must precede DetailView (the transformed DetailView module
    // captures global.ContextMenu at load time for the header kebab).
    loadModule('View');
    loadModule('ContextMenu');
    const DetailView = loadModule('DetailView');
    loadModule('dataFormatter');
    loadModule('Member');

    class TableViewStub {
        constructor(options = {}) { this.options = options; Object.assign(this, options); }
        async render() { return this; }
        on() {} off() {}
    }
    class LogListStub {
        constructor(options = {}) { this.options = options; this.models = []; }
        on() {} off() {}
        async fetch() { return { success: true }; }
    }
    global.TableView = TableViewStub;
    global.LogList = LogListStub;
    const MemberView = loadModule('MemberView');
    // Do not leak these into later test files — MemberView captured them above.
    delete global.TableView;
    delete global.LogList;

    const AUDIT_PERMS = ['manage_logs', 'view_logs', 'security', 'admin'];

    // ── Fixture model ─────────────────────────────────────────
    function makeMemberModel(attrs = {}) {
        const data = {
            id: 88,
            user: { id: 12, display_name: 'Jamie Turner', email: 'jamie@foraylabs.net', username: 'jamie' },
            group: { id: 7, name: 'Losers Revenge', kind: 'org' },
            metadata: { role: 'Analyst' },
            is_active: true,
            created: '2026-05-30T18:27:48Z',
            permissions: { view_metrics: true },
            ...attrs
        };
        return {
            attributes: data,
            get(k) { return data[k]; },
            set(k, v) { if (typeof k === 'object') Object.assign(data, k); else data[k] = v; },
            toJSON() { return { ...data }; },
            async fetch() { return { success: true }; },
            async save() { return { success: true, status: 200 }; }
        };
    }

    describe('MemberView enhancements', () => {
        let view;
        let model;

        beforeEach(() => {
            model = makeMemberModel();
            view = new MemberView({ model });
        });

        it('extends DetailView', () => {
            expect(view).toBeInstanceOf(DetailView);
        });

        it('kebab adds "Edit membership" ahead of the existing actions', () => {
            const actions = view.headerConfig.contextMenu.items
                .filter(i => i.action)
                .map(i => i.action);
            expect(actions).toEqual(['edit-membership', 'view-user', 'view-group', 'view-audit', 'remove-from-group']);
        });

        it('Audit SECTION gate mirrors the server LogList VIEW_PERMS (not bare view_logs)', () => {
            const audit = view.sectionsConfig.find(s => s.key === 'Audit');
            expect(audit.permissions).toEqual(AUDIT_PERMS);
        });

        it('Audit TableView gate is widened in sync with the section descriptor', () => {
            expect(view.auditSection.options.permissions).toEqual(AUDIT_PERMS);
        });

        it('Edit membership edits metadata.role only — no is_active / display_name field', async () => {
            let captured = null;
            view.getApp = () => ({ showModelForm: async (opts) => { captured = opts; return true; } });
            view.headerView = { render: async () => {} };

            const ret = await view.onActionEditMembership();

            expect(ret).toBe(true);
            expect(captured.title).toBe('Edit membership');
            expect(captured.model).toBe(model);
            const fieldNames = captured.formConfig.fields.map(f => f.name);
            expect(fieldNames).toEqual(['metadata.role']);
        });

        it('Edit membership refreshes the header only on a successful save', async () => {
            let headerRenders = 0;
            view.headerView = { render: async () => { headerRenders += 1; } };

            view.getApp = () => ({ showModelForm: async () => null });
            await view.onActionEditMembership();
            expect(headerRenders).toBe(0);

            view.getApp = () => ({ showModelForm: async () => true });
            await view.onActionEditMembership();
            expect(headerRenders).toBe(1);
        });
    });
};
