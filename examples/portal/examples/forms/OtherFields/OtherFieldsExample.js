import { Page, FormView } from 'web-mojo';

/**
 * OtherFieldsExample — color, range, hex-color, and progress display.
 *
 * Doc:    docs/web-mojo/forms/BasicTypes.md
 * Route:  forms/other-fields
 *
 * The "other" inputs that don't fit the text/select/date taxonomy:
 *   - color  — native colour picker, returns `#rrggbb`
 *   - range  — slider, returns a number
 *   - hex    — hex-string input with `hexType: 'color'` for hex colours
 *
 * Plus a couple of common patterns built from `html` + `button`:
 *   - live progress bar driven from a range field
 *   - a swatch preview that mirrors the colour picker
 *
 * Demonstrates the `change` and `form:changed` events for live UI without
 * a submit cycle.
 */
class OtherFieldsExample extends Page {
    static pageName = 'forms/other-fields';
    static route = 'forms/other-fields';

    constructor(options = {}) {
        super({
            ...options,
            pageName: OtherFieldsExample.pageName,
            route: OtherFieldsExample.route,
            title: 'Other fields',
            template: OtherFieldsExample.TEMPLATE,
        });
        this.accent = '#0d6efd';
        this.volume = 50;
        this.hex = '#ff6b35';
    }

    async onInit() {
        await super.onInit();

        this.form = new FormView({
            containerId: 'other-form',
            defaults: {
                accent: this.accent,
                volume: this.volume,
                hex_color: this.hex,
            },
            fields: [
                { type: 'color', name: 'accent', label: 'Color — Accent', columns: 4 },
                { type: 'hex', name: 'hex_color', label: 'Hex — colour string',
                    hexType: 'color', allowPrefix: true, columns: 4,
                    help: 'Type a hex colour, e.g. <code>#ff6b35</code>.' },
                { type: 'range', name: 'volume', label: 'Range — Volume',
                    min: 0, max: 100, step: 1, columns: 4 },
            ],
        });
        this.addChild(this.form);

        // form:changed fires once per change with the full snapshot.
        this.form.on('form:changed', (data) => {
            if (data) {
                this.accent = data.accent || this.accent;
                this.volume = Number(data.volume ?? this.volume);
                this.hex = data.hex_color || this.hex;
                this.render();
            }
        });
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Other fields</h1>
            <p class="example-summary">
                <code>color</code> picker, <code>range</code> slider, and
                <code>hex</code> with <code>hexType: 'color'</code>. The previews on the right
                update live from the form's <code>form:changed</code> event.
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
                            <div data-container="other-form"></div>
                            <p class="text-muted small mb-0 mt-3">
                                No submit button — every change re-renders the previews on the right.
                            </p>
                        </div>
                    </div>
                </div>
                <div class="col-lg-5">
                    <div class="card mb-3">
                        <div class="card-header">Live previews</div>
                        <div class="card-body">
                            <div class="d-flex align-items-center gap-3 mb-3">
                                <div style="width:48px;height:48px;border-radius:8px;border:1px solid #ccc;background:{{accent}}"></div>
                                <div><strong>Accent</strong><br><code>{{accent}}</code></div>
                            </div>
                            <div class="d-flex align-items-center gap-3 mb-3">
                                <div style="width:48px;height:48px;border-radius:8px;border:1px solid #ccc;background:{{hex}}"></div>
                                <div><strong>Hex colour</strong><br><code>{{hex}}</code></div>
                            </div>
                            <label class="form-label small text-muted mb-1">Volume — <code>{{volume}}</code></label>
                            <div class="progress" style="height:1rem;">
                                <div class="progress-bar" role="progressbar" style="width: {{volume}}%;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default OtherFieldsExample;
