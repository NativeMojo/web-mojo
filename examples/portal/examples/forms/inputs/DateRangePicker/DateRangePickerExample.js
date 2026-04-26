import { Page, FormView } from 'web-mojo';

/**
 * DateRangePickerExample — canonical demo of the `daterange` field type.
 *
 * Doc:    docs/web-mojo/forms/inputs/DateRangePicker.md
 * Route:  forms/inputs/date-range-picker
 *
 * What this shows:
 *   1. A single picker that produces two named output fields (start + end).
 *      `startName` / `endName` control the keys returned by `getFormData()`.
 *   2. `displayFormat` for human-readable rendering, `format` for storage.
 *   3. `outputFormat: 'object'` (alternative) — returns `{ start, end }` under
 *      a single key. The default split-into-two-fields shape is shown here
 *      because it's what most filter/report forms want.
 */
class DateRangePickerExample extends Page {
    static pageName = 'forms/inputs/date-range-picker';
    static route = 'forms/inputs/date-range-picker';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DateRangePickerExample.pageName,
            route: DateRangePickerExample.route,
            title: 'DateRangePicker — start/end date selection',
            template: DateRangePickerExample.TEMPLATE,
        });
        this.snapshot = null;
    }

    async onInit() {
        await super.onInit();

        // Default to "last 30 days" so the form has a meaningful starting state.
        const today = new Date();
        const thirtyAgo = new Date();
        thirtyAgo.setDate(today.getDate() - 30);
        const fmt = (d) => d.toISOString().split('T')[0];

        this.form = new FormView({
            containerId: 'range-form',
            fields: [
                {
                    type: 'daterange',
                    name: 'period',
                    startName: 'start_date',
                    endName: 'end_date',
                    label: 'Report period',
                    startDate: fmt(thirtyAgo),
                    endDate: fmt(today),
                    displayFormat: 'MMM DD, YYYY',
                    format: 'YYYY-MM-DD',
                    separator: ' to ',
                    help: 'Defaults to the last 30 days.',
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
            <h1>DateRangePicker</h1>
            <p class="example-summary">
                Start/end date range in a single picker. Produces two named fields
                (<code>startName</code> + <code>endName</code>) on submit.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/inputs/DateRangePicker.md">
                    docs/web-mojo/forms/inputs/DateRangePicker.md
                </a>
            </p>

            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="card">
                        <div class="card-body">
                            <div data-container="range-form"></div>
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
                                    Pick a range then click <strong>Show form data</strong>.
                                    The output has both <code>start_date</code> and <code>end_date</code> keys.
                                </p>
                            {{/snapshot|bool}}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default DateRangePickerExample;
