import { Page } from 'web-mojo';
import { SeriesChart, PieChart } from 'web-mojo/charts';

/**
 * ChartsExample — canonical demo of the Charts extension.
 *
 * Doc:    docs/web-mojo/extensions/Charts.md
 * Route:  extensions/charts
 *
 * Shows the two workhorse chart types side-by-side, each driven from inline
 * static data (no backend). SeriesChart renders a switchable line/bar chart;
 * PieChart renders a clickable pie with auto-percentages. Both are mounted as
 * child views via `addChild() + containerId` — never call render()/mount() on
 * them yourself. The button below toggles the line chart between line and bar
 * via the public `setChartType()` method.
 *
 * Copy-paste recipe: pick SeriesChart or PieChart, give it inline `data:` (or
 * an `endpoint:`), drop a `<div data-container="...">` slot, and let the
 * framework handle the rest.
 */
class ChartsExample extends Page {
    static pageName = 'extensions/charts';
    static route = 'extensions/charts';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ChartsExample.pageName,
            route: ChartsExample.route,
            title: 'Charts — SeriesChart + PieChart',
            template: ChartsExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        this.salesChart = new SeriesChart({
            containerId: 'sales-chart',
            title: 'Monthly revenue',
            chartType: 'line',
            allowTypeSwitch: true,
            tension: 0.4,
            yAxis: { label: 'Revenue', beginAtZero: true },
            tooltip: { y: 'currency:USD' },
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue',
                    data: [15000, 18000, 22000, 19500, 26000, 31000],
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.15)',
                    fill: true,
                }],
            },
            height: 280,
        });
        this.addChild(this.salesChart);

        this.shareChart = new PieChart({
            containerId: 'share-chart',
            title: 'Market share',
            cutout: 0,
            colors: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1'],
            data: [
                { label: 'Desktop', value: 45 },
                { label: 'Mobile', value: 38 },
                { label: 'Tablet', value: 12 },
                { label: 'Other', value: 5 },
            ],
            height: 280,
        });
        this.addChild(this.shareChart);
    }

    async onActionToggleType() {
        const next = this.salesChart.chartType === 'line' ? 'bar' : 'line';
        await this.salesChart.setChartType(next);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Charts</h1>
            <p class="example-summary">
                Chart.js-backed components: SeriesChart (line/bar) and PieChart, each driven from inline data.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/extensions/Charts.md">
                    docs/web-mojo/extensions/Charts.md
                </a>
            </p>

            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span>SeriesChart</span>
                            <button class="btn btn-sm btn-outline-primary" data-action="toggle-type">
                                <i class="bi bi-arrow-left-right"></i> Toggle line / bar
                            </button>
                        </div>
                        <div class="card-body">
                            <div data-container="sales-chart"></div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-5">
                    <div class="card">
                        <div class="card-header">PieChart</div>
                        <div class="card-body">
                            <div data-container="share-chart"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default ChartsExample;
