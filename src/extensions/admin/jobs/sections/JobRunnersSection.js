/**
 * JobRunnersSection - Runner heartbeat and status table
 *
 * Displays a card with a TableView of all registered job runners,
 * showing runner ID, alive/dead status badge, and relative heartbeat time.
 */
import View from '@core/View.js';
import TableView from '@core/views/table/TableView.js';
import { JobRunnerList } from '@core/models/JobRunner.js';

export default class JobRunnersSection extends View {
    constructor(options = {}) {
        super({
            className: 'job-runners-section',
            template: `
                <div class="card shadow-sm h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0"><i class="bi bi-cpu me-2"></i>Job Runners</h5>
                        <small class="text-muted">Heartbeat &amp; status</small>
                    </div>
                    <div class="card-body p-0" data-container="runner-table"></div>
                </div>
            `,
            ...options
        });
    }

    async onInit() {
        this.runnersTable = new TableView({
            containerId: 'runner-table',
            Collection: JobRunnerList,
            searchable: true,
            filterable: false,
            paginated: true,
            tableOptions: {
                striped: false,
                hover: true,
                size: 'sm'
            },
            columns: [
                {
                    key: 'runner_id',
                    label: 'Runner',
                    formatter: 'truncate_middle(16)'
                },
                {
                    key: 'alive',
                    label: 'Status',
                    formatter: (value) => {
                        const isAlive = value === true;
                        const badgeClass = isAlive ? 'bg-success' : 'bg-danger';
                        const icon = isAlive ? 'bi-check-circle-fill' : 'bi-x-octagon-fill';
                        const text = isAlive ? 'ALIVE' : 'DEAD';
                        return `<span class="badge ${badgeClass}"><i class="${icon} me-1"></i>${text}</span>`;
                    }
                },
                {
                    key: 'last_heartbeat',
                    label: 'Heartbeat',
                    formatter: (value) => {
                        if (!value) return 'Never';
                        const heartbeatTime = new Date(value);
                        const now = new Date();
                        const diffMs = now - heartbeatTime;
                        const diffSeconds = Math.floor(diffMs / 1000);
                        if (diffSeconds < 60) return `${diffSeconds}s ago`;
                        if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
                        return `${Math.floor(diffSeconds / 3600)}h ago`;
                    }
                }
            ]
        });
        this.addChild(this.runnersTable);
    }
}
