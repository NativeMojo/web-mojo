import { Page, FormView } from 'web-mojo';

/**
 * DatePickerExample — canonical demo of the `datepicker` field type.
 *
 * Doc:    docs/web-mojo/forms/inputs/DatePicker.md
 * Route:  forms/inputs/date-picker
 *
 * What this shows:
 *   1. The Easepick-backed calendar UI — consistent across browsers, unlike
 *      native `<input type="date">`.
 *   2. `min` constraints — appointment is restricted to today onward.
 *   3. `displayFormat` vs `format` — the input shows a friendly format while
 *      `getFormData()` returns the canonical `YYYY-MM-DD` string.
 *   4. Inline mode — the calendar is always visible (no popover).
 */
class DatePickerExample extends Page {
    static pageName = 'forms/inputs/date-picker';
    static route = 'forms/inputs/date-picker';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DatePickerExample.pageName,
            route: DatePickerExample.route,
            title: 'DatePicker — calendar date selection',
            template: DatePickerExample.TEMPLATE,
        });
        this.snapshot = null;
    }

    async onInit() {
        await super.onInit();

        const today = new Date().toISOString().split('T')[0];

        this.form = new FormView({
            containerId: 'date-form',
            fields: [
                {
                    type: 'datepicker',
                    name: 'birth_date',
                    label: 'Birth date',
                    displayFormat: 'MMM DD, YYYY',
                    format: 'YYYY-MM-DD',
                    placeholder: 'Pick a date...',
                    columns: { md: 6 },
                },
                {
                    type: 'datepicker',
                    name: 'appointment',
                    label: 'Appointment (today or later)',
                    min: today,
                    placeholder: 'Future date only...',
                    help: 'Past dates are disabled.',
                    columns: { md: 6 },
                },
                {
                    type: 'datepicker',
                    name: 'check_in',
                    label: 'Check-in (inline calendar)',
                    inline: true,
                    min: today,
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
            <h1>DatePicker</h1>
            <p class="example-summary">
                Calendar UI date picker (Easepick). Consistent across browsers; supports min/max,
                disabled dates, inline calendars, and custom display formats.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/forms/inputs/DatePicker.md" target="_blank">
                    docs/web-mojo/forms/inputs/DatePicker.md
                </a>
            </p>

            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="card">
                        <div class="card-body">
                            <div data-container="date-form"></div>
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
                                    Pick some dates then click <strong>Show form data</strong>.
                                    Note that values are returned as <code>YYYY-MM-DD</code> strings.
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
