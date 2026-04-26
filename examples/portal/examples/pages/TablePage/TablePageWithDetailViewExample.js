import { TablePage, View, Collection } from 'web-mojo';

/**
 * TablePageWithDetailViewExample — TablePage with a custom detail View.
 *
 * Doc:    docs/web-mojo/pages/TablePage.md#item-view
 * Route:  pages/table-page/detail-view
 *
 * Setting `itemView` on a TablePage tells it to open this View — wrapped in
 * a Modal — when a row is clicked or the row's "view" action fires. The
 * View receives `{ model, collection }` in its constructor options and is
 * mounted with normal lifecycle hooks.
 *
 * The detail view here pulls every field off the model into a tidy two-column
 * layout, with a "Back to table" button that closes the dialog. TablePage
 * adds an `_item=<id>` query param while open, so the dialog is deep-linkable.
 */
const SEED_DEVICES = [
    { id: 'dev-001', label: 'Front Door Camera', type: 'camera', status: 'online', firmware: '4.2.1', last_seen: '2026-04-25T10:14:00Z', location: 'Lobby', notes: 'Replaced lens 2025-12.' },
    { id: 'dev-002', label: 'Garage Door', type: 'door', status: 'online', firmware: '2.0.3', last_seen: '2026-04-25T10:01:00Z', location: 'Garage', notes: 'Pairs with mobile app.' },
    { id: 'dev-003', label: 'Kitchen Sensor', type: 'sensor', status: 'offline', firmware: '1.7.0', last_seen: '2026-04-22T08:11:00Z', location: 'Kitchen', notes: 'Battery low — replace AA cells.' },
    { id: 'dev-004', label: 'Hallway Light', type: 'light', status: 'online', firmware: '3.1.0', last_seen: '2026-04-25T09:45:00Z', location: 'Hallway', notes: 'On schedule 06:00–22:00.' },
    { id: 'dev-005', label: 'Backyard Camera', type: 'camera', status: 'online', firmware: '4.2.1', last_seen: '2026-04-25T10:13:00Z', location: 'Backyard', notes: 'Night-vision enabled.' },
    { id: 'dev-006', label: 'Office Lock', type: 'lock', status: 'online', firmware: '5.0.2', last_seen: '2026-04-25T08:30:00Z', location: 'Office', notes: 'Auto-locks after 30s.' },
    { id: 'dev-007', label: 'Basement Sensor', type: 'sensor', status: 'online', firmware: '1.7.0', last_seen: '2026-04-25T09:55:00Z', location: 'Basement', notes: 'Water-leak detection.' },
    { id: 'dev-008', label: 'Attic Light', type: 'light', status: 'offline', firmware: '3.0.5', last_seen: '2026-04-19T14:00:00Z', location: 'Attic', notes: 'Likely bulb failure.' },
    { id: 'dev-009', label: 'Driveway Camera', type: 'camera', status: 'online', firmware: '4.2.1', last_seen: '2026-04-25T10:14:00Z', location: 'Driveway', notes: 'License plate capture on.' },
    { id: 'dev-010', label: 'Front Door Lock', type: 'lock', status: 'online', firmware: '5.0.2', last_seen: '2026-04-25T10:09:00Z', location: 'Lobby', notes: 'Primary entry — keypad enabled.' },
];

const STATUS_BADGE = { online: 'success', offline: 'danger' };

class DeviceDetailView extends View {
    constructor(options = {}) {
        super({
            ...options,
            template: DeviceDetailView.TEMPLATE,
        });
    }

    get statusBadge() {
        return STATUS_BADGE[this.model?.get('status')] || 'secondary';
    }

    /**
     * Closes the wrapping Modal. The View is rendered inside a Bootstrap
     * modal, so we walk the DOM up and trigger the dismiss button.
     */
    onActionBackToTable(event) {
        event.preventDefault();
        const modal = this.element.closest('.modal');
        modal?.querySelector('[data-bs-dismiss="modal"]')?.click();
    }

    static TEMPLATE = `
        <div class="p-3">
            <div class="d-flex align-items-center gap-3 mb-3">
                <i class="bi bi-cpu fs-2 text-primary"></i>
                <div class="flex-grow-1">
                    <h4 class="mb-0">{{model.label}}</h4>
                    <div class="text-muted small">{{model.id}} &middot; {{model.type}}</div>
                </div>
                <span class="badge text-bg-{{statusBadge}}">{{model.status}}</span>
            </div>

            <dl class="row mb-0 small">
                <dt class="col-4 text-muted">Location</dt>
                <dd class="col-8">{{model.location}}</dd>

                <dt class="col-4 text-muted">Firmware</dt>
                <dd class="col-8"><code>{{model.firmware}}</code></dd>

                <dt class="col-4 text-muted">Last seen</dt>
                <dd class="col-8">{{model.last_seen|date}}</dd>

                <dt class="col-4 text-muted">Notes</dt>
                <dd class="col-8">{{model.notes}}</dd>
            </dl>

            <div class="mt-4 text-end">
                <button class="btn btn-secondary" data-action="back-to-table">
                    <i class="bi bi-arrow-left"></i> Back to table
                </button>
            </div>
        </div>
    `;
}

class TablePageWithDetailViewExample extends TablePage {
    static pageName = 'pages/table-page/detail-view';
    static route = 'pages/table-page/detail-view';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TablePageWithDetailViewExample.pageName,
            route: TablePageWithDetailViewExample.route,
            title: 'TablePage — with detail view',
            description: 'Click a row to open the device in a Modal-hosted detail View. URL gets an _item param.',

            collection: new Collection(SEED_DEVICES),
            defaultQuery: { sort: 'label', size: 8 },

            itemView: DeviceDetailView,

            columns: [
                { key: 'id', label: 'Device ID', sortable: true },
                { key: 'label', label: 'Name', sortable: true },
                {
                    key: 'type',
                    label: 'Type',
                    sortable: true,
                    visibility: 'md',
                    filter: { type: 'select', options: ['camera', 'door', 'sensor', 'light', 'lock'] },
                },
                {
                    key: 'status',
                    label: 'Status',
                    sortable: true,
                    formatter: 'badge:online=success,offline=danger',
                    filter: { type: 'select', options: ['online', 'offline'] },
                },
                { key: 'location', label: 'Location', visibility: 'md' },
                { key: 'last_seen|date', label: 'Last seen', sortable: true, visibility: 'lg' },
            ],

            actions: ['view'],
            searchable: true,
            paginated: true,
            showAdd: false,
            showExport: false,
            clickAction: 'view',
            tableOptions: { striped: true, hover: true, size: 'sm' },
            urlSyncEnabled: true,
        });
    }
}

export default TablePageWithDetailViewExample;
