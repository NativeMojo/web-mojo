/**
 * TicketTablePage - Ticket management using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '@core/pages/TablePage.js';
import { TicketList, TicketForms, TicketCategories } from '@core/models/Tickets.js';
import TicketView from './views/TicketView.js';

class TicketTablePage extends TablePage {
    constructor(options = {}) {
        super({
            name: 'admin_tickets',
            pageName: 'Tickets',
            router: "admin/tickets",
            Collection: TicketList,

            formCreate: TicketForms.create,
            formEdit: TicketForms.edit,
            itemViewClass: TicketView,

            viewDialogOptions: {
                header: false
            },

            // Column definitions
            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                { key: 'title', label: 'Title', sortable: true},
                {
                    key: 'status', label: 'Status', sortable: true,
                    editable: true,
                    editableOptions: {
                      type: "select",
                      options: [
                          "new", "open", "paused", "resolved", "qa", "ignored"
                      ]
                    },
                    filter: {
                      type: "multiselect",
                      placeHolder: "Select Status",
                      options: [
                          "new", "open", "paused", "resolved", "qa", "ignored"
                      ]
                    }
                },
                { key: 'priority', label: 'Priority', sortable: true },
                {
                    key: 'category', label: 'Category', sortable: true,
                    editable: true,
                    editableOptions: {
                      type: "select",
                      options: [
                          ... Object.keys(TicketCategories)
                      ]
                    },
                    filter: {
                      type: "multiselect",
                      placeHolder: "Select Category",
                      options: [
                          ... Object.keys(TicketCategories)
                      ]
                    }
                },
                { key: 'assignee.display_name', label: 'Assignee', sortable: true, formatter: "default('Unassigned')" },
                { key: 'incident.id', label: 'Incident ID', sortable: true },
                { key: 'created', label: 'Created', sortable: true, formatter: 'datetime' }
            ],

            // Table features
            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            // Toolbar
            showRefresh: true,
            showAdd: true,
            showExport: true,

            // Empty state
            emptyMessage: 'No tickets found.',

            // Table display options
            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            },
            ...options,
        });
    }
}

export default TicketTablePage;
