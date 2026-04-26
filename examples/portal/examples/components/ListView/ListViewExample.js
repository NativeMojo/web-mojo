import { Page, ListView, Collection } from 'web-mojo';

/**
 * ListViewExample — canonical demo of ListView.
 *
 * Doc:    docs/web-mojo/components/ListView.md
 * Route:  components/list-view
 *
 * ListView renders a Collection as a list of child Views, one per model. It
 * accepts three input shapes — a Collection instance, a Collection class, or
 * a raw array (wrapped automatically in a generic Collection). This canonical
 * demo uses the Collection-from-array form so it works without a backend.
 *
 * Demonstrated:
 *   1. Inline `itemTemplate` with Mustache fields + `truncate` formatter
 *   2. `selectionMode: 'single'` + the `selection:change` event
 *   3. `data-action="select"` inside the item template wires click-to-select
 */
const SEED_USERS = [
    { id: 1, name: 'Alice Adams', role: 'Admin', email: 'alice@example.com', bio: 'Founding admin who keeps the lights on and the bills paid. Cat parent.' },
    { id: 2, name: 'Ben Bryant', role: 'Editor', email: 'ben@example.com', bio: 'Writes most of the marketing copy and the worst of the in-jokes.' },
    { id: 3, name: 'Carla Cruz', role: 'Viewer', email: 'carla@example.com', bio: 'Read-only access — auditing the docs corner of the workspace.' },
    { id: 4, name: 'Dan Dietrich', role: 'Editor', email: 'dan@example.com', bio: 'Owns the docs site. Has strong opinions about heading hierarchy.' },
    { id: 5, name: 'Eve Estrada', role: 'Admin', email: 'eve@example.com', bio: 'Security review lead — does not click suspicious links, ever.' },
    { id: 6, name: 'Grace Gomez', role: 'Editor', email: 'grace@example.com', bio: 'Release-notes whisperer. Keeps the changelog honest.' },
];

class ListViewExample extends Page {
    static pageName = 'components/list-view';
    static route = 'components/list-view';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ListViewExample.pageName,
            route: ListViewExample.route,
            title: 'ListView — collection-bound list',
            template: ListViewExample.TEMPLATE,
        });
        this.selectedName = '(nothing selected)';
    }

    async onInit() {
        await super.onInit();

        const users = new Collection(SEED_USERS);

        this.list = new ListView({
            containerId: 'list-slot',
            collection: users,
            itemTemplate: `
                <div class="d-flex align-items-center gap-3 p-3 border-bottom"
                     data-action="select" style="cursor:pointer;">
                    <i class="bi bi-person-circle fs-3 text-secondary"></i>
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center gap-2">
                            <strong>{{model.name}}</strong>
                            <span class="badge text-bg-light">{{model.role}}</span>
                        </div>
                        <div class="small text-muted">{{model.email}}</div>
                        <div class="small text-muted">{{model.bio|truncate:80}}</div>
                    </div>
                    <i class="bi bi-chevron-right text-muted"></i>
                </div>
            `,
            selectionMode: 'single',
            emptyMessage: 'No users to display.',
        });

        this.list.on('selection:change', ({ model }) => {
            this.selectedName = model ? model.get('name') : '(nothing selected)';
            if (this.isActive) this.render();
        });

        this.addChild(this.list);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>ListView</h1>
            <p class="example-summary">
                Renders a Collection as a list of child Views — one per model. Click a row to select.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/ListView.md">
                    docs/web-mojo/components/ListView.md
                </a>
            </p>

            <div class="card">
                <div class="card-body p-0">
                    <div data-container="list-slot"></div>
                </div>
                <div class="card-footer bg-light">
                    <small class="text-muted">Selected: <strong>{{selectedName}}</strong></small>
                </div>
            </div>
        </div>
    `;
}

export default ListViewExample;
