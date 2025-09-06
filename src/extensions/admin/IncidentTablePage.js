/**
 * IncidentTablePage - Incident management using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '@core/pages/TablePage.js';
import { IncidentList, IncidentForms } from '@core/models/Incident.js';
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

            // Toolbar
            showRefresh: true,
            showAdd: true,
            showExport: true,

            // Empty state
            emptyMessage: 'No incidents found. Click "Add Incident" to create your first incident.',

            // Batch actions
            batchBarLocation: 'top',
            batchActions: [
                { label: "Resolve", icon: "bi bi-check-circle", action: "batch-resolve" },
                { label: "Close", icon: "bi bi-x-circle", action: "batch-close" },
                { label: "Assign", icon: "bi bi-person-plus", action: "batch-assign" },
                { label: "Set Priority", icon: "bi bi-flag", action: "batch-priority" },
                { label: "Change State", icon: "bi bi-arrow-repeat", action: "batch-state" },
                { label: "Export", icon: "bi bi-download", action: "batch-export" },
                { label: "Delete", icon: "bi bi-trash", action: "batch-delete" }
            ],

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

export default IncidentTablePage;