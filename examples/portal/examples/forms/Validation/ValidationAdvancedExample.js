import { Page, FormView } from 'web-mojo';

/**
 * ValidationAdvancedExample — async, real-time, and cross-field validation.
 *
 * Doc:    docs/web-mojo/forms/Validation.md
 * Route:  forms/validation/advanced
 *
 * Three patterns layered into one form:
 *   1. Async per-field validator on `username` — checks "availability" against
 *      a simulated server (200 ms latency). Returns a promise; FormView awaits
 *      it during `validate()`.
 *   2. Real-time feedback via the `change` event — drives a password strength
 *      meter on every keystroke, no submit required.
 *   3. Cross-field rule — `password === confirm_password` is enforced in the
 *      submit handler *after* `form.validate()` returns true.
 */
class ValidationAdvancedExample extends Page {
    static pageName = 'forms/validation/advanced';
    static route = 'forms/validation/advanced';

    static TAKEN = ['admin', 'root', 'support', 'ada', 'grace'];
    static STRENGTH_LABELS = ['enter a password', 'very weak', 'weak', 'okay', 'strong', 'excellent'];

    constructor(options = {}) {
        super({
            ...options,
            pageName: ValidationAdvancedExample.pageName,
            route: ValidationAdvancedExample.route,
            title: 'Validation — advanced',
            template: ValidationAdvancedExample.TEMPLATE,
        });
        this.status = null;
        this.strength = { score: 0, label: 'enter a password' };
    }

    async onInit() {
        await super.onInit();

        this.form = new FormView({
            containerId: 'advanced-validation-form',
            fields: [
                { type: 'text', name: 'username', label: 'Username (async availability)',
                    required: true, minlength: 3, columns: 12,
                    help: 'Try <code>admin</code>, <code>ada</code>, or <code>grace</code> to see the failure path.',
                    validation: {
                        custom: async (value) => {
                            if (!value || value.length < 3) return true;
                            await new Promise(r => setTimeout(r, 200)); // simulated server
                            return ValidationAdvancedExample.TAKEN.includes(value.toLowerCase())
                                ? `Username "${value}" is taken.` : true;
                        },
                    } },
                { type: 'password', name: 'password', label: 'Password',
                    required: true, minlength: 8, autocomplete: 'new-password', columns: 6 },
                { type: 'password', name: 'confirm_password', label: 'Confirm password',
                    required: true, autocomplete: 'new-password', columns: 6 },
            ],
        });
        this.addChild(this.form);

        // Real-time strength feedback — listens on `change`, not `submit`.
        this.form.on('change', async () => {
            const data = await this.form.getFormData();
            const v = data.password || '';
            const score = [v.length >= 8, /[A-Z]/.test(v), /[a-z]/.test(v),
                /[0-9]/.test(v), /[^A-Za-z0-9]/.test(v)].filter(Boolean).length;
            this.strength = { score, label: ValidationAdvancedExample.STRENGTH_LABELS[score] };
            this.render();
        });
    }

    async onActionSubmitAdvanced(event) {
        event.preventDefault();
        const ok = await this.form.validate(); // awaits async validators
        if (!ok) {
            this.form.focusFirstError();
            this.status = { ok: false, message: 'Fix the highlighted errors.' };
            return this.render();
        }
        const data = await this.form.getFormData();
        if (data.password !== data.confirm_password) {
            this.status = { ok: false, message: 'Passwords do not match.' };
            return this.render();
        }
        this.status = { ok: true, message: `Welcome, ${data.username}!` };
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Validation — advanced</h1>
            <p class="example-summary">
                Async per-field validator, real-time strength meter via the
                <code>change</code> event, and a cross-field
                <code>password === confirm_password</code> check at submit.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/forms/Validation.md" target="_blank">
                    docs/web-mojo/forms/Validation.md
                </a>
            </p>

            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="card"><div class="card-body">
                        <div data-container="advanced-validation-form"></div>
                        {{#status|bool}}
                            {{#status.ok|bool}}<div class="alert alert-success mt-3 mb-0">
                                <i class="bi bi-check-circle"></i> {{status.message}}
                            </div>{{/status.ok|bool}}
                            {{^status.ok|bool}}<div class="alert alert-danger mt-3 mb-0">
                                <i class="bi bi-exclamation-triangle"></i> {{status.message}}
                            </div>{{/status.ok|bool}}
                        {{/status|bool}}
                        <button type="button" class="btn btn-primary mt-3" data-action="submit-advanced">
                            <i class="bi bi-shield-check"></i> Sign up
                        </button>
                    </div></div>
                </div>
                <div class="col-lg-5">
                    <div class="card">
                        <div class="card-header">Password strength (real-time)</div>
                        <div class="card-body">
                            <div class="progress" style="height:1.5rem;">
                                <div class="progress-bar bg-success" style="width: {{strength.score}}0%;">
                                    {{strength.label}}
                                </div>
                            </div>
                            <p class="text-muted small mt-3 mb-0">
                                Updates on every keystroke via the <code>change</code> event.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default ValidationAdvancedExample;
