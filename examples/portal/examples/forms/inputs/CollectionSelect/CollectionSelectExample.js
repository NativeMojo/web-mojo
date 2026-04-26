import { Page, FormView, UserList } from 'web-mojo';

/**
 * CollectionSelectExample — canonical demo of `collection` and
 * `collectionmultiselect` field types, both bound to a built-in Collection.
 *
 * Doc:    docs/web-mojo/forms/inputs/CollectionSelect.md
 *         docs/web-mojo/forms/inputs/CollectionMultiSelect.md
 * Route:  forms/inputs/collection-select
 *
 * What this shows:
 *   1. Both variants in one form: `collection` (single value) and
 *      `collectionmultiselect` (array of values), each bound to `UserList`.
 *   2. The Collection class is passed as the capital-C `Collection` prop —
 *      the field type instantiates and fetches it itself; you don't pre-fetch.
 *   3. `labelField` / `valueField` map model fields to dropdown rows.
 *      `valueField: 'id'` → `getFormData()` returns the user's id (single)
 *      or array of ids (multi).
 *   4. `emptyFetch: true` pre-loads the list on mount so the multi-select
 *      shows rows immediately instead of waiting for a search keystroke.
 *
 * Backend: this page hits `/api/user` via the built-in `UserList` collection.
 * Examples that use Collections need `localhost:9009` running.
 */
class CollectionSelectExample extends Page {
    static pageName = 'forms/inputs/collection-select';
    static route = 'forms/inputs/collection-select';

    constructor(options = {}) {
        super({
            ...options,
            pageName: CollectionSelectExample.pageName,
            route: CollectionSelectExample.route,
            title: 'CollectionSelect — bind to a Collection',
            template: CollectionSelectExample.TEMPLATE,
        });
        this.snapshot = null;
    }

    async onInit() {
        await super.onInit();

        this.form = new FormView({
            containerId: 'col-form',
            fields: [
                {
                    type: 'collection',
                    name: 'assigned_to',
                    label: 'Assigned to (single)',
                    Collection: UserList,
                    labelField: 'display_name',
                    valueField: 'id',
                    placeholder: 'Search users...',
                    debounceMs: 250,
                    maxItems: 10,
                    help: 'Type to search; selection stores the user id.',
                },
                {
                    type: 'collectionmultiselect',
                    name: 'reviewer_ids',
                    label: 'Reviewers (multi)',
                    Collection: UserList,
                    labelField: 'display_name',
                    valueField: 'id',
                    enableSearch: true,
                    showSelectAll: true,
                    size: 8,
                    help: 'Pre-fetched list. Returns an array of ids.',
                    collectionParams: { is_active: true, size: 25 },
                },
            ],
        });
        this.addChild(this.form);
    }

    async onActionShow(event) {
        event.preventDefault();
        const data = await this.form.getFormData();
        this.snapshot = JSON.stringify(data, null, 2);
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>CollectionSelect / CollectionMultiSelect</h1>
            <p class="example-summary">
                Bind a select to a <code>Collection</code> — the field handles fetch, search,
                and rendering. Both single and multi variants shown below using <code>UserList</code>.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/inputs/CollectionSelect.md">
                    docs/web-mojo/forms/inputs/CollectionSelect.md
                </a>
                ·
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/inputs/CollectionMultiSelect.md">
                    CollectionMultiSelect.md
                </a>
            </p>

            <div class="alert alert-info small">
                <i class="bi bi-info-circle"></i>
                Requires the NativeMojo backend at <code>localhost:9009</code>. The form will
                render without it but searches will return empty.
            </div>

            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="card">
                        <div class="card-body">
                            <div data-container="col-form"></div>
                            <button type="button" class="btn btn-primary mt-3" data-action="show">
                                <i class="bi bi-eye"></i> Show form data
                            </button>
                        </div>
                    </div>
                </div>
                <div class="col-lg-5">
                    <div class="card">
                        <div class="card-header">getFormData() output</div>
                        <div class="card-body">
                            {{#snapshot|bool}}
                                <pre class="mb-0 small"><code>{{snapshot}}</code></pre>
                            {{/snapshot|bool}}
                            {{^snapshot|bool}}
                                <p class="text-muted mb-0">
                                    Pick a user (and some reviewers) then click <strong>Show form data</strong>.
                                </p>
                            {{/snapshot|bool}}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default CollectionSelectExample;
