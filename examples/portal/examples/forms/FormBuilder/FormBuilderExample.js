import { Page, FormBuilder } from 'web-mojo';

/**
 * FormBuilderExample — canonical demo of FormBuilder.
 *
 * Doc:    docs/web-mojo/forms/FormBuilder.md
 * Route:  forms/form-builder
 *
 * FormBuilder is the **HTML generator** under FormView. It converts a `fields`
 * config object into a Bootstrap-styled `<form>` (or just the field markup,
 * via `buildFieldsHTML()`). It does NOT mount, validate, listen to events, or
 * collect submissions. For an interactive form with all of that, use FormView.
 *
 * When to reach for FormBuilder directly:
 *   - You need raw HTML to inject into a non-View context (e.g., a templated
 *     export, a Mustache template fragment, a static doc generator).
 *   - You're building a custom form orchestrator and want a simple HTML
 *     baseline you can layer your own behavior on.
 *
 * Most of the time, you want FormView.
 */
class FormBuilderExample extends Page {
    static pageName = 'forms/form-builder';
    static route = 'forms/form-builder';

    constructor(options = {}) {
        super({
            ...options,
            pageName: FormBuilderExample.pageName,
            route: FormBuilderExample.route,
            title: 'FormBuilder — pure HTML generation',
            template: FormBuilderExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        // Demo 1: full form HTML.
        const fullForm = new FormBuilder({
            fields: [
                { type: 'text',  name: 'username', label: 'Username', required: true, columns: 6 },
                { type: 'email', name: 'email',    label: 'Email',    required: true, columns: 6 },
                { type: 'select', name: 'role',    label: 'Role', columns: 6,
                    options: [
                        { value: 'admin',  label: 'Admin' },
                        { value: 'editor', label: 'Editor' },
                        { value: 'viewer', label: 'Viewer' },
                    ],
                },
                { type: 'checkbox', name: 'active', label: 'Active', columns: 6 },
            ],
            data: { username: 'alice', email: 'alice@example.com', role: 'editor', active: true },
            options: { submitButton: 'Save', resetButton: 'Reset' },
        });
        this.fullFormHTML = fullForm.buildFormHTML();

        // Demo 2: just the fields, no <form> wrapper. Useful when you want
        // FormBuilder's markup but plan to add your own surrounding structure.
        const fieldsOnly = new FormBuilder({
            fields: [
                { type: 'text', name: 'first_name', label: 'First name', columns: 6 },
                { type: 'text', name: 'last_name',  label: 'Last name',  columns: 6 },
            ],
        });
        this.fieldsOnlyHTML = fieldsOnly.buildFieldsHTML();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>FormBuilder</h1>
            <p class="example-summary">
                Pure HTML generation from a <code>fields</code> config — no lifecycle, no
                events, no validation. For an interactive form with all of that,
                <a href="?page=forms/form-view">use FormView</a> instead.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/FormBuilder.md">
                    docs/web-mojo/forms/FormBuilder.md
                </a>
            </p>

            <section class="card mt-3">
                <div class="card-header">
                    <strong>1. <code>buildFormHTML()</code></strong> — complete <code>&lt;form&gt;</code> with submit/reset buttons
                </div>
                <div class="card-body">
                    {{{fullFormHTML}}}
                </div>
            </section>

            <section class="card mt-3">
                <div class="card-header">
                    <strong>2. <code>buildFieldsHTML()</code></strong> — fields only, no <code>&lt;form&gt;</code> wrapper
                </div>
                <div class="card-body">
                    {{{fieldsOnlyHTML}}}
                </div>
            </section>

            <section class="card mt-3">
                <div class="card-header"><strong>What's missing vs FormView</strong></div>
                <div class="card-body small">
                    FormBuilder produces markup. It does <strong>not</strong>:
                    <ul class="mb-0">
                        <li>Validate input.</li>
                        <li>Collect form data on submit.</li>
                        <li>Bind to a Model.</li>
                        <li>Wire <code>data-action</code> handlers.</li>
                        <li>Render child views inside fields.</li>
                    </ul>
                    For any of those, use
                    <a href="?page=forms/form-view"><code>FormView</code></a>.
                </div>
            </section>
        </div>
    `;
}

export default FormBuilderExample;
