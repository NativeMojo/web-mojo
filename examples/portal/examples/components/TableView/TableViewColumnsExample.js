import { Page, TableView, Collection } from 'web-mojo';

/**
 * TableViewColumnsExample — the column-config keys the other examples skip.
 *
 * Doc:    docs/web-mojo/components/TableView.md#column-configuration
 * Route:  components/table-view/columns
 *
 * Demonstrates:
 *   1. `visibility` in OBJECT form — `{ hide }` and `{ show, hide }`. (The
 *      string form, `align`, and `footer_total` are already covered by
 *      `pages/table-page`.)
 *   2. A function `formatter(value, ctx)` — full `{ value, model, column,
 *      table, index }` context, returning HTML.
 *   3. `column.template` — a Mustache snippet resolved against `model.*`.
 *   4. `column.class` / `className` — extra classes on every body cell.
 *   5. `tableOptions` — `size`, `fontSize`, `bordered`, `responsive`.
 *
 * Resize the window (or drag the preview narrow) to watch the object-form
 * visibility columns swap in and out.
 */
const SEED_ENDPOINTS = [
    { id: 1, path: '/api/account/user',    method: 'GET',    p95_ms: 42,   rpm: 1840, error_rate: 0.001, owner: 'platform' },
    { id: 2, path: '/api/account/login',   method: 'POST',   p95_ms: 310,  rpm: 220,  error_rate: 0.021, owner: 'platform' },
    { id: 3, path: '/api/billing/invoice', method: 'GET',    p95_ms: 88,   rpm: 640,  error_rate: 0.004, owner: 'billing' },
    { id: 4, path: '/api/billing/charge',  method: 'POST',   p95_ms: 1240, rpm: 96,   error_rate: 0.068, owner: 'billing' },
    { id: 5, path: '/api/files/upload',    method: 'POST',   p95_ms: 2100, rpm: 44,   error_rate: 0.012, owner: 'storage' },
    { id: 6, path: '/api/files/{id}',      method: 'DELETE', p95_ms: 61,   rpm: 12,   error_rate: 0.000, owner: 'storage' },
];

/**
 * Function formatter. Receives the raw value plus a context object and
 * returns HTML — escape anything user-supplied, it is assigned to innerHTML.
 */
function latencyBar(value, ctx) {
    const worst = Math.max(...ctx.table.collection.models.map((m) => m.get('p95_ms')));
    const pct = Math.round((value / worst) * 100);
    const tone = value > 1000 ? 'danger' : value > 250 ? 'warning' : 'success';
    return `
        <div class="d-flex align-items-center gap-2">
            <div class="progress flex-grow-1" style="height: 6px; min-width: 60px;" role="presentation">
                <div class="progress-bar bg-${tone}" style="width: ${pct}%"></div>
            </div>
            <span class="small text-body-secondary" style="min-width: 4.5em; text-align: right;">${value} ms</span>
        </div>
    `;
}

/** Second formatter — shows `ctx.index` and `ctx.column`. */
function rankBadge(_value, ctx) {
    return `<span class="badge text-bg-secondary" title="${ctx.column.label}">#${ctx.index + 1}</span>`;
}

class TableViewColumnsExample extends Page {
    static pageName = 'components/table-view/columns';
    static route = 'components/table-view/columns';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TableViewColumnsExample.pageName,
            route: TableViewColumnsExample.route,
            title: 'TableView — column configuration',
            template: TableViewColumnsExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        this.table = new TableView({
            containerId: 'table-slot',
            collection: new Collection(SEED_ENDPOINTS),
            title: 'API endpoints',
            columns: [
                // 2 — function formatter using ctx.index + ctx.column
                { key: 'id', label: 'Rank', formatter: rankBadge, class: 'text-center' },

                // 3 — Mustache template string; `{{model.*}}` resolves per row.
                {
                    key: 'path',
                    label: 'Endpoint',
                    sortable: true,
                    template: '<a href="#" data-action="open-endpoint" data-id="{{model.id}}"><code>{{model.path}}</code></a>',
                },

                // 4 — extra classes on every body cell of this column.
                { key: 'method', label: 'Method', class: 'col-method text-center' },

                // 2 — function formatter reading ctx.table (peer rows)
                { key: 'p95_ms', label: 'p95 latency', sortable: true, formatter: latencyBar },

                // 1 — object-form visibility: hidden from lg up, visible below.
                { key: 'rpm', label: 'RPM (small screens only)', align: 'right', visibility: { hide: 'lg' } },

                // 1 — object-form visibility: visible only between md and xl.
                { key: 'error_rate|percent:1', label: 'Errors (md–xl only)', align: 'right', visibility: { show: 'md', hide: 'xl' } },

                { key: 'owner', label: 'Owner', className: 'text-uppercase small' },
            ],
            clickAction: 'none',
            searchable: false,
            filterable: false,
            paginated: false,
            showAdd: false,
            showExport: false,
            showFullscreen: false,
            tableOptions: { hover: true },
        });
        this.addChild(this.table);

        this.table.on('item:click', ({ action, model }) => {
            if (action !== 'open-endpoint') return;
            this.note(`template link → ${model.get('path')}`);
        });

        // 5 — the same columns under two different tableOptions bundles.
        const compactColumns = [
            { key: 'path', label: 'Endpoint' },
            { key: 'method', label: 'Method', class: 'col-method text-center' },
            { key: 'p95_ms', label: 'p95', align: 'right' },
        ];

        this.compactTable = new TableView({
            containerId: 'compact-slot',
            collection: new Collection(SEED_ENDPOINTS),
            columns: compactColumns,
            clickAction: 'none',
            searchable: false, filterable: false, paginated: false,
            showAdd: false, showExport: false, showRefresh: false, showFullscreen: false,
            tableOptions: { size: 'sm', bordered: true, striped: false, hover: true },
        });
        this.addChild(this.compactTable);

        this.denseTable = new TableView({
            containerId: 'dense-slot',
            collection: new Collection(SEED_ENDPOINTS),
            columns: compactColumns,
            clickAction: 'none',
            searchable: false, filterable: false, paginated: false,
            showAdd: false, showExport: false, showRefresh: false, showFullscreen: false,
            tableOptions: { size: 'sm', fontSize: 'xs', responsive: true, hover: true },
        });
        this.addChild(this.denseTable);
    }

    note(text) {
        const el = this.element?.querySelector('[data-note]');
        if (el) el.textContent = text;
    }

    static TEMPLATE = `
        <style>
            /* Target of the column's \`class:\` key — token-based, so it tracks
               the theme with no dark-mode override needed. */
            .col-method {
                font-family: var(--bs-font-monospace);
                font-weight: 600;
                color: var(--bs-emphasis-color);
                background: var(--bs-tertiary-bg);
            }
        </style>

        <div class="example-page">
            <h1>TableView — column configuration</h1>
            <p class="example-summary">
                The column keys the basic table doesn't reach for: object-form
                <code>visibility</code>, a function <code>formatter(value, ctx)</code>,
                a Mustache <code>template</code>, per-column
                <code>class</code>/<code>className</code>, and the
                <code>tableOptions</code> display bundle.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/TableView.md#column-configuration">
                    docs/web-mojo/components/TableView.md#column-configuration
                </a>
            </p>

            <div class="card mb-2">
                <div class="card-body">
                    <div data-container="table-slot"></div>
                </div>
                <div class="card-footer">
                    <small class="text-muted" data-note>Click an endpoint path — the link comes from <code>column.template</code>.</small>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-12 col-lg-6">
                    <div class="card h-100"><div class="card-body">
                        <h6><code>visibility</code> — object form</h6>
                        <p class="small text-secondary mb-0">
                            <code>{ hide: 'lg' }</code> shows the column <em>only below</em>
                            the breakpoint — the inverse of the string form.
                            <code>{ show: 'md', hide: 'xl' }</code> opens a window: visible
                            from md up to (not including) xl. Narrow the window and watch
                            the RPM and Errors columns trade places.
                        </p>
                    </div></div>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="card h-100"><div class="card-body">
                        <h6><code>formatter</code> — function form</h6>
                        <p class="small text-secondary mb-0">
                            The latency bars call
                            <code>formatter(value, { value, model, column, table, index })</code>
                            and return HTML. This one reads <code>ctx.table</code> to scale
                            each bar against the slowest peer row; the rank badge reads
                            <code>ctx.index</code> and <code>ctx.column</code>. The return
                            value is assigned to <code>innerHTML</code> — escape anything
                            user-supplied.
                        </p>
                    </div></div>
                </div>
            </div>

            <h5 class="mt-5"><code>tableOptions</code></h5>
            <p class="text-secondary small mb-3">
                Same three columns, same data — only the display bundle differs.
            </p>
            <div class="row g-3">
                <div class="col-12 col-xl-6">
                    <div class="d-flex align-items-baseline gap-2 mb-2">
                        <code class="fs-6">{ size: 'sm', bordered: true, striped: false }</code>
                    </div>
                    <div class="card"><div class="card-body">
                        <div data-container="compact-slot"></div>
                    </div></div>
                </div>
                <div class="col-12 col-xl-6">
                    <div class="d-flex align-items-baseline gap-2 mb-2">
                        <code class="fs-6">{ size: 'sm', fontSize: 'xs', responsive: true }</code>
                    </div>
                    <div class="card"><div class="card-body">
                        <div data-container="dense-slot"></div>
                    </div></div>
                </div>
            </div>
        </div>
    `;
}

export default TableViewColumnsExample;
