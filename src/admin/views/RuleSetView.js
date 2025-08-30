import View from '../../core/View.js';
import TabView from '../../components/TabView.js';
import DataView from '../../components/DataView.js';
import Table from '../../components/Table.js';
import ContextMenu from '../../components/ContextMenu.js';
import { RuleSet, RuleList } from '../../models/Incident.js';
import Dialog from '../../components/Dialog.js';

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
                            <div class="text-muted small">Category: {{model.category}} | Priority: {{model.priority}}</div>
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
        // Config Tab
        this.configView = new DataView({
            model: this.model,
            className: "p-3",
            columns: 2,
            fields: [
                { name: 'id', label: 'RuleSet ID' },
                { name: 'name', label: 'Name' },
                { name: 'category', label: 'Category' },
                { name: 'priority', label: 'Priority' },
                { name: 'match_by', label: 'Match Logic', format: (v) => v === 0 ? 'ALL' : 'ANY' },
                { name: 'bundle_by', label: 'Bundle By' },
                { name: 'bundle_minutes', label: 'Bundle Minutes' },
                { name: 'handler', label: 'Handler' },
                { name: 'is_active', label: 'Status', format: 'boolean' },
            ]
        });

        // Rules Tab
        const rulesCollection = new RuleList({
            params: { parent: this.model.get('id') }
        });
        this.rulesView = new Table({
            title: 'Rules',
            collection: rulesCollection,
            columns: [
                { key: 'id', label: 'ID', width: '70px' },
                { key: 'name', label: 'Name' },
                { key: 'field_name', label: 'Field' },
                { key: 'comparator', label: 'Comparator' },
                { key: 'value', label: 'Value' },
                { key: 'value_type', label: 'Type' },
            ],
            showAdd: true,
            actions: ['edit', 'delete']
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
}

export default RuleSetView;
