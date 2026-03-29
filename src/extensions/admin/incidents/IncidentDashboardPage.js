import Page from '@core/Page.js';
import View from '@core/View.js';
import {
    MetricsChart,
    MetricsMiniChartWidget
} from '@ext/charts/index.js';
import TabView from '@core/views/navigation/TabView.js';
import {
    IncidentStats
} from '@core/models/Incident.js';
import TableView from '@core/views/table/TableView.js';
import { MetricsCountryMapView } from '@ext/map/index.js';
import { LoginEventList } from '@core/models/LoginEvent.js';
import LoginLocationMapView from '@ext/admin/account/devices/LoginLocationMapView.js';


// ── Stats Cards (always visible) ──────────────────────────────────
class SecurityStatsBar extends View {
    constructor(options = {}) {
        super({
            ...options,
            className: 'security-stats-bar'
        });

        this.model = new IncidentStats();
        this.counts = {
            ipBlocks: 0,
            blockedDevices: 0,
            blocksToday: 0,
            newCountryLogins: 0
        };
    }

    async getTemplate() {
        return `
            <div class="row g-3 mb-4">
                <div class="col">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body py-3">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-exclamation-triangle text-danger fs-4"></i>
                                <div>
                                    <div class="text-muted small">Open Incidents</div>
                                    <div class="fw-bold fs-5">{{model.incidents.open}}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body py-3">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-ticket-perforated text-warning fs-4"></i>
                                <div>
                                    <div class="text-muted small">Open Tickets</div>
                                    <div class="fw-bold fs-5">{{model.tickets.open}}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body py-3">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-shield-x text-danger fs-4"></i>
                                <div>
                                    <div class="text-muted small">IP Blocks</div>
                                    <div class="fw-bold fs-5">{{counts.ipBlocks}}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body py-3">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-phone-fill text-warning fs-4"></i>
                                <div>
                                    <div class="text-muted small">Blocked Devices</div>
                                    <div class="fw-bold fs-5">{{counts.blockedDevices}}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body py-3">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-person-slash text-info fs-4"></i>
                                <div>
                                    <div class="text-muted small">Blocks Today</div>
                                    <div class="fw-bold fs-5">{{counts.blocksToday}}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body py-3">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-geo-alt-fill text-success fs-4"></i>
                                <div>
                                    <div class="text-muted small">New-Country Logins</div>
                                    <div class="fw-bold fs-5">{{counts.newCountryLogins}}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async onBeforeRender() {
        await this.fetchAll();
    }

    async fetchAll() {
        const rest = this.getApp()?.rest;
        const [statsResult, ...countResults] = await Promise.allSettled([
            this.model.fetch(),
            rest.GET('/api/account/system/geoip?is_blocked=true&size=0'),
            rest.GET('/api/account/bouncer/device?risk_tier=blocked&size=0'),
            rest.GET('/api/account/bouncer/signal?decision=block&dr_start=today&size=0'),
            rest.GET('/api/account/logins?is_new_country=true&dr_start=today&size=0'),
        ]);

        const keys = ['ipBlocks', 'blockedDevices', 'blocksToday', 'newCountryLogins'];
        countResults.forEach((result, i) => {
            if (result.status === 'fulfilled' && result.value?.data) {
                this.counts[keys[i]] = result.value.data.count || 0;
            }
        });
    }

    async refresh() {
        await this.fetchAll();
        await this.render();
    }
}


// ── Tab: Overview ─────────────────────────────────────────────────
class OverviewTab extends View {
    constructor(options = {}) {
        super({ ...options, className: 'overview-tab' });
    }

    async getTemplate() {
        return `
            <div class="row g-4">
                <div class="col-xl-6 col-12" data-container="events-widget"></div>
                <div class="col-xl-6 col-12" data-container="incidents-widget"></div>
            </div>
        `;
    }

    async onInit() {
        this.eventsWidget = new MetricsMiniChartWidget({
            containerId: 'events-widget',
            icon: 'bi bi-activity fs-2',
            title: 'System Events',
            subtitle: '{{now_value}} <span class="subtitle-label">{{now_label}}</span>',
            background: '#154360',
            textColor: '#FFFFFF',
            endpoint: '/api/metrics/fetch',
            granularity: 'days',
            slugs: ['incident_events'],
            account: 'incident',
            chartType: 'line',
            showTooltip: true,
            showXAxis: false,
            height: 140,
            color: 'rgba(255,255,255,0.9)',
            fill: true,
            fillColor: 'rgba(255,255,255,0.2)',
            smoothing: 0.3,
            defaultDateRange: '7d',
            valueFormat: 'number',
            showTrending: true,
            showSettings: true,
            settingsKey: 'incident-dashboard-events'
        });
        this.addChild(this.eventsWidget);

        this.incidentsWidget = new MetricsMiniChartWidget({
            containerId: 'incidents-widget',
            icon: 'bi bi-exclamation-triangle fs-2',
            title: 'System Incidents',
            subtitle: '{{now_value}} <span class="subtitle-label">{{now_label}}</span>',
            background: '#7D6608',
            textColor: '#FFFFFF',
            endpoint: '/api/metrics/fetch',
            granularity: 'days',
            slugs: ['incidents'],
            account: 'incident',
            chartType: 'line',
            showTooltip: true,
            showXAxis: false,
            height: 140,
            color: 'rgba(255,255,255,0.9)',
            fill: true,
            fillColor: 'rgba(255,255,255,0.25)',
            smoothing: 0.3,
            defaultDateRange: '7d',
            valueFormat: 'number',
            showTrending: true,
            showSettings: true,
            settingsKey: 'incident-dashboard-incidents'
        });
        this.addChild(this.incidentsWidget);
    }

    async refresh() {
        await Promise.allSettled([
            this.eventsWidget?.refresh(),
            this.incidentsWidget?.refresh()
        ]);
    }
}


// ── Tab: Threats ──────────────────────────────────────────────────
class ThreatsTab extends View {
    constructor(options = {}) {
        super({ ...options, className: 'threats-tab' });
    }

    async getTemplate() {
        return `
            <div class="row g-4">
                <div class="col-xl-4 col-lg-6 col-12" data-container="firewall-blocks-widget"></div>
                <div class="col-xl-4 col-lg-6 col-12" data-container="bouncer-blocks-widget"></div>
                <div class="col-xl-4 col-lg-6 col-12" data-container="bouncer-prescreen-widget"></div>
            </div>
        `;
    }

    async onInit() {
        this.firewallBlocksWidget = new MetricsMiniChartWidget({
            containerId: 'firewall-blocks-widget',
            icon: 'bi bi-shield-x fs-2',
            title: 'Firewall Blocks',
            subtitle: '{{now_value}} <span class="subtitle-label">{{now_label}}</span>',
            background: '#922B21',
            textColor: '#FFFFFF',
            endpoint: '/api/metrics/fetch',
            granularity: 'days',
            slugs: ['firewall:blocks'],
            account: 'incident',
            chartType: 'line',
            showTooltip: true,
            showXAxis: false,
            height: 120,
            color: 'rgba(255,255,255,0.9)',
            fill: true,
            fillColor: 'rgba(255,255,255,0.2)',
            smoothing: 0.3,
            defaultDateRange: '7d',
            valueFormat: 'number',
            showTrending: true,
            showSettings: true,
            settingsKey: 'incident-dashboard-firewall-blocks'
        });
        this.addChild(this.firewallBlocksWidget);

        this.bouncerBlocksWidget = new MetricsMiniChartWidget({
            containerId: 'bouncer-blocks-widget',
            icon: 'bi bi-person-slash fs-2',
            title: 'Bouncer Blocks',
            subtitle: '{{now_value}} <span class="subtitle-label">{{now_label}}</span>',
            background: '#6C3483',
            textColor: '#FFFFFF',
            endpoint: '/api/metrics/fetch',
            granularity: 'days',
            slugs: ['bouncer:blocks'],
            account: 'incident',
            chartType: 'line',
            showTooltip: true,
            showXAxis: false,
            height: 120,
            color: 'rgba(255,255,255,0.9)',
            fill: true,
            fillColor: 'rgba(255,255,255,0.2)',
            smoothing: 0.3,
            defaultDateRange: '7d',
            valueFormat: 'number',
            showTrending: true,
            showSettings: true,
            settingsKey: 'incident-dashboard-bouncer-blocks'
        });
        this.addChild(this.bouncerBlocksWidget);

        this.bouncerPrescreenWidget = new MetricsMiniChartWidget({
            containerId: 'bouncer-prescreen-widget',
            icon: 'bi bi-funnel fs-2',
            title: 'Pre-Screen Blocks',
            subtitle: '{{now_value}} <span class="subtitle-label">{{now_label}}</span>',
            background: '#1A5276',
            textColor: '#FFFFFF',
            endpoint: '/api/metrics/fetch',
            granularity: 'days',
            slugs: ['bouncer:pre_screen_blocks'],
            account: 'incident',
            chartType: 'line',
            showTooltip: true,
            showXAxis: false,
            height: 120,
            color: 'rgba(255,255,255,0.9)',
            fill: true,
            fillColor: 'rgba(255,255,255,0.2)',
            smoothing: 0.3,
            defaultDateRange: '7d',
            valueFormat: 'number',
            showTrending: true,
            showSettings: true,
            settingsKey: 'incident-dashboard-bouncer-prescreen'
        });
        this.addChild(this.bouncerPrescreenWidget);
    }

    async refresh() {
        await Promise.allSettled([
            this.firewallBlocksWidget?.refresh(),
            this.bouncerBlocksWidget?.refresh(),
            this.bouncerPrescreenWidget?.refresh()
        ]);
    }
}


// ── Tab: Geography ────────────────────────────────────────────────
class GeographyTab extends View {
    constructor(options = {}) {
        super({ ...options, className: 'geography-tab' });
    }

    async getTemplate() {
        return `
            <div class="card shadow-sm mb-4">
                <div class="card-header border-0 bg-transparent d-flex align-items-center justify-content-between">
                    <div>
                        <h6 class="mb-0 text-uppercase small text-muted">Global Event Hotspots</h6>
                        <span class="text-muted small">Clusters sized by total events</span>
                    </div>
                    <span class="badge bg-info-subtle text-info">Interactive</span>
                </div>
                <div class="card-body p-0" data-container="events-country-map"></div>
            </div>

            <div class="row g-4">
                <div class="col-lg-6">
                    <div class="card shadow-sm h-100">
                        <div class="card-header border-0 bg-transparent">
                            <h6 class="mb-0 text-uppercase small text-muted">Events by Country</h6>
                            <span class="text-muted small">Hotspots from the last 24 hours</span>
                        </div>
                        <div class="card-body p-3" data-container="events-by-country-chart"></div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card shadow-sm h-100">
                        <div class="card-header border-0 bg-transparent">
                            <h6 class="mb-0 text-uppercase small text-muted">Incidents by Country</h6>
                            <span class="text-muted small">Highest volume regions</span>
                        </div>
                        <div class="card-body p-3" data-container="incidents-by-country-chart"></div>
                    </div>
                </div>
            </div>
        `;
    }

    async onInit() {
        this.eventsCountryMap = new MetricsCountryMapView({
            containerId: 'events-country-map',
            category: 'incident_events_by_country',
            account: 'incident',
            maxCountries: 20,
            metricLabel: 'Events',
            height: 360,
            mapStyle: 'dark'
        });
        this.addChild(this.eventsCountryMap);

        this.eventsByCountryChart = new MetricsChart({
            title: '<i class="bi bi-globe-central-south-asia me-2"></i> Events by Country',
            endpoint: '/api/metrics/fetch',
            account: 'incident',
            category: 'incident_events_by_country',
            granularity: 'days',
            chartType: 'line',
            showDateRange: false,
            showMetricsFilter: false,
            height: 220,
            maxDatasets: 10,
            colors: ['rgba(32, 201, 151, 0.85)'],
            yAxis: { label: 'Events', beginAtZero: true },
            tooltip: { y: 'number:0' },
            containerId: 'events-by-country-chart'
        });
        this.addChild(this.eventsByCountryChart);

        this.incidentsByCountryChart = new MetricsChart({
            title: '<i class="bi bi-geo-alt me-2"></i> Incidents by Country',
            endpoint: '/api/metrics/fetch',
            account: 'incident',
            category: 'incidents_by_country',
            granularity: 'days',
            chartType: 'line',
            showDateRange: false,
            showMetricsFilter: false,
            height: 220,
            maxDatasets: 10,
            colors: ['rgba(255, 193, 7, 0.85)'],
            yAxis: { label: 'Incidents', beginAtZero: true },
            tooltip: { y: 'number:0' },
            containerId: 'incidents-by-country-chart'
        });
        this.addChild(this.incidentsByCountryChart);
    }

    async refresh() {
        await Promise.allSettled([
            this.eventsCountryMap?.refresh(),
            this.eventsByCountryChart?.refresh(),
            this.incidentsByCountryChart?.refresh()
        ]);
    }
}


// ── Tab: Login Map ───────────────────────────────────────────────
class LoginMapTab extends View {
    constructor(options = {}) {
        super({ ...options, className: 'login-map-tab' });
    }

    async getTemplate() {
        return `<div data-container="login-map"></div>`;
    }

    async onInit() {
        this.loginMap = new LoginLocationMapView({
            containerId: 'login-map',
            height: 480,
            mapStyle: 'dark'
        });
        this.addChild(this.loginMap);
    }

    onTabActivated() {
        this.loginMap?.onTabActivated();
    }

    async refresh() {
        await this.loginMap?.refresh();
    }
}


// ── Tab: Login Activity ──────────────────────────────────────────
class LoginActivityTab extends View {
    constructor(options = {}) {
        super({ ...options, className: 'login-activity-tab' });
    }

    async getTemplate() {
        return `<div data-container="login-table"></div>`;
    }

    async onInit() {
        this.loginTable = new TableView({
            containerId: 'login-table',
            collection: new LoginEventList({ params: { sort: '-created', size: 20 } }),
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,
            showRefresh: true,
            columns: [
                { key: 'created', label: 'Date', formatter: 'datetime', sortable: true, width: '160px' },
                { key: 'user.display_name', label: 'User', sortable: true },
                { key: 'ip_address', label: 'IP Address', sortable: true },
                { key: 'city', label: 'City', formatter: "default('—')" },
                { key: 'region', label: 'Region', formatter: "default('—')" },
                { key: 'country_code', label: 'Country', sortable: true,
                    filter: { type: 'text', label: 'Country Code' } },
                { key: 'source', label: 'Source', sortable: true,
                    filter: { type: 'select', options: [
                        { value: 'password', label: 'Password' },
                        { value: 'magic', label: 'Magic Link' },
                        { value: 'sms', label: 'SMS' },
                        { value: 'totp', label: 'TOTP' },
                        { value: 'oauth', label: 'OAuth' }
                    ] } },
                { key: 'is_new_country', label: 'New Country', formatter: 'boolean', sortable: true, width: '110px',
                    filter: { type: 'select', options: [
                        { value: 'true', label: 'Yes' },
                        { value: 'false', label: 'No' }
                    ] } }
            ]
        });
        this.addChild(this.loginTable);
    }

    async refresh() {
        await this.loginTable?.collection?.fetch();
    }
}


// ── Dashboard Page ────────────────────────────────────────────────
class IncidentDashboardPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            title: 'Security Dashboard',
            className: 'incident-dashboard-page'
        });
    }

    async getTemplate() {
        return `
            <div class="container-fluid incident-dashboard">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <p class="text-muted mb-0">Security Dashboard</p>
                        <small class="text-info">
                            <i class="bi bi-activity me-1"></i>
                            Real-time visibility into incidents, threats, and enforcement
                        </small>
                    </div>
                    <div class="btn-group" role="group">
                        <button type="button"
                                class="btn btn-outline-secondary btn-sm"
                                data-action="refresh-all"
                                title="Refresh dashboard">
                            <i class="bi bi-arrow-clockwise"></i> Refresh
                        </button>
                    </div>
                </div>

                <div data-container="stats-bar"></div>
                <div data-container="tabs"></div>
            </div>
        `;
    }

    async onInit() {
        this.statsBar = new SecurityStatsBar({
            containerId: 'stats-bar'
        });
        this.addChild(this.statsBar);

        this.overviewTab = new OverviewTab();
        this.threatsTab = new ThreatsTab();
        this.geographyTab = new GeographyTab();
        this.loginMapTab = new LoginMapTab();
        this.loginActivityTab = new LoginActivityTab();

        this.tabView = new TabView({
            containerId: 'tabs',
            tabs: {
                'Overview': this.overviewTab,
                'Threats': this.threatsTab,
                'Geography': this.geographyTab,
                'Login Map': this.loginMapTab,
                'Login Activity': this.loginActivityTab
            },
            activeTab: 'Overview'
        });
        this.addChild(this.tabView);
    }

    async onActionRefreshAll(event, element) {
        const button = element || event?.currentTarget || null;
        const icon = button?.querySelector?.('i');
        icon?.classList.add('bi-spin');
        if (button) button.disabled = true;

        const activeTabLabel = this.tabView.getActiveTab();
        const activeTab = this.tabView.getTab(activeTabLabel);

        await Promise.allSettled([
            this.statsBar.refresh(),
            activeTab?.refresh?.()
        ]);

        icon?.classList.remove('bi-spin');
        if (button) button.disabled = false;
    }
}

export default IncidentDashboardPage;
