import { Page, Dialog, Model } from 'web-mojo';

/**
 * DialogFormExample — Dialog.showForm and Dialog.showModelForm.
 *
 * Doc:    docs/web-mojo/components/Dialog.md#showform
 * Route:  components/dialog/form
 *
 * Two helpers, same shape:
 *
 *   - Dialog.showForm({ title, fields, ...formConfig })
 *       Builds a FormView from the field config, mounts it inside a Dialog,
 *       returns a Promise that resolves with the collected form data on
 *       Submit, or `null` on Cancel/dismiss.
 *
 *   - Dialog.showModelForm({ title, model, fields, ... })
 *       Same as showForm but binds the form to a Model — Submit calls
 *       formView.handleSubmit(), which saves the model and resolves the
 *       Promise with the save result.
 *
 * The bottom panel logs whatever each helper returned so you can see the
 * data shape directly.
 */
class DemoContact extends Model {
    static endpoint = '/api/_demo/contacts';   // never actually hit
}

class DialogFormExample extends Page {
    static pageName = 'components/dialog/form';
    static route = 'components/dialog/form';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DialogFormExample.pageName,
            route: DialogFormExample.route,
            title: 'Dialog — forms',
            template: DialogFormExample.TEMPLATE,
        });
        this.lastResult = '(none yet)';
    }

    contactFields() {
        return [
            { type: 'text',     name: 'name',    label: 'Full name', required: true,
              placeholder: 'Ada Lovelace' },
            { type: 'email',    name: 'email',   label: 'Email',     required: true,
              placeholder: 'ada@example.com' },
            { type: 'select',   name: 'role',    label: 'Role',      defaultValue: 'member',
              options: [
                  { value: 'admin',  label: 'Admin' },
                  { value: 'member', label: 'Member' },
                  { value: 'guest',  label: 'Guest' },
              ] },
            { type: 'textarea', name: 'notes',   label: 'Notes', rows: 3,
              placeholder: 'Any additional context…' },
        ];
    }

    log(label, value) {
        this.lastResult = `${label}\n${JSON.stringify(value, null, 2)}`;
        this.render();
    }

    async onActionShowForm() {
        const data = await Dialog.showForm({
            title: 'New Contact',
            size: 'md',
            fields: this.contactFields(),
            defaults: { role: 'member' },
            submitText: 'Create Contact',
        });
        this.log('Dialog.showForm', data);
    }

    async onActionShowModelForm() {
        // showModelForm normally hits an endpoint via model.save(). Here we
        // stub the model's REST call so the example works without a backend.
        const contact = new DemoContact({ name: 'Ada Lovelace', email: '', role: 'admin' });
        contact.save = async (changes = {}) => {
            contact.set(changes || {});
            return { success: true, data: contact.attributes };
        };

        const result = await Dialog.showModelForm({
            title: 'Edit Contact',
            size: 'md',
            model: contact,
            fields: this.contactFields(),
            submitText: 'Save',
        });
        this.log('Dialog.showModelForm', result);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Dialog — forms</h1>
            <p class="example-summary">
                <code>showForm</code> builds a FormView in a dialog and resolves with the collected data.
                <code>showModelForm</code> binds the form to a Model and resolves with the save result.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/Dialog.md#showform">
                    docs/web-mojo/components/Dialog.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex flex-wrap gap-2">
                        <button class="btn btn-primary" data-action="show-form">
                            <i class="bi bi-ui-checks-grid"></i> Dialog.showForm
                        </button>
                        <button class="btn btn-primary" data-action="show-model-form">
                            <i class="bi bi-pencil-square"></i> Dialog.showModelForm
                        </button>
                    </div>
                    <p class="text-muted small mt-3 mb-0">
                        showModelForm normally posts to the model endpoint; this example stubs
                        <code>model.save()</code> locally so the result panel shows the resolved value
                        without a backend round-trip.
                    </p>
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

export default DialogFormExample;
