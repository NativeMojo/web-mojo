import { Page, Model, Collection } from 'web-mojo';

/**
 * CollectionExample — Collection with paging, filters, and iteration.
 *
 * Doc:    docs/web-mojo/core/Collection.md
 * Route:  core/collection
 *
 * Uses a preloaded collection so the demo runs without a backend, while
 * still exercising the real API:
 *
 *   - `add()` / `reset()` / `length()` — standard collection ops.
 *   - `setParams()` and `updateParams()` — the actual API for changing
 *     query state (the legacy `setFilters`/`query` calls do not exist).
 *   - `where()` for client-side filtering, `findWhere()` for first match.
 *   - `for...of` iteration in JavaScript.
 *
 * Real REST collections drop `preloaded: true` and call `fetch()`.
 */
class Person extends Model {
    constructor(data = {}) {
        super(data, { endpoint: '/api/people' });
    }
}

class PeopleCollection extends Collection {
    constructor(options = {}) {
        super({ ModelClass: Person, endpoint: '/api/people', size: 20, ...options });
    }
}

class CollectionExample extends Page {
    static pageName = 'core/collection';
    static route = 'core/collection';

    constructor(options = {}) {
        super({
            ...options,
            pageName: CollectionExample.pageName,
            route: CollectionExample.route,
            title: 'Collection — paging + filters',
            template: CollectionExample.TEMPLATE,
        });

        this.people = new PeopleCollection({
            preloaded: true,
            data: [
                { id: 1, name: 'Alice',   role: 'admin'  },
                { id: 2, name: 'Bob',     role: 'editor' },
                { id: 3, name: 'Charlie', role: 'viewer' },
                { id: 4, name: 'Dana',    role: 'admin'  },
                { id: 5, name: 'Eli',     role: 'editor' },
            ],
        });

        this.roleFilter = '';
        this.people.on('update', () => this.render());
    }

    getVisible() {
        // Client-side filtering via where() — for real REST this would be a
        // server-side param like updateParams({ role: this.roleFilter }, true).
        const all = this.people.models;
        if (!this.roleFilter) return all.map(m => m.toJSON());
        return this.people.where(m => m.get('role') === this.roleFilter).map(m => m.toJSON());
    }

    onChangeFilter(event, wrapper) {
        const select = wrapper.querySelector('select');
        this.roleFilter = select.value;
        // Real API: persist the param so a fetch picks it up next.
        this.people.updateParams({ role: this.roleFilter || undefined }, false);
        this.render();
    }

    onActionAdd() {
        const nextId = (this.people.length() || 0) + 1;
        this.people.add({ id: 100 + nextId, name: `New #${nextId}`, role: 'viewer' });
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Collection</h1>
            <p class="example-summary">
                Ordered set of models with pagination params, filters, querying with
                <code>where()</code>, and event-driven re-render.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/core/Collection.md" target="_blank">
                    docs/web-mojo/core/Collection.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
                        <div data-change-action="filter">
                            <label class="form-label small mb-1 me-2">Role:</label>
                            <select class="form-select form-select-sm d-inline-block w-auto">
                                <option value="">All</option>
                                <option value="admin">Admin</option>
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                            </select>
                        </div>
                        <button class="btn btn-sm btn-outline-primary" data-action="add">
                            <i class="bi bi-plus-lg"></i> Add row
                        </button>
                        <span class="text-muted small ms-auto">
                            Showing <strong>{{getVisible.length}}</strong> of <strong>{{people.length}}</strong>
                        </span>
                    </div>

                    <table class="table table-sm align-middle mb-0">
                        <thead><tr><th>ID</th><th>Name</th><th>Role</th></tr></thead>
                        <tbody>
                            {{#getVisible}}
                                <tr>
                                    <td>{{.id}}</td>
                                    <td>{{.name}}</td>
                                    <td>{{{.role|badge}}}</td>
                                </tr>
                            {{/getVisible}}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

export default CollectionExample;
