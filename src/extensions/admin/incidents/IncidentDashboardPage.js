import Page from '@core/Page.js';
import View from '@core/View.js';
import {
    MetricsChart,
    MetricsMiniChartWidget
} from '@ext/charts/index.js';
import TableView from '@core/views/table/TableView.js';
import {
    IncidentList,
    IncidentStats
} from '@core/models/Incident.js';
import {
    TicketList
} from '@core/models/Tickets.js';

class IncidentDashboardHeader extends View {
    constructor(options = {}) {
        super({
            ...options,
            className: 'incident-dashboard-header'
        });

        this.model = new IncidentStats();
    }

    async getTemplate() {
        return `
            <div class="row">
                <div class="col-xl-3 col-lg-6 col-12 mb-3">
                    <div class="card h-100 border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="card-title text-muted mb-2">Open Incidents</h6>
                                    <h3 class="mb-1 fw-bold">{{model.incidents.open}}</h3>
                                    <span class="badge bg-danger-subtle text-danger">{{model.incidents.new}} New</span>
                                </div>
                                <div class="text-danger">
                                    <i class="bi bi-exclamation-triangle fs-2"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-lg-6 col-12 mb-3">
                    <div class="card h-100 border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="card-title text-muted mb-2">Open Tickets</h6>
                                    <h3 class="mb-1 fw-bold">{{model.tickets.open}}</h3>
                                    <span class="badge bg-warning-subtle text-warning">{{model.tickets.new}} New</span>
                                </div>
                                <div class="text-warning">
                                    <i class="bi bi-ticket-perforated fs-2"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-lg-6 col-12 mb-3">
                    <div class="card h-100 border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="card-title text-muted mb-2">Recent Events</h6>
                                    <h3 class="mb-1 fw-bold">{{model.events.recent}}</h3>
                                    <span class="badge bg-info-subtle text-info">{{model.events.critical}} Critical</span>
                                </div>
                                <div class="text-info">
                                    <i class="bi bi-activity fs-2"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-lg-6 col-12 mb-3">
                    <div class="card h-100 border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="card-title text-muted mb-2">Recent Incidents</h6>
                                    <h3 class="mb-1 fw-bold">{{model.incidents.recent}}</h3>
                                    <span class="badge bg-secondary-subtle text-secondary">Last 24h</span>
                                </div>
                                <div class="text-secondary">
                                    <i class="bi bi-clock-history fs-2"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async onBeforeRender() {
        await this.model.fetch();
    }
}


class IncidentDashboardPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            title: 'Incidents Dashboard',
            className: 'incident-dashboard-page'
        });
    }

    async getTemplate() {
        return `
            <div class="container-fluid incident-dashboard">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <p class="text-muted mb-0">Incident Intelligence Hub</p>
                        <small class="text-info">
                            <i class="bi bi-activity me-1"></i>
                            Real-time visibility into incidents, tickets, and correlated events
                        </small>
                    </div>
                    <div class="btn-group" role="group">
                        <button type="button"
                                class="btn btn-outline-secondary btn-sm"
                                data-action="refresh-all"
                                title="Refresh dashboards">
                            <i class="bi bi-arrow-clockwise"></i> Refresh
                        </button>
                    </div>
                </div>

                <div data-container="header" class="mb-4"></div>

                <div class="row g-4">
                    <div class="col-xl-6 col-lg-12" data-container="events-widget"></div>
                    <div class="col-xl-6 col-lg-12" data-container="incidents-widget"></div>
                </div>

                <div class="row g-4 mt-1">
                    <div class="col-lg-6">
                        <div class="card shadow-sm h-100">
                            <div class="card-header border-0 bg-transparent d-flex align-items-center justify-content-between">
                                <div>
                                    <h6 class="mb-0 text-uppercase small text-muted">Events by Country</h6>
                                    <span class="text-muted small">Hotspots from the last 24 hours</span>
                                </div>
                                <span class="badge bg-success-subtle text-success">Live</span>
                            </div>
                            <div class="card-body p-3">
                                <div data-container="events-by-country-chart"></div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="card shadow-sm h-100">
                            <div class="card-header border-0 bg-transparent d-flex align-items-center justify-content-between">
                                <div>
                                    <h6 class="mb-0 text-uppercase small text-muted">Incidents by Country</h6>
                                    <span class="text-muted small">Highest volume regions</span>
                                </div>
                                <span class="badge bg-warning-subtle text-warning">24h</span>
                            </div>
                            <div class="card-body p-3">
                                <div data-container="incidents-by-country-chart"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row g-4 mt-1">
                    <div class="col-lg-6">
                        <div class="card shadow-sm h-100">
                            <div class="card-header border-0 bg-transparent d-flex align-items-center justify-content-between">
                                <div>
                                    <h6 class="mb-0 text-uppercase small text-muted">New Tickets</h6>
                                    <span class="text-muted small">Fresh tickets awaiting triage</span>
                                </div>
                                <i class="bi bi-ticket-perforated text-muted"></i>
                            </div>
                            <div class="card-body" data-container="my-tickets-table"></div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="card shadow-sm h-100">
                            <div class="card-header border-0 bg-transparent d-flex align-items-center justify-content-between">
                                <div>
                                    <h6 class="mb-0 text-uppercase small text-muted">New Incidents</h6>
                                    <span class="text-muted small">Newest incidents in the queue</span>
                                </div>
                                <i class="bi bi-flag text-warning"></i>
                            </div>
                            <div class="card-body" data-container="high-priority-incidents-table"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async onInit() {
        this.header = new IncidentDashboardHeader({
            containerId: 'header'
        });
        this.addChild(this.header);

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

        this.eventsByCountryChart = new MetricsChart({
            title: '<i class="bi bi-globe-central-south-asia me-2"></i> Events by Country',
            endpoint: '/api/metrics/fetch',
            account: 'incident',
            category: 'incident_events_by_country',
            granularity: 'hours',
            chartType: 'bar',
            showDateRange: false,
            showMetricsFilter: false,
            height: 220,
            colors: [
                'rgba(32, 201, 151, 0.85)'
            ],
            yAxis: {
                label: 'Events',
                beginAtZero: true
            },
            tooltip: { y: 'number:0' },
            containerId: 'events-by-country-chart'
        });
        this.addChild(this.eventsByCountryChart);

        this.incidentsByCountryChart = new MetricsChart({
            title: '<i class="bi bi-geo-alt me-2"></i> Incidents by Country',
            endpoint: '/api/metrics/fetch',
            account: 'incident',
            category: 'incident_by_country',
            granularity: 'hours',
            chartType: 'bar',
            showDateRange: false,
            showMetricsFilter: false,
            height: 220,
            colors: [
                'rgba(255, 193, 7, 0.85)'
            ],
            yAxis: {
                label: 'Incidents',
                beginAtZero: true
            },
            tooltip: { y: 'number:0' },
            containerId: 'incidents-by-country-chart'
        });
        this.addChild(this.incidentsByCountryChart);

        const myTicketsCollection = new TicketList({
            params: {
                status: 'new'
            }
        });
        this.myTicketsTable = new TableView({
            containerId: 'my-tickets-table',
            title: 'New Tickets',
            collection: myTicketsCollection,
            columns: [
                { key: 'id', label: 'ID' },
                { key: 'title', label: 'Title' },
                { key: 'priority', label: 'Priority' }
            ]
        });
        this.addChild(this.myTicketsTable);

        const newIncidentsCollection = new IncidentList({
            params: {
                status: 'new'
            }
        });
        this.highPriorityIncidentsTable = new TableView({
            containerId: 'high-priority-incidents-table',
            title: 'New Incidents',
            collection: newIncidentsCollection,
            columns: [
                { key: 'id', label: 'ID' },
                { key: 'title', label: 'Title' },
                { key: 'status', label: 'Status', formatter: 'badge' }
            ]
        });
        this.addChild(this.highPriorityIncidentsTable);
    }

    async onActionRefreshAll(event, element) {
        const button = element || event?.currentTarget || null;
        const icon = button?.querySelector?.('i');
        icon?.classList.add('bi-spin');
        if (button) button.disabled = true;

        const refreshTasks = [
            this.header?.model?.fetch()?.then(() => this.header.render()),
            this.eventsWidget?.refresh(),
            this.incidentsWidget?.refresh(),
            this.eventsByCountryChart?.refresh(),
            this.incidentsByCountryChart?.refresh(),
            this.myTicketsTable?.collection?.fetch(),
            this.highPriorityIncidentsTable?.collection?.fetch()
        ].filter(Boolean);

        await Promise.allSettled(refreshTasks);

        icon?.classList.remove('bi-spin');
        if (button) button.disabled = false;
    }
}

export default IncidentDashboardPage;
