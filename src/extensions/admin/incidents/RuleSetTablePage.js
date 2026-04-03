import TablePage from '@core/pages/TablePage.js';
import { RuleSetList, RuleSetForms, BundleByOptions } from '@core/models/Incident.js';
import RuleSetView from './RuleSetView.js';

class RuleSetTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_rulesets',
            pageName: 'Rule Engine',
            router: "admin/rulesets",
            Collection: RuleSetList,
            itemViewClass: RuleSetView,
            formCreate: RuleSetForms.create,
            formEdit: RuleSetForms.edit,

            viewDialogOptions: {
                header: false,
                size: 'xl'
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
                        type: 'select',
                        options: [
                            { value: 'true', label: 'Active' },
                            { value: 'false', label: 'Inactive' }
                        ]
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

    async onActionBatchEnable() {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;
        const confirmed = await this.getApp().confirm(`Enable ${selected.length} ruleset(s)?`);
        if (!confirmed) return;
        await Promise.all(selected.map(item => item.model.save({ is_active: true })));
        this.getApp().toast.success(`${selected.length} ruleset(s) enabled`);
        this.tableView.collection.fetch();
    }

    async onActionBatchDisable() {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;
        const confirmed = await this.getApp().confirm(`Disable ${selected.length} ruleset(s)?`);
        if (!confirmed) return;
        await Promise.all(selected.map(item => item.model.save({ is_active: false })));
        this.getApp().toast.success(`${selected.length} ruleset(s) disabled`);
        this.tableView.collection.fetch();
    }

    async onActionBatchDelete() {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;
        const confirmed = await this.getApp().confirm(`Delete ${selected.length} ruleset(s)? This cannot be undone.`);
        if (!confirmed) return;
        await Promise.all(selected.map(item => item.model.destroy()));
        this.getApp().toast.success(`${selected.length} ruleset(s) deleted`);
        this.tableView.collection.fetch();
    }
}

export default RuleSetTablePage;
