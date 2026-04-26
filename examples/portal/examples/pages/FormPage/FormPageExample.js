import { FormPage, Model } from 'web-mojo';

/**
 * FormPageExample — canonical demo of FormPage.
 *
 * Doc:    docs/web-mojo/pages/FormPage.md
 * Route:  pages/form-page
 *
 * FormPage = Page wrapped around a FormView. Declare `fields` and override
 * `getModel()`; FormPage handles construction, addChild, model binding, and
 * per-visit recreation.
 *
 * What this shows:
 *   1. `fields` as a class property — the form schema.
 *   2. `getModel()` — returns the bound Model. Called inside super.onEnter()
 *      via recreateFormView() — never call recreateFormView() yourself.
 *   3. Custom template with a "Save" action — for pages that want their own
 *      submit button, keep the `data-container="form-view-container"` slot
 *      and add `data-action` buttons around it.
 *   4. Save flow: read form data, validate, write to model, call model.save().
 *
 * Demo runs without a backend by using an in-memory Model (no endpoint). The
 * "Save" button writes the form values back to the model and re-renders the
 * "Saved data" panel.
 */

// In-memory Model for the demo — production code would import a real model class.
class DemoUser extends Model {
    constructor(data = {}) {
        super(data, { idAttribute: 'id' });
    }
    // Override save so the demo doesn't try to hit a backend.
    async save() {
        return { success: true, data: this.toJSON() };
    }
}

const DEMO_FIELDS = [
    { type: 'text',     name: 'display_name', label: 'Display Name', required: true, columns: { md: 6 } },
    { type: 'email',    name: 'email',        label: 'Email',        required: true, columns: { md: 6 } },
    { type: 'textarea', name: 'bio',          label: 'Bio',          rows: 3 },
    { type: 'switch',   name: 'notifications', label: 'Email me about updates' },
];

class FormPageExample extends FormPage {
    static pageName = 'pages/form-page';
    static route = 'pages/form-page';

    constructor(options = {}) {
        super({
            ...options,
            pageName: FormPageExample.pageName,
            route: FormPageExample.route,
            title: 'FormPage — Page wrapped around a FormView',
            // FormPage reads `fields` from options (not from a class field).
            fields: DEMO_FIELDS,
            template: FormPageExample.TEMPLATE,
        });

        // Demo model — kept on the page so save edits persist across visits.
        this._user = new DemoUser({
            id: 'demo',
            display_name: 'Ada Lovelace',
            email: 'ada@example.com',
            bio: 'Mathematician. Wrote the first algorithm.',
            notifications: true,
        });
    }

    // FormPage calls getModel() inside recreateFormView() on every onEnter.
    async getModel() {
        return this._user;
    }

    // Custom template — keeps the form-view-container slot, adds page chrome
    // and an explicit Save button. (The default FormPage template is just the
    // bare slot; override only when you want surrounding actions.)
    static TEMPLATE = `
        <div class="example-page">
            <h1>FormPage</h1>
            <p class="example-summary">
                A Page that auto-manages a child FormView. Declare <code>fields</code>,
                override <code>getModel()</code>, and you have an edit screen.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/pages/FormPage.md">
                    docs/web-mojo/pages/FormPage.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-body">
                    <div data-container="form-view-container"></div>
                    <div class="d-flex justify-content-end gap-2 mt-3">
                        <button class="btn btn-outline-secondary" data-action="reset">
                            <i class="bi bi-arrow-counterclockwise"></i> Reset
                        </button>
                        <button class="btn btn-primary" data-action="save">
                            <i class="bi bi-check2"></i> Save
                        </button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <h6 class="card-title">Saved model data</h6>
                    <pre class="bg-light p-2 mb-0"><code>{{savedJson}}</code></pre>
                </div>
            </div>
        </div>
    `;

    async onEnter() {
        await super.onEnter(); // recreates FormView and binds model
        this.savedJson = JSON.stringify(this._user.toJSON(), null, 2);
        await this.render();
    }

    async onActionSave() {
        const data = await this.formView.getFormData();
        if (!this.formView.validate()) return;

        this._user.set(data);
        const resp = await this._user.save();
        if (resp.success) {
            this.savedJson = JSON.stringify(this._user.toJSON(), null, 2);
            this.getApp().toast?.success?.('Saved.');
            await this.render();
        } else {
            this.getApp().toast?.error?.('Save failed.');
        }
    }

    async onActionReset() {
        this.formView.setFormData(this._user.toJSON());
    }
}

export default FormPageExample;
