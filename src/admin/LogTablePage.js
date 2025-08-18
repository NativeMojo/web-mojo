/**
 * LogTablePage - Log management using TablePage component
 * Manages system and application logs
 */

import TablePage from '../components/TablePage.js';
import { Log, LogList } from '../models/Log.js';

class LogTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_logs',
            pageName: 'Manage Logs',
            router: "admin/logs",
            Collection: LogList,
            // Note: Log model doesn't have forms defined
            // formCreate: LogForms.create,
            // formEdit: LogForms.edit,

            // Column definitions
            columns: [
                {
                    key: 'created',
                    label: 'Timestamp',
                    sortable: true,
                    formatter: "epoch|datetime"
                },
                {
                    key: 'level',
                    label: 'Level',
                    sortable: true
                },
                {
                    key: 'kind',
                    label: 'Kind'
                },
                {
                    key: 'method',
                    label: 'Method'
                },
                {
                    key: 'path',
                    label: 'Path'
                },
                {
                    key: 'username',
                    label: 'User',
                },
                {
                    key: 'ip',
                    label: 'IP'
                },
                {
                    key: 'duid',
                    label: 'Browser ID',
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
                actions: ["view", "details"],
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
}

export default LogTablePage;
