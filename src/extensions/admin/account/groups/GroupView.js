/**
 * GroupView - Modern group management interface
 *
 * Features:
 * - Clean header with avatar, name, kind badge, parent link, active/online status
 * - SideNavView with: Details, Members, Children, Events, Logs
 * - Expanded context menu with quick actions
 * - Clean Bootstrap 5 styling matching UserView patterns
 */

import View from '@core/View.js';
import SideNavView from '@core/views/navigation/SideNavView.js';
import TableView from '@core/views/table/TableView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { Group, GroupList, GroupForms } from '@core/models/Group.js';
import { MemberList } from '@core/models/Member.js';
import { IncidentEventList } from '@ext/admin/models/Incident.js';
import { LogList } from '@core/models/Log.js';
import { ApiKeyList, ApiKeyForms } from '@core/models/ApiKey.js';
import Dialog from '@core/views/feedback/Dialog.js';
import AdminMetadataSection from '../../shared/AdminMetadataSection.js';

class GroupView extends View {
    constructor(options = {}) {
        super({
            className: 'group-view',
            ...options
        });

        this.model = options.model || new Group(options.data || {});

        this.template = `
            <div class="group-view-container">
                <!-- Header -->
                <div data-container="group-header"></div>
                <!-- Side Nav -->
                <div data-container="group-sidenav" style="min-height: 400px;"></div>
            </div>
        `;
    }

    async onInit() {
        // ── Header ──────────────────────────────────
        this.header = new View({
            containerId: 'group-header',
            template: `
            <div class="d-flex justify-content-between align-items-start mb-4">
                <!-- Left Side: Identity -->
                <div class="d-flex align-items-center gap-3">
                    {{#model.avatar}}
                        {{{model.avatar|avatar('md','rounded')}}}
                    {{/model.avatar}}
                    {{^model.avatar}}
                        <div class="d-flex align-items-center justify-content-center rounded bg-light" style="width: 56px; height: 56px;">
                            <i class="bi bi-people text-secondary" style="font-size: 1.5rem;"></i>
                        </div>
                    {{/model.avatar}}
                    <div>
                        <h3 class="mb-0">{{model.name|default('Unnamed Group')}}</h3>
                        <div class="d-flex align-items-center gap-2 mt-1">
                            <span class="badge bg-primary bg-opacity-10 text-primary" style="font-size: 0.72rem;">{{model.kind|capitalize}}</span>
                            {{#model.parent}}
                                <span class="text-muted small">
                                    <i class="bi bi-diagram-3 me-1"></i>
                                    <a href="#" data-action="view-parent" data-id="{{model.parent.id}}" class="text-decoration-none">{{model.parent.name}}</a>
                                </span>
                            {{/model.parent}}
                        </div>
                        {{#model.metadata.timezone}}
                            <div class="text-muted small mt-1"><i class="bi bi-clock me-1"></i>{{model.metadata.timezone}}</div>
                        {{/model.metadata.timezone}}
                    </div>
                </div>

                <!-- Right Side: Status & Actions -->
                <div class="d-flex align-items-start gap-4">
                    <div class="text-end">
                        <div class="d-flex align-items-center justify-content-end gap-3">
                            <span class="d-inline-flex align-items-center gap-1" title="{{model.is_active|boolean('Group Active','Group Inactive')}}">
                                <i class="bi {{model.is_active|boolean('bi-toggle-on text-success','bi-toggle-off text-secondary')}}" style="font-size: 1.1rem;"></i>
                                <span class="small">{{model.is_active|boolean('Active','Inactive')}}</span>
                            </span>
                        </div>
                        {{#model.last_activity}}
                            <div class="text-muted small mt-1">Last active {{model.last_activity|relative}}</div>
                        {{/model.last_activity}}
                        {{#model.created}}
                            <div class="text-muted small mt-1">Created {{model.created|date}}</div>
                        {{/model.created}}
                    </div>
                    <div data-container="group-context-menu"></div>
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
                    .gv-section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #adb5bd; margin-bottom: 0.5rem; margin-top: 1.5rem; }
                    .gv-section-label:first-child { margin-top: 0; }
                    .gv-field-row { display: flex; align-items: baseline; padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0; }
                    .gv-field-row:last-child { border-bottom: none; }
                    .gv-field-label { width: 140px; font-size: 0.78rem; color: #6c757d; flex-shrink: 0; }
                    .gv-field-value { flex: 1; font-size: 0.88rem; color: #212529; }
                    .gv-field-action { color: #6c757d; cursor: pointer; font-size: 0.8rem; margin-left: auto; padding: 0.15rem 0.4rem; border-radius: 4px; background: none; border: none; }
                    .gv-field-action:hover { background: #f0f0f0; color: #0d6efd; }
                </style>

                <div class="gv-section-label">Group</div>
                <div class="gv-field-row">
                    <div class="gv-field-label">Name</div>
                    <div class="gv-field-value">{{model.name}}</div>
                    <button type="button" class="gv-field-action" data-action="edit-group" title="Edit"><i class="bi bi-pencil"></i></button>
                </div>
                <div class="gv-field-row">
                    <div class="gv-field-label">Kind</div>
                    <div class="gv-field-value"><span class="badge bg-primary bg-opacity-10 text-primary">{{model.kind|capitalize}}</span></div>
                </div>
                <div class="gv-field-row">
                    <div class="gv-field-label">Status</div>
                    <div class="gv-field-value">
                        {{#model.is_active|bool}}<span style="font-size:0.65rem; padding:0.15em 0.45em; background:#d1e7dd; color:#0f5132; border-radius:3px;">Active</span>{{/model.is_active|bool}}
                        {{^model.is_active|bool}}<span style="font-size:0.65rem; padding:0.15em 0.45em; background:#fff3cd; color:#856404; border-radius:3px;">Inactive</span>{{/model.is_active|bool}}
                    </div>
                </div>
                <div class="gv-field-row">
                    <div class="gv-field-label">ID</div>
                    <div class="gv-field-value" style="font-family: ui-monospace, monospace; font-size: 0.82rem;">{{model.id}}</div>
                </div>

                <div class="gv-section-label">Hierarchy</div>
                <div class="gv-field-row">
                    <div class="gv-field-label">Parent</div>
                    <div class="gv-field-value">
                        {{#model.parent}}
                            <a href="#" data-action="view-parent" data-id="{{model.parent.id}}" class="text-decoration-none">{{model.parent.name}}</a>
                            <span class="text-muted small ms-1">({{model.parent.kind|capitalize}})</span>
                        {{/model.parent}}
                        {{^model.parent}}<span style="color:#adb5bd; font-style:italic; font-size:0.85rem;">None — top-level group</span>{{/model.parent}}
                    </div>
                </div>

                <div class="gv-section-label">Settings</div>
                {{#model.metadata.timezone}}
                <div class="gv-field-row">
                    <div class="gv-field-label">Timezone</div>
                    <div class="gv-field-value">{{model.metadata.timezone}}</div>
                </div>
                {{/model.metadata.timezone}}
                {{#model.metadata.domain}}
                <div class="gv-field-row">
                    <div class="gv-field-label">Domain</div>
                    <div class="gv-field-value">{{model.metadata.domain}}</div>
                </div>
                {{/model.metadata.domain}}
                {{#model.metadata.portal}}
                <div class="gv-field-row">
                    <div class="gv-field-label">Portal URL</div>
                    <div class="gv-field-value"><a href="{{model.metadata.portal}}" target="_blank" class="text-decoration-none">{{model.metadata.portal}}</a></div>
                </div>
                {{/model.metadata.portal}}
                {{#model.metadata.eod_hour}}
                <div class="gv-field-row">
                    <div class="gv-field-label">End of Day</div>
                    <div class="gv-field-value">{{model.metadata.eod_hour}}:00</div>
                </div>
                {{/model.metadata.eod_hour}}

                <div class="gv-section-label">Dates</div>
                <div class="gv-field-row">
                    <div class="gv-field-label">Created</div>
                    <div class="gv-field-value">{{model.created|datetime|default('—')}}</div>
                </div>
                <div class="gv-field-row">
                    <div class="gv-field-label">Modified</div>
                    <div class="gv-field-value">{{model.modified|datetime|default('—')}}</div>
                </div>
            `
        });

        // ── Members ─────────────────────────────────
        const membersView = new TableView({
            collection: new MemberList({ params: { group: this.model.get('id'), size: 10 } }),
            hideActivePillNames: ['group'],
            clickAction: 'view',
            showAdd: true,
            addButtonLabel: 'Invite',
            onAdd: (event) => this.onInviteClick(event),
            columns: [
                { key: 'user.display_name', label: 'User', sortable: true },
                { key: 'user.email', label: 'Email', sortable: true },
                { key: 'permissions|keys|badge', label: 'Permissions' },
                { key: 'created', label: 'Joined', formatter: 'date', sortable: true }
            ]
        });

        // ── Children (sub-groups) ───────────────────
        const childrenView = new TableView({
            collection: new GroupList({ params: { parent: this.model.get('id'), size: 10 } }),
            hideActivePillNames: ['parent'],
            clickAction: 'view',
            showAdd: true,
            addButtonLabel: 'Add Group',
            onAdd: () => this.onActionAddChildGroup(),
            columns: [
                { key: 'name', label: 'Name', sortable: true },
                { key: 'kind', label: 'Kind', formatter: 'badge' },
                {
                    key: 'is_active', label: 'Status', width: '80px',
                    template: `
                        {{#model.is_active|bool}}<span class="badge bg-success bg-opacity-10 text-success">Active</span>{{/model.is_active|bool}}
                        {{^model.is_active|bool}}<span class="badge bg-secondary bg-opacity-10 text-secondary">Inactive</span>{{/model.is_active|bool}}`
                },
                { key: 'created', label: 'Created', formatter: 'date', sortable: true }
            ]
        });

        // ── Events ──────────────────────────────────
        const eventsView = new TableView({
            collection: new IncidentEventList({
                params: { size: 10, model_name: 'account.Group', model_id: this.model.get('id') }
            }),
            hideActivePillNames: ['model_name', 'model_id'],
            columns: [
                { key: 'created', label: 'Date', formatter: 'datetime', sortable: true, width: '150px' },
                { key: 'category|badge', label: 'Category' },
                { key: 'title', label: 'Title' }
            ]
        });

        // ── API Keys ──────────────────────────────────
        const apiKeysView = new TableView({
            collection: new ApiKeyList({ params: { group: this.model.get('id'), size: 10 } }),
            hideActivePillNames: ['group'],
            clickAction: 'view',
            showAdd: true,
            addButtonLabel: 'Create Key',
            addFormConfig: {
                ...ApiKeyForms.create,
                defaults: { group: this.model.get('id') }
            },
            columns: [
                { key: 'name', label: 'Name', sortable: true },
                {
                    key: 'is_active', label: 'Status', width: '80px',
                    template: `
                        {{#model.is_active|bool}}<span class="badge bg-success bg-opacity-10 text-success">Active</span>{{/model.is_active|bool}}
                        {{^model.is_active|bool}}<span class="badge bg-secondary bg-opacity-10 text-secondary">Inactive</span>{{/model.is_active|bool}}`
                },
                { key: 'permissions|keys|badge', label: 'Permissions' },
                { key: 'created', label: 'Created', formatter: 'datetime', sortable: true }
            ]
        });

        // ── Metadata ─────────────────────────────────
        const metadataView = new AdminMetadataSection({ model: this.model });

        // ── Logs ────────────────────────────────────
        const logsView = new TableView({
            collection: new LogList({
                params: { size: 10, model_name: 'account.Group', model_id: this.model.get('id') }
            }),
            permissions: 'view_logs',
            hideActivePillNames: ['model_name', 'model_id'],
            columns: [
                {
                    key: 'created', label: 'Timestamp', sortable: true, formatter: 'epoch|datetime',
                    filter: { name: 'created', type: 'daterange', startName: 'dr_start', endName: 'dr_end', fieldName: 'dr_field', label: 'Date Range', format: 'YYYY-MM-DD', displayFormat: 'MMM DD, YYYY', separator: ' to ' }
                },
                {
                    key: 'level', label: 'Level', sortable: true,
                    filter: { type: 'select', options: [{ value: 'info', label: 'Info' }, { value: 'warning', label: 'Warning' }, { value: 'error', label: 'Error' }] }
                },
                { key: 'kind', label: 'Kind', filter: { type: 'text' } },
                { name: 'log', label: 'Log' }
            ]
        });

        // ── SideNavView ─────────────────────────────
        this.sideNavView = new SideNavView({
            containerId: 'group-sidenav',
            activeSection: 'details',
            navWidth: 180,
            contentPadding: '1.25rem 2rem',
            enableResponsive: true,
            minWidth: 500,
            sections: [
                { key: 'details', label: 'Details', icon: 'bi-info-circle', view: detailsView },
                { key: 'members', label: 'Members', icon: 'bi-people', view: membersView },
                { key: 'children', label: 'Sub-Groups', icon: 'bi-diagram-3', view: childrenView },
                { key: 'api_keys', label: 'API Keys', icon: 'bi-key', view: apiKeysView },
                { type: 'divider', label: 'Activity' },
                { key: 'events', label: 'Events', icon: 'bi-calendar-event', view: eventsView },
                { key: 'logs', label: 'Logs', icon: 'bi-journal-text', view: logsView, permissions: 'view_logs' },
                { type: 'divider', label: 'Settings' },
                { key: 'metadata', label: 'Metadata', icon: 'bi-braces', view: metadataView }
            ]
        });
        this.addChild(this.sideNavView);

        // ── Context Menu ────────────────────────────
        const groupMenu = new ContextMenu({
            containerId: 'group-context-menu',
            className: 'context-menu-view header-menu-absolute',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Edit Group', action: 'edit-group', icon: 'bi-pencil' },
                    { type: 'divider' },
                    { label: 'Invite Member', action: 'invite-member', icon: 'bi-person-plus' },
                    { label: 'Add Sub-Group', action: 'add-child-group', icon: 'bi-diagram-3' },
                    { type: 'divider' },
                    this.model.get('is_active')
                        ? { label: 'Deactivate Group', action: 'deactivate-group', icon: 'bi-toggle-off' }
                        : { label: 'Activate Group', action: 'activate-group', icon: 'bi-toggle-on' },
                ]
            }
        });
        this.addChild(groupMenu);
    }

    // ── Actions ─────────────────────────────────

    async onActionEditGroup() {
        const resp = await Dialog.showModelForm({
            title: `Edit Group — ${this.model.get('name')}`,
            model: this.model,
            size: 'lg',
            formConfig: GroupForms.detailed,
        });
        if (resp) {
            await this.render();
        }
    }

    async onActionInviteMember() {
        return this.onInviteClick(new Event('click'));
    }

    async onInviteClick(event) {
        if (event?.preventDefault) {
            event.preventDefault();
            event.stopPropagation();
        }
        const data = await Dialog.showForm({
            title: `Invite User to ${this.model.get('name')}`,
            size: 'sm',
            fields: [
                { type: 'email', name: 'email', label: 'Email', required: true, cols: 12 }
            ]
        });
        if (!data?.email) return true;

        const app = this.getApp();
        const resp = await app.rest.POST('/api/group/member/invite', {
            group: this.model.id,
            email: data.email
        });
        if (resp.success) {
            app.toast.success('User invited successfully');
            // Refresh members if on that section
            if (this.sideNavView?.getActiveSection() === 'members') {
                await this.sideNavView.showSection('members');
            }
        } else {
            app.toast.error(resp.message || 'Failed to invite user');
        }
        return true;
    }

    async onActionAddChildGroup() {
        const data = await Dialog.showForm({
            title: `Add Sub-Group to ${this.model.get('name')}`,
            size: 'sm',
            fields: GroupForms.create.fields.filter(f => f.name !== 'parent')
        });
        if (!data) return true;

        data.parent = this.model.id;
        const newGroup = new Group(data);
        const resp = await newGroup.save();
        if (resp.status === 200 || resp.status === 201) {
            this.getApp()?.toast?.success('Sub-group created');
            if (this.sideNavView?.getActiveSection() === 'children') {
                await this.sideNavView.showSection('children');
            }
        } else {
            this.getApp()?.toast?.error(resp.message || 'Failed to create sub-group');
        }
        return true;
    }

    async onActionDeactivateGroup() {
        const confirmed = await Dialog.confirm(
            `Are you sure you want to deactivate <strong>${this.model.get('name')}</strong>?`,
            'Deactivate Group'
        );
        if (!confirmed) return true;

        const resp = await this.model.save({ is_active: false });
        if (resp.status === 200) {
            this.getApp()?.toast?.success('Group deactivated');
            await this.render();
        } else {
            this.getApp()?.toast?.error('Failed to deactivate group');
        }
        return true;
    }

    async onActionActivateGroup() {
        const confirmed = await Dialog.confirm(
            `Are you sure you want to activate <strong>${this.model.get('name')}</strong>?`,
            'Activate Group'
        );
        if (!confirmed) return true;

        const resp = await this.model.save({ is_active: true });
        if (resp.status === 200) {
            this.getApp()?.toast?.success('Group activated');
            await this.render();
        } else {
            this.getApp()?.toast?.error('Failed to activate group');
        }
        return true;
    }

    async onActionViewParent(event, element) {
        const parentId = element?.dataset?.id;
        if (!parentId) return true;

        const parent = new Group({ id: parentId });
        await parent.fetch();
        if (parent.id) {
            Dialog.showDialog({
                title: false,
                size: 'lg',
                body: new GroupView({ model: parent }),
                buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
            });
        }
        return true;
    }

    // ── Navigation helpers ──────────────────────

    async showSection(sectionName) {
        if (this.sideNavView) {
            await this.sideNavView.showSection(sectionName);
        }
    }

    getActiveSection() {
        return this.sideNavView ? this.sideNavView.getActiveSection() : null;
    }

    _onModelChange() {
        // Prevent full re-render on model changes
    }

    static create(options = {}) {
        return new GroupView(options);
    }
}

Group.VIEW_CLASS = GroupView;

export default GroupView;
