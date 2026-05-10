import TablePage from '@core/pages/TablePage.js';
import { RuleSet, RuleSetList, BundleByOptions } from '@ext/admin/models/Incident.js';
import RuleSetView from './RuleSetView.js';

// RuleSet.ADD_FORM / EDIT_FORM are registered on the model (Incident.js).
// Wire the page-level view dialog here.
RuleSet.VIEW_CLASS = RuleSetView;

class RuleSetTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_rulesets',
            pageName: 'Rule Engine',
            router: "admin/rulesets",
            Collection: RuleSetList,

            viewDialogOptions: {
                header: false,
                noBodyPadding: true,
                buttons: []                  // RuleSetView is a DetailView — no footer; X / Esc / backdrop dismiss; size inherits TablePage's `lg` default
            },

            defaultQuery: {
                sort: 'priority',
            },

            columns: [
                { key: 'id', label: 'ID', width: '60px', sortable: true, class: 'text-muted' },
                {
                    key: 'is_active', label: 'Active', width: '70px', sortable: true,
                    formatter: 'yesnoicon',
                    filter: {
                        type: 'boolean',
                        trueLabel: 'Active',
                        falseLabel: 'Inactive'
                    }
                },
                {
                    key: 'metadata.delete_on_resolution', label: 'Auto-Delete', width: '90px',
                    formatter: 'yesnoicon'
                },
                { key: 'name', label: 'Name', sortable: true },
                {
                    key: 'category', label: 'Category', sortable: true, formatter: 'badge',
                    filter: { type: 'text', placeholder: 'e.g., auth:failed' }
                },
                { key: 'priority', label: 'Priority', sortable: true, width: '80px' },
                {
                    key: 'bundle_by', label: 'Bundle By', width: '140px',
                    formatter: (value) => {
                        const opt = BundleByOptions.find(o => o.value === value);
                        return opt ? opt.label : String(value);
                    }
                },
                {
                    key: 'trigger_count', label: 'Trigger', width: '80px',
                    formatter: (value) => value != null ? String(value) : '<span class="text-muted">—</span>'
                },
                {
                    key: 'handler', label: 'Handler',
                    formatter: "truncate(40)|default('—')"
                }
            ],

            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,
            showRefresh: true,
            showAdd: true,
            showExport: true,

            emptyMessage: 'No rule sets found. Create one to start matching events automatically.',

            batchBarLocation: 'top',
            batchActions: [
                { label: "Enable", icon: "bi bi-toggle-on", action: "enable" },
                { label: "Disable", icon: "bi bi-toggle-off", action: "disable" },
                { label: "Delete", icon: "bi bi-trash", action: "delete", danger: true }
            ],

            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }

    onActionBatchEnable()  { return this.batchAction({ field: 'is_active', value: true,  label: 'Enable' }); }
    onActionBatchDisable() { return this.batchAction({ field: 'is_active', value: false, label: 'Disable' }); }
    onActionBatchDelete()  { return this.batchAction({ destroy: true,                    label: 'Delete' }); }
}

export default RuleSetTablePage;
