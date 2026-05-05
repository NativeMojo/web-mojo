import { Page, FormView } from 'web-mojo';

/**
 * DateTimeSuiteExample — full showcase of the DatePicker / DateRangePicker
 * surface area in one page.
 *
 * Doc:    docs/web-mojo/forms/inputs/DatePicker.md, DateRangePicker.md
 * Route:  forms/inputs/date-time-suite
 *
 * Each card is a self-contained `FormView` mounted into its own
 * container. Click "Show form data" on any card to dump that form's
 * current values.
 */
class DateTimeSuiteExample extends Page {
    static pageName = 'forms/inputs/date-time-suite';
    static route = 'forms/inputs/date-time-suite';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DateTimeSuiteExample.pageName,
            route: DateTimeSuiteExample.route,
            title: 'Date & Time Suite — full DatePicker showcase',
            template: DateTimeSuiteExample.TEMPLATE,
        });
        this.snapshots = {};
    }

    async onInit() {
        await super.onInit();

        const today = new Date();
        const fmt = (d) => d.toISOString().split('T')[0];
        const todayStr = fmt(today);
        const monthStr = todayStr.slice(0, 7);
        const yearStr = todayStr.slice(0, 4);

        const ago = (n) => {
            const d = new Date();
            d.setDate(today.getDate() - n);
            return fmt(d);
        };

        // ─── Card 1 — DatePicker precision: day / month / year ───────
        this.dayMonthYearForm = new FormView({
            containerId: 'day-month-year-form',
            fields: [
                {
                    type: 'datepicker',
                    name: 'event_date',
                    label: 'Day precision',
                    placeholder: 'Pick a date...',
                    columns: { md: 4 },
                },
                {
                    type: 'monthpicker',
                    name: 'reporting_month',
                    label: 'Month precision',
                    placeholder: 'Pick a month...',
                    value: monthStr,
                    columns: { md: 4 },
                },
                {
                    type: 'yearpicker',
                    name: 'fiscal_year',
                    label: 'Year precision',
                    placeholder: 'Pick a year...',
                    value: yearStr,
                    columns: { md: 4 },
                },
            ],
        });
        this.addChild(this.dayMonthYearForm);

        // ─── Card 2 — DateRangePicker, all three precisions ──────────
        this.rangeForm = new FormView({
            containerId: 'range-form',
            fields: [
                {
                    type: 'daterange',
                    name: 'day_range',
                    label: 'Day range',
                    startDate: ago(29),
                    endDate: todayStr,
                    separator: ' to ',
                    columns: { md: 12 },
                },
                {
                    type: 'monthrange',
                    name: 'month_range',
                    label: 'Month range',
                    startDate: monthStr,
                    endDate: monthStr,
                    columns: { md: 6 },
                },
                {
                    type: 'yearrange',
                    name: 'year_range',
                    label: 'Year range',
                    startDate: String(today.getFullYear() - 4),
                    endDate: yearStr,
                    columns: { md: 6 },
                },
            ],
        });
        this.addChild(this.rangeForm);

        // ─── Card 3 — Range with Stripe-style preset sidebar ─────────
        this.presetForm = new FormView({
            containerId: 'preset-form',
            fields: [
                {
                    type: 'daterange',
                    name: 'reporting',
                    label: 'Reporting period (with presets)',
                    startDate: ago(29),
                    endDate: todayStr,
                    presets: 'default',
                    help: 'Click the trigger to open the picker. Pick a preset or use the calendar.',
                },
                {
                    type: 'monthrange',
                    name: 'fiscal_period',
                    label: 'Fiscal period (month presets)',
                    startDate: monthStr,
                    endDate: monthStr,
                    presets: 'default',
                    help: 'Month-precision presets: This month / YTD / Last 12 months / etc.',
                },
            ],
        });
        this.addChild(this.presetForm);

        // ─── Card 4 — Constraints: min, max, disabledDates, inline ───
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        const sixMonthsOut = new Date();
        sixMonthsOut.setMonth(today.getMonth() + 6);
        // Disable the next two Sundays as a demo.
        const disabled = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(today.getDate() + i);
            if (d.getDay() === 0) disabled.push(fmt(d));
        }

        this.constraintsForm = new FormView({
            containerId: 'constraints-form',
            fields: [
                {
                    type: 'datepicker',
                    name: 'appointment',
                    label: 'Future date only',
                    min: fmt(tomorrow),
                    max: fmt(sixMonthsOut),
                    placeholder: 'Tomorrow through ~6 months out',
                    help: 'Past dates and dates beyond 6 months are disabled.',
                    columns: { md: 6 },
                },
                {
                    type: 'datepicker',
                    name: 'workday',
                    label: 'Skip Sundays',
                    min: todayStr,
                    disabledDates: disabled,
                    placeholder: 'Sundays disabled...',
                    help: 'Specific dates can be disabled via `disabledDates`.',
                    columns: { md: 6 },
                },
            ],
        });
        this.addChild(this.constraintsForm);

        // ─── Card 5 — Inline calendar ────────────────────────────────
        this.inlineForm = new FormView({
            containerId: 'inline-form',
            fields: [
                {
                    type: 'datepicker',
                    name: 'check_in',
                    label: 'Check-in (inline)',
                    inline: true,
                    min: todayStr,
                    columns: { md: 6 },
                },
                {
                    type: 'monthpicker',
                    name: 'travel_month',
                    label: 'Travel month (inline)',
                    inline: true,
                    value: monthStr,
                    columns: { md: 6 },
                },
            ],
        });
        this.addChild(this.inlineForm);

        // ─── Card 6 — Custom display formats ─────────────────────────
        this.formatForm = new FormView({
            containerId: 'format-form',
            fields: [
                {
                    type: 'datepicker',
                    name: 'us_format',
                    label: 'US format',
                    displayFormat: 'MM/DD/YYYY',
                    placeholder: '01/15/2026',
                    columns: { md: 4 },
                },
                {
                    type: 'datepicker',
                    name: 'iso_format',
                    label: 'ISO format',
                    displayFormat: 'YYYY-MM-DD',
                    placeholder: '2026-01-15',
                    columns: { md: 4 },
                },
                {
                    type: 'datepicker',
                    name: 'long_format',
                    label: 'Long format',
                    displayFormat: 'MMMM DD, YYYY',
                    placeholder: 'January 15, 2026',
                    columns: { md: 4 },
                },
            ],
        });
        this.addChild(this.formatForm);
    }

    // ─── Action handlers ─────────────────────────────────────────────

    async onActionShowDmy() {
        this.snapshots.dmy = JSON.stringify(await this.dayMonthYearForm.getFormData(), null, 2);
        this.render();
    }
    async onActionShowRange() {
        this.snapshots.range = JSON.stringify(await this.rangeForm.getFormData(), null, 2);
        this.render();
    }
    async onActionShowPreset() {
        this.snapshots.preset = JSON.stringify(await this.presetForm.getFormData(), null, 2);
        this.render();
    }
    async onActionShowConstraints() {
        this.snapshots.constraints = JSON.stringify(await this.constraintsForm.getFormData(), null, 2);
        this.render();
    }
    async onActionShowInline() {
        this.snapshots.inline = JSON.stringify(await this.inlineForm.getFormData(), null, 2);
        this.render();
    }
    async onActionShowFormat() {
        this.snapshots.format = JSON.stringify(await this.formatForm.getFormData(), null, 2);
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Date &amp; Time Suite</h1>
            <p class="example-summary">
                The full DatePicker / DateRangePicker surface area, all on one page.
                Day / month / year precision · ranges · presets · min/max · disabled dates · inline · custom formats.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/inputs/DatePicker.md">
                    docs/web-mojo/forms/inputs/DatePicker.md
                </a>
                ·
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/inputs/DateRangePicker.md">
                    DateRangePicker.md
                </a>
            </p>

            <!-- Card 1 — Precision -->
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><strong>1. Precision</strong> — day / month / year, same engine</span>
                    <code class="small">datepicker · monthpicker · yearpicker</code>
                </div>
                <div class="card-body">
                    <div data-container="day-month-year-form"></div>
                    <div class="d-flex justify-content-between align-items-start mt-3">
                        <button type="button" class="btn btn-sm btn-primary" data-action="show-dmy">
                            <i class="bi bi-eye"></i> Show form data
                        </button>
                        {{#snapshots.dmy|bool}}
                            <pre class="mb-0 small flex-grow-1 ms-3"><code>{{snapshots.dmy}}</code></pre>
                        {{/snapshots.dmy|bool}}
                    </div>
                </div>
            </div>

            <!-- Card 2 — Ranges -->
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><strong>2. Ranges</strong> — day, month, year. Cross-page anchor persistence.</span>
                    <code class="small">daterange · monthrange · yearrange</code>
                </div>
                <div class="card-body">
                    <div data-container="range-form"></div>
                    <div class="d-flex justify-content-between align-items-start mt-3">
                        <button type="button" class="btn btn-sm btn-primary" data-action="show-range">
                            <i class="bi bi-eye"></i> Show form data
                        </button>
                        {{#snapshots.range|bool}}
                            <pre class="mb-0 small flex-grow-1 ms-3"><code>{{snapshots.range}}</code></pre>
                        {{/snapshots.range|bool}}
                    </div>
                </div>
            </div>

            <!-- Card 3 — Presets -->
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><strong>3. Preset sidebar</strong> — Stripe-style quick ranges</span>
                    <code class="small">presets: 'default'</code>
                </div>
                <div class="card-body">
                    <div data-container="preset-form"></div>
                    <div class="d-flex justify-content-between align-items-start mt-3">
                        <button type="button" class="btn btn-sm btn-primary" data-action="show-preset">
                            <i class="bi bi-eye"></i> Show form data
                        </button>
                        {{#snapshots.preset|bool}}
                            <pre class="mb-0 small flex-grow-1 ms-3"><code>{{snapshots.preset}}</code></pre>
                        {{/snapshots.preset|bool}}
                    </div>
                </div>
            </div>

            <!-- Card 4 — Constraints -->
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><strong>4. Constraints</strong> — min, max, disabledDates</span>
                    <code class="small">min · max · disabledDates</code>
                </div>
                <div class="card-body">
                    <div data-container="constraints-form"></div>
                    <div class="d-flex justify-content-between align-items-start mt-3">
                        <button type="button" class="btn btn-sm btn-primary" data-action="show-constraints">
                            <i class="bi bi-eye"></i> Show form data
                        </button>
                        {{#snapshots.constraints|bool}}
                            <pre class="mb-0 small flex-grow-1 ms-3"><code>{{snapshots.constraints}}</code></pre>
                        {{/snapshots.constraints|bool}}
                    </div>
                </div>
            </div>

            <!-- Card 5 — Inline -->
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><strong>5. Inline mode</strong> — calendar always visible</span>
                    <code class="small">inline: true</code>
                </div>
                <div class="card-body">
                    <div data-container="inline-form"></div>
                    <div class="d-flex justify-content-between align-items-start mt-3">
                        <button type="button" class="btn btn-sm btn-primary" data-action="show-inline">
                            <i class="bi bi-eye"></i> Show form data
                        </button>
                        {{#snapshots.inline|bool}}
                            <pre class="mb-0 small flex-grow-1 ms-3"><code>{{snapshots.inline}}</code></pre>
                        {{/snapshots.inline|bool}}
                    </div>
                </div>
            </div>

            <!-- Card 6 — Display formats -->
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><strong>6. Display formats</strong> — what the user sees vs. what's stored</span>
                    <code class="small">displayFormat</code>
                </div>
                <div class="card-body">
                    <div data-container="format-form"></div>
                    <div class="d-flex justify-content-between align-items-start mt-3">
                        <button type="button" class="btn btn-sm btn-primary" data-action="show-format">
                            <i class="bi bi-eye"></i> Show form data
                        </button>
                        {{#snapshots.format|bool}}
                            <pre class="mb-0 small flex-grow-1 ms-3"><code>{{snapshots.format}}</code></pre>
                        {{/snapshots.format|bool}}
                    </div>
                </div>
            </div>

            <p class="text-muted small mt-4 mb-0">
                Storage is always the canonical form regardless of <code>displayFormat</code>:
                day → <code>YYYY-MM-DD</code>, month → <code>YYYY-MM</code>, year → <code>YYYY</code>.
            </p>
        </div>
    `;
}

export default DateTimeSuiteExample;
