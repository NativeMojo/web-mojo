import { Page, TableView, Collection } from 'web-mojo';

/**
 * TableViewRowStripeExample — severity-coded left-edge stripe on a TableView.
 *
 * Doc:    docs/web-mojo/components/TableView.md#row-stripe-severity-coded
 * Route:  components/table-view/row-stripe
 *
 * `rowStripe` is inherited from ListView verbatim. Same callback contract,
 * same six tokens. The CSS path differs internally (TableView uses
 * `box-shadow: inset 4px 0 0 var(--bs-<token>)` on `td:first-child` because
 * `border-left` on `<tr>` doesn't render reliably under Bootstrap's
 * `border-collapse: separate`), but the consumer-facing surface is identical.
 *
 * Demonstrates:
 *   1. Severity feed in tabular form — `level` thresholds → stripe class.
 *   2. With `selectable: true`, the checkbox `<td>` is `td:first-child`, so
 *      the stripe paints on the leftmost edge as intended (alongside the
 *      checkbox column).
 */

const NOW = Math.floor(Date.now() / 1000);

const SEED_EVENTS = [
    { id: 1, level: 5, kind: 'auth',    message: 'Failed login from new IP · 5 attempts',  actor: 'unknown',      created: NOW - 120 },
    { id: 2, level: 4, kind: 'api',     message: 'Rate limit exceeded on /api/export',     actor: 'api-key-7f3a', created: NOW - 840 },
    { id: 3, level: 3, kind: 'auth',    message: 'Password changed',                       actor: 'alice@ex.com', created: NOW - 2280 },
    { id: 4, level: 2, kind: 'auth',    message: 'User signed in',                         actor: 'ben@ex.com',   created: NOW - 3120 },
    { id: 5, level: 5, kind: 'webhook', message: 'Webhook signature mismatch',             actor: 'billing-svc',  created: NOW - 4260 },
    { id: 6, level: 1, kind: 'auth',    message: 'Session expired',                        actor: 'carla@ex.com', created: NOW - 5520 },
    { id: 7, level: 3, kind: 'auth',    message: 'MFA enrolled · TOTP',                    actor: 'dan@ex.com',   created: NOW - 7080 },
    { id: 8, level: 4, kind: 'access',  message: 'Permission denied · /admin/users',       actor: 'grace@ex.com', created: NOW - 8400 },
];

function stripeForLevel(level) {
    if (level >= 5) return 'danger';
    if (level >= 4) return 'warning';
    if (level >= 3) return 'info';
    return null;
}

class TableViewRowStripeExample extends Page {
    static pageName = 'components/table-view/row-stripe';
    static route = 'components/table-view/row-stripe';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TableViewRowStripeExample.pageName,
            route: TableViewRowStripeExample.route,
            title: 'TableView row stripe',
            template: TableViewRowStripeExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        const columns = [
            { key: 'id', label: 'ID', width: '64px', sortable: true },
            {
                key: 'level',
                label: 'Lvl',
                width: '72px',
                sortable: true,
                formatter: 'badge:1=light,2=light,3=info,4=warning,5=danger',
            },
            {
                key: 'kind',
                label: 'Kind',
                visibility: 'md',
                formatter: 'badge:auth=secondary,api=info,webhook=primary,access=warning',
            },
            { key: 'message', label: 'Message', sortable: true },
            { key: 'actor', label: 'Actor', visibility: 'lg' },
            { key: 'created|epoch|relative', label: 'When', sortable: true },
        ];

        this.feedTable = new TableView({
            containerId: 'feed-slot',
            collection: new Collection(SEED_EVENTS),
            title: 'Security events',
            columns,
            searchable: false,
            filterable: false,
            showAdd: false,
            showExport: false,
            tableOptions: { hover: true, size: 'sm' },
            rowStripe: (model) => stripeForLevel(model.get('level')),
        });
        this.addChild(this.feedTable);

        // Same data, same callback — but `selectable: true`. The stripe lands
        // on `td:first-child`, which is now the checkbox column.
        this.selectableTable = new TableView({
            containerId: 'selectable-slot',
            collection: new Collection(SEED_EVENTS),
            title: 'Security events · selectable',
            columns,
            selectable: true,
            searchable: false,
            filterable: false,
            showAdd: false,
            showExport: false,
            tableOptions: { hover: true, size: 'sm' },
            rowStripe: (model) => stripeForLevel(model.get('level')),
        });
        this.addChild(this.selectableTable);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView row stripe</h1>
            <p class="example-summary">
                <code>rowStripe:</code> is inherited from ListView. Same callback,
                same six Bootstrap tokens. TableView paints the stripe as
                <code>box-shadow: inset 4px 0 0 var(--bs-&lt;token&gt;)</code> on
                <code>td:first-child</code> — robust under
                <code>border-collapse: separate</code> and theme-aware.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/TableView.md#row-stripe-severity-coded">
                    docs/web-mojo/components/TableView.md
                </a>
            </p>

            <h5 class="mt-4">Severity-coded events</h5>
            <p class="text-secondary small mb-3">
                <code>L5 → danger</code>, <code>L4 → warning</code>,
                <code>L3 → info</code>, below → no stripe.
            </p>
            <div class="card mb-4">
                <div class="card-body">
                    <div data-container="feed-slot"></div>
                </div>
            </div>

            <h5 class="mt-5">With <code>selectable: true</code></h5>
            <p class="text-secondary small mb-3">
                When <code>selectable: true</code>, the checkbox <code>&lt;td&gt;</code>
                is <code>td:first-child</code> — so the stripe paints the leftmost
                edge of the row alongside the checkbox column, as intended.
            </p>
            <div class="card">
                <div class="card-body">
                    <div data-container="selectable-slot"></div>
                </div>
            </div>
        </div>
    `;
}

export default TableViewRowStripeExample;
