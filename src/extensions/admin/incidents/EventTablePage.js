/**
 * EventTablePage - System events management using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '@core/pages/TablePage.js';
import { IncidentEventList, IncidentEventForms } from '@core/models/Incident.js';
import EventView from './EventView.js';

class EventTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_events',
            pageName: 'System Events',
            router: "admin/events",
            Collection: IncidentEventList,

            formEdit: IncidentEventForms.edit,
            itemViewClass: EventView,

            viewDialogOptions: {
                header: false,
                size: 'lg'
            },

            defaultQuery: {
                sort: '-id',
                category__not: "ossec",
            },

            // Column definitions
            columns: [
                {
                    key: 'created', label: 'Timestamp',
                    sortable: true, formatter: 'datetime',
                    filter: {
                        type: 'daterange',
                    }
                },
                {
                    key: 'level', label: 'Level',
                    sortable: true, formatter: 'badge',
                    filter: {
                        type: "select",
                        options: [
                            { value: '5', label: 'Critical' },
                            { value: '4', label: 'Warning' },
                            { value: '3', label: 'Info' },
                            { value: '2', label: 'Debug' },
                            { value: '1', label: 'Trace' }
                        ]
                    }
                },
                {
                    key: 'scope',
                    label: 'Scope',
                    sortable: true, formatter: 'badge',
                    filter: {
                        type: "combobox",
                        options: [
                            { value: 'account', label: 'Account' },
                            { value: 'incident', label: 'Incident' },
                            { value: 'ossec', label: 'OSSEC' },
                            { value: 'fileman', label: 'File Manager' },
                            { value: 'metrics', label: 'Metrics' },
                            { value: 'jobs', label: 'Jobs' },
                            { value: 'aws', label: 'AWS' }

                        ]
                    }
                },
                {
                    key: 'category',
                    label: 'Category',
                    sortable: true, formatter: 'badge',
                    filter: {
                        type: "combobox",
                        options: [
                            { value: 'rest_error', label: 'Rest Error' },
                            { value: 'api_error', label: 'API Error' },
                            { value: 'auth', label: 'Auth' },
                            { value: 'database', label: 'Database' }
                        ]
                    }
                },
                { key: 'title', label: 'Title', sortable: true, formatter: 'truncate(50)' },
                {
                    key: 'source_ip', label: 'Source IP', sortable: true,
                    filter: {
                        type: "text"
                    }
                },
                {
                    key: 'metadata.server', label: 'Server',
                    sortable: true,
                    filter: {
                        type: "text"
                    }
                },
            ],

            filters: [
                {
                    key: 'category__not',
                    label: 'Not Category',
                    filter: {type:"text"}
                },
                {
                    key: 'metadata__http_url__icontains',
                    label: 'URL Contains',
                    filter: {type:"text"}
                },
                {
                    key: 'metadata__http_path__icontains',
                    label: 'Path Contains',
                    filter: {type:"text"}
                },
                {
                    key: 'metadata__http_query_string__icontains',
                    label: 'Query String Contains',
                    filter: {type:"text"}
                },
                {
                    key: 'metadata__rule_id',
                    label: 'Rule ID',
                    filter: {type:"text"}
                },
                {
                    key: 'metadata__country_code',
                    label: 'Country',
                    filter: {type:"text"}
                },
                {
                    key: 'metadata__region',
                    label: 'Region',
                    filter: {type:"text"}
                },
                {
                    key: 'metadata__city__icontains',
                    label: 'City',
                    filter: {type:"text"}
                },
                {
                    key: 'metadata__http_status',
                    label: 'HTTP Status',
                    filter: {type:"text"}
                },
                {
                    key: 'model_name',
                    label: 'Model Name',
                    filter: {type:"text"}
                },
                {
                    key: 'model_id',
                    label: 'Model ID',
                    filter: {type:"text"}
                },
                {
                    key: 'metadata__user_email',
                    label: 'User Email',
                    filter: {type:"text"}
                },
                {
                    key: 'metadata__http_user_agent__icontains',
                    label: 'User Agent Contains',
                    filter: {type:"text"}
                },
            ],

            // Table features
            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            // Toolbar
            showRefresh: true,
            showAdd: false,
            showExport: true,

            // Empty state
            emptyMessage: 'No events found.',

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

export default EventTablePage;
