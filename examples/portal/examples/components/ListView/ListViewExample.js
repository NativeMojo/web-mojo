import { Page, ListView, Collection } from 'web-mojo';

/**
 * ListViewExample — canonical demo of ListView.
 *
 * Doc:    docs/web-mojo/components/ListView.md
 * Route:  components/list-view
 *
 * ListView renders a Collection as a list of child Views, one per model. It
 * supports three input shapes — a Collection instance, a Collection class, or
 * a raw array (wrapped automatically in a generic Collection). This example
 * uses the raw-array form so it works without the backend running.
 *
 * Demonstrated:
 *   1. Inline `itemTemplate` with Mustache formatters
 *   2. `selectionMode: 'single'` + the `selection:change` event
 *   3. `data-action="select"` inside the item template wires click-to-select
 */
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

        const users = new Collection([
            { id: 1, name: 'Alice Adams', role: 'Admin', email: 'alice@example.com' },
            { id: 2, name: 'Ben Bryant', role: 'Editor', email: 'ben@example.com' },
            { id: 3, name: 'Carla Cruz', role: 'Viewer', email: 'carla@example.com' },
            { id: 4, name: 'Dan Dietrich', role: 'Editor', email: 'dan@example.com' },
        ]);

        this.list = new ListView({
            containerId: 'list-slot',
            collection: users,
            itemTemplate: `
                <div class="d-flex align-items-center gap-3 p-3 border-bottom" data-action="select" style="cursor:pointer;">
                    <i class="bi bi-person-circle fs-3 text-secondary"></i>
                    <div class="flex-grow-1">
                        <strong>{{name}}</strong>
                        <div class="small text-muted">{{email}}</div>
                    </div>
                    <span class="badge text-bg-light">{{role}}</span>
                </div>
            `,
            selectionMode: 'single',
            emptyMessage: 'No users to display.',
        });

        this.list.on('selection:change', ({ model }) => {
            this.selectedName = model ? model.get('name') : '(nothing selected)';
            this.render();
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
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/components/ListView.md" target="_blank">
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
