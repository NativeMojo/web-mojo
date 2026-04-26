import { Page, TableView, Collection } from 'web-mojo';

/**
 * TableViewExample — canonical demo of TableView.
 *
 * Doc:    docs/web-mojo/components/TableView.md
 * Route:  components/table-view
 *
 * TableView is ListView's column-aware sibling. It renders a Collection as an
 * HTML table with a toolbar (search, refresh, export, fullscreen), sortable
 * columns, pagination, row actions, and responsive column visibility. Each
 * row is its own per-model TableRow View, so changing a single record only
 * re-renders that row.
 *
 * This demo bakes ~25 rows of plausible user records into the page so it
 * works without a backend. The same options apply when wired to a server-
 * backed Collection (see the "server collection" sibling).
 *
 * Demonstrates:
 *   1. Sortable columns + visibility breakpoints (`md`, `lg`)
 *   2. Formatter pipes — `badge`, `date`, `truncate`
 *   3. Per-column filter dropdowns (select + boolean)
 *   4. Toolbar search + active filter pills
 *   5. Client-side pagination
 */
const SEED_USERS = [
    { id: 1, name: 'Alice Adams', role: 'admin', email: 'alice@example.com', status: 'active', notes: 'Founding admin; manages org settings and billing.', last_active: '2026-04-25T10:14:00Z' },
    { id: 2, name: 'Ben Bryant', role: 'editor', email: 'ben@example.com', status: 'active', notes: 'Content editor for the marketing team.', last_active: '2026-04-24T18:02:00Z' },
    { id: 3, name: 'Carla Cruz', role: 'viewer', email: 'carla.cruz@example.com', status: 'invited', notes: 'Invitation pending — sent yesterday.', last_active: '2026-04-23T09:21:00Z' },
    { id: 4, name: 'Dan Dietrich', role: 'editor', email: 'dan@example.com', status: 'active', notes: 'Owns the docs site.', last_active: '2026-04-22T15:44:00Z' },
    { id: 5, name: 'Eve Estrada', role: 'admin', email: 'eve@example.com', status: 'active', notes: 'Security review lead.', last_active: '2026-04-25T08:00:00Z' },
    { id: 6, name: 'Frank Fischer', role: 'viewer', email: 'frank.fischer@example.com', status: 'disabled', notes: 'Account disabled after offboarding.', last_active: '2026-02-11T11:33:00Z' },
    { id: 7, name: 'Grace Gomez', role: 'editor', email: 'grace@example.com', status: 'active', notes: 'Writes most release notes.', last_active: '2026-04-24T12:01:00Z' },
    { id: 8, name: 'Hank Huang', role: 'viewer', email: 'hank.huang@example.com', status: 'active', notes: 'Read-only auditor for compliance.', last_active: '2026-04-20T17:18:00Z' },
    { id: 9, name: 'Iris Ito', role: 'admin', email: 'iris@example.com', status: 'active', notes: 'Heads up infra team.', last_active: '2026-04-25T07:55:00Z' },
    { id: 10, name: 'Jack Jensen', role: 'editor', email: 'jack@example.com', status: 'invited', notes: 'Recently re-invited after expired link.', last_active: '2026-04-19T14:09:00Z' },
    { id: 11, name: 'Kira Klein', role: 'viewer', email: 'kira.klein@example.com', status: 'active', notes: 'External partner.', last_active: '2026-04-21T16:42:00Z' },
    { id: 12, name: 'Liam Lopez', role: 'editor', email: 'liam@example.com', status: 'active', notes: 'Designs the dashboards.', last_active: '2026-04-24T19:30:00Z' },
    { id: 13, name: 'Mia Morales', role: 'viewer', email: 'mia@example.com', status: 'disabled', notes: 'Old contractor — kept for audit log.', last_active: '2025-12-30T08:15:00Z' },
    { id: 14, name: 'Noah Nelson', role: 'admin', email: 'noah@example.com', status: 'active', notes: 'Owns the API surface.', last_active: '2026-04-25T09:48:00Z' },
    { id: 15, name: 'Olivia Ortiz', role: 'editor', email: 'olivia@example.com', status: 'active', notes: 'Brand guidelines lead.', last_active: '2026-04-23T20:11:00Z' },
    { id: 16, name: 'Paul Park', role: 'viewer', email: 'paul.park@example.com', status: 'invited', notes: 'New hire — invitation just sent.', last_active: '2026-04-25T06:00:00Z' },
    { id: 17, name: 'Quinn Quan', role: 'editor', email: 'quinn@example.com', status: 'active', notes: 'Reports & analytics.', last_active: '2026-04-22T11:00:00Z' },
    { id: 18, name: 'Riya Reddy', role: 'admin', email: 'riya@example.com', status: 'active', notes: 'On-call SRE rotation.', last_active: '2026-04-25T05:33:00Z' },
    { id: 19, name: 'Sam Suzuki', role: 'viewer', email: 'sam.suzuki@example.com', status: 'active', notes: 'Customer success.', last_active: '2026-04-21T13:24:00Z' },
    { id: 20, name: 'Tara Thompson', role: 'editor', email: 'tara@example.com', status: 'active', notes: 'Localization owner.', last_active: '2026-04-24T22:08:00Z' },
    { id: 21, name: 'Uma Ueda', role: 'viewer', email: 'uma@example.com', status: 'invited', notes: 'Pending acceptance from finance.', last_active: '2026-04-18T09:00:00Z' },
    { id: 22, name: 'Victor Vega', role: 'editor', email: 'victor@example.com', status: 'disabled', notes: 'Disabled — left the company.', last_active: '2026-01-08T15:00:00Z' },
    { id: 23, name: 'Wren Walsh', role: 'admin', email: 'wren@example.com', status: 'active', notes: 'Audit log reviewer.', last_active: '2026-04-25T10:01:00Z' },
    { id: 24, name: 'Xander Xu', role: 'viewer', email: 'xander.xu@example.com', status: 'active', notes: 'Read-only for nightly runbooks.', last_active: '2026-04-20T07:42:00Z' },
    { id: 25, name: 'Yara Yates', role: 'editor', email: 'yara@example.com', status: 'active', notes: 'Mobile UI champion.', last_active: '2026-04-24T08:21:00Z' },
];

class TableViewExample extends Page {
    static pageName = 'components/table-view';
    static route = 'components/table-view';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TableViewExample.pageName,
            route: TableViewExample.route,
            title: 'TableView — data table',
            template: TableViewExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        // Pages are cached — build the seed Collection once on first init.
        const users = new Collection(SEED_USERS);

        this.table = new TableView({
            containerId: 'table-slot',
            collection: users,
            columns: [
                { key: 'id', label: 'ID', sortable: true },
                { key: 'name', label: 'Name', sortable: true },
                { key: 'email', label: 'Email', sortable: true, visibility: 'md' },
                {
                    key: 'role',
                    label: 'Role',
                    sortable: true,
                    formatter: 'badge:admin=primary,editor=info,viewer=secondary',
                    filter: { type: 'select', options: ['admin', 'editor', 'viewer'] },
                },
                {
                    key: 'status',
                    label: 'Status',
                    formatter: 'badge:active=success,invited=warning,disabled=secondary',
                    filter: { type: 'select', options: ['active', 'invited', 'disabled'] },
                    visibility: 'md',
                },
                { key: 'notes|truncate:40', label: 'Notes', visibility: 'lg' },
                { key: 'last_active|date', label: 'Last active', sortable: true, visibility: 'lg' },
            ],
            actions: ['view'],
            searchable: true,
            paginated: true,
            showAdd: false,
            showExport: false,
            tableOptions: { striped: true, hover: true, size: 'sm' },
            emptyMessage: 'No users match the current filters.',
            collectionParams: { sort: 'name', size: 10 },
        });

        this.addChild(this.table);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView</h1>
            <p class="example-summary">
                Sortable, filterable, paginated table bound to an in-memory Collection of ~25 users.
                Try the column headers, the filter dropdown, and the search box.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/TableView.md">
                    docs/web-mojo/components/TableView.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div data-container="table-slot"></div>
                </div>
                <div class="card-footer bg-light">
                    <small class="text-muted">
                        Seed data baked into the file — no backend required. Try sorting by Name,
                        filtering by Role or Status, or typing a query into the search box.
                    </small>
                </div>
            </div>
        </div>
    `;
}

export default TableViewExample;
