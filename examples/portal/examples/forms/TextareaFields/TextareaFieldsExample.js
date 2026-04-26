import { Page, FormView } from 'web-mojo';

/**
 * TextareaFieldsExample — multi-line and rich text variants.
 *
 * Doc:    docs/web-mojo/forms/BasicTypes.md
 * Route:  forms/textarea-fields
 *
 * Three multi-line variants:
 *   - textarea     — plain multi-line text, with `rows` and `maxlength`
 *   - htmlpreview  — HTML editor with a sandboxed live-preview dialog
 *   - json         — JSON editor with auto-formatting and parse validation
 *
 * `htmlpreview` and `json` are still <textarea> under the hood — they just
 * add side-panel UI for safe preview / structural validation.
 */
class TextareaFieldsExample extends Page {
    static pageName = 'forms/textarea-fields';
    static route = 'forms/textarea-fields';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TextareaFieldsExample.pageName,
            route: TextareaFieldsExample.route,
            title: 'Textarea fields',
            template: TextareaFieldsExample.TEMPLATE,
        });
        this.snapshot = null;
    }

    async onInit() {
        await super.onInit();

        this.form = new FormView({
            containerId: 'textarea-form',
            defaults: {
                json_config: JSON.stringify({ enabled: true, retries: 3 }, null, 2),
            },
            fields: [
                { type: 'textarea', name: 'bio', label: 'Textarea — Bio',
                    rows: 4, maxlength: 280,
                    placeholder: 'Tell us about yourself...',
                    help: 'Up to 280 characters.' },
                { type: 'textarea', name: 'notes', label: 'Textarea — Release notes',
                    rows: 6,
                    placeholder: '## What\'s new\n\n- ...' },
                { type: 'htmlpreview', name: 'description', label: 'HTML preview — Product description',
                    rows: 6,
                    value: '<p>Type some <strong>HTML</strong> and click the preview icon.</p>',
                    help: 'Click the preview icon to render the HTML in a sandboxed dialog.' },
                { type: 'json', name: 'json_config', label: 'JSON — Config',
                    rows: 6,
                    help: 'Pretty-prints on blur and rejects invalid JSON.' },
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
            <h1>Textarea fields</h1>
            <p class="example-summary">
                <code>textarea</code> for plain multi-line text, plus the
                <code>htmlpreview</code> and <code>json</code> variants that add
                live preview and structural validation.
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
                            <div data-container="textarea-form"></div>
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
                                <pre class="mb-0 small" style="max-height: 60vh; overflow:auto;"><code>{{snapshot}}</code></pre>
                            {{/snapshot|bool}}
                            {{^snapshot|bool}}
                                <p class="text-muted mb-0">Submit to see <code>getFormData()</code>.</p>
                            {{/snapshot|bool}}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default TextareaFieldsExample;
