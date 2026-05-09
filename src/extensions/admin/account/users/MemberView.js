/**
 * MemberView - Group-membership detail view built on the DetailView primitive.
 *
 * Sections:
 *   Overview                — KPIs + "This membership" flat rows + recent activity timeline
 *   Permissions             — autosave switch grid (Member.PERMISSION_FIELDS)
 *   ──── Activity ────
 *   Audit                   — TableView scoped to this membership
 *
 * Header title doubles as cross-record navigation: "{user} in {group}".
 * "View user" / "View group" actions open UserView / GroupView via Modal.detail.
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import TableView from '@core/views/table/TableView.js';
import FormView from '@core/forms/FormView.js';
import MetricCard from '@core/views/data/MetricCard.js';
import Timeline from '@core/views/data/Timeline.js';
import Modal from '@core/views/feedback/Modal.js';
import dataFormatter from '@core/utils/DataFormatter.js';
import { Member, MemberForms } from '@core/models/Member.js';
import { User } from '@core/models/User.js';
import { Group } from '@core/models/Group.js';
import { LogList } from '@core/models/Log.js';


// ── Helpers ────────────────────────────────────────────────

function countTruthy(obj) {
    if (!obj || typeof obj !== 'object') return 0;
    return Object.values(obj).filter(v => v === true).length;
}

const LOG_LEVEL_TONE = {
    error:    'danger',
    critical: 'danger',
    warning:  'warning',
    warn:     'warning',
    info:     'info'
};


// ── Overview section ───────────────────────────────────────

class MemberOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'member-overview-section',
            template: `
                <div class="detail-kpi-grid">
                    <div data-container="member-kpi-role"></div>
                    <div data-container="member-kpi-status"></div>
                    <div data-container="member-kpi-joined"></div>
                    <div data-container="member-kpi-perms"></div>
                </div>

                <div class="detail-section-eyebrow">This membership</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">User</div>
                    <div class="detail-flat-row-value">
                        {{#userDisplayName}}<a href="#" data-action="view-user">{{userDisplayName}}</a>{{/userDisplayName}}
                        {{^userDisplayName}}<span class="text-secondary fst-italic">Not set</span>{{/userDisplayName}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Email</div>
                    <div class="detail-flat-row-value">
                        {{#userEmail}}{{userEmail}}{{/userEmail}}
                        {{^userEmail}}<span class="text-secondary fst-italic">Not set</span>{{/userEmail}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Group</div>
                    <div class="detail-flat-row-value">
                        {{#groupName}}<a href="#" data-action="view-group">{{groupName}}</a>{{/groupName}}
                        {{^groupName}}<span class="text-secondary fst-italic">Not set</span>{{/groupName}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Role</div>
                    <div class="detail-flat-row-value">
                        {{#hasRole|bool}}<span class="badge text-bg-primary">{{roleLabel}}</span>{{/hasRole|bool}}
                        {{^hasRole|bool}}<span class="text-secondary fst-italic">Not set</span>{{/hasRole|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Joined</div>
                    <div class="detail-flat-row-value">
                        {{#hasCreated|bool}}{{model.created|epoch|datetime}} &middot; {{model.created|epoch|relative}}{{/hasCreated|bool}}
                        {{^hasCreated|bool}}<span class="text-secondary fst-italic">—</span>{{/hasCreated|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Invited by</div>
                    <div class="detail-flat-row-value">
                        {{#invitedBy}}{{invitedBy}}{{/invitedBy}}
                        {{^invitedBy}}<span class="text-secondary fst-italic">—</span>{{/invitedBy}}
                    </div>
                </div>

                <div class="detail-section-eyebrow">Recent activity in this group</div>
                <div data-container="member-overview-activity"></div>
            `,
            ...options
        });
        this.logsCollection = options.logsCollection || null;
    }

    // ── Computed properties bound by the Mustache template ─────

    get userDisplayName() { return this.model.get('user')?.display_name || ''; }
    get userEmail()       { return this.model.get('user')?.email || ''; }
    get groupName()       { return this.model.get('group')?.name || ''; }
    get roleLabel()       { return this.model.get('metadata')?.role || ''; }
    get hasRole()         { return !!this.roleLabel; }
    get hasCreated()      { return this.model.get('created') != null; }
    get invitedBy() {
        const md = this.model.get('metadata') || {};
        return md.invited_by_name || md.invited_by || '';
    }
    get permsCount()      { return countTruthy(this.model.get('permissions')); }
    get isActive()        { return !!this.model.get('is_active'); }

    async onInit() {
        const m = this.model;

        // Four KPI cards (small / default size — no metric-card-lg)
        this.kpiRole = new MetricCard({
            containerId: 'member-kpi-role',
            label: 'Role',
            value: this.roleLabel || '—'
        });
        this.kpiStatus = new MetricCard({
            containerId: 'member-kpi-status',
            label: 'Status',
            value: this.isActive ? 'Active' : 'Inactive',
            tone:  this.isActive ? 'success' : 'warning'
        });
        const created = m.get('created');
        const joinedRel = created != null
            ? dataFormatter.apply(created, ['epoch', 'relative'])
            : '—';
        this.kpiJoined = new MetricCard({
            containerId: 'member-kpi-joined',
            label: 'Joined',
            value: joinedRel || '—'
        });
        this.kpiPerms = new MetricCard({
            containerId: 'member-kpi-perms',
            label: 'Perms granted',
            value: String(this.permsCount)
        });
        [this.kpiRole, this.kpiStatus, this.kpiJoined, this.kpiPerms]
            .forEach(c => this.addChild(c));

        // Recent-activity timeline — fed by the shared logs collection.
        // `items` is a function so the Timeline re-resolves on render() and
        // picks up rows added after the first fetch:success event.
        this.activityTimeline = new Timeline({
            containerId: 'member-overview-activity',
            limit: 5,
            emptyText: 'No recorded activity for this membership yet.',
            items: () => this._buildActivityItems()
        });
        this.addChild(this.activityTimeline);
    }

    async onAfterRender() {
        await super.onAfterRender();
        // Refresh the activity timeline whenever the shared logs collection updates
        if (this.logsCollection && !this._wired) {
            this.logsCollection.on('fetch:success', () => {
                if (this.activityTimeline?.isMounted()) {
                    this.activityTimeline.setItems(() => this._buildActivityItems());
                }
            }, this);
            this._wired = true;
        }
    }

    _buildActivityItems() {
        const logs = this.logsCollection?.models || [];
        return logs.map(log => {
            const level = String(log.get('level') || '').toLowerCase();
            const tone  = LOG_LEVEL_TONE[level] || 'default';
            const headline = log.get('kind') || log.get('level') || 'event';
            // Timeline `detail` is trusted HTML — escape user-controlled values.
            const detailRaw = log.get('log');
            const detail = detailRaw ? this.escapeHtml(String(detailRaw)) : '';
            const when = dataFormatter.apply(log.get('created'), ['epoch', 'relative']);
            return { tone, headline: String(headline), detail, when };
        });
    }

    async onActionViewUser(event) {
        event?.preventDefault?.();
        this.emit('action:view-user');
    }

    async onActionViewGroup(event) {
        event?.preventDefault?.();
        this.emit('action:view-group');
    }
}


// ── Permissions section ────────────────────────────────────

class MemberPermissionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'member-permissions-section',
            template: `
                <div class="detail-section-eyebrow">Permissions</div>
                <p class="text-secondary small mb-3">Toggles autosave as soon as you flip them.</p>
                <div data-container="member-permissions-form"></div>
            `,
            ...options
        });
    }

    async onInit() {
        this.formView = new FormView({
            containerId: 'member-permissions-form',
            fields: Member.PERMISSION_FIELDS,
            model: this.model,
            autosaveModelField: true
        });
        this.addChild(this.formView);
    }
}


// ── MemberView (assembly) ──────────────────────────────────

class MemberView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new Member(options.data || {});
        const memberId = model.get('id');

        // Shared collection — Audit table + Overview "recent activity" both read from it.
        const logsCollection = new LogList({
            params: {
                size: 25,
                model_name: 'account.Member',
                model_id: memberId,
                sort: '-created'
            }
        });

        // Section views
        const overviewSection = new MemberOverviewSection({ model, logsCollection });
        const permissionsSection = new MemberPermissionsSection({ model });

        const auditSection = new TableView({
            collection: logsCollection,
            title: 'Audit',
            eyebrow: 'Section · Audit',
            showFullscreen: false,
            searchable: false,
            hideActivePillNames: ['model_name', 'model_id'],
            permissions: 'view_logs',
            tableOptions: { striped: false, hover: true },
            columns: [
                {
                    key: 'created', label: 'Timestamp', sortable: true,
                    formatter: 'epoch|datetime', width: '180px',
                    filter: {
                        name: 'created', type: 'daterange',
                        startName: 'dr_start', endName: 'dr_end',
                        fieldName: 'dr_field', label: 'Date Range',
                        format: 'YYYY-MM-DD', displayFormat: 'MMM DD, YYYY',
                        separator: ' to '
                    }
                },
                { key: 'level', label: 'Level', sortable: true, formatter: 'badge', width: '110px' },
                { key: 'kind',  label: 'Kind' },
                { key: 'log',   label: 'Log' }
            ]
        });

        const sections = [
            { key: 'Overview',    label: 'Overview',    icon: 'bi-grid-1x2',     view: overviewSection },
            { key: 'Permissions', label: 'Permissions', icon: 'bi-shield-lock',  view: permissionsSection },
            { type: 'divider', label: 'Activity' },
            { key: 'Audit', label: 'Audit', icon: 'bi-clock-history', view: auditSection, permissions: 'view_logs' }
        ];

        // Header chips — only render when value exists (the DetailHeaderView
        // automatically filters chips with `when:` callbacks)
        const chips = [
            {
                icon: 'bi-envelope',
                text: m => m.get('user')?.email || null,
                variant: 'light',
                when: m => !!m.get('user')?.email
            },
            {
                icon: 'bi-people',
                text: m => m.get('group')?.kind || null,
                variant: 'info',
                when: m => !!m.get('group')?.kind
            },
            {
                icon: 'bi-person-badge',
                text: m => m.get('metadata')?.role || null,
                variant: 'primary',
                when: m => !!m.get('metadata')?.role
            },
            {
                text: m => {
                    const n = countTruthy(m.get('permissions'));
                    return n > 0 ? `${n} ${n === 1 ? 'perm' : 'perms'} granted` : null;
                },
                variant: 'light',
                when: m => countTruthy(m.get('permissions')) > 0
            }
        ];

        super({
            className: 'member-view',
            ...options,
            model,
            header: {
                icon: 'bi-person-badge',
                titleFn: m => {
                    const userName = m.get('user')?.display_name || 'User';
                    const groupName = m.get('group')?.name || 'Group';
                    return `${userName} in ${groupName}`;
                },
                subtitlePath: '_subtitle',
                chips,
                activeField: 'is_active',
                actions: [
                    { label: 'Edit role', icon: 'bi-pencil', action: 'edit-role',
                      title: 'Edit role and membership details' },
                    { label: 'Remove', icon: 'bi-person-dash', action: 'remove-from-group',
                      title: 'Remove from group' }
                ],
                contextMenu: {
                    items: [
                        { label: 'View user',  action: 'view-user',  icon: 'bi-person' },
                        { label: 'View group', action: 'view-group', icon: 'bi-people' },
                        { label: 'Audit log',  action: 'view-audit', icon: 'bi-clock-history' },
                        { type: 'divider' },
                        { label: 'Remove from group', action: 'remove-from-group',
                          icon: 'bi-person-dash', danger: true }
                    ]
                }
            },
            sections,
            activeSection: 'Overview'
        });

        // Stash references for action handlers + cross-section wiring
        this.logsCollection = logsCollection;
        this.overviewSection = overviewSection;
        this.permissionsSection = permissionsSection;
        this.auditSection = auditSection;

        this._refreshComputedFields();
    }

    async onAfterBuild() {
        // Cross-section navigation requests from Overview's clickable user/group
        this.overviewSection.on('action:view-user',  () => this.onActionViewUser());
        this.overviewSection.on('action:view-group', () => this.onActionViewGroup());

        // Live sidebar badge update from the shared logs collection
        const updateAuditBadge = () => {
            const n = this.logsCollection.totalCount
                ?? this.logsCollection.models?.length
                ?? 0;
            this.setBadge('Audit', n > 0 ? { text: String(n), variant: 'muted' } : null);
        };
        this.logsCollection.on('fetch:success', updateAuditBadge, this);
        if (this.logsCollection.models?.length) updateAuditBadge();

        // Fire-and-forget initial fetch so Overview's activity timeline + the
        // sidebar badge populate before the user navigates to the Audit tab.
        this.logsCollection.fetch().catch(() => { /* fail silent */ });
    }

    /**
     * Compute the synthetic `_subtitle` field the header binds to.
     * Format: "{role} · joined {created|relative}"
     */
    _refreshComputedFields() {
        const m = this.model;
        const role = m.get('metadata')?.role || 'Member';
        const created = m.get('created');
        const parts = [role];
        if (created != null) {
            const rel = dataFormatter.apply(created, ['epoch', 'relative']);
            if (rel) parts.push(`joined ${rel}`);
        }
        m.attributes._subtitle = parts.join(' · ');
    }

    // ── Actions ────────────────────────────────────────────

    /** Header pencil — focused mini-form for the editable membership fields. */
    async onActionEditRole() {
        const resp = await Modal.modelForm({
            title: 'Edit membership',
            model: this.model,
            size: 'md',
            formConfig: MemberForms.edit
        });
        if (resp) {
            this._refreshComputedFields();
            if (this.headerView?.isMounted()) await this.headerView.render();
            if (this.overviewSection?.isMounted()) await this.overviewSection.render();
        }
    }

    async onActionViewUser() {
        const userId = this.model.get('user')?.id;
        if (!userId) return true;
        const ViewClass = User.VIEW_CLASS;
        if (ViewClass) {
            const user = new User({ id: userId });
            await user.fetch();
            if (!user.id) {
                Modal.alert({
                    message: `Could not find User with ID: ${userId}`,
                    type: 'warning'
                });
                return true;
            }
            const view = new ViewClass({ model: user });
            await Modal.detail(view);
        } else {
            // Fall back to the legacy showModelById path if no VIEW_CLASS is set.
            await Modal.showModelById(User, userId);
        }
        return true;
    }

    async onActionViewGroup() {
        const groupId = this.model.get('group')?.id;
        if (!groupId) return true;
        const ViewClass = Group.VIEW_CLASS;
        if (ViewClass) {
            const group = new Group({ id: groupId });
            await group.fetch();
            if (!group.id) {
                Modal.alert({
                    message: `Could not find Group with ID: ${groupId}`,
                    type: 'warning'
                });
                return true;
            }
            const view = new ViewClass({ model: group });
            await Modal.detail(view);
        } else {
            await Modal.showModelById(Group, groupId);
        }
        return true;
    }

    async onActionViewAudit() {
        await this.showSection('Audit');
    }

    async onActionRemoveFromGroup() {
        const userName = this.model.get('user')?.display_name || 'this user';
        const groupName = this.model.get('group')?.name || 'this group';
        const confirmed = await Modal.confirm(
            `Remove <strong>${this.escapeHtml(userName)}</strong> from <strong>${this.escapeHtml(groupName)}</strong>? This cannot be undone.`,
            'Remove from group'
        );
        if (!confirmed) return true;

        try {
            const resp = await this.model.destroy();
            if (resp && resp.success) {
                this.getApp()?.toast?.success('Member removed');
                this.emit('member:removed', { model: this.model });
                const dialog = this.element?.closest('.modal');
                if (dialog) {
                    const bsModal = window.bootstrap?.Modal?.getInstance(dialog);
                    if (bsModal) bsModal.hide();
                }
            } else {
                this.getApp()?.toast?.error('Failed to remove member');
            }
        } catch (err) {
            this.getApp()?.toast?.error(`Failed to remove member: ${err.message}`);
        }
        return true;
    }

    static create(options = {}) {
        return new MemberView(options);
    }
}

MemberView.VIEW_CLASS = MemberView;
Member.VIEW_CLASS = MemberView;
Member.MODEL_REF = 'account.Member';

export default MemberView;
