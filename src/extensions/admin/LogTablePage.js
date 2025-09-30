/**
 * LogTablePage - Log management using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '@core/pages/TablePage.js';
import { LogList } from '@core/models/Log.js';
import LogView from './views/LogView.js';

class LogTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_logs',
            pageName: 'Manage Logs',
            router: "admin/logs",
            Collection: LogList,

            itemViewClass: LogView,
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
                        name: "created",
                        type: 'daterange',
                        startName: 'dr_start',
                        endName: 'dr_end',
                        fieldName: 'dr_field',
                        label: 'Date Range',
                        format: 'YYYY-MM-DD',
                        displayFormat: 'MMM DD, YYYY',
                        separator: ' to '
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
                    filter: {
                        type: "text"
                    }
                },
                {
                    key: 'path',
                    label: 'Path',
                    filter: {
                        type: "text"
                    }
                },
                {
                    key: 'username',
                    label: 'User',
                    filter: {
                        type: "text"
                    }
                },
                {
                    key: 'ip',
                    label: 'IP',
                    filter: {
                        type: "text"
                    }
                },
                {
                    key: 'duid',
                    label: 'Browser ID',
                    formatter: 'truncate_middle(16)',
                    filter: {
                        type: "text"
                    }
                }
            ],

            // Default sort by timestamp descending (newest first)
            defaultQuery: {
                sort: '-created'
            },

            // Table features
            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            // Toolbar
            showRefresh: true,
            showAdd: false, // Logs are typically not manually created
            showExport: true,

            // Empty state
            emptyMessage: 'No log entries found.',

            // Batch actions
            batchBarLocation: 'top',
            batchActions: [
                { label: "Export", icon: "bi bi-download", action: "batch-export" },
                { label: "Archive", icon: "bi bi-archive", action: "batch-archive" },
                { label: "Delete", icon: "bi bi-trash", action: "batch-delete" },
                { label: "Mark as Reviewed", icon: "bi bi-check2", action: "batch-reviewed" }
            ],

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
