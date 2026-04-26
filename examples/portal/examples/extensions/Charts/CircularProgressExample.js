import { Page } from 'web-mojo';
import { CircularProgress } from 'web-mojo/charts';

/**
 * CircularProgressExample — every dial variant in one screen.
 *
 * Doc:    docs/web-mojo/extensions/Charts.md
 * Route:  extensions/charts/circular-progress
 *
 * CircularProgress is the framework's native SVG dial. No Chart.js. Drives
 * dashboard tiles, capacity readouts, and segmented spend visualisations.
 * Update by calling `setValue()` / `setSegments()` — partial repaint, not
 * a full re-render.
 */
class CircularProgressExample extends Page {
    static pageName = 'extensions/charts/circular-progress';
    static route = 'extensions/charts/circular-progress';

    constructor(options = {}) {
        super({
            ...options,
            pageName: CircularProgressExample.pageName,
            route: CircularProgressExample.route,
            title: 'CircularProgress — variants',
            template: CircularProgressExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        // 5 size presets in a row.
        for (const size of ['xs', 'sm', 'md', 'lg', 'xl']) {
            this.addChild(new CircularProgress({
                containerId: `size-${size}`,
                value: 72,
                size,
                variant: 'primary',
                label: size.toUpperCase(),
            }));
        }

        // Variants — color cues for status.
        for (const variant of ['primary', 'success', 'warning', 'danger', 'info']) {
            this.addChild(new CircularProgress({
                containerId: `variant-${variant}`,
                value: 60 + Math.round(Math.random() * 35),
                size: 'md',
                variant,
                label: variant,
            }));
        }

        // 3D theme + custom value formatter.
        this.addChild(new CircularProgress({
            containerId: 'theme-3d',
            value: 88,
            size: 'lg',
            theme: '3d',
            variant: 'primary',
            label: 'Battery',
            valueFormat: 'percentage',
        }));

        // Multi-segment dial (budget split across categories).
        this.budget = new CircularProgress({
            containerId: 'segments',
            size: 'lg',
            theme: 'basic',
            segments: [
                { value: 35, color: '#198754', label: 'Eng' },
                { value: 25, color: '#0d6efd', label: 'Sales' },
                { value: 20, color: '#fd7e14', label: 'Ops' },
                { value: 12, color: '#dc3545', label: 'Other' },
            ],
            label: 'Q2 spend',
        });
        this.addChild(this.budget);

        // Live-updating dial — flips value via setValue() every 2s.
        this.live = new CircularProgress({
            containerId: 'live',
            value: 50,
            size: 'lg',
            variant: 'success',
            label: 'CPU',
        });
        this.addChild(this.live);
    }

    async onEnter() {
        await super.onEnter();
        this._timer = setInterval(() => {
            if (!this.isActive) return;
            this.live.setValue(Math.round(20 + Math.random() * 80));
        }, 2000);
    }

    async onExit() {
        clearInterval(this._timer);
        await super.onExit();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>CircularProgress — variants</h1>
            <p class="example-summary">
                Native SVG dial. Five size presets, five variants, 3D + basic themes,
                multi-segment, and live updates via <code>setValue()</code>.
            </p>
            <p class="example-docs-link">
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/extensions/Charts.md">
                    <i class="bi bi-book"></i> docs/web-mojo/extensions/Charts.md
                </a>
            </p>

            <div class="card mb-3"><div class="card-body">
                <strong>Size presets</strong>
                <div class="d-flex align-items-end gap-3 mt-2">
                    <div class="text-center"><div data-container="size-xs"></div></div>
                    <div class="text-center"><div data-container="size-sm"></div></div>
                    <div class="text-center"><div data-container="size-md"></div></div>
                    <div class="text-center"><div data-container="size-lg"></div></div>
                    <div class="text-center"><div data-container="size-xl"></div></div>
                </div>
            </div></div>

            <div class="card mb-3"><div class="card-body">
                <strong>Variants</strong>
                <div class="d-flex gap-3 mt-2">
                    <div data-container="variant-primary"></div>
                    <div data-container="variant-success"></div>
                    <div data-container="variant-warning"></div>
                    <div data-container="variant-danger"></div>
                    <div data-container="variant-info"></div>
                </div>
            </div></div>

            <div class="row g-3">
                <div class="col-md-4">
                    <div class="card"><div class="card-body text-center">
                        <strong>3D theme</strong>
                        <div class="d-flex justify-content-center my-2" data-container="theme-3d"></div>
                    </div></div>
                </div>
                <div class="col-md-4">
                    <div class="card"><div class="card-body text-center">
                        <strong>Multi-segment</strong>
                        <div class="d-flex justify-content-center my-2" data-container="segments"></div>
                    </div></div>
                </div>
                <div class="col-md-4">
                    <div class="card"><div class="card-body text-center">
                        <strong>Live (setValue every 2s)</strong>
                        <div class="d-flex justify-content-center my-2" data-container="live"></div>
                    </div></div>
                </div>
            </div>
        </div>
    `;
}

export default CircularProgressExample;
