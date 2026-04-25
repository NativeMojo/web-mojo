import { Page, FormView } from 'web-mojo';

/**
 * ComboInputExample — canonical demo of the `combo` / `combobox` field types.
 *
 * Doc:    docs/web-mojo/forms/inputs/ComboInput.md
 * Route:  forms/inputs/combo-input
 *
 * What this shows:
 *   1. `combo` (allowCustom: true) — text input with suggestions; users can
 *      type a value that isn't in the list. Use this when free-form input is
 *      legitimate and the list is just helpful prefill.
 *   2. `combobox` (allowCustom: false) — strict select-from-list; users can
 *      filter by typing but must pick a known option. Use this for state /
 *      country / category pickers where unknown values are invalid.
 *   3. Object options — the field stores the `value`, the dropdown shows the
 *      `label`. The text input echoes the label after a selection.
 */
class ComboInputExample extends Page {
    static pageName = 'forms/inputs/combo-input';
    static route = 'forms/inputs/combo-input';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ComboInputExample.pageName,
            route: ComboInputExample.route,
            title: 'ComboInput — searchable select',
            template: ComboInputExample.TEMPLATE,
        });
        this.snapshot = null;
    }

    async onInit() {
        await super.onInit();

        this.form = new FormView({
            containerId: 'combo-form',
            fields: [
                {
                    type: 'combo',
                    name: 'city',
                    label: 'City (allowCustom)',
                    placeholder: 'Type a city...',
                    options: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
                    allowCustom: true,
                    help: 'Custom values are accepted.',
                    columns: { md: 6 },
                },
                {
                    type: 'combobox',
                    name: 'state',
                    label: 'State (strict)',
                    placeholder: 'Pick a state...',
                    options: [
                        { value: 'CA', label: 'California' },
                        { value: 'NY', label: 'New York' },
                        { value: 'TX', label: 'Texas' },
                        { value: 'WA', label: 'Washington' },
                    ],
                    allowCustom: false,
                    help: 'Returns the option value (e.g. "CA"), not the label.',
                    columns: { md: 6 },
                },
            ],
        });
        this.addChild(this.form);
    }

    async onActionShow(event) {
        event.preventDefault();
        const data = await this.form.getFormData();
        this.snapshot = JSON.stringify(data, null, 2);
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>ComboInput</h1>
            <p class="example-summary">
                Text input + dropdown — users can type or pick. Toggle <code>allowCustom</code>
                to switch between free-form and strict selection.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/forms/inputs/ComboInput.md" target="_blank">
                    docs/web-mojo/forms/inputs/ComboInput.md
                </a>
            </p>

            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="card">
                        <div class="card-body">
                            <div data-container="combo-form"></div>
                            <button type="button" class="btn btn-primary mt-3" data-action="show">
                                <i class="bi bi-eye"></i> Show form data
                            </button>
                        </div>
                    </div>
                </div>
                <div class="col-lg-5">
                    <div class="card">
                        <div class="card-header">getFormData() output</div>
                        <div class="card-body">
                            {{#snapshot|bool}}
                                <pre class="mb-0 small"><code>{{snapshot}}</code></pre>
                            {{/snapshot|bool}}
                            {{^snapshot|bool}}
                                <p class="text-muted mb-0">
                                    Pick or type some values then click <strong>Show form data</strong>.
                                </p>
                            {{/snapshot|bool}}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default ComboInputExample;
