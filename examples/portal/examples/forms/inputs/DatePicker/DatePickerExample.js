import { Page, FormView } from 'web-mojo';

/**
 * DatePickerExample — single-value date pickers.
 *
 * Doc:    docs/web-mojo/forms/inputs/DatePicker.md
 * Route:  forms/inputs/date-picker
 *
 * Day · Month · Year — same engine, three precisions.
 *
 * Storage is always canonical: day → YYYY-MM-DD, month → YYYY-MM,
 * year → YYYY. `displayFormat` controls only what the user sees.
 */
class DatePickerExample extends Page {
    static pageName = 'forms/inputs/date-picker';
    static route = 'forms/inputs/date-picker';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DatePickerExample.pageName,
            route: DatePickerExample.route,
            title: 'DatePicker — single-value pickers',
            template: DatePickerExample.TEMPLATE,
        });
        this.snapshot = null;
        this.config = null;
    }

    async onInit() {
        await super.onInit();

        const today = new Date();
        const pad2 = (n) => (n < 10 ? '0' + n : String(n));
        const fmt = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
        const todayStr = fmt(today);
        const monthStr = todayStr.slice(0, 7);
        const yearStr = todayStr.slice(0, 4);

        const fields = [
            {
                type: 'datepicker',
                name: 'event_date',
                label: 'Day',
                placeholder: 'Pick a date...',
                columns: 4,
            },
            {
                type: 'monthpicker',
                name: 'reporting_month',
                label: 'Month',
                value: monthStr,
                columns: 4,
            },
            {
                type: 'yearpicker',
                name: 'fiscal_year',
                label: 'Year',
                value: yearStr,
                columns: 4,
            },
        ];

        this.form = new FormView({ containerId: 'date-form', fields });
        this.addChild(this.form);
        this.fieldsConfig = JSON.stringify({ fields }, null, 2);
    }

    async onActionShowData(event) {
        event.preventDefault();
        const data = await this.form.getFormData();
        this.snapshot = { kind: 'data', text: JSON.stringify(data, null, 2) };
        this.render();
    }
    onActionShowConfig(event) {
        event.preventDefault();
        this.snapshot = { kind: 'config', text: this.fieldsConfig };
        this.render();
    }
    onActionHideSnap(event) {
        event.preventDefault();
        this.snapshot = null;
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>DatePicker</h1>
            <p class="example-summary">
                Single-value date picker with day / month / year precision via the
                <code>monthpicker</code> and <code>yearpicker</code> field-type aliases
                (or <code>precision: 'month' | 'year'</code> on a regular <code>datepicker</code>).
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/inputs/DatePicker.md">
                    docs/web-mojo/forms/inputs/DatePicker.md
                </a>
            </p>

            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <strong>Single-value pickers</strong>
                            <code class="small text-muted">datepicker · monthpicker · yearpicker</code>
                        </div>
                        <div class="card-body">
                            <div data-container="date-form"></div>
                            <div class="mt-3 d-flex gap-2">
                                <button type="button" class="btn btn-sm btn-primary" data-action="show-data">
                                    <i class="bi bi-eye"></i> Show form data
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-secondary" data-action="show-config">
                                    <i class="bi bi-code-square"></i> Show config
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-5">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            {{#snapshot|bool}}
                                <span class="badge bg-secondary">{{snapshot.kind}}</span>
                                <button type="button" class="btn btn-sm btn-link" data-action="hide-snap">Hide</button>
                            {{/snapshot|bool}}
                            {{^snapshot|bool}}
                                <span class="text-muted small">Output panel</span>
                            {{/snapshot|bool}}
                        </div>
                        <div class="card-body">
                            {{#snapshot|bool}}
                                <pre class="mb-0 small"><code>{{snapshot.text}}</code></pre>
                            {{/snapshot|bool}}
                            {{^snapshot|bool}}
                                <p class="text-muted mb-0">
                                    Click <strong>Show form data</strong> to dump current values, or
                                    <strong>Show config</strong> to see the literal <code>fields:</code> array
                                    used to build this form.
                                </p>
                                <p class="text-muted mb-0 mt-2 small">
                                    Day stores <code>YYYY-MM-DD</code>, month <code>YYYY-MM</code>, year <code>YYYY</code>.
                                </p>
                            {{/snapshot|bool}}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default DatePickerExample;
