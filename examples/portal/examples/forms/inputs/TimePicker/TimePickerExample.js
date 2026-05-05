import { Page, FormView } from 'web-mojo';

/**
 * TimePickerExample — HH:MM stepper picker with 12h/24h, step, and timezone.
 *
 * Doc:    docs/web-mojo/forms/inputs/TimePicker.md
 * Route:  forms/inputs/time-picker
 *
 * Storage is always 24h canonical 'HH:MM' regardless of display format.
 * With timezone enabled, default storage is ISO 'HH:MM±HH:MM'
 * (e.g. '14:30-07:00') — `outputFormat: 'iana'` selects the legacy
 * 'HH:MM IANA/Zone' form, `'object'` returns { time, timezone }.
 */
class TimePickerExample extends Page {
    static pageName = 'forms/inputs/time-picker';
    static route = 'forms/inputs/time-picker';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TimePickerExample.pageName,
            route: TimePickerExample.route,
            title: 'TimePicker — HH:MM stepper picker',
            template: TimePickerExample.TEMPLATE,
        });
        this.snapshots = {};
        this.configs = {};
    }

    async onInit() {
        await super.onInit();

        // ─── Card 1 — Format & step ─────────────────────────────
        const basicFields = [
            { type: 'timepicker', name: 'meeting_24h', label: '24-hour format', value: '14:30', columns: { md: 4 } },
            { type: 'timepicker', name: 'meeting_12h', label: '12-hour format', format: '12h', value: '09:00', columns: { md: 4 } },
            { type: 'timepicker', name: 'meeting_step', label: 'Step: 15 min', step: 15, value: '08:45', columns: { md: 4 } },
        ];
        this.basicForm = new FormView({ containerId: 'basic-form', fields: basicFields });
        this.addChild(this.basicForm);
        this.configs.basic = JSON.stringify({ fields: basicFields }, null, 2);

        // ─── Card 2 — Timezone ──────────────────────────────────
        const tzFields = [
            {
                type: 'timepicker',
                name: 'meeting_local',
                label: 'Local timezone (auto)',
                timezone: true,
                format: '12h',
                value: '09:30',
                help: 'Defaults to your browser timezone. Stored as ISO HH:MM±HH:MM.',
                columns: { md: 6 },
            },
            {
                type: 'timepicker',
                name: 'meeting_remote',
                label: 'Pre-set zone',
                timezone: true,
                value: '14:00 Europe/London',
                columns: { md: 6 },
            },
        ];
        this.tzForm = new FormView({ containerId: 'tz-form', fields: tzFields });
        this.addChild(this.tzForm);
        this.configs.tz = JSON.stringify({ fields: tzFields }, null, 2);

        // ─── Card 3 — Constraints ───────────────────────────────
        const boundsFields = [
            {
                type: 'timepicker',
                name: 'business_hours',
                label: 'Business hours',
                min: '09:00',
                max: '17:00',
                value: '13:00',
                help: 'Stepper clamps to 09:00–17:00.',
                columns: { md: 6 },
            },
        ];
        this.boundsForm = new FormView({ containerId: 'bounds-form', fields: boundsFields });
        this.addChild(this.boundsForm);
        this.configs.bounds = JSON.stringify({ fields: boundsFields }, null, 2);
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
            <h1>TimePicker</h1>
            <p class="example-summary">
                HH:MM stepper picker. 24h or 12h format, configurable step, optional IANA timezone.
                Stored as 24h canonical 'HH:MM' regardless of display format. With timezone, default
                storage is ISO 'HH:MM±HH:MM' (e.g. '14:30-07:00').
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/inputs/TimePicker.md">
                    docs/web-mojo/forms/inputs/TimePicker.md
                </a>
            </p>

            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><strong>1. Format & step</strong> — 24h, 12h, and step intervals</span>
                    <code class="small">format · step</code>
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
                    <span><strong>2. Timezone</strong> — IANA combobox stacked below time</span>
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
                    <span><strong>3. Constraints</strong> — min/max bounds</span>
                    <code class="small">min · max</code>
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
        </div>
    `;
}

export default TimePickerExample;
