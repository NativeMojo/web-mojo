import { Page } from 'web-mojo';
import { PieChart } from 'web-mojo/charts';

/**
 * PieChartExample — canonical demo of the native PieChart.
 *
 * Doc:    docs/web-mojo/extensions/Charts.md
 * Route:  extensions/charts/pie
 *
 * Showcases:
 *   - Solid pie + doughnut (`cutout`)
 *   - Segment-edge labels (`showLabels`)
 *   - Click drill-down (`chart:click` event)
 *   - Animated `setData` updates
 */

const SEED = [
    { label: 'Desktop', value: 45 },
    { label: 'Mobile',  value: 35 },
    { label: 'Tablet',  value: 12 },
    { label: 'Other',   value: 8  }
];

class PieChartExample extends Page {
    static pageName = 'extensions/charts/pie';
    static route = 'extensions/charts/pie';

    constructor(options = {}) {
        super({
            ...options,
            pageName: PieChartExample.pageName,
            route: PieChartExample.route,
            title: 'PieChart — native pie / doughnut',
            template: PieChartExample.TEMPLATE
        });
    }

    async onInit() {
        await super.onInit();

        this.pie = new PieChart({
            containerId: 'pie-slot',
            data: SEED,
            width: 240, height: 240,
            legendPosition: 'right'
        });
        this.addChild(this.pie);

        this.donut = new PieChart({
            containerId: 'donut-slot',
            data: SEED,
            cutout: 0.55,
            width: 240, height: 240,
            legendPosition: 'right',
            // Center label demo — function form receives ({ total, segments })
            // and returns the string to render inside the cutout.
            centerLabel: ({ total }) => total,
            centerSubLabel: 'TOTAL'
        });
        this.addChild(this.donut);

        this.labelled = new PieChart({
            containerId: 'labelled-slot',
            data: SEED,
            width: 280, height: 280,
            showLabels: true,
            legendPosition: 'bottom'
        });
        this.addChild(this.labelled);

        this.click = new PieChart({
            containerId: 'click-slot',
            data: SEED,
            width: 240, height: 240,
            legendPosition: 'right'
        });
        this.addChild(this.click);

        this.click.on?.('chart:click', ({ slice }) => {
            const out = this.element?.querySelector('[data-click-output]');
            if (out) out.textContent = `Clicked: ${slice.label} — ${slice.value} (${slice.pct.toFixed(1)}%)`;
        });
    }

    onActionRandomisePie() {
        const next = SEED.map(s => ({
            label: s.label,
            value: Math.round(5 + Math.random() * 80)
        }));
        this.click.setData(next);
        this.donut.setData(next);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>PieChart — native pie / doughnut</h1>
            <p class="example-summary">
                <code>PieChart</code> is the framework's native SVG pie/doughnut.
                Multi-segment, optional <code>cutout</code> for doughnut, animated <code>setData</code>,
                <code>chart:click</code> drill-down. No Chart.js dependency.
            </p>

            <div class="row g-3">
                <div class="col-lg-6">
                    <div class="card"><div class="card-body">
                        <strong>Pie</strong>
                        <div class="text-muted small mb-2">Default solid pie</div>
                        <div data-container="pie-slot"></div>
                    </div></div>
                </div>
                <div class="col-lg-6">
                    <div class="card"><div class="card-body">
                        <strong>Doughnut + center label</strong>
                        <div class="text-muted small mb-2"><code>cutout: 0.55, centerLabel, centerSubLabel</code></div>
                        <div data-container="donut-slot"></div>
                    </div></div>
                </div>
                <div class="col-lg-6">
                    <div class="card"><div class="card-body">
                        <strong>Slice labels</strong>
                        <div class="text-muted small mb-2"><code>showLabels: true</code></div>
                        <div data-container="labelled-slot"></div>
                    </div></div>
                </div>
                <div class="col-lg-6">
                    <div class="card"><div class="card-body">
                        <div class="d-flex justify-content-between align-items-baseline mb-2">
                            <strong>Click + animate</strong>
                            <button class="btn btn-sm btn-outline-secondary" data-action="randomise-pie">
                                <i class="bi bi-shuffle"></i> Randomise
                            </button>
                        </div>
                        <div data-container="click-slot"></div>
                        <small class="text-muted" data-click-output>Click a slice for drill-down.</small>
                    </div></div>
                </div>
            </div>
        </div>
    `;
}

export default PieChartExample;
