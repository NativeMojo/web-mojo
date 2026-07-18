import { Page, TableView, Collection } from 'web-mojo';

/**
 * TableViewRowExpandExample — inline expandable detail rows (`rowExpand`).
 *
 * Doc:    docs/web-mojo/components/TableView.md#expandable-rows
 * Route:  components/table-view/row-expand
 *
 * Set `rowExpand: (model) => string | View` and TableView grows a chevron
 * toggle as its first column. Clicking it opens a full-width detail row
 * beneath the data row — killing the "open a modal to read one more field"
 * flow for quick-look cases. The detail panel surface is themed by the
 * framework (`var(--bs-tertiary-bg)` + primary accent), so light and dark
 * both read correctly with no CSS here.
 *
 * This demo returns a **string** template (interpolate trusted values with
 * your own escaping for untrusted data). The callback may instead return a
 * **View** instance, which the framework mounts with the Dynamic Children
 * pattern and destroys on collapse:
 *
 *     rowExpand: (model) => new IncidentQuickLookView({ model })
 *
 * Single-open by default (expanding one collapses the last). The footer
 * button flips `rowExpandMultiple` live so several rows can stay open.
 */
const SEED_INCIDENTS = [
    { id: 1, priority: 'P1', title: 'Checkout 500s', service: 'billing', rule: 'error_rate > 5%', owner: 'Alice', description: 'Payment intent creation failing for ~8% of EU traffic since 14:20 UTC.' },
    { id: 2, priority: 'P2', title: 'Slow search', service: 'search', rule: 'p95 > 800ms', owner: 'Ben', description: 'Search p95 latency crept past the SLO after the reindex job.' },
    { id: 3, priority: 'P3', title: 'Email digest lag', service: 'notifications', rule: 'queue_age > 10m', owner: 'Carla', description: 'Nightly digest queue is draining slowly; no user-visible impact yet.' },
    { id: 4, priority: 'P1', title: 'Auth token leak alert', service: 'auth', rule: 'anomaly_score > 0.9', owner: 'Dan', description: 'Anomaly detector flagged a burst of token refreshes from one ASN.' },
    { id: 5, priority: 'P2', title: 'Webhook retries spiking', service: 'integrations', rule: 'retry_rate > 20%', owner: 'Eve', description: 'Downstream partner endpoint returning 503s; retries backing up.' },
];

const PRIORITY_BADGE = 'badge:P1=danger,P2=warning,P3=secondary';

class TableViewRowExpandExample extends Page {
    static pageName = 'components/table-view/row-expand';
    static route = 'components/table-view/row-expand';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TableViewRowExpandExample.pageName,
            route: TableViewRowExpandExample.route,
            title: 'TableView — expandable rows',
            template: TableViewRowExpandExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        this.table = new TableView({
            containerId: 'table-slot',
            collection: new Collection(SEED_INCIDENTS),
            columns: [
                { key: 'priority', label: 'Priority', width: '96px', formatter: PRIORITY_BADGE },
                { key: 'title', label: 'Incident', sortable: true },
                { key: 'service', label: 'Service', visibility: 'md' },
                { key: 'owner', label: 'On call', visibility: 'md' },
            ],
            actions: ['view'],
            searchable: true,
            paginated: false,
            showAdd: false,
            showExport: false,
            tableOptions: { hover: true, size: 'sm' },
            collectionParams: { sort: 'id' },

            // The whole feature — a callback returning the detail markup.
            rowExpand: (model) => `
                <dl class="row mb-0 small">
                    <dt class="col-sm-3 text-muted">Description</dt>
                    <dd class="col-sm-9">${model.get('description')}</dd>
                    <dt class="col-sm-3 text-muted">Trigger rule</dt>
                    <dd class="col-sm-9"><code>${model.get('rule')}</code></dd>
                    <dt class="col-sm-3 text-muted">Owner</dt>
                    <dd class="col-sm-9">${model.get('owner')}</dd>
                </dl>
            `,
        });

        this.addChild(this.table);
    }

    /** Flip single-open vs multi-open at runtime and relabel the button. */
    onActionToggleMulti(event, element) {
        event.preventDefault();
        this.table.rowExpandMultiple = !this.table.rowExpandMultiple;
        const multi = this.table.rowExpandMultiple;
        element.innerHTML = multi
            ? '<i class="bi bi-list-nested"></i> Multiple open'
            : '<i class="bi bi-1-circle"></i> Single open';
        this.getApp()?.toast?.info?.(multi ? 'Multiple rows may stay open.' : 'Only one row stays open.');
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView — expandable rows</h1>
            <p class="example-summary">
                <code>rowExpand</code> adds a chevron toggle column. Click it to open a
                full-width detail row rendered by your callback (a string template here; it
                may also return a <code>View</code>). Single-open by default — the footer
                button flips <code>rowExpandMultiple</code> live.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/TableView.md">
                    docs/web-mojo/components/TableView.md#expandable-rows
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div data-container="table-slot"></div>
                </div>
                <div class="card-footer bg-light d-flex justify-content-between align-items-center">
                    <small class="text-muted">
                        Expanded state is keyed by model id and survives a re-render; a page
                        change collapses everything. Emits <code>row:expand:toggle</code>.
                    </small>
                    <button class="btn btn-sm btn-outline-secondary" data-action="toggle-multi">
                        <i class="bi bi-1-circle"></i> Single open
                    </button>
                </div>
            </div>
        </div>
    `;
}

export default TableViewRowExpandExample;
