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

            defaultQuery: {
                sort: '-id',
                status: "new",
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
                    key: 'status', label: "Status",
                    filter: {
                        type: 'select',
                        options: ["new", "open", "paused", "resolved", "qa", "ignored"],
                    }
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
                    formatter: "default('General')",
                    filter: {type:"text"}
                },
                {
                    key: 'priority',
                    label: 'Priority',
                    filter: {type:"text"}
                },
                {
                    key: 'title',
                    label: 'title',
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
                { label: "Open", icon: "bi bi-folder2-open", action: "open" },
                { label: "Resolve", icon: "bi bi-check-circle", action: "resolve" },
                { label: "Pause", icon: "bi bi-pause-circle", action: "pause" },
                { label: "Ignore", icon: "bi bi-x-circle", action: "ignore" },
                { label: "Change Status", icon: "bi bi-arrow-repeat", action: "status" }
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

    async onActionBatchResolve(event, element) {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;

        const app = this.getApp();
        const result = await app.confirm(`Are you sure you want to close ${selected.length} incidents?`);
        if (!result) return;
        await Promise.all(selected.map(item => item.model.save({status: 'resolved'})));
        this.tableView.collection.fetch();
    }

    async onActionBatchOpen(event, element) {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;

        const app = this.getApp();
        const result = await app.confirm(`Are you sure you want to open ${selected.length} incidents?`);
        if (!result) return;
        await Promise.all(selected.map(item => item.model.save({status: 'open'})));
        this.tableView.collection.fetch();
    }

    async onActionBatchPause(event, element) {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;

        const app = this.getApp();
        const result = await app.confirm(`Are you sure you want to pause ${selected.length} incidents?`);
        if (!result) return;
        await Promise.all(selected.map(item => item.model.save({status: 'paused'})));
        this.tableView.collection.fetch();
    }

    async onActionBatchIgnore(event, element) {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;

        const app = this.getApp();
        const result = await app.confirm(`Are you sure you want to ignore ${selected.length} incidents?`);
        if (!result) return;
        await Promise.all(selected.map(item => item.model.save({status: 'ignored'})));
        this.tableView.collection.fetch();
    }
}

export default IncidentTablePage;
