import { Page } from 'web-mojo';
import { MetricsMiniChartWidget } from 'web-mojo/charts';

/**
 * MetricsMiniChartExample — backend-driven sparkline tiles.
 *
 * Doc:    docs/web-mojo/extensions/MetricsMiniChartWidget.md
 * Route:  extensions/charts/metrics-mini-chart
 *
 * MetricsMiniChartWidget extends MiniChart with a header (icon, title,
 * subtitle, trending arrow) and a backend-fetched series. Configurable
 * granularity, optional settings dropdown, and persistent settings via
 * localStorage. Native SVG — no Chart.js.
 *
 * Hits `/api/metrics/fetch` on the backend at localhost:9009. If the
 * backend is offline or has no metric data, the chart renders empty.
 */
class MetricsMiniChartExample extends Page {
    static pageName = 'extensions/charts/metrics-mini-chart';
    static route = 'extensions/charts/metrics-mini-chart';

    constructor(options = {}) {
        super({
            ...options,
            pageName: MetricsMiniChartExample.pageName,
            route: MetricsMiniChartExample.route,
            title: 'MetricsMiniChartWidget — backend-driven tiles',
            template: MetricsMiniChartExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        // Tile #1 — a colored card with a smooth filled line on top.
        this.addChild(new MetricsMiniChartWidget({
            containerId: 'metric-1',
            icon: 'bi bi-graph-up-arrow',
            title: 'Page views',
            subtitle: '{{total}} this hour',
            background: '#0d6efd',
            textColor: '#FFFFFF',
            granularity: 'hours',
            slugs: ['portal_pageviews'],
            chartType: 'line',
            height: 70,
            color: 'rgba(255,255,255,0.85)',
            fill: true,
            fillColor: 'rgba(255,255,255,0.25)',
            smoothing: 0.4,
            showTrending: true,
        }));

        // Tile #2 — bars on a contrasting card.
        this.addChild(new MetricsMiniChartWidget({
            containerId: 'metric-2',
            icon: 'bi bi-credit-card-fill',
            title: 'Declined transactions',
            subtitle: '{{total}} declined',
            background: '#F3465D',
            textColor: '#FFFFFF',
            granularity: 'hours',
            slugs: ['pos_tx_declined'],
            chartType: 'bar',
            height: 70,
            color: 'rgba(255,255,255,0.95)',
            minValue: 0,
            showTrending: true,
        }));

        // Tile #3 — settings popover enabled (granularity, chart type, date range).
        this.addChild(new MetricsMiniChartWidget({
            containerId: 'metric-3',
            icon: 'bi bi-shield-check',
            title: 'Bouncer blocks',
            subtitle: '{{total}} blocks',
            background: '#198754',
            textColor: '#FFFFFF',
            granularity: 'hours',
            slugs: ['bouncer_blocks'],
            chartType: 'line',
            height: 70,
            color: 'rgba(255,255,255,0.95)',
            fill: true,
            fillColor: 'rgba(255,255,255,0.20)',
            smoothing: 0.3,
            showSettings: true,
            settingsKey: 'examples/bouncer-blocks',
            showDateRange: true,
        }));
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>MetricsMiniChartWidget</h1>
            <p class="example-summary">
                Backend-driven sparkline tiles. Native SVG (extends MiniChart). Each tile
                fetches <code>/api/metrics/fetch</code>, renders a header + line/bar
                sparkline, and (optionally) a gear-icon settings dropdown that persists.
            </p>
            <p class="example-docs-link">
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/extensions/MetricsMiniChartWidget.md">
                    <i class="bi bi-book"></i> docs/web-mojo/extensions/MetricsMiniChartWidget.md
                </a>
            </p>

            <div class="row g-3">
                <div class="col-md-4"><div data-container="metric-1"></div></div>
                <div class="col-md-4"><div data-container="metric-2"></div></div>
                <div class="col-md-4"><div data-container="metric-3"></div></div>
            </div>

            <p class="text-muted small mt-3">
                <i class="bi bi-info-circle"></i>
                Tiles fetch from <code>localhost:9009</code>. With no backend or no metric
                data, the headers render but the sparklines are empty — that's expected.
            </p>
        </div>
    `;
}

export default MetricsMiniChartExample;
