import { Page, FormView } from 'web-mojo';

/**
 * ValidationExample — HTML5 + custom validators with error display.
 *
 * Doc:    docs/web-mojo/forms/Validation.md
 * Route:  forms/validation
 *
 * Three layers, all stacked on the same form:
 *   1. HTML5 attributes — `required`, `minlength`, `maxlength`, `pattern`,
 *      `min`, `max`. Cheap and instant.
 *   2. Custom synchronous validator — `validation: { custom: (value) => ... }`
 *      returning `true` or an error string. Used here for password strength.
 *   3. Submit-time validation — `form.validate()` returns a boolean. On failure
 *      we call `form.focusFirstError()` and abort.
 *
 * The `submit` event fires only when validation passes, so the success
 * banner is the simplest indicator that everything is green.
 */
class ValidationExample extends Page {
    static pageName = 'forms/validation';
    static route = 'forms/validation';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ValidationExample.pageName,
            route: ValidationExample.route,
            title: 'Validation',
            template: ValidationExample.TEMPLATE,
        });
        this.status = null;
    }

    async onInit() {
        await super.onInit();

        this.form = new FormView({
            containerId: 'validation-form',
            fields: [
                { type: 'text', name: 'username', label: 'Username', columns: 6,
                    required: true, minlength: 3, maxlength: 20,
                    pattern: '^[a-zA-Z0-9_]+$',
                    help: '3-20 chars, letters / digits / underscore only.' },

                { type: 'email', name: 'email', label: 'Email', columns: 6,
                    required: true,
                    help: 'HTML5 email validation runs automatically.' },

                { type: 'password', name: 'password', label: 'Password (custom validator)',
                    columns: 6, required: true, minlength: 8,
                    autocomplete: 'new-password',
                    help: 'Must include an uppercase letter, a lowercase letter, and a digit.',
                    validation: {
                        custom: (value) => {
                            if (!value) return true; // let `required` handle empty
                            if (!/[A-Z]/.test(value)) return 'Must contain an uppercase letter.';
                            if (!/[a-z]/.test(value)) return 'Must contain a lowercase letter.';
                            if (!/[0-9]/.test(value)) return 'Must contain a digit.';
                            return true;
                        },
                    } },

                { type: 'tel', name: 'phone', label: 'Phone (regex pattern)', columns: 6,
                    placeholder: '(555) 123-4567',
                    pattern: '\\([0-9]{3}\\) [0-9]{3}-[0-9]{4}',
                    help: 'Format: <code>(555) 123-4567</code>' },

                { type: 'number', name: 'age', label: 'Age (min/max)', columns: 6,
                    required: true, min: 18, max: 120,
                    help: 'Must be 18 or older.' },

                { type: 'checkbox', name: 'agree', label: 'I agree to the terms',
                    columns: 6, required: true },
            ],
        });
        this.addChild(this.form);
    }

    async onActionSubmitValidation(event) {
        event.preventDefault();
        if (!this.form.validate()) {
            this.form.focusFirstError();
            this.status = { ok: false, message: 'Please fix the highlighted fields.' };
            this.render();
            return;
        }
        const data = await this.form.getFormData();
        this.status = { ok: true, message: `All checks passed for ${data.username}.` };
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Validation</h1>
            <p class="example-summary">
                HTML5 attributes (<code>required</code>, <code>pattern</code>,
                <code>min</code>/<code>max</code>) plus a custom synchronous validator on the
                password field. <code>form.validate()</code> drives the submit gate.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/Validation.md">
                    docs/web-mojo/forms/Validation.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div data-container="validation-form"></div>

                    {{#status|bool}}
                        {{#status.ok|bool}}
                            <div class="alert alert-success mt-3 mb-0">
                                <i class="bi bi-check-circle"></i> {{status.message}}
                            </div>
                        {{/status.ok|bool}}
                        {{^status.ok|bool}}
                            <div class="alert alert-danger mt-3 mb-0">
                                <i class="bi bi-exclamation-triangle"></i> {{status.message}}
                            </div>
                        {{/status.ok|bool}}
                    {{/status|bool}}

                    <button type="button" class="btn btn-primary mt-3" data-action="submit-validation">
                        <i class="bi bi-shield-check"></i> Submit
                    </button>
                </div>
            </div>
        </div>
    `;
}

export default ValidationExample;
