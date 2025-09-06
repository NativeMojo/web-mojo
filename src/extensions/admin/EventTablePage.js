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

            // Column definitions
            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                { key: 'created', label: 'Timestamp', sortable: true, formatter: 'datetime' },
                { key: 'level', label: 'Level', sortable: true, formatter: 'badge' },
                { key: 'category', label: 'Category', sortable: true, formatter: 'badge' },
                { key: 'title', label: 'Title', sortable: true, formatter: 'truncate(50)' },
                { key: 'source_ip', label: 'Source IP', sortable: true },
                { key: 'model_name', label: 'Related Model', sortable: true }
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