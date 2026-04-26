import { Page, TableView, UserList } from 'web-mojo';

/**
 * TableViewServerExample — TableView bound to a real server-backed Collection.
 *
 * Doc:    docs/web-mojo/components/TableView.md#server-collections
 * Route:  components/table-view/server-collection
 *
 * Where the other TableView examples use seed data, this one talks to the
 * NativeMojo backend at `localhost:9009`. It uses the built-in `UserList`
 * collection (`/api/user`) and demonstrates:
 *
 *   1. `collectionParams` — preset sort + page size sent on the first fetch
 *   2. Server-side filter pills — a Role filter on the `is_admin` field
 *   3. `fetch:error` handling — surfaces the error in the page footer
 *   4. Manual `refresh` action that re-fetches from the server
 *
 * The component degrades gracefully — if the backend is offline, the table
 * shows the empty state and the footer notes the error.
 */
class TableViewServerExample extends Page {
    static pageName = 'components/table-view/server-collection';
    static route = 'components/table-view/server-collection';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TableViewServerExample.pageName,
            route: TableViewServerExample.route,
            title: 'TableView — server collection',
            template: TableViewServerExample.TEMPLATE,
        });
        this.lastFetchInfo = 'Loading…';
        this.lastError = null;
    }

    async onInit() {
        await super.onInit();

        this.users = new UserList();

        this.users.on('fetch:success', () => {
            const meta = this.users.meta || {};
            const shown = this.users.length();
            const total = meta.count ?? shown;
            this.lastFetchInfo = `Loaded ${shown} of ${total} user(s)`;
            this.lastError = null;
            if (this.isActive) this.render();
        });

        this.users.on('fetch:error', (err) => {
            // eslint-disable-next-line no-console
            console.warn('[TableViewServerExample] fetch failed:', err);
            this.lastError = err?.message || 'Failed to fetch /api/user — is the backend running on localhost:9009?';
            this.lastFetchInfo = '(error fetching)';
            if (this.isActive) this.render();
        });

        this.table = new TableView({
            containerId: 'table-slot',
            collection: this.users,
            columns: [
                { key: 'id', label: 'ID', sortable: true },
                { key: 'username', label: 'Username', sortable: true },
                { key: 'display_name', label: 'Name', sortable: true, visibility: 'md' },
                { key: 'email', label: 'Email', sortable: true, visibility: 'md' },
                {
                    key: 'is_admin',
                    label: 'Admin',
                    visibility: 'md',
                    formatter: 'boolean',
                    filter: { type: 'boolean' },
                },
                {
                    key: 'is_active',
                    label: 'Active',
                    visibility: 'lg',
                    formatter: 'boolean',
                    filter: { type: 'boolean' },
                },
                { key: 'created|date', label: 'Created', sortable: true, visibility: 'lg' },
            ],
            actions: ['view'],
            searchable: true,
            paginated: true,
            showAdd: false,
            showExport: true,
            tableOptions: { striped: true, hover: true, size: 'sm' },
            emptyMessage: 'No users returned. The backend may be offline or the User table empty.',
            collectionParams: { sort: '-created', size: 10 },
        });

        this.addChild(this.table);
    }

    /**
     * Re-fetch the current page from the server. Provides a visible refresh
     * affordance in the footer in addition to the toolbar's built-in refresh.
     */
    async onActionRefreshServer(event) {
        event.preventDefault();
        this.lastFetchInfo = 'Refreshing…';
        this.lastError = null;
        if (this.isActive) this.render();
        await this.users.fetch();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView — server collection</h1>
            <p class="example-summary">
                The same TableView, bound to <code>UserList</code> — a built-in Collection that
                hits <code>/api/user</code>. Sort, search, page, and the role filter all translate
                into query parameters on the next request.
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
                <div class="card-footer bg-light d-flex justify-content-between align-items-center">
                    <small class="text-muted">
                        <i class="bi bi-cloud-arrow-down me-1"></i>
                        <strong>{{lastFetchInfo}}</strong>
                        {{#lastError}}
                            <span class="text-danger ms-2">— {{lastError}}</span>
                        {{/lastError}}
                    </small>
                    <button class="btn btn-sm btn-outline-secondary" data-action="refresh-server">
                        <i class="bi bi-arrow-clockwise"></i> Re-fetch
                    </button>
                </div>
            </div>

            <p class="text-muted small mt-3">
                <i class="bi bi-info-circle"></i>
                This example fetches <code>/api/user</code> on the backend at <code>localhost:9009</code>.
                If the backend is offline the empty state is shown and the footer displays the error.
            </p>
        </div>
    `;
}

export default TableViewServerExample;
