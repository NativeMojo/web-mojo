/**
 * LogTablePage - Log management using TablePage component
 * Manages system and application logs
 */

import TablePage from '../components/TablePage.js';
import { Log, LogList } from '../models/Log.js';
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
                    key: 'created',
                    label: 'Timestamp',
                    sortable: true,
                    formatter: "epoch|datetime",
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

            // Table features
            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            // TablePage toolbar
            showRefresh: true,
            showAdd: false, // Logs are typically not manually created
            showExport: true,

            // Table options
            tableOptions: {
                pageSizes: [10, 25, 50, 100],
                defaultPageSize: 25,
                emptyMessage: 'No log entries found.',
                emptyIcon: 'bi-journal-text',
                actions: ["view"],
                batchActions: [
                    { label: "Export", icon: "bi bi-download", action: "batch_export" },
                    { label: "Archive", icon: "bi bi-archive", action: "batch_archive" },
                    { label: "Delete", icon: "bi bi-trash", action: "batch_delete" },
                    { label: "Mark as Reviewed", icon: "bi bi-check2", action: "batch_reviewed" },
                    { label: "Filter by Level", icon: "bi bi-funnel", action: "batch_filter_level" },
                    { label: "Filter by Source", icon: "bi bi-funnel-fill", action: "batch_filter_source" }
                ],
                // Default sort by timestamp descending (newest first)
                defaultSort: { key: 'timestamp', direction: 'desc' }
            }
        });
    }

    async onItemView(item, mode, event, target) {
        const dialog = await super.onItemView(item, mode, event, target);
        if (dialog && dialog.bodyView) {
            dialog.bodyView.on('log:deleted', () => {
                dialog.hide();
                this.refreshTable();
            });
        }
        return dialog;
    }
}

export default LogTablePage;
