/**
 * EventTablePage - System events management using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '@core/pages/TablePage.js';
import { IncidentEvent, IncidentEventList } from '@ext/admin/models/Incident.js';
import { groupByDay } from '@core/views/list/grouping.js';
import EventView from './EventView.js';

// IncidentEvent.EDIT_FORM is registered on the model (Incident.js).
IncidentEvent.VIEW_CLASS = EventView;

class EventTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_events',
            pageName: 'System Events',
            router: "admin/events",
            Collection: IncidentEventList,

            // 1d/7d/30d/90d range picker writes `created__gte`. Complements the
            // column-level daterange filter (start+end).
            dayRangeFilter: true,

            // Day-grouped chronological feed.
            ...groupByDay('created'),

            searchPlaceholder: 'Search title, message, or ID',

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
                    visibility: 'md',
                    filter: {
                        type: "text"
                    }
                },
                {
                    key: 'metadata.server', label: 'Server',
                    sortable: true,
                    visibility: 'lg',
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

            // Events are an immutable audit feed — no selection, no batch
            // actions, no row mutations. View + export only.
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
