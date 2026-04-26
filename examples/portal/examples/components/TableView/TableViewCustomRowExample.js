import { Page, TableView, TableRow, Collection } from 'web-mojo';

/**
 * TableViewCustomRowExample — custom `itemClass` (TableRow subclass).
 *
 * Doc:    docs/web-mojo/components/TableView.md#custom-rows
 * Route:  components/table-view/custom-row
 *
 * Pass a custom `itemClass` to render rows that don't fit the standard
 * "one cell per column" mold. Here, `ContactRow` overrides `buildRowTemplate`
 * to render a single rich cell (avatar + name/email + status badge) and an
 * expand-on-click area that reveals more detail underneath.
 *
 * The `data-action="toggle-details"` is wired to `onActionToggleDetails` on
 * the row instance — a regular View action handler. No DOM listeners.
 */
const SEED_CONTACTS = [
    { id: 1, name: 'Alice Adams', email: 'alice@example.com', role: 'Admin', status: 'active', phone: '+1 415 555 0100', org: 'Founders', timezone: 'America/Los_Angeles' },
    { id: 2, name: 'Ben Bryant', email: 'ben@example.com', role: 'Editor', status: 'active', phone: '+1 415 555 0101', org: 'Marketing', timezone: 'America/New_York' },
    { id: 3, name: 'Carla Cruz', email: 'carla@example.com', role: 'Viewer', status: 'invited', phone: '+1 415 555 0102', org: 'Customer Success', timezone: 'Europe/Madrid' },
    { id: 4, name: 'Dan Dietrich', email: 'dan@example.com', role: 'Editor', status: 'active', phone: '+1 415 555 0103', org: 'Docs', timezone: 'Europe/Berlin' },
    { id: 5, name: 'Eve Estrada', email: 'eve@example.com', role: 'Admin', status: 'active', phone: '+1 415 555 0104', org: 'Security', timezone: 'America/Denver' },
    { id: 6, name: 'Grace Gomez', email: 'grace@example.com', role: 'Editor', status: 'active', phone: '+1 415 555 0105', org: 'Marketing', timezone: 'America/Chicago' },
    { id: 7, name: 'Hank Huang', email: 'hank@example.com', role: 'Viewer', status: 'active', phone: '+1 415 555 0106', org: 'Compliance', timezone: 'Asia/Singapore' },
    { id: 8, name: 'Iris Ito', email: 'iris@example.com', role: 'Admin', status: 'active', phone: '+1 415 555 0107', org: 'Infra', timezone: 'Asia/Tokyo' },
    { id: 9, name: 'Jack Jensen', email: 'jack@example.com', role: 'Editor', status: 'invited', phone: '+1 415 555 0108', org: 'Sales', timezone: 'America/New_York' },
    { id: 10, name: 'Kira Klein', email: 'kira@example.com', role: 'Viewer', status: 'active', phone: '+1 415 555 0109', org: 'Partner', timezone: 'Europe/Berlin' },
    { id: 11, name: 'Liam Lopez', email: 'liam@example.com', role: 'Editor', status: 'active', phone: '+1 415 555 0110', org: 'Design', timezone: 'America/Los_Angeles' },
    { id: 12, name: 'Mia Morales', email: 'mia@example.com', role: 'Viewer', status: 'disabled', phone: '+1 415 555 0111', org: 'Audit', timezone: 'America/New_York' },
];

const STATUS_BADGE = {
    active: 'success',
    invited: 'warning',
    disabled: 'secondary',
};

class ContactRow extends TableRow {
    constructor(options = {}) {
        super(options);
        this.expanded = false;
    }

    /**
     * Override the standard cell-per-column template with one rich cell.
     * Uses `colspan` to span the full width regardless of column count.
     */
    buildRowTemplate() {
        return `
            <td colspan="1" class="p-3">
                <div class="d-flex align-items-center gap-3">
                    <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                         style="width:42px;height:42px;font-weight:600;">
                        {{model.name|initials}}
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center gap-2">
                            <strong>{{model.name}}</strong>
                            <span class="badge text-bg-{{statusClass}}">{{model.status}}</span>
                            <span class="badge text-bg-light">{{model.role}}</span>
                        </div>
                        <div class="small text-muted">{{model.email}} &middot; {{model.org}}</div>
                    </div>
                    <button class="btn btn-sm btn-outline-secondary" data-action="toggle-details">
                        <i class="bi bi-chevron-{{toggleIcon}}"></i>
                        {{toggleLabel}}
                    </button>
                </div>
                {{#expanded|bool}}
                    <div class="mt-3 ps-5 border-top pt-3 small">
                        <div><strong>Phone:</strong> {{model.phone}}</div>
                        <div><strong>Timezone:</strong> {{model.timezone}}</div>
                        <div><strong>Organisation:</strong> {{model.org}}</div>
                    </div>
                {{/expanded|bool}}
            </td>
        `;
    }

    // Expose computed view-side helpers for the template.
    get statusClass() { return STATUS_BADGE[this.model?.get('status')] || 'secondary'; }
    get toggleIcon() { return this.expanded ? 'up' : 'down'; }
    get toggleLabel() { return this.expanded ? 'Hide' : 'Details'; }

    onActionToggleDetails(event) {
        event.stopPropagation();
        this.expanded = !this.expanded;
        this.render();
    }
}

class TableViewCustomRowExample extends Page {
    static pageName = 'components/table-view/custom-row';
    static route = 'components/table-view/custom-row';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TableViewCustomRowExample.pageName,
            route: TableViewCustomRowExample.route,
            title: 'TableView — custom row class',
            template: TableViewCustomRowExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        const contacts = new Collection(SEED_CONTACTS);

        this.table = new TableView({
            containerId: 'table-slot',
            collection: contacts,
            // Single column drives `colspan="1"` in ContactRow; the row owns
            // its own layout. We still get the toolbar, search, and pagination.
            columns: [{ key: 'name', label: 'Contact', sortable: true }],
            itemClass: ContactRow,
            actions: null,
            searchable: true,
            paginated: true,
            showAdd: false,
            showExport: false,
            tableOptions: { hover: true },
            emptyMessage: 'No contacts to show.',
            collectionParams: { sort: 'name', size: 6 },
        });

        this.addChild(this.table);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView — custom row class</h1>
            <p class="example-summary">
                Pass <code>itemClass: ContactRow</code> to fully control row markup.
                Each row is its own View, so a per-row state flag (<code>expanded</code>)
                + <code>this.render()</code> gives expand-on-click for free.
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
                        The toolbar (search, pagination) still works — only the row markup is custom.
                    </small>
                </div>
            </div>
        </div>
    `;
}

export default TableViewCustomRowExample;
