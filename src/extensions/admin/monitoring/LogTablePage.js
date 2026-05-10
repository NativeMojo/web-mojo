/**
 * LogTablePage - Log management using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '@core/pages/TablePage.js';
import { Log, LogList } from '@core/models/Log.js';
import { groupByDay } from '@core/views/list/grouping.js';
import LogView from './LogView.js';

Log.VIEW_CLASS = LogView;

class LogTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_logs',
            pageName: 'Manage Logs',
            router: "admin/logs",
            Collection: LogList,

            // 1d/7d/30d/90d range picker writes `created__gte`. Complements the
            // column-level daterange filter (start+end).
            dayRangeFilter: true,

            // Day-grouped chronological feed.
            ...groupByDay('created'),

            searchPlaceholder: 'Search title, message, or ID',

            viewDialogOptions: {
                header: false,
                size: 'xl'
            },

            // Column definitions
            columns: [
                {
                    key: 'created|epoch|datetime',
                    label: 'Timestamp',
                    sortable: true,
                    filter: {
                        type: 'daterange',
                    }
                },
                {
                    key: 'level',
                    label: 'Level',
                    sortable: true,
                    formatter: 'badge',
                    filter: {
                        type: 'select',
                        options: [
                            { value: 'info', label: 'Info' },
                            { value: 'warning', label: 'Warning' },
                            { value: 'error', label: 'Error' }
                        ]
                    }
                },
                {
                    key: 'kind',
                    label: 'Kind',
                    filter: {
                        type: "text"
                    }
                },
                {
                    key: 'method',
                    label: 'Method',
                    visibility: 'lg',
                    filter: {
                        type: "text"
                    }
                },
                {
                    key: 'path',
                    label: 'Path',
                    visibility: 'lg',
                    filter: {
                        type: "text"
                    }
                },
                {
                    key: 'username',
                    label: 'User',
                    visibility: 'lg',
                    filter: {
                        type: "text"
                    }
                },
                {
                    key: 'ip',
                    label: 'IP',
                    visibility: 'xl',
                    filter: {
                        type: "text"
                    }
                },
                {
                    key: 'duid',
                    label: 'Browser ID',
                    formatter: 'truncate_middle(16)',
                    visibility: 'xl',
                    filter: {
                        type: "text"
                    }
                }
            ],

            // Default sort by timestamp descending (newest first)
            defaultQuery: {
                sort: '-created'
            },

            // Severity stripe — surface error / warning rows in the
            // chronological feed; info rows stay quiet.
            rowStripe: (model) => {
                const level = String(model.get('level') || '').toLowerCase();
                if (level === 'error') return 'danger';
                if (level === 'warning') return 'warning';
                return null;
            },

            // Logs are an immutable audit feed — no selection, no batch actions,
            // no row mutations. View + export only.
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            // Toolbar
            showRefresh: true,
            showAdd: false,
            showExport: true,

            // Empty state
            emptyMessage: 'No log entries found.',

            // Table display options
            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }
}

export default LogTablePage;
