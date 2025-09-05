import Page from '../core/Page.js';
import View from '../core/View.js';
import {
    MetricsChart,
    PieChart
} from '../charts/index.js';
import Table from '../views/table/Table.js';
import {
    IncidentList,
    IncidentStats
} from '../models/Incident.js';
import {
    TicketList
} from '../models/Tickets.js';

class IncidentDashboardHeader extends View {
    constructor(options = {}) {
        super({
            ...options,
            className: 'incident-dashboard-header'
        });

        this.stats = {
            tickets: {
                new: 0,
                open: 0,
                paused: 0
            },
            incidents: {
                new: 0,
                open: 0,
                paused: 0,
                recent: 0
            },
            events: {
                recent: 0,
                warnings: 0,
                critical: 0
            }
        };

        this.setModel(new IncidentStats())
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
            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <p class="text-muted mb-0">Incidents & Tickets Dashboard</p>
                    <small class="text-info">
                      <i class="bi bi-shield-check me-1"></i>
                      Real-time incident and event monitoring
                    </small>
                  </div>
                  <div class="btn-group" role="group">
                    <button type="button" class="btn btn-outline-secondary btn-sm"
                            data-action="refresh-all" title="Refresh All Charts">
                      <i class="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                  </div>
                </div>

                <div data-container="header"></div>

                <div class="row">
                    <div class="col-xl-8 col-lg-7">
                        <div class="card shadow mb-4">
                            <div class="card-body" data-container="incidents-chart"></div>
                        </div>
                    </div>
                    <div class="col-xl-4 col-lg-5">
                        <div class="card shadow mb-4">
                            <div class="card-body" data-container="incidents-by-state-chart"></div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-lg-6 mb-4" data-container="my-tickets-table"></div>
                    <div class="col-lg-6 mb-4" data-container="high-priority-incidents-table"></div>
                </div>
            </div>
        `;
    }

    async onInit() {
        this.header = new IncidentDashboardHeader({
            containerId: 'header'
        });
        this.addChild(this.header);

        // Events Chart
        // Create System Incidents Chart
        this.systemIncidentsChart = new MetricsChart({
          title: '<i class="bi bi-exclamation-triangle me-2"></i> System Incidents',
          endpoint: '/api/metrics/fetch',
          granularity: 'hours',
          slugs: ['incidents'],
          account: 'incident',
          chartType: 'line',
          showDateRange: false,
          showMetricsFilter: false,
          height: 250,
          colors: [
            'rgba(255, 193, 7, 0.8)'  // Warning yellow for incidents
          ],
          yAxis: {
            label: 'Incidents',
            beginAtZero: true
          },
          tooltip: {
            y: 'number'
          },
          containerId: 'incidents-chart'
        });
        this.addChild(this.systemIncidentsChart);

        // Incidents by State Chart
        // this.incidentsByStateChart = new PieChart({
        //     containerId: 'incidents-by-state-chart',
        //     title: 'Incidents by State',
        //     endpoint: '/api/incident/stats', // Assuming an endpoint that returns state counts
        // });
        // this.addChild(this.incidentsByStateChart);

        // // My Open Tickets Table
        const myTicketsCollection = new TicketList({
            params: {
                assignee: this.getApp().activeUser.id,
                status: 'open'
            }
        });
        this.myTicketsTable = new Table({
            containerId: 'my-tickets-table',
            title: 'My Open Tickets',
            collection: myTicketsCollection,
            columns: [{
                key: 'id',
                label: 'ID'
            }, {
                key: 'title',
                label: 'Title'
            }, {
                key: 'priority',
                label: 'Priority'
            }, ]
        });
        this.addChild(this.myTicketsTable);

        // High Priority Incidents Table
        const highPriorityIncidentsCollection = new IncidentList({
            params: {
                priority__gte: 8,
                state: 'open'
            }
        });
        this.highPriorityIncidentsTable = new Table({
            containerId: 'high-priority-incidents-table',
            title: 'Recent High-Priority Incidents',
            collection: highPriorityIncidentsCollection,
            columns: [{
                key: 'id',
                label: 'ID'
            }, {
                key: 'title',
                label: 'Title'
            }, {
                key: 'state',
                label: 'State',
                formatter: 'badge'
            }, ]
        });
        this.addChild(this.highPriorityIncidentsTable);
    }

    async onActionRefreshAll(event, element) {
        const icon = element.querySelector('i');
        icon.classList.add('bi-spin');
        element.disabled = true;

        await Promise.all([
            this.header.statsModel.fetch(),
            this.systemIncidentsChart.refresh(),
            // this.incidentsByStateChart.refresh(),
            this.myTicketsTable.collection.fetch(),
            this.highPriorityIncidentsTable.collection.fetch()
        ]);

        icon.classList.remove('bi-spin');
        element.disabled = false;
    }
}

export default IncidentDashboardPage;
