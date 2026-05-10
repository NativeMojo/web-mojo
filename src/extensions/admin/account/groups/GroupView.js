/**
 * GroupView - Access-group inspector built on the DetailView primitive.
 *
 * Header + side-nav layout matching JobDetailsView (Wave 2 canonical).
 * Sections:
 *   Overview · Identity · ──Membership── Members · Sub-Groups
 *   ──Access── API Keys · Permissions · ──Activity── Events · Audit
 *   ──Detail── Metadata
 *
 * Overview leads with 4 KPIs (Members / Sub-Groups / API Keys / Last
 * activity), then "This group" flat-rows, a small DOM-only Hierarchy
 * mini-tree, and a Timeline of recent group activity.
 *
 * Cross-record nav:
 *   - Hierarchy parent / sub-group link → opens GroupView for target
 *     (Modal.detail)
 *   - Members row click   → opens MemberView via Modal.detail
 *   - Sub-Groups row click → opens nested GroupView (Modal.detail)
 *
 * Open via `Modal.detail(new GroupView({ model }))` — pair with
 * `viewDialogOptions: { header: false, noBodyPadding: true,
 * buttons: [] }` when wired through TableView / TablePage. Inherits
 * `size: 'lg'` from `Modal.detail()`'s default.
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import TableView from '@core/views/table/TableView.js';
import MetricCard from '@core/views/data/MetricCard.js';
import Timeline from '@core/views/data/Timeline.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import dataFormatter from '@core/utils/DataFormatter.js';
import { Group, GroupList, GroupForms } from '@core/models/Group.js';
import { MemberList } from '@core/models/Member.js';
import { ApiKeyList, ApiKeyForms } from '@core/models/ApiKey.js';
import { LogList } from '@core/models/Log.js';
import { IncidentEventList } from '@ext/admin/models/Incident.js';
import AdminMetadataSection from '../../shared/AdminMetadataSection.js';

const escapeHtml = MOJOUtils.escapeHtml;


// ── Helpers ────────────────────────────────────────────────

/**
 * Map a Group `kind` to a Bootstrap icon. Falls back to bi-people-fill.
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

// Audit log → Timeline tone mapping (mirrors MemberView).
const LOG_LEVEL_TONE = {
    error:    'danger',
    critical: 'danger',
    warning:  'warning',
    warn:     'warning',
    info:     'info'
};


// ── Overview section ───────────────────────────────────────

class GroupOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'group-overview-section',
            template: `
                <div class="detail-kpi-grid">
                    <div data-container="group-kpi-members"></div>
                    <div data-container="group-kpi-subgroups"></div>
                    <div data-container="group-kpi-apikeys"></div>
                    <div data-container="group-kpi-activity"></div>
                </div>

                <div class="detail-section-eyebrow">This group</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Name</div>
                    <div class="detail-flat-row-value">{{model.name|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Status</div>
                    <div class="detail-flat-row-value">
                        {{#model.is_active|bool}}<span class="badge text-bg-success">Active</span>{{/model.is_active|bool}}
                        {{^model.is_active|bool}}<span class="badge text-bg-secondary">Inactive</span>{{/model.is_active|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Parent</div>
                    <div class="detail-flat-row-value">
                        {{#hasParent|bool}}<a href="#" data-action="view-parent">{{parentName}}</a>{{/hasParent|bool}}
                        {{^hasParent|bool}}<span class="text-secondary fst-italic">None — top-level group</span>{{/hasParent|bool}}
                    </div>
                </div>

                <div class="detail-section-eyebrow">Hierarchy</div>
                <div data-container="group-overview-hierarchy"></div>

                <div class="detail-section-eyebrow">Recent activity</div>
                <div data-container="group-overview-activity"></div>
            `,
            ...options
        });

        this.membersCollection   = options.membersCollection || null;
        this.subGroupsCollection = options.subGroupsCollection || null;
        this.apiKeysCollection   = options.apiKeysCollection || null;
        this.auditCollection     = options.auditCollection || null;
    }

    // ── Computed properties bound by Mustache ─────────

    get hasKind()     { return !!this.model?.get?.('kind'); }
    get kindLabel()   { return kindLabel(this.model?.get?.('kind')); }
    get hasParent()   { return !!this.model?.get?.('parent')?.id; }
    get parentName()  {
        const parent = this.model?.get?.('parent');
        if (!parent?.id) return '';
        return parent.name || `#${parent.id}`;
    }

    async onInit() {
        const m = this.model;

        // Four KPI cards (default size — no metric-card-lg).
        this.kpiMembers = new MetricCard({
            containerId: 'group-kpi-members',
            label: 'Members',
            value: this._memberCount()
        });
        this.kpiSubGroups = new MetricCard({
            containerId: 'group-kpi-subgroups',
            label: 'Sub-Groups',
            value: this._subGroupCount()
        });
        this.kpiApiKeys = new MetricCard({
            containerId: 'group-kpi-apikeys',
            label: 'API Keys',
            value: this._apiKeyCount()
        });
        this.kpiActivity = new MetricCard({
            containerId: 'group-kpi-activity',
            label: 'Last activity',
            value: this._lastActivityLabel()
        });
        [this.kpiMembers, this.kpiSubGroups, this.kpiApiKeys, this.kpiActivity]
            .forEach(c => this.addChild(c));

        // Hierarchy mini-tree — small DOM-only render, refreshes on collection updates.
        this.hierarchyTree = new GroupHierarchyTree({
            containerId: 'group-overview-hierarchy',
            model: m,
            subGroupsCollection: this.subGroupsCollection,
            membersCollection: this.membersCollection
        });
        this.addChild(this.hierarchyTree);

        // Recent activity timeline — fed by the shared audit collection.
        this.activityTimeline = new Timeline({
            containerId: 'group-overview-activity',
            limit: 5,
            emptyText: 'No recorded activity for this group yet.',
            items: () => this._buildActivityItems()
        });
        this.addChild(this.activityTimeline);

        // Live updates from shared collections — refresh KPIs / hierarchy / timeline
        // without rebuilding the whole section.
        this._wireCollection(this.membersCollection,   () => this._refreshAfterFetch());
        this._wireCollection(this.subGroupsCollection, () => this._refreshAfterFetch());
        this._wireCollection(this.apiKeysCollection,   () => this._refreshAfterFetch());
        this._wireCollection(this.auditCollection,     () => this._refreshActivity());
    }

    _wireCollection(collection, handler) {
        if (!collection || collection._groupOverviewWired) return;
        collection.on('fetch:success', handler, this);
        collection._groupOverviewWired = true;
    }

    _memberCount()   { return this.membersCollection?.models?.length ?? 0; }
    _subGroupCount() { return this.subGroupsCollection?.models?.length ?? 0; }
    _apiKeyCount()   { return this.apiKeysCollection?.models?.length ?? 0; }

    _lastActivityLabel() {
        const last = this.model.get('last_activity');
        if (!last) return '—';
        const rel = dataFormatter.apply(last, ['epoch', 'relative']);
        return rel || '—';
    }

    _refreshAfterFetch() {
        this.kpiMembers?.setValue(this._memberCount());
        this.kpiSubGroups?.setValue(this._subGroupCount());
        this.kpiApiKeys?.setValue(this._apiKeyCount());
        this.kpiActivity?.setValue(this._lastActivityLabel());
        if (this.hierarchyTree?.isMounted()) this.hierarchyTree.render().catch(() => {});
    }

    _refreshActivity() {
        if (this.activityTimeline?.isMounted()) {
            this.activityTimeline.setItems(() => this._buildActivityItems());
        }
    }

    /**
     * Build Timeline items from the shared audit (`LogList`) collection.
     * `detail` is trusted HTML — escape user-controlled values.
     */
    _buildActivityItems() {
        const logs = this.auditCollection?.models || [];
        return logs.map(log => {
            const level = String(log.get('level') || '').toLowerCase();
            const tone  = LOG_LEVEL_TONE[level] || 'default';
            const headline = log.get('kind') || log.get('level') || 'event';
            const detailRaw = log.get('log');
            const detail = detailRaw ? escapeHtml(String(detailRaw)) : '';
            const when = dataFormatter.apply(log.get('created'), ['epoch', 'relative']) || '';
            return { tone, headline: String(headline), detail, when };
        });
    }

    // Bubble parent-link click on the "This group" row up to GroupView.
    async onActionViewParent(event) {
        event?.preventDefault?.();
        this.emit('navigate:parent');
    }
}


// ── Hierarchy mini-tree (Overview) ─────────────────────────

/**
 * Small DOM-only hierarchy renderer. No card wrapper — sits flat under
 * the "Hierarchy" eyebrow. Emits `navigate:parent` / `navigate:subgroup`
 * with the target id so the parent GroupView opens a nested Modal.detail.
 *
 * Mustache template binds parent + self + child rows. The trusted-HTML
 * `selfLine` / `childLines` getters escape every caller-controlled
 * field (sub-group names / ids) before interpolation; the decorative
 * └─ / ├─ ASCII chars survive auto-escape via `{{{ }}}`.
 */
class GroupHierarchyTree extends View {
    constructor(options = {}) {
        super({
            className: 'group-hierarchy-tree small font-monospace',
            template: `
                <div class="group-hierarchy-tree-rows">
                    {{#hasParent|bool}}
                    <a href="#" data-action="view-parent" data-id="{{parentId}}" class="link-secondary">{{parentName}}</a><br>
                    {{/hasParent|bool}}
                    {{^hasParent|bool}}
                    <span class="text-secondary">Top-level group</span><br>
                    {{/hasParent|bool}}
                    {{{selfLine}}}
                    {{#hasSubGroups|bool}}
                    <div class="ms-4 mt-1">{{{childLines}}}</div>
                    {{/hasSubGroups|bool}}
                </div>
            `,
            ...options
        });
        this.subGroupsCollection = options.subGroupsCollection || null;
        this.membersCollection   = options.membersCollection || null;
    }

    // ── Computed properties bound by Mustache ─────────

    get _parent() { return this.model?.get?.('parent') || null; }
    get hasParent() { return !!this._parent?.id; }
    get parentId() { return this._parent?.id ? String(this._parent.id) : ''; }
    get parentName() {
        if (!this._parent?.id) return '';
        return this._parent.name || `#${this._parent.id}`;
    }
    get _subGroups() { return this.subGroupsCollection?.models || []; }
    get hasSubGroups() { return this._subGroups.length > 0; }
    get _memberCount() { return this.membersCollection?.models?.length ?? 0; }

    /**
     * Trusted HTML — emitted via `{{{selfLine}}}` so the decorative ASCII
     * rule chars survive. Caller-controlled fields escaped here.
     */
    get selfLine() {
        const m = this.model;
        const subs = this._subGroups.length;
        const members = this._memberCount;
        const memberWord = members === 1 ? 'member' : 'members';
        const subWord    = subs === 1 ? 'sub-group' : 'sub-groups';
        return `└─ <strong class="text-body">${escapeHtml(m.get('name') || '—')}</strong> · ${members} ${memberWord} · ${subs} ${subWord}`;
    }

    /**
     * Trusted HTML — emitted via `{{{childLines}}}`. Each sub-group name
     * and id is escaped before interpolation.
     */
    get childLines() {
        const subs = this._subGroups;
        return subs.map((g, i) => {
            const branch = i === subs.length - 1 ? '└─' : '├─';
            const id = g.get('id');
            return `${branch} <a href="#" data-action="view-subgroup" data-id="${escapeHtml(String(id))}">${escapeHtml(g.get('name') || `#${id}`)}</a>`;
        }).join('<br>');
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


// ── Identity section (full flat-row layout) ────────────────

class GroupIdentitySection extends View {
    constructor(options = {}) {
        super({
            className: 'group-identity-section',
            template: `
                <div class="detail-section-eyebrow">Profile</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Name</div>
                    <div class="detail-flat-row-value">{{model.name|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Kind</div>
                    <div class="detail-flat-row-value">
                        {{#hasKind|bool}}<span class="badge text-bg-primary">{{kindLabel}}</span>{{/hasKind|bool}}
                        {{^hasKind|bool}}<span class="text-secondary fst-italic">—</span>{{/hasKind|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Status</div>
                    <div class="detail-flat-row-value">
                        {{#model.is_active|bool}}<span class="badge text-bg-success">Active</span>{{/model.is_active|bool}}
                        {{^model.is_active|bool}}<span class="badge text-bg-secondary">Inactive</span>{{/model.is_active|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">ID</div>
                    <div class="detail-flat-row-value"><code>{{model.id}}</code></div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Parent</div>
                    <div class="detail-flat-row-value">
                        {{#hasParent|bool}}<a href="#" data-action="view-parent">{{parentName}}</a>{{/hasParent|bool}}
                        {{^hasParent|bool}}<span class="text-secondary fst-italic">None — top-level group</span>{{/hasParent|bool}}
                    </div>
                </div>

                <div class="detail-section-eyebrow">Settings</div>
                {{#hasTimezone|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Timezone</div>
                    <div class="detail-flat-row-value"><code>{{timezone}}</code></div>
                </div>
                {{/hasTimezone|bool}}
                {{#hasEodHour|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">EOD hour</div>
                    <div class="detail-flat-row-value">{{eodHourLabel}}</div>
                </div>
                {{/hasEodHour|bool}}
                {{#hasDomain|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Domain</div>
                    <div class="detail-flat-row-value"><code>{{domain}}</code></div>
                </div>
                {{/hasDomain|bool}}
                {{#hasPortal|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Portal</div>
                    <div class="detail-flat-row-value">
                        <a href="{{portal}}" target="_blank" rel="noopener">{{portal}}</a>
                    </div>
                </div>
                {{/hasPortal|bool}}
                {{#hasEmailTemplate|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Email template</div>
                    <div class="detail-flat-row-value"><code>{{emailTemplate}}</code></div>
                </div>
                {{/hasEmailTemplate|bool}}
                {{^hasAnySettings|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Settings</div>
                    <div class="detail-flat-row-value text-secondary fst-italic">No settings configured</div>
                </div>
                {{/hasAnySettings|bool}}

                <div class="detail-section-eyebrow">Dates</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Created</div>
                    <div class="detail-flat-row-value">
                        {{#hasCreated|bool}}<code>{{model.created|epoch|datetime}}</code>{{/hasCreated|bool}}
                        {{^hasCreated|bool}}<span class="text-secondary fst-italic">—</span>{{/hasCreated|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Modified</div>
                    <div class="detail-flat-row-value">
                        {{#hasModified|bool}}<code>{{model.modified|epoch|datetime}}</code>{{/hasModified|bool}}
                        {{^hasModified|bool}}<span class="text-secondary fst-italic">—</span>{{/hasModified|bool}}
                    </div>
                </div>
            `,
            ...options
        });
    }

    // ── Computed properties bound by Mustache ─────────

    get hasKind()      { return !!this.model?.get?.('kind'); }
    get kindLabel()    { return kindLabel(this.model?.get?.('kind')); }
    get hasParent()    { return !!this.model?.get?.('parent')?.id; }
    get parentName() {
        const parent = this.model?.get?.('parent');
        if (!parent?.id) return '';
        return parent.name || `#${parent.id}`;
    }
    get _meta()           { return this.model?.get?.('metadata') || {}; }
    get hasTimezone()     { return !!this._meta.timezone; }
    get timezone()        { return this._meta.timezone || ''; }
    get hasEodHour() {
        const eod = this._meta.eod_hour;
        return eod !== undefined && eod !== null && eod !== '';
    }
    get eodHourLabel() {
        const eod = this._meta.eod_hour;
        if (!this.hasEodHour) return '';
        return `${String(eod).padStart(2, '0')}:00`;
    }
    get hasDomain()        { return !!this._meta.domain; }
    get domain()           { return this._meta.domain || ''; }
    get hasPortal()        { return !!this._meta.portal; }
    get portal()           { return this._meta.portal || ''; }
    get hasEmailTemplate() { return !!this._meta.email_template; }
    get emailTemplate()    { return this._meta.email_template || ''; }
    get hasAnySettings() {
        return this.hasTimezone || this.hasEodHour || this.hasDomain
            || this.hasPortal || this.hasEmailTemplate;
    }
    get hasCreated()  { return this.model?.get?.('created')  != null; }
    get hasModified() { return this.model?.get?.('modified') != null; }

    /** Bubble parent-link click up to GroupView. */
    async onActionViewParent(event) {
        event?.preventDefault?.();
        this.emit('navigate:parent');
    }
}


// ── Permissions section ────────────────────────────────────

class GroupPermissionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'group-permissions-section',
            template: `
                <div class="detail-section-eyebrow">Group permissions</div>
                {{#hasPermissions|bool}}
                {{#permissionRows}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label"><code>{{key}}</code></div>
                    <div class="detail-flat-row-value">
                        <div class="form-check form-switch m-0">
                            <input class="form-check-input" type="checkbox" disabled {{#enabled|bool}}checked{{/enabled|bool}} aria-label="{{key}}">
                        </div>
                    </div>
                </div>
                {{/permissionRows}}
                {{/hasPermissions|bool}}
                {{^hasPermissions|bool}}
                <div class="text-center text-body-secondary py-4">
                    <i class="bi bi-shield-lock fs-1 d-block mb-2"></i>
                    <p class="mb-0 small">No group-scoped permissions defined. Permissions on members and API keys
                    are managed from their own records.</p>
                </div>
                {{/hasPermissions|bool}}
            `,
            ...options
        });
    }

    // ── Computed properties bound by Mustache ─────────

    get _perms() {
        const meta = this.model?.get?.('metadata') || {};
        return meta.permissions || this.model?.get?.('permissions') || null;
    }
    get hasPermissions() {
        const p = this._perms;
        return !!(p && typeof p === 'object' && Object.keys(p).length);
    }
    get permissionRows() {
        const p = this._perms;
        if (!p || typeof p !== 'object') return [];
        return Object.keys(p).sort().map(key => ({ key, enabled: !!p[key] }));
    }
}


// ── Audit Timeline section ─────────────────────────────────

/**
 * Audit log timeline driven by the shared LogList. Re-resolves items
 * from `auditCollection.models` on every render so it stays in sync
 * with the Audit badge and the Overview "recent activity" feed.
 */
class GroupAuditTimelineSection extends View {
    constructor(options = {}) {
        const { auditCollection, ...rest } = options;
        super({
            className: 'group-audit-section',
            template: `
                <div class="detail-section-eyebrow">Audit</div>
                <div data-container="group-audit-timeline"></div>
            `,
            ...rest
        });
        this.auditCollection = auditCollection || null;
    }

    async onInit() {
        this.timeline = new Timeline({
            containerId: 'group-audit-timeline',
            emptyText: 'No audit entries recorded for this group yet.',
            items: () => this._buildItems()
        });
        this.addChild(this.timeline);
    }

    async onAfterRender() {
        await super.onAfterRender();
        if (this.auditCollection && !this._wired) {
            this.auditCollection.on('fetch:success', () => {
                if (this.timeline?.isMounted()) {
                    this.timeline.setItems(() => this._buildItems());
                }
            }, this);
            this._wired = true;
        }
    }

    _buildItems() {
        const logs = this.auditCollection?.models || [];
        return logs.map(log => {
            const level = String(log.get('level') || '').toLowerCase();
            const tone  = LOG_LEVEL_TONE[level] || 'default';
            const headline = log.get('kind') || log.get('level') || 'event';
            // Timeline `detail` is trusted HTML — escape user-controlled values.
            const detailRaw = log.get('log');
            const detail = detailRaw ? escapeHtml(String(detailRaw)) : '';
            const when = dataFormatter.apply(log.get('created'), ['epoch', 'relative']) || '';
            return { tone, headline: String(headline), detail, when };
        });
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
            params: { size: 25, model_name: 'account.Group', model_id: groupId, sort: '-created' }
        });

        // ── Section view instances ─────────────────────────
        const overviewSection = new GroupOverviewSection({
            model,
            membersCollection,
            subGroupsCollection,
            apiKeysCollection,
            auditCollection
        });
        const identitySection = new GroupIdentitySection({ model });

        // Members table — click opens MemberView via the registered VIEW_CLASS
        const membersSection = new TableView({
            collection: membersCollection,
            title: 'Members',
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
            showFullscreen: false,
            searchable: false,
            hideActivePillNames: ['model_name', 'model_id'],
            columns: [
                { key: 'created', label: 'Date', formatter: 'datetime', sortable: true, width: '160px' },
                { key: 'category|badge', label: 'Category' },
                { key: 'title', label: 'Title' }
            ]
        });

        // Audit section — Timeline driven by the shared audit (LogList) collection,
        // per the Wave 3 C6 spec ("Audit section uses Timeline from @core").
        const auditSection = new GroupAuditTimelineSection({
            model,
            auditCollection
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
              text: () => {
                  const n = membersCollection.models?.length ?? 0;
                  return n ? `${n} ${n === 1 ? 'member' : 'members'}` : null;
              },
              variant: 'light',
              when: () => (membersCollection.models?.length ?? 0) > 0 },
            { icon: 'bi-diagram-3',
              text: () => {
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
            { label: 'Invite Member',  action: 'invite-member',    icon: 'bi-person-plus' },
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
                // Active toggle is emitted from auxFn (not via framework's
                // `activeField`) so the right gutter is a 2-row block:
                //   row 1: [Active toggle]
                //   row 2: muted "last activity 50m ago"
                actions: [],
                auxFn: m => _buildHeaderAux(m, membersCollection),
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
        // Cross-section navigation from Overview's Hierarchy mini-tree + Identity rows
        this.overviewSection.on('navigate:parent',   (id) => this._openGroupById(id ?? this.model.get('parent')?.id));
        this.overviewSection.on('navigate:subgroup', (id) => this._openGroupById(id));
        this.identitySection.on('navigate:parent',   ()   => this._openGroupById(this.model.get('parent')?.id));

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

        // Re-render the header so chips + auxFn reflect populated collections
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

    /**
     * Active toggle in the header right-gutter (emitted from `_buildHeaderAux`).
     * Optimistic save with silent revert on failure — the bounce IS the
     * feedback, mirroring the framework's default DetailHeaderView pattern.
     * The context-menu Activate/Deactivate path (`onActionStateToggle`)
     * keeps its confirm dialog for explicit state-change intent.
     */
    async onActionToggleActive(event, element) {
        const checked = !!element.checked;
        element.disabled = true;
        try {
            this.model.set('is_active', checked);
            const resp = await this.model.save({ is_active: checked });
            if (resp && resp.status && resp.status >= 400) throw new Error('Save failed');
            this.emit('detail:updated');
        } catch (err) {
            // Revert silently — the bounce IS the feedback.
            this.model.set('is_active', !checked);
        } finally {
            if (element && element.isConnected) element.disabled = false;
        }
        return true;
    }

    /** Active toggle from the context menu */
    async onActionStateToggle() {
        const toActive = !this.model.get('is_active');
        const verb = toActive ? 'activate' : 'deactivate';
        const Verb = toActive ? 'Activate' : 'Deactivate';
        const confirmed = await Modal.confirm(
            `Are you sure you want to ${verb} <strong>${escapeHtml(this.model.get('name') || '')}</strong>?`,
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
            message: `Are you sure you want to delete <strong>${escapeHtml(this.model.get('name') || '')}</strong>? This cannot be undone.`,
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
     * save (header chips, identity, overview, permissions).
     */
    async _fullRefresh() {
        this._refreshComputedFields();
        if (this.headerView?.isMounted())         await this.headerView.render();
        if (this.overviewSection?.isMounted())    await this.overviewSection.render();
        if (this.identitySection?.isMounted())    await this.identitySection.render();
        if (this.permissionsSection?.isMounted()) await this.permissionsSection.render();
    }
}


// ── Header aux helper ──────────────────────────────────────

/**
 * Right-gutter readout for the DetailHeader. Trusted HTML — model fields
 * escaped before interpolation. Two-row layout mirroring UserView:
 *   row 1: [Active/Inactive toggle]
 *   row 2: muted "last activity 50m ago" (or member count fallback)
 *
 * The toggle lives in here (not as the framework's `activeField`) so the
 * meta line can sit on its own row underneath the toggle cluster, instead
 * of left of it. `data-change-action` (not `data-action`) so it fires
 * once per toggle, not twice.
 */
function _buildHeaderAux(m, membersCollection) {
    const isActive = !!m.get('is_active');
    const switchHtml = `
        <label class="dh-active-switch">
            <input type="checkbox" data-change-action="toggle-active" ${isActive ? 'checked' : ''}>
            <span class="dh-track"></span>
            <span class="dh-track-label">${isActive ? 'Active' : 'Inactive'}</span>
        </label>
    `;

    const lastActivity = m.get('last_activity');
    const memberCount = membersCollection?.models?.length ?? 0;
    let metaText = '';
    if (lastActivity) {
        const rel = dataFormatter.apply(lastActivity, ['epoch', 'relative']);
        if (rel) metaText = `Last activity ${escapeHtml(String(rel))}`;
    } else if (memberCount > 0) {
        metaText = `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`;
    }

    return `
        <div class="dh-aux-top">${switchHtml}</div>
        ${metaText ? `<span class="dh-aux-meta">${metaText}</span>` : ''}
    `;
}


GroupView.VIEW_CLASS = GroupView;
Group.VIEW_CLASS = GroupView;
Group.MODEL_REF = 'account.Group';

export default GroupView;
export {
    GroupView,
    GroupOverviewSection,
    GroupIdentitySection,
    GroupPermissionsSection,
    GroupHierarchyTree,
    GroupAuditTimelineSection
};
