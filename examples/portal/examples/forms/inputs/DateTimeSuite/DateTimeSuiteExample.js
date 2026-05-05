import { Page, FormView } from 'web-mojo';

/**
 * DateTimeSuiteExample — overview / landing page for the four
 * date+time pickers. One preview card per component with a "Show
 * config" button that dumps the exact `fields:` snippet used to
 * build the FormView.
 *
 * Doc:    docs/web-mojo/forms/inputs/{DatePicker,DateRangePicker,TimePicker,DateTimePicker}.md
 * Route:  forms/inputs/date-time-suite
 *
 * For full per-component example coverage (every option, every
 * variant), see the dedicated example pages linked from each card.
 */
class DateTimeSuiteExample extends Page {
    static pageName = 'forms/inputs/date-time-suite';
    static route = 'forms/inputs/date-time-suite';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DateTimeSuiteExample.pageName,
            route: DateTimeSuiteExample.route,
            title: 'Date & Time Pickers — Overview',
            template: DateTimeSuiteExample.TEMPLATE,
        });
        this.snapshots = {};
        this.configs = {};
    }

    async onInit() {
        await super.onInit();

        const today = new Date();
        const pad2 = (n) => (n < 10 ? '0' + n : String(n));
        const fmt = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
        const todayStr = fmt(today);
        const monthStr = todayStr.slice(0, 7);

        // ─── DatePicker preview ─────────────────────────────────
        const dateFields = [
            { type: 'datepicker', name: 'event_date', label: 'Day', columns: { md: 4 } },
            { type: 'monthpicker', name: 'reporting_month', label: 'Month', value: monthStr, columns: { md: 4 } },
            { type: 'yearpicker', name: 'fiscal_year', label: 'Year', value: String(today.getFullYear()), columns: { md: 4 } },
        ];
        this.dateForm = new FormView({ containerId: 'date-preview', fields: dateFields });
        this.addChild(this.dateForm);
        this.configs.date = JSON.stringify({ fields: dateFields }, null, 2);

        // ─── DateRangePicker preview ────────────────────────────
        const rangeFields = [
            {
                type: 'daterange',
                name: 'reporting',
                label: 'Reporting period',
                startDate: fmt(new Date(today.getTime() - 29 * 86400000)),
                endDate: todayStr,
                presets: 'default',
                help: 'Pick a preset or use the calendar.',
            },
        ];
        this.rangeForm = new FormView({ containerId: 'range-preview', fields: rangeFields });
        this.addChild(this.rangeForm);
        this.configs.range = JSON.stringify({ fields: rangeFields }, null, 2);

        // ─── TimePicker preview ─────────────────────────────────
        const timeFields = [
            {
                type: 'timepicker',
                name: 'meeting_time',
                label: 'Meeting time',
                format: '12h',
                timezone: true,
                value: '09:30',
                help: 'Stored as ISO HH:MM±HH:MM (e.g. "09:30-07:00").',
            },
        ];
        this.timeForm = new FormView({ containerId: 'time-preview', fields: timeFields });
        this.addChild(this.timeForm);
        this.configs.time = JSON.stringify({ fields: timeFields }, null, 2);

        // ─── DateTimePicker preview ─────────────────────────────
        const dtFields = [
            {
                type: 'datetimepicker',
                name: 'scheduled_at',
                label: 'Scheduled at',
                timezone: true,
                timeFormat: '12h',
                value: `${todayStr} 10:00`,
                help: 'Stored as ISO 8601 with offset — recommended for backend interop.',
            },
        ];
        this.dtForm = new FormView({ containerId: 'datetime-preview', fields: dtFields });
        this.addChild(this.dtForm);
        this.configs.datetime = JSON.stringify({ fields: dtFields }, null, 2);
    }

    // Show form data
    async onActionShowData(event, el) {
        const which = el.dataset.which;
        const form = this[`${which}Form`];
        if (!form) return;
        this.snapshots[which] = { kind: 'data', text: JSON.stringify(await form.getFormData(), null, 2) };
        this.render();
    }
    // Show config
    onActionShowConfig(event, el) {
        const which = el.dataset.which;
        this.snapshots[which] = { kind: 'config', text: this.configs[which] };
        this.render();
    }
    // Hide
    onActionHideSnap(event, el) {
        const which = el.dataset.which;
        delete this.snapshots[which];
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Date &amp; Time Pickers — Overview</h1>
            <p class="example-summary">
                Four pickers, one engine. Click any "Show config" to copy the exact
                <code>fields:</code> snippet, or jump into a dedicated example page
                for the full surface area of each component.
            </p>

            <!-- DatePicker -->
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><strong>DatePicker</strong> — single-value date, day / month / year precision</span>
                    <a href="#" class="small" data-action="open-page" data-page="forms/inputs/date-picker">
                        See full examples <i class="bi bi-arrow-right-short"></i>
                    </a>
                </div>
                <div class="card-body">
                    <div data-container="date-preview"></div>
                    {{#snapshots.date}}
                        <div class="mt-3 d-flex justify-content-between align-items-start">
                            <div>
                                <span class="badge bg-secondary me-2">{{snapshots.date.kind}}</span>
                                <button type="button" class="btn btn-sm btn-link" data-action="hide-snap" data-which="date">Hide</button>
                            </div>
                        </div>
                        <pre class="mb-0 small mt-2"><code>{{snapshots.date.text}}</code></pre>
                    {{/snapshots.date}}
                    {{^snapshots.date}}
                        <div class="mt-3 d-flex gap-2">
                            <button type="button" class="btn btn-sm btn-primary" data-action="show-data" data-which="date">
                                <i class="bi bi-eye"></i> Show form data
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-action="show-config" data-which="date">
                                <i class="bi bi-code-square"></i> Show config
                            </button>
                        </div>
                    {{/snapshots.date}}
                </div>
            </div>

            <!-- DateRangePicker -->
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><strong>DateRangePicker</strong> — start/end ranges with optional preset sidebar</span>
                    <a href="#" class="small" data-action="open-page" data-page="forms/inputs/date-range-picker">
                        See full examples <i class="bi bi-arrow-right-short"></i>
                    </a>
                </div>
                <div class="card-body">
                    <div data-container="range-preview"></div>
                    {{#snapshots.range}}
                        <div class="mt-3 d-flex justify-content-between align-items-start">
                            <div>
                                <span class="badge bg-secondary me-2">{{snapshots.range.kind}}</span>
                                <button type="button" class="btn btn-sm btn-link" data-action="hide-snap" data-which="range">Hide</button>
                            </div>
                        </div>
                        <pre class="mb-0 small mt-2"><code>{{snapshots.range.text}}</code></pre>
                    {{/snapshots.range}}
                    {{^snapshots.range}}
                        <div class="mt-3 d-flex gap-2">
                            <button type="button" class="btn btn-sm btn-primary" data-action="show-data" data-which="range">
                                <i class="bi bi-eye"></i> Show form data
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-action="show-config" data-which="range">
                                <i class="bi bi-code-square"></i> Show config
                            </button>
                        </div>
                    {{/snapshots.range}}
                </div>
            </div>

            <!-- TimePicker -->
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><strong>TimePicker</strong> — HH:MM stepper, optional 12h / IANA timezone</span>
                    <a href="#" class="small" data-action="open-page" data-page="forms/inputs/time-picker">
                        See full examples <i class="bi bi-arrow-right-short"></i>
                    </a>
                </div>
                <div class="card-body">
                    <div data-container="time-preview"></div>
                    {{#snapshots.time}}
                        <div class="mt-3 d-flex justify-content-between align-items-start">
                            <div>
                                <span class="badge bg-secondary me-2">{{snapshots.time.kind}}</span>
                                <button type="button" class="btn btn-sm btn-link" data-action="hide-snap" data-which="time">Hide</button>
                            </div>
                        </div>
                        <pre class="mb-0 small mt-2"><code>{{snapshots.time.text}}</code></pre>
                    {{/snapshots.time}}
                    {{^snapshots.time}}
                        <div class="mt-3 d-flex gap-2">
                            <button type="button" class="btn btn-sm btn-primary" data-action="show-data" data-which="time">
                                <i class="bi bi-eye"></i> Show form data
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-action="show-config" data-which="time">
                                <i class="bi bi-code-square"></i> Show config
                            </button>
                        </div>
                    {{/snapshots.time}}
                </div>
            </div>

            <!-- DateTimePicker -->
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><strong>DateTimePicker</strong> — calendar + time + optional timezone, ISO 8601 storage</span>
                    <a href="#" class="small" data-action="open-page" data-page="forms/inputs/date-time-picker">
                        See full examples <i class="bi bi-arrow-right-short"></i>
                    </a>
                </div>
                <div class="card-body">
                    <div data-container="datetime-preview"></div>
                    {{#snapshots.datetime}}
                        <div class="mt-3 d-flex justify-content-between align-items-start">
                            <div>
                                <span class="badge bg-secondary me-2">{{snapshots.datetime.kind}}</span>
                                <button type="button" class="btn btn-sm btn-link" data-action="hide-snap" data-which="datetime">Hide</button>
                            </div>
                        </div>
                        <pre class="mb-0 small mt-2"><code>{{snapshots.datetime.text}}</code></pre>
                    {{/snapshots.datetime}}
                    {{^snapshots.datetime}}
                        <div class="mt-3 d-flex gap-2">
                            <button type="button" class="btn btn-sm btn-primary" data-action="show-data" data-which="datetime">
                                <i class="bi bi-eye"></i> Show form data
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-action="show-config" data-which="datetime">
                                <i class="bi bi-code-square"></i> Show config
                            </button>
                        </div>
                    {{/snapshots.datetime}}
                </div>
            </div>

            <p class="text-muted small mt-4 mb-0">
                Storage: day → <code>YYYY-MM-DD</code>, month → <code>YYYY-MM</code>,
                year → <code>YYYY</code>, time → <code>HH:MM</code> (24h),
                datetime → ISO 8601 with offset (recommended) — e.g.
                <code>2026-05-04T14:30:00-07:00</code>.
            </p>
        </div>
    `;
}

export default DateTimeSuiteExample;
