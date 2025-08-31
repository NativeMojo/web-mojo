/**
 * GroupView - Comprehensive group management interface
 *
 * Features:
 * - Clean header with group name, kind, parent info, and activity
 * - Tabbed interface for Members, Child Groups, and Logs
 * - Integrated with Table and ContextMenu components
 * - Clean Bootstrap 5 styling
 */

import View from '../../core/View.js';
import TabView from '../../views/navigation/TabView.js';
import Table from '../../views/table/Table.js';
import ContextMenu from '../../views/feedback/ContextMenu.js';
import { Group, GroupList, GroupForms } from '../../models/Group.js';
import { MemberList } from '../../models/Member.js';
import { LogList } from '../../models/Log.js';
import Dialog from '../../core/Dialog.js';

class GroupView extends View {
    constructor(options = {}) {
        super({
            className: 'group-view',
            ...options
        });

        // Group model instance
        this.model = options.model || new Group(options.data || {});

        // Tab views
        this.tabView = null;
        this.membersView = null;
        this.childrenView = null;
        this.logsView = null;

        // Set template
        this.template = `
            <div class="group-view-container">
                <!-- Group Header -->
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <!-- Left Side: Primary Identity -->
                    <div class="d-flex align-items-center gap-3">
                        {{#model.avatar}}
                            {{{model.avatar|avatar('md','rounded')}}}
                        {{/model.avatar}}
                        {{^model.avatar}}
                            <div class="avatar-placeholder rounded-circle bg-light d-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                                <i class="bi bi-collection text-secondary" style="font-size: 40px;"></i>
                            </div>
                        {{/model.avatar}}
                        <div>
                            <h3 class="mb-1">{{model.name|truncate(32)|default('Unnamed Group')}}</h3>
                            <div class="text-muted small">
                                <span>ID: {{model.id}}</span>
                                <span class="mx-2">|</span>
                                <span>Kind: {{model.kind|capitalize}}</span>
                                {{#model.metadata.timezone}}
                                    <span class="mx-2">|</span>
                                    <span><i class="bi bi-clock"></i> {{model.metadata.timezone}}</span>
                                {{/model.metadata.timezone}}
                            </div>
                            {{#model.parent}}
                                <div class="text-muted small mt-2">
                                    <div>Parent: <a href="#" data-action="view-parent" data-id="{{model.parent.id}}">{{model.parent.name|truncate(32)}}</a></div>
                                    <div>ID: {{model.parent.id}} | Kind: {{model.parent.kind|capitalize}}</div>
                                </div>
                            {{/model.parent}}
                        </div>
                    </div>

                    <!-- Right Side: Status & Actions -->
                    <div class="d-flex align-items-start gap-4">
                        <div class="text-end">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-circle-fill fs-8 {{model.is_active|boolean('text-success','text-secondary')}}"></i>
                                <span>{{model.is_active|boolean('Active','Inactive')}}</span>
                            </div>
                            {{#model.last_activity}}
                                <div class="text-muted small mt-1">Last active {{model.last_activity|relative}}</div>
                            {{/model.last_activity}}
                        </div>
                        <div data-container="group-context-menu"></div>
                    </div>
                </div>

                <!-- Tab Container -->
                <div data-container="group-tabs"></div>
            </div>
        `;
    }

    async onInit() {
        // Create Members table
        const membersCollection = new MemberList({
            params: { group: this.model.get('id'), size: 5 }
        });
        this.membersView = new Table({
            title: 'Group Members',
            collection: membersCollection,
            hideActivePillNames: ['group'],
            columns: [
                { key: 'user.display_name', label: 'User', sortable: true },
                { key: 'user.email', label: 'Email', sortable: true },
                { key: 'created', label: 'Date Joined', formatter: 'date', sortable: true }
            ]
        });

        // Create Children (sub-groups) table
        const childrenCollection = new GroupList({
            params: { parent: this.model.get('id'), size: 5 }
        });
        this.childrenView = new Table({
            title: 'Child Groups',
            collection: childrenCollection,
            hideActivePillNames: ['parent'],
            columns: [
                { key: 'name', label: 'Name', sortable: true },
                { key: 'kind', label: 'Kind', formatter: 'badge' },
                { key: 'created', label: 'Created', formatter: 'date', sortable: true }
            ]
        });

        // Create Logs table
        const logsCollection = new LogList({
            params: {
                size: 5,
                model_name: "account.Group",
                model_id: this.model.get('id')
            }
        });
        this.logsView = new Table({
            title: 'Group Logs',
            collection: logsCollection,
            permissions: 'view_logs',
            hideActivePillNames: ['model_name', 'model_id'],
            columns: [
                { key: 'created', label: 'Timestamp', sortable: true, formatter: "epoch|datetime" },
                { key: 'level', label: 'Level', sortable: true, formatter: 'badge' },
                { key: 'kind', label: 'Kind' },
                { key: 'log', label: 'Log' }
            ]
        });

        // Create TabView
        this.tabView = new TabView({
            tabs: {
                'Members': this.membersView,
                'Children': this.childrenView,
                'Logs': this.logsView
            },
            activeTab: 'Members',
            containerId: 'group-tabs'
        });
        this.addChild(this.tabView);

        // Create ContextMenu
        const groupMenu = new ContextMenu({
            containerId: 'group-context-menu',
            className: "context-menu-view header-menu-absolute",
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Edit Group', action: 'edit-group', icon: 'bi-pencil' },
                    { label: 'Add Member', action: 'add-member', icon: 'bi-person-plus' },
                    { label: 'Add Child Group', action: 'add-child-group', icon: 'bi-diagram-3' },
                    { type: 'divider' },
                    this.model.get('is_active')
                        ? { label: 'Deactivate Group', action: 'deactivate-group', icon: 'bi-x-circle' }
                        : { label: 'Activate Group', action: 'activate-group', icon: 'bi-check-circle' },
                ]
            }
        });
        this.addChild(groupMenu);
    }

    async onActionEditGroup() {
        const resp = await Dialog.showModelForm({
            title: `Edit Group - ${this.model.get('name')}`,
            model: this.model,
            size: 'lg',
            formConfig: GroupForms.detailed,
        });
        if (resp) {
            this.render(); // Re-render to show updated data in header
        }
    }

    // TODO: Implement other context menu actions
    async onActionAddMember() { console.log("TODO: Add member to group", this.model.id); }
    async onActionAddChildGroup() { console.log("TODO: Add child group to", this.model.id); }
    async onActionDeactivateGroup() { console.log("TODO: Deactivate group", this.model.id); }
    async onActionActivateGroup() { console.log("TODO: Activate group", this.model.id); }

    async onActionViewParent(event, element) {
        const parentId = element.dataset.id;
        console.log("TODO: View parent group", parentId);
        // This would typically involve closing the current dialog and opening a new one for the parent.
        // The parent TablePage would need to handle this event.
        this.emit('view-parent-group', { groupId: parentId });
    }
}

Group.VIEW_CLASS = GroupView;

export default GroupView;
