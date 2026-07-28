import { Page, TableView, Collection, Model } from 'web-mojo';

/**
 * TableViewInlineEditExample — click-to-edit cells (`column.editable`).
 *
 * Doc:    docs/web-mojo/components/TableView.md#inline-cell-editing
 * Route:  components/table-view/inline-edit
 *
 * Demonstrates:
 *   1. All four editor shapes — `editableOptions.type` of `text`, `textarea`,
 *      `select` and `switch`, plus `placeholder`, `inputType`, `rows` and
 *      `options`.
 *   2. Auto-save: select/switch editors commit on `change`. The Active column
 *      opts out with `autoSave: false`, so it needs the ✓ button.
 *   3. All four `cell:*` events, listened for once on the TABLE (each is
 *      emitted on the TableRow and forwarded by TableView).
 *   4. The failure branch — Email rejects anything that isn't an address, so
 *      the editor stays open, flashes `.saving-error`, and `cell:save:error`
 *      fires. Try `not-an-email` in the Email column.
 *
 * The fake Model saves in memory. Note it passes `skipRender: true` — the row
 * already updates its own cell in place, and a rerender mid-save would tear
 * the open editor out from under the save handler.
 */
const ROLES = ['admin', 'member', 'viewer'];

const SEED_STAFF = [
    { id: 1, name: 'Alice Adams',  email: 'alice@example.com', role: 'admin',  notes: 'On call this week.',            is_active: true },
    { id: 2, name: 'Ben Bryant',   email: 'ben@example.com',   role: 'member', notes: '',                              is_active: true },
    { id: 3, name: 'Carla Cruz',   email: 'carla@example.com', role: 'viewer', notes: 'Contractor — read-only.',       is_active: false },
    { id: 4, name: 'Dan Dietrich', email: 'dan@example.com',   role: 'member', notes: 'Timezone CET.',                 is_active: true },
    { id: 5, name: 'Eve Estrada',  email: 'eve@example.com',   role: 'admin',  notes: 'Owns the billing integration.', is_active: true },
];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

/**
 * In-memory Model standing in for a REST-backed one. It answers in the same
 * shape the real `Model.save()` does, which is the point worth copying: a
 * failed save is reported by RESOLVING with `success: false` (or by leaving
 * `model.errors` populated), not by throwing. TableRow inspects the resolved
 * response as well as catching rejections, so either reaches
 * `cell:save:error`.
 */
class FakeStaffModel extends Model {
    async save(data) {
        await new Promise((r) => { setTimeout(r, 250); });

        if ('email' in data && !EMAIL_RE.test(String(data.email))) {
            // Exactly what a server-side validation failure looks like coming
            // back through Model.save(): resolved, success:true at the
            // transport level, rejected in the body.
            this.errors = { status: false, error: `"${data.email}" is not a valid email address` };
            return { success: true, data: this.errors };
        }

        this.errors = {};
        // `skipRender` keeps the automatic row rerender from firing: the cell
        // is repainted in place by TableRow once this resolves.
        this.set(data, null, { skipRender: true });
        return { success: true, data: { status: true, data: this.attributes } };
    }
}

class TableViewInlineEditExample extends Page {
    static pageName = 'components/table-view/inline-edit';
    static route = 'components/table-view/inline-edit';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TableViewInlineEditExample.pageName,
            route: TableViewInlineEditExample.route,
            title: 'TableView — inline cell editing',
            template: TableViewInlineEditExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        this.table = new TableView({
            containerId: 'table-slot',
            collection: new Collection({
                ModelClass: FakeStaffModel,
                data: SEED_STAFF,
                size: 25,
            }),
            title: 'Team',
            eyebrow: 'Click any cell to edit',
            columns: [
                {
                    key: 'name', label: 'Name', editable: true,
                    editableOptions: { type: 'text', placeholder: 'Full name' },
                },
                {
                    key: 'email', label: 'Email', editable: true,
                    editableOptions: { type: 'text', inputType: 'email', placeholder: 'name@example.com' },
                },
                {
                    // HTML formatters work on editable columns: the post-save
                    // repaint goes through the same branch logic as the initial
                    // render, so this badge survives an inline edit instead of
                    // showing as literal markup.
                    key: 'role', label: 'Role', editable: true,
                    formatter: 'badge:admin=danger,member=primary,viewer=secondary',
                    editableOptions: { type: 'select', options: ROLES },
                },
                {
                    key: 'notes', label: 'Notes', editable: true, visibility: 'md',
                    editableOptions: { type: 'textarea', rows: 3, placeholder: 'Anything worth knowing' },
                },
                {
                    key: 'is_active', label: 'Active', editable: true,
                    autoSave: false,                       // ← require the ✓ button
                    formatter: 'yesno',
                    editableOptions: { type: 'switch' },
                },
            ],
            searchable: false,
            filterable: false,
            paginated: false,
            showAdd: false,
            showExport: false,
            showFullscreen: false,
            tableOptions: { hover: true, size: 'sm' },
        });
        this.addChild(this.table);

        // One listener per event, on the table — no per-row wiring.
        this.table.on('cell:edit', ({ column, originalValue }) => this.log('cell:edit', 'secondary', `${column} = ${originalValue}`));
        this.table.on('cell:save', ({ column, oldValue, newValue }) => this.log('cell:save', 'success', `${column}: ${oldValue} → ${newValue}`));
        this.table.on('cell:cancel', ({ column }) => this.log('cell:cancel', 'secondary', column));
        this.table.on('cell:save:error', ({ column, error }) => this.log('cell:save:error', 'danger', `${column} — ${error.message}`));
    }

    /**
     * Prepend a line to the event log. Written straight into the DOM rather
     * than through `render()`: re-rendering the page mid-edit would destroy
     * the very editor that emitted the event.
     */
    log(event, tone, detail) {
        const el = this.element?.querySelector('[data-log]');
        if (!el) return;
        const time = new Date().toLocaleTimeString();
        el.insertAdjacentHTML('afterbegin', `
            <div class="d-flex gap-2 align-items-baseline py-1 border-bottom">
                <span class="badge text-bg-${tone}">${this.escapeHtml(event)}</span>
                <code class="small flex-grow-1">${this.escapeHtml(detail)}</code>
                <small class="text-muted">${this.escapeHtml(time)}</small>
            </div>
        `);
    }

    onActionClearLog(event) {
        event.preventDefault();
        const el = this.element?.querySelector('[data-log]');
        if (el) el.innerHTML = '';
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView — inline cell editing</h1>
            <p class="example-summary">
                <code>editable: true</code> turns a column into click-to-edit cells.
                <code>editableOptions.type</code> picks the editor —
                <code>text</code>, <code>textarea</code>, <code>select</code>,
                <code>switch</code>/<code>checkbox</code>. Saving goes through
                <code>model.save({ field: value })</code>; the four
                <code>cell:*</code> events are emitted on the row and forwarded
                by the table.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/TableView.md#inline-cell-editing">
                    docs/web-mojo/components/TableView.md#inline-cell-editing
                </a>
            </p>

            <div class="alert alert-info d-flex gap-2 align-items-start">
                <i class="bi bi-lightbulb mt-1"></i>
                <div>
                    <strong>Try it.</strong> Click a cell, then <kbd>Enter</kbd> to save or
                    <kbd>Esc</kbd> to cancel. <strong>Role</strong> auto-saves the moment you
                    pick a value; <strong>Active</strong> sets <code>autoSave: false</code>, so
                    it waits for the ✓. Type <code>not-an-email</code> into
                    <strong>Email</strong> to see the rejected-save branch — the editor stays
                    open and turns red.
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-body">
                    <div data-container="table-slot"></div>
                </div>
            </div>

            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-activity me-1"></i> <code>cell:*</code> event log</span>
                    <button class="btn btn-sm btn-outline-secondary" data-action="clear-log">Clear</button>
                </div>
                <div class="card-body py-1" style="max-height: 15rem; overflow-y: auto;">
                    <div data-log>
                        <p class="text-secondary small mb-0 py-2">Nothing yet — edit a cell above.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default TableViewInlineEditExample;
