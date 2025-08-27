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
                        type: 'select',
                        options: ["org", "iso", "group", "test"]
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

            // Additional filters not tied to columns
            filters: [
                {
                    name: 'user_search',
                    label: 'User Search',
                    type: 'text',
                    placeholder: 'Search username, email, or session...',
                    help: 'Search across username and email fields',
                    columns: 6
                },
                {
                    name: 'ip_range',
                    label: 'IP Address',
                    type: 'text',
                    placeholder: '192.168.1.0/24 or specific IP',
                    help: 'CIDR notation or specific IP address',
                    columns: 6
                },
                {
                    name: 'session_timeframe',
                    label: 'Session Duration',
                    type: 'daterange',
                    startName: 'session_start',
                    endName: 'session_end',
                    outputFormat: 'epoch',
                    displayFormat: 'MMM DD, YYYY HH:mm',
                    separator: ' through ',
                    help: 'Filter by session time range',
                    columns: 12
                },
                {
                    name: 'advanced_search',
                    label: 'Advanced Search',
                    type: 'form',
                    fields: [
                        {
                            type: 'text',
                            name: 'request_id',
                            label: 'Request ID',
                            placeholder: 'req_123456...',
                            columns: 6
                        },
                        {
                            type: 'text',
                            name: 'correlation_id',
                            label: 'Correlation ID',
                            placeholder: 'corr_abcdef...',
                            columns: 6
                        },
                        {
                            type: 'select',
                            name: 'severity',
                            label: 'Severity Level',
                            options: [
                                { value: '', text: 'All Severities' },
                                { value: 'critical', text: 'Critical' },
                                { value: 'high', text: 'High' },
                                { value: 'medium', text: 'Medium' },
                                { value: 'low', text: 'Low' }
                            ],
                            columns: 4
                        },
                        {
                            type: 'tags',
                            name: 'event_tags',
                            label: 'Event Tags',
                            options: ['auth', 'api', 'database', 'cache', 'security', 'performance'],
                            placeholder: 'Select event tags...',
                            columns: 8
                        }
                    ],
                    help: 'Complex multi-field search across log metadata'
                }
            ],

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
