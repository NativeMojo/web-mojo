import { Page, TableView, FileList } from 'web-mojo';

/**
 * TableViewBatchActionsExample — multi-select rows + a bulk-action toolbar.
 *
 * Doc:    docs/web-mojo/components/TableView.md#batch-actions
 * Route:  components/table-view/batch-actions
 *
 * Setting `selectionMode: 'multiple'` adds a checkbox column and a
 * "Select all" header checkbox. When at least one row is selected, the
 * batch-action toolbar slides in with the buttons defined in `batchActions`.
 * Clicking one fires the `batch:action` event with `{ action, items }`.
 *
 * This example keeps the action handlers harmless — they just log the
 * selection and clear it — so it's safe to run against a real backend.
 */
class TableViewBatchActionsExample extends Page {
    static pageName = 'components/table-view/batch-actions';
    static route = 'components/table-view/batch-actions';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TableViewBatchActionsExample.pageName,
            route: TableViewBatchActionsExample.route,
            title: 'TableView — batch actions',
            template: TableViewBatchActionsExample.TEMPLATE,
        });
        this.lastBatch = '(no batch action yet)';
    }

    async onInit() {
        await super.onInit();

        const files = new FileList();
        files.on('fetch:error', (err) => {
            // eslint-disable-next-line no-console
            console.warn('[TableViewBatchActions] file fetch failed:', err);
        });

        this.table = new TableView({
            containerId: 'table-slot',
            collection: files,
            columns: [
                { key: 'id', label: 'ID', sortable: true },
                { key: 'filename', label: 'Filename', sortable: true },
                { key: 'category', label: 'Category', visibility: 'md' },
                { key: 'file_size|filesize', label: 'Size', visibility: 'md' },
            ],
            selectionMode: 'multiple',
            batchActions: [
                { action: 'tag', label: 'Tag selected', icon: 'bi bi-tag' },
                { action: 'archive', label: 'Archive selected', icon: 'bi bi-archive' },
                { action: 'delete', label: 'Delete selected', icon: 'bi bi-trash', variant: 'danger' },
            ],
            batchBarLocation: 'top',
            searchable: true,
            paginated: true,
            showAdd: false,
            showExport: false,
            actions: null,
            tableOptions: { striped: true, hover: true, size: 'sm' },
            emptyMessage: 'No files yet — selection demo still works once data is loaded.',
            collectionParams: { sort: '-created', size: 10 },
        });

        this.table.on('batch:action', ({ action, items }) => {
            const names = items.map(i => i.model.get('filename') || i.model.id).join(', ') || '(none)';
            this.lastBatch = `${action} on ${items.length} item(s): ${names}`;
            this.table.clearSelection();
            this.render();
        });

        this.addChild(this.table);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView — batch actions</h1>
            <p class="example-summary">
                Multi-select rows with <code>selectionMode: 'multiple'</code>. Selecting any row reveals the batch-action toolbar.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/components/TableView.md#batch-actions" target="_blank">
                    docs/web-mojo/components/TableView.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div data-container="table-slot"></div>
                </div>
                <div class="card-footer bg-light">
                    <small class="text-muted">Last batch action: <strong>{{lastBatch}}</strong></small>
                </div>
            </div>
        </div>
    `;
}

export default TableViewBatchActionsExample;
