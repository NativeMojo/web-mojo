/**
 * MemberView - Group-membership detail view built on the DetailView primitive.
 *
 * Sections:
 *   Overview                — KPIs + "This membership" card + recent activity
 *   Permissions             — autosave switch grid (Member.PERMISSION_FIELDS)
 *   ──── Activity ────
 *   Audit                   — logs scoped to this membership
 *
 * Header title doubles as cross-record navigation: "{user} in {group}".
 * "View user" / "View group" actions open UserView / GroupView via Modal.detail.
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import TableView from '@core/views/table/TableView.js';
import FormView from '@core/forms/FormView.js';
import Modal from '@core/views/feedback/Modal.js';
import { Member, MemberForms } from '@core/models/Member.js';
import { User } from '@core/models/User.js';
import { Group } from '@core/models/Group.js';
import { LogList } from '@core/models/Log.js';


// ── Helpers ────────────────────────────────────────────────

function epochToMs(value) {
    if (value == null) return null;
    if (typeof value === 'number') return value < 1e11 ? value * 1000 : value;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
}

function formatRelative(value) {
    const ms = epochToMs(value);
    if (ms == null) return '';
    const diffSec = Math.round((Date.now() - ms) / 1000);
    if (diffSec < 60)    return 'just now';
    if (diffSec < 3600)  return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
}

function formatDate(value) {
    const ms = epochToMs(value);
    if (ms == null) return '—';
    return new Date(ms).toLocaleDateString();
}

function countTruthy(obj) {
    if (!obj || typeof obj !== 'object') return 0;
    return Object.values(obj).filter(v => v === true).length;
}


// ── Overview section ───────────────────────────────────────

class MemberOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'member-overview-section p-3',
            ...options
        });
        this.logsCollection = options.logsCollection || null;
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const user = m.get('user') || {};
        const group = m.get('group') || {};
        const role = m.get('metadata')?.role || '—';
        const isActive = !!m.get('is_active');
        const created = m.get('created');
        const permsCount = countTruthy(m.get('permissions'));
        const invitedBy = m.get('metadata')?.invited_by_name
            || m.get('metadata')?.invited_by
            || null;

        const joinedRel = created ? formatRelative(created) : '—';
        const joinedAbs = created ? formatDate(created) : '—';

        const statusTone = isActive ? 'success' : 'warning';
        const statusValue = isActive ? 'Active' : 'Inactive';

        return `
            <div class="detail-kpi-grid">
                <div class="metric-card">
                    <div class="metric-card-label">Role</div>
                    <div class="metric-card-value">${this.escapeHtml(role)}</div>
                </div>
                <div class="metric-card metric-card-tone-${statusTone}">
                    <div class="metric-card-label">Status</div>
                    <div class="metric-card-value">${this.escapeHtml(statusValue)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-card-label">Joined</div>
                    <div class="metric-card-value">${this.escapeHtml(joinedRel)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-card-label">Perms granted</div>
                    <div class="metric-card-value">${permsCount}</div>
                </div>
            </div>
            <div class="detail-pair">
                <div class="card">
                    <div class="card-body">
                        <div class="card-title"><i class="bi bi-link-45deg"></i>This membership</div>
                        <ul class="list-unstyled mb-0 small">
                            <li class="d-flex justify-content-between border-bottom border-opacity-25 py-1">
                                <span class="text-secondary">User</span>
                                <a href="#" data-action="view-user">${this.escapeHtml(user.display_name || '—')}</a>
                            </li>
                            <li class="d-flex justify-content-between border-bottom border-opacity-25 py-1">
                                <span class="text-secondary">Email</span>
                                <span>${this.escapeHtml(user.email || '—')}</span>
                            </li>
                            <li class="d-flex justify-content-between border-bottom border-opacity-25 py-1">
                                <span class="text-secondary">Group</span>
                                <a href="#" data-action="view-group">${this.escapeHtml(group.name || '—')}</a>
                            </li>
                            <li class="d-flex justify-content-between border-bottom border-opacity-25 py-1">
                                <span class="text-secondary">Role</span>
                                <span class="badge text-bg-primary">${this.escapeHtml(role)}</span>
                            </li>
                            <li class="d-flex justify-content-between border-bottom border-opacity-25 py-1">
                                <span class="text-secondary">Joined</span>
                                <code>${this.escapeHtml(joinedAbs)}${created ? ` · ${this.escapeHtml(joinedRel)}` : ''}</code>
                            </li>
                            <li class="d-flex justify-content-between py-1">
                                <span class="text-secondary">Invited by</span>
                                <span>${invitedBy ? this.escapeHtml(invitedBy) : '<span class="text-secondary">—</span>'}</span>
                            </li>
                        </ul>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div class="card-title"><i class="bi bi-list-ul"></i>Recent activity in this group</div>
                        <div data-container="member-overview-activity"></div>
                    </div>
                </div>
            </div>
        `;
    }

    async onAfterRender() {
        await super.onAfterRender();
        await this._renderActivity();
        // Refresh the activity card whenever the shared logs collection updates
        if (this.logsCollection && !this._wired) {
            this.logsCollection.on('fetch:success', () => this._renderActivity(), this);
            this._wired = true;
        }
    }

    _renderActivity() {
        const host = this.element?.querySelector('[data-container="member-overview-activity"]');
        if (!host) return;

        const logs = this.logsCollection?.models?.slice(0, 5) || [];
        if (!logs.length) {
            host.innerHTML = `<div class="text-secondary small">No recorded activity for this membership yet.</div>`;
            return;
        }

        const items = logs.map(log => {
            const level = (log.get('level') || '').toLowerCase();
            let tone = '';
            if (level === 'error' || level === 'critical') tone = 'danger';
            else if (level === 'warning' || level === 'warn') tone = 'warning';
            else if (level === 'info') tone = 'info';
            else if (level === 'debug') tone = '';

            const headline = log.get('kind') || log.get('level') || 'event';
            const detail = log.get('log') || '';
            const when = formatRelative(log.get('created'));

            return `
                <li class="detail-timeline-item${tone ? ` tone-${tone}` : ''}">
                    <div>
                        <div class="detail-timeline-headline">${this.escapeHtml(String(headline))}</div>
                        ${detail ? `<div class="detail-timeline-detail">${this.escapeHtml(String(detail))}</div>` : ''}
                    </div>
                    <span class="detail-timeline-when">${this.escapeHtml(when)}</span>
                </li>
            `;
        }).join('');

        host.innerHTML = `<ol class="detail-timeline">${items}</ol>`;
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
            className: 'member-permissions-section p-3',
            template: `
                <div class="section-eyebrow">Section · Permissions</div>
                <h3 class="section-title">Permissions</h3>
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

        // Shared collection — Audit table + Overview "recent activity" card both read from it.
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
        if (created) parts.push(`joined ${formatRelative(created)}`);
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
