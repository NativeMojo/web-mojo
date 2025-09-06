/**
 * ScheduledJobsTable - Scheduled jobs table
 */

import TableView from '../../views/table/TableView.js';
import { JobList } from '../../models/Job.js';

export default class ScheduledJobsTable extends TableView {
    constructor(options = {}) {
        super({
            Collection: JobList,
            collectionParams: { status: "pending" },
            hideActivePillNames: ['status'],
            options: {
                searchable: true,
                sortable: true,
                paginated: true,
                size: 10,
                ...options.options
            },
            columns: [
                {
                    key: 'id',
                    label: 'Job ID',
                    formatter: 'truncate_middle(12)',
                    sortable: true
                },
                {
                    key: 'func',
                    label: 'Function',
                    sortable: true
                },
                {
                    key: 'channel',
                    label: 'Channel',
                    formatter: 'badge',
                    sortable: true
                },
                {
                    key: 'run_at',
                    label: 'Scheduled For',
                    formatter: 'datetime',
                    sortable: true
                },
                {
                    key: 'created',
                    label: 'Created',
                    formatter: 'datetime',
                    sortable: true
                },
                {
                    key: 'expires_at',
                    label: 'Expires At',
                    formatter: 'datetime',
                    sortable: true
                }
            ],
            ...options
        });
    }
}
