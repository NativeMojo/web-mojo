/**
 * UserView - User detail inspector built on the DetailView primitive.
 *
 * Sections (collapses the legacy 12 down):
 *   Overview      — KPIs (Devices · Last login · Active sessions · Groups)
 *                   + flat-row identity card + Recent-activity Timeline
 *   Profile       — Personal / Account / Linked accounts flat-row sections
 *   ──── Access ────
 *   Groups        — TableView of MemberList scoped to user (badge: count)
 *   Permissions   — TabView (Common / Advanced / Effective)
 *   API Keys      — TableView with Generate Key toolbar button (badge: count)
 *   ──── Activity ────
 *   Devices       — Unified TableView (browser + push) with `kind` column filter
 *   Locations     — Existing TabView (Map · Logins)
 *   Audit         — TabView of three TableViews (Activity · Incidents · Object changes)
 *   ──── Settings ────
 *   Notifications — channel preference grid
 *   Metadata      — JSON dump
 *
 * Open via `Modal.detail(new UserView({ model }))` — pair with
 * `viewDialogOptions: { header: false, noBodyPadding: true,
 * buttons: [] }` when wired through TableView. Inherits `size: 'lg'`
 * from `Modal.detail()`'s default.
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import TabView from '@core/views/navigation/TabView.js';
import TableView from '@core/views/table/TableView.js';
import ListView from '@core/views/list/ListView.js';
import { groupByDay } from '@core/views/list/grouping.js';
import FormView from '@core/forms/FormView.js';
import MetricCard from '@core/views/data/MetricCard.js';
import Timeline from '@core/views/data/Timeline.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import dataFormatter from '@core/utils/DataFormatter.js';
import rest from '@core/Rest.js';
import { User, UserDeviceList } from '@core/models/User.js';
import { LoginEventList } from '@ext/admin/models/LoginEvent.js';
import { LogList } from '@core/models/Log.js';
import { IncidentEventList } from '@ext/admin/models/Incident.js';
import { MemberList } from '@core/models/Member.js';
import { PushDeviceList } from '@ext/admin/models/Push.js';
import { PasskeyList, PasskeyForms } from '@core/models/Passkeys.js';
import LoginLocationMapView from '../devices/LoginLocationMapView.js';
import DeviceView from '../devices/DeviceView.js';
import PushDeviceView from '../../messaging/push/PushDeviceView.js';
import AdminNotificationsSection from './sections/AdminNotificationsSection.js';
import AdminPersonalSection from './sections/AdminPersonalSection.js';
import AdminSecuritySection from './sections/AdminSecuritySection.js';
import AdminConnectedSection from './sections/AdminConnectedSection.js';
import AdminMetadataSection from '../../shared/AdminMetadataSection.js';

const escapeHtml = MOJOUtils.escapeHtml;


// ── Helpers (kept minimal — DataFormatter pipes do the rest) ───────

/**
 * Online if `last_activity` is within 5 minutes. Used by header chips
 * and the auxFn presence dot.
 */
function isOnline(model) {
    const last = model?.get?.('last_activity');
    if (last == null) return false;
    const ms = (typeof last === 'number' && last < 1e11)
        ? last * 1000
        : new Date(last).getTime();
    if (!Number.isFinite(ms)) return false;
    return (Date.now() - ms) < 5 * 60 * 1000;
}

// ── Disable lifecycle ─────────────────────────────────────────────
//
// Truth field is `is_active`. The `metadata.protected.disable.*` block
// carries reason / by_user / note / inactivity warning / history.
// Spec: planning/requests/admin-users-spec-alignment.md.
//
// Reason → badge mapping. Active state shows "Active" green.
// Anonymized is irreversible per backend — toggle is hidden in that case.

const DISABLE_REASON_BADGES = {
    admin:      { label: 'Blocked',          variant: 'danger'    },
    abuse:      { label: 'Banned',           variant: 'danger'    },
    inactive:   { label: 'Auto-disabled',    variant: 'warning'   },
    anonymized: { label: 'Anonymized',       variant: 'secondary' },
    self:       { label: 'Self-deactivated', variant: 'secondary' }
};

function _disableBlock(m) {
    return m?.get?.('metadata')?.protected?.disable || null;
}
function _disableReason(m) {
    return _disableBlock(m)?.reason || null;
}
function _isAnonymized(m) {
    return _disableReason(m) === 'anonymized';
}
function _statusBadge(m) {
    if (m?.get?.('is_active')) return { label: 'Active', variant: 'success' };
    return DISABLE_REASON_BADGES[_disableReason(m)] || { label: 'Inactive', variant: 'secondary' };
}
function _inactivityWarning(m) {
    if (!m?.get?.('is_active')) return null;
    const w = _disableBlock(m)?.warning;
    if (!w?.sent_at) return null;
    return {
        sent_at: w.sent_at,
        days: w.days_until_disable_at_send
    };
}

const PROVIDER_ICONS = {
    google:    'bi-google',
    github:    'bi-github',
    microsoft: 'bi-microsoft',
    apple:     'bi-apple',
    facebook:  'bi-facebook',
    twitter:   'bi-twitter-x',
    linkedin:  'bi-linkedin'
};

const LOG_LEVEL_TONE = {
    error:    'danger',
    critical: 'danger',
    warning:  'warning',
    warn:     'warning',
    info:     'info'
};

const LOG_LEVEL_ICON = {
    error:    'bi-shield-x',
    critical: 'bi-shield-x',
    warning:  'bi-exclamation-triangle',
    warn:     'bi-exclamation-triangle',
    info:     'bi-pencil-square'
};

// LoginEvent event-type → tone mapping. The exact field name varies by
// backend (`event_type` / `is_success` / `status`) — the formatter just
// looks up by lowercase string and falls through to `secondary` for any
// unrecognized value, so the timeline reads cleanly even when the
// backend ships a different signal field.
const LOGIN_TONE = {
    success_login: 'success',
    success:       'success',
    login:         'success',
    failed_login:  'danger',
    failure:       'danger',
    failed:        'danger',
    suspicious:    'warning',
    mfa_required:  'warning',
    mfa:           'warning'
};

// Pipe formatters used by the audit feed + logins-timeline templates.
// Registered idempotently so dev hot-reloads don't double-register.
if (!dataFormatter.formatters?.has?.('leveltone')) {
    dataFormatter.register('levelTone', (level) => {
        return LOG_LEVEL_TONE[String(level || '').toLowerCase()] || 'secondary';
    });
}
if (!dataFormatter.formatters?.has?.('levelicon')) {
    dataFormatter.register('levelIcon', (level) => {
        return LOG_LEVEL_ICON[String(level || '').toLowerCase()] || 'bi-circle';
    });
}
if (!dataFormatter.formatters?.has?.('logintone')) {
    dataFormatter.register('loginTone', (event_type) => {
        return LOGIN_TONE[String(event_type || '').toLowerCase()] || 'secondary';
    });
}

// ── Overview section ───────────────────────────────────────

class UserOverviewSection extends View {
    constructor(options = {}) {
        const {
            devicesCollection,
            pushDevicesCollection,
            membersCollection,
            loginsCollection,
            activityCollection,
            eventsCollection,
            objectLogsCollection,
            ...rest
        } = options;

        super({
            className: 'user-overview-section',
            // The Email row uses the `clipboard` formatter which emits a
            // [data-bs-toggle="tooltip"] copy button.
            enableTooltips: true,
            template: `
                <div class="detail-section-eyebrow">Account snapshot</div>
                <div class="detail-kpi-grid">
                    <div data-container="user-kpi-devices"></div>
                    <div data-container="user-kpi-last-login"></div>
                    <div data-container="user-kpi-sessions"></div>
                    <div data-container="user-kpi-groups"></div>
                </div>

                <div class="detail-section-eyebrow">Identity</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Display name</div>
                    <div class="detail-flat-row-value">{{model.display_name|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Email</div>
                    <div class="detail-flat-row-value">
                        {{#hasEmail|bool}}{{{model.email|clipboard}}}{{/hasEmail|bool}}
                        {{^hasEmail|bool}}<span class="text-secondary">—</span>{{/hasEmail|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Phone</div>
                    <div class="detail-flat-row-value">
                        {{#hasPhone|bool}}<code>{{model.phone_number}}</code>{{/hasPhone|bool}}
                        {{^hasPhone|bool}}<span class="text-secondary">—</span>{{/hasPhone|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Account type</div>
                    <div class="detail-flat-row-value">{{accountType}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Joined</div>
                    <div class="detail-flat-row-value"><code>{{model.date_joined|date|default:'—'}}</code></div>
                </div>

                <div class="detail-section-eyebrow">Recent activity</div>
                <div data-container="user-overview-activity"></div>
            `,
            ...rest
        });

        this.devicesCollection      = devicesCollection;
        this.pushDevicesCollection  = pushDevicesCollection;
        this.membersCollection      = membersCollection;
        this.loginsCollection       = loginsCollection;
        this.activityCollection     = activityCollection;
        this.eventsCollection       = eventsCollection;
        this.objectLogsCollection   = objectLogsCollection;
    }

    // ── Computed properties bound by the Mustache template ────

    get hasEmail() { return !!this.model?.get?.('email'); }
    get hasPhone() { return !!this.model?.get?.('phone_number'); }

    get accountType() {
        const m = this.model;
        if (m.get('is_superuser')) return 'Superuser';
        if (m.get('is_staff'))     return 'Staff';
        return 'User';
    }

    async onInit() {
        // KPI cards — default size, tone-stripe driven by current state
        this.kpiDevices = new MetricCard({
            containerId: 'user-kpi-devices',
            label: 'Devices',
            value: () => String(this._deviceCount())
        });
        this.kpiLastLogin = new MetricCard({
            containerId: 'user-kpi-last-login',
            label: 'Last login',
            value: () => this._lastLoginLabel()
        });
        this.kpiSessions = new MetricCard({
            containerId: 'user-kpi-sessions',
            label: 'Active sessions',
            value: () => String(this._sessionCount()),
            tone: () => this._sessionCount() > 0 ? 'success' : 'default'
        });
        this.kpiGroups = new MetricCard({
            containerId: 'user-kpi-groups',
            label: 'Groups',
            value: () => String(this._groupCount())
        });
        [this.kpiDevices, this.kpiLastLogin, this.kpiSessions, this.kpiGroups]
            .forEach(c => this.addChild(c));

        // Recent-activity timeline — function-valued items resolve on every render()
        this.activityTimeline = new Timeline({
            containerId: 'user-overview-activity',
            limit: 5,
            emptyText: 'No recent activity yet.',
            items: () => this._buildActivityItems()
        });
        this.addChild(this.activityTimeline);
    }

    async onAfterRender() {
        await super.onAfterRender();
        // Re-render the KPI cards + timeline whenever a shared collection refreshes
        const wireRefresh = (col) => {
            if (col && !col._userOverviewWired) {
                col.on('fetch:success', () => {
                    if (this.kpiDevices?.isMounted())   this.kpiDevices.render().catch(() => {});
                    if (this.kpiLastLogin?.isMounted()) this.kpiLastLogin.render().catch(() => {});
                    if (this.kpiSessions?.isMounted())  this.kpiSessions.render().catch(() => {});
                    if (this.kpiGroups?.isMounted())    this.kpiGroups.render().catch(() => {});
                    if (this.activityTimeline?.isMounted()) {
                        this.activityTimeline.setItems(() => this._buildActivityItems());
                    }
                }, this);
                col._userOverviewWired = true;
            }
        };
        [this.devicesCollection, this.pushDevicesCollection, this.membersCollection,
         this.loginsCollection, this.activityCollection, this.eventsCollection,
         this.objectLogsCollection].forEach(wireRefresh);
    }

    // ── KPI value helpers ─────────────────────────────────
    //
    // KPIs reflect TOTAL row counts from the API, not just what's been
    // fetched into the local Collection. Read `collection.meta.count` —
    // that's set by `Collection.parse` from `response.data.count`. Fall
    // back to `models.length` when meta hasn't populated yet (e.g. before
    // the first fetch or when the response shape doesn't carry a count).

    _deviceCount() {
        const browser = this.devicesCollection?.meta?.count
            ?? this.devicesCollection?.models?.length ?? 0;
        const push = this.pushDevicesCollection?.meta?.count
            ?? this.pushDevicesCollection?.models?.length ?? 0;
        return browser + push;
    }
    _sessionCount() {
        return this.devicesCollection?.meta?.count
            ?? this.devicesCollection?.models?.length ?? 0;
    }
    _lastLoginLabel() {
        const last = this.loginsCollection?.models?.[0]?.get?.('created')
            ?? this.model?.get?.('last_login');
        if (!last) return '—';
        return dataFormatter.apply('relative', last) || '—';
    }
    _groupCount() {
        return this.membersCollection?.meta?.count
            ?? this.membersCollection?.models?.length ?? 0;
    }

    /**
     * Pull up to 5 items from the most-recent of each shared collection.
     * Timeline `detail` is trusted HTML — every model-controlled value is
     * escaped via MOJOUtils.escapeHtml() before composition.
     */
    _buildActivityItems() {
        const out = [];

        const logins = this.loginsCollection?.models?.slice(0, 2) || [];
        for (const l of logins) {
            const ip      = l.get('ip_address');
            const city    = l.get('city');
            const country = l.get('country_code');
            const where   = [city, country].filter(Boolean).join(', ');
            const detail  = [
                ip ? `<code>${escapeHtml(String(ip))}</code>` : '',
                where ? `<span class="text-secondary">${escapeHtml(where)}</span>` : ''
            ].filter(Boolean).join(' · ');
            out.push({
                _ts:      _toMs(l.get('created')),
                tone:     'info',
                headline: 'Logged in',
                detail,
                when:     dataFormatter.apply('relative', l.get('created'))
            });
        }

        const events = this.eventsCollection?.models?.slice(0, 2) || [];
        for (const e of events) {
            const cat = e.get('category');
            out.push({
                _ts:      _toMs(e.get('created')),
                tone:     'danger',
                headline: e.get('title') || cat || 'Incident event',
                detail:   cat ? `<span class="text-secondary">${escapeHtml(String(cat))}</span>` : '',
                when:     dataFormatter.apply('relative', e.get('created'))
            });
        }

        const logs = this.objectLogsCollection?.models?.slice(0, 2) || [];
        for (const log of logs) {
            const msg = log.get('log');
            out.push({
                _ts:      _toMs(log.get('created')),
                tone:     LOG_LEVEL_TONE[(log.get('level') || '').toLowerCase()] || null,
                headline: log.get('kind') || 'Change',
                detail:   msg ? `<span class="text-secondary">${escapeHtml(String(msg).slice(0, 80))}</span>` : '',
                when:     dataFormatter.apply('relative', log.get('created'))
            });
        }

        const activity = this.activityCollection?.models?.slice(0, 1) || [];
        for (const a of activity) {
            const path = a.get('path');
            out.push({
                _ts:      _toMs(a.get('created')),
                tone:     LOG_LEVEL_TONE[(a.get('level') || '').toLowerCase()] || null,
                headline: a.get('kind') || 'Activity',
                detail:   path ? `<code class="small">${escapeHtml(String(path))}</code>` : '',
                when:     dataFormatter.apply('relative', a.get('created'))
            });
        }

        return out
            .filter(i => i._ts != null)
            .sort((a, b) => b._ts - a._ts)
            .slice(0, 5);
    }
}


// ── Profile section ────────────────────────────────────────

class UserProfileSection extends View {
    constructor(options = {}) {
        super({
            className: 'user-profile-section',
            enableTooltips: true,
            template: `
                <div class="detail-section-eyebrow">Personal</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Display name</div>
                    <div class="detail-flat-row-value">{{model.display_name|default:'—'}}</div>
                    <div class="detail-flat-row-action">
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-display-name" title="Edit"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Username</div>
                    <div class="detail-flat-row-value"><code>{{model.username|default:'—'}}</code></div>
                    <div class="detail-flat-row-action">
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-username" title="Edit"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Email</div>
                    <div class="detail-flat-row-value">
                        {{#hasEmail|bool}}{{{model.email|clipboard}}}{{/hasEmail|bool}}
                        {{^hasEmail|bool}}<span class="text-secondary">—</span>{{/hasEmail|bool}}
                        {{#model.is_email_verified|bool}}<span class="badge text-bg-success ms-1"><i class="bi bi-shield-check me-1"></i>verified</span>{{/model.is_email_verified|bool}}
                        {{^model.is_email_verified|bool}}{{#hasEmail|bool}}<span class="badge text-bg-warning ms-1">unverified</span>{{/hasEmail|bool}}{{/model.is_email_verified|bool}}
                    </div>
                    <div class="detail-flat-row-action">
                        {{#hasEmail|bool}}
                            {{#model.is_email_verified|bool}}
                                <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="unverify-email" title="Mark as unverified"><i class="bi bi-x-circle"></i></button>
                            {{/model.is_email_verified|bool}}
                            {{^model.is_email_verified|bool}}
                                <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="force-verify-email" title="Force verify"><i class="bi bi-patch-check"></i></button>
                            {{/model.is_email_verified|bool}}
                        {{/hasEmail|bool}}
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="change-email" title="Edit email"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Phone</div>
                    <div class="detail-flat-row-value">
                        {{#hasPhone|bool}}
                            <code>{{model.phone_number}}</code>
                            {{#model.is_phone_verified|bool}}<span class="badge text-bg-success ms-1"><i class="bi bi-shield-check me-1"></i>verified</span>{{/model.is_phone_verified|bool}}
                            {{^model.is_phone_verified|bool}}<span class="badge text-bg-warning ms-1">unverified</span>{{/model.is_phone_verified|bool}}
                        {{/hasPhone|bool}}
                        {{^hasPhone|bool}}<span class="text-secondary fst-italic">Not set</span>{{/hasPhone|bool}}
                    </div>
                    <div class="detail-flat-row-action">
                        {{#hasPhone|bool}}
                            {{#model.is_phone_verified|bool}}
                                <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="unverify-phone" title="Mark as unverified"><i class="bi bi-x-circle"></i></button>
                            {{/model.is_phone_verified|bool}}
                            {{^model.is_phone_verified|bool}}
                                <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="force-verify-phone" title="Force verify"><i class="bi bi-patch-check"></i></button>
                            {{/model.is_phone_verified|bool}}
                        {{/hasPhone|bool}}
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="change-phone" title="Edit phone"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>

                <div class="detail-section-eyebrow">
                    Account
                    <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-account" title="Edit account"><i class="bi bi-pencil"></i></button>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Account type</div>
                    <div class="detail-flat-row-value">{{accountType}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Status</div>
                    <div class="detail-flat-row-value">
                        {{#model.is_active|bool}}<span class="badge text-bg-success">Active</span>{{/model.is_active|bool}}
                        {{^model.is_active|bool}}<span class="badge text-bg-secondary">Inactive</span>{{/model.is_active|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">MFA</div>
                    <div class="detail-flat-row-value">
                        {{#model.requires_mfa|bool}}<span class="badge text-bg-success">Required</span>{{/model.requires_mfa|bool}}
                        {{^model.requires_mfa|bool}}<span class="badge text-bg-secondary">Not required</span>{{/model.requires_mfa|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Joined</div>
                    <div class="detail-flat-row-value"><code>{{model.date_joined|date|default:'—'}}</code></div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Last login</div>
                    <div class="detail-flat-row-value">{{model.last_login|relative|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Last seen</div>
                    <div class="detail-flat-row-value">{{model.last_activity|relative|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Timezone</div>
                    <div class="detail-flat-row-value">
                        {{#hasTimezone|bool}}{{timezone}}{{/hasTimezone|bool}}
                        {{^hasTimezone|bool}}<span class="text-secondary">—</span>{{/hasTimezone|bool}}
                    </div>
                </div>

                <div class="detail-section-eyebrow">
                    Linked accounts
                    <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="manage-linked" title="Manage linked accounts"><i class="bi bi-pencil"></i></button>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">SSO providers</div>
                    <div class="detail-flat-row-value">{{{linkedProvidersHtml}}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">2-factor</div>
                    <div class="detail-flat-row-value">
                        {{#model.requires_mfa|bool}}<span class="badge text-bg-success">Required</span>{{/model.requires_mfa|bool}}
                        {{^model.requires_mfa|bool}}<span class="badge text-bg-secondary">Not required</span>{{/model.requires_mfa|bool}}
                        <a href="#" class="small ms-2" data-action="manage-passkeys">Manage passkeys</a>
                    </div>
                </div>
            `,
            ...options
        });
        this.connections = [];
    }

    async onBeforeRender() {
        try {
            const resp = await rest.GET('/api/account/oauth_connection', { user: this.model.id });
            const results = resp?.data?.results || resp?.data || [];
            this.connections = Array.isArray(results) ? results : [];
        } catch (e) {
            this.connections = [];
        }
    }

    // ── Computed properties ─────────────────────────

    get accountType() {
        const m = this.model;
        if (m.get('is_superuser')) return 'Superuser';
        if (m.get('is_staff'))     return 'Staff';
        return 'User';
    }
    get hasEmail()     { return !!this.model?.get?.('email'); }
    get hasPhone()     { return !!this.model?.get?.('phone_number'); }
    get hasTimezone()  { return !!this.model?.get?.('metadata')?.timezone; }
    get timezone()     { return this.model?.get?.('metadata')?.timezone || ''; }

    /** Trusted HTML — providers list rendered as small inline badges. */
    get linkedProvidersHtml() {
        if (!this.connections.length) {
            return '<span class="text-secondary fst-italic">No linked accounts</span>';
        }
        return this.connections.map(c => {
            const icon = PROVIDER_ICONS[c.provider] || 'bi-link-45deg';
            const safeProvider = escapeHtml(String(c.provider || ''));
            const emailPart = c.email ? ` · ${escapeHtml(String(c.email))}` : '';
            return `<span class="badge text-bg-light border me-1"><i class="bi ${escapeHtml(icon)} me-1"></i>${safeProvider}${emailPart}</span>`;
        }).join('');
    }

    // No section-local action handlers. Edit pencils dispatch
    // `data-action="edit-..."` which bubbles up to UserView's real
    // handlers via EventDelegate's normal child→parent flow.
}


// ── Permissions section ────────────────────────────────────
//
// Backed by a single FormView with `autosaveModelField: true`. Toggle a
// switch and FormView batches the change into `model.save({ "permissions.<name>": true })`
// — the backend merges the dotted key into the `permissions` JSONField.
// Same pattern as MemberPermissionsSection in MemberView.
//
// The fields are pre-built on the User model:
//   User.CATEGORY_PERMISSIONS         — broad domain-level grants (Common)
//   User.GRANULAR_PERMISSION_TABS[].permissions — fine-grained per-domain (Advanced)
//   User._permSwitch(p)               — produces { name: 'permissions.<p>', type: 'switch', columns: 6, ... }
//
// We compose them into a single tabset so the user gets the `Categories` tab
// plus one tab per granular domain, all in one FormView.

class UserPermissionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'user-permissions-section',
            template: `
                <div class="detail-section-eyebrow">Permissions</div>
                <p class="text-secondary small mb-3">Toggles autosave as soon as you flip them.</p>
                <div data-container="user-permissions-form"></div>
            `,
            ...options
        });
    }

    async onInit() {
        const _ps = User._permSwitch;
        const tabs = [
            { label: 'Categories', fields: (User.CATEGORY_PERMISSIONS || []).map(_ps) },
            ...(User.GRANULAR_PERMISSION_TABS || []).map(tab => ({
                label: tab.label,
                fields: (tab.permissions || []).map(_ps)
            }))
        ];

        this.formView = new FormView({
            containerId: 'user-permissions-form',
            fields: [{ type: 'tabset', tabs }],
            model: this.model,
            autosaveModelField: true
        });
        this.addChild(this.formView);
    }
}


// ── Devices section (TabView · Browser / Push) ─────────────────

/**
 * Two-tab layout: "Browser" and "Push" each render their own ListView
 * against the corresponding collection. Real Collections so ListView's
 * built-in refresh / pagination / search work natively — no synthetic
 * array, no custom toolbar buttons. Click a row → open DeviceView /
 * PushDeviceView in a Modal.detail.
 */
class UserDevicesSection extends View {
    constructor(options = {}) {
        const { devicesCollection, pushDevicesCollection, ...rest } = options;
        super({
            className: 'user-devices-section',
            template: `
                <div class="detail-section-eyebrow">Devices &amp; sessions</div>
                <div data-container="user-devices-tabs"></div>
            `,
            ...rest
        });
        this.devicesCollection     = devicesCollection;
        this.pushDevicesCollection = pushDevicesCollection;
    }

    async onInit() {
        this.browserList = new ListView({
            collection: this.devicesCollection,
            paginated: true,
            paginationMode: 'pages',
            pageSize: 5,
            clickAction: 'view',
            searchable: true,
            searchPlaceholder: 'Search browser devices…',
            hideActivePillNames: ['user'],
            onItemClick: (model) => Modal.detail(new DeviceView({ model })),
            emptyMessage: 'No browser devices on file.',
            itemTemplate: `
                <div class="user-device-row" role="button">
                    <div class="user-device-icon"><i class="bi bi-laptop"></i></div>
                    <div class="user-device-info">
                        <div class="user-device-label">{{model.device_info.user_agent.family|default:'Unknown browser'}} {{model.device_info.user_agent.major}} · {{model.device_info.os.family|default:'Unknown OS'}} {{model.device_info.os.major}}</div>
                        <div class="user-device-meta">
                            {{model.last_seen|relative|default:'never'}}
                            {{#model.duid}} · <code>{{model.duid|truncate_middle(20)}}</code>{{/model.duid}}
                        </div>
                    </div>
                    <span class="badge text-bg-info">Browser</span>
                </div>
            `
        });
        this.browserList.onTabActivated = async () => {
            await this.devicesCollection?.fetch?.().catch(() => {});
        };

        this.pushList = new ListView({
            collection: this.pushDevicesCollection,
            paginated: true,
            paginationMode: 'pages',
            pageSize: 5,
            clickAction: 'view',
            searchable: true,
            searchPlaceholder: 'Search push devices…',
            hideActivePillNames: ['user'],
            onItemClick: (model) => Modal.detail(new PushDeviceView({ model })),
            emptyMessage: 'No push devices on file.',
            itemTemplate: `
                <div class="user-device-row" role="button">
                    <div class="user-device-icon"><i class="bi bi-bell"></i></div>
                    <div class="user-device-info">
                        <div class="user-device-label">{{model.device_info.device.family|default:'Push device'}}{{#model.device_info.os.family}} · {{model.device_info.os.family}} {{model.device_info.os.major}}{{/model.device_info.os.family}}</div>
                        <div class="user-device-meta">
                            {{model.last_seen|relative|default:'never'}}
                            {{#model.duid}} · <code>{{model.duid|truncate_middle(20)}}</code>{{/model.duid}}
                        </div>
                    </div>
                    <span class="badge text-bg-primary"><i class="bi bi-bell me-1"></i>Push</span>
                </div>
            `
        });
        this.pushList.onTabActivated = async () => {
            await this.pushDevicesCollection?.fetch?.().catch(() => {});
        };

        this.tabView = new TabView({
            containerId: 'user-devices-tabs',
            tabs: {
                'Browser': this.browserList,
                'Push':    this.pushList
            },
            activeTab: 'Browser'
        });
        this.addChild(this.tabView);
    }
}


// ── Audit section (TabView of three TableViews) ──────────────

class UserAuditSection extends View {
    constructor(options = {}) {
        const {
            eventsCollection,
            activityCollection,
            objectLogsCollection,
            ...rest
        } = options;

        super({
            className: 'user-audit-section',
            template: `
                {{#hasDisableHistory|bool}}
                <div class="detail-section-eyebrow">Disable history</div>
                <div class="user-disable-history accordion mb-3" id="user-disable-history">
                    {{#disableHistory}}
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button"
                                    data-bs-toggle="collapse" data-bs-target="#disable-history-{{.idx}}">
                                <span class="badge text-bg-{{.tone}} me-2">{{.label}}</span>
                                <span class="text-secondary me-2">{{.atRel}}</span>
                                {{#.byUsername|bool}}<span class="me-2">by <code>{{.byUsername}}</code></span>{{/.byUsername|bool}}
                                {{#.reactivated|bool}}<span class="ms-auto badge text-bg-light border">Reactivated</span>{{/.reactivated|bool}}
                            </button>
                        </h2>
                        <div id="disable-history-{{.idx}}" class="accordion-collapse collapse" data-bs-parent="#user-disable-history">
                            <div class="accordion-body small">
                                <div><strong>Disabled:</strong> {{.atFmt}}</div>
                                {{#.note|bool}}<div class="mt-1"><strong>Note:</strong> {{.note}}</div>{{/.note|bool}}
                                {{#.reactivated|bool}}
                                    <div class="mt-2 pt-2 border-top">
                                        <div><strong>Reactivated:</strong> {{.reactivatedAtFmt}}{{#.reactivatedBy|bool}} by <code>{{.reactivatedBy}}</code>{{/.reactivatedBy|bool}}</div>
                                        {{#.reactivatedNote|bool}}<div class="mt-1"><strong>Note:</strong> {{.reactivatedNote}}</div>{{/.reactivatedNote|bool}}
                                    </div>
                                {{/.reactivated|bool}}
                            </div>
                        </div>
                    </div>
                    {{/disableHistory}}
                </div>
                {{/hasDisableHistory|bool}}
                <div class="detail-section-eyebrow">Audit</div>
                <div data-container="user-audit-tabs"></div>
            `,
            ...rest
        });

        this.eventsCollection     = eventsCollection;
        this.activityCollection   = activityCollection;
        this.objectLogsCollection = objectLogsCollection;
    }

    // ── Disable history (collapsed accordion at the top) ──────────────

    get hasDisableHistory() {
        return Array.isArray(_disableBlock(this.model)?.history) && _disableBlock(this.model).history.length > 0;
    }

    /** Trusted HTML — every interpolated value is escaped via Mustache `{{ }}`. */
    get disableHistory() {
        const list = _disableBlock(this.model)?.history || [];
        return list.map((entry, idx) => {
            const reasonMap = DISABLE_REASON_BADGES[entry?.reason] || { label: 'Inactive', variant: 'secondary' };
            const at = entry?.at;
            const reactivatedAt = entry?.reactivated_at;
            return {
                idx,
                label:            reasonMap.label,
                tone:             reasonMap.variant,
                atFmt:            at ? (dataFormatter.apply('datetime', at) || at) : '',
                atRel:            at ? (dataFormatter.apply('relative', at) || '') : '',
                byUsername:       entry?.by_username || '',
                note:             entry?.note || '',
                reactivated:      !!reactivatedAt,
                reactivatedAtFmt: reactivatedAt ? (dataFormatter.apply('datetime', reactivatedAt) || reactivatedAt) : '',
                reactivatedBy:    entry?.reactivated_by_username || '',
                reactivatedNote:  entry?.reactivated_note || ''
            };
        });
    }

    async onInit() {
        // Tables → ListViews per the Modal.detail width constraint. Each
        // tab is a chronological feed (timestamp + level/category badge +
        // kind/title + message). Show-more pagination so the dataset can
        // grow without forcing numbered pages into 500px.

        // Activity (LogList scoped to user) — most common entry first
        this.activityTable = new ListView({
            collection: this.activityCollection,
            searchable: true,
            searchPlaceholder: 'Search activity…',
            paginated: true,
            paginationMode: 'pages',
            pageSize: 5,
            clickAction: 'view',
            hideActivePillNames: ['uid'],
            emptyMessage: 'No activity recorded yet.',
            ...groupByDay('created'),
            itemTemplate: `
                <div class="user-audit-row user-audit-row-{{model.level|levelTone}}">
                    <div class="user-audit-icon"><i class="bi {{model.level|levelIcon}}"></i></div>
                    <div class="user-audit-body">
                        <div class="user-audit-title">{{#model.kind}}{{model.kind}}{{/model.kind}}{{^model.kind}}{{model.level|default:'event'}}{{/model.kind}}</div>
                        <div class="user-audit-detail">{{model.log|default:'(no message)'}}</div>
                        {{#model.path}}<div class="user-audit-path font-monospace">{{model.path}}</div>{{/model.path}}
                    </div>
                    <div class="user-audit-time" title="{{model.created|datetime}}">{{model.created|relative}}</div>
                </div>
            `
        });
        this.activityTable.onTabActivated = async () => {
            await this.activityCollection?.fetch?.().catch(() => {});
        };

        // Events (IncidentEventList scoped to this user) — incident-pipeline emits.
        this.incidentsTable = new ListView({
            collection: this.eventsCollection,
            searchable: true,
            searchPlaceholder: 'Search events…',
            paginated: true,
            paginationMode: 'pages',
            pageSize: 5,
            clickAction: 'view',
            hideActivePillNames: ['model_id', 'model_name'],
            emptyMessage: 'No events for this user.',
            ...groupByDay('created'),
            itemTemplate: `
                <div class="user-audit-row user-audit-row-info">
                    <div class="user-audit-icon"><i class="bi bi-shield-exclamation"></i></div>
                    <div class="user-audit-body">
                        <div class="user-audit-title">{{#model.title}}{{model.title}}{{/model.title}}{{^model.title}}{{model.category|default:'event'}}{{/model.title}}</div>
                        {{#model.description}}<div class="user-audit-detail">{{model.description}}</div>{{/model.description}}
                        {{#model.category}}<div class="user-audit-meta"><span class="badge text-bg-secondary">{{model.category}}</span></div>{{/model.category}}
                    </div>
                    <div class="user-audit-time" title="{{model.created|datetime}}">{{model.created|relative}}</div>
                </div>
            `
        });
        this.incidentsTable.onTabActivated = async () => {
            await this.eventsCollection?.fetch?.().catch(() => {});
        };

        // Audit Log (LogList filtered to this user-as-record).
        this.objectTable = new ListView({
            collection: this.objectLogsCollection,
            searchable: true,
            searchPlaceholder: 'Search audit log…',
            paginated: true,
            paginationMode: 'pages',
            pageSize: 5,
            clickAction: 'view',
            permissions: 'view_logs',
            hideActivePillNames: ['model_id', 'model_name'],
            emptyMessage: 'No record changes logged.',
            ...groupByDay('created'),
            itemTemplate: `
                <div class="user-audit-row user-audit-row-{{model.level|levelTone}}">
                    <div class="user-audit-icon"><i class="bi {{model.level|levelIcon}}"></i></div>
                    <div class="user-audit-body">
                        <div class="user-audit-title">{{#model.kind}}{{model.kind}}{{/model.kind}}{{^model.kind}}{{model.level|default:'event'}}{{/model.kind}}</div>
                        <div class="user-audit-detail">{{model.log|default:'(no message)'}}</div>
                    </div>
                    <div class="user-audit-time" title="{{model.created|datetime}}">{{model.created|relative}}</div>
                </div>
            `
        });
        this.objectTable.onTabActivated = async () => {
            await this.objectLogsCollection?.fetch?.().catch(() => {});
        };

        this.tabView = new TabView({
            containerId: 'user-audit-tabs',
            tabs: {
                'Activity':  this.activityTable,
                'Events':    this.incidentsTable,
                'Audit Log': this.objectTable
            },
            activeTab: 'Activity'
        });
        this.addChild(this.tabView);
    }
}


// ── API Keys section (TableView) ────────────────────────────

/**
 * Synthesized-collection-backed TableView. The /api/account/api_keys
 * endpoint returns a flat list (not a Collection-shaped paginated
 * response), so we manage our own array + re-render the table on
 * mutation.
 */
class UserApiKeysSection extends View {
    constructor(options = {}) {
        super({
            className: 'user-api-keys-section',
            template: `
                <div class="detail-section-eyebrow">API Keys</div>
                <div data-container="user-api-keys-token"></div>
                <div data-container="user-api-keys-table"></div>
            `,
            ...options
        });
        this.apiKeys = [];
        this.generatedToken = null;
    }

    async onInit() {
        // Generated-token banner (only rendered when present)
        this.tokenView = new View({
            containerId: 'user-api-keys-token',
            template: `
                {{#hasToken|bool}}
                <div class="alert alert-success">
                    <div class="fw-semibold mb-2">Generated API Key</div>
                    <div class="d-flex gap-2 align-items-center">
                        <code class="flex-grow-1">{{token}}</code>
                        <button type="button" class="btn btn-sm btn-outline-secondary" data-action="copy-token"><i class="bi bi-clipboard"></i></button>
                    </div>
                    <div class="small mt-2 text-danger fw-semibold"><i class="bi bi-exclamation-circle me-1"></i>This token will not be shown again. Copy it now.</div>
                </div>
                {{/hasToken|bool}}
            `
        });
        Object.defineProperty(this.tokenView, 'token',    { get: () => this.generatedToken || '' });
        Object.defineProperty(this.tokenView, 'hasToken', { get: () => !!this.generatedToken });
        this.tokenView.onActionCopyToken = async () => this.onActionCopyToken();
        this.addChild(this.tokenView);

        this.tableView = new TableView({
            containerId: 'user-api-keys-table',
            collection: this.apiKeys,
            showAdd: false,
            showExport: false,
            showFullscreen: false,
            searchable: false,
            paginated: false,
            sortable: true,
            emptyMessage: 'No API keys for this user.',
            columns: [
                {
                    key: 'name', label: 'Key', sortable: true,
                    template: `
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-key text-secondary"></i>
                            <div class="min-w-0">
                                <div class="fw-semibold small">{{model.name|default:'API Key'}}</div>
                                <div class="text-secondary small"><code>{{tokenPreview}}</code></div>
                            </div>
                        </div>
                    `
                },
                {
                    key: 'is_active', label: 'Status', width: '100px',
                    template: `
                        {{#model.is_active|bool}}<span class="badge text-bg-success">Active</span>{{/model.is_active|bool}}
                        {{^model.is_active|bool}}<span class="badge text-bg-secondary">Inactive</span>{{/model.is_active|bool}}
                    `
                },
                { key: 'created', label: 'Created', formatter: 'date', sortable: true, width: '120px' },
                { key: 'expires', label: 'Expires', formatter: "default('Never')", width: '120px' },
                { key: 'last_used', label: 'Last used', formatter: 'relative', width: '140px' },
                {
                    key: 'allowed_ips', label: 'Allowed IPs',
                    template: `{{#hasIps|bool}}{{ipsLabel}}{{/hasIps|bool}}{{^hasIps|bool}}<span class="text-secondary">Any</span>{{/hasIps|bool}}`
                }
            ],
            actions: ['delete'],
            onItemDelete: async (model) => this._revokeKey(model),
            toolbarButtons: [
                {
                    label: 'Generate Key',
                    icon: 'bi bi-plus-lg',
                    variant: 'primary',
                    handler: () => this.onActionGenerateKey()
                }
            ]
        });
        this.addChild(this.tableView);
    }

    async onAfterRender() {
        await super.onAfterRender();
        if (!this._loadedOnce) {
            this._loadedOnce = true;
            this._loadKeys().catch(() => {});
        }
    }

    async _loadKeys() {
        try {
            const resp = await rest.GET(
                '/api/account/api_keys',
                { user: this.model.id },
                {},
                { dataOnly: true }
            );
            const list = resp.success && Array.isArray(resp.data) ? resp.data : [];
            // Augment each row with computed display fields the row template binds to
            this.apiKeys = list.map(k => this._decorate(k));
            this.emit('count:changed', this.apiKeys.length);
            if (this.tableView) {
                this.tableView.collection = this.apiKeys;
                if (this.tableView.isMounted()) this.tableView.render().catch(() => {});
            }
        } catch (e) {
            this.apiKeys = [];
            this.emit('count:changed', 0);
        }
    }

    _decorate(key) {
        const ips = Array.isArray(key.allowed_ips) ? key.allowed_ips : [];
        return {
            ...key,
            tokenPreview: key.token_prefix ? `${key.token_prefix}…` : '••••••••',
            hasIps: ips.length > 0,
            ipsLabel: ips.length ? ips.join(', ') : ''
        };
    }

    async _revokeKey(rowModel) {
        // TableView passes us a `Model` wrapper; pull the underlying id out of either shape
        const id = rowModel?.get?.('id') ?? rowModel?.id;
        if (!id) return;
        const confirmed = await Modal.confirm(
            'Revoke this API key? Any applications using it will lose access immediately.',
            'Revoke API Key'
        );
        if (!confirmed) return;
        const resp = await rest.DELETE(`/api/account/api_keys/${id}`, {}, {}, { dataOnly: true });
        if (resp.success) {
            this.getApp()?.toast?.success('API key revoked');
            this.generatedToken = null;
            await this._refreshTokenView();
            await this._loadKeys();
        } else {
            this.getApp()?.toast?.error(resp.message || 'Failed to revoke API key');
        }
    }

    async onActionGenerateKey() {
        const data = await Modal.form({
            title: `Generate API Key for ${this.model.get('display_name') || this.model.get('email')}`,
            icon: 'bi-key',
            fields: [
                { name: 'name', type: 'text', label: 'Key Name', required: true,
                  placeholder: 'e.g., CI/CD Pipeline, Mobile App',
                  help: 'A descriptive name to identify this key.' },
                { name: 'allowed_ips', type: 'text', label: 'Allowed IPs',
                  placeholder: 'e.g., 203.0.113.0/24, 10.0.0.1',
                  help: 'Optional. Comma-separated IP addresses or CIDR ranges.' },
                { name: 'expire_days', type: 'select', label: 'Expiration', value: '90',
                  options: [
                      { value: '30', label: '30 days' },
                      { value: '60', label: '60 days' },
                      { value: '90', label: '90 days' },
                      { value: '180', label: '180 days' },
                      { value: '360', label: '360 days' }
                  ] }
            ]
        });
        if (!data) return true;

        const body = {
            uid: this.model.id,
            name: data.name,
            expire_days: parseInt(data.expire_days || '90', 10)
        };
        const ipsStr = (data.allowed_ips || '').trim();
        if (ipsStr) {
            body.allowed_ips = ipsStr.split(',').map(ip => ip.trim()).filter(Boolean);
        }

        const resp = await rest.POST('/api/auth/manage/generate_api_key', body, {}, { dataOnly: true });
        if (resp.success && resp.data?.token) {
            this.generatedToken = resp.data.token;
            this.getApp()?.toast?.success('API key generated');
            await this._refreshTokenView();
            await this._loadKeys();
        } else {
            this.getApp()?.toast?.error(resp.message || 'Failed to generate API key');
        }
        return true;
    }

    async onActionCopyToken() {
        if (!this.generatedToken) return true;
        try {
            await navigator.clipboard.writeText(this.generatedToken);
            this.getApp()?.toast?.success('Token copied to clipboard');
        } catch {
            this.getApp()?.toast?.error('Failed to copy token');
        }
        return true;
    }

    async _refreshTokenView() {
        if (this.tokenView?.isMounted()) await this.tokenView.render();
    }
}


// ── UserView (assembly) ────────────────────────────────────

class UserView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new User(options.data || {});
        const userId = model.get('id');

        // Shared collections — Overview + section views read from these.
        const devicesCollection = new UserDeviceList({
            params: { user: userId, size: 25 }
        });
        const pushDevicesCollection = new PushDeviceList({
            params: { user: userId, size: 25 }
        });
        const membersCollection = new MemberList({
            params: { user: userId, size: 10 }
        });
        const loginsCollection = new LoginEventList({
            params: { user: userId, size: 10 }
        });
        const eventsCollection = new IncidentEventList({
            params: { size: 25, model_name: 'account.User', model_id: userId, sort: '-created' }
        });
        const activityCollection = new LogList({
            params: { size: 25, uid: userId, sort: '-created' }
        });
        const objectLogsCollection = new LogList({
            params: { size: 25, model_name: 'account.User', model_id: userId, sort: '-created' }
        });

        // Section views
        const overviewSection = new UserOverviewSection({
            model,
            devicesCollection,
            pushDevicesCollection,
            membersCollection,
            loginsCollection,
            activityCollection,
            eventsCollection,
            objectLogsCollection
        });

        const profileSection     = new UserProfileSection({ model });
        const permissionsSection = new UserPermissionsSection({ model });
        const apiKeysSection     = new UserApiKeysSection({ model });

        // Groups — ListView of MemberList scoped to this user. Each row
        // is a group-membership card: name + kind badge + joined-date,
        // with the per-group permission keys listed below.
        const groupsSection = new ListView({
            collection: membersCollection,
            title: 'Groups',
            searchable: true,
            searchPlaceholder: 'Search groups…',
            paginated: true,
            paginationMode: 'pages',
            pageSize: 5,
            clickAction: 'view',
            hideActivePillNames: ['user'],
            viewDialogOptions: { header: false, noBodyPadding: true, buttons: [] },
            emptyMessage: 'This user has no group memberships.',
            itemTemplate: `
                <div class="user-feed-row" role="button">
                    <div class="user-feed-meta">
                        <strong>{{model.group.name|default:'—'}}</strong>
                        {{#model.group.kind}}<span class="badge text-bg-secondary">{{model.group.kind}}</span>{{/model.group.kind}}
                        <span class="ms-auto text-secondary small">Joined {{model.created|date|default:'—'}}</span>
                    </div>
                    {{#model.permissions|keys}}
                        <div class="user-feed-body small text-secondary">
                            {{#model.permissions|keys}}<span class="badge text-bg-light border me-1">{{.}}</span>{{/model.permissions|keys}}
                        </div>
                    {{/model.permissions|keys}}
                </div>
            `
        });

        const devicesSection = new UserDevicesSection({
            model,
            devicesCollection,
            pushDevicesCollection
        });

        // Locations — preserve existing TabView (map + login table)
        const loginMapView = new LoginLocationMapView({
            userId,
            height: 300,
            mapStyle: 'dark'
        });
        const loginEventsTable = new ListView({
            collection: loginsCollection,
            searchable: true,
            searchPlaceholder: 'Search logins…',
            paginated: true,
            paginationMode: 'pages',
            pageSize: 5,
            clickAction: 'view',
            hideActivePillNames: ['user'],
            emptyMessage: 'No login events on file.',
            ...groupByDay('created'),
            itemTemplate: `
                <div class="user-login-row">
                    <span class="user-login-dot user-login-dot-{{model.event_type|loginTone}}"></span>
                    <div class="user-login-body">
                        <div class="user-login-title">{{#model.city}}{{model.city}}{{/model.city}}{{^model.city}}—{{/model.city}}{{#model.region}}, {{model.region}}{{/model.region}}{{#model.country_code}} · {{model.country_code}}{{/model.country_code}}</div>
                        <div class="user-login-meta small text-secondary">
                            <code>{{model.ip_address}}</code>{{#model.source}} · {{model.source}}{{/model.source}}
                        </div>
                    </div>
                    <div class="user-login-time" title="{{model.created|datetime}}">{{model.created|relative}}</div>
                </div>
            `
        });
        loginEventsTable.onTabActivated = async () => {
            await loginEventsTable.collection?.fetch();
        };
        const locationsSection = new TabView({
            tabs: {
                'Map':    loginMapView,
                'Logins': loginEventsTable
            },
            activeTab: 'Map'
        });

        const auditSection = new UserAuditSection({
            model,
            eventsCollection,
            activityCollection,
            objectLogsCollection
        });

        const notificationsSection = new AdminNotificationsSection({ model });
        const personalSection      = new AdminPersonalSection({ model });
        const securitySection      = new AdminSecuritySection({ model });
        const connectedSection     = new AdminConnectedSection({ model });
        const metadataSection      = new AdminMetadataSection({ model });

        // Sidebar layout — Identity / Access / Activity / Settings / Metadata
        const sections = [
            { key: 'Overview',      label: 'Overview',      icon: 'bi-grid-1x2',         view: overviewSection },
            { key: 'Profile',       label: 'Profile',       icon: 'bi-person',           view: profileSection },
            { key: 'Personal',      label: 'Personal',      icon: 'bi-card-text',        view: personalSection },
            { key: 'Security',      label: 'Security',      icon: 'bi-shield-lock',      view: securitySection },
            { key: 'OAuth',         label: 'OAuth',         icon: 'bi-link-45deg',       view: connectedSection },
            { type: 'divider', label: 'Access' },
            { key: 'Groups',        label: 'Groups',        icon: 'bi-people',           view: groupsSection },
            { key: 'Permissions',   label: 'Permissions',   icon: 'bi-shield-check',     view: permissionsSection },
            { key: 'ApiKeys',       label: 'API Keys',      icon: 'bi-key',              view: apiKeysSection },
            { type: 'divider', label: 'Activity' },
            { key: 'Devices',       label: 'Devices',       icon: 'bi-laptop',           view: devicesSection },
            { key: 'Locations',     label: 'Locations',     icon: 'bi-geo-alt',          view: locationsSection },
            { key: 'Audit',         label: 'Audit',         icon: 'bi-clock-history',    view: auditSection,
              permissions: 'view_logs' },
            { type: 'divider', label: 'Settings' },
            { key: 'Notifications', label: 'Notifications', icon: 'bi-bell',             view: notificationsSection },
            { key: 'Metadata',      label: 'Metadata',      icon: 'bi-braces',           view: metadataSection }
        ];

        // Header chips — only render when value exists (DetailHeaderView
        // automatically filters chips with `when:` callbacks). Online
        // status lives in the header aux (presence dot + label) — no
        // separate chip here.
        const chips = [
            { text: m => {
                if (m.get('is_superuser')) return 'Superuser';
                if (m.get('is_staff'))     return 'Staff';
                return null;
              }, variant: 'info',
              when: m => m.get('is_staff') || m.get('is_superuser') },
            { icon: 'bi-shield-check', text: 'Email verified', variant: 'light',
              when: m => !!m.get('is_email_verified') },
            { icon: 'bi-shield-check', text: 'Phone verified', variant: 'light',
              when: m => !!m.get('is_phone_verified') && !!m.get('phone_number') },
            { text: '2FA enabled', variant: 'light',
              when: m => !!m.get('requires_mfa') }
            // Locked chip removed — the header aux now renders a
            // reason-keyed status badge driven by `disable.reason`.
        ];

        // Context menu — supported admin actions only.
        // Groups separated by dividers: identity / auth / state.
        // Email/phone verification flips are SUPERUSER_ONLY_FIELDS — surfaced
        // through the dedicated identity-change cards (Phase 3), not here.
        const contextItems = [
            { label: 'Edit User',              action: 'edit-user',              icon: 'bi-pencil' },
            { label: 'Change Avatar',          action: 'change-avatar',          icon: 'bi-image' },
            { label: 'Clear Avatar',           action: 'clear-avatar',           icon: 'bi-person-x' },
            { type: 'divider' },
            { label: 'Send Password Reset',    action: 'reset-password',         icon: 'bi-envelope' },
            { label: 'Send Magic Login Link',  action: 'send-magic-link',        icon: 'bi-link-45deg' },
            { label: 'Revoke All Sessions',    action: 'revoke-all-sessions',    icon: 'bi-box-arrow-right' }
        ];

        super({
            className: 'user-view',
            ...options,
            model,
            header: {
                icon: 'bi-person-circle',
                iconToneFn: m => {
                    if (!m.get('is_active'))   return null;
                    if (m.get('is_superuser')) return 'danger';
                    if (m.get('is_staff'))     return 'info';
                    return 'primary';
                },
                // Render the user's actual avatar (with generic-SVG fallback)
                // in the icon slot. Click opens the change-avatar action.
                iconHtml: m => `<button type="button" class="dh-icon-action" data-action="change-avatar" data-bs-toggle="tooltip" title="Change avatar">${dataFormatter.apply('avatar', m.get('avatar'))}</button>`,
                titleField: 'display_name',
                titleFn: m => m.get('display_name')
                    || m.get('username')
                    || m.get('email')
                    || (m.get('id') != null ? `User #${m.get('id')}` : 'Loading user…'),
                subtitlePath: '_subtitle',
                subtitlePlaceholder: 'No contact info on file',
                chips,
                // active toggle is emitted from auxFn so the right gutter can
                // be a 2-row block (presence + toggle on top, "last active" below)
                actions: [],   // Magic link / reset password live in the context menu
                auxFn: m => _buildHeaderAux(m),
                contextMenu: { items: contextItems }
            },
            sections,
            activeSection: 'Overview'
        });

        // Stash references for action handlers + cross-section wiring
        this.devicesCollection      = devicesCollection;
        this.pushDevicesCollection  = pushDevicesCollection;
        this.membersCollection      = membersCollection;
        this.loginsCollection       = loginsCollection;
        this.eventsCollection       = eventsCollection;
        this.activityCollection     = activityCollection;
        this.objectLogsCollection   = objectLogsCollection;

        this.overviewSection      = overviewSection;
        this.profileSection       = profileSection;
        this.personalSection      = personalSection;
        this.securitySection      = securitySection;
        this.connectedSection     = connectedSection;
        this.permissionsSection   = permissionsSection;
        this.apiKeysSection       = apiKeysSection;
        this.groupsSection        = groupsSection;
        this.devicesSection       = devicesSection;
        this.locationsSection     = locationsSection;
        this.auditSection         = auditSection;
        this.notificationsSection = notificationsSection;
        this.metadataSection      = metadataSection;

        this._refreshComputedFields();
    }

    async onAfterBuild() {
        // API keys count -> sidebar badge
        this.apiKeysSection.on('count:changed', (n) => {
            this.setBadge('ApiKeys', n > 0 ? { text: String(n), variant: 'muted' } : null);
        });

        // Sidebar badges from shared collections — read TOTAL row counts
        // from `collection.meta.count` (set by Collection.parse from the
        // API response), not just the locally-fetched page length.
        const totalOf = (col) => col?.meta?.count ?? col?.models?.length ?? 0;

        const updateGroupsBadge = () => {
            const n = totalOf(this.membersCollection);
            this.setBadge('Groups', n > 0 ? { text: String(n), variant: 'muted' } : null);
        };
        const updateDevicesBadge = () => {
            const total = totalOf(this.devicesCollection) + totalOf(this.pushDevicesCollection);
            this.setBadge('Devices', total > 0 ? { text: String(total), variant: 'muted' } : null);
        };
        const updateAuditBadge = () => {
            const total =
                totalOf(this.eventsCollection) +
                totalOf(this.activityCollection) +
                totalOf(this.objectLogsCollection);
            this.setBadge('Audit', total > 0 ? { text: String(total), variant: 'muted' } : null);
        };
        const refreshHeader = () => {
            this._refreshComputedFields();
            if (this.headerView?.isMounted()) this.headerView.render().catch(() => {});
        };

        this.membersCollection.on('fetch:success',     updateGroupsBadge,   this);
        this.devicesCollection.on('fetch:success',     updateDevicesBadge,  this);
        this.pushDevicesCollection.on('fetch:success', updateDevicesBadge,  this);
        this.eventsCollection.on('fetch:success',      updateAuditBadge,    this);
        this.activityCollection.on('fetch:success',    updateAuditBadge,    this);
        this.objectLogsCollection.on('fetch:success',  updateAuditBadge,    this);
        this.loginsCollection.on('fetch:success',      refreshHeader,       this);

        // Fire-and-forget initial fetches so badges/KPIs/header populate
        // without waiting for the user to navigate.
        this.devicesCollection.fetch().catch(() => {});
        this.pushDevicesCollection.fetch().catch(() => {});
        this.membersCollection.fetch().catch(() => {});
        this.loginsCollection.fetch().catch(() => {});
        this.eventsCollection.fetch().catch(() => {});
        this.activityCollection.fetch().catch(() => {});
        this.objectLogsCollection.fetch().catch(() => {});
    }

    /** Force-verify or unverify the email/phone (admin override). */
    async _setVerification(field, value, label) {
        const verb = value ? 'Mark as verified' : 'Mark as unverified';
        const ok = await Modal.confirm(
            `${verb} <strong>${escapeHtml(label.toLowerCase())}</strong> for this user?`,
            `${verb} ${label}`
        );
        if (!ok) return;
        try {
            const resp = await this.model.save({ [field]: value });
            if (resp?.status >= 400) throw new Error('Save failed');
            this.model.set(field, value);
            this.getApp()?.toast?.success(`${label} ${value ? 'marked verified' : 'marked unverified'}`);
            if (this.profileSection?.isMounted()) this.profileSection.render().catch(() => {});
            if (this.headerView?.isMounted())     this.headerView.render().catch(() => {});
        } catch (err) {
            this.getApp()?.toast?.error(`Failed to update: ${err.message}`);
        }
    }

    /**
     * Compute the synthetic `_subtitle` field the header binds to.
     * Format: "{email} · {phone}" — the "last seen" / "active ago"
     * read-out lives in the header aux (top right), so we don't repeat
     * it here.
     */
    _refreshComputedFields() {
        const m = this.model;
        const parts = [];
        if (m.get('email')) parts.push(m.get('email'));
        if (m.get('phone_number')) parts.push(m.get('phone_number'));
        m.attributes._subtitle = parts.join(' · ');
    }

    // ── Header actions ─────────────────────────────────────

    async onActionSendMagicLink() {
        const email = this.model.get('email');
        if (!email) {
            this.getApp()?.toast?.error('User has no email on file');
            return true;
        }
        const confirmed = await Modal.confirm(
            `Send a magic login link to <strong>${escapeHtml(email)}</strong>?`,
            'Send Magic Login Link'
        );
        if (!confirmed) return true;

        const resp = await rest.POST('/api/auth/magic-link', { email });
        if (resp.success) {
            this.getApp()?.toast?.success('Magic login link sent');
        } else {
            this.getApp()?.toast?.error(resp.message || 'Failed to send magic link');
        }
        return true;
    }

    async onActionResetPassword() {
        const email = this.model.get('email');
        if (!email) {
            this.getApp()?.toast?.error('User has no email on file');
            return true;
        }
        const confirmed = await Modal.confirm(
            `Send a password reset email to <strong>${escapeHtml(email)}</strong>?`,
            'Send Password Reset'
        );
        if (!confirmed) return true;

        const resp = await rest.POST('/api/auth/password/reset', { email });
        if (resp.success) {
            this.getApp()?.toast?.success('Password reset email sent');
        } else {
            this.getApp()?.toast?.error(resp.message || 'Failed to send password reset');
        }
        return true;
    }

    // ── Profile section pencils ────────────────────────────

    async onActionEditDisplayName() {
        const name = await Modal.prompt(
            'Display name:',
            'Edit Display Name',
            { defaultValue: this.model.get('display_name') || '' }
        );
        if (typeof name !== 'string' || !name.trim()) return true;
        await this._savePersonalField({ display_name: name.trim() }, 'Display name');
        return true;
    }

    async onActionEditUsername() {
        const username = await Modal.prompt(
            'Username:',
            'Edit Username',
            { defaultValue: this.model.get('username') || '' }
        );
        if (typeof username !== 'string' || !username.trim()) return true;
        await this._savePersonalField({ username: username.trim() }, 'Username');
        return true;
    }

    async onActionChangeEmail() {
        const email = await Modal.prompt(
            'Email address:',
            'Change Email',
            { defaultValue: this.model.get('email') || '' }
        );
        if (typeof email !== 'string' || !email.trim()) return true;
        await this._savePersonalField({ email: email.trim() }, 'Email');
        return true;
    }

    async onActionChangePhone() {
        const phone = await Modal.prompt(
            'Phone number:',
            'Change Phone',
            { defaultValue: this.model.get('phone_number') || '' }
        );
        if (typeof phone !== 'string' || !phone.trim()) return true;
        await this._savePersonalField({ phone_number: phone.trim() }, 'Phone number');
        return true;
    }

    async _savePersonalField(fields, label) {
        const resp = await this.model.save(fields);
        if (resp.status === 200) {
            this.getApp()?.toast?.success(`${label} updated`);
            await this._fullRefresh();
        } else {
            this.getApp()?.toast?.error(resp.message || `Failed to update ${label.toLowerCase()}`);
        }
    }

    async onActionEditAccount() {
        const resp = await Modal.modelForm({
            title: 'Edit account',
            model: this.model,
            size: 'md',
            formConfig: {
                fields: [
                    { name: 'is_active',      type: 'switch', label: 'Active',        columns: 6 },
                    { name: 'is_staff',       type: 'switch', label: 'Staff',         columns: 6 },
                    { name: 'requires_mfa',   type: 'switch', label: 'Requires MFA',  columns: 6 },
                    { name: 'metadata.timezone', type: 'text', label: 'Timezone',     columns: 12,
                      tooltip: 'IANA timezone, e.g. America/Los_Angeles' }
                ]
            }
        });
        if (resp) await this._fullRefresh();
        return true;
    }

    async onActionManageLinked() {
        let resp;
        try {
            resp = await rest.GET('/api/account/oauth_connection', { user: this.model.id });
        } catch {
            resp = null;
        }
        const results = resp?.data?.results || resp?.data || [];
        const connections = Array.isArray(results) ? results : [];

        const view = new View({
            template: () => {
                if (!connections.length) {
                    return `<div class="text-center text-secondary py-3"><i class="bi bi-plug fs-3 d-block mb-2"></i>No connected accounts</div>`;
                }
                return connections.map(c => {
                    const icon = PROVIDER_ICONS[c.provider] || 'bi-link-45deg';
                    const created = c.created
                        ? dataFormatter.apply('relative', c.created) || ''
                        : '';
                    return `
                        <div class="detail-flat-row">
                            <div class="detail-flat-row-label"><i class="bi ${escapeHtml(icon)} fs-5"></i></div>
                            <div class="detail-flat-row-value">
                                <div class="fw-semibold small text-capitalize">${escapeHtml(c.provider || '')}</div>
                                <div class="text-secondary small">${escapeHtml(c.email || '')}${created ? ` · Connected ${escapeHtml(created)}` : ''}</div>
                            </div>
                            <div class="detail-flat-row-action">
                                <button type="button" class="btn btn-sm btn-outline-danger" data-action="unlink" data-id="${escapeHtml(c.id)}"><i class="bi bi-x-lg me-1"></i>Unlink</button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        });
        view.onActionUnlink = async (event, el) => {
            const id = el.dataset.id;
            const conn = connections.find(c => String(c.id) === String(id));
            const provider = conn?.provider || 'this account';
            const confirmed = await Modal.confirm(`Unlink ${provider} for this user?`, 'Unlink Account');
            if (!confirmed) return true;
            const r = await rest.DELETE(`/api/account/oauth_connection/${id}`);
            if (r.success) {
                this.getApp()?.toast?.success(`${provider} account unlinked`);
                if (this.profileSection?.isMounted()) await this.profileSection.render();
            } else {
                this.getApp()?.toast?.error(r.message || 'Failed to unlink account');
            }
            return true;
        };

        await Modal.dialog({
            title: 'Linked accounts',
            body: view,
            size: 'md',
            buttons: [{ text: 'Close', class: 'btn-outline-secondary', dismiss: true }]
        });
        return true;
    }

    async onActionManagePasskeys() {
        const collection = new PasskeyList({ params: { user: this.model.id } });
        try { await collection.fetch(); } catch { /* ignore */ }

        const items = collection.models || [];
        const view = new View({
            template: () => {
                if (!items.length) {
                    return `<div class="text-center text-secondary py-3"><i class="bi bi-fingerprint fs-3 d-block mb-2"></i>No passkeys registered</div>`;
                }
                return items.map(p => {
                    const data = p.toJSON ? p.toJSON() : p;
                    const created = data.created
                        ? dataFormatter.apply('date', data.created) || '—'
                        : '—';
                    const lastUsed = data.last_used
                        ? dataFormatter.apply('relative', data.last_used) || 'never'
                        : 'never';
                    return `
                        <div class="detail-flat-row">
                            <div class="detail-flat-row-label"><i class="bi bi-fingerprint fs-5 text-primary"></i></div>
                            <div class="detail-flat-row-value">
                                <div class="fw-semibold small">${escapeHtml(data.friendly_name || 'Unnamed Passkey')}</div>
                                <div class="text-secondary small">Created ${escapeHtml(created)} · Last used ${escapeHtml(lastUsed)} · ${escapeHtml(String(data.sign_count || 0))} uses</div>
                            </div>
                            <div class="detail-flat-row-action">
                                <button type="button" class="btn btn-sm btn-outline-secondary" data-action="edit-passkey" data-id="${escapeHtml(data.id)}"><i class="bi bi-pencil"></i></button>
                                <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-passkey" data-id="${escapeHtml(data.id)}"><i class="bi bi-trash"></i></button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        });
        view.onActionEditPasskey = async (event, el) => {
            const id = el.dataset.id;
            const passkey = items.find(p => String(p.id) === String(id));
            if (passkey) {
                await Modal.modelForm({ title: 'Edit Passkey', model: passkey, fields: PasskeyForms.edit.fields, size: 'sm' });
            }
            return true;
        };
        view.onActionDeletePasskey = async (event, el) => {
            const id = el.dataset.id;
            const confirmed = await Modal.confirm('Delete this passkey?', 'Delete Passkey');
            if (confirmed) {
                const passkey = items.find(p => String(p.id) === String(id));
                if (passkey) {
                    await passkey.destroy();
                    this.getApp()?.toast?.success('Passkey deleted');
                }
            }
            return true;
        };

        await Modal.dialog({
            title: 'Passkeys',
            body: view,
            size: 'md',
            buttons: [{ text: 'Close', class: 'btn-outline-secondary', dismiss: true }]
        });
        return true;
    }

    // ── Context menu actions ───────────────────────────────

    async onActionEditUser() {
        const resp = await Modal.modelForm({
            title: 'Edit User',
            model: this.model,
            size: 'md',
            formConfig: User.EDIT_FORM
        });
        if (resp) await this._fullRefresh();
        return true;
    }

    /**
     * Active toggle in the header right-gutter (emitted from `_buildHeaderAux`).
     *
     * Disable (active → inactive): opens a small Modal.form for optional
     * `reason` + `note`, then POSTs the disable POST_SAVE_ACTION:
     *   `POST /api/user/<id>` body `{"disable":{"reason":"...","note":"..."}}`
     * Cancel reverts the toggle.
     *
     * Reactivate (inactive → active): no prompt. POSTs:
     *   `POST /api/user/<id>` body `{"reactivate":{}}`
     */
    async onActionToggleActive(event, element) {
        const checked = !!element.checked;
        element.disabled = true;

        try {
            if (!checked) {
                // Disabling — collect optional reason + note.
                const data = await Modal.form({
                    title: 'Disable User',
                    size: 'sm',
                    submitText: 'Disable',
                    fields: [
                        { name: 'reason', type: 'select', label: 'Reason', cols: 12,
                          help: 'Optional. Defaults to "admin" (manual block) if left blank.',
                          options: [
                              { value: '',         text: '(let backend default)' },
                              { value: 'admin',    text: 'Admin — block / policy violation' },
                              { value: 'abuse',    text: 'Abuse — banned' },
                              { value: 'inactive', text: 'Inactive — idle account' }
                          ] },
                        { name: 'note', type: 'textarea', label: 'Note', cols: 12, rows: 3,
                          placeholder: 'Optional note about why this user is being disabled.' }
                    ]
                });
                if (data === null || data === false || data === 0) {
                    // Cancelled — revert the visual toggle.
                    element.checked = true;
                    return true;
                }

                const body = {};
                if (data.reason) body.reason = data.reason;
                if (data.note)   body.note   = data.note;

                const resp = await rest.POST(`/api/user/${this.model.id}`, { disable: body });
                if (!resp.success || resp.status >= 400) {
                    throw new Error(resp.message || 'Disable failed');
                }
                if (resp.data?.data) this.model.set(resp.data.data);
                else this.model.set('is_active', false);
                this.getApp()?.toast?.success('User disabled');
            } else {
                // Reactivating — no prompt.
                const resp = await rest.POST(`/api/user/${this.model.id}`, { reactivate: {} });
                if (!resp.success || resp.status >= 400) {
                    throw new Error(resp.message || 'Reactivate failed');
                }
                if (resp.data?.data) this.model.set(resp.data.data);
                else this.model.set('is_active', true);
                this.getApp()?.toast?.success('User reactivated');
            }
        } catch (err) {
            // Revert the toggle to its prior state on any failure.
            element.checked = !checked;
            this.getApp()?.toast?.error(err.message || 'Action failed');
        } finally {
            if (element && element.isConnected) element.disabled = false;
        }
        return true;
    }

    /**
     * Inline "Reset" link inside the inactivity-warning row. Same as
     * reactivate (clears the warning + restarts the inactivity clock).
     */
    async onActionResetInactivity(event) {
        event?.preventDefault?.();
        try {
            const resp = await rest.POST(`/api/user/${this.model.id}`, { reactivate: { note: 'Inactivity warning reset' } });
            if (!resp.success || resp.status >= 400) {
                throw new Error(resp.message || 'Reset failed');
            }
            if (resp.data?.data) this.model.set(resp.data.data);
            this.getApp()?.toast?.success('Inactivity warning cleared');
        } catch (err) {
            this.getApp()?.toast?.error(err.message || 'Failed to reset');
        }
        return true;
    }

    async onActionForceVerifyEmail() {
        const confirmed = await Modal.confirm(
            `Mark <strong>${escapeHtml(this.model.get('email') || '')}</strong> as verified?`,
            'Force Verify Email'
        );
        if (!confirmed) return true;
        const resp = await this.model.save({ is_email_verified: true });
        if (resp.status === 200) {
            this.getApp()?.toast?.success('Email marked as verified');
            await this._fullRefresh();
        } else {
            this.getApp()?.toast?.error('Failed to verify email');
        }
        return true;
    }

    async onActionForceVerifyPhone() {
        if (!this.model.get('phone_number')) {
            this.getApp()?.toast?.error('User has no phone number');
            return true;
        }
        const confirmed = await Modal.confirm(
            `Mark <strong>${escapeHtml(this.model.get('phone_number'))}</strong> as verified?`,
            'Force Verify Phone'
        );
        if (!confirmed) return true;
        const resp = await this.model.save({ is_phone_verified: true });
        if (resp.status === 200) {
            this.getApp()?.toast?.success('Phone marked as verified');
            await this._fullRefresh();
        } else {
            this.getApp()?.toast?.error('Failed to verify phone');
        }
        return true;
    }

    async onActionUnverifyEmail() {
        return this._setVerification('is_email_verified', false, 'Email');
    }

    async onActionUnverifyPhone() {
        return this._setVerification('is_phone_verified', false, 'Phone');
    }

    async onActionRevokeAllSessions() {
        const confirmed = await Modal.confirm(
            'Revoke all sessions? The user will be signed out of all devices immediately.',
            'Revoke All Sessions'
        );
        if (!confirmed) return true;
        const resp = await rest.POST(`/api/user/${this.model.id}/sessions/revoke`);
        if (resp.success) {
            this.getApp()?.toast?.success('All sessions revoked');
        } else {
            this.getApp()?.toast?.error(resp.message || 'Failed to revoke sessions');
        }
        return true;
    }

    async onActionImpersonate() {
        const confirmed = await Modal.confirm(
            `Sign in as <strong>${escapeHtml(this.model.get('display_name') || this.model.get('email') || 'this user')}</strong>?`,
            'Impersonate'
        );
        if (!confirmed) return true;
        const resp = await rest.POST('/api/auth/impersonate', { user: this.model.id });
        if (resp.success) {
            this.getApp()?.toast?.success('Impersonation started');
            window.location.reload();
        } else {
            this.getApp()?.toast?.error(resp.message || 'Failed to impersonate');
        }
        return true;
    }

    async onActionChangeAvatar() {
        // Mirror UserProfileView.onActionChangeAvatar — Modal.updateModelImage
        // posts the file to the model's endpoint and writes back the new
        // avatar URL on success.
        const resp = await Modal.updateModelImage({
            model: this.model,
            field: 'avatar',
            title: 'Change Avatar',
            upload: true
        }, {
            name: 'avatar',
            size: 'lg',
            imageSize: { width: 200, height: 200 },
            placeholder: 'Upload an avatar image'
        });
        if (resp && resp.status === 200) {
            this.getApp()?.toast?.success('Avatar updated');
            await this._fullRefresh();
        }
        return true;
    }

    async onActionClearAvatar() {
        const confirmed = await Modal.confirm(
            "Remove this user's avatar? They will see the default placeholder.",
            'Clear Avatar'
        );
        if (!confirmed) return true;
        const resp = await this.model.save({ avatar: null });
        if (resp.status === 200) {
            this.getApp()?.toast?.success('Avatar cleared');
            await this._fullRefresh();
        } else {
            this.getApp()?.toast?.error('Failed to clear avatar');
        }
        return true;
    }

    async onActionDeleteUser() {
        const name = this.model.get('display_name') || this.model.get('email') || `User #${this.model.id}`;
        const confirmed = await Modal.confirm({
            title: 'Delete User',
            message: `Are you sure you want to delete <strong>${escapeHtml(name)}</strong>? This cannot be undone.`,
            confirmText: 'Delete',
            confirmClass: 'btn-danger'
        });
        if (!confirmed) return true;
        try {
            await this.model.destroy();
            this.getApp()?.toast?.success('User deleted');
            const dialog = this.element?.closest('.modal');
            if (dialog) {
                const bsModal = window.bootstrap?.Modal?.getInstance(dialog);
                if (bsModal) bsModal.hide();
            }
            this.emit('user:deleted', { model: this.model });
        } catch (err) {
            this.getApp()?.toast?.error(`Failed to delete: ${err.message}`);
        }
        return true;
    }

    // ── Re-render after multi-section save ────────────────

    async _fullRefresh() {
        this._refreshComputedFields();
        if (this.headerView?.isMounted())      await this.headerView.render();
        if (this.overviewSection?.isMounted()) await this.overviewSection.render();
        if (this.profileSection?.isMounted())  await this.profileSection.render();
    }

    /** Legacy API compatibility (callers may still rely on this name) */
    async showTab(name) { return this.showSection(name); }
    getActiveTab() { return this.sideNav?.getActiveSection?.() ?? null; }

    static create(options = {}) {
        return new UserView(options);
    }
}


// ── Header aux helper ──────────────────────────────────────

/**
 * Right-gutter readout for the DetailHeader. Trusted HTML — model fields
 * escaped before interpolation. Two-row layout:
 *   row 1: [presence dot · Online/Offline]   [Active/Inactive toggle]
 *   row 2: muted "last active 4m ago"
 *
 * The active toggle lives in here (not as the framework's `activeField`)
 * so we can keep presence and toggle on the same horizontal line.
 */
function _buildHeaderAux(m) {
    const online = isOnline(m);
    const last = m.get('last_activity') || m.get('last_login');
    const rel = last
        ? dataFormatter.apply('relative', last) || ''
        : '';

    const main = online ? 'Online' : (rel ? 'Offline' : 'No activity');
    const sub = rel
        ? (online ? `active ${rel}` : `last active ${rel}`)
        : '';

    const dotIsOnline = online ? ' is-online' : '';
    const isActive = !!m.get('is_active');
    const anonymized = _isAnonymized(m);

    // Status badge — only shown when disabled (Blocked / Banned /
    // Auto-disabled / Anonymized / Self-deactivated). Active state is
    // already conveyed by the toggle's "Active" label below, so the
    // duplicate green badge is suppressed.
    const status = isActive ? null : _statusBadge(m);
    const statusHtml = status
        ? `<span class="badge text-bg-${status.variant}">${escapeHtml(status.label)}</span>`
        : '';

    // Active toggle. Hidden for anonymized users (irreversible per spec).
    // Disable: opens optional reason+note form, POSTs {"disable":{...}}.
    // Reactivate: no prompt, POSTs {"reactivate":{}}.
    // `data-change-action` (not `data-action`) so the dispatch fires only
    // once per toggle. `data-action` on a form control fires onAction* on
    // BOTH click and change, which would open the Disable form three times
    // for a single user click.
    const switchHtml = anonymized ? '' : `
        <label class="dh-active-switch">
            <input type="checkbox" data-change-action="toggle-active" ${isActive ? 'checked' : ''}>
            <span class="dh-track"></span>
            <span class="dh-track-label">${isActive ? 'Active' : 'Inactive'}</span>
        </label>
    `;

    // Inactivity-warning row — shows only when warning is in flight and the
    // user is still active. "Reset" link clears the warning via reactivate.
    const warning = _inactivityWarning(m);
    const warningHtml = warning ? `
        <div class="dh-aux-warning">
            <i class="bi bi-exclamation-triangle"></i>
            <span>Inactivity warning sent — ${escapeHtml(String(warning.days || '?'))} days until auto-disable</span>
            <a href="#" data-action="reset-inactivity">Reset</a>
        </div>
    ` : '';

    return `
        <div class="dh-aux-top">
            <span class="dh-aux-presence">
                <span class="dh-aux-dot${dotIsOnline}"></span>
                <span>${escapeHtml(main)}</span>
            </span>
            ${statusHtml}
            ${switchHtml}
        </div>
        ${sub ? `<span class="dh-aux-meta">${escapeHtml(sub)}</span>` : ''}
        ${warningHtml}
    `;
}


// ── Internal time conversion (only used for Timeline sort key) ──

function _toMs(value) {
    if (value == null) return null;
    if (typeof value === 'number') return value < 1e11 ? value * 1000 : value;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
}

UserView.VIEW_CLASS = UserView;
User.VIEW_CLASS = UserView;
User.MODEL_REF = 'account.User';

export default UserView;
export {
    UserView,
    UserOverviewSection,
    UserProfileSection,
    UserPermissionsSection,
    UserDevicesSection,
    UserAuditSection,
    UserApiKeysSection
};
