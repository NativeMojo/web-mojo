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
import ListView from '@core/views/list/ListView.js';
import ListViewItem from '@core/views/list/ListViewItem.js';
import MetricCard from '@core/views/data/MetricCard.js';
import Timeline from '@core/views/data/Timeline.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import dataFormatter from '@core/utils/DataFormatter.js';
import { Group, GroupList, GroupForms } from '@core/models/Group.js';
import { MemberList } from '@core/models/Member.js';
import { ApiKey, ApiKeyList, ApiKeyForms } from '@core/models/ApiKey.js';
import { LogList } from '@core/models/Log.js';
import { IncidentEventList } from '@ext/admin/models/Incident.js';
import AdminMetadataSection from '../../shared/AdminMetadataSection.js';
import ApiKeyView from '../api_keys/ApiKeyView.js';

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
            enableTooltips: true,
            template: `
                <div class="detail-section-eyebrow">Profile</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Name</div>
                    <div class="detail-flat-row-value">{{model.name|default:'—'}}</div>
                    <div class="detail-flat-row-action">
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-name" title="Edit"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Kind</div>
                    <div class="detail-flat-row-value">
                        {{#hasKind|bool}}<span class="badge text-bg-primary">{{kindLabel}}</span>{{/hasKind|bool}}
                        {{^hasKind|bool}}<span class="text-secondary fst-italic">Not set</span>{{/hasKind|bool}}
                    </div>
                    <div class="detail-flat-row-action">
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-kind" title="Edit"><i class="bi bi-pencil"></i></button>
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
                    <div class="detail-flat-row-value">{{{idClipboard}}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">UUID</div>
                    <div class="detail-flat-row-value">{{{uuidClipboard}}}</div>
                    <div class="detail-flat-row-action">
                        {{^hasUuid|bool}}<button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="generate-uuid" title="Generate UUID"><i class="bi bi-shuffle"></i></button>{{/hasUuid|bool}}
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-uuid" title="Edit"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Parent</div>
                    <div class="detail-flat-row-value">
                        {{#hasParent|bool}}<a href="#" data-action="view-parent">{{parentName}}</a>{{/hasParent|bool}}
                        {{^hasParent|bool}}<span class="text-secondary fst-italic">None — top-level group</span>{{/hasParent|bool}}
                    </div>
                </div>

                <div class="detail-section-eyebrow">Settings</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Timezone</div>
                    <div class="detail-flat-row-value">
                        {{#hasTimezone|bool}}<code>{{timezone}}</code>{{/hasTimezone|bool}}
                        {{^hasTimezone|bool}}<span class="text-secondary fst-italic">Not set</span>{{/hasTimezone|bool}}
                    </div>
                    <div class="detail-flat-row-action">
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-timezone" title="Edit"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">EOD hour</div>
                    <div class="detail-flat-row-value">
                        {{#hasEodHour|bool}}{{eodHourLabel}}{{/hasEodHour|bool}}
                        {{^hasEodHour|bool}}<span class="text-secondary fst-italic">Not set</span>{{/hasEodHour|bool}}
                    </div>
                    <div class="detail-flat-row-action">
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-eod-hour" title="Edit"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Domain</div>
                    <div class="detail-flat-row-value">
                        {{#hasDomain|bool}}<code>{{domain}}</code>{{/hasDomain|bool}}
                        {{^hasDomain|bool}}<span class="text-secondary fst-italic">Not set</span>{{/hasDomain|bool}}
                    </div>
                    <div class="detail-flat-row-action">
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-domain" title="Edit"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Auth domain</div>
                    <div class="detail-flat-row-value">
                        {{#hasAuthDomain|bool}}<code>{{authDomain}}</code>{{/hasAuthDomain|bool}}
                        {{^hasAuthDomain|bool}}<span class="text-secondary fst-italic">Not set</span>{{/hasAuthDomain|bool}}
                    </div>
                    <div class="detail-flat-row-action">
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-auth-domain" title="Edit"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Short name</div>
                    <div class="detail-flat-row-value">
                        {{#hasShortName|bool}}<code>{{shortName}}</code>{{/hasShortName|bool}}
                        {{^hasShortName|bool}}<span class="text-secondary fst-italic">Not set</span>{{/hasShortName|bool}}
                    </div>
                    <div class="detail-flat-row-action">
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-short-name" title="Edit"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Portal</div>
                    <div class="detail-flat-row-value">
                        {{#hasPortal|bool}}<a href="{{portal}}" target="_blank" rel="noopener">{{portal}}</a>{{/hasPortal|bool}}
                        {{^hasPortal|bool}}<span class="text-secondary fst-italic">Not set</span>{{/hasPortal|bool}}
                    </div>
                    <div class="detail-flat-row-action">
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-portal" title="Edit"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Email template</div>
                    <div class="detail-flat-row-value">
                        {{#hasEmailTemplate|bool}}<code>{{emailTemplate}}</code>{{/hasEmailTemplate|bool}}
                        {{^hasEmailTemplate|bool}}<span class="text-secondary fst-italic">Not set</span>{{/hasEmailTemplate|bool}}
                    </div>
                    <div class="detail-flat-row-action">
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-email-template" title="Edit"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>

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
    get hasAuthDomain()    { return !!this._meta.auth_domain; }
    get authDomain()       { return this._meta.auth_domain || ''; }
    get hasShortName()     { return !!this._meta.short_name; }
    get shortName()        { return this._meta.short_name || ''; }
    get hasPortal()        { return !!this._meta.portal; }
    get portal()           { return this._meta.portal || ''; }
    get hasEmailTemplate() { return !!this._meta.email_template; }
    get emailTemplate()    { return this._meta.email_template || ''; }
    get hasAnySettings() {
        return this.hasTimezone || this.hasEodHour || this.hasDomain
            || this.hasAuthDomain || this.hasShortName
            || this.hasPortal || this.hasEmailTemplate;
    }
    get hasCreated()  { return this.model?.get?.('created')  != null; }
    get hasModified() { return this.model?.get?.('modified') != null; }

    get hasUuid()  { return !!this.model?.get?.('uuid'); }
    get uuid()     { return this.model?.get?.('uuid') || ''; }
    get idClipboard() {
        const id = this.model?.get?.('id');
        if (id == null || id === '') return '<span class="text-secondary fst-italic">—</span>';
        return `<code>${escapeHtml(String(id))}</code> ${dataFormatter.clipboard(String(id), 'icon-only')}`;
    }
    get uuidClipboard() {
        if (!this.hasUuid) return '<span class="text-secondary fst-italic">Not set</span>';
        const uuid = this.uuid;
        return `<code>${escapeHtml(uuid)}</code> ${dataFormatter.clipboard(uuid, 'icon-only')}`;
    }

    /** Bubble parent-link click up to GroupView. */
    async onActionViewParent(event) {
        event?.preventDefault?.();
        this.emit('navigate:parent');
    }

    // ── Per-row edit handlers ──────────────────────────

    async onActionEditName() {
        const name = await Modal.prompt(
            'Group name:',
            'Edit Name',
            { defaultValue: this.model.get('name') || '' }
        );
        if (typeof name !== 'string' || !name.trim()) return true;
        await this._saveField({ name: name.trim() }, 'Name');
        return true;
    }

    async onActionEditUuid() {
        const uuid = await Modal.prompt(
            'UUID:',
            'Edit UUID',
            { defaultValue: this.model.get('uuid') || '', placeholder: '32-character hex string' }
        );
        if (typeof uuid !== 'string') return true;
        await this._saveField({ uuid: uuid.trim() || null }, 'UUID');
        return true;
    }

    async onActionGenerateUuid() {
        const generated = this._generateUuidHex();
        if (!generated) {
            this.getApp()?.toast?.error('UUID generation not supported in this browser');
            return true;
        }
        const confirmed = await Modal.confirm(
            `Generate a new UUID for this group?<br><code>${escapeHtml(generated)}</code>`,
            'Generate UUID'
        );
        if (!confirmed) return true;
        await this._saveField({ uuid: generated }, 'UUID');
        return true;
    }

    // Match backend `uuid.uuid4().hex` shape: 32 lowercase hex chars, no hyphens.
    _generateUuidHex() {
        try {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID().replace(/-/g, '');
            }
            if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
                const bytes = new Uint8Array(16);
                crypto.getRandomValues(bytes);
                return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
            }
        } catch { /* fall through */ }
        return null;
    }

    async onActionEditKind() {
        const kindOptions = Object.entries(Group.GroupKinds || {}).map(([value, text]) => ({ value, text }));
        const data = await Modal.form({
            title: 'Edit Kind',
            size: 'sm',
            fields: [{
                name: 'kind', type: 'select', label: 'Kind', cols: 12,
                options: [{ value: '', text: '(none)' }, ...kindOptions]
            }],
            data: { kind: this.model.get('kind') || '' }
        });
        if (!data) return true;
        await this._saveField({ kind: data.kind || null }, 'Kind');
        return true;
    }

    async onActionEditTimezone() {
        const meta = this.model.get('metadata') || {};
        const data = await Modal.form({
            title: 'Edit Timezone',
            size: 'sm',
            fields: [{
                name: 'timezone', type: 'select', label: 'Timezone', cols: 12,
                options: [
                    { value: '', text: '(none)' },
                    { value: 'America/New_York',    text: 'Eastern Time (ET)' },
                    { value: 'America/Chicago',     text: 'Central Time (CT)' },
                    { value: 'America/Denver',      text: 'Mountain Time (MT)' },
                    { value: 'America/Los_Angeles', text: 'Pacific Time (PT)' },
                    { value: 'America/Anchorage',   text: 'Alaska Time (AKT)' },
                    { value: 'Pacific/Honolulu',    text: 'Hawaii Time (HT)' },
                    { value: 'UTC',                 text: 'UTC' },
                    { value: 'Europe/London',       text: 'London (GMT/BST)' },
                    { value: 'Europe/Paris',        text: 'Paris (CET/CEST)' },
                    { value: 'Europe/Berlin',       text: 'Berlin (CET/CEST)' },
                    { value: 'Asia/Tokyo',          text: 'Tokyo (JST)' },
                    { value: 'Asia/Shanghai',       text: 'Shanghai (CST)' },
                    { value: 'Australia/Sydney',    text: 'Sydney (AEST)' }
                ]
            }],
            data: { timezone: meta.timezone || '' }
        });
        if (!data) return true;
        await this._saveField({ metadata: { timezone: data.timezone || null } }, 'Timezone');
        return true;
    }

    async onActionEditEodHour() {
        const meta = this.model.get('metadata') || {};
        const data = await Modal.form({
            title: 'Edit EOD Hour',
            size: 'sm',
            fields: [{
                name: 'eod_hour', type: 'number', label: 'EOD hour', cols: 12,
                min: 0, max: 23, placeholder: '0–23',
                tooltip: 'Hour of the day (24h, 0–23) when this group rolls over.'
            }],
            data: { eod_hour: (meta.eod_hour ?? '') }
        });
        if (!data) return true;
        const raw = data.eod_hour;
        const eod = (raw === '' || raw == null) ? null : Math.max(0, Math.min(23, parseInt(raw, 10) || 0));
        await this._saveField({ metadata: { eod_hour: eod } }, 'EOD hour');
        return true;
    }

    async onActionEditDomain() {
        const meta = this.model.get('metadata') || {};
        const domain = await Modal.prompt(
            'Domain:',
            'Edit Domain',
            { defaultValue: meta.domain || '' }
        );
        if (typeof domain !== 'string') return true;
        await this._saveField({ metadata: { domain: domain.trim() || null } }, 'Domain');
        return true;
    }

    async onActionEditAuthDomain() {
        const meta = this.model.get('metadata') || {};
        const authDomain = await Modal.prompt(
            'Auth domain (used for white-label login pages):',
            'Edit Auth Domain',
            { defaultValue: meta.auth_domain || '', placeholder: 'auth.example.com' }
        );
        if (typeof authDomain !== 'string') return true;
        await this._saveField({ metadata: { auth_domain: authDomain.trim() || null } }, 'Auth domain');
        return true;
    }

    async onActionEditShortName() {
        const meta = this.model.get('metadata') || {};
        const shortName = await Modal.prompt(
            'Short name:',
            'Edit Short Name',
            { defaultValue: meta.short_name || '' }
        );
        if (typeof shortName !== 'string') return true;
        await this._saveField({ metadata: { short_name: shortName.trim() || null } }, 'Short name');
        return true;
    }

    async onActionEditPortal() {
        const meta = this.model.get('metadata') || {};
        const portal = await Modal.prompt(
            'Portal URL:',
            'Edit Portal',
            { defaultValue: meta.portal || '', placeholder: 'https://…' }
        );
        if (typeof portal !== 'string') return true;
        await this._saveField({ metadata: { portal: portal.trim() || null } }, 'Portal');
        return true;
    }

    async onActionEditEmailTemplate() {
        const meta = this.model.get('metadata') || {};
        const template = await Modal.prompt(
            'Email template name:',
            'Edit Email Template',
            { defaultValue: meta.email_template || '' }
        );
        if (typeof template !== 'string') return true;
        await this._saveField({ metadata: { email_template: template.trim() || null } }, 'Email template');
        return true;
    }

    async _saveField(fields, label) {
        const resp = await this.model.save(fields);
        if (resp && resp.status === 200) {
            this.getApp()?.toast?.success(`${label} updated`);
            await this.render();
        } else {
            this.getApp()?.toast?.error(resp?.message || `Failed to update ${label.toLowerCase()}`);
        }
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


// ── API Keys list item (card row) ──────────────────────────

/**
 * One row in the API Keys ListView — a card-style layout instead of
 * a table row, so the section reads as a small modern list rather
 * than a heavy data table. Exposes `permsList`, `hasPerms`, and
 * `lastUsedLabel` as getters so the Mustache template can render
 * inline permission badges and a relative-time "Last used" line.
 *
 * The trash button uses `data-action="delete"` — `onActionDelete`
 * on the base `ListViewItem` already calls `event.stopPropagation()`
 * (so the row click doesn't also fire) and emits `row:delete` to the
 * parent ListView. The parent's `options.onItemDelete` (wired in
 * `GroupView.onAfterBuild`) runs the confirm + destroy + refetch.
 */
const API_KEY_ROW_TEMPLATE = `
    <div class="d-flex align-items-center gap-3 py-3 px-2">
        <i class="bi bi-key-fill fs-4 text-primary flex-shrink-0"></i>
        <div class="flex-grow-1 min-width-0">
            <div class="d-flex align-items-center gap-2 mb-1">
                <strong class="text-truncate">{{model.name|default:'Unnamed key'}}</strong>
                {{#model.is_active|bool}}<span class="badge text-bg-success">Active</span>{{/model.is_active|bool}}
                {{^model.is_active|bool}}<span class="badge text-bg-secondary">Inactive</span>{{/model.is_active|bool}}
            </div>
            <div class="small mb-1">
                {{#hasPerms|bool}}{{#permsList}}<code class="badge text-bg-light border me-1">{{.}}</code>{{/permsList}}{{/hasPerms|bool}}
                {{^hasPerms|bool}}<span class="text-secondary fst-italic">No permissions granted</span>{{/hasPerms|bool}}
            </div>
            <div class="small text-secondary">
                Last used <strong>{{lastUsedLabel}}</strong> · Created {{model.created|datetime}}
            </div>
        </div>
        <button type="button"
                class="btn btn-sm btn-outline-danger flex-shrink-0"
                data-action="delete"
                title="Delete this key"
                aria-label="Delete this key">
            <i class="bi bi-trash"></i>
        </button>
    </div>
`;

class ApiKeyListItem extends ListViewItem {
    constructor(options = {}) {
        super({
            ...options,
            template: API_KEY_ROW_TEMPLATE,
            className: 'api-key-row border-bottom'
        });
    }

    get _perms() {
        const p = this.model?.get?.('permissions');
        return (p && typeof p === 'object') ? p : null;
    }
    get hasPerms() {
        const p = this._perms;
        return !!(p && Object.keys(p).some(k => p[k]));
    }
    get permsList() {
        const p = this._perms;
        if (!p) return [];
        return Object.keys(p).filter(k => p[k]);
    }
    get lastUsedLabel() {
        const lu = this.model?.get?.('last_used');
        if (!lu) return 'never';
        const rel = dataFormatter.apply(lu, ['relative']);
        return rel || 'never';
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
            params: { group: groupId, size: 10, sort: '-created' }
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

        // API Keys uses a ListView (not a TableView): for a typical group's
        // 1–10 keys, the table chrome (column headers, sort dropdowns,
        // pagination footer) is heavier than the data warrants. Each row is
        // a card-style ApiKeyListItem with an inline trash button — see the
        // class above for the template and computed fields. Delete is wired
        // via `onItemDelete` in onAfterBuild (more reliable than the framework
        // _onRowDelete chain — we own the confirm + destroy + refetch).
        const apiKeysSection = new ListView({
            collection: apiKeysCollection,
            title: 'API Keys',
            itemClass: ApiKeyListItem,
            clickAction: 'view',
            itemView: ApiKeyView,
            viewDialogOptions: { header: false, noBodyPadding: true, buttons: [] },
            showAdd: true,
            addButtonLabel: 'Create Key',
            showRefresh: true,
            emptyMessage: 'No API keys yet. Click "Create Key" to add one.'
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

        // Kind-aware noun for user-facing copy. Falls back to 'Group'
        // when `kind` is unset or unknown.
        const kindNoun = kindLabel(kind) || 'Group';

        // Phase 4 pattern: admin-tier-tagged kebab items get filtered by
        // ModalView.filterContextMenuItems via app.activeUser.hasPermission.
        // Two perm tiers for Groups (line 214 of the spec — disable/delete
        // tightened to manage_groups-only).
        const GROUP_ADMIN_PERMS = ['groups', 'manage_groups'];
        const GROUP_DESTRUCTIVE_PERMS = ['manage_groups'];

        const contextItems = [
            { label: `Edit ${kindNoun}`,    action: 'edit-group',       icon: 'bi-pencil',        permissions: GROUP_ADMIN_PERMS },
            { label: 'Invite Member',       action: 'invite-member',    icon: 'bi-person-plus',   permissions: GROUP_ADMIN_PERMS },
            { label: `Add Sub-${kindNoun}`, action: 'add-child-group',  icon: 'bi-diagram-3',     permissions: GROUP_ADMIN_PERMS }
        ];
        if (model.get('parent')?.id) {
            contextItems.push({ label: 'View Parent', action: 'view-parent-menu', icon: 'bi-arrow-up-right-square' });
        }
        contextItems.push({ type: 'divider' });
        contextItems.push(model.get('is_active')
            ? { label: `Deactivate ${kindNoun}`, action: 'state-toggle', icon: 'bi-toggle-off', permissions: GROUP_DESTRUCTIVE_PERMS }
            : { label: `Activate ${kindNoun}`,   action: 'state-toggle', icon: 'bi-toggle-on',  permissions: GROUP_DESTRUCTIVE_PERMS });
        contextItems.push({ type: 'divider' });
        contextItems.push({ label: `Delete ${kindNoun}`, action: 'delete-group', icon: 'bi-trash', danger: true, permissions: GROUP_DESTRUCTIVE_PERMS });

        super({
            className: 'group-view',
            ...options,
            model,
            header: {
                icon: headerIcon,
                titleField: 'name',
                subtitlePath: '_subtitle',
                chips,
                // Active toggle is emitted from auxFn (not via framework's
                // `activeField`) so the right gutter is a 2-row block:
                //   row 1: [Active toggle]
                //   row 2: muted "last activity 50m ago"
                actions: [],
                auxFn: m => _buildHeaderAux(m, membersCollection, this.isAdminCallerDestructive),
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

        // API Keys add flow: bypass the generic ListView.onActionAdd so we can
        // drop the redundant Group ID field and surface the one-time token.
        this.apiKeysSection.options.onAdd = (event) => this._createApiKey(event);

        // API Keys delete: explicit override (rather than relying on the
        // framework's _onRowDelete chain) so we control the confirm copy,
        // toast feedback, and refetch — and we own the failure modes.
        this.apiKeysSection.options.onItemDelete = (model) => this._deleteApiKey(model);

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
     * subtitlePath. Shows the parent breadcrumb when there is one; empty
     * otherwise. Kind is already conveyed by a header chip — don't
     * duplicate it as a subtitle row.
     */
    _refreshComputedFields() {
        const m = this.model;
        const parent = m.get('parent');
        m.attributes._subtitle = parent?.name ? String(parent.name) : '';
    }

    /**
     * Kind-aware noun for user-facing copy. Returns the localized label
     * (`Organization`, `Department`, `Team`, etc.) or falls back to
     * `Group` when `kind` is unset. Phase 5 — spec line 264 ("Don't
     * hardcode 'group' in copy").
     */
    _kindNoun() {
        return kindLabel(this.model.get('kind')) || 'Group';
    }

    /**
     * Admin tier == `groups` / `manage_groups` / `is_superuser`. Mirrors
     * Phase 4's UserView pattern. Group has two perm tiers — see
     * `isAdminCallerDestructive` for the strict gate used on disable /
     * delete per the backend tightening (spec line 214).
     */
    get isAdminCaller() {
        const u = this.getApp()?.activeUser;
        if (!u) return false;
        if (u.get?.('is_superuser')) return true;
        return !!u.hasPermission?.(['groups', 'manage_groups']);
    }

    /**
     * Strict admin tier for destructive actions — disable/reactivate and
     * delete now require `manage_groups` only per the backend tightening.
     */
    get isAdminCallerDestructive() {
        const u = this.getApp()?.activeUser;
        if (!u) return false;
        if (u.get?.('is_superuser')) return true;
        return !!u.hasPermission?.('manage_groups');
    }

    // ── Action handlers ────────────────────────────────────

    async onActionEditGroup() {
        const resp = await Modal.modelForm({
            title: `Edit ${this._kindNoun()} — ${this.model.get('name')}`,
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
            title: `Add Sub-${this._kindNoun()} to ${this.model.get('name')}`,
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

    /**
     * Create-API-Key flow for the in-GroupView API Keys section. Wired via
     * `apiKeysSection.options.onAdd` (see `onAfterBuild`) so the framework's
     * generic add path is bypassed entirely.
     */
    async _createApiKey(event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();

        const data = await Modal.form({
            title: 'Create API Key',
            size: 'md',
            fields: ApiKeyForms.create.fields.filter(f => f.name !== 'group')
        });
        if (!data) return;

        // Model.save(data) sends `data` as the POST body verbatim — it does
        // NOT serialize from constructor attributes. Pass the payload here
        // (mirrors the proven pattern in ApiKeyTablePage.onActionAdd).
        const newKey = new ApiKey();
        const payload = { ...data, group: this.model.id };
        const resp = await newKey.save(payload);
        if (!resp?.data?.status || (resp?.status && resp.status >= 400)) {
            this.getApp()?.toast?.error(
                resp?.data?.error || resp?.message || 'Failed to create API key'
            );
            return;
        }

        const token = resp?.data?.data?.token;
        await this._showApiKeyTokenDialog(token, payload.name, payload.permissions);
        await this.apiKeysCollection.fetch().catch(() => {});
    }

    /**
     * Inline row delete for the API Keys ListView. Wired via
     * `apiKeysSection.options.onItemDelete` so the framework's generic
     * `_onRowDelete` chain is bypassed — we own the confirm copy, toast
     * feedback, and refetch, and any failure surfaces explicitly.
     */
    async _deleteApiKey(model) {
        const name = model?.get?.('name') || 'this key';
        const confirmed = await Modal.confirm(
            `Delete API key <strong>${escapeHtml(name)}</strong>? This cannot be undone — any service using it will lose access immediately.`,
            'Delete API Key',
            { confirmText: 'Delete', confirmClass: 'btn-danger' }
        );
        if (!confirmed) return;

        try {
            const resp = await model.destroy();
            if (resp && resp.success === false) {
                throw new Error(resp.error || resp.message || 'Delete failed');
            }
            this.getApp()?.toast?.success('API key deleted');
            await this.apiKeysCollection.fetch().catch(() => {});
        } catch (err) {
            this.getApp()?.toast?.error(err?.message || 'Failed to delete API key');
        }
    }

    /**
     * One-time token reveal. The raw token is only returned at creation time
     * (see `django-mojo/mojo/apps/account/models/api_key.py:241-245`), so this
     * dialog is the operator's only chance to capture it.
     *
     * The copy affordance is an inline clipboard icon next to the token —
     * matching the framework's `clipboard` DataFormatter pattern. The button
     * uses `data-action="copy-to-clipboard"` + `data-clipboard="<token>"`;
     * `View.onActionCopyToClipboard` (inherited via ModalView extends View)
     * handles the click, including the icon→check success flash and the
     * `execCommand` fallback for insecure contexts. No custom handler needed.
     *
     * `backdrop: 'static'` + `keyboard: false` protects the show-once secret
     * from accidental dismissal even though the obvious copy affordance is
     * right at the token.
     */
    async _showApiKeyTokenDialog(token, name, permissionsInput) {
        if (!token) {
            this.getApp()?.toast?.success('API key created');
            return;
        }

        // Permissions preview — `permissionsInput` may be a dict, a JSON
        // string (the textarea passes through verbatim), null, or invalid.
        // Fall back to "no permissions" on parse failure (matches the
        // backend's silent coercion to {} in api_key.py:85-86).
        let permKeys = [];
        if (permissionsInput) {
            let parsed = permissionsInput;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); }
                catch { parsed = null; }
            }
            if (parsed && typeof parsed === 'object') {
                permKeys = Object.keys(parsed).filter(k => parsed[k]);
            }
        }

        const permsHtml = permKeys.length
            ? `<div class="small mt-3">
                   <span class="text-secondary me-2">Permissions:</span>
                   ${permKeys.map(k => `<code class="badge text-bg-light border me-1">${escapeHtml(k)}</code>`).join('')}
               </div>`
            : `<div class="small text-secondary mt-3">
                   <i class="bi bi-info-circle me-1"></i>No permissions granted — this key has read access only to public endpoints.
               </div>`;

        const escapedToken = escapeHtml(token);

        const body = `
            <div class="mb-3 fs-6">
                <i class="bi bi-check-circle-fill text-success me-2"></i>API key <strong>${escapeHtml(name || '')}</strong> created.
            </div>
            <div class="alert alert-warning d-flex align-items-center mb-3" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <div>Save this token now — it will not be shown again.</div>
            </div>
            <div class="d-flex align-items-center gap-2 p-3 rounded"
                 style="background: var(--bs-tertiary-bg);
                        border: 1px solid var(--bs-border-color);
                        overflow-x: auto;">
                <code class="user-select-all font-monospace text-break flex-grow-1"
                      style="background: transparent; color: inherit;
                             font-size: 0.95rem; line-height: 1.4;"
                      aria-label="API token">${escapedToken}</code>
                <button type="button"
                        class="btn btn-sm btn-outline-secondary flex-shrink-0"
                        data-action="copy-to-clipboard"
                        data-clipboard="${escapedToken}"
                        title="Copy token"
                        aria-label="Copy token">
                    <i class="bi bi-clipboard"></i>
                </button>
            </div>
            ${permsHtml}
            <div class="small text-secondary mt-3">
                Treat this token like a password. Anyone with it can call this group's API on your behalf.
            </div>
        `;

        await Modal.dialog({
            title: 'API Key Created — Save Your Token',
            size: 'lg',
            backdrop: 'static',
            keyboard: false,
            body,
            buttons: [
                { text: 'Close', class: 'btn-secondary', dismiss: true }
            ]
        });
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
        const noun = this._kindNoun();
        const confirmed = await Modal.confirm(
            `Are you sure you want to ${verb} <strong>${escapeHtml(this.model.get('name') || '')}</strong>?`,
            `${Verb} ${noun}`
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
        const noun = this._kindNoun();
        const confirmed = await Modal.confirm({
            title: `Delete ${noun}`,
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
function _buildHeaderAux(m, membersCollection, canToggleActive) {
    const isActive = !!m.get('is_active');
    // Toggle hidden for non-`manage_groups` callers per backend tightening
    // (disable/reactivate stricter than rest of Group SAVE_PERMS).
    const switchHtml = canToggleActive ? `
        <label class="dh-active-switch">
            <input type="checkbox" data-change-action="toggle-active" ${isActive ? 'checked' : ''}>
            <span class="dh-track"></span>
            <span class="dh-track-label">${isActive ? 'Active' : 'Inactive'}</span>
        </label>
    ` : '';

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
