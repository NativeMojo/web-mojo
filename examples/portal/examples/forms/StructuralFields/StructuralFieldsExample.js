import { Page, FormView } from 'web-mojo';

/**
 * StructuralFieldsExample — non-input field types for layout & affordances.
 *
 * Doc:    docs/web-mojo/forms/BasicTypes.md
 * Route:  forms/structural-fields
 *
 * These fields render no input — they shape the form:
 *   - header / heading — section title (`level: 1..6`)
 *   - divider          — horizontal separator
 *   - html             — arbitrary inline markup (alerts, hints, links)
 *   - button           — in-form button wired with `action: 'kebab-case'`
 *                        which routes to `onActionKebabCase` on the parent
 *   - hidden           — value carried in the snapshot but invisible to the user
 *
 * Mixed with regular inputs so you can see how they break the form into
 * scannable sections without separate templates.
 */
class StructuralFieldsExample extends Page {
    static pageName = 'forms/structural-fields';
    static route = 'forms/structural-fields';

    constructor(options = {}) {
        super({
            ...options,
            pageName: StructuralFieldsExample.pageName,
            route: StructuralFieldsExample.route,
            title: 'Structural fields',
            template: StructuralFieldsExample.TEMPLATE,
        });
        this.snapshot = null;
        this.lastButtonClick = null;
    }

    async onInit() {
        await super.onInit();

        this.form = new FormView({
            containerId: 'structural-form',
            fields: [
                { type: 'hidden', name: 'csrf_token', value: 'demo-csrf-12345' },
                { type: 'hidden', name: 'source', value: 'examples-portal' },

                { type: 'header', text: 'Account', level: 5 },
                { type: 'html', html: '<div class="alert alert-info py-2 mb-3">'
                    + '<i class="bi bi-info-circle me-1"></i>'
                    + '<code>html</code> field — inject any markup, including alerts and links.'
                    + '</div>' },
                { type: 'text', name: 'username', label: 'Username', columns: 6, required: true },
                { type: 'email', name: 'email', label: 'Email', columns: 6, required: true },

                { type: 'divider' },

                { type: 'header', text: 'Preferences', level: 5 },
                { type: 'toggle', name: 'newsletter', label: 'Subscribe to newsletter' },
                { type: 'toggle', name: 'notifications', label: 'Email notifications' },

                { type: 'divider' },

                { type: 'html', html: '<p class="text-muted small mb-2">'
                    + 'Inline action button — its <code>action</code> property routes to '
                    + '<code>onActionGenerateKey</code> on the page.</p>' },
                { type: 'button', label: 'Generate API key', action: 'generate-key',
                    buttonClass: 'btn-outline-secondary', icon: 'bi-key' },
            ],
        });
        this.addChild(this.form);
    }

    async onActionSnapshot(event) {
        event.preventDefault();
        if (!this.form.validate()) {
            this.form.focusFirstError();
            return;
        }
        const data = await this.form.getFormData();
        this.snapshot = JSON.stringify(data, null, 2);
        this.render();
    }

    onActionGenerateKey(event) {
        event.preventDefault();
        const random = Math.random().toString(16).slice(2, 18);
        this.lastButtonClick = `Generated key: ${random}`;
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Structural fields</h1>
            <p class="example-summary">
                Non-input field types: <code>header</code>, <code>divider</code>,
                <code>html</code>, <code>button</code>, <code>hidden</code>. Use them to
                section the form, embed help text, and wire in-form buttons.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/forms/BasicTypes.md" target="_blank">
                    docs/web-mojo/forms/BasicTypes.md
                </a>
            </p>

            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="card">
                        <div class="card-body">
                            <div data-container="structural-form"></div>
                            <button type="button" class="btn btn-primary mt-3" data-action="snapshot">
                                <i class="bi bi-check2"></i> Submit
                            </button>
                        </div>
                    </div>
                </div>
                <div class="col-lg-5">
                    <div class="card mb-3">
                        <div class="card-header">Inline button output</div>
                        <div class="card-body">
                            {{#lastButtonClick|bool}}
                                <code>{{lastButtonClick}}</code>
                            {{/lastButtonClick|bool}}
                            {{^lastButtonClick|bool}}
                                <p class="text-muted mb-0">Click <strong>Generate API key</strong>.</p>
                            {{/lastButtonClick|bool}}
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header">Form data (incl. hidden)</div>
                        <div class="card-body">
                            {{#snapshot|bool}}
                                <pre class="mb-0 small"><code>{{snapshot}}</code></pre>
                            {{/snapshot|bool}}
                            {{^snapshot|bool}}
                                <p class="text-muted mb-0">Submit to see hidden fields in the payload.</p>
                            {{/snapshot|bool}}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default StructuralFieldsExample;
