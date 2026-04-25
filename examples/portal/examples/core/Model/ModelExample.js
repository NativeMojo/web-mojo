import { Page, Model } from 'web-mojo';

/**
 * ModelExample — Model with get/set/save/delete and dirty tracking.
 *
 * Doc:    docs/web-mojo/core/Model.md
 * Route:  core/model
 *
 * Shows the model lifecycle without requiring a real backend:
 *
 *   - Construct with initial data and an `endpoint`.
 *   - `model.get(key)` and `model.set(key, value)` — set() emits 'change'.
 *   - `isDirty()` and `getChangedAttributes()` track unsaved edits.
 *   - `model.on('change', ...)` triggers a re-render of the page.
 *   - `save()` and `destroy()` hit the configured endpoint. If the backend
 *     is unreachable the example shows the error rather than crashing.
 */
class DemoUser extends Model {
    constructor(data = {}) {
        super(data, { endpoint: '/api/users', idAttribute: 'id' });
    }
}

class ModelExample extends Page {
    static pageName = 'core/model';
    static route = 'core/model';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ModelExample.pageName,
            route: ModelExample.route,
            title: 'Model — REST + dirty tracking',
            template: ModelExample.TEMPLATE,
        });

        this.user = new DemoUser({ name: 'Alice', email: 'alice@example.com', role: 'admin' });
        this.user.originalAttributes = { ...this.user.attributes };
        this.user.on('change', () => this.render());
        this.lastResult = '';
    }

    onActionEditName() {
        const next = this.user.get('name') === 'Alice' ? 'Alicia' : 'Alice';
        this.user.set('name', next);
    }

    onActionReset() {
        this.user.reset();
        this.lastResult = '';
        this.render();
    }

    async onActionSave() {
        this.lastResult = 'Saving...';
        this.render();
        try {
            const resp = await this.user.save();
            this.lastResult = resp && resp.success
                ? 'Save succeeded.'
                : `Save failed: ${JSON.stringify(this.user.errors)}`;
        } catch (err) {
            this.lastResult = `Save error (backend unreachable): ${err.message}`;
        }
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Model</h1>
            <p class="example-summary">
                REST-backed entity with attribute access, change events, dirty tracking,
                and CRUD methods.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/core/Model.md" target="_blank">
                    docs/web-mojo/core/Model.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">{{user.name}}</h5>
                    <dl class="row small mb-3">
                        <dt class="col-sm-3">Name</dt><dd class="col-sm-9">{{user.name}}</dd>
                        <dt class="col-sm-3">Email</dt><dd class="col-sm-9">{{user.email}}</dd>
                        <dt class="col-sm-3">Role</dt><dd class="col-sm-9">{{user.role|capitalize}}</dd>
                        <dt class="col-sm-3">Dirty?</dt>
                        <dd class="col-sm-9">{{{user.isDirty|equals:true:'<span class=\"badge text-bg-warning\">yes</span>':'<span class=\"badge text-bg-secondary\">no</span>'}}}</dd>
                    </dl>

                    <div class="d-flex gap-2 flex-wrap">
                        <button class="btn btn-sm btn-outline-primary" data-action="edit-name">
                            <i class="bi bi-pencil"></i> Toggle name
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" data-action="reset">
                            <i class="bi bi-arrow-counterclockwise"></i> Reset to original
                        </button>
                        <button class="btn btn-sm btn-primary" data-action="save">
                            <i class="bi bi-cloud-upload"></i> Save (POST/PUT)
                        </button>
                    </div>

                    {{#lastResult|bool}}
                        <div class="alert alert-light small mt-3 mb-0">{{lastResult}}</div>
                    {{/lastResult|bool}}
                </div>
            </div>
        </div>
    `;
}

export default ModelExample;
