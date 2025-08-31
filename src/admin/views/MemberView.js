/**
 * MemberView - Comprehensive view for a group membership record
 */

import View from '../../core/View.js';
import TabView from '../../views/navigation/TabView.js';
import DataView from '../../views/data/DataView.js';
import ContextMenu from '../../views/feedback/ContextMenu.js';
import { Member, MemberForms } from '../../models/Member.js';
import Dialog from '../../core/Dialog.js';

class MemberView extends View {
    constructor(options = {}) {
        super({
            className: 'member-view',
            ...options
        });

        this.model = options.model || new Member(options.data || {});

        this.template = `
            <div class="member-view-container">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <div class="d-flex align-items-center gap-3">
                        {{{model.user.avatar|avatar('md','rounded-circle')}}}
                        <div>
                            <h3 class="mb-0">{{model.user.display_name}}</h3>
                            <div class="text-muted">Member of <strong>{{model.group.name}}</strong></div>
                        </div>
                    </div>

                    <div class="d-flex align-items-start gap-4">
                        <div class="text-end">
                            <div>Role: <span class="badge bg-primary">{{model.role|capitalize}}</span></div>
                            <div class="text-muted small mt-1">Status: {{model.status|capitalize}}</div>
                        </div>
                        <div data-container="member-context-menu"></div>
                    </div>
                </div>

                <!-- Tab Container -->
                <div data-container="member-tabs"></div>
            </div>
        `;
    }

    async onInit() {
        // Overview Tab
        this.overviewView = new DataView({
            model: this.model,
            className: "p-3",
            columns: 2,
            fields: [
                { name: 'id', label: 'Membership ID' },
                { name: 'user.id', label: 'User ID' },
                { name: 'user.display_name', label: 'User Name' },
                { name: 'user.email', label: 'User Email' },
                { name: 'group.id', label: 'Group ID' },
                { name: 'group.name', label: 'Group Name' },
                { name: 'role', label: 'Role' },
                { name: 'status', label: 'Status' },
                { name: 'created', label: 'Date Joined', format: 'datetime' },
            ]
        });

        this.tabView = new TabView({
            containerId: 'member-tabs',
            tabs: {
                'Overview': this.overviewView,
            },
            activeTab: 'Overview'
        });
        this.addChild(this.tabView);

        // ContextMenu
        const memberMenu = new ContextMenu({
            containerId: 'member-context-menu',
            className: "context-menu-view header-menu-absolute",
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Edit Membership', action: 'edit-membership', icon: 'bi-pencil' },
                    { type: 'divider' },
                    { label: 'View User', action: 'view-user', icon: 'bi-person' },
                    { label: 'View Group', action: 'view-group', icon: 'bi-diagram-3' },
                    { type: 'divider' },
                    { label: 'Remove From Group', action: 'remove-member', icon: 'bi-trash', danger: true }
                ]
            }
        });
        this.addChild(memberMenu);
    }

    async onActionEditMembership() {
        const resp = await Dialog.showModelForm({
            title: `Edit Membership`,
            model: this.model,
            formConfig: MemberForms.edit,
        });
        if (resp) {
            this.render();
        }
    }

    async onActionViewUser() {
        console.log("TODO: View user", this.model.get('user.id'));
    }

    async onActionViewGroup() {
        console.log("TODO: View group", this.model.get('group.id'));
    }

    async onActionRemoveMember() {
        const confirmed = await Dialog.confirm(
            `Are you sure you want to remove ${this.model.get('user.display_name')} from ${this.model.get('group.name')}?`,
            'Confirm Removal'
        );
        if (confirmed) {
            const resp = await this.model.destroy();
            if (resp.success) {
                this.emit('member:removed', { model: this.model });
            }
        }
    }
}

Member.VIEW_CLASS = MemberView;

export default MemberView;
