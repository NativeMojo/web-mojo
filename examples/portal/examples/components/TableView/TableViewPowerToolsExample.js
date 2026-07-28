import { Page, TableView, Collection } from 'web-mojo';

/**
 * TableViewPowerToolsExample — persistState + columnChooser + autoRefresh.
 *
 * Doc:    docs/web-mojo/components/TableView.md#view-persistence-persiststate
 * Route:  components/table-view/power-tools
 *
 * The three "operator dashboard" upgrades on one wide table:
 *
 *   1. `columnChooser: true` — an icon-only "Columns" dropdown whose checkboxes
 *      hide/show columns. The caller's `columns` array is never mutated; a
 *      `hideable: false` column (here `id`) is locked and always shown.
 *   2. `persistState: true` + `persistKey` — sort, page size, active filters,
 *      day-range, and hidden columns are saved to localStorage and restored on
 *      the next visit. Give sibling tables distinct `persistKey`s.
 *   3. `autoRefresh: 30` — a silent refetch every 30 s (5 s floor), keeping
 *      filters/sort/paging; pauses while the tab is hidden or a selection is
 *      active, and resumes with an immediate refetch on focus.
 *
 * A fake-server Collection makes autoRefresh + filters work with no backend.
 * Hide a few columns, sort, reload — your view comes back. The footer button
 * calls `clearPersistedState()` to forget it.
 */
const REGIONS = ['us-east', 'us-west', 'eu-central', 'ap-south'];
const ROLES = ['web', 'worker', 'db', 'cache'];

const SEED_HOSTS = Array.from({ length: 22 }, (_, i) => ({
    id: i + 1,
    hostname: `host-${String(i + 1).padStart(2, '0')}`,
    region: REGIONS[i % REGIONS.length],
    role: ROLES[i % ROLES.length],
    status: i % 7 === 0 ? 'degraded' : 'healthy',
    cpu: 5 + ((i * 7) % 90),
    mem: 10 + ((i * 11) % 85),
    ip: `10.0.${i}.${(i * 3) % 255}`,
    uptime_days: (i * 13) % 400,
}));

/** Fake REST collection so autoRefresh + filters run offline. */
class FakeHostsCollection extends Collection {
    constructor() {
        super();
        this.restEnabled = true;
    }

    async fetch() {
        this.emit('fetch:start');
        // Yield between start/end so the (default) skeleton is actually
        // visible — a fetch that emits both synchronously would flash it away.
        await new Promise((r) => { setTimeout(r, 150); });
        const p = this.params;
        const rows = SEED_HOSTS.filter((h) => (
            (p.region === undefined || h.region === p.region)
            && (p.role === undefined || h.role === p.role)
            && (!p.search || h.hostname.includes(String(p.search)))
        ));
        this.meta = { count: rows.length };
        this.reset(rows.slice(p.start || 0, (p.start || 0) + (p.size || 10)));
        this.emit('fetch:end');
        this.emit('fetch:success', { data: this.models, meta: this.meta });
        return { success: true, data: this.models, meta: this.meta };
    }
}

class TableViewPowerToolsExample extends Page {
    static pageName = 'components/table-view/power-tools';
    static route = 'components/table-view/power-tools';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TableViewPowerToolsExample.pageName,
            route: TableViewPowerToolsExample.route,
            title: 'TableView — power tools',
            template: TableViewPowerToolsExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        this.table = new TableView({
            containerId: 'table-slot',
            collection: new FakeHostsCollection(),
            columns: [
                { key: 'id', label: 'ID', sortable: true, hideable: false },
                { key: 'hostname', label: 'Host', sortable: true },
                { key: 'region', label: 'Region', filter: { type: 'select', options: REGIONS } },
                { key: 'role', label: 'Role', filter: { type: 'select', options: ROLES } },
                { key: 'status', label: 'Status', formatter: 'badge:healthy=success,degraded=warning' },
                { key: 'cpu', label: 'CPU %', sortable: true, visibility: 'md' },
                { key: 'mem', label: 'Mem %', sortable: true, visibility: 'md' },
                { key: 'ip', label: 'IP', visibility: 'lg' },
                { key: 'uptime_days', label: 'Uptime (d)', sortable: true, visibility: 'lg' },
            ],
            actions: ['view'],
            searchable: true,
            paginated: true,
            showAdd: false,
            showExport: false,
            tableOptions: { striped: true, hover: true, size: 'sm' },
            collectionParams: { sort: 'hostname', size: 10 },

            // The three power tools:
            columnChooser: true,
            persistState: true,
            persistKey: 'examples-power-tools',
            autoRefresh: 30,
        });

        this.addChild(this.table);
    }

    /** Forget the saved view and un-hide every column. */
    onActionResetView(event) {
        event.preventDefault();
        this.table.clearPersistedState();
        this.getApp()?.toast?.info?.('Saved view cleared — back to defaults.');
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView — power tools</h1>
            <p class="example-summary">
                <code>columnChooser</code>, <code>persistState</code>, and
                <code>autoRefresh: 30</code> together. Hide a few columns (ID is locked via
                <code>hideable: false</code>), sort, filter, then reload — your view is
                restored from <code>localStorage</code> under <code>persistKey</code>.
                A silent refetch runs every 30 s.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/TableView.md">
                    docs/web-mojo/components/TableView.md#column-chooser-columnchooser
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div data-container="table-slot"></div>
                </div>
                <div class="card-footer bg-light d-flex justify-content-between align-items-center">
                    <small class="text-muted">
                        The hidden-column set persists under the same storage entry
                        (<code>mojo:tableview:examples-power-tools</code>). autoRefresh pauses
                        while the tab is hidden or a selection is active.
                    </small>
                    <button class="btn btn-sm btn-outline-secondary" data-action="reset-view">
                        <i class="bi bi-arrow-counterclockwise"></i> Reset saved view
                    </button>
                </div>
            </div>
        </div>
    `;
}

export default TableViewPowerToolsExample;
