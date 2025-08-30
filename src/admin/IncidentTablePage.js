/**
 * IncidentTablePage - Incident management using TablePage component
 * Manages incidents and their lifecycle
 */

import TablePage from '../components/TablePage.js';
import { Incident, IncidentList, IncidentForms } from '../models/Incident.js';
import IncidentView from './views/IncidentView.js';

class IncidentTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_incidents',
            pageName: 'Manage Incidents',
            router: "admin/incidents",
            Collection: IncidentList,
            formCreate: IncidentForms.create,
            formEdit: IncidentForms.edit,
            itemViewClass: IncidentView,
            viewDialogOptions: {
                header: false,
                size: 'xl'
            },

            // Column definitions
            columns: [
                {
                    key: 'id',
                    label: 'ID',
                    width: '60px',
                    sortable: true,
                    class: 'text-muted'
                },
                {
                    key: 'created',
                    label: 'Created',
                    formatter: "epoch|datetime"
                },
                {
                    key: 'category',
                    label: 'Category',
                    sortable: true,
                    formatter: "default('General')"
                },
                {
                    key: 'state',
                    label: 'State',
                    formatter: 'badge'
                },
                {
                    key: 'priority',
                    label: 'Priority'
                },
                {
                    key: 'details',
                    label: 'Description',
                    formatter: "truncate(100)|default('No description')"
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
            showAdd: true,
            showExport: true,

            // Table options
            tableOptions: {
                pageSizes: [5, 10, 25, 50],
                defaultPageSize: 10,
                emptyMessage: 'No incidents found. Click "Add Incident" to create your first incident.',
                emptyIcon: 'bi-exclamation-triangle',
                actions: ["edit", "view"],
                batchActions: [
                    { label: "Resolve", icon: "bi bi-check-circle", action: "batch_resolve" },
                    { label: "Close", icon: "bi bi-x-circle", action: "batch_close" },
                    { label: "Assign", icon: "bi bi-person-plus", action: "batch_assign" },
                    { label: "Set Priority", icon: "bi bi-flag", action: "batch_priority" },
                    { label: "Change State", icon: "bi bi-arrow-repeat", action: "batch_state" },
                    { label: "Export", icon: "bi bi-download", action: "batch_export" },
                    { label: "Delete", icon: "bi bi-trash", action: "batch_delete" }
                ],
            }
        });
    }

    async onItemView(item, mode, event, target) {
        const dialog = await super.onItemView(item, mode, event, target);
        if (dialog && dialog.bodyView) {
            dialog.bodyView.on('incident:deleted', () => {
                dialog.hide();
                this.refreshTable();
            });
            dialog.bodyView.on('incident:updated', () => {
                this.refreshTable();
            });
        }
        return dialog;
    }
}

export default IncidentTablePage;
