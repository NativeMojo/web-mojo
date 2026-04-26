import { Page } from 'web-mojo';
import { MiniChart } from 'web-mojo/charts';

/**
 * ChartsExample — canonical demo of MiniChart, the framework's native SVG
 * sparkline chart. No Chart.js dependency.
 *
 * Doc:    docs/web-mojo/extensions/Charts.md
 * Route:  extensions/charts
 *
 * MiniChart is a regular View — mount via `addChild` + `containerId`,
 * hand it inline `data:`, and call `setData()` / `setType()` to update
 * without a full re-render. Crosshair, tooltip, and value formatter all
 * declarative.
 *
 * Companion examples (siblings on the same docs page):
 *   - CircularProgress — see `extensions/charts/circular-progress`.
 *   - MetricsMiniChartWidget — backend-driven tiles, see `metrics-mini-chart`.
 */
const SEED_REVENUE = [12, 19, 14, 23, 18, 25, 31, 28, 35, 30, 40, 38];
const SEED_BARS    = [40, 35, 60, 80, 55, 70, 90, 75, 65, 85, 95, 100];
const SEED_VISITS  = [120, 132, 110, 145, 160, 178, 199, 220, 215, 240, 232, 260];

class ChartsExample extends Page {
    static pageName = 'extensions/charts';
    static route = 'extensions/charts';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ChartsExample.pageName,
            route: ChartsExample.route,
            title: 'Charts — native MiniChart',
            template: ChartsExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        // Sparkline — line, smooth, filled, with crosshair + dots + tooltip.
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

        // Bars — discrete buckets. minValue: 0 keeps the smallest bar visible
        // (default minValue is the dataset min, which would render as h=0).
        this.visitsChart = new MiniChart({
            containerId: 'visits-slot',
            chartType: 'bar',
            data: SEED_BARS,
            height: 80,
            color: 'rgba(25, 135, 84, 1)',
            barGap: 3,
            minValue: 0,
            showTooltip: true,
        });
        this.addChild(this.visitsChart);

        // Toggle target — same data, switched between line / bar via the
        // public `setType()` setter (no full re-render).
        this.toggleChart = new MiniChart({
            containerId: 'toggle-slot',
            chartType: 'line',
            data: SEED_VISITS,
            height: 80,
            color: 'rgba(220, 53, 69, 1)',
            fillColor: 'rgba(220, 53, 69, 0.10)',
            fill: true,
            smoothing: 0.3,
            minValue: 0,
        });
        this.addChild(this.toggleChart);
    }

    onActionSwitchLine() { this.toggleChart.setType('line'); }
    onActionSwitchBar()  { this.toggleChart.setType('bar'); }

    onActionRandomise() {
        const next = Array.from({ length: 12 }, () => Math.round(20 + Math.random() * 240));
        this.toggleChart.setData(next);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Charts — native MiniChart</h1>
            <p class="example-summary">
                <code>MiniChart</code> is the framework's native SVG sparkline. No Chart.js.
                Update via <code>setData()</code> / <code>setType()</code> — partial repaint, not a full re-render.
                For dials see <a href="?page=extensions/charts/circular-progress">CircularProgress</a>;
                for backend-driven tiles see <a href="?page=extensions/charts/metrics-mini-chart">MetricsMiniChartWidget</a>.
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
                                <span class="text-muted small">line · filled · dots · crosshair · currency tooltip</span>
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
                                <span class="text-muted small">bars · minValue: 0 · tooltip</span>
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
                            <button class="btn btn-sm btn-outline-secondary ms-2" data-action="randomise">
                                <i class="bi bi-shuffle"></i> Randomise data
                            </button>
                        </div>
                    </div>
                    <div data-container="toggle-slot"></div>
                </div>
            </div>
        </div>
    `;
}

export default ChartsExample;
