/**
 * IncidentTablePage - Incident management using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '@core/pages/TablePage.js';
import { Incident, IncidentList } from '@ext/admin/models/Incident.js';
import IncidentView from './IncidentView.js';

// Incident.ADD_FORM / EDIT_FORM are registered on the model (Incident.js).
Incident.VIEW_CLASS = IncidentView;

class IncidentTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_incidents',
            pageName: 'Manage Incidents',
            router: "admin/incidents",
            Collection: IncidentList,

            viewDialogOptions: {
                header: false,
                noBodyPadding: true,
                buttons: []
            },

            defaultQuery: {
                sort: '-id',
                status: "new",
            },

            dayRangeFilter: true,
            searchPlaceholder: 'Search title, message, or ID',

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
                    visibility: 'lg',
                    filter: {type:"text"}
                },
                {
                    key: 'category',
                    label: 'Category',
                    sortable: true,
                    visibility: 'lg',
                    filter: {type:"text"}
                },
                {
                    key: 'priority',
                    label: 'Priority',
                    visibility: 'xl',
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
                {
                    key: 'priority__gt',
                    label: 'Priority Greater Than',
                    filter: {type:"number"}
                },
                {
                    key: 'priority__lt',
                    label: 'Priority Less Than',
                    filter: {type:"number"}
                },
                {
                    key: 'metadata__rule_id',
                    label: 'Rule ID',
                    filter: {type:"text"}
                },
                {
                    key: 'metadata__key',
                    label: 'Metadata Key',
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
                { label: "Merge", icon: "bi bi-merge", action: "merge" },
                { label: "Protect", icon: "bi bi-shield-fill-check", action: "protect" }
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

    onActionBatchResolve() { return this.batchAction({ field: 'status', value: 'resolved', label: 'Resolve' }); }
    onActionBatchOpen()    { return this.batchAction({ field: 'status', value: 'open',     label: 'Open' }); }
    onActionBatchPause()   { return this.batchAction({ field: 'status', value: 'paused',   label: 'Pause' }); }
    onActionBatchIgnore()  { return this.batchAction({ field: 'status', value: 'ignored',  label: 'Ignore' }); }

    onActionBatchProtect() {
        // Nested-field save — use a custom handler so the helper still
        // confirms / toasts / refreshes for free.
        return this.batchAction({
            label: 'Protect',
            message: `Protect ${this.tableView.getSelectedItems().length} incident(s) from deletion?`,
            handler: (model) => model.save({ metadata: { do_not_delete: true } })
        });
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
        this.tableView.clearSelection();
        await this.tableView.refresh();
    }
}

export default IncidentTablePage;
