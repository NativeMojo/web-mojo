import { Page, View, Model, Modal } from 'web-mojo';

/**
 * ModalShowModelExample — Modal.showModel and Modal.showModelById.
 *
 * Doc:    docs/web-mojo/components/Modal.md#showmodel
 * Route:  components/modal/show-model
 *
 * Two helpers that take the boilerplate out of "open this model in a modal":
 *
 *   - Modal.showModel(modelInstance)
 *       Looks up `model.constructor.VIEW_CLASS` and instantiates it with
 *       `{ model }`, then opens it in a modal. Throws if no VIEW_CLASS.
 *
 *   - Modal.showModelById(ModelClass, id)
 *       new ModelClass({ id }) → fetch() → showModel(model). Useful when
 *       all you have is a record id and you want a viewer.
 *
 * The pattern is: a Model subclass declares `static VIEW_CLASS = SomeView`;
 * any code that has the model can open it without knowing which view to
 * use. Common in row-action menus and "open detail" links.
 */
class DemoUserView extends View {
    constructor(options = {}) {
        super({ ...options, template: DemoUserView.TEMPLATE, className: 'p-3' });
    }

    static TEMPLATE = `
        <div class="text-center">
            <div class="display-1 mb-2">
                <i class="bi bi-person-circle text-primary"></i>
            </div>
            <h4 class="mb-1">{{model.name}}</h4>
            <div class="text-muted">{{model.email}}</div>
            <div class="mt-3">
                <span class="badge bg-secondary">{{model.role}}</span>
            </div>
            <p class="mt-3 mb-0 small text-muted">
                This is <code>DemoUserView</code> — the view declared as
                <code>DemoUser.VIEW_CLASS</code>. Modal.showModel(user) opened it for you.
            </p>
        </div>
    `;
}

class DemoUser extends Model {
    static endpoint = '/api/_demo/users';
    static VIEW_CLASS = DemoUserView;
}

class ModalShowModelExample extends Page {
    static pageName = 'components/modal/show-model';
    static route = 'components/modal/show-model';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ModalShowModelExample.pageName,
            route: ModalShowModelExample.route,
            title: 'Modal — showModel',
            template: ModalShowModelExample.TEMPLATE,
        });
        this.lastResult = '(none yet)';
    }

    log(label, value) {
        this.lastResult = `${label} → ${JSON.stringify(value)}`;
        this.render();
    }

    async onActionShowModel() {
        const user = new DemoUser({
            id: 42,
            name: 'Ada Lovelace',
            email: 'ada@example.com',
            role: 'admin',
        });
        const result = await Modal.showModel(user, {
            title: 'User — Modal.showModel',
            size: 'md',
        });
        this.log('Modal.showModel(user)', result);
    }

    async onActionShowModelById() {
        // Stub the fetch so the example doesn't need a backend.
        const origFetch = DemoUser.prototype.fetch;
        DemoUser.prototype.fetch = async function () {
            this.set({
                id: this.id,
                name: 'Grace Hopper',
                email: 'grace@example.com',
                role: 'member',
            });
            return this;
        };

        try {
            const result = await Modal.showModelById(DemoUser, 99, {
                title: 'User — Modal.showModelById',
                size: 'md',
            });
            this.log('Modal.showModelById(DemoUser, 99)', result);
        } finally {
            DemoUser.prototype.fetch = origFetch;
        }
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Modal — showModel</h1>
            <p class="example-summary">
                Open a model in its <code>VIEW_CLASS</code> without writing the wiring yourself.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/Modal.md#showmodel">
                    docs/web-mojo/components/Modal.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex flex-wrap gap-2 mb-3">
                        <button class="btn btn-primary" data-action="show-model">
                            <i class="bi bi-person-badge"></i> Modal.showModel(user)
                        </button>
                        <button class="btn btn-primary" data-action="show-model-by-id">
                            <i class="bi bi-cloud-download"></i> Modal.showModelById(DemoUser, 99)
                        </button>
                    </div>
                    <pre class="mb-0 small bg-light rounded p-3"><code>// The pattern:
class DemoUser extends Model {
    static endpoint = '/api/_demo/users';
    static VIEW_CLASS = DemoUserView;
}

await Modal.showModel(new DemoUser({ id: 42, name: 'Ada' }));
await Modal.showModelById(DemoUser, 99);   // fetches, then shows</code></pre>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Last result</div>
                <div class="card-body">
                    <pre class="mb-0 small"><code>{{lastResult}}</code></pre>
                </div>
            </div>
        </div>
    `;
}

export default ModalShowModelExample;
