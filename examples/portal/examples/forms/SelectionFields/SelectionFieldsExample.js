import { Page, FormView } from 'web-mojo';

/**
 * SelectionFieldsExample — every selection-style field type.
 *
 * Doc:    docs/web-mojo/forms/BasicTypes.md
 * Route:  forms/selection-fields
 *
 * Selection fields capture a choice from a known set of options:
 *   - select       — native dropdown, one value
 *   - radio        — visible options, one value
 *   - checkbox     — single boolean (or multi when given `options`)
 *   - toggle/switch — boolean with switch styling (alias of toggle)
 *   - buttongroup  — toggle-button-style single choice
 *
 * All five share the same `name` + `options` shape. Submit and the snapshot
 * shows what each field returns from `getFormData()`.
 */
class SelectionFieldsExample extends Page {
    static pageName = 'forms/selection-fields';
    static route = 'forms/selection-fields';

    constructor(options = {}) {
        super({
            ...options,
            pageName: SelectionFieldsExample.pageName,
            route: SelectionFieldsExample.route,
            title: 'Selection fields',
            template: SelectionFieldsExample.TEMPLATE,
        });
        this.snapshot = null;
    }

    async onInit() {
        await super.onInit();

        this.form = new FormView({
            containerId: 'selection-form',
            defaults: {
                country: 'US',
                tier: 'pro',
                view: 'list',
                notifications: true,
            },
            fields: [
                { type: 'select', name: 'country', label: 'Select — Country', columns: 6, options: [
                    { value: 'US', label: 'United States' },
                    { value: 'CA', label: 'Canada' },
                    { value: 'UK', label: 'United Kingdom' },
                    { value: 'AU', label: 'Australia' },
                ]},
                { type: 'select', name: 'languages', label: 'Select (multiple) — Languages',
                    multiple: true, columns: 6, options: [
                        { value: 'en', label: 'English' },
                        { value: 'es', label: 'Spanish' },
                        { value: 'fr', label: 'French' },
                        { value: 'de', label: 'German' },
                    ]},
                { type: 'radio', name: 'tier', label: 'Radio — Plan', inline: true, columns: 12, options: [
                    { value: 'free', label: 'Free' },
                    { value: 'pro', label: 'Pro' },
                    { value: 'team', label: 'Team' },
                    { value: 'enterprise', label: 'Enterprise' },
                ]},
                { type: 'checkbox', name: 'agree', label: 'Checkbox — I accept the terms',
                    columns: 6 },
                { type: 'checkbox', name: 'features', label: 'Checkbox group — Features',
                    columns: 6, options: [
                        { value: 'a', label: 'Analytics' },
                        { value: 'b', label: 'Backups' },
                        { value: 'c', label: 'Custom domains' },
                    ]},
                { type: 'toggle', name: 'notifications', label: 'Toggle — Notifications',
                    columns: 6 },
                { type: 'switch', name: 'beta', label: 'Switch — Beta features (alias of toggle)',
                    columns: 6 },
                { type: 'buttongroup', name: 'view', label: 'Button group — View mode',
                    columns: 12, options: [
                        { value: 'list', label: 'List', icon: 'bi-list' },
                        { value: 'grid', label: 'Grid', icon: 'bi-grid' },
                        { value: 'table', label: 'Table', icon: 'bi-table' },
                    ]},
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
            <h1>Selection fields</h1>
            <p class="example-summary">
                <code>select</code> (single + multiple), <code>radio</code>, <code>checkbox</code>
                (single + group), <code>toggle</code> / <code>switch</code>, and
                <code>buttongroup</code>.
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
                            <div data-container="selection-form"></div>
                            <button type="button" class="btn btn-primary mt-3" data-action="snapshot">
                                <i class="bi bi-camera"></i> Snapshot
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
                                <p class="text-muted mb-0">Click Snapshot to capture the values.</p>
                            {{/snapshot|bool}}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default SelectionFieldsExample;
