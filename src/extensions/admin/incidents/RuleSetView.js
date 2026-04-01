import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import DataView from '@core/views/data/DataView.js';
import TableView from '@core/views/table/TableView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { RuleSet, RuleList, BundleByOptions, MatchByOptions } from '@core/models/Incident.js';
import Dialog from '@core/views/feedback/Dialog.js';
import HandlerBuilderView from '../security/HandlerBuilderView.js';

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
        const triggerCount = this.model.get('trigger_count');
        const triggerWindow = this.model.get('trigger_window');
        const retriggerEvery = this.model.get('retrigger_every');

        this.configView = new DataView({
            model: this.model,
            className: "p-3",
            columns: 2,
            showEmptyValues: true,
            emptyValueText: '—',
            fields: [
                { name: 'name', label: 'Name', cols: 6 },
                { name: 'id', label: 'RuleSet ID', cols: 3 },
                { name: 'is_active', label: 'Active', formatter: 'yesnoicon', cols: 3 },
                { name: 'category', label: 'Event Category', formatter: 'badge', cols: 4 },
                { name: 'priority', label: 'Evaluation Priority', cols: 4 },
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
                { name: 'bundle_minutes', label: 'Bundle Window (min)', cols: 4 },
                { name: 'bundle_by_rule_set', label: 'Bundle by RuleSet', formatter: 'yesnoicon', cols: 4 },
                {
                    name: 'trigger_count',
                    label: 'Trigger Count',
                    template: triggerCount != null ? String(triggerCount) + ' events' : 'Immediate (first event)',
                    cols: 4
                },
                {
                    name: 'trigger_window',
                    label: 'Trigger Window',
                    template: triggerWindow != null ? triggerWindow + ' minutes' : 'All events counted',
                    cols: 4
                },
                {
                    name: 'retrigger_every',
                    label: 'Re-trigger Every',
                    template: retriggerEvery != null ? retriggerEvery + ' events' : 'Fire once only',
                    cols: 4
                },
                { name: 'handler', label: 'Handler Chain', cols: 12 },
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
                    { label: 'Edit Handler', action: 'edit-handler', icon: 'bi-tools' },
                    { label: 'Disable', action: 'disable-ruleset', icon: 'bi-toggle-off' },
                    { type: 'divider' },
                    { label: 'Delete RuleSet', action: 'delete-ruleset', icon: 'bi-trash', danger: true }
                ]
            }
        });
        this.addChild(contextMenu);
    }

    /**
     * Action handler: Edit Handler via guided builder
     */
    async onActionEditHandler() {
        const builder = new HandlerBuilderView({
            value: this.model.get('handler') || ''
        });

        const result = await Dialog.showDialog({
            title: 'Configure Handler',
            body: builder,
            size: 'md',
            scrollable: true,
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', dismiss: true },
                { text: 'Save', class: 'btn-primary', action: 'save' }
            ]
        });

        if (result === 'save') {
            const handlerString = builder.getValue();
            if (handlerString) {
                const resp = await this.model.save({ handler: handlerString });
                if (resp.status === 200) {
                    this.getApp()?.toast?.success('Handler updated');
                    await this.render();
                } else {
                    this.getApp()?.toast?.error('Failed to update handler');
                }
            }
        }
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
            this.getApp()?.toast?.success(`RuleSet ${newStatus ? 'enabled' : 'disabled'} successfully`);
        } catch (error) {
            this.getApp()?.toast?.error(`Failed to update RuleSet: ${error.message}`);
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
                this.getApp()?.toast?.success('RuleSet deleted successfully');

                // Close the dialog
                const dialog = this.element?.closest('.modal');
                if (dialog) {
                    const bsModal = window.bootstrap?.Modal?.getInstance(dialog);
                    if (bsModal) {
                        bsModal.hide();
                    }
                }

                // Emit event to parent to refresh the table
                this.emit('ruleset:deleted', { model: this.model });
            } catch (error) {
                this.getApp()?.toast?.error(`Failed to delete RuleSet: ${error.message}`);
            }
        }
    }
}

RuleSetView.VIEW_CLASS = RuleSetView;

export default RuleSetView;
