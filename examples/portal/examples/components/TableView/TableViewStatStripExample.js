import { Page, TableView, Collection } from 'web-mojo';

/**
 * TableViewStatStripExample — `stats` live stat strip.
 *
 * Doc:    docs/web-mojo/components/TableView.md#live-stat-strip-stats
 * Route:  components/table-view/stat-strip
 *
 * `stats:` puts a row of KPI blocks above the toolbar whose numbers are
 * computed SERVER-SIDE under the table's current filters, and which apply
 * their own filter bundle on click:
 *
 *   1. One batched request per recount — the collection's list endpoint plus
 *      `_mode=count` and `_stats={key: params}`. The `FakeIncidentRest` below
 *      answers it offline in exactly the wire shape a mojo backend returns:
 *      a FLAT `{ count, stats, took_ms }` body (no `data.data` nesting).
 *   2. Type in the search box and every number moves — the counts are scoped
 *      by the same filters the table is. That is the whole point: you can see
 *      how many rows a query holds before you run it.
 *   3. Clicking a block applies its bundle through the same rails as a filter
 *      preset — mutual exclusion, toggle-off, derived active state. Remove the
 *      pill it created and the block de-highlights itself.
 *   4. `SLA breached` is deliberately answered with `null`, so you can see the
 *      per-chip degraded state (muted em-dash, non-interactive) next to
 *      working ones. `0` is NOT that state — zero is information.
 *
 * Colour budget: one danger dot, on the single `critical: true` stat, and only
 * while it has something in it.
 */
const TEAMS = ['payments', 'identity', 'search'];

const SEED_INCIDENTS = Array.from({ length: 24 }, (_, i) => ({
    id: i + 1,
    title: `INC-${String(1200 + i)} ${['checkout latency', 'login failures', 'index lag', 'webhook retries'][i % 4]}`,
    team: TEAMS[i % TEAMS.length],
    status: i % 5 === 0 ? 'resolved' : (i % 3 === 0 ? 'acknowledged' : 'open'),
    priority: i % 7 === 0 ? 'high' : (i % 2 === 0 ? 'normal' : 'low'),
    age_hours: (i * 5) % 60,
}));

/** Reserved / transport keys that are not row filters. */
const NOT_A_FILTER = new Set(['start', 'size', 'sort', '_mode', '_stats']);

/** Tiny stand-in for the server's filter engine (`field`, `field__gte`, search). */
function matches(row, params) {
    return Object.keys(params).every((key) => {
        if (NOT_A_FILTER.has(key)) return true;
        const value = params[key];
        if (value === undefined || value === null || value === '') return true;
        if (key === 'search') return row.title.toLowerCase().includes(String(value).toLowerCase());
        const [field, op] = key.split('__');
        const rowValue = row[field];
        if (op === 'gte') return Number(rowValue) >= Number(value);
        if (op === 'lte') return Number(rowValue) <= Number(value);
        return String(rowValue) === String(value);
    });
}

const delay = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * Offline stand-in for `collection.rest`. A real collection needs none of
 * this — the aggregation request goes to the same endpoint the list already
 * uses. Reproduced here so the example runs with no backend, and so the
 * response shape is visible in the source.
 */
const FakeIncidentRest = {
    async GET(_url, params = {}) {
        const bundles = JSON.parse(params._stats || '{}');
        const base = SEED_INCIDENTS.filter((row) => matches(row, params));

        const stats = {};
        Object.keys(bundles).forEach((key) => {
            // One bundle the server can't answer → that chip degrades alone.
            stats[key] = key === 'sla'
                ? null
                : base.filter((row) => matches(row, bundles[key])).length;
        });

        await delay(120);
        // FLAT body — this endpoint returns it directly, so it is
        // `resp.data.count` / `resp.data.stats`, never `resp.data.data`.
        return { success: true, status: 200, data: { count: base.length, stats, took_ms: 2 } };
    },
};

/** In-memory stand-in for a REST collection: `fetch()` honors `params`. */
class FakeIncidentsCollection extends Collection {
    constructor() {
        super({ endpoint: '/fake/incidents' });
        this.restEnabled = true;
        this.rest = FakeIncidentRest;
    }

    async fetch() {
        this.emit('fetch:start');
        await delay(150);
        const p = this.params;
        const rows = SEED_INCIDENTS.filter((row) => matches(row, p));
        this.meta = { count: rows.length };
        this.reset(rows.slice(p.start || 0, (p.start || 0) + (p.size || 10)));
        this.emit('fetch:end');
        this.emit('fetch:success', { data: this.models, meta: this.meta });
        return { success: true, data: this.models, meta: this.meta };
    }
}

class TableViewStatStripExample extends Page {
    static pageName = 'components/table-view/stat-strip';
    static route = 'components/table-view/stat-strip';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TableViewStatStripExample.pageName,
            route: TableViewStatStripExample.route,
            title: 'TableView — stat strip',
            template: TableViewStatStripExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        this.table = new TableView({
            containerId: 'table-slot',
            collection: new FakeIncidentsCollection(),
            columns: [
                { key: 'id', label: 'ID', sortable: true },
                { key: 'title', label: 'Incident' },
                { key: 'team', label: 'Team', visibility: 'md' },
                {
                    key: 'status',
                    label: 'Status',
                    formatter: 'badge:open=danger,acknowledged=warning,resolved=success',
                },
                {
                    key: 'priority',
                    label: 'Priority',
                    formatter: 'badge:high=danger,normal=secondary,low=secondary',
                    visibility: 'lg',
                },
                { key: 'age_hours', label: 'Age (h)', visibility: 'lg' },
            ],

            // The feature. `params: {}` is the "All" chip; exactly one stat may
            // be `critical` (that is the entire colour budget).
            stats: [
                { key: 'all', label: 'All', params: {} },
                { key: 'open', label: 'Open', params: { status: 'open' } },
                { key: 'high', label: 'High priority', params: { priority: 'high' }, critical: true },
                { key: 'stale', label: 'Stale > 24h', params: { age_hours__gte: 24 }, description: 'Untouched for a day' },
                { key: 'sla', label: 'SLA breached', params: { sla_breached: true } },
            ],

            actions: ['view'],
            searchable: true,
            paginated: true,
            showAdd: false,
            showExport: false,
            tableOptions: { striped: true, hover: true, size: 'sm' },
            collectionParams: { size: 10 },
        });

        this.addChild(this.table);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView — stat strip</h1>
            <p class="example-summary">
                <code>stats</code> renders live, server-computed counts above the toolbar —
                and each block is also a filter. Click <strong>Open</strong> or
                <strong>High priority</strong> to apply its bundle (click again to clear), and
                type in the search box to watch every number re-scope to the current query.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/TableView.md">
                    docs/web-mojo/components/TableView.md#live-stat-strip-stats
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div data-container="table-slot"></div>
                </div>
                <div class="card-footer bg-light">
                    <small class="text-muted">
                        The count on a chip is the number of rows you get after clicking it — the
                        active bundle is excluded from the counts' own filters, so they never
                        advertise an intersection you can't reach. <strong>SLA breached</strong>
                        is answered with <code>null</code> on purpose to show the degraded chip;
                        a <code>0</code> would render as <code>0</code>, because zero is
                        information and an em-dash means unknown. Recounts are debounced and
                        skipped entirely for paging and sorting, which cannot move a count.
                    </small>
                </div>
            </div>
        </div>
    `;
}

export default TableViewStatStripExample;
