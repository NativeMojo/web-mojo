import { Page, TableView, FileList } from 'web-mojo';

/**
 * TableViewExample — canonical demo of TableView.
 *
 * Doc:    docs/web-mojo/components/TableView.md
 * Route:  components/table-view
 *
 * TableView is ListView's column-aware sibling. It renders a Collection as an
 * HTML table with a toolbar (search, refresh, export, fullscreen), sortable
 * columns, server-side pagination, row actions, and responsive column
 * visibility. Each row is its own per-model TableRow View, so changing a
 * single record only re-renders that row.
 *
 * This example binds the table to the built-in `FileList` collection (hits
 * `/api/fileman/file` on the backend at localhost:9009). On a fresh setup
 * with no files, the table renders the empty state — that's expected.
 */
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

        const files = new FileList();
        // Errors fetching from the backend should not crash the page.
        files.on('fetch:error', (err) => {
            // eslint-disable-next-line no-console
            console.warn('[TableViewExample] file fetch failed:', err);
        });

        this.table = new TableView({
            containerId: 'table-slot',
            collection: files,
            columns: [
                { key: 'id', label: 'ID', sortable: true },
                { key: 'filename', label: 'Filename', sortable: true },
                { key: 'category', label: 'Category', visibility: 'md', filter: {
                    type: 'select',
                    options: ['image', 'video', 'audio', 'pdf', 'document', 'archive', 'other'],
                } },
                { key: 'file_size|filesize', label: 'Size', sortable: true, visibility: 'md' },
                { key: 'created|date', label: 'Created', sortable: true, visibility: 'lg' },
            ],
            actions: ['view'],
            searchable: true,
            paginated: true,
            showAdd: false,
            showExport: true,
            tableOptions: { striped: true, hover: true, size: 'sm' },
            emptyMessage: 'No files yet — upload one in the Files admin page.',
            collectionParams: { sort: '-created', size: 10 },
        });

        this.addChild(this.table);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView</h1>
            <p class="example-summary">
                Sortable, filterable, paginated table bound to a Collection. Each row is a per-model View.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/components/TableView.md" target="_blank">
                    docs/web-mojo/components/TableView.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div data-container="table-slot"></div>
                </div>
            </div>
            <p class="text-muted small mt-3">
                <i class="bi bi-info-circle"></i>
                This example fetches <code>/api/fileman/file</code> on the backend at <code>localhost:9009</code>.
                If the backend is offline or has no files, an empty state is shown.
            </p>
        </div>
    `;
}

export default TableViewExample;
