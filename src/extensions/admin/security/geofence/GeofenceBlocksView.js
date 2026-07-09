/**
 * GeofenceBlocksView - "Blocks log" tab: the evidence surface.
 *
 * Activity strip on top — metric tiles + a blocks-over-time chart using the
 * portal's house widgets (MetricsMiniChartWidget / MetricsChart, mirroring
 * AdminDashboardPage) over slugs the backend records on every block
 * (geofence:blocks, geofence:exempt — deduped log entries still count).
 * Chart exports to PNG for compliance evidence.
 *
 * Below it, the block events table: incident events with
 * category=geofence_block, rendered with plain-language reasons and severity
 * striping (5 abuse/fail-closed · 6 fail-open pass-through · 7 rule error).
 */
import View from '@core/View.js';
import TableView from '@core/views/table/TableView.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import { MetricsChart, MetricsMiniChartWidget, exportChartPng } from '@ext/charts/index.js';
import { IncidentEvent, IncidentEventList } from '@ext/admin/models/Incident.js';
import EventView from '@ext/admin/incidents/EventView.js';
import { describeDecision, regionName, SECURITY_EVENTS_PERMS } from './geofenceData.js';

// Function-formatter output lands in cell.innerHTML raw — escape every
// request-derived field (reason codes, geo codes, IPs) like IncidentView does.
const escapeHtml = MOJOUtils.escapeHtml;

// Row click opens the standard event detail; bind defensively — EventTablePage
// normally does this, but this tab must not depend on its import order.
if (!IncidentEvent.VIEW_CLASS) IncidentEvent.VIEW_CLASS = EventView;

/** Plain-language cell text for a block event's reason code. */
function reasonText(reason) {
    if (!reason) return '—';
    if (reason === 'lookup_failed') {
        // The log can't tell fail-open pass-through (level 6) from a
        // fail-closed block here — the level column carries that.
        return 'Location lookups were unavailable — fail posture applied.';
    }
    return describeDecision({ reason, allowed: false });
}

class GeofenceBlocksView extends View {
    constructor(options = {}) {
        super({
            className: 'geofence-blocks-view',
            template: `
                <div class="row g-3 mb-3">
                    <div class="col-md-6 col-xl-4"><div data-container="kpi-blocks"></div></div>
                    <div class="col-md-6 col-xl-4"><div data-container="kpi-exempt"></div></div>
                </div>
                <div class="d-flex align-items-center mb-2">
                    <span class="text-secondary small">Counts every block, including repeats that are deduped in the log below.</span>
                    <button type="button" class="btn btn-outline-secondary btn-sm ms-auto" data-action="export-chart">
                        <i class="bi bi-download me-1"></i>Export PNG
                    </button>
                </div>
                <div data-container="blocks-chart" class="mb-3"></div>
                {{#canSeeEvents|bool}}
                <div data-container="blocks-table"></div>
                {{/canSeeEvents|bool}}
                {{^canSeeEvents}}
                <div class="card"><div class="card-body text-secondary small">
                    <i class="bi bi-eye-slash me-1"></i>The block log reads security events —
                    it requires security-events access (view_security).
                </div></div>
                {{/canSeeEvents}}
            `,
            ...options
        });
        this.canSeeEvents = false;
    }

    async onInit() {
        this.blocksWidget = new MetricsMiniChartWidget({
            icon: 'bi bi-slash-circle fs-2',
            title: 'Geofence Blocks',
            subtitle: '{{now_value}} <span class="subtitle-label">{{now_label}}</span>',
            background: '#B14545',
            textColor: '#FFFFFF',
            granularity: 'days',
            trendRange: 4,
            trendOffset: 0,
            slugs: ['geofence:blocks'],
            account: 'global',
            chartType: 'bar',
            showTooltip: true,
            showXAxis: true,
            height: 50,
            chartWidth: '100%',
            color: 'rgba(245, 245, 255, 0.8)',
            fill: true,
            fillColor: 'rgba(245, 245, 255, 0.6)',
            smoothing: 0.3,
            showTrending: true,
            containerId: 'kpi-blocks'
        });
        this.addChild(this.blocksWidget);

        this.exemptWidget = new MetricsMiniChartWidget({
            icon: 'bi bi-shield-check fs-2',
            title: 'Exempt Passes',
            subtitle: '{{now_value}} <span class="subtitle-label">{{now_label}}</span>',
            background: '#1f6a7a',
            textColor: '#FFFFFF',
            granularity: 'days',
            trendRange: 4,
            trendOffset: 0,
            slugs: ['geofence:exempt'],
            account: 'global',
            chartType: 'bar',
            showTooltip: true,
            showXAxis: true,
            height: 50,
            chartWidth: '100%',
            color: 'rgba(245, 245, 255, 0.8)',
            fill: true,
            fillColor: 'rgba(245, 245, 255, 0.6)',
            smoothing: 0.3,
            showTrending: true,
            containerId: 'kpi-exempt'
        });
        this.addChild(this.exemptWidget);

        this.blocksChart = new MetricsChart({
            title: '<i class="bi bi-graph-up me-2"></i> Blocks over time',
            endpoint: '/api/metrics/fetch',
            height: 220,
            granularity: 'days',
            slugs: ['geofence:blocks', 'geofence:exempt'],
            account: 'global',
            chartType: 'bar',
            showDateRange: false,
            yAxis: { label: 'Count', beginAtZero: true },
            tooltip: { y: 'number:0' },
            containerId: 'blocks-chart'
        });
        this.addChild(this.blocksChart);

        // The block log reads incident events, which need view_security —
        // a geofence-only grant passes the page gate but must not see the
        // event table (mirrors the Rules tab's history gating).
        this.canSeeEvents = this.checkPermissions(SECURITY_EVENTS_PERMS);
        if (!this.canSeeEvents) return;

        this.collection = new IncidentEventList({
            params: { category: 'geofence_block', size: 25, sort: '-created' }
        });
        this.blocksTable = new TableView({
            containerId: 'blocks-table',
            collection: this.collection,
            title: 'Blocks log',
            showFullscreen: false,
            searchable: false,
            clickAction: 'view',
            hideActivePillNames: ['category'],
            emptyMessage: 'No geofence blocks recorded — either nothing has been blocked, or this server predates the evidence plane (django-mojo v1.2.42+).',
            rowStripe: (model) => {
                const level = Number(model.get('level'));
                if (level >= 7) return 'danger';
                if (level >= 5) return 'warning';
                return null;
            },
            columns: [
                { key: 'created', label: 'When', formatter: 'datetime', sortable: true, width: '160px' },
                { key: 'metadata.reason', label: 'What happened', formatter: (v) => escapeHtml(reasonText(v)) },
                { key: 'metadata.country_code', label: 'Country', visibility: 'lg', filter: { type: 'text' }, formatter: (v) => escapeHtml(String(v || '—')) },
                { key: 'metadata.region_code', label: 'Region', visibility: 'lg', formatter: (v) => escapeHtml(v ? regionName(v) : '—') },
                { key: 'source_ip', label: 'IP', filter: { type: 'text' }, formatter: (v) => `<code>${escapeHtml(String(v || '—'))}</code>` },
                { key: 'metadata.scope', label: 'Endpoint', visibility: 'lg', formatter: (v) => escapeHtml(String(v || '—')) },
                {
                    key: 'level', label: 'Level', formatter: 'badge', sortable: true,
                    filter: {
                        type: 'select',
                        options: [
                            { value: '3', label: 'Blocked (3)' },
                            { value: '5', label: 'Abuse / fail-closed (5)' },
                            { value: '6', label: 'Fail-open pass (6)' },
                            { value: '7', label: 'Rule error (7)' }
                        ]
                    }
                }
            ]
        });
        this.addChild(this.blocksTable);
    }

    /** Re-pull events + metrics; called by the page on every visit. */
    refresh() {
        if (this.canSeeEvents) this.collection?.fetch()?.catch?.(() => {});
        this.blocksChart?.refresh?.();
    }

    async onActionExportChart() {
        if (this.blocksChart?.chart) exportChartPng(this.blocksChart.chart);
        return true;
    }
}

export default GeofenceBlocksView;
