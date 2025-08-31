import Page from '../core/Page.js';
import View from '../core/View.js';
import { MetricsChart, PieChart } from '../charts/index.js';
import Table from '../views/table/Table.js';
import { IncidentList } from '../models/Incident.js';
import { TicketList } from '../models/Tickets.js';

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
                <h1 class="h3 mb-4">Incidents & Tickets Dashboard</h1>

                <div class="row">
                    <div class="col-xl-3 col-md-6 mb-4">
                        <div class="card border-left-primary shadow h-100 py-2">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">Open Incidents</div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800" data-stat="open-incidents">0</div>
                                    </div>
                                    <div class="col-auto"><i class="fas fa-folder-open fa-2x text-gray-300"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Other stat cards -->
                </div>

                <div class="row">
                    <div class="col-xl-8 col-lg-7">
                        <div class="card shadow mb-4">
                            <div class="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                                <h6 class="m-0 font-weight-bold text-primary">Events Over Time</h6>
                            </div>
                            <div class="card-body" data-container="events-chart"></div>
                        </div>
                    </div>
                    <div class="col-xl-4 col-lg-5">
                        <div class="card shadow mb-4">
                            <div class="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                                <h6 class="m-0 font-weight-bold text-primary">Incidents by State</h6>
                            </div>
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
        // Events Chart
        this.eventsChart = new MetricsChart({
            containerId: 'events-chart',
            title: 'Events Over Time',
            endpoint: '/api/metrics/fetch',
            granularity: 'days',
            slugs: ['incident_evt'],
            chartType: 'line',
        });
        this.addChild(this.eventsChart);

        // Incidents by State Chart
        this.incidentsByStateChart = new PieChart({
            containerId: 'incidents-by-state-chart',
            title: 'Incidents by State',
            endpoint: '/api/incident/stats', // Assuming an endpoint that returns state counts
        });
        this.addChild(this.incidentsByStateChart);

        // My Open Tickets Table
        const myTicketsCollection = new TicketList({ params: { assignee: this.getApp().activeUser.id, status: 'open' } });
        this.myTicketsTable = new Table({
            containerId: 'my-tickets-table',
            title: 'My Open Tickets',
            collection: myTicketsCollection,
            columns: [
                { key: 'id', label: 'ID' },
                { key: 'title', label: 'Title' },
                { key: 'priority', label: 'Priority' },
            ]
        });
        this.addChild(this.myTicketsTable);

        // High Priority Incidents Table
        const highPriorityIncidentsCollection = new IncidentList({ params: { priority__gte: 8, state: 'open' } });
        this.highPriorityIncidentsTable = new Table({
            containerId: 'high-priority-incidents-table',
            title: 'Recent High-Priority Incidents',
            collection: highPriorityIncidentsCollection,
            columns: [
                { key: 'id', label: 'ID' },
                { key: 'title', label: 'Title' },
                { key: 'state', label: 'State', formatter: 'badge' },
            ]
        });
        this.addChild(this.highPriorityIncidentsTable);
    }
}

export default IncidentDashboardPage;
