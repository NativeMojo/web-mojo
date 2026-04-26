import { Page, FormView } from 'web-mojo';

/**
 * TextInputsExample — every text-input field type in one form.
 *
 * Doc:    docs/web-mojo/forms/BasicTypes.md
 * Route:  forms/text-inputs
 *
 * Shows the eight text-style field types and the options that matter most:
 *   - text     — `placeholder`, `pattern`, `maxlength`
 *   - email    — built-in HTML5 email validation
 *   - password — `autocomplete: new-password`, `minlength`
 *   - tel      — mobile numeric keypad + `pattern`
 *   - url      — built-in URL validation
 *   - search   — search-styled input (clearable in some browsers)
 *   - hex      — hex string with `hexType` and `minLength`
 *   - number   — `min` / `max` / `step`
 *
 * Every text-style field uses the same field shape; only `type` and a
 * couple of HTML5 attributes differ.
 */
class TextInputsExample extends Page {
    static pageName = 'forms/text-inputs';
    static route = 'forms/text-inputs';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TextInputsExample.pageName,
            route: TextInputsExample.route,
            title: 'Text inputs',
            template: TextInputsExample.TEMPLATE,
        });
        this.snapshot = null;
    }

    async onInit() {
        await super.onInit();

        this.form = new FormView({
            containerId: 'text-inputs-form',
            fields: [
                { type: 'text', name: 'username', label: 'Text — username', columns: 6,
                    placeholder: 'ada_lovelace', pattern: '^[a-zA-Z0-9_]+$', maxlength: 20,
                    help: 'Letters, numbers, underscores. Up to 20 chars.' },
                { type: 'email', name: 'email', label: 'Email', columns: 6,
                    placeholder: 'you@example.com' },
                { type: 'password', name: 'password', label: 'Password', columns: 6,
                    minlength: 8, autocomplete: 'new-password',
                    help: 'At least 8 characters.' },
                { type: 'tel', name: 'phone', label: 'Tel — phone', columns: 6,
                    placeholder: '(555) 123-4567',
                    pattern: '\\([0-9]{3}\\) [0-9]{3}-[0-9]{4}',
                    help: 'Format: (555) 123-4567' },
                { type: 'url', name: 'website', label: 'URL', columns: 6,
                    placeholder: 'https://example.com' },
                { type: 'search', name: 'q', label: 'Search', columns: 6,
                    placeholder: 'Search products...' },
                { type: 'hex', name: 'api_key', label: 'Hex — API key', columns: 6,
                    hexType: 'string', minLength: 16,
                    help: '0-9 / a-f, at least 16 characters.' },
                { type: 'number', name: 'age', label: 'Number — age', columns: 6,
                    min: 13, max: 120, step: 1 },
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

    static TEMPLATE = `
        <div class="example-page">
            <h1>Text inputs</h1>
            <p class="example-summary">
                The eight text-style HTML5 field types: <code>text</code>, <code>email</code>,
                <code>password</code>, <code>tel</code>, <code>url</code>, <code>search</code>,
                <code>hex</code>, <code>number</code>.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/BasicTypes.md">
                    docs/web-mojo/forms/BasicTypes.md
                </a>
            </p>

            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="card">
                        <div class="card-body">
                            <div data-container="text-inputs-form"></div>
                            <button type="button" class="btn btn-primary mt-3" data-action="snapshot">
                                <i class="bi bi-check2"></i> Validate &amp; snapshot
                            </button>
                        </div>
                    </div>
                </div>
                <div class="col-lg-5">
                    <div class="card">
                        <div class="card-header">Form data</div>
                        <div class="card-body">
                            {{#snapshot|bool}}
                                <pre class="mb-0 small"><code>{{snapshot}}</code></pre>
                            {{/snapshot|bool}}
                            {{^snapshot|bool}}
                                <p class="text-muted mb-0">Submit the form to see the snapshot.</p>
                            {{/snapshot|bool}}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default TextInputsExample;
