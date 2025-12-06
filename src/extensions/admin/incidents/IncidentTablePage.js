/**
 * IncidentTablePage - Incident management using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '@core/pages/TablePage.js';
import { IncidentList, IncidentForms } from '@core/models/Incident.js';
import IncidentView from './IncidentView.js';

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
                        type: 'multiselect',
                        options: ["new", "open", "paused", "resolved", "qa", "ignored"],
                    }
                },
                {
                    key: 'created',
                    label: 'Created',
                    formatter: "epoch|datetime",
                    filter: {
                        type: 'daterange',
                    }
                },
                {
                    key: 'scope',
                    label: 'Scope',
                    sortable: true,
                    filter: {type:"text"}
                },
                {
                    key: 'category',
                    label: 'Category',
                    sortable: true,
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
                { label: "Merge", icon: "bi bi-merge", action: "merge" }
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

    async onActionBatchMerge(_event, _element) {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;

        const app = this.getApp();
        const result = await app.showForm({
            title: `Merge ${selected.length} incidents`,
            fields: [
                {
                    name: 'merge',
                    type: 'select',
                    label: 'Select Parent Incident',
                    options: selected.map(item => ({value: item.model.id, label: item.model.id})),
                    required: true
                }
            ]
        });
        if (!result) return;

        // Find the parent model from selected items
        const parentModel = selected.find(item => item.model.id == result.merge)?.model;
        if (!parentModel) return;

        // Get list of all IDs to merge (excluding the parent)
        const mergeIds = selected
            .map(item => item.model.id)
            .filter(id => id != result.merge);

        // Save the merge operation to the parent model
        await parentModel.save({ merge: mergeIds });
        this.tableView.collection.fetch();
    }
}

export default IncidentTablePage;
