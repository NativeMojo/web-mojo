/**
 * MemberView - Modern membership detail view
 *
 * Features:
 * - Header with avatar, user name, group name, role badge, active toggle
 * - SideNavView: Details (with clickable user/group), Permissions, Logs
 * - Context menu: Edit, View User, View Group, Remove
 * - Click user → opens UserView, click group → opens GroupView
 */

import View from '@core/View.js';
import SideNavView from '@core/views/navigation/SideNavView.js';
import TableView from '@core/views/table/TableView.js';
import FormView from '@core/forms/FormView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { Member, MemberForms } from '@core/models/Member.js';
import { LogList } from '@core/models/Log.js';
import Modal from '@core/views/feedback/Modal.js';

class MemberView extends View {
    constructor(options = {}) {
        super({
            className: 'member-view',
            ...options
        });

        this.model = options.model || new Member(options.data || {});

        this.template = `
            <div class="member-view-container">
                <!-- Header + Context Menu -->
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <div data-container="member-header" style="flex: 1;"></div>
                    <div data-container="member-context-menu" class="ms-3 flex-shrink-0"></div>
                </div>
                <!-- Side Nav -->
                <div data-container="member-sidenav" style="min-height: 300px;"></div>
            </div>
        `;
    }

    async onInit() {
        // ── Header ──────────────────────────────────
        this.header = new View({
            containerId: 'member-header',
            template: `
            <div class="d-flex justify-content-between align-items-start">
                <!-- Left: Avatar + Identity -->
                <div class="d-flex align-items-center gap-3">
                    {{{model.user.avatar|avatar('md','rounded-circle')}}}
                    <div>
                        <h4 class="mb-0">
                            <a href="#" data-action="view-user" class="text-decoration-none text-body">{{model.user.display_name}}</a>
                        </h4>
                        <div class="text-muted small mt-1">
                            <i class="bi bi-people me-1"></i>
                            <a href="#" data-action="view-group" class="text-decoration-none">{{model.group.name}}</a>
                            {{#model.group.kind}}
                                <span class="badge bg-light text-muted border ms-1" style="font-size: 0.65rem;">{{model.group.kind|capitalize}}</span>
                            {{/model.group.kind}}
                        </div>
                    </div>
                </div>

                <!-- Right: Status -->
                <div class="text-end">
                    <div class="d-flex align-items-center gap-2">
                        {{#model.metadata.role}}
                            <span class="badge bg-primary bg-opacity-10 text-primary" style="font-size: 0.72rem;">{{model.metadata.role}}</span>
                        {{/model.metadata.role}}
                        <span class="d-inline-flex align-items-center gap-1" style="cursor: pointer;"
                              data-action="toggle-active"
                              title="{{model.is_active|boolean('Click to deactivate','Click to activate')}}">
                            <i class="bi {{model.is_active|boolean('bi-toggle-on text-success','bi-toggle-off text-secondary')}}" style="font-size: 1.1rem;"></i>
                            <span class="small">{{model.is_active|boolean('Active','Inactive')}}</span>
                        </span>
                    </div>
                    {{#model.created}}
                        <div class="text-muted small mt-1">Joined {{model.created|date}}</div>
                    {{/model.created}}
                </div>
            </div>`
        });
        this.header.setModel(this.model);
        this.addChild(this.header);

        // ── Details section ─────────────────────────
        const detailsView = new View({
            model: this.model,
            template: `
                <style>
                    .mv-section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #adb5bd; margin-bottom: 0.5rem; margin-top: 1.5rem; }
                    .mv-section-label:first-child { margin-top: 0; }
                    .mv-field-row { display: flex; align-items: baseline; padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0; }
                    .mv-field-row:last-child { border-bottom: none; }
                    .mv-field-label { width: 130px; font-size: 0.78rem; color: #6c757d; flex-shrink: 0; }
                    .mv-field-value { flex: 1; font-size: 0.88rem; color: #212529; }
                    .mv-field-action { color: #6c757d; cursor: pointer; font-size: 0.8rem; margin-left: auto; padding: 0.15rem 0.4rem; border-radius: 4px; background: none; border: none; }
                    .mv-field-action:hover { background: #f0f0f0; color: #0d6efd; }
                </style>

                <div class="mv-section-label">User</div>
                <div class="mv-field-row">
                    <div class="mv-field-label">Name</div>
                    <div class="mv-field-value">
                        <a href="#" data-action="view-user" class="text-decoration-none">{{model.user.display_name}}</a>
                    </div>
                </div>
                <div class="mv-field-row">
                    <div class="mv-field-label">Email</div>
                    <div class="mv-field-value">{{model.user.email}}</div>
                </div>

                <div class="mv-section-label">Group</div>
                <div class="mv-field-row">
                    <div class="mv-field-label">Name</div>
                    <div class="mv-field-value">
                        <a href="#" data-action="view-group" class="text-decoration-none">{{model.group.name}}</a>
                    </div>
                </div>
                {{#model.group.kind}}
                <div class="mv-field-row">
                    <div class="mv-field-label">Kind</div>
                    <div class="mv-field-value"><span class="badge bg-primary bg-opacity-10 text-primary">{{model.group.kind|capitalize}}</span></div>
                </div>
                {{/model.group.kind}}

                <div class="mv-section-label">Membership</div>
                <div class="mv-field-row">
                    <div class="mv-field-label">Role</div>
                    <div class="mv-field-value">{{model.metadata.role|default('—')}}</div>
                    <button type="button" class="mv-field-action" data-action="edit-membership" title="Edit"><i class="bi bi-pencil"></i></button>
                </div>
                <div class="mv-field-row">
                    <div class="mv-field-label">Status</div>
                    <div class="mv-field-value">
                        {{#model.is_active|bool}}<span style="font-size:0.65rem; padding:0.15em 0.45em; background:#d1e7dd; color:#0f5132; border-radius:3px;">Active</span>{{/model.is_active|bool}}
                        {{^model.is_active|bool}}<span style="font-size:0.65rem; padding:0.15em 0.45em; background:#fff3cd; color:#856404; border-radius:3px;">Inactive</span>{{/model.is_active|bool}}
                    </div>
                </div>
                <div class="mv-field-row">
                    <div class="mv-field-label">Member ID</div>
                    <div class="mv-field-value" style="font-family: ui-monospace, monospace; font-size: 0.82rem;">{{model.id}}</div>
                </div>
                <div class="mv-field-row">
                    <div class="mv-field-label">Joined</div>
                    <div class="mv-field-value">{{model.created|datetime|default('—')}}</div>
                </div>
            `
        });

        // ── Permissions section — editable switches ──
        const permissionsView = new FormView({
            fields: Member.PERMISSION_FIELDS,
            model: this.model,
            autosaveModelField: true
        });

        // ── Logs section ────────────────────────────
        const logsView = new TableView({
            collection: new LogList({
                params: { size: 10, model_name: 'account.Member', model_id: this.model.get('id') }
            }),
            permissions: 'view_logs',
            hideActivePillNames: ['model_name', 'model_id'],
            columns: [
                {
                    key: 'created', label: 'Timestamp', sortable: true, formatter: 'epoch|datetime',
                    filter: { name: 'created', type: 'daterange', startName: 'dr_start', endName: 'dr_end', fieldName: 'dr_field', label: 'Date Range', format: 'YYYY-MM-DD', displayFormat: 'MMM DD, YYYY', separator: ' to ' }
                },
                { key: 'level', label: 'Level', sortable: true },
                { key: 'kind', label: 'Kind' },
                { name: 'log', label: 'Log' }
            ]
        });

        // ── SideNavView ─────────────────────────────
        this.sideNavView = new SideNavView({
            containerId: 'member-sidenav',
            activeSection: 'details',
            navWidth: 160,
            contentPadding: '1rem 1.5rem',
            enableResponsive: true,
            minWidth: 450,
            sections: [
                { key: 'details', label: 'Details', icon: 'bi-info-circle', view: detailsView },
                { key: 'permissions', label: 'Permissions', icon: 'bi-shield-check', view: permissionsView },
                { type: 'divider', label: 'Activity' },
                { key: 'logs', label: 'Logs', icon: 'bi-journal-text', view: logsView, permissions: 'view_logs' }
            ]
        });
        this.addChild(this.sideNavView);

        // ── Context Menu ────────────────────────────
        const memberMenu = new ContextMenu({
            containerId: 'member-context-menu',
            className: 'context-menu-view header-menu-absolute',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Edit Membership', action: 'edit-membership', icon: 'bi-pencil' },
                    { type: 'divider' },
                    { label: 'View User', action: 'view-user', icon: 'bi-person' },
                    { label: 'View Group', action: 'view-group', icon: 'bi-people' },
                    { type: 'divider' },
                    this.model.get('is_active')
                        ? { label: 'Deactivate Member', action: 'deactivate-member', icon: 'bi-toggle-off' }
                        : { label: 'Activate Member', action: 'activate-member', icon: 'bi-toggle-on' },
                    { label: 'Remove From Group', action: 'remove-member', icon: 'bi-person-dash', danger: true }
                ]
            }
        });
        this.addChild(memberMenu);
    }

    // ── Actions ─────────────────────────────────

    async onActionEditMembership() {
        await Modal.modelForm({
            title: 'Edit Membership',
            model: this.model,
            formConfig: MemberForms.edit,
        });
    }

    async onActionViewUser() {
        const userId = this.model.get('user')?.id;
        if (!userId) return true;
        const { User } = await import('@core/models/User.js');
        await Modal.showModelById(User, userId);
        return true;
    }

    async onActionViewGroup() {
        const groupId = this.model.get('group')?.id;
        if (!groupId) return true;

        const { Group } = await import('@core/models/Group.js');
        await Modal.showModelById(Group, groupId);
        return true;
    }

    async onActionToggleActive() {
        if (this.model.get('is_active')) {
            return this.onActionDeactivateMember();
        } else {
            return this.onActionActivateMember();
        }
    }

    async onActionDeactivateMember() {
        const confirmed = await Modal.confirm(
            `Deactivate <strong>${this.model.get('user.display_name')}</strong>'s membership in <strong>${this.model.get('group.name')}</strong>?`,
            'Deactivate Member'
        );
        if (!confirmed) return true;

        const resp = await this.model.save({ is_active: false });
        if (resp.status === 200) {
            this.getApp()?.toast?.success('Member deactivated');
        } else {
            this.getApp()?.toast?.error('Failed to deactivate member');
        }
        return true;
    }

    async onActionActivateMember() {
        const confirmed = await Modal.confirm(
            `Activate <strong>${this.model.get('user.display_name')}</strong>'s membership in <strong>${this.model.get('group.name')}</strong>?`,
            'Activate Member'
        );
        if (!confirmed) return true;

        const resp = await this.model.save({ is_active: true });
        if (resp.status === 200) {
            this.getApp()?.toast?.success('Member activated');
        } else {
            this.getApp()?.toast?.error('Failed to activate member');
        }
        return true;
    }

    async onActionRemoveMember() {
        const confirmed = await Modal.confirm(
            `Remove <strong>${this.model.get('user.display_name')}</strong> from <strong>${this.model.get('group.name')}</strong>? This cannot be undone.`,
            'Remove Member'
        );
        if (!confirmed) return true;

        const resp = await this.model.destroy();
        if (resp.success) {
            this.getApp()?.toast?.success('Member removed');
            this.emit('member:removed', { model: this.model });
        } else {
            this.getApp()?.toast?.error('Failed to remove member');
        }
        return true;
    }

    _onModelChange() {
        // Prevent full re-render on model changes
    }

    static create(options = {}) {
        return new MemberView(options);
    }
}

Member.VIEW_CLASS = MemberView;

export default MemberView;
