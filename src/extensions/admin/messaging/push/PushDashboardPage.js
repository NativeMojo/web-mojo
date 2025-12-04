import Page from '@core/Page.js';
import { MetricsChart, PieChart } from '@ext/charts/index.js';
import TableView from '@core/views/table/TableView.js';
import { PushDeliveryList } from '@core/models/Push.js';

class PushDashboardPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            title: 'Push Notifications Dashboard',
            className: 'push-dashboard-page'
        });
    }

    async getTemplate() {
        return `
            <div class="container-fluid">
                <h1 class="h3 mb-4">Push Notifications</h1>
                <div class="row">
                    <!-- Stat cards -->
                </div>
                <div class="row">
                    <div class="col-xl-8 col-lg-7">
                        <div class="card shadow mb-4">
                            <div class="card-header">Notifications Over Time</div>
                            <div class="card-body" data-container="deliveries-chart"></div>
                        </div>
                    </div>
                    <div class="col-xl-4 col-lg-5">
                        <div class="card shadow mb-4">
                            <div class="card-header">Delivery Status</div>
                            <div class="card-body" data-container="status-chart"></div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-6 mb-4" data-container="recent-deliveries"></div>
                    <div class="col-lg-6 mb-4" data-container="failed-deliveries"></div>
                </div>
            </div>
        `;
    }

    async onInit() {
        this.deliveriesChart = new MetricsChart({
            containerId: 'deliveries-chart',
            endpoint: '/api/metrics/fetch',
            slugs: ['push_sent', 'push_failed'],
            chartType: 'line'
        });
        this.addChild(this.deliveriesChart);

        this.statusChart = new PieChart({
            containerId: 'status-chart',
            endpoint: '/api/account/devices/push/stats' // Assuming this returns data for pie chart
        });
        this.addChild(this.statusChart);

        this.recentDeliveries = new TableView({
            containerId: 'recent-deliveries',
            title: 'Recent Deliveries',
            Collection: new PushDeliveryList({ params: { _sort: '-created', _limit: 5 } }),
            columns: [{ key: 'title', label: 'Title' }, { key: 'status', label: 'Status', formatter: 'badge' }]
        });
        this.addChild(this.recentDeliveries);

        this.failedDeliveries = new TableView({
            containerId: 'failed-deliveries',
            title: 'Failed Deliveries',
            Collection: new PushDeliveryList({ params: { status: 'failed', _sort: '-created', _limit: 5 } }),
            columns: [{ key: 'title', label: 'Title' }, { key: 'error_message', label: 'Error' }]
        });
        this.addChild(this.failedDeliveries);
    }
}

export default PushDashboardPage;
