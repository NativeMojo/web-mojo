/**
 * RunnersTable - Job runners management table
 */

import Table from '../../views/table/Table.js';
import { JobRunnerList } from '../../models/JobRunner.js';

export default class RunnersTable extends Table {
    constructor(options = {}) {
        super({
            Collection: JobRunnerList,
            options: {
                searchable: true,
                sortable: true,
                paginated: true,
                size: 10,
                ...options.options
            },
            columns: [
                {
                    key: 'runner_id',
                    label: 'Runner ID',
                    formatter: 'truncate_middle(16)',
                    sortable: true
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
                    },
                    sortable: true,
                    filter: {
                        type: 'select',
                        options: [
                            { value: true, label: 'Alive' },
                            { value: false, label: 'Dead' }
                        ]
                    }
                },
                {
                    key: 'channels',
                    label: 'Channels',
                    formatter: (channels) => {
                        if (!channels || !channels.length) return 'None';
                        return channels.map(c => `<span class="badge bg-secondary me-1">${c}</span>`).join('');
                    },
                    sortable: false
                },
                {
                    key: 'jobs_processed',
                    label: 'Processed',
                    sortable: true
                },
                {
                    key: 'jobs_failed',
                    label: 'Failed',
                    formatter: (value) => {
                        const badgeClass = value > 0 ? 'bg-danger' : 'bg-success';
                        return `<span class="badge ${badgeClass}">${value}</span>`;
                    },
                    sortable: true
                },
                {
                    key: 'last_heartbeat',
                    label: 'Last Heartbeat',
                    formatter: (value) => {
                        if (!value) return 'Never';
                        const heartbeatTime = new Date(value);
                        const now = new Date();
                        const diffMs = now - heartbeatTime;
                        const diffSeconds = Math.floor(diffMs / 1000);

                        if (diffSeconds < 60) return `${diffSeconds}s ago`;
                        if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
                        return `${Math.floor(diffSeconds / 3600)}h ago`;
                    },
                    sortable: true
                },
                {
                    key: 'started',
                    label: 'Uptime',
                    formatter: (value) => {
                        if (!value) return 'Unknown';
                        const startTime = new Date(value);
                        const now = new Date();
                        const diffMs = now - startTime;
                        const diffSeconds = Math.floor(diffMs / 1000);

                        if (diffSeconds < 60) return `${diffSeconds}s`;
                        if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
                        if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h`;
                        return `${Math.floor(diffSeconds / 86400)}d`;
                    },
                    sortable: true
                }
            ],
            contextMenu: [
                {
                    label: 'Ping Runner',
                    action: 'ping-runner',
                    icon: 'bi-wifi'
                },
                {
                    label: 'View Details',
                    action: 'view-runner-details',
                    icon: 'bi-info-circle'
                },
                { separator: true },
                {
                    label: 'Pause Runner',
                    action: 'pause-runner',
                    icon: 'bi-pause-circle',
                    condition: (runner) => runner.get('alive') === true
                },
                {
                    label: 'Resume Runner',
                    action: 'resume-runner',
                    icon: 'bi-play-circle',
                    condition: (runner) => runner.get('alive') !== true
                },
                { separator: true },
                {
                    label: 'Shutdown Runner',
                    action: 'shutdown-runner',
                    icon: 'bi-power',
                    danger: true,
                    condition: (runner) => runner.get('alive') === true
                }
            ],
            ...options
        });
    }

    async onActionPingRunner(event, element) {
        const runnerId = element.getAttribute('data-id');
        const runner = this.collection.get(runnerId);
        if (runner) {
            try {
                const result = await runner.ping();
                if (result.success) {
                    this.getApp().toast.success('Runner ping successful');
                    await this.collection.fetch();
                } else {
                    this.getApp().toast.error(result.data?.error || 'Runner ping failed');
                }
            } catch (error) {
                this.getApp().toast.error('Error pinging runner: ' + error.message);
            }
        }
    }

    async onActionShutdownRunner(event, element) {
        const runnerId = element.getAttribute('data-id');
        const runner = this.collection.get(runnerId);
        if (runner && confirm('Are you sure you want to shutdown this runner?')) {
            try {
                const result = await runner.shutdown(true);
                if (result.success) {
                    this.getApp().toast.success('Runner shutdown initiated');
                    await this.collection.fetch();
                } else {
                    this.getApp().toast.error(result.data?.error || 'Failed to shutdown runner');
                }
            } catch (error) {
                this.getApp().toast.error('Error shutting down runner: ' + error.message);
            }
        }
    }
}