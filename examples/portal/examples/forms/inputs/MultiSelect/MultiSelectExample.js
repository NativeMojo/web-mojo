import { Page, FormView } from 'web-mojo';

/**
 * MultiSelectExample — canonical demo of the `multiselect` field type.
 *
 * Doc:    docs/web-mojo/forms/inputs/MultiSelectDropdown.md
 * Route:  forms/inputs/multi-select
 *
 * What this shows:
 *   1. The dropdown variant — a compact button that opens a checklist panel,
 *      keeping the form layout tight even with many options.
 *   2. Two option shapes — strings (where label = value) and `{ value, label }`
 *      objects (where the value is what `getFormData()` returns).
 *   3. `searchable` and `selectAll` / `clearAll` controls for longer lists.
 *   4. Pre-selected `value` array — populated on first render.
 */
class MultiSelectExample extends Page {
    static pageName = 'forms/inputs/multi-select';
    static route = 'forms/inputs/multi-select';

    constructor(options = {}) {
        super({
            ...options,
            pageName: MultiSelectExample.pageName,
            route: MultiSelectExample.route,
            title: 'MultiSelectDropdown — checklist dropdown',
            template: MultiSelectExample.TEMPLATE,
        });
        this.snapshot = null;
    }

    async onInit() {
        await super.onInit();

        this.form = new FormView({
            containerId: 'multi-form',
            fields: [
                {
                    type: 'multiselect',
                    name: 'features',
                    label: 'Features',
                    options: [
                        'Email Notifications',
                        'SMS Alerts',
                        'Push Notifications',
                        'Weekly Reports',
                        'Monthly Reports',
                    ],
                    selectAll: true,
                    clearAll: true,
                    placeholder: 'Select features...',
                },
                {
                    type: 'multiselect',
                    name: 'permissions',
                    label: 'Permissions (object options)',
                    options: [
                        { value: 'read',   label: 'Read' },
                        { value: 'write',  label: 'Write' },
                        { value: 'delete', label: 'Delete' },
                        { value: 'admin',  label: 'Admin' },
                    ],
                    value: ['read', 'write'],
                    searchable: true,
                    placeholder: 'Pick permissions...',
                    help: 'Pre-selected: read + write.',
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
            <h1>MultiSelectDropdown</h1>
            <p class="example-summary">
                Compact multi-select dropdown with optional search and select/clear-all controls.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/forms/inputs/MultiSelectDropdown.md" target="_blank">
                    docs/web-mojo/forms/inputs/MultiSelectDropdown.md
                </a>
            </p>

            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="card">
                        <div class="card-body">
                            <div data-container="multi-form"></div>
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
                                    Pick some options then click <strong>Show form data</strong>.
                                    Both fields return arrays of selected <code>value</code>s.
                                </p>
                            {{/snapshot|bool}}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default MultiSelectExample;
