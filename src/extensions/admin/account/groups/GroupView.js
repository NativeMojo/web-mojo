/**
 * GroupView - Access-group inspector built on the DetailView primitive.
 *
 * Header + side-nav layout matching RuleSetView / JobDetailsView. Sections:
 *   Overview · Identity · ──Membership── Members · Sub-Groups
 *   ──Access── API Keys · Permissions · ──Activity── Events · Audit
 *   ──Detail── Metadata
 *
 * Cross-record nav:
 *   - "View Parent" / parent link → opens GroupView for parent (Modal.detail)
 *   - Sub-Groups row click          → opens nested GroupView (Modal.detail)
 *   - Members row click             → opens MemberView via Modal.detail
 *
 * Open via `Modal.detail(new GroupView({ model }))` — pair with
 * `viewDialogOptions: { header: false, noBodyPadding: true,
 * buttons: [] }` when wired through TableView / TablePage. Inherits
 * `size: 'lg'` from `Modal.detail()`'s default.
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import TableView from '@core/views/table/TableView.js';
import Modal from '@core/views/feedback/Modal.js';
import { Group, GroupList, GroupForms } from '@core/models/Group.js';
import { MemberList } from '@core/models/Member.js';
import { ApiKeyList, ApiKeyForms } from '@core/models/ApiKey.js';
import { LogList } from '@core/models/Log.js';
import { IncidentEventList } from '@ext/admin/models/Incident.js';
import AdminMetadataSection from '../../shared/AdminMetadataSection.js';


// ── Helpers ────────────────────────────────────────────────

/**
 * Map a Group `kind` to a Bootstrap icon. Falls back to bi-people-fill.
 * Org/department/division get a building icon; team gets people; project
 * gets a kanban; etc.
 */
function iconForKind(kind) {
    const k = String(kind || '').toLowerCase();
    if (k === 'org' || k === 'organization')        return 'bi-buildings';
    if (k === 'division' || k === 'department')     return 'bi-buildings';
    if (k === 'region' || k === 'location')         return 'bi-geo-alt';
    if (k === 'project')                            return 'bi-kanban';
    if (k === 'merchant' || k === 'partner' || k === 'client' || k === 'reseller') return 'bi-shop';
    if (k === 'iso' || k === 'sales')               return 'bi-briefcase';
    if (k === 'route')                              return 'bi-signpost-2';
    if (k === 'inventory')                          return 'bi-box-seam';
    if (k === 'qa' || k === 'test' || k === 'testing') return 'bi-clipboard-check';
    if (k === 'team')                               return 'bi-people-fill';
    return 'bi-people-fill';
}

function kindLabel(kind) {
    if (!kind) return '';
    const fromMap = Group.GroupKinds?.[kind];
    if (fromMap) return fromMap;
    const s = String(kind);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatRelative(epoch) {
    if (!epoch) return '';
    let secs = Number(epoch);
    if (!Number.isFinite(secs)) return '';
    if (secs > 1e11) secs = Math.floor(secs / 1000); // ms → s
    const now = Math.floor(Date.now() / 1000);
    const delta = now - secs;
    if (delta < 0)       return 'just now';
    if (delta < 60)      return 'just now';
    if (delta < 3600)    return `${Math.floor(delta / 60)} min ago`;
    if (delta < 86400)   return `${Math.floor(delta / 3600)}h ago`;
    return `${Math.floor(delta / 86400)}d ago`;
}

function formatDate(epoch) {
    if (!epoch) return '—';
    let secs = Number(epoch);
    if (!Number.isFinite(secs)) return '—';
    if (secs > 1e11) secs = Math.floor(secs / 1000);
    return new Date(secs * 1000).toLocaleDateString();
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


// ── Overview section ───────────────────────────────────────

class GroupOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'group-overview-section p-3',
            ...options
        });

        this.membersCollection   = options.membersCollection;
        this.subGroupsCollection = options.subGroupsCollection;
        this.apiKeysCollection   = options.apiKeysCollection;

        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        return `
            <div class="detail-kpi-grid">
                <div data-container="group-kpi-members"></div>
                <div data-container="group-kpi-subgroups"></div>
                <div data-container="group-kpi-apikeys"></div>
                <div data-container="group-kpi-activity"></div>
            </div>
            <div class="detail-pair">
                <div data-container="group-overview-identity"></div>
                <div data-container="group-overview-hierarchy"></div>
            </div>
        `;
    }

    async onInit() {
        // KPI cards — minimal MetricCard-shaped Views (mirrors JobDetailsView)
        this.kpiMembers   = this._kpi('group-kpi-members',   'Members',     this._memberCount(),    'primary');
        this.kpiSubGroups = this._kpi('group-kpi-subgroups', 'Sub-groups',  this._subGroupCount());
        this.kpiApiKeys   = this._kpi('group-kpi-apikeys',   'API Keys',    this._apiKeyCount());
        this.kpiActivity  = this._kpi('group-kpi-activity',  'Last activity', this._lastActivityLabel());
        [this.kpiMembers, this.kpiSubGroups, this.kpiApiKeys, this.kpiActivity].forEach(c => this.addChild(c));

        // Identity + Hierarchy cards
        this.identityCard  = new GroupIdentityCard({ containerId: 'group-overview-identity', model: this.model });
        this.hierarchyCard = new GroupHierarchyCard({
            containerId: 'group-overview-hierarchy',
            model: this.model,
            subGroupsCollection: this.subGroupsCollection,
            membersCollection: this.membersCollection
        });
        this.addChild(this.identityCard);
        this.addChild(this.hierarchyCard);

        // Live updates from shared collections
        if (this.membersCollection) {
            this.membersCollection.on('fetch:success', () => this._refreshKpis(), this);
        }
        if (this.subGroupsCollection) {
            this.subGroupsCollection.on('fetch:success', () => this._refreshKpis(), this);
        }
        if (this.apiKeysCollection) {
            this.apiKeysCollection.on('fetch:success', () => this._refreshKpis(), this);
        }
    }

    _kpi(containerId, label, value, tone = null) {
        const v = new View({
            containerId,
            className: `metric-card metric-card-lg${tone ? ` metric-card-tone-${tone}` : ''}`,
            template: `
                <div class="metric-card-label">${escapeHtml(label)}</div>
                <div class="metric-card-value" data-kpi-value>${escapeHtml(String(value))}</div>
            `
        });
        return v;
    }

    _memberCount()   { return this.membersCollection?.models?.length ?? 0; }
    _subGroupCount() { return this.subGroupsCollection?.models?.length ?? 0; }
    _apiKeyCount()   { return this.apiKeysCollection?.models?.length ?? 0; }

    _lastActivityLabel() {
        const last = this.model.get('last_activity');
        if (!last) return '—';
        return formatRelative(last);
    }

    _refreshKpis() {
        this._setKpi(this.kpiMembers,   this._memberCount());
        this._setKpi(this.kpiSubGroups, this._subGroupCount());
        this._setKpi(this.kpiApiKeys,   this._apiKeyCount());
        this._setKpi(this.kpiActivity,  this._lastActivityLabel());
        // Hierarchy mini-tree pulls from sub-groups + members; re-render it
        if (this.hierarchyCard?.isMounted()) this.hierarchyCard.render().catch(() => {});
    }

    _setKpi(card, value) {
        const el = card?.element?.querySelector('[data-kpi-value]');
        if (el) el.textContent = String(value);
    }
}


// ── Identity card (Overview) ───────────────────────────────

class GroupIdentityCard extends View {
    constructor(options = {}) {
        super({ ...options });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const meta = m.get('metadata') || {};
        const parent = m.get('parent');
        const eod = meta.eod_hour;
        const eodLabel = eod === undefined || eod === null || eod === ''
            ? null
            : `${String(eod).padStart(2, '0')}:00`;

        const rows = [
            ['Name', escapeHtml(m.get('name') || '—')],
            ['Kind', `<span class="badge text-bg-primary">${escapeHtml(kindLabel(m.get('kind')))}</span>`],
            ['Parent', parent && parent.id
                ? `<a href="#" data-action="view-parent" data-id="${escapeHtml(parent.id)}">${escapeHtml(parent.name || `#${parent.id}`)}</a>`
                : '<span class="text-secondary">None — top-level</span>'],
        ];
        if (meta.timezone) rows.push(['Timezone', `<code>${escapeHtml(meta.timezone)}</code>`]);
        if (eodLabel)      rows.push(['EOD hour', escapeHtml(eodLabel)]);
        if (meta.domain)   rows.push(['Domain',  `<code>${escapeHtml(meta.domain)}</code>`]);
        if (meta.portal)   rows.push(['Portal',  `<a href="${escapeHtml(meta.portal)}" target="_blank" rel="noopener">${escapeHtml(meta.portal)}</a>`]);
        rows.push(['Created', `<code>${escapeHtml(formatDate(m.get('created')))}</code>`]);

        const rowsHtml = rows.map(([k, v], idx) => {
            const last = idx === rows.length - 1;
            const cls = last
                ? 'd-flex justify-content-between py-1'
                : 'd-flex justify-content-between border-bottom border-opacity-25 py-1';
            return `<li class="${cls}"><span class="text-secondary">${escapeHtml(k)}</span><span>${v}</span></li>`;
        }).join('');

        return `
            <div class="card">
                <div class="card-body">
                    <div class="card-title"><i class="bi bi-card-text"></i>Identity</div>
                    <ul class="list-unstyled mb-0 small">${rowsHtml}</ul>
                </div>
            </div>
        `;
    }
}


// ── Hierarchy mini-tree card (Overview) ────────────────────

class GroupHierarchyCard extends View {
    constructor(options = {}) {
        super({ ...options });
        this.subGroupsCollection = options.subGroupsCollection;
        this.membersCollection   = options.membersCollection;
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const parent = m.get('parent');
        const subGroups = this.subGroupsCollection?.models || [];
        const memberCount = this.membersCollection?.models?.length ?? 0;

        const parentLine = parent && parent.id
            ? `<a href="#" data-action="view-parent" data-id="${escapeHtml(parent.id)}" class="link-secondary">${escapeHtml(parent.name || `#${parent.id}`)}</a>`
            : `<span class="text-secondary">Top-level group</span>`;

        const thisLine = `└─ <strong class="text-body">${escapeHtml(m.get('name') || '—')}</strong> · ${memberCount} ${memberCount === 1 ? 'member' : 'members'} · ${subGroups.length} ${subGroups.length === 1 ? 'sub-group' : 'sub-groups'}`;

        const childLines = subGroups.length
            ? `<div class="ms-4 mt-1">${
                subGroups.map((g, i) => {
                    const branch = i === subGroups.length - 1 ? '└─' : '├─';
                    const id = g.get('id');
                    return `${branch} <a href="#" data-action="view-subgroup" data-id="${escapeHtml(id)}">${escapeHtml(g.get('name') || `#${id}`)}</a>`;
                }).join('<br>')
            }</div>`
            : '';

        return `
            <div class="card">
                <div class="card-body">
                    <div class="card-title"><i class="bi bi-diagram-3"></i>Hierarchy</div>
                    <div class="small font-monospace text-secondary mb-0" style="line-height: 1.7;">
                        ${parentLine}<br>
                        ${thisLine}
                        ${childLines}
                    </div>
                </div>
            </div>
        `;
    }

    /** Bubble cross-record clicks up to GroupView */
    async onActionViewParent(event, element) {
        event?.preventDefault?.();
        this.emit('navigate:parent', element?.dataset?.id);
    }
    async onActionViewSubgroup(event, element) {
        event?.preventDefault?.();
        this.emit('navigate:subgroup', element?.dataset?.id);
    }
}


// ── Identity section (full field-cards) ────────────────────

class GroupIdentitySection extends View {
    constructor(options = {}) {
        super({
            className: 'group-identity-section p-3',
            ...options
        });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const meta = m.get('metadata') || {};
        const parent = m.get('parent');

        const profileRows = [
            ['Name', escapeHtml(m.get('name') || '—')],
            ['Kind', `<span class="badge text-bg-primary">${escapeHtml(kindLabel(m.get('kind')))}</span>`],
            ['Status', m.get('is_active')
                ? '<span class="badge text-bg-success">Active</span>'
                : '<span class="badge text-bg-secondary">Inactive</span>'],
            ['ID', `<code>${escapeHtml(m.get('id'))}</code>`],
            ['Parent', parent && parent.id
                ? `<a href="#" data-action="view-parent" data-id="${escapeHtml(parent.id)}">${escapeHtml(parent.name || `#${parent.id}`)}</a>`
                : '<span class="text-secondary">None — top-level group</span>'],
        ];

        const settingsRows = [];
        if (meta.timezone)      settingsRows.push(['Timezone',     `<code>${escapeHtml(meta.timezone)}</code>`]);
        if (meta.eod_hour !== undefined && meta.eod_hour !== null && meta.eod_hour !== '') {
            settingsRows.push(['EOD hour', `${escapeHtml(String(meta.eod_hour).padStart(2, '0'))}:00`]);
        }
        if (meta.domain)        settingsRows.push(['Domain',       `<code>${escapeHtml(meta.domain)}</code>`]);
        if (meta.portal)        settingsRows.push(['Portal',       `<a href="${escapeHtml(meta.portal)}" target="_blank" rel="noopener">${escapeHtml(meta.portal)}</a>`]);
        if (meta.email_template) settingsRows.push(['Email template', `<code>${escapeHtml(meta.email_template)}</code>`]);
        if (!settingsRows.length) {
            settingsRows.push(['Settings', '<span class="text-secondary">No settings configured</span>']);
        }

        const datesRows = [
            ['Created',  `<code>${escapeHtml(formatDate(m.get('created')))}</code>`],
            ['Modified', `<code>${escapeHtml(formatDate(m.get('modified')))}</code>`]
        ];

        return `
            <div class="detail-field-card">
                <div class="detail-field-card-header"><h4><i class="bi bi-card-text me-2"></i>Profile</h4></div>
                <div class="detail-field-card-body">
                    ${profileRows.map(([k, v]) =>
                        `<div class="detail-field-row"><div class="detail-field-label">${escapeHtml(k)}</div><div class="detail-field-value">${v}</div></div>`
                    ).join('')}
                </div>
            </div>

            <div class="detail-field-card">
                <div class="detail-field-card-header"><h4><i class="bi bi-sliders me-2"></i>Settings</h4></div>
                <div class="detail-field-card-body">
                    ${settingsRows.map(([k, v]) =>
                        `<div class="detail-field-row"><div class="detail-field-label">${escapeHtml(k)}</div><div class="detail-field-value">${v}</div></div>`
                    ).join('')}
                </div>
            </div>

            <div class="detail-field-card">
                <div class="detail-field-card-header"><h4><i class="bi bi-calendar3 me-2"></i>Dates</h4></div>
                <div class="detail-field-card-body">
                    ${datesRows.map(([k, v]) =>
                        `<div class="detail-field-row"><div class="detail-field-label">${escapeHtml(k)}</div><div class="detail-field-value">${v}</div></div>`
                    ).join('')}
                </div>
            </div>
        `;
    }
}


// ── Permissions section ────────────────────────────────────

class GroupPermissionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'group-permissions-section p-3',
            ...options
        });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        // Group-scoped permissions are stored on the Group's metadata in
        // some deployments and on the model directly in others. Render a
        // simple list when present; otherwise show a clear placeholder.
        const meta = this.model.get('metadata') || {};
        const perms = meta.permissions || this.model.get('permissions') || null;

        if (!perms || (typeof perms === 'object' && !Object.keys(perms).length)) {
            return `
                <div class="text-center text-body-secondary py-4 border rounded">
                    <i class="bi bi-shield-lock fs-1 d-block mb-2"></i>
                    <p class="mb-0 small">No group-scoped permissions defined. Permissions on members and API keys
                    are managed from their own records.</p>
                </div>
            `;
        }

        const keys = Object.keys(perms).sort();
        const rows = keys.map(k => {
            const enabled = !!perms[k];
            return `
                <div class="detail-perm-row">
                    <div class="detail-perm-name">
                        <span class="detail-perm-key">${escapeHtml(k)}</span>
                    </div>
                    <div class="form-check form-switch m-0">
                        <input class="form-check-input" type="checkbox" disabled ${enabled ? 'checked' : ''} aria-label="${escapeHtml(k)}">
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="detail-perm-group">
                <div class="detail-perm-group-header"><h5><i class="bi bi-shield-lock me-2"></i>Group permissions</h5></div>
                ${rows}
            </div>
        `;
    }
}


// ── GroupView (assembly) ───────────────────────────────────

class GroupView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new Group(options.data || {});
        const groupId = model.get('id');

        // Shared collections — KPIs, sidebar badges, and section tables
        // all read from the same instances so a single fetch populates
        // every consumer.
        const membersCollection = new MemberList({
            params: { group: groupId, size: 10 }
        });
        const subGroupsCollection = new GroupList({
            params: { parent: groupId, size: 10 }
        });
        const apiKeysCollection = new ApiKeyList({
            params: { group: groupId, size: 10 }
        });
        const eventsCollection = new IncidentEventList({
            params: { size: 10, model_name: 'account.Group', model_id: groupId, sort: '-created' }
        });
        const auditCollection = new LogList({
            params: { size: 10, model_name: 'account.Group', model_id: groupId, sort: '-created' }
        });

        // ── Section view instances ─────────────────────────
        const overviewSection   = new GroupOverviewSection({
            model,
            membersCollection,
            subGroupsCollection,
            apiKeysCollection
        });
        const identitySection   = new GroupIdentitySection({ model });

        // Members table — click opens MemberView via the registered VIEW_CLASS
        const membersSection = new TableView({
            collection: membersCollection,
            title: 'Members',
            eyebrow: 'Section · Members',
            showFullscreen: false,
            searchable: false,
            hideActivePillNames: ['group'],
            showAdd: true,
            addButtonLabel: 'Invite',
            clickAction: 'view',
            viewDialogOptions: { header: false, noBodyPadding: true, buttons: [] },
            columns: [
                { key: 'user.display_name', label: 'User', sortable: true },
                { key: 'user.email', label: 'Email', sortable: true },
                { key: 'permissions|keys|badge', label: 'Permissions' },
                { key: 'created', label: 'Joined', formatter: 'date', sortable: true }
            ]
        });

        // Sub-groups — click opens nested GroupView (forward-reference resolves at runtime)
        const subGroupsSection = new TableView({
            collection: subGroupsCollection,
            title: 'Sub-Groups',
            eyebrow: 'Section · Sub-Groups',
            showFullscreen: false,
            searchable: false,
            hideActivePillNames: ['parent'],
            showAdd: true,
            addButtonLabel: 'Add Group',
            clickAction: 'view',
            itemView: GroupView,
            viewDialogOptions: { header: false, noBodyPadding: true, buttons: [] },
            columns: [
                { key: 'name', label: 'Name', sortable: true },
                { key: 'kind', label: 'Kind', formatter: 'badge' },
                {
                    key: 'is_active', label: 'Status', width: '80px',
                    template: `
                        {{#model.is_active|bool}}<span class="badge text-bg-success">Active</span>{{/model.is_active|bool}}
                        {{^model.is_active|bool}}<span class="badge text-bg-secondary">Inactive</span>{{/model.is_active|bool}}`
                },
                { key: 'created', label: 'Created', formatter: 'date', sortable: true }
            ]
        });

        const apiKeysSection = new TableView({
            collection: apiKeysCollection,
            title: 'API Keys',
            eyebrow: 'Section · API Keys',
            showFullscreen: false,
            searchable: false,
            hideActivePillNames: ['group'],
            showAdd: true,
            addButtonLabel: 'Create Key',
            clickAction: 'view',
            viewDialogOptions: { header: false, noBodyPadding: true, buttons: [] },
            addFormConfig: {
                ...ApiKeyForms.create,
                defaults: { group: groupId }
            },
            columns: [
                { key: 'name', label: 'Name', sortable: true },
                {
                    key: 'is_active', label: 'Status', width: '80px',
                    template: `
                        {{#model.is_active|bool}}<span class="badge text-bg-success">Active</span>{{/model.is_active|bool}}
                        {{^model.is_active|bool}}<span class="badge text-bg-secondary">Inactive</span>{{/model.is_active|bool}}`
                },
                { key: 'permissions|keys|badge', label: 'Permissions' },
                { key: 'created', label: 'Created', formatter: 'datetime', sortable: true }
            ]
        });

        const permissionsSection = new GroupPermissionsSection({ model });

        const eventsSection = new TableView({
            collection: eventsCollection,
            title: 'Events',
            eyebrow: 'Section · Events',
            showFullscreen: false,
            searchable: false,
            hideActivePillNames: ['model_name', 'model_id'],
            columns: [
                { key: 'created', label: 'Date', formatter: 'datetime', sortable: true, width: '160px' },
                { key: 'category|badge', label: 'Category' },
                { key: 'title', label: 'Title' }
            ]
        });

        const auditSection = new TableView({
            collection: auditCollection,
            title: 'Audit',
            eyebrow: 'Section · Audit',
            showFullscreen: false,
            searchable: false,
            hideActivePillNames: ['model_name', 'model_id'],
            permissions: 'view_logs',
            columns: [
                { key: 'created', label: 'Timestamp', sortable: true, formatter: 'epoch|datetime', width: '180px' },
                {
                    key: 'level', label: 'Level', width: '100px',
                    filter: { type: 'select', options: [
                        { value: 'info', label: 'Info' },
                        { value: 'warning', label: 'Warning' },
                        { value: 'error', label: 'Error' }
                    ] }
                },
                { key: 'kind', label: 'Kind' },
                { key: 'log', label: 'Log' }
            ]
        });

        const metadataSection = new AdminMetadataSection({ model });

        // ── Sidebar layout ─────────────────────────────────
        const sections = [
            { key: 'Overview',    label: 'Overview',    icon: 'bi-grid-1x2',       view: overviewSection },
            { key: 'Identity',    label: 'Identity',    icon: 'bi-card-text',      view: identitySection },
            { type: 'divider', label: 'Membership' },
            { key: 'Members',     label: 'Members',     icon: 'bi-people',         view: membersSection },
            { key: 'SubGroups',   label: 'Sub-Groups',  icon: 'bi-diagram-3',      view: subGroupsSection },
            { type: 'divider', label: 'Access' },
            { key: 'ApiKeys',     label: 'API Keys',    icon: 'bi-key',            view: apiKeysSection },
            { key: 'Permissions', label: 'Permissions', icon: 'bi-shield-lock',    view: permissionsSection },
            { type: 'divider', label: 'Activity' },
            { key: 'Events',      label: 'Events',      icon: 'bi-calendar-event', view: eventsSection },
            { key: 'Audit',       label: 'Audit',       icon: 'bi-clock-history',  view: auditSection, permissions: 'view_logs' },
            { type: 'divider', label: 'Detail' },
            { key: 'Metadata',    label: 'Metadata',    icon: 'bi-braces',         view: metadataSection }
        ];

        // ── Header config ──────────────────────────────────
        const kind = model.get('kind');
        const headerIcon = iconForKind(kind);

        const chips = [
            { text: m => kindLabel(m.get('kind')) || null, variant: 'primary',
              when: m => !!m.get('kind') },
            { icon: 'bi-people',
              text: m => {
                  const n = membersCollection.models?.length ?? 0;
                  return n ? `${n} ${n === 1 ? 'member' : 'members'}` : null;
              },
              variant: 'light',
              when: () => (membersCollection.models?.length ?? 0) > 0 },
            { icon: 'bi-diagram-3',
              text: m => {
                  const n = subGroupsCollection.models?.length ?? 0;
                  return n ? `${n} ${n === 1 ? 'sub-group' : 'sub-groups'}` : null;
              },
              variant: 'light',
              when: () => (subGroupsCollection.models?.length ?? 0) > 0 },
            { text: m => m.get('metadata')?.timezone || null, variant: 'light',
              when: m => !!m.get('metadata')?.timezone },
            { text: m => {
                  const eod = m.get('metadata')?.eod_hour;
                  if (eod === undefined || eod === null || eod === '') return null;
                  return `EOD ${String(eod).padStart(2, '0')}:00`;
              }, variant: 'light' },
            { icon: 'bi-globe', text: 'Has portal', variant: 'light',
              when: m => !!m.get('metadata')?.portal }
        ];

        const contextItems = [
            { label: 'Edit Group',     action: 'edit-group',       icon: 'bi-pencil' },
            { label: 'Add Sub-Group',  action: 'add-child-group',  icon: 'bi-diagram-3' }
        ];
        if (model.get('parent')?.id) {
            contextItems.push({ label: 'View Parent', action: 'view-parent-menu', icon: 'bi-arrow-up-right-square' });
        }
        contextItems.push({ type: 'divider' });
        contextItems.push(model.get('is_active')
            ? { label: 'Deactivate Group', action: 'state-toggle', icon: 'bi-toggle-off' }
            : { label: 'Activate Group',   action: 'state-toggle', icon: 'bi-toggle-on' });
        contextItems.push({ type: 'divider' });
        contextItems.push({ label: 'Delete Group', action: 'delete-group', icon: 'bi-trash', danger: true });

        super({
            className: 'group-view',
            ...options,
            model,
            header: {
                icon: headerIcon,
                titleField: 'name',
                subtitlePath: '_subtitle',
                subtitlePlaceholder: kindLabel(kind) || 'Group',
                chips,
                activeField: 'is_active',
                actions: [
                    { label: 'Invite', icon: 'bi-person-plus', action: 'invite-member', title: 'Invite member' },
                    { label: 'Edit',   icon: 'bi-pencil',      action: 'edit-group',    title: 'Edit group' }
                ],
                contextMenu: { items: contextItems }
            },
            sections,
            activeSection: 'Overview'
        });

        // Stash references
        this.membersCollection   = membersCollection;
        this.subGroupsCollection = subGroupsCollection;
        this.apiKeysCollection   = apiKeysCollection;
        this.eventsCollection    = eventsCollection;
        this.auditCollection     = auditCollection;

        this.overviewSection    = overviewSection;
        this.identitySection    = identitySection;
        this.membersSection     = membersSection;
        this.subGroupsSection   = subGroupsSection;
        this.apiKeysSection     = apiKeysSection;
        this.permissionsSection = permissionsSection;
        this.eventsSection      = eventsSection;
        this.auditSection       = auditSection;
        this.metadataSection    = metadataSection;

        this._refreshComputedFields();
    }

    async onAfterBuild() {
        // Cross-section navigation from Overview's Hierarchy card
        this.overviewSection.on('navigate:parent',   (id) => this._openGroupById(id));
        this.overviewSection.on('navigate:subgroup', (id) => this._openGroupById(id));

        // Sidebar badges populated from shared collections
        const updateMembersBadge = () => {
            const n = this.membersCollection.models?.length ?? 0;
            this.setBadge('Members', n > 0 ? { text: String(n), variant: 'muted' } : null);
        };
        const updateSubGroupsBadge = () => {
            const n = this.subGroupsCollection.models?.length ?? 0;
            this.setBadge('SubGroups', n > 0 ? { text: String(n), variant: 'muted' } : null);
        };
        const updateApiKeysBadge = () => {
            const n = this.apiKeysCollection.models?.length ?? 0;
            this.setBadge('ApiKeys', n > 0 ? { text: String(n), variant: 'muted' } : null);
        };
        const updateAuditBadge = () => {
            const n = this.auditCollection.models?.length ?? 0;
            this.setBadge('Audit', n > 0 ? { text: String(n), variant: 'muted' } : null);
        };

        this.membersCollection.on('fetch:success',   updateMembersBadge,   this);
        this.subGroupsCollection.on('fetch:success', updateSubGroupsBadge, this);
        this.apiKeysCollection.on('fetch:success',   updateApiKeysBadge,   this);
        this.auditCollection.on('fetch:success',     updateAuditBadge,     this);

        // Re-render the header so chips reflect populated collections
        const refreshHeader = () => {
            if (this.headerView?.isMounted()) this.headerView.render().catch(() => {});
            this._refreshComputedFields();
        };
        this.membersCollection.on('fetch:success',   refreshHeader, this);
        this.subGroupsCollection.on('fetch:success', refreshHeader, this);

        // Fire-and-forget initial fetches so badges/KPIs/chips populate
        // without waiting for the user to navigate.
        this.membersCollection.fetch().catch(()   => {});
        this.subGroupsCollection.fetch().catch(() => {});
        this.apiKeysCollection.fetch().catch(()   => {});
        this.eventsCollection.fetch().catch(()    => {});
        this.auditCollection.fetch().catch(()     => {});
    }

    /**
     * Compute the synthetic `_subtitle` field the header binds to via
     * subtitlePath. Shows the parent breadcrumb (or kind fallback).
     */
    _refreshComputedFields() {
        const m = this.model;
        const parent = m.get('parent');
        const kind = kindLabel(m.get('kind'));
        let subtitle;
        if (parent && parent.name) {
            subtitle = `${parent.name} · ${kind || m.get('name') || ''}`.trim();
        } else if (kind) {
            subtitle = kind;
        } else {
            subtitle = '';
        }
        m.attributes._subtitle = subtitle;
    }

    // ── Action handlers ────────────────────────────────────

    async onActionEditGroup() {
        const resp = await Modal.modelForm({
            title: `Edit Group — ${this.model.get('name')}`,
            model: this.model,
            size: 'lg',
            formConfig: GroupForms.detailed
        });
        if (resp) {
            await this._fullRefresh();
        }
        return true;
    }

    async onActionInviteMember(event) {
        if (event?.preventDefault) {
            event.preventDefault();
            event.stopPropagation();
        }
        const data = await Modal.form({
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
            // Refresh the members table if visible
            await this.membersCollection.fetch();
        } else {
            app.toast.error(resp.message || 'Failed to invite user');
        }
        return true;
    }

    async onActionAddChildGroup() {
        const data = await Modal.form({
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
            await this.subGroupsCollection.fetch();
        } else {
            this.getApp()?.toast?.error(resp.message || 'Failed to create sub-group');
        }
        return true;
    }

    /** Sidebar context-menu "View Parent" entry */
    async onActionViewParentMenu() {
        const parent = this.model.get('parent');
        if (!parent?.id) return true;
        await this._openGroupById(parent.id);
        return true;
    }

    /** Hierarchy card link on Identity card / Overview */
    async onActionViewParent(event, element) {
        event?.preventDefault?.();
        const id = element?.dataset?.id;
        if (!id) return true;
        await this._openGroupById(id);
        return true;
    }

    /** Sub-group link in the Hierarchy card (Overview) */
    async onActionViewSubgroup(event, element) {
        event?.preventDefault?.();
        const id = element?.dataset?.id;
        if (!id) return true;
        await this._openGroupById(id);
        return true;
    }

    async _openGroupById(id) {
        if (!id) return;
        const target = new Group({ id });
        try {
            await target.fetch();
        } catch {
            // fall through and let the view handle the empty model
        }
        if (!target.id) {
            this.getApp()?.toast?.error('Group not found');
            return;
        }
        await Modal.detail(new GroupView({ model: target }));
    }

    /** Active toggle from the context menu */
    async onActionStateToggle() {
        const toActive = !this.model.get('is_active');
        const verb = toActive ? 'activate' : 'deactivate';
        const Verb = toActive ? 'Activate' : 'Deactivate';
        const confirmed = await Modal.confirm(
            `Are you sure you want to ${verb} <strong>${this.escapeHtml(this.model.get('name') || '')}</strong>?`,
            `${Verb} Group`
        );
        if (!confirmed) return true;

        try {
            const resp = await this.model.save({ is_active: toActive });
            if (resp && resp.status && resp.status >= 400) throw new Error('Save failed');
            this.getApp()?.toast?.success(`Group ${toActive ? 'activated' : 'deactivated'}`);
            await this._fullRefresh();
        } catch (err) {
            this.getApp()?.toast?.error(`Failed to ${verb}: ${err.message}`);
        }
        return true;
    }

    async onActionDeleteGroup() {
        const confirmed = await Modal.confirm({
            title: 'Delete Group',
            message: `Are you sure you want to delete <strong>${this.escapeHtml(this.model.get('name') || '')}</strong>? This cannot be undone.`,
            confirmText: 'Delete',
            confirmClass: 'btn-danger'
        });
        if (!confirmed) return true;

        try {
            await this.model.destroy();
            this.getApp()?.toast?.success('Group deleted');
            const dialog = this.element?.closest('.modal');
            if (dialog) {
                const bsModal = window.bootstrap?.Modal?.getInstance(dialog);
                if (bsModal) bsModal.hide();
            }
            this.emit('group:deleted', { model: this.model });
        } catch (err) {
            this.getApp()?.toast?.error(`Failed to delete: ${err.message}`);
        }
        return true;
    }

    /**
     * Re-render the parts of the view that depend on model fields after a
     * save (header chips, identity card, identity section, overview).
     */
    async _fullRefresh() {
        this._refreshComputedFields();
        if (this.headerView?.isMounted())       await this.headerView.render();
        if (this.overviewSection?.isMounted())  await this.overviewSection.render();
        if (this.identitySection?.isMounted())  await this.identitySection.render();
    }
}

GroupView.VIEW_CLASS = GroupView;
Group.VIEW_CLASS = GroupView;
Group.MODEL_REF = 'account.Group';

export default GroupView;
