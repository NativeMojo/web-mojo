import { Page, TableView, Collection } from 'web-mojo';

/**
 * TableViewContextMenuExample — the per-row kebab menu.
 *
 * Doc:    docs/web-mojo/components/TableView.md#context-menus
 * Route:  components/table-view/context-menu
 *
 * Demonstrates:
 *   1. `contextMenu` — string `action` (dispatched as `data-action`, surfacing
 *      as `item:click`) vs callback `action(model, app)`.
 *   2. `divider` / `separator`, `danger`, `disabled`.
 *   3. `visible(model)` — a per-row predicate; "Retry deploy" only appears on
 *      failed rows.
 *   4. `permissions` — a fail-closed gate through `View#checkPermissions()` →
 *      `app.activeUser.hasPermission()`. NOTE: this portal stubs
 *      `activeUser.hasPermission = () => true` (`examples/portal/app.js`), so
 *      the gated item DOES render here. In a real app it is hidden whenever
 *      there is no active user or the user holds none of the listed
 *      permissions.
 *   5. `rowContextMenu` — accepted alias for `contextMenu` (second table).
 *      Its items are all `visible`-gated, so archived rows render no kebab
 *      toggle at all rather than an empty dropdown.
 */
const SEED_DEPLOYS = [
    { id: 101, service: 'checkout-api',  env: 'prod',    status: 'live',     version: '4.12.0', by: 'alice' },
    { id: 102, service: 'checkout-api',  env: 'staging', status: 'failed',   version: '4.13.0', by: 'ben' },
    { id: 103, service: 'billing-jobs',  env: 'prod',    status: 'live',     version: '2.4.1',  by: 'carla' },
    { id: 104, service: 'web-frontend',  env: 'staging', status: 'failed',   version: '9.0.3',  by: 'dan' },
    { id: 105, service: 'notifications', env: 'prod',    status: 'live',     version: '1.8.7',  by: 'eve' },
];

const SEED_REPORTS = [
    { id: 1, name: 'Weekly revenue',   owner: 'alice', status: 'ready' },
    { id: 2, name: 'Churn cohort',     owner: 'ben',   status: 'ready' },
    { id: 3, name: 'Q1 board deck',    owner: 'carla', status: 'archived' },
    { id: 4, name: 'Signup funnel',    owner: 'dan',   status: 'archived' },
];

const COLUMNS = [
    { key: 'service', label: 'Service', sortable: true },
    { key: 'env', label: 'Env', formatter: 'badge:prod=danger,staging=secondary' },
    { key: 'version', label: 'Version', visibility: 'md' },
    { key: 'status', label: 'Status', formatter: 'badge:live=success,failed=danger' },
    { key: 'by', label: 'By', visibility: 'lg' },
];

class TableViewContextMenuExample extends Page {
    static pageName = 'components/table-view/context-menu';
    static route = 'components/table-view/context-menu';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TableViewContextMenuExample.pageName,
            route: TableViewContextMenuExample.route,
            title: 'TableView — context menus',
            template: TableViewContextMenuExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        this.deployTable = new TableView({
            containerId: 'deploys-slot',
            collection: new Collection(SEED_DEPLOYS),
            title: 'Deployments',
            columns: COLUMNS,
            searchable: false,
            filterable: false,
            paginated: false,
            showAdd: false,
            showExport: false,
            showFullscreen: false,
            clickAction: 'none',          // rows inert — the kebab is the only affordance
            tableOptions: { hover: true, size: 'sm' },
            contextMenu: [
                // String action → dispatched as `data-action="inspect"`, which
                // surfaces as `item:click` with `action: 'inspect'`.
                { action: 'inspect', label: 'Inspect', icon: 'bi bi-eye' },

                // Callback action → invoked with (model, app).
                {
                    label: 'Copy version',
                    icon: 'bi bi-clipboard',
                    action: (model, app) => {
                        this.note(`copied ${model.get('version')}`);
                        app?.toast?.info?.(`Copied ${model.get('version')}`);
                    },
                },

                // Per-row predicate — only failed deploys can be retried.
                {
                    label: 'Retry deploy',
                    icon: 'bi bi-arrow-repeat',
                    visible: (model) => model.get('status') === 'failed',
                    action: (model) => this.note(`retrying ${model.get('service')}`),
                },

                // Permission gate — any-of, fail-closed. Renders here only
                // because the portal stubs hasPermission() to always pass.
                {
                    label: 'Promote to prod',
                    icon: 'bi bi-rocket-takeoff',
                    permissions: ['manage_deploys', 'admin'],
                    action: (model) => this.note(`promoting ${model.get('service')}`),
                },

                { label: 'Rollback (locked)', icon: 'bi bi-lock', disabled: true, action: 'rollback' },
                { divider: true },
                { action: 'archive', label: 'Archive', icon: 'bi bi-archive', danger: true },
            ],
        });
        this.addChild(this.deployTable);

        // String actions arrive as `item:click`, on the row and on the table.
        this.deployTable.on('item:click', ({ action, model }) => {
            if (!action || action === 'row-click') return;
            this.note(`item:click → ${action} on #${model.get('id')}`);
        });

        this.reportTable = new TableView({
            containerId: 'reports-slot',
            collection: new Collection(SEED_REPORTS),
            title: 'Reports',
            eyebrow: 'rowContextMenu alias',
            columns: [
                { key: 'name', label: 'Report' },
                { key: 'owner', label: 'Owner', visibility: 'md' },
                { key: 'status', label: 'Status', formatter: 'badge:ready=success,archived=secondary' },
            ],
            searchable: false,
            filterable: false,
            paginated: false,
            showAdd: false,
            showExport: false,
            showFullscreen: false,
            clickAction: 'none',
            tableOptions: { hover: true, size: 'sm' },
            // Same option, different key. Explicit `contextMenu` would win if
            // both were passed.
            rowContextMenu: [
                {
                    label: 'Run now',
                    icon: 'bi bi-play',
                    visible: (model) => model.get('status') !== 'archived',
                    action: (model) => this.note(`running "${model.get('name')}"`),
                },
                {
                    label: 'Share',
                    icon: 'bi bi-share',
                    visible: (model) => model.get('status') !== 'archived',
                    action: (model) => this.note(`sharing "${model.get('name')}"`),
                },
            ],
        });
        this.addChild(this.reportTable);
    }

    /**
     * Append to the activity line. Written straight into the DOM — calling
     * `render()` from a menu handler would tear down the row whose dropdown
     * is still open.
     */
    note(text) {
        const el = this.element?.querySelector('[data-note]');
        if (el) el.textContent = text;
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView — context menus</h1>
            <p class="example-summary">
                <code>contextMenu</code> adds a kebab (⋮) column with a per-row dropdown.
                Items take a string <code>action</code> (framework dispatch) or a callback
                <code>action(model, app)</code>, and can be gated per row with
                <code>visible(model)</code> or per user with <code>permissions</code>.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/TableView.md#context-menus">
                    docs/web-mojo/components/TableView.md#context-menus
                </a>
            </p>

            <div class="alert alert-warning d-flex gap-2 align-items-start">
                <i class="bi bi-shield-lock mt-1"></i>
                <div>
                    <strong>Why is "Promote to prod" visible here?</strong> It carries
                    <code>permissions: ['manage_deploys', 'admin']</code>. The gate runs
                    through <code>View#checkPermissions()</code> →
                    <code>app.activeUser.hasPermission()</code>, is <strong>any-of</strong>
                    for arrays and <strong>fail-closed</strong> — no active user means no
                    item. This portal deliberately stubs
                    <code>activeUser.hasPermission = () =&gt; true</code>
                    (<code>examples/portal/app.js</code>) so every demo renders in full, so
                    the gate passes here. In your app the item disappears for anyone
                    holding neither permission, and the kebab disappears entirely for a row
                    where every actionable item is filtered out — as the Reports table
                    below shows.
                </div>
            </div>

            <div class="card mb-2">
                <div class="card-body">
                    <div data-container="deploys-slot"></div>
                </div>
                <div class="card-footer">
                    <small class="text-muted">
                        Last action: <strong data-note>— open a kebab menu —</strong>
                    </small>
                </div>
            </div>
            <p class="text-secondary small mb-4">
                <strong>Retry deploy</strong> only renders on rows whose status is
                <code>failed</code> (rows 102 and 104): that is <code>visible(model)</code>,
                re-evaluated on every render. <strong>Rollback</strong> is
                <code>disabled</code>, <strong>Archive</strong> is <code>danger</code>, and
                the line above it is a <code>divider</code>.
            </p>

            <h5 class="mt-5">The <code>rowContextMenu</code> alias</h5>
            <p class="text-secondary small mb-3">
                Identical option under the alias TablePage consumers tend to reach for.
                Both items here are <code>visible</code>-gated to non-archived reports —
                so the two archived rows render <strong>no kebab toggle at all</strong>
                rather than an empty dropdown.
            </p>
            <div class="card">
                <div class="card-body">
                    <div data-container="reports-slot"></div>
                </div>
            </div>
        </div>
    `;
}

export default TableViewContextMenuExample;
