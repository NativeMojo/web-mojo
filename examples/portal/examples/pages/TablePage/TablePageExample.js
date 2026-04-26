import { TablePage, Collection } from 'web-mojo';

/**
 * TablePageExample — canonical demo of TablePage with URL sync.
 *
 * Doc:    docs/web-mojo/components/TablePage.md
 * Route:  pages/table-page
 *
 * TablePage is a Page subclass that owns a Collection and a TableView and
 * keeps their state in sync with the URL. Sort, search, page, and filter
 * changes update the query string, and the page restores from the URL on
 * entry — so a table view is bookmarkable and back/forward-friendly.
 *
 * This demo uses an in-memory Collection of seed orders (no backend needed).
 * Try sorting columns or searching — the URL query string changes live.
 */
const SEED_ORDERS = [
    { id: 1001, customer: 'Alice Adams', total: 124.50, status: 'paid', region: 'NA', created: '2026-04-25T10:14:00Z' },
    { id: 1002, customer: 'Ben Bryant', total: 79.00, status: 'pending', region: 'NA', created: '2026-04-24T18:02:00Z' },
    { id: 1003, customer: 'Carla Cruz', total: 244.10, status: 'paid', region: 'EU', created: '2026-04-23T09:21:00Z' },
    { id: 1004, customer: 'Dan Dietrich', total: 19.99, status: 'refunded', region: 'EU', created: '2026-04-22T15:44:00Z' },
    { id: 1005, customer: 'Eve Estrada', total: 312.00, status: 'paid', region: 'NA', created: '2026-04-21T08:00:00Z' },
    { id: 1006, customer: 'Frank Fischer', total: 58.25, status: 'pending', region: 'EU', created: '2026-04-20T11:33:00Z' },
    { id: 1007, customer: 'Grace Gomez', total: 187.40, status: 'paid', region: 'NA', created: '2026-04-19T12:01:00Z' },
    { id: 1008, customer: 'Hank Huang', total: 22.75, status: 'pending', region: 'APAC', created: '2026-04-18T17:18:00Z' },
    { id: 1009, customer: 'Iris Ito', total: 401.00, status: 'paid', region: 'APAC', created: '2026-04-17T07:55:00Z' },
    { id: 1010, customer: 'Jack Jensen', total: 67.00, status: 'cancelled', region: 'NA', created: '2026-04-16T14:09:00Z' },
    { id: 1011, customer: 'Kira Klein', total: 145.30, status: 'paid', region: 'EU', created: '2026-04-15T16:42:00Z' },
    { id: 1012, customer: 'Liam Lopez', total: 98.10, status: 'paid', region: 'NA', created: '2026-04-14T19:30:00Z' },
    { id: 1013, customer: 'Mia Morales', total: 33.55, status: 'refunded', region: 'NA', created: '2026-04-13T08:15:00Z' },
    { id: 1014, customer: 'Noah Nelson', total: 209.00, status: 'paid', region: 'APAC', created: '2026-04-12T09:48:00Z' },
    { id: 1015, customer: 'Olivia Ortiz', total: 86.45, status: 'pending', region: 'EU', created: '2026-04-11T20:11:00Z' },
    { id: 1016, customer: 'Paul Park', total: 17.00, status: 'cancelled', region: 'APAC', created: '2026-04-10T06:00:00Z' },
    { id: 1017, customer: 'Quinn Quan', total: 154.85, status: 'paid', region: 'NA', created: '2026-04-09T11:00:00Z' },
    { id: 1018, customer: 'Riya Reddy', total: 277.00, status: 'paid', region: 'APAC', created: '2026-04-08T05:33:00Z' },
    { id: 1019, customer: 'Sam Suzuki', total: 41.20, status: 'refunded', region: 'APAC', created: '2026-04-07T13:24:00Z' },
    { id: 1020, customer: 'Tara Thompson', total: 366.00, status: 'paid', region: 'NA', created: '2026-04-06T22:08:00Z' },
];

class TablePageExample extends TablePage {
    static pageName = 'pages/table-page';
    static route = 'pages/table-page';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TablePageExample.pageName,
            route: TablePageExample.route,
            title: 'TablePage — URL-synced table',
            description: 'Sort, filter, search, and page state mirror the URL.',

            // Pre-built in-memory Collection — no Collection class needed.
            collection: new Collection(SEED_ORDERS),
            defaultQuery: { sort: '-created', size: 10 },

            columns: [
                { key: 'id', label: 'Order #', sortable: true },
                { key: 'customer', label: 'Customer', sortable: true },
                {
                    key: 'status',
                    label: 'Status',
                    sortable: true,
                    formatter: 'badge:paid=success,pending=warning,refunded=secondary,cancelled=danger',
                    filter: { type: 'select', options: ['paid', 'pending', 'refunded', 'cancelled'] },
                },
                {
                    key: 'region',
                    label: 'Region',
                    visibility: 'md',
                    filter: { type: 'select', options: ['NA', 'EU', 'APAC'] },
                },
                { key: 'total|currency', label: 'Total', sortable: true, visibility: 'md', footer_total: true },
                { key: 'created|date', label: 'Created', sortable: true, visibility: 'lg' },
            ],

            actions: ['view'],
            searchable: true,
            paginated: true,
            showAdd: false,
            showExport: true,
            showStatus: true,
            tableOptions: { striped: true, hover: true, size: 'sm' },
            emptyMessage: 'No orders match the current filters.',

            urlSyncEnabled: true,
        });
    }
}

export default TablePageExample;
