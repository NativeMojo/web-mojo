import { Page, FormView } from 'web-mojo';

/**
 * DateRangePickerExample — start/end range pickers, organized by family.
 *
 * Doc:    docs/web-mojo/forms/inputs/DateRangePicker.md
 * Route:  forms/inputs/date-range-picker
 *
 * Day · Month · Year ranges. Same engine, three precisions,
 * cross-page anchor persistence. Optional Stripe-style preset sidebar.
 */
class DateRangePickerExample extends Page {
    static pageName = 'forms/inputs/date-range-picker';
    static route = 'forms/inputs/date-range-picker';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DateRangePickerExample.pageName,
            route: DateRangePickerExample.route,
            title: 'DateRangePicker — start/end range pickers',
            template: DateRangePickerExample.TEMPLATE,
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
        const ago = (n) => { const d = new Date(); d.setDate(today.getDate() - n); return fmt(d); };

        const precisionFields = [
            {
                type: 'daterange',
                name: 'period',
                startName: 'start_date',
                endName: 'end_date',
                label: 'Day range',
                startDate: ago(29),
                endDate: todayStr,
                separator: ' to ',
                columns: 12,
            },
            {
                type: 'monthrange',
                name: 'month_period',
                startName: 'start_month',
                endName: 'end_month',
                label: 'Month range',
                startDate: monthStr,
                endDate: monthStr,
                columns: 12,
            },
            {
                type: 'yearrange',
                name: 'year_period',
                startName: 'start_year',
                endName: 'end_year',
                label: 'Year range',
                startDate: String(today.getFullYear() - 4),
                endDate: yearStr,
                columns: 12,
            },
        ];
        this.precisionForm = new FormView({ containerId: 'precision-form', fields: precisionFields });
        this.addChild(this.precisionForm);

        const presetFields = [
            {
                type: 'daterange',
                name: 'reporting',
                label: 'Day range with preset sidebar',
                startDate: ago(29),
                endDate: todayStr,
                presets: 'default',
                help: 'Click the trigger — pick a preset or use the calendar.',
            },
        ];
        this.presetForm = new FormView({ containerId: 'preset-form', fields: presetFields });
        this.addChild(this.presetForm);

        this.fieldsConfig = JSON.stringify({
            precision: { fields: precisionFields },
            presets: { fields: presetFields },
        }, null, 2);
    }

    async onActionShowData(event) {
        event.preventDefault();
        const a = await this.precisionForm.getFormData();
        const b = await this.presetForm.getFormData();
        this.snapshot = { kind: 'data', text: JSON.stringify({ ...a, ...b }, null, 2) };
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
            <h1>DateRangePicker</h1>
            <p class="example-summary">
                Start/end range with day / month / year precision and an optional
                Stripe-style preset sidebar. Cross-page anchor persistence — pick
                a start in May, page to June, commit the end there.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/inputs/DateRangePicker.md">
                    docs/web-mojo/forms/inputs/DateRangePicker.md
                </a>
            </p>

            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="card mb-4">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <strong>Range pickers</strong>
                            <code class="small text-muted">daterange · monthrange · yearrange</code>
                        </div>
                        <div class="card-body">
                            <div data-container="precision-form"></div>
                        </div>
                    </div>

                    <div class="card mb-3">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <strong>With preset sidebar</strong>
                            <code class="small text-muted">presets: 'default'</code>
                        </div>
                        <div class="card-body">
                            <div data-container="preset-form"></div>
                        </div>
                    </div>

                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-primary" data-action="show-data">
                            <i class="bi bi-eye"></i> Show form data
                        </button>
                        <button type="button" class="btn btn-outline-secondary" data-action="show-config">
                            <i class="bi bi-code-square"></i> Show config
                        </button>
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
                                    <strong>Show config</strong> to see the literal <code>fields:</code> arrays
                                    used to build this form.
                                </p>
                                <p class="text-muted mb-0 mt-2 small">
                                    Each range emits a <code>start_*</code> and <code>end_*</code> key.
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
