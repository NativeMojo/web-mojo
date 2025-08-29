import TablePage from '../components/TablePage.js';
import { IncidentEventList, IncidentEventForms } from '../models/Incident.js';
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

            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                { key: 'created', label: 'Timestamp', sortable: true, formatter: 'datetime' },
                { key: 'level', label: 'Level', sortable: true, formatter: 'badge' },
                { key: 'category', label: 'Category', sortable: true, formatter: 'badge' },
                { key: 'title', label: 'Title', sortable: true, formatter: 'truncate(50)' },
                { key: 'source_ip', label: 'Source IP', sortable: true },
                { key: 'model_name', label: 'Related Model', sortable: true },
            ],

            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            showRefresh: true,
            showAdd: false,
            showExport: true,

            tableOptions: {
                pageSizes: [10, 25, 50, 100],
                defaultPageSize: 25,
                emptyMessage: 'No events found.',
                emptyIcon: 'bi-bell',
                actions: ["view", "edit"],
            }
        });
    }

    async onItemView(item, mode, event, target) {
        const dialog = await super.onItemView(item, mode, event, target);
        if (dialog && dialog.bodyView) {
            dialog.bodyView.on('event:deleted', () => {
                dialog.hide();
                this.refreshTable();
            });
        }
        return dialog;
    }
}

export default EventTablePage;
