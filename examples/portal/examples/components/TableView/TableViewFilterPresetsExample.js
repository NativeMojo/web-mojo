import { Page, TableView, Collection } from 'web-mojo';

/**
 * TableViewFilterPresetsExample — `filterPresets` named-query segment.
 *
 * Doc:    docs/web-mojo/components/ListView.md#filter-presets
 * Route:  components/table-view/filter-presets
 *
 * `filterPresets:` renders author-defined "common queries" as a compact
 * btn-group in the toolbar (Gmail tabs / Linear views / Sentry saved
 * searches). One click sets the whole `params` bundle, resets paging, and
 * refetches; the applied params show as normal removable pills. Presets are
 * mutually exclusive, toggle off on re-click, and derive their active state
 * from `getActiveFilters()` — so editing a pill de-highlights the button.
 *
 * With ≤4 presets (this demo) the segment sits inline in the toolbar. With
 * 5+ it moves to its own scrollable row above the pills — nothing to
 * configure, the component picks the placement.
 *
 * The `Mine` preset uses the `'@me'` token, which resolves to the active
 * user's id at apply/match time. The portal has no signed-in user, so that
 * param is skipped and `Mine` applies nothing — exactly the documented
 * graceful-degrade path.
 */
const NOW = Math.floor(Date.now() / 1000);
const LEVELS = { 5: 'critical', 4: 'error', 3: 'warning', 2: 'info', 1: 'debug' };

const SEED_LOGS = Array.from({ length: 26 }, (_, i) => {
    const level = [5, 4, 4, 3, 3, 2, 2, 1][i % 8];
    const paths = ['/auth/login', '/auth/token', '/api/orders', '/api/users', '/billing/charge'];
    return {
        id: i + 1,
        level,
        severity: LEVELS[level],
        path: paths[i % paths.length],
        owner: (i % 4) + 1,
        message: `Event ${i + 1} on ${paths[i % paths.length]}`,
        created: NOW - i * 3600,
    };
});

/** In-memory stand-in for a REST collection: `fetch()` honors `params`. */
class FakeLogsCollection extends Collection {
    constructor() {
        super();
        this.restEnabled = true;
    }

    async fetch() {
        this.emit('fetch:start');
        const p = this.params;
        const rows = SEED_LOGS.filter((r) => (
            (p.level__gte === undefined || r.level >= p.level__gte)
            && (p.owner === undefined || String(r.owner) === String(p.owner))
            && (p.path__icontains === undefined || r.path.includes(p.path__icontains))
            && (!p.search || r.message.toLowerCase().includes(String(p.search).toLowerCase()))
        ));
        this.meta = { count: rows.length };
        this.reset(rows.slice(p.start || 0, (p.start || 0) + (p.size || 10)));
        this.emit('fetch:end');
        this.emit('fetch:success', { data: this.models, meta: this.meta });
        return { success: true, data: this.models, meta: this.meta };
    }
}

class TableViewFilterPresetsExample extends Page {
    static pageName = 'components/table-view/filter-presets';
    static route = 'components/table-view/filter-presets';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TableViewFilterPresetsExample.pageName,
            route: TableViewFilterPresetsExample.route,
            title: 'TableView — filter presets',
            template: TableViewFilterPresetsExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        this.table = new TableView({
            containerId: 'table-slot',
            collection: new FakeLogsCollection(),
            columns: [
                { key: 'id', label: 'ID', width: '64px', sortable: true },
                {
                    key: 'severity',
                    label: 'Level',
                    formatter: 'badge:critical=danger,error=danger,warning=warning,info=info,debug=secondary',
                },
                { key: 'path', label: 'Path', visibility: 'md' },
                { key: 'message', label: 'Message', visibility: 'lg' },
                { key: 'created|epoch|relative', label: 'When', sortable: true },
            ],
            // ≤4 presets → inline segment. Add a 5th and it relocates to its
            // own scrollable row above the pills, no other change needed.
            filterPresets: [
                { key: 'errors', label: 'Errors', icon: 'bi-exclamation-triangle', params: { level__gte: 4 }, description: 'Error + critical' },
                { key: 'auth', label: 'Auth', icon: 'bi-shield-lock', params: { path__icontains: '/auth', level__gte: 4 } },
                { key: 'mine', label: 'Mine', icon: 'bi-person', params: { owner: '@me' } },
            ],
            actions: ['view'],
            searchable: true,
            paginated: true,
            showAdd: false,
            showExport: false,
            tableOptions: { striped: true, hover: true, size: 'sm' },
            collectionParams: { sort: '-created', size: 10 },
        });

        this.addChild(this.table);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView — filter presets</h1>
            <p class="example-summary">
                <code>filterPresets</code> turns saved queries into one-click toolbar buttons.
                Click <strong>Errors</strong> or <strong>Auth</strong> — the params apply as pills,
                the button highlights, and clicking it again (or removing a pill) clears it.
                <strong>Mine</strong> uses <code>'@me'</code>; with no signed-in user it applies nothing.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/ListView.md">
                    docs/web-mojo/components/ListView.md#filter-presets
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div data-container="table-slot"></div>
                </div>
                <div class="card-footer bg-light">
                    <small class="text-muted">
                        Presets are mutually exclusive and derive their active state from
                        <code>getActiveFilters()</code> — no stored flag to drift. Seed data is
                        in-file; a fake-server Collection honors the preset params.
                    </small>
                </div>
            </div>
        </div>
    `;
}

export default TableViewFilterPresetsExample;
