import { Page } from 'web-mojo';
import { MiniChart, CircularProgress } from 'web-mojo/charts';

/**
 * ChartsExample — canonical demo of the framework's NATIVE chart components.
 *
 * Doc:    docs/web-mojo/extensions/Charts.md
 * Route:  extensions/charts
 *
 * web-mojo ships its own SVG-based charts — no Chart.js dependency. The two
 * workhorses for dashboards and detail screens are:
 *
 *   - MiniChart       — sparkline-style line / bar chart with optional dots,
 *                       crosshair, tooltip, value formatter, and live updates.
 *   - CircularProgress — single-arc or multi-segment dial with center content,
 *                       auto-sized stroke, theme variants, value formatter.
 *
 * Both are regular Views — mount via `addChild` + `containerId`, hand them
 * `data:` / `value:` (or `endpoint:` for live data), and call their public
 * setters (`setData`, `setValue`, `setChartType`, …) to update without a
 * full re-render.
 *
 * For the heavier MetricsChart / SeriesChart / PieChart variants, see the
 * sibling example pages.
 */
const SEED_REVENUE = [12, 19, 14, 23, 18, 25, 31, 28, 35, 30, 40, 38];
const SEED_VISITS  = [120, 132, 110, 145, 160, 178, 199, 220, 215, 240, 232, 260];
const SEED_BARS    = [40, 35, 60, 80, 55, 70, 90, 75, 65, 85, 95, 100];

class ChartsExample extends Page {
    static pageName = 'extensions/charts';
    static route = 'extensions/charts';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ChartsExample.pageName,
            route: ChartsExample.route,
            title: 'Charts — native MiniChart + CircularProgress',
            template: ChartsExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        // Sparkline — line, smooth, filled, with crosshair + tooltip.
        this.revenueChart = new MiniChart({
            containerId: 'revenue-slot',
            chartType: 'line',
            data: SEED_REVENUE,
            height: 80,
            color: 'rgba(13, 110, 253, 1)',
            fillColor: 'rgba(13, 110, 253, 0.12)',
            fill: true,
            smoothing: 0.4,
            showDots: true,
            showCrosshair: true,
            showTooltip: true,
            valueFormat: 'currency',
        });
        this.addChild(this.revenueChart);

        // Bars — discrete buckets, no fill, no crosshair.
        this.visitsChart = new MiniChart({
            containerId: 'visits-slot',
            chartType: 'bar',
            data: SEED_BARS,
            height: 80,
            color: 'rgba(25, 135, 84, 1)',
            barGap: 3,
            showTooltip: true,
        });
        this.addChild(this.visitsChart);

        // Toggle target — same data, switched between line + bar via the
        // public setChartType() setter (no full re-render).
        this.toggleChart = new MiniChart({
            containerId: 'toggle-slot',
            chartType: 'line',
            data: SEED_VISITS,
            height: 80,
            color: 'rgba(220, 53, 69, 1)',
            fillColor: 'rgba(220, 53, 69, 0.10)',
            fill: true,
            smoothing: 0.3,
        });
        this.addChild(this.toggleChart);

        // Single-arc dial.
        this.disk = new CircularProgress({
            containerId: 'disk-slot',
            value: 64,
            size: 'md',
            theme: 'basic',
            variant: 'primary',
            label: 'Disk used',
        });
        this.addChild(this.disk);

        // Multi-segment dial — three slices.
        this.budget = new CircularProgress({
            containerId: 'budget-slot',
            size: 'md',
            theme: 'basic',
            segments: [
                { value: 35, color: '#198754', label: 'Eng' },
                { value: 25, color: '#0d6efd', label: 'Sales' },
                { value: 18, color: '#fd7e14', label: 'Ops' },
            ],
            showValue: true,
            label: 'Q2 spend',
        });
        this.addChild(this.budget);
    }

    onActionSwitchLine() { this.toggleChart.setChartType('line'); }
    onActionSwitchBar()  { this.toggleChart.setChartType('bar'); }
    onActionRandomDisk() { this.disk.setValue(Math.round(Math.random() * 100)); }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Charts (native)</h1>
            <p class="example-summary">
                Native SVG charts — <code>MiniChart</code> and <code>CircularProgress</code>.
                No Chart.js. Each is a regular View; update with <code>setData()</code>,
                <code>setValue()</code>, <code>setChartType()</code> — no full re-render.
            </p>
            <p class="example-docs-link">
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/extensions/Charts.md">
                    <i class="bi bi-book"></i> docs/web-mojo/extensions/Charts.md
                </a>
            </p>

            <div class="row g-3">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-baseline mb-2">
                                <strong>Revenue</strong>
                                <span class="text-muted small">12-month sparkline · line · filled · dots + tooltip</span>
                            </div>
                            <div data-container="revenue-slot"></div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-baseline mb-2">
                                <strong>Visits</strong>
                                <span class="text-muted small">12-month sparkline · bars · tooltip</span>
                            </div>
                            <div data-container="visits-slot"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card mt-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-baseline mb-2">
                        <strong>Switch chart type at runtime</strong>
                        <div>
                            <button class="btn btn-sm btn-outline-primary" data-action="switch-line">Line</button>
                            <button class="btn btn-sm btn-outline-primary ms-1" data-action="switch-bar">Bar</button>
                        </div>
                    </div>
                    <div data-container="toggle-slot"></div>
                </div>
            </div>

            <div class="row g-3 mt-1">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body text-center">
                            <strong>CircularProgress — single arc</strong>
                            <div class="d-flex justify-content-center my-3" data-container="disk-slot"></div>
                            <button class="btn btn-sm btn-outline-secondary" data-action="random-disk">
                                <i class="bi bi-shuffle"></i> Randomise
                            </button>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body text-center">
                            <strong>CircularProgress — multi-segment</strong>
                            <div class="d-flex justify-content-center my-3" data-container="budget-slot"></div>
                            <span class="text-muted small">3 colored slices, single component.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default ChartsExample;
