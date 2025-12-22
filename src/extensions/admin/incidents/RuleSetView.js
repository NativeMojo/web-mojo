import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import DataView from '@core/views/data/DataView.js';
import TableView from '@core/views/table/TableView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { RuleSet, RuleList, BundleByOptions, MatchByOptions } from '@core/models/Incident.js';
import Dialog from '@core/views/feedback/Dialog.js';

class RuleSetView extends View {
    constructor(options = {}) {
        super({
            className: 'ruleset-view',
            ...options
        });

        this.model = options.model || new RuleSet(options.data || {});

        this.template = `
            <div class="ruleset-view-container">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div class="d-flex align-items-center gap-3">
                        <div class="fs-1 text-primary"><i class="bi bi-gear-wide-connected"></i></div>
                        <div>
                            <h3 class="mb-1">{{model.name}}</h3>
                            <div class="text-muted small">Scope: {{model.category}} | Priority: {{model.priority}}</div>
                        </div>
                    </div>
                    <div data-container="ruleset-context-menu"></div>
                </div>

                <!-- Tabs -->
                <div data-container="ruleset-tabs"></div>
            </div>
        `;
    }

    async onInit() {
        // Get labels for current values
        const matchByValue = this.model.get('match_by');
        const matchByOption = MatchByOptions.find(opt => opt.value === matchByValue);
        const matchByLabel = matchByOption ? matchByOption.label : String(matchByValue);

        const bundleByValue = this.model.get('bundle_by');
        const bundleByOption = BundleByOptions.find(opt => opt.value === bundleByValue);
        const bundleByLabel = bundleByOption ? bundleByOption.label : String(bundleByValue);

        // Config Tab
        this.configView = new DataView({
            model: this.model,
            className: "p-3",
            columns: 2,
            fields: [
                { name: 'name', label: 'Name', cols: 4 },
                { name: 'category', label: 'Scope', formatter: 'badge', cols: 4 },
                { name: 'is_active', label: 'Is Active', formatter: 'yesno_icon', cols: 4 },
                { name: 'priority', label: 'Priority', cols: 4 },
                { name: 'id', label: 'RuleSet ID', cols: 4 },

                {
                    name: 'match_by',
                    label: 'Match Logic',
                    template: matchByLabel,
                    cols: 4
                },
                {
                    name: 'bundle_by',
                    label: 'Bundle By',
                    template: bundleByLabel,
                    cols: 4
                },
                { name: 'bundle_minutes', label: 'Bundle Minutes', cols: 4 },
                { name: 'bundle_by_rule_set', label: 'Bundle By Rule Set', formatter: 'yesno_icon', cols: 4 },
                { name: 'handler', label: 'Handler', cols: 12 },
            ]
        });

        // Rules Tab
        const rulesCollection = new RuleList({
            params: { parent: this.model.get('id') }
        });
        this.rulesView = new TableView({
            collection: rulesCollection,
            hideActivePillNames: ['parent'],
            columns: [
                { key: 'id', label: 'ID', width: '70px' },
                { key: 'name', label: 'Name' },
                { key: 'field_name', label: 'Field' },
                { key: 'comparator', label: 'Comparator', width: '120px' },
                { key: 'value', label: 'Value' },
                { key: 'value_type', label: 'Type', width: '100px' },
            ],
            showAdd: true,
            clickAction: 'edit',
            actions: ['edit', 'delete'],
            contextMenu: [
                { label: 'Edit Rule', action: 'edit', icon: 'bi-pencil' },
                { label: 'Duplicate Rule', action: 'duplicate', icon: 'bi-files' },
                { divider: true },
                { label: 'Delete Rule', action: 'delete', icon: 'bi-trash', danger: true }
            ],
            // Pass the parent ID so new rules get associated with this ruleset
            addFormDefaults: {
                parent: this.model.get('id')
            }
        });

        this.tabView = new TabView({
            containerId: 'ruleset-tabs',
            tabs: {
                'Configuration': this.configView,
                'Rules': this.rulesView
            },
            activeTab: 'Configuration'
        });
        this.addChild(this.tabView);

        const contextMenu = new ContextMenu({
            containerId: 'ruleset-context-menu',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Edit RuleSet', action: 'edit-ruleset', icon: 'bi-pencil' },
                    { label: 'Disable', action: 'disable-ruleset', icon: 'bi-toggle-off' },
                    { type: 'divider' },
                    { label: 'Delete RuleSet', action: 'delete-ruleset', icon: 'bi-trash', danger: true }
                ]
            }
        });
        this.addChild(contextMenu);
    }

    /**
     * Action handler: Edit RuleSet
     */
    async onActionEditRuleset() {
        const resp = await Dialog.showModelForm({
            title: `Edit RuleSet - ${this.model.get('name')}`,
            model: this.model,
            formConfig: RuleSet.EDIT_FORM,
        });
        if (resp) {
            await this.render();
        }
    }

    /**
     * Action handler: Disable/Enable RuleSet
     */
    async onActionDisableRuleset() {
        const isActive = this.model.get('is_active');
        const newStatus = !isActive;

        try {
            this.model.set('is_active', newStatus);
            await this.model.save();
            await this.render();

            Dialog.showToast({
                message: `RuleSet ${newStatus ? 'enabled' : 'disabled'} successfully`,
                type: 'success'
            });
        } catch (error) {
            Dialog.showToast({
                message: `Failed to update RuleSet: ${error.message}`,
                type: 'error'
            });
        }
    }

    /**
     * Action handler: Delete RuleSet
     */
    async onActionDeleteRuleset() {
        const confirmed = await Dialog.confirm({
            title: 'Delete RuleSet',
            message: `Are you sure you want to delete the ruleset "${this.model.get('name')}"? This action cannot be undone.`,
            confirmText: 'Delete',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                await this.model.destroy();

                Dialog.showToast({
                    message: 'RuleSet deleted successfully',
                    type: 'success'
                });

                // Close the dialog
                const dialog = this.element?.closest('.modal');
                if (dialog) {
                    const bsModal = bootstrap.Modal.getInstance(dialog);
                    if (bsModal) {
                        bsModal.hide();
                    }
                }

                // Emit event to parent to refresh the table
                this.emit('ruleset:deleted', { model: this.model });
            } catch (error) {
                Dialog.showToast({
                    message: `Failed to delete RuleSet: ${error.message}`,
                    type: 'error'
                });
            }
        }
    }
}

RuleSetView.VIEW_CLASS = RuleSetView;

export default RuleSetView;
