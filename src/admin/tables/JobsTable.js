/**
 * JobsTable - Jobs management table
 */

import TableView from '../../views/table/TableView.js';
import Dialog from '../../core/Dialog.js';
import { JobList, JobForms } from '../../models/Job.js';
import JobDetailsView from '../views/JobDetailsView.js';

export default class JobsTable extends TableView {
    constructor(options = {}) {
        super({
            Collection: JobList,
            collectionParams: {
                start: 0,
                size: 15,
                sort: '-created'
            },
            options: {
                searchable: true,
                sortable: true,
                paginated: true,
                size: 15,
                ...options.options
            },
            columns: [
                {
                    key: 'id',
                    label: 'Job ID',
                    formatter: 'truncate_middle(12)',
                    sortable: true,
                    filter: { type: 'text', placeholder: 'Job ID...' }
                },
                {
                    key: 'status',
                    label: 'Status',
                    formatter: (value, context) => {
                        const job = context.row;
                        const badgeClass = job.getStatusBadgeClass ? job.getStatusBadgeClass() : 'bg-secondary';
                        const icon = job.getStatusIcon ? job.getStatusIcon() : 'bi-question';
                        return `<span class="badge ${badgeClass}"><i class="${icon} me-1"></i>${value.toUpperCase()}</span>`;
                    },
                    sortable: true,
                    filter: {
                        type: 'select',
                        options: [
                            { value: 'pending', label: 'Pending' },
                            { value: 'running', label: 'Running' },
                            { value: 'completed', label: 'Completed' },
                            { value: 'failed', label: 'Failed' },
                            { value: 'canceled', label: 'Canceled' },
                            { value: 'expired', label: 'Expired' }
                        ]
                    }
                },
                {
                    key: 'channel',
                    label: 'Channel',
                    formatter: 'badge',
                    sortable: true,
                    filter: { type: 'text', placeholder: 'Channel...' }
                },
                {
                    key: 'created',
                    label: 'Created',
                    formatter: 'datetime',
                    sortable: true,
                    filter: {
                        type: 'daterange',
                        label: 'Created Date'
                    }
                },
                {
                    key: 'started_at',
                    label: 'Started',
                    formatter: 'datetime',
                    sortable: true
                },
                {
                    key: 'finished_at',
                    label: 'Finished',
                    formatter: 'datetime',
                    sortable: true
                }
            ],
            contextMenu: [
                {
                    label: 'View Details',
                    action: 'view-job-details',
                    icon: 'bi-info-circle'
                },
                {
                    label: 'View Events',
                    action: 'view-job-events',
                    icon: 'bi-clock-history'
                },
                { separator: true },
                {
                    label: 'Cancel Job',
                    action: 'cancel-job',
                    icon: 'bi-x-circle',
                    danger: true,
                    condition: (job) => job.canCancel && job.canCancel()
                },
                {
                    label: 'Retry Job',
                    action: 'retry-job',
                    icon: 'bi-arrow-clockwise',
                    condition: (job) => job.canRetry && job.canRetry()
                },
                {
                    label: 'Clone Job',
                    action: 'clone-job',
                    icon: 'bi-copy'
                },
                { separator: true },
                {
                    label: 'Export Job',
                    action: 'export-job',
                    icon: 'bi-download'
                }
            ],
            batchActions: [
                {
                    label: 'Cancel Selected',
                    action: 'batch-cancel',
                    icon: 'bi-x-circle'
                },
                {
                    label: 'Retry Selected',
                    action: 'batch-retry',
                    icon: 'bi-arrow-clockwise'
                },
                {
                    label: 'Export Selected',
                    action: 'batch-export',
                    icon: 'bi-download'
                }
            ],
            ...options
        });
    }

    async onItemViewJobDetails(job) {
        if (job) {
            await JobDetailsView.show(job);
        }
    }

    async onItemCancelJob(job) {
        const confirmed = await Dialog.showConfirm('Are you sure you want to cancel this job?');
        if (job && confirmed) {
            try {
                const result = await job.cancel();
                if (result.success) {
                    this.getApp().toast.success('Job cancelled successfully');
                    await this.collection.fetch();
                } else {
                    this.getApp().toast.error(result.data?.error || 'Failed to cancel job');
                }
            } catch (error) {
                this.getApp().toast.error('Error cancelling job: ' + error.message);
            }
        }
    }

    async onItemRetryJob(job) {
        if (job) {
            const result = await Dialog.showForm({
                title: 'Retry Job',
                formConfig: JobForms.retry
            });

            if (result) {
                try {
                    const retryResult = await job.retry(result.delay || 0);
                    if (retryResult.success) {
                        this.getApp().toast.success('Job queued for retry');
                        await this.collection.fetch();
                    } else {
                        this.getApp().toast.error(retryResult.data?.error || 'Failed to retry job');
                    }
                } catch (error) {
                    this.getApp().toast.error('Error retrying job: ' + error.message);
                }
            }
        }
    }

    async onItemCloneJob(job) {
        if (job) {
            const payload = job.getPayload();
            const result = await Dialog.showForm({
                title: 'Clone Job',
                formConfig: {
                    ...JobForms.clone,
                    fields: JobForms.clone.fields.map(field => {
                        if (field.name === 'payload') {
                            field.value = JSON.stringify(payload, null, 2);
                        } else if (field.name === 'channel') {
                            field.value = job.get('channel');
                        }
                        return field;
                    })
                }
            });

            if (result) {
                try {
                    let newPayload = {};
                    if (result.payload) {
                        newPayload = JSON.parse(result.payload);
                    }

                    const cloneData = {
                        payload: newPayload,
                        channel: result.channel || job.get('channel'),
                        delay: result.delay || 0
                    };

                    const cloneResult = await job.cloneJob(cloneData);
                    if (cloneResult.success) {
                        this.getApp().toast.success('Job cloned successfully');
                        await this.collection.fetch();
                    } else {
                        this.getApp().toast.error(cloneResult.data?.error || 'Failed to clone job');
                    }
                } catch (error) {
                    this.getApp().toast.error('Error cloning job: ' + error.message);
                }
            }
        }
    }
}
