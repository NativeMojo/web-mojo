import { Page, FormView } from 'web-mojo';

/**
 * FormViewExample — canonical demo of the FormView component.
 *
 * Doc:    docs/web-mojo/forms/FormView.md
 * Route:  forms/form-view
 *
 * Shows the four things every FormView user needs:
 *
 *   1. Field array — declarative `{ type, name, label, required }` definitions
 *      compiled into Bootstrap-styled HTML by FormBuilder.
 *   2. Child mounting — created in `onInit()`, attached via `addChild()` with
 *      a `containerId`. Never call `child.render()` / `child.mount()` after.
 *   3. Submit via a `data-action` button (NOT on `<form>`). The handler calls
 *      `form.validate()`, `await form.getFormData()`, then does the work.
 *   4. Initial values via `data:` and `defaults:` (data > model > defaults).
 *
 * Copy-paste recipe: declare `fields:`, `addChild()` into a container, add a
 * trigger button with `data-action="submit-foo"`, validate + getFormData in
 * the matching `onActionSubmitFoo`.
 */
class FormViewExample extends Page {
    static pageName = 'forms/form-view';
    static route = 'forms/form-view';

    constructor(options = {}) {
        super({
            ...options,
            pageName: FormViewExample.pageName,
            route: FormViewExample.route,
            title: 'FormView — fundamentals',
            template: FormViewExample.TEMPLATE,
        });
        this.lastSubmission = null;
    }

    async onInit() {
        await super.onInit();

        this.contactForm = new FormView({
            containerId: 'contact-form',
            defaults: { country: 'US' },
            data: { name: '' },
            fields: [
                { type: 'text', name: 'name', label: 'Full name', required: true,
                    placeholder: 'Ada Lovelace' },
                { type: 'email', name: 'email', label: 'Email', required: true,
                    placeholder: 'ada@example.com' },
                { type: 'select', name: 'country', label: 'Country', options: [
                    { value: 'US', label: 'United States' },
                    { value: 'CA', label: 'Canada' },
                    { value: 'UK', label: 'United Kingdom' },
                ]},
                { type: 'textarea', name: 'message', label: 'Message',
                    rows: 4, required: true, placeholder: 'Tell us what you think...' },
            ],
        });
        this.addChild(this.contactForm);
    }

    async onActionSubmitContact(event) {
        event.preventDefault();
        if (!this.contactForm.validate()) {
            this.contactForm.focusFirstError();
            return;
        }
        const data = await this.contactForm.getFormData();
        this.lastSubmission = JSON.stringify(data, null, 2);
        this.render();
    }

    onActionResetContact(event) {
        event.preventDefault();
        this.contactForm.reset();
        this.lastSubmission = null;
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>FormView</h1>
            <p class="example-summary">
                Declarative form component: fields, validation, submission, model binding.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/FormView.md">
                    docs/web-mojo/forms/FormView.md
                </a>
            </p>

            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="card">
                        <div class="card-header">Contact form</div>
                        <div class="card-body">
                            <div data-container="contact-form"></div>
                            <div class="d-flex gap-2 mt-3">
                                <button type="button" class="btn btn-primary" data-action="submit-contact">
                                    <i class="bi bi-send"></i> Submit
                                </button>
                                <button type="button" class="btn btn-outline-secondary" data-action="reset-contact">
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-5">
                    <div class="card">
                        <div class="card-header">Last submission</div>
                        <div class="card-body">
                            {{#lastSubmission|bool}}
                                <pre class="mb-0 small"><code>{{lastSubmission}}</code></pre>
                            {{/lastSubmission|bool}}
                            {{^lastSubmission|bool}}
                                <p class="text-muted mb-0">
                                    Submit the form to see <code>await form.getFormData()</code>.
                                </p>
                            {{/lastSubmission|bool}}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default FormViewExample;
