import { Page, FormView } from 'web-mojo';

/**
 * DateTimePickerExample — Calendar + time strip in one popover, with
 * optional IANA timezone.
 *
 * Doc:    docs/web-mojo/forms/inputs/DateTimePicker.md
 * Route:  forms/inputs/date-time-picker
 *
 * Default storage is ISO 8601 — `YYYY-MM-DDTHH:MM:SS` without timezone,
 * `YYYY-MM-DDTHH:MM:SS±HH:MM` with timezone (recommended for backend
 * interop). `outputFormat: 'iana'` selects the legacy
 * `YYYY-MM-DD HH:MM IANA/Zone` form, `'object'` returns
 * `{ date, time, timezone? }`.
 */
class DateTimePickerExample extends Page {
    static pageName = 'forms/inputs/date-time-picker';
    static route = 'forms/inputs/date-time-picker';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DateTimePickerExample.pageName,
            route: DateTimePickerExample.route,
            title: 'DateTimePicker — combined date & time',
            template: DateTimePickerExample.TEMPLATE,
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

        // ─── Card 1 — Basic 24h vs 12h ──────────────────────────
        const basicFields = [
            { type: 'datetimepicker', name: 'event_24h', label: '24-hour', value: `${todayStr} 14:30`, columns: { md: 6 } },
            { type: 'datetimepicker', name: 'event_12h', label: '12-hour', timeFormat: '12h', value: `${todayStr} 09:00`, columns: { md: 6 } },
        ];
        this.basicForm = new FormView({ containerId: 'basic-form', fields: basicFields });
        this.addChild(this.basicForm);
        this.configs.basic = JSON.stringify({ fields: basicFields }, null, 2);

        // ─── Card 2 — With timezone ─────────────────────────────
        const tzFields = [
            {
                type: 'datetimepicker',
                name: 'meeting',
                label: 'Meeting (timezone enabled)',
                timezone: true,
                timeFormat: '12h',
                value: `${todayStr} 10:00`,
                help: 'Stored as ISO 8601 with offset (recommended): "2026-05-04T10:00:00-07:00".',
                columns: { md: 12 },
            },
        ];
        this.tzForm = new FormView({ containerId: 'tz-form', fields: tzFields });
        this.addChild(this.tzForm);
        this.configs.tz = JSON.stringify({ fields: tzFields }, null, 2);

        // ─── Card 3 — Constraints + custom display format ───────
        const future = new Date(today.getTime() + 30 * 86400000);
        const boundsFields = [
            {
                type: 'datetimepicker',
                name: 'appointment',
                label: 'Appointment (next 30 days, 30-min steps)',
                min: fmt(today),
                max: fmt(future),
                timeStep: 30,
                timeFormat: '12h',
                displayFormat: 'MMMM D, YYYY',
                value: `${todayStr} 09:00`,
                columns: { md: 12 },
            },
        ];
        this.boundsForm = new FormView({ containerId: 'bounds-form', fields: boundsFields });
        this.addChild(this.boundsForm);
        this.configs.bounds = JSON.stringify({ fields: boundsFields }, null, 2);

        // ─── Card 4 — Output formats ────────────────────────────
        const outputFields = [
            {
                type: 'datetimepicker',
                name: 'iana_form',
                label: "outputFormat: 'iana' (legacy)",
                timezone: true,
                outputFormat: 'iana',
                value: `${todayStr} 10:00`,
                help: 'Stores as "YYYY-MM-DD HH:MM IANA/Zone".',
                columns: { md: 6 },
            },
            {
                type: 'datetimepicker',
                name: 'object_form',
                label: "outputFormat: 'object'",
                timezone: true,
                outputFormat: 'object',
                value: `${todayStr} 10:00`,
                help: 'Stores as { date, time, timezone }.',
                columns: { md: 6 },
            },
        ];
        this.outputForm = new FormView({ containerId: 'output-form', fields: outputFields });
        this.addChild(this.outputForm);
        this.configs.output = JSON.stringify({ fields: outputFields }, null, 2);
    }

    async onActionShowData(event, el) {
        const which = el.dataset.which;
        const form = this[`${which}Form`];
        if (!form) return;
        this.snapshots[which] = { kind: 'data', text: JSON.stringify(await form.getFormData(), null, 2) };
        this.render();
    }
    onActionShowConfig(event, el) {
        const which = el.dataset.which;
        this.snapshots[which] = { kind: 'config', text: this.configs[which] };
        this.render();
    }
    onActionHideSnap(event, el) {
        const which = el.dataset.which;
        delete this.snapshots[which];
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>DateTimePicker</h1>
            <p class="example-summary">
                Calendar on the left, time stepper on the right, optional IANA timezone stacked below — all in one popover.
                Default storage is <strong>ISO 8601 with offset</strong> — recommended for backend interop.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/inputs/DateTimePicker.md">
                    docs/web-mojo/forms/inputs/DateTimePicker.md
                </a>
            </p>

            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><strong>1. Time format</strong> — 24h vs 12h</span>
                    <code class="small">timeFormat</code>
                </div>
                <div class="card-body">
                    <div data-container="basic-form"></div>
                    {{#snapshots.basic}}
                        <div class="mt-3 d-flex justify-content-between align-items-start">
                            <span class="badge bg-secondary">{{snapshots.basic.kind}}</span>
                            <button type="button" class="btn btn-sm btn-link" data-action="hide-snap" data-which="basic">Hide</button>
                        </div>
                        <pre class="mb-0 small mt-1"><code>{{snapshots.basic.text}}</code></pre>
                    {{/snapshots.basic}}
                    {{^snapshots.basic}}
                        <div class="mt-3 d-flex gap-2">
                            <button type="button" class="btn btn-sm btn-primary" data-action="show-data" data-which="basic">
                                <i class="bi bi-eye"></i> Show form data
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-action="show-config" data-which="basic">
                                <i class="bi bi-code-square"></i> Show config
                            </button>
                        </div>
                    {{/snapshots.basic}}
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><strong>2. Timezone</strong> — TZ slot below the time strip, ISO 8601 storage</span>
                    <code class="small">timezone: true</code>
                </div>
                <div class="card-body">
                    <div data-container="tz-form"></div>
                    {{#snapshots.tz}}
                        <div class="mt-3 d-flex justify-content-between align-items-start">
                            <span class="badge bg-secondary">{{snapshots.tz.kind}}</span>
                            <button type="button" class="btn btn-sm btn-link" data-action="hide-snap" data-which="tz">Hide</button>
                        </div>
                        <pre class="mb-0 small mt-1"><code>{{snapshots.tz.text}}</code></pre>
                    {{/snapshots.tz}}
                    {{^snapshots.tz}}
                        <div class="mt-3 d-flex gap-2">
                            <button type="button" class="btn btn-sm btn-primary" data-action="show-data" data-which="tz">
                                <i class="bi bi-eye"></i> Show form data
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-action="show-config" data-which="tz">
                                <i class="bi bi-code-square"></i> Show config
                            </button>
                        </div>
                    {{/snapshots.tz}}
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><strong>3. Constraints + display format</strong></span>
                    <code class="small">min · max · timeStep · displayFormat</code>
                </div>
                <div class="card-body">
                    <div data-container="bounds-form"></div>
                    {{#snapshots.bounds}}
                        <div class="mt-3 d-flex justify-content-between align-items-start">
                            <span class="badge bg-secondary">{{snapshots.bounds.kind}}</span>
                            <button type="button" class="btn btn-sm btn-link" data-action="hide-snap" data-which="bounds">Hide</button>
                        </div>
                        <pre class="mb-0 small mt-1"><code>{{snapshots.bounds.text}}</code></pre>
                    {{/snapshots.bounds}}
                    {{^snapshots.bounds}}
                        <div class="mt-3 d-flex gap-2">
                            <button type="button" class="btn btn-sm btn-primary" data-action="show-data" data-which="bounds">
                                <i class="bi bi-eye"></i> Show form data
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-action="show-config" data-which="bounds">
                                <i class="bi bi-code-square"></i> Show config
                            </button>
                        </div>
                    {{/snapshots.bounds}}
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><strong>4. Output formats</strong> — legacy IANA-string vs object</span>
                    <code class="small">outputFormat: 'iana' | 'object'</code>
                </div>
                <div class="card-body">
                    <div data-container="output-form"></div>
                    {{#snapshots.output}}
                        <div class="mt-3 d-flex justify-content-between align-items-start">
                            <span class="badge bg-secondary">{{snapshots.output.kind}}</span>
                            <button type="button" class="btn btn-sm btn-link" data-action="hide-snap" data-which="output">Hide</button>
                        </div>
                        <pre class="mb-0 small mt-1"><code>{{snapshots.output.text}}</code></pre>
                    {{/snapshots.output}}
                    {{^snapshots.output}}
                        <div class="mt-3 d-flex gap-2">
                            <button type="button" class="btn btn-sm btn-primary" data-action="show-data" data-which="output">
                                <i class="bi bi-eye"></i> Show form data
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-action="show-config" data-which="output">
                                <i class="bi bi-code-square"></i> Show config
                            </button>
                        </div>
                    {{/snapshots.output}}
                </div>
            </div>
        </div>
    `;
}

export default DateTimePickerExample;
