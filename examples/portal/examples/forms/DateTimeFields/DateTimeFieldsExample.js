import { Page, FormView } from 'web-mojo';

/**
 * DateTimeFieldsExample — native HTML5 date / time / datetime fields.
 *
 * Doc:    docs/web-mojo/forms/BasicTypes.md
 * Route:  forms/date-time-fields
 *
 * Three native pickers, one of each type:
 *   - date            — `YYYY-MM-DD`, with `min` / `max` constraints
 *   - time            — `HH:MM`, optional `step` (seconds)
 *   - datetime-local  — `YYYY-MM-DDTHH:MM`
 *
 * For richer pickers (themed, range, locale-aware), use the Easepick-backed
 * `datepicker` and `daterange` types — see the inputs/ examples.
 */
class DateTimeFieldsExample extends Page {
    static pageName = 'forms/date-time-fields';
    static route = 'forms/date-time-fields';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DateTimeFieldsExample.pageName,
            route: DateTimeFieldsExample.route,
            title: 'Date & time fields',
            template: DateTimeFieldsExample.TEMPLATE,
        });
        this.snapshot = null;
    }

    async onInit() {
        await super.onInit();

        // Build min/max relative to today so the example stays evergreen.
        const today = new Date().toISOString().slice(0, 10);
        const oneYearOut = new Date(Date.now() + 365 * 86400000)
            .toISOString().slice(0, 10);

        this.form = new FormView({
            containerId: 'datetime-form',
            fields: [
                { type: 'date', name: 'birthday', label: 'Date — Birthday', columns: 6,
                    max: today, help: 'Native HTML5 date picker.' },
                { type: 'date', name: 'event_date', label: 'Date — Event (next 12 mo)',
                    columns: 6, min: today, max: oneYearOut },
                { type: 'time', name: 'start_time', label: 'Time — Start', columns: 6,
                    step: 60 },
                { type: 'time', name: 'end_time', label: 'Time — End (with seconds)',
                    columns: 6, step: 1 },
                { type: 'datetime', name: 'meeting_at', label: 'Datetime-local — Meeting',
                    columns: 12, help: 'Combined date + time, browser-native picker.' },
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
            <h1>Date &amp; time fields</h1>
            <p class="example-summary">
                Native HTML5 <code>date</code>, <code>time</code>, and
                <code>datetime-local</code> fields with <code>min</code> /
                <code>max</code> / <code>step</code> constraints.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/forms/BasicTypes.md" target="_blank">
                    docs/web-mojo/forms/BasicTypes.md
                </a>
            </p>

            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="card">
                        <div class="card-body">
                            <div data-container="datetime-form"></div>
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
                                <p class="text-muted mb-0">Click Snapshot to see the values.</p>
                            {{/snapshot|bool}}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default DateTimeFieldsExample;
