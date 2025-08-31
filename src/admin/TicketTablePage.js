import TablePage from '../pages/TablePage.js';
import { TicketList, TicketForms } from '../models/Tickets.js';
import TicketView from './views/TicketView.js';

class TicketTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_tickets',
            pageName: 'Tickets',
            router: "admin/tickets",
            Collection: TicketList,
            formCreate: TicketForms.create,
            formEdit: TicketForms.edit,
            itemViewClass: TicketView,
            viewDialogOptions: {
                header: false,
                size: 'xl'
            },

            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                { key: 'title', label: 'Title', sortable: true },
                { key: 'status', label: 'Status', sortable: true, formatter: 'badge' },
                { key: 'priority', label: 'Priority', sortable: true },
                { key: 'assignee.display_name', label: 'Assignee', sortable: true, formatter: "default('Unassigned')" },
                { key: 'incident', label: 'Incident ID', sortable: true },
                { key: 'created', label: 'Created', sortable: true, formatter: 'datetime' },
            ],

            selectable: true,
            searchable: true,
            sortable: true,
            paginated: true,
            showRefresh: true,
            showAdd: true,
            showExport: true,

            tableOptions: {
                pageSizes: [10, 25, 50],
                defaultPageSize: 25,
                emptyMessage: 'No tickets found.',
                emptyIcon: 'bi-ticket-detailed',
                actions: ["view", "edit", "delete"],
            }
        });
    }
}

export default TicketTablePage;
