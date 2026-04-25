import { Page, FormView } from 'web-mojo';

/**
 * AllFieldTypesExample — sibling reference of every supported field type.
 *
 * Doc:    docs/web-mojo/forms/FieldTypes.md
 * Route:  forms/form-view/all-field-types
 *
 * One FormView containing one of each field type, grouped by category. This
 * is intentionally exhaustive — it's the place to look when you need to know
 * "does FormView do X?" before reaching for a custom input.
 *
 * Categories shown:
 *   - Text: text, email, password, tel, url, search, hex, number
 *   - Multiline: textarea, htmlpreview, json
 *   - Selection: select, multiselect, radio, checkbox, toggle/switch,
 *                buttongroup, checklistdropdown, combo
 *   - Date/Time: date, time, datetime-local
 *   - File/Media: file, image
 *   - Other: color, range
 *   - Structural (non-input): header, html, divider, hidden, button
 */
class AllFieldTypesExample extends Page {
    static pageName = 'forms/form-view/all-field-types';
    static route = 'forms/form-view/all-field-types';

    constructor(options = {}) {
        super({
            ...options,
            pageName: AllFieldTypesExample.pageName,
            route: AllFieldTypesExample.route,
            title: 'FormView — all field types',
            template: AllFieldTypesExample.TEMPLATE,
        });
        this.snapshot = null;
    }

    async onInit() {
        await super.onInit();

        const colorOptions = [
            { value: 'red', label: 'Red' },
            { value: 'green', label: 'Green' },
            { value: 'blue', label: 'Blue' },
        ];

        this.form = new FormView({
            containerId: 'all-fields-form',
            defaults: {
                tier: 'pro',
                volume: 50,
                accent: '#0d6efd',
                country: 'US',
            },
            fields: [
                { type: 'header', text: 'Text inputs', level: 5 },
                { type: 'text', name: 'username', label: 'Text', placeholder: 'Username', columns: 6 },
                { type: 'email', name: 'email', label: 'Email', placeholder: 'you@example.com', columns: 6 },
                { type: 'password', name: 'password', label: 'Password', columns: 6 },
                { type: 'tel', name: 'phone', label: 'Tel', placeholder: '(555) 123-4567', columns: 6 },
                { type: 'url', name: 'website', label: 'URL', placeholder: 'https://example.com', columns: 6 },
                { type: 'search', name: 'q', label: 'Search', placeholder: 'Search...', columns: 6 },
                { type: 'hex', name: 'token', label: 'Hex', hexType: 'string', minLength: 8, columns: 6 },
                { type: 'number', name: 'qty', label: 'Number', min: 0, max: 100, step: 1, columns: 6 },

                { type: 'divider' },
                { type: 'header', text: 'Multi-line / formatted', level: 5 },
                { type: 'textarea', name: 'bio', label: 'Textarea', rows: 3, placeholder: 'A few words...' },
                { type: 'json', name: 'config', label: 'JSON',
                    value: JSON.stringify({ enabled: true, retries: 3 }, null, 2), rows: 4 },

                { type: 'divider' },
                { type: 'header', text: 'Selection', level: 5 },
                { type: 'select', name: 'country', label: 'Select', columns: 6, options: [
                    { value: 'US', label: 'United States' },
                    { value: 'CA', label: 'Canada' },
                    { value: 'UK', label: 'United Kingdom' },
                ]},
                { type: 'radio', name: 'tier', label: 'Radio', inline: true, columns: 6, options: [
                    { value: 'free', label: 'Free' },
                    { value: 'pro', label: 'Pro' },
                    { value: 'team', label: 'Team' },
                ]},
                { type: 'checkbox', name: 'agree', label: 'Checkbox — I agree to the terms', columns: 6 },
                { type: 'toggle', name: 'notifications', label: 'Toggle — Notifications', columns: 6 },
                { type: 'buttongroup', name: 'view', label: 'Button group', columns: 6, options: [
                    { value: 'list', label: 'List', icon: 'bi-list' },
                    { value: 'grid', label: 'Grid', icon: 'bi-grid' },
                ]},
                { type: 'checklistdropdown', name: 'tags', label: 'Checklist dropdown', columns: 6, options: colorOptions },
                { type: 'combo', name: 'flavor', label: 'Combo (autocomplete)', columns: 6, options: [
                    { value: 'vanilla', label: 'Vanilla' },
                    { value: 'chocolate', label: 'Chocolate' },
                    { value: 'strawberry', label: 'Strawberry' },
                ]},
                { type: 'multiselect', name: 'colors', label: 'Multiselect', columns: 6, options: colorOptions },

                { type: 'divider' },
                { type: 'header', text: 'Date / time', level: 5 },
                { type: 'date', name: 'start_date', label: 'Date', columns: 4 },
                { type: 'time', name: 'start_time', label: 'Time', columns: 4 },
                { type: 'datetime', name: 'event_at', label: 'Datetime-local', columns: 4 },

                { type: 'divider' },
                { type: 'header', text: 'File & media', level: 5 },
                { type: 'file', name: 'document', label: 'File', columns: 6 },
                { type: 'image', name: 'avatar', label: 'Image', columns: 6 },

                { type: 'divider' },
                { type: 'header', text: 'Other inputs', level: 5 },
                { type: 'color', name: 'accent', label: 'Color', columns: 6 },
                { type: 'range', name: 'volume', label: 'Range', min: 0, max: 100, step: 5, columns: 6 },

                { type: 'divider' },
                { type: 'header', text: 'Structural (non-input)', level: 5 },
                { type: 'html', html: '<div class="alert alert-info mb-2"><code>html</code> field — inject arbitrary markup.</div>' },
                { type: 'hidden', name: 'csrf', value: 'demo-token' },
            ],
        });
        this.addChild(this.form);
    }

    async onActionSnapshot(event) {
        event.preventDefault();
        const data = await this.form.getFormData();
        this.snapshot = JSON.stringify(data, null, 2);
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>FormView — all field types</h1>
            <p class="example-summary">
                One of every field type FormView supports, grouped by category. The
                <code>hidden</code> field carries <code>csrf</code> in the snapshot.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/forms/FieldTypes.md" target="_blank">
                    docs/web-mojo/forms/FieldTypes.md
                </a>
            </p>

            <div class="row g-4">
                <div class="col-xl-8">
                    <div class="card">
                        <div class="card-body">
                            <div data-container="all-fields-form"></div>
                            <button type="button" class="btn btn-primary mt-3" data-action="snapshot">
                                <i class="bi bi-camera"></i> Snapshot getFormData()
                            </button>
                        </div>
                    </div>
                </div>
                <div class="col-xl-4">
                    <div class="card sticky-top" style="top: 1rem;">
                        <div class="card-header">Form data snapshot</div>
                        <div class="card-body">
                            {{#snapshot|bool}}
                                <pre class="mb-0 small" style="max-height: 70vh; overflow:auto;"><code>{{snapshot}}</code></pre>
                            {{/snapshot|bool}}
                            {{^snapshot|bool}}
                                <p class="text-muted mb-0">Click Snapshot to capture <code>await form.getFormData()</code>.</p>
                            {{/snapshot|bool}}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default AllFieldTypesExample;
