/**
 * EventTablePage - System events management using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '@core/pages/TablePage.js';
import { IncidentEventList, IncidentEventForms } from '@core/models/Incident.js';
import EventView from './views/EventView.js';

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
                { key: 'created', label: 'Timestamp', sortable: true, formatter: 'datetime' },
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
                    key: 'category',
                    label: 'Category',
                    sortable: true, formatter: 'badge',
                    filter: {
                        type: "text"
                    }
                },
                { key: 'title', label: 'Title', sortable: true, formatter: 'truncate(50)' },
                {
                    key: 'source_ip', label: 'Source IP', sortable: true,
                    filter: {
                        type: "text"
                    }
                },
                { key: 'model_name', label: 'Related Model', sortable: true }
            ],

            filters: [
                {
                    key: 'category__not',
                    label: 'Not Category',
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
