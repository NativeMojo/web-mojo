import { Page, TableView, Collection } from 'web-mojo';

/**
 * TableViewBatchActionsExample — multi-select rows + bulk-action toolbar.
 *
 * Doc:    docs/web-mojo/components/TableView.md#batch-actions
 * Route:  components/table-view/batch-actions
 *
 * Setting `selectionMode: 'multiple'` adds a checkbox column and a
 * "Select all" header checkbox. When at least one row is selected, the
 * batch-action toolbar slides in with the buttons defined in `batchActions`.
 * Clicking one fires the `batch:action` event with `{ action, items }`.
 *
 * This demo wires the actions to **real in-memory state**:
 *   - "Tag" applies a tag to each selected row's model
 *   - "Archive" sets `archived: true` on each selected model
 *   - "Delete" actually removes the rows from the Collection
 *
 * The Collection's add/remove events drive TableRow re-renders for free.
 */
const SEED_TASKS = [
    { id: 1, title: 'Refresh staging certificates', owner: 'Iris Ito', priority: 'high', archived: false, tags: [] },
    { id: 2, title: 'Triage inbound support tickets', owner: 'Grace Gomez', priority: 'medium', archived: false, tags: [] },
    { id: 3, title: 'Audit S3 bucket policies', owner: 'Eve Estrada', priority: 'high', archived: false, tags: [] },
    { id: 4, title: 'Write Q2 release notes', owner: 'Ben Bryant', priority: 'low', archived: false, tags: [] },
    { id: 5, title: 'Migrate jobs queue to v3', owner: 'Noah Nelson', priority: 'high', archived: false, tags: [] },
    { id: 6, title: 'Onboard 4 new editors', owner: 'Alice Adams', priority: 'medium', archived: false, tags: [] },
    { id: 7, title: 'Spike: GraphQL gateway', owner: 'Liam Lopez', priority: 'low', archived: false, tags: [] },
    { id: 8, title: 'Add WebAuthn fallback', owner: 'Riya Reddy', priority: 'medium', archived: false, tags: [] },
    { id: 9, title: 'Localize signup flow (DE)', owner: 'Tara Thompson', priority: 'low', archived: false, tags: [] },
    { id: 10, title: 'Quarterly access review', owner: 'Wren Walsh', priority: 'high', archived: false, tags: [] },
    { id: 11, title: 'Refactor TableView toolbar CSS', owner: 'Olivia Ortiz', priority: 'low', archived: false, tags: [] },
    { id: 12, title: 'Add SAML group sync', owner: 'Iris Ito', priority: 'medium', archived: false, tags: [] },
];

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

        this.tasks = new Collection(SEED_TASKS);

        this.table = new TableView({
            containerId: 'table-slot',
            collection: this.tasks,
            columns: [
                { key: 'id', label: 'ID', sortable: true },
                { key: 'title', label: 'Title', sortable: true },
                { key: 'owner', label: 'Owner', sortable: true, visibility: 'md' },
                {
                    key: 'priority',
                    label: 'Priority',
                    sortable: true,
                    formatter: 'badge:high=danger,medium=warning,low=secondary',
                    filter: { type: 'select', options: ['high', 'medium', 'low'] },
                },
                {
                    key: 'tags',
                    label: 'Tags',
                    visibility: 'lg',
                    formatter: (value) => Array.isArray(value) && value.length
                        ? value.map(t => `<span class="badge text-bg-light me-1">${t}</span>`).join('')
                        : '<span class="text-muted small">—</span>',
                },
                {
                    key: 'archived',
                    label: 'Archived',
                    visibility: 'md',
                    formatter: (v) => v
                        ? '<span class="badge text-bg-secondary">archived</span>'
                        : '<span class="text-muted small">—</span>',
                },
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
            emptyMessage: 'All tasks deleted — refresh the page to restore the seed data.',
            collectionParams: { sort: 'priority', size: 10 },
        });

        this.table.on('batch:action', ({ action, items }) => this.handleBatch(action, items));

        this.addChild(this.table);
    }

    handleBatch(action, items) {
        const titles = items.map(i => i.model.get('title')).join(', ') || '(none)';

        if (action === 'delete') {
            const ids = items.map(i => i.model.id);
            this.tasks.remove(ids);
        } else if (action === 'archive') {
            items.forEach(i => i.model.set({ archived: true }));
        } else if (action === 'tag') {
            items.forEach(i => {
                const existing = i.model.get('tags') || [];
                if (!existing.includes('reviewed')) {
                    i.model.set({ tags: [...existing, 'reviewed'] });
                }
            });
        }

        this.lastBatch = `${action} on ${items.length} task(s): ${titles}`;
        this.table.clearSelection();
        this.table.render();
        if (this.isActive) this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView — batch actions</h1>
            <p class="example-summary">
                Multi-select rows with <code>selectionMode: 'multiple'</code>. Selecting any row reveals
                the batch-action toolbar. The handlers in this demo really mutate the in-memory Collection
                — Delete removes rows, Archive toggles a flag, Tag pushes a tag onto each model.
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
                    <small class="text-muted">Last batch action: <strong>{{lastBatch}}</strong></small>
                </div>
            </div>
        </div>
    `;
}

export default TableViewBatchActionsExample;
