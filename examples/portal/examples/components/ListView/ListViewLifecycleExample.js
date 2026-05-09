import { Page, ListView, Collection, Model } from 'web-mojo';

/**
 * ListViewLifecycleExample — full Add / View / Edit / Delete flow on a
 * plain visual ListView (no TableView, no `<table>` markup).
 *
 * Doc:    docs/web-mojo/components/ListView.md#click-anywhere-on-the-row--model-lifecycle
 * Route:  components/list-view/lifecycle
 *
 * Demonstrates everything ListView inherits from the Model lifecycle:
 *
 *   - `clickAction: 'view'` — clicking the card body opens the view dialog
 *     (falls back to Modal.data when no itemView / Model.VIEW_CLASS is set).
 *   - `data-action="edit"` / `data-action="delete"` buttons in the item
 *     template fire the same Edit / Delete dialogs without per-page wiring.
 *   - `showAdd: true` renders the green "Add" button in the toolbar.
 *   - `Model.ADD_FORM` / `Model.EDIT_FORM` / `Model.DELETE_TEMPLATE`
 *     static properties drive the dialog fields without any per-page
 *     `addForm` / `editForm` / `deleteTemplate` config.
 *
 * Persistence is local — `BookModel.save()` and `.destroy()` mutate the
 * preloaded Collection in memory so the example runs without a backend.
 */

// Shared form-field definition used by both ADD_FORM and EDIT_FORM.
const BOOK_FORM_FIELDS = [
    { name: 'title',  label: 'Title',  type: 'text', required: true },
    { name: 'author', label: 'Author', type: 'text', required: true },
    {
        name: 'topic',
        label: 'Topic',
        type: 'select',
        options: ['databases', 'patterns', 'ops', 'general']
    }
];

class BookModel extends Model {
    // Static form / template config — ListView's getAddFormConfig /
    // getEditFormConfig / DELETE_TEMPLATE fallbacks pick these up
    // automatically when the page doesn't override them.
    static ADD_FORM = { title: 'Add Book', fields: BOOK_FORM_FIELDS };
    static EDIT_FORM = { title: 'Edit Book', fields: BOOK_FORM_FIELDS };
    static DELETE_TEMPLATE = 'Delete <strong>{{title}}</strong> by {{author}}?';

    // Mock save: merge attrs locally + assign an id on first save. ListView
    // expects `{ success: true, data: { status: 'ok' } }` for the dialog
    // flow to succeed; matches the real Rest contract.
    async save(data) {
        if (data) this.set(data);
        if (!this.id) this.set({ id: Date.now() });
        return { success: true, data: { status: 'ok' } };
    }

    // Mock destroy: remove this model from its parent Collection so the
    // ListView's _buildItems re-render drops the row. Match the real
    // Rest response shape for parity.
    async destroy() {
        if (this.collection) this.collection.remove(this);
        return { success: true, data: { status: 'ok' } };
    }
}

class BookCollection extends Collection {
    constructor(data = []) {
        super({ ModelClass: BookModel, preloaded: true }, data);
    }
}

const SEED_BOOKS = [
    { id: 1, title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', topic: 'databases' },
    { id: 2, title: 'The Pragmatic Programmer',              author: 'Andrew Hunt, David Thomas', topic: 'general' },
    { id: 3, title: 'Refactoring',                            author: 'Martin Fowler',  topic: 'patterns' },
    { id: 4, title: 'Clean Architecture',                     author: 'Robert C. Martin', topic: 'patterns' },
    { id: 5, title: 'Site Reliability Engineering',           author: 'Beyer, Jones, Petoff, Murphy', topic: 'ops' },
    { id: 6, title: 'Database Internals',                     author: 'Alex Petrov',    topic: 'databases' }
];

class ListViewLifecycleExample extends Page {
    static pageName = 'components/list-view/lifecycle';
    static route = 'components/list-view/lifecycle';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ListViewLifecycleExample.pageName,
            route: ListViewLifecycleExample.route,
            title: 'ListView — lifecycle',
            template: ListViewLifecycleExample.TEMPLATE
        });
    }

    async onInit() {
        await super.onInit();

        this.collection = new BookCollection(SEED_BOOKS);

        this.list = new ListView({
            containerId: 'list-slot',
            collection: this.collection,

            title: 'Books',
            eyebrow: 'Reading list',

            // Toolbar Add button — uses BookModel.ADD_FORM by default.
            showAdd: true,
            addButtonLabel: 'Add Book',

            // Click anywhere on a card to open the view dialog. Falls back
            // to Modal.data since BookModel has no VIEW_CLASS — that auto-
            // generates a "View Book #N" dialog with the model's fields.
            clickAction: 'view',
            fetchOnView: false, // preloaded data — don't refetch from server

            itemTemplate: `
                <div class="d-flex align-items-center gap-3 p-3 border-bottom list-view-lifecycle-item">
                    <i class="bi bi-book fs-3 text-secondary"></i>
                    <div class="flex-grow-1">
                        <strong>{{model.title}}</strong>
                        <div class="small text-muted">{{model.author}}</div>
                    </div>
                    <span class="badge text-bg-light me-2">{{model.topic}}</span>
                    <div class="btn-group btn-group-sm" role="group" aria-label="Book actions">
                        <button class="btn btn-outline-secondary" data-action="edit" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" data-action="delete" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `,
            emptyMessage: 'No books yet — click "Add Book" to add one.'
        });
        this.addChild(this.list);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>ListView — lifecycle</h1>
            <p class="example-summary">
                Full <strong>Add / View / Edit / Delete</strong> flow on a plain
                visual ListView. Click any card to view it, use the inline
                buttons to edit or delete, and click "Add Book" in the toolbar
                to create a new entry. The dialog fields come from
                <code>BookModel.ADD_FORM</code> / <code>EDIT_FORM</code> /
                <code>DELETE_TEMPLATE</code> — no per-page form config needed.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/ListView.md">
                    docs/web-mojo/components/ListView.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div data-container="list-slot"></div>
                </div>
            </div>
        </div>
    `;
}

export default ListViewLifecycleExample;
