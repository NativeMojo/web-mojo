/**
 * JobTableSection - Reusable filtered job table section
 *
 * Wraps a TableView for a specific job status filter. Accepts status,
 * sort, extraParams, columns, and batch action configuration via options.
 */
import View from '@core/View.js';
import TableView from '@core/views/table/TableView.js';
import { JobList } from '@ext/admin/models/Job.js';
import JobDetailsView from '../JobDetailsView.js';

// ── Default column configs per status ──────────────────────

const COLUMNS = {
    running: [
        {
            key: 'id',
            label: 'Job',
            template: `
                <div class="fw-semibold font-monospace">{{model.id|truncate_middle(12)}}</div>
                <div class="text-muted small">{{model.channel}} &middot; {{model.func|truncate_middle(28)|default('n/a')}}</div>
            `
        },
        {
            key: 'runner_id',
            label: 'Runner',
            template: `
                <span class="font-monospace">{{model.runner_id|truncate_middle(12)|default('n/a')}}</span>
            `
        },
        {
            key: 'status',
            label: 'State',
            formatter: (value, context) => {
                const job = context.row;
                const badgeClass = job.getStatusBadgeClass ? job.getStatusBadgeClass() : 'bg-secondary';
                const icon = job.getStatusIcon ? job.getStatusIcon() : 'bi-question';
                return `<span class="badge ${badgeClass}"><i class="${icon} me-1"></i>${value.toUpperCase()}</span>`;
            }
        },
        {
            key: 'created',
            label: 'Started',
            formatter: 'datetime'
        }
    ],

    pending: [
        {
            key: 'id',
            label: 'Job',
            template: `
                <div class="fw-semibold font-monospace">{{model.id|truncate_middle(12)}}</div>
                <div class="text-muted small">{{model.channel}} &middot; {{model.func|truncate_middle(28)|default('n/a')}}</div>
            `
        },
        {
            key: 'priority',
            label: 'Priority',
            formatter: (value = 0) => {
                const badge = value >= 8 ? 'bg-danger' : value >= 5 ? 'bg-warning' : 'bg-secondary';
                return `<span class="badge ${badge}">${value}</span>`;
            }
        },
        {
            key: 'modified',
            label: 'Queued',
            formatter: 'relative'
        }
    ],

    scheduled: [
        {
            key: 'id',
            label: 'Job',
            formatter: 'truncate_middle(12)'
        },
        {
            key: 'run_at',
            label: 'Scheduled For',
            formatter: 'datetime'
        },
        {
            key: 'channel',
            label: 'Channel',
            formatter: 'badge'
        }
    ],

    failed: [
        {
            key: 'id',
            label: 'Job',
            template: `
                <div class="fw-semibold font-monospace">{{model.id|truncate_middle(12)}}</div>
                <div class="text-muted small">{{model.channel}} &middot; {{model.func|truncate_middle(28)|default('n/a')}}</div>
            `
        },
        {
            key: 'last_error',
            label: 'Error',
            template: `
                <div class="text-danger small">{{model.last_error|truncate(80)|default('Unknown error')}}</div>
            `
        },
        {
            key: 'modified',
            label: 'Failed',
            formatter: 'relative'
        }
    ],

    all: [
        {
            key: 'id',
            label: 'Job',
            template: `
                <div class="fw-semibold font-monospace">{{model.id}}</div>
                <div class="text-muted small">{{model.func|default('Unknown')}}</div>
            `
        },
        {
            key: 'channel',
            label: 'Channel',
            formatter: 'badge'
        },
        {
            key: 'status',
            label: 'Status',
            formatter: (value, context) => {
                const job = context.row;
                const badgeClass = job.getStatusBadgeClass ? job.getStatusBadgeClass() : 'bg-secondary';
                const icon = job.getStatusIcon ? job.getStatusIcon() : 'bi-question';
                return `<span class="badge ${badgeClass}"><i class="${icon} me-1"></i>${value?.toUpperCase() || 'UNKNOWN'}</span>`;
            }
        },
        {
            key: 'created',
            label: 'Created',
            formatter: 'datetime'
        },
        {
            key: 'finished_at',
            label: 'Finished',
            formatter: 'datetime'
        },
        {
            key: 'duration_ms',
            label: 'Duration',
            formatter: 'duration'
        }
    ]
};

const ALL_FILTERS = [
    {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Running', value: 'running' },
            { label: 'Completed', value: 'completed' },
            { label: 'Failed', value: 'failed' },
            { label: 'Canceled', value: 'canceled' },
            { label: 'Expired', value: 'expired' }
        ]
    },
    {
        key: 'channel',
        label: 'Channel',
        type: 'text'
    },
    {
        key: 'func__icontains',
        label: 'Function',
        type: 'text'
    }
];

const CANCEL_BATCH_ACTIONS = [
    {
        icon: 'bi-x-circle-fill',
        label: 'Cancel Jobs',
        action: 'cancel-jobs'
    }
];

// ── Section view ───────────────────────────────────────────

export default class JobTableSection extends View {
    constructor(options = {}) {
        const {
            status,
            sort = '-created',
            extraParams = {},
            columns,
            title,
            selectable = false,
            batchActions,
            ...viewOptions
        } = options;

        super({
            className: 'job-table-section',
            template: `<div data-container="job-table"></div>`,
            ...viewOptions
        });

        this.status = status;
        this.sort = sort;
        this.extraParams = extraParams;
        this.columnConfig = columns;
        this.sectionTitle = title;
        this.selectable = selectable;
        this.batchActionConfig = batchActions;
    }

    async onInit() {
        // Build collection params
        const collectionParams = {
            size: 25,
            sort: this.sort,
            ...this.extraParams
        };
        if (this.status) {
            collectionParams.status = this.status;
        }

        // Resolve columns — columnConfig can be a string key (e.g. 'scheduled') or an array
        const columns = (typeof this.columnConfig === 'string'
            ? COLUMNS[this.columnConfig]
            : this.columnConfig) || COLUMNS[this.status] || COLUMNS.all;

        // Resolve selectable / batch actions
        const selectable = this.selectable;
        const batchActions = this.batchActionConfig
            || (selectable ? CANCEL_BATCH_ACTIONS : undefined);

        // Determine filterable based on status
        const isAllView = !this.status;

        const tableConfig = {
            containerId: 'job-table',
            Collection: JobList,
            collectionParams,
            columns,
            searchable: true,
            filterable: isAllView,
            paginated: true,
            itemView: JobDetailsView,
            hideActivePills: this.status ? ['status'] : [],
            viewDialogOptions: {
                title: 'Job Details',
                size: 'xl',
                scrollable: true
            },
            tableOptions: {
                striped: false,
                hover: true,
                size: 'sm'
            }
        };

        if (selectable) {
            tableConfig.selectable = true;
            tableConfig.batchBarLocation = 'top';
            tableConfig.batchActions = batchActions;
        }

        if (isAllView) {
            tableConfig.filters = ALL_FILTERS;
            tableConfig.tableOptions.striped = true;
            tableConfig.tableOptions.responsive = true;
        }

        this.tableView = new TableView(tableConfig);

        // Wire up batch cancel action
        if (selectable) {
            this.tableView.on("action:batch-cancel-jobs", async (action, event, element) => {
                const items = this.tableView.getSelectedItems();
                await Promise.all(items.map(item => item.model.cancel()));
                this.getApp().toast.success("Jobs cancelled successfully");
                this.tableView.collection.fetch();
            });
        }

        this.addChild(this.tableView);
    }
}
