import { Page } from 'web-mojo';
import { MetricsChart } from 'web-mojo/charts';

/**
 * MetricsChartExample — multi-dataset time-series chart with the full
 * dashboard toolbar.
 *
 * Doc:    docs/web-mojo/extensions/Charts.md
 * Route:  extensions/charts/metrics-chart
 *
 * Showcases:
 *   - Inline Yahoo-style granularity toggle (MIN HR DAY WK MO YR)
 *   - Kebab cluster: gear (date range) · type switch · stats · data · refresh
 *     — collapsed by default, slides in on hover/focus of the kebab
 *   - Container-query swap: chart narrower than 560px → granularity
 *     becomes a compact <select>
 *   - Stats modal (Latest / Min / Max / Avg / Median / Sum per series)
 *     with the granularity + bucket count header
 *   - Data table modal with sortable rows + Download CSV
 *   - Floating toolbar — long titles can't push it around
 *
 * The first chart is seeded with synthetic data so it renders even
 * without a backend. The second chart hits the real /api/metrics/fetch
 * endpoint at localhost:9009 — same convention as MetricsMiniChartExample.
 */

// 24 hours of synthetic "pos transactions" data.
function generateSeed() {
    const now = new Date();
    const labels = [];
    const approved = [];
    const declined = [];
    for (let i = 23; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 60 * 60 * 1000);
        labels.push(`${String(t.getHours()).padStart(2, '0')}:00`);
        // Wave + a little noise so the chart is interesting.
        const phase = ((23 - i) / 23) * Math.PI * 2;
        const base = 220 + Math.sin(phase) * 130 + Math.random() * 40;
        approved.push(Math.max(0, Math.round(base)));
        declined.push(Math.max(0, Math.round(base * 0.12 + Math.random() * 5)));
    }
    return {
        labels,
        datasets: [
            { label: 'Approved', data: approved },
            { label: 'Declined', data: declined }
        ]
    };
}

class MetricsChartExample extends Page {
    static pageName = 'extensions/charts/metrics-chart';
    static route = 'extensions/charts/metrics-chart';

    constructor(options = {}) {
        super({
            ...options,
            pageName: MetricsChartExample.pageName,
            route: MetricsChartExample.route,
            title: 'MetricsChart — multi-dataset time-series',
            template: MetricsChartExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        // Chart #1 — seeded synthetic data so the page is usable without
        // a backend. fetchData is stubbed to push the seed straight into
        // the SeriesChart child; everything else (toolbar, stats modal,
        // data table modal, granularity toggle) works exactly as in
        // production.
        this.seededChart = new MetricsChart({
            containerId: 'metrics-seeded',
            title: 'POS Transactions (seeded)',
            chartType: 'line',
            height: 280,
            granularity: 'hours',
            slugs: ['pos_tx_approved', 'pos_tx_declined'],
            tooltip: { y: 'number:0', x: null },
            showLegend: true,
        });
        this.seededChart.fetchData = async () => {
            const data = generateSeed();
            await this.seededChart.setData(data);
        };
        this.addChild(this.seededChart);

        // Chart #2 — same component, but pointed at the real
        // /api/metrics/fetch endpoint. Renders empty when there's no
        // backend / no data, which is fine for the demo.
        this.liveChart = new MetricsChart({
            containerId: 'metrics-live',
            title: 'Page Views (live backend)',
            chartType: 'bar',
            height: 280,
            granularity: 'hours',
            slugs: ['portal_pageviews'],
            account: 'global',
            defaultDateRange: '24h',
        });
        this.addChild(this.liveChart);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>MetricsChart</h1>
            <p class="example-summary">
                Multi-dataset time-series chart with the full dashboard toolbar:
                inline granularity toggle, gear menu for date range, line/bar
                type switch, stats popover, data-table modal with CSV download,
                and refresh. The toolbar floats over the title, so a long title
                can't push it around. Container-query swap: when the chart is
                narrower than 560px the granularity collapses to a compact
                <code>&lt;select&gt;</code>.
            </p>
            <p class="example-docs-link">
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/extensions/Charts.md">
                    <i class="bi bi-book"></i> docs/web-mojo/extensions/Charts.md
                </a>
            </p>

            <h5 class="mt-4">Seeded chart — works with no backend</h5>
            <p class="text-muted small">
                fetchData is stubbed with a 24-hour synthetic series so the
                toolbar's behaviors are interactive even offline. Hover the
                kebab <code>⋯</code> at the top-right to expand the
                gear/type/stats/data/refresh cluster.
            </p>
            <div data-container="metrics-seeded"></div>

            <h5 class="mt-5">Live chart — pulls /api/metrics/fetch</h5>
            <p class="text-muted small">
                Identical configuration; just unstubbed. Hits
                <code>localhost:9009</code>. With no backend or no metric data
                this renders empty, which is expected.
            </p>
            <div data-container="metrics-live"></div>

            <h5 class="mt-5">Try this</h5>
            <ul class="text-muted small">
                <li>Click <strong>HR / DAY / WK / MO</strong> in the inline granularity toggle.</li>
                <li>Hover the <code>⋯</code> kebab to reveal the secondary cluster.</li>
                <li>Click the info icon for the <strong>stats modal</strong> — shows Latest / Min / Max / Avg / Median / Sum per series, with the granularity + bucket count above the table.</li>
                <li>Click the table icon for the <strong>data table modal</strong> — sortable rows + a Download CSV button.</li>
                <li>Resize the browser narrower than ~560px container-width: the granularity toggle swaps to a <code>&lt;select&gt;</code>.</li>
            </ul>

            <p class="text-muted small mt-3">
                <i class="bi bi-info-circle"></i>
                The second chart fetches from <code>localhost:9009</code>. With no
                backend or no metric data the toolbar renders but the chart body
                is empty — that's expected.
            </p>
        </div>
    `;
}

export default MetricsChartExample;
