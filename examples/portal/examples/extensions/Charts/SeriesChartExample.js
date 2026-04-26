import { Page } from 'web-mojo';
import { SeriesChart } from 'web-mojo/charts';

/**
 * SeriesChartExample — canonical demo of the native multi-dataset SeriesChart.
 *
 * Doc:    docs/web-mojo/extensions/Charts.md
 * Route:  extensions/charts/series
 *
 * Showcases:
 *   - Multi-dataset line chart with default palette
 *   - Multi-dataset bar chart (STACKED by default — pass `grouped: true` to opt out)
 *   - Custom palette + colorGenerator overflow
 *   - Animated `setData` (default) and click-to-toggle legend
 *   - `chart:click` event payload
 */

const LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
const SEED_LINES = {
    labels: LABELS,
    datasets: [
        { label: 'Revenue',  data: [12, 19, 14, 23, 18, 25, 31, 28] },
        { label: 'Profit',   data: [4,  6,  5,  9,  7,  10, 13, 11] },
        { label: 'Expenses', data: [8,  13, 9,  14, 11, 15, 18, 17] }
    ]
};

const SEED_BARS_STACKED = {
    labels: LABELS,
    datasets: [
        { label: 'Sales',     data: [40, 35, 60, 80, 55, 70, 90, 75] },
        { label: 'Marketing', data: [25, 28, 30, 35, 33, 40, 45, 38] },
        { label: 'Support',   data: [15, 18, 12, 22, 20, 25, 28, 24] }
    ]
};

class SeriesChartExample extends Page {
    static pageName = 'extensions/charts/series';
    static route = 'extensions/charts/series';

    constructor(options = {}) {
        super({
            ...options,
            pageName: SeriesChartExample.pageName,
            route: SeriesChartExample.route,
            title: 'SeriesChart — native multi-dataset',
            template: SeriesChartExample.TEMPLATE
        });
    }

    async onInit() {
        await super.onInit();

        // Multi-dataset line — default palette, default animation.
        this.lineChart = new SeriesChart({
            containerId: 'lines-slot',
            chartType: 'line',
            data: SEED_LINES,
            height: 240,
            showLegend: true
        });
        this.addChild(this.lineChart);

        // Multi-dataset bar — STACKED by default.
        this.stackedChart = new SeriesChart({
            containerId: 'stacked-slot',
            chartType: 'bar',
            data: SEED_BARS_STACKED,
            height: 240,
            showLegend: true
        });
        this.addChild(this.stackedChart);

        // Same data, grouped (opt-out of stacking).
        this.groupedChart = new SeriesChart({
            containerId: 'grouped-slot',
            chartType: 'bar',
            grouped: true,
            data: SEED_BARS_STACKED,
            height: 240,
            showLegend: true
        });
        this.addChild(this.groupedChart);

        // Many datasets — palette overflows into the colorGenerator.
        const many = {
            labels: LABELS,
            datasets: Array.from({ length: 14 }, (_, i) => ({
                label: `Series ${i + 1}`,
                data: LABELS.map(() => Math.round(10 + Math.random() * 90))
            }))
        };
        this.manyChart = new SeriesChart({
            containerId: 'many-slot',
            chartType: 'line',
            data: many,
            height: 260,
            showLegend: true,
            legendPosition: 'right'
        });
        this.addChild(this.manyChart);

        // Animated update target.
        this.animChart = new SeriesChart({
            containerId: 'anim-slot',
            chartType: 'bar',
            data: SEED_BARS_STACKED,
            height: 240,
            animationDuration: 500
        });
        this.addChild(this.animChart);

        this.animChart.on?.('chart:click', (payload) => {
            console.log('chart:click →', payload);
        });
    }

    onActionRandomiseAnim() {
        const next = {
            labels: LABELS,
            datasets: SEED_BARS_STACKED.datasets.map(ds => ({
                label: ds.label,
                data: LABELS.map(() => Math.round(5 + Math.random() * 95))
            }))
        };
        this.animChart.setData(next);
    }

    onActionToggleAnimType() {
        const next = this.animChart.chartType === 'bar' ? 'line' : 'bar';
        this.animChart.setChartType(next);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>SeriesChart — native multi-dataset</h1>
            <p class="example-summary">
                <code>SeriesChart</code> is the framework's native SVG line/bar/area chart.
                Multiple datasets, dynamic colors, stacked-by-default bars, click-to-toggle legend, animated updates.
                No Chart.js dependency.
            </p>
            <p class="example-docs-link">
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/extensions/Charts.md">
                    <i class="bi bi-book"></i> docs/web-mojo/extensions/Charts.md
                </a>
            </p>

            <div class="row g-3">
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-body">
                            <strong>Multi-dataset line</strong>
                            <div class="text-muted small mb-2">3 datasets · default palette · click legend to toggle</div>
                            <div data-container="lines-slot"></div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-body">
                            <strong>Stacked bars (default)</strong>
                            <div class="text-muted small mb-2"><code>chartType: 'bar'</code> — stacked by default</div>
                            <div data-container="stacked-slot"></div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-body">
                            <strong>Grouped bars (opt-out)</strong>
                            <div class="text-muted small mb-2"><code>grouped: true</code> · same data, side-by-side</div>
                            <div data-container="grouped-slot"></div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-body">
                            <strong>Many datasets</strong>
                            <div class="text-muted small mb-2">Palette + golden-angle HSL generator</div>
                            <div data-container="many-slot"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card mt-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-baseline mb-2">
                        <strong>Animated <code>setData</code></strong>
                        <div>
                            <button class="btn btn-sm btn-outline-primary" data-action="randomise-anim">
                                <i class="bi bi-shuffle"></i> Randomise
                            </button>
                            <button class="btn btn-sm btn-outline-secondary ms-1" data-action="toggle-anim-type">
                                Toggle line / bar
                            </button>
                        </div>
                    </div>
                    <div data-container="anim-slot"></div>
                    <small class="text-muted">Click any bar/dot to fire <code>chart:click</code> (open the console).</small>
                </div>
            </div>
        </div>
    `;
}

export default SeriesChartExample;
