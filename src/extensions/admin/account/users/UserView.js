/**
 * UserView - User detail inspector built on the DetailView primitive.
 *
 * Sections (9, collapsing the legacy 12):
 *   Overview                — KPIs (Devices / Sessions / Last login / Groups)
 *                             + Identity card + Recent-activity timeline
 *   Profile                 — Personal / Account / Linked accounts field-cards
 *                             (collapses old Profile + Personal + OAuth)
 *   ──── Access ────
 *   Groups                  — MemberList scoped to user (badge: count)
 *   Permissions             — grouped switches with Common/Advanced/Effective
 *                             segment toggle (collapses old Permissions + Adv)
 *   API Keys                — list + create / revoke (badge: count)
 *   ──── Activity ────
 *   Devices                 — unified browser + push table with kind column
 *                             (collapses old Devices + Push Devices)
 *   Locations               — login map + table (TabView)
 *   Audit                   — unified incidents / activity / object-changes
 *                             feed with source segment filter (badge: count)
 *   ──── Settings ────
 *   Notifications           — channel preference grid
 *   Detail                  — metadata JSON
 *
 * Cross-record nav: clicking a Group row opens GroupView in a nested modal
 * (TableView clickAction='view' wires to the registered VIEW_CLASS).
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import TabView from '@core/views/navigation/TabView.js';
import TableView from '@core/views/table/TableView.js';
import TableRow from '@core/views/table/TableRow.js';
import FormView from '@core/forms/FormView.js';
import Modal from '@core/views/feedback/Modal.js';
import rest from '@core/Rest.js';
import { User, UserForms, UserDeviceList } from '@core/models/User.js';
import { LoginEventList } from '@ext/admin/models/LoginEvent.js';
import { LogList } from '@core/models/Log.js';
import { IncidentEventList } from '@ext/admin/models/Incident.js';
import { MemberList } from '@core/models/Member.js';
import { PushDeviceList } from '@ext/admin/models/Push.js';
import { PasskeyList, PasskeyForms } from '@core/models/Passkeys.js';
import LoginLocationMapView from '../devices/LoginLocationMapView.js';
import AdminNotificationsSection from './sections/AdminNotificationsSection.js';
import AdminPersonalSection from './sections/AdminPersonalSection.js';
import AdminSecuritySection from './sections/AdminSecuritySection.js';
import AdminConnectedSection from './sections/AdminConnectedSection.js';
import AdminMetadataSection from '../../shared/AdminMetadataSection.js';


// ── Helpers ────────────────────────────────────────────────

function epochToMs(value) {
    if (value == null) return null;
    if (typeof value === 'number') return value < 1e11 ? value * 1000 : value;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
}

function formatRelative(value) {
    const ms = epochToMs(value);
    if (ms == null) return '—';
    const diffSec = Math.round((Date.now() - ms) / 1000);
    if (diffSec < 0)     return 'just now';
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

function formatDateTime(value) {
    const ms = epochToMs(value);
    if (ms == null) return '—';
    return new Date(ms).toLocaleString();
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

function isOnline(model) {
    const last = epochToMs(model?.get?.('last_activity'));
    if (last == null) return false;
    // "Online" if active within the last 5 minutes.
    return (Date.now() - last) < 5 * 60 * 1000;
}

function deviceIcon(deviceInfo) {
    const dev = deviceInfo?.device || {};
    const os = deviceInfo?.os || {};
    const isMobile = ['iPhone', 'Android'].some(m =>
        (dev.family || '').includes(m) || (os.family || '').includes(m)
    );
    return isMobile ? 'bi-phone' : 'bi-laptop';
}

function deviceLabel(deviceInfo) {
    const dev = deviceInfo?.device || {};
    const ua = deviceInfo?.user_agent || {};
    const os = deviceInfo?.os || {};
    const browser = ua.family ? `${ua.family} ${ua.major || ''}`.trim() : '';
    const osName = os.family ? `${os.family} ${os.major || ''}`.trim() : '';
    const devName = `${dev.brand || ''} ${dev.family || ''}`.trim();
    return [browser || devName, osName].filter(Boolean).join(' · ') || '—';
}

const PROVIDER_ICONS = {
    google: 'bi-google',
    github: 'bi-github',
    microsoft: 'bi-microsoft',
    apple: 'bi-apple',
    facebook: 'bi-facebook',
    twitter: 'bi-twitter-x',
    linkedin: 'bi-linkedin'
};

function countTruthy(obj) {
    if (!obj || typeof obj !== 'object') return 0;
    return Object.values(obj).filter(v => v === true).length;
}


// ── Overview section ───────────────────────────────────────

class UserOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'user-overview-section',
            ...options
        });

        this.devicesCollection      = options.devicesCollection;
        this.pushDevicesCollection  = options.pushDevicesCollection;
        this.membersCollection      = options.membersCollection;
        this.loginsCollection       = options.loginsCollection;
        this.activityCollection     = options.activityCollection;
        this.eventsCollection       = options.eventsCollection;
        this.objectLogsCollection   = options.objectLogsCollection;

        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        return `
            <div class="section-eyebrow">Section · Overview</div>
            <h3 class="section-title">Account snapshot</h3>
            <div class="detail-kpi-grid">
                <div data-container="user-kpi-devices"></div>
                <div data-container="user-kpi-sessions"></div>
                <div data-container="user-kpi-last-login"></div>
                <div data-container="user-kpi-groups"></div>
            </div>
            <div class="detail-pair">
                <div data-container="user-overview-identity"></div>
                <div data-container="user-overview-activity"></div>
            </div>
        `;
    }

    async onInit() {
        // KPI cards
        this.kpiDevices  = this._kpi('user-kpi-devices',  'Devices',         this._deviceCount());
        this.kpiSessions = this._kpi('user-kpi-sessions', 'Active sessions', this._sessionCount(), 'success');
        this.kpiLastLogin = this._kpi('user-kpi-last-login', 'Last login',   this._lastLoginLabel());
        this.kpiGroups   = this._kpi('user-kpi-groups',   'Groups',          this._groupCount());
        [this.kpiDevices, this.kpiSessions, this.kpiLastLogin, this.kpiGroups]
            .forEach(c => this.addChild(c));

        this.identityCard = new UserIdentityCard({
            containerId: 'user-overview-identity',
            model: this.model
        });
        this.addChild(this.identityCard);

        this.activityCard = new UserOverviewActivityCard({
            containerId: 'user-overview-activity',
            model: this.model,
            loginsCollection: this.loginsCollection,
            activityCollection: this.activityCollection,
            eventsCollection: this.eventsCollection,
            objectLogsCollection: this.objectLogsCollection
        });
        this.addChild(this.activityCard);

        // Live updates from shared collections
        const wireRefresh = (col) => {
            if (col) col.on('fetch:success', () => this._refresh(), this);
        };
        [this.devicesCollection, this.pushDevicesCollection,
         this.membersCollection, this.loginsCollection].forEach(wireRefresh);
    }

    _kpi(containerId, label, value, tone = null) {
        return new View({
            containerId,
            className: `metric-card${tone ? ` metric-card-tone-${tone}` : ''}`,
            template: `
                <div class="metric-card-label">${escapeHtml(label)}</div>
                <div class="metric-card-value" data-kpi-value>${escapeHtml(String(value))}</div>
            `
        });
    }

    _deviceCount() {
        const browser = this.devicesCollection?.models?.length ?? 0;
        const push = this.pushDevicesCollection?.models?.length ?? 0;
        return browser + push;
    }
    _sessionCount() {
        // Active sessions ≈ browser devices currently. The framework doesn't
        // expose a session list here; admins use Devices section for detail.
        return this.devicesCollection?.models?.length ?? 0;
    }
    _lastLoginLabel() {
        const last = this.loginsCollection?.models?.[0]?.get?.('created')
            ?? this.model.get('last_login');
        return last ? formatRelative(last) : '—';
    }
    _groupCount() {
        return this.membersCollection?.models?.length ?? 0;
    }

    _refresh() {
        this._setKpi(this.kpiDevices,  this._deviceCount());
        this._setKpi(this.kpiSessions, this._sessionCount());
        this._setKpi(this.kpiLastLogin, this._lastLoginLabel());
        this._setKpi(this.kpiGroups,   this._groupCount());
        if (this.activityCard?.isMounted()) this.activityCard.render().catch(() => {});
    }

    _setKpi(card, value) {
        const el = card?.element?.querySelector('[data-kpi-value]');
        if (el) el.textContent = String(value);
    }
}


// ── Identity card (Overview) ───────────────────────────────

class UserIdentityCard extends View {
    constructor(options = {}) {
        super({ ...options });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const isStaff = !!m.get('is_staff');
        const isSuper = !!m.get('is_superuser');
        const accountType = isSuper ? 'Superuser' : (isStaff ? 'Staff' : 'User');
        const linked = this._linkedProvidersText();

        const rows = [
            ['Display name', escapeHtml(m.get('display_name') || '—')],
            ['Email', m.get('email')
                ? `<a href="mailto:${escapeHtml(m.get('email'))}">${escapeHtml(m.get('email'))}</a>`
                : '<span class="text-secondary">—</span>'],
            ['Phone', m.get('phone_number')
                ? `<code>${escapeHtml(m.get('phone_number'))}</code>`
                : '<span class="text-secondary">—</span>'],
            ['Account type', escapeHtml(accountType)],
            ['Joined', `<code>${escapeHtml(formatDate(m.get('date_joined')))}</code>`],
            ['Linked accounts', linked]
        ];

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
                    <div class="card-title"><i class="bi bi-person"></i>Identity</div>
                    <ul class="list-unstyled mb-0 small">${rowsHtml}</ul>
                </div>
            </div>
        `;
    }

    _linkedProvidersText() {
        // OAuth connections aren't on the User model directly; the Profile
        // section fetches them on demand. Show a placeholder here.
        return '<span class="text-secondary">—</span>';
    }
}


// ── Recent-activity timeline (Overview) ────────────────────

class UserOverviewActivityCard extends View {
    constructor(options = {}) {
        super({ ...options });
        this.loginsCollection     = options.loginsCollection;
        this.activityCollection   = options.activityCollection;
        this.eventsCollection     = options.eventsCollection;
        this.objectLogsCollection = options.objectLogsCollection;
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const items = this._collectItems();

        if (!items.length) {
            return `
                <div class="card">
                    <div class="card-body">
                        <div class="card-title"><i class="bi bi-list-ul"></i>Recent activity</div>
                        <div class="text-secondary small">No recent activity yet.</div>
                    </div>
                </div>
            `;
        }

        const itemsHtml = items.map(item => `
            <li class="detail-timeline-item${item.tone ? ` tone-${item.tone}` : ''}">
                <div>
                    <div class="detail-timeline-headline">${escapeHtml(item.headline)}</div>
                    ${item.detail ? `<div class="detail-timeline-detail">${item.detail}</div>` : ''}
                </div>
                <span class="detail-timeline-when">${escapeHtml(item.when)}</span>
            </li>
        `).join('');

        return `
            <div class="card">
                <div class="card-body">
                    <div class="card-title"><i class="bi bi-list-ul"></i>Recent activity</div>
                    <ol class="detail-timeline">${itemsHtml}</ol>
                </div>
            </div>
        `;
    }

    /** Pull up to 5 items from the most-recent of each shared collection. */
    _collectItems() {
        const out = [];

        const logins = this.loginsCollection?.models?.slice(0, 2) || [];
        for (const l of logins) {
            const ip = l.get('ip_address');
            const city = l.get('city');
            const country = l.get('country_code');
            const where = [city, country].filter(Boolean).join(', ');
            out.push({
                ts: epochToMs(l.get('created')),
                headline: 'Logged in',
                detail: [ip ? `<code>${escapeHtml(ip)}</code>` : '', where ? `<span class="text-secondary">${escapeHtml(where)}</span>` : '']
                    .filter(Boolean).join(' · '),
                when: formatRelative(l.get('created')),
                tone: 'info'
            });
        }

        const events = this.eventsCollection?.models?.slice(0, 2) || [];
        for (const e of events) {
            out.push({
                ts: epochToMs(e.get('created')),
                headline: e.get('title') || e.get('category') || 'Event',
                detail: e.get('category') ? `<span class="text-secondary">${escapeHtml(e.get('category'))}</span>` : '',
                when: formatRelative(e.get('created')),
                tone: 'danger'
            });
        }

        const logs = this.objectLogsCollection?.models?.slice(0, 2) || [];
        for (const log of logs) {
            out.push({
                ts: epochToMs(log.get('created')),
                headline: log.get('kind') || 'Change',
                detail: log.get('log') ? `<span class="text-secondary">${escapeHtml(String(log.get('log')).slice(0, 80))}</span>` : '',
                when: formatRelative(log.get('created')),
                tone: null
            });
        }

        const activity = this.activityCollection?.models?.slice(0, 1) || [];
        for (const a of activity) {
            out.push({
                ts: epochToMs(a.get('created')),
                headline: a.get('kind') || 'Activity',
                detail: a.get('path') ? `<code class="small">${escapeHtml(a.get('path'))}</code>` : '',
                when: formatRelative(a.get('created')),
                tone: null
            });
        }

        // Sort newest first, take 5
        return out
            .filter(i => i.ts != null)
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 5);
    }
}


// ── Profile section ────────────────────────────────────────

class UserProfileSection extends View {
    constructor(options = {}) {
        super({
            className: 'user-profile-section',
            ...options
        });
        this.connections = [];
        this.template = () => this._buildTemplate();
    }

    async onBeforeRender() {
        try {
            const resp = await rest.GET('/api/account/oauth_connection', { user: this.model.id });
            const results = resp?.data?.results || resp?.data || [];
            this.connections = (Array.isArray(results) ? results : []).map(c => ({
                ...c,
                icon: PROVIDER_ICONS[c.provider] || 'bi-link-45deg'
            }));
        } catch (e) {
            this.connections = [];
        }
    }

    _buildTemplate() {
        const m = this.model;
        const isStaff = !!m.get('is_staff');
        const isSuper = !!m.get('is_superuser');
        const accountType = isSuper ? 'Superuser' : (isStaff ? 'Staff' : 'User');
        const status = m.get('is_active')
            ? '<span class="badge text-bg-success">Active</span>'
            : '<span class="badge text-bg-secondary">Inactive</span>';

        const verifiedEmail = !!m.get('is_email_verified');
        const verifiedPhone = !!m.get('is_phone_verified');
        const requiresMfa = !!m.get('requires_mfa');

        // Force-verify / unverify affordances inline on the email/phone rows.
        // Click flips `is_email_verified` / `is_phone_verified` (admin-only).
        const emailVerifyBtn = verifiedEmail
            ? '<button class="btn btn-sm btn-link link-secondary p-0 ms-1" data-action="unverify-email" title="Mark as unverified"><i class="bi bi-x-circle"></i></button>'
            : '<button class="btn btn-sm btn-link link-success p-0 ms-1" data-action="force-verify-email" title="Force verify"><i class="bi bi-patch-check"></i></button>';
        const phoneVerifyBtn = verifiedPhone
            ? '<button class="btn btn-sm btn-link link-secondary p-0 ms-1" data-action="unverify-phone" title="Mark as unverified"><i class="bi bi-x-circle"></i></button>'
            : '<button class="btn btn-sm btn-link link-success p-0 ms-1" data-action="force-verify-phone" title="Force verify"><i class="bi bi-patch-check"></i></button>';

        // Personal subsection
        const personalRows = [
            ['Display name', escapeHtml(m.get('display_name') || m.get('username') || '—')],
            ['Username', `<code>${escapeHtml(m.get('username') || '—')}</code>`],
            ['Email', `${escapeHtml(m.get('email') || '—')}${
                verifiedEmail
                    ? ' <span class="badge text-bg-success ms-1"><i class="bi bi-shield-check me-1"></i>verified</span>'
                    : ' <span class="badge text-bg-warning ms-1">unverified</span>'
            }${m.get('email') ? emailVerifyBtn : ''}`],
            ['Phone', m.get('phone_number')
                ? `<code>${escapeHtml(m.get('phone_number'))}</code>${
                    verifiedPhone
                        ? ' <span class="badge text-bg-success ms-1"><i class="bi bi-shield-check me-1"></i>verified</span>'
                        : ' <span class="badge text-bg-warning ms-1">unverified</span>'
                }${phoneVerifyBtn}`
                : '<span class="text-secondary fst-italic">Not set</span>'],
        ];

        // Account subsection
        const accountRows = [
            ['Account type', escapeHtml(accountType)],
            ['Status', status],
            ['Joined', escapeHtml(formatDate(m.get('date_joined')))],
            ['Last login', escapeHtml(formatRelative(m.get('last_login')))],
            ['Last seen', escapeHtml(formatRelative(m.get('last_activity')))],
        ];
        const meta = m.get('metadata') || {};
        if (meta.timezone) accountRows.push(['Timezone', escapeHtml(meta.timezone)]);

        // Linked accounts subsection
        let linkedHtml;
        if (this.connections.length) {
            linkedHtml = this.connections.map(c =>
                `<span class="badge text-bg-light border me-1"><i class="bi ${escapeHtml(c.icon)} me-1"></i>${escapeHtml(c.provider)}${c.email ? ` · ${escapeHtml(c.email)}` : ''}</span>`
            ).join('');
        } else {
            linkedHtml = '<span class="text-secondary fst-italic">No linked accounts</span>';
        }

        const mfaHtml = requiresMfa
            ? '<span class="badge text-bg-success">Required</span>'
            : '<span class="badge text-bg-secondary">Not required</span>';

        const linkedRows = [
            ['SSO providers', linkedHtml],
            ['2-factor', `${mfaHtml} <a href="#" class="small ms-2" data-action="manage-passkeys">Manage passkeys</a>`]
        ];

        return `
            ${this._buildSubsection('Personal',         'edit-personal',  personalRows)}
            ${this._buildSubsection('Account',          'edit-account',   accountRows)}
            ${this._buildSubsection('Linked accounts',  'manage-linked',  linkedRows)}
        `;
    }

    /**
     * Render one subsection: a `.detail-section-eyebrow` (uppercase
     * label + edit pencil right-aligned) followed by a stack of
     * `.detail-flat-row`s. Auto-spaces above when not the first
     * subsection in the section (per the framework `:not(:first-child)`
     * margin rule in core.css).
     */
    _buildSubsection(title, editAction, rows) {
        const rowsHtml = rows.map(([k, v]) => `
            <div class="detail-flat-row">
                <div class="detail-flat-row-label">${escapeHtml(k)}</div>
                <div class="detail-flat-row-value">${v}</div>
            </div>
        `).join('');

        return `
            <div class="detail-section-eyebrow">
                ${escapeHtml(title)}
                <button type="button" class="detail-section-action" data-action="${escapeHtml(editAction)}" title="Edit ${escapeHtml(title.toLowerCase())}"><i class="bi bi-pencil"></i></button>
            </div>
            ${rowsHtml}
        `;
    }

    // ── Card edit actions — bubble to UserView for the real handlers ──

    async onActionEditPersonal() {
        this.emit('action:edit-personal');
    }
    async onActionEditAccount() {
        this.emit('action:edit-account');
    }
    async onActionManageLinked() {
        this.emit('action:manage-linked');
    }
    async onActionManagePasskeys(event) {
        event?.preventDefault?.();
        this.emit('action:manage-passkeys');
    }

    // ── Inline force-verify (admin override) ─────────────────────────
    // Bubbles to UserView so the same handlers can also be triggered
    // from the context menu.
    async onActionForceVerifyEmail()  { this.emit('action:force-verify-email');  return true; }
    async onActionUnverifyEmail()     { this.emit('action:unverify-email');      return true; }
    async onActionForceVerifyPhone()  { this.emit('action:force-verify-phone');  return true; }
    async onActionUnverifyPhone()     { this.emit('action:unverify-phone');      return true; }
}


// ── Permissions section ────────────────────────────────────

class UserPermissionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'user-permissions-section',
            ...options
        });
        this.mode = 'common';   // common | advanced | effective
        this.filterText = '';
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const groups = this._buildGroups();
        const groupsHtml = groups.map(g => this._renderGroup(g)).join('');

        return `
            <div class="section-eyebrow">Section · Permissions</div>
            <h3 class="section-title">What this user can do</h3>

            <div class="detail-toolbar d-flex justify-content-between align-items-center mb-3">
                <input class="form-control form-control-sm"
                       style="max-width: 280px;"
                       placeholder="Filter permissions…"
                       value="${escapeHtml(this.filterText)}"
                       data-action="filter-perms"
                       data-action-debounce="200">
                <div class="btn-group" role="group" aria-label="Permission view">
                    <button type="button" class="btn btn-sm ${this.mode === 'common' ? 'btn-secondary' : 'btn-outline-secondary'}" data-action="set-mode" data-mode="common">Common</button>
                    <button type="button" class="btn btn-sm ${this.mode === 'advanced' ? 'btn-secondary' : 'btn-outline-secondary'}" data-action="set-mode" data-mode="advanced">Advanced</button>
                    <button type="button" class="btn btn-sm ${this.mode === 'effective' ? 'btn-secondary' : 'btn-outline-secondary'}" data-action="set-mode" data-mode="effective">Effective</button>
                </div>
            </div>

            ${groupsHtml || '<div class="text-secondary small">No permissions match.</div>'}
        `;
    }

    /**
     * Build the groups of permissions to display based on the current mode.
     *
     * common    — User.CATEGORY_PERMISSIONS (curated category-level toggles)
     * advanced  — User.GRANULAR_PERMISSION_TABS (every fine-grained perm)
     * effective — like advanced, but each granular row is checked when
     *             either it OR its parent category permission is granted.
     */
    _buildGroups() {
        const m = this.model;
        const granted = m.get('permissions') || {};
        const filter = this.filterText.toLowerCase();

        const matchesFilter = (label, key) => {
            if (!filter) return true;
            return (label || '').toLowerCase().includes(filter)
                || (key || '').toLowerCase().includes(filter);
        };

        if (this.mode === 'common') {
            const perms = (User.CATEGORY_PERMISSIONS || []).filter(p => matchesFilter(p.label, p.name));
            if (!perms.length) return [];
            return [{
                title: 'Categories',
                meta: this._grantedMeta(perms, granted),
                rows: perms.map(p => ({
                    label: p.label,
                    key: `permissions.${p.name}`,
                    permName: p.name,
                    tooltip: p.tooltip,
                    checked: !!granted[p.name],
                    disabled: false
                }))
            }];
        }

        const tabs = User.GRANULAR_PERMISSION_TABS || [];
        const groups = [];
        for (const tab of tabs) {
            const perms = (tab.permissions || []).filter(p => matchesFilter(p.label, p.name));
            if (!perms.length) continue;

            const rows = perms.map(p => {
                const directly = !!granted[p.name];
                let checked = directly;
                let inheritedFrom = null;
                if (this.mode === 'effective') {
                    const cat = User.GRANULAR_TO_CATEGORY?.[p.name];
                    if (!directly && cat && granted[cat]) {
                        checked = true;
                        inheritedFrom = cat;
                    }
                }
                return {
                    label: p.label,
                    key: `permissions.${p.name}`,
                    permName: p.name,
                    tooltip: p.tooltip,
                    checked,
                    disabled: this.mode === 'effective',
                    inheritedFrom
                };
            });

            groups.push({
                title: tab.label,
                meta: this._grantedMeta(perms, granted),
                rows
            });
        }
        return groups;
    }

    _grantedMeta(perms, granted) {
        const total = perms.length;
        const on = perms.filter(p => !!granted[p.name]).length;
        return `${on} / ${total} granted`;
    }

    _renderGroup(g) {
        const rowsHtml = g.rows.map(r => `
            <div class="detail-perm-row">
                <div class="detail-perm-name">
                    ${escapeHtml(r.label)}
                    ${r.tooltip ? `<span class="detail-perm-help">${escapeHtml(r.tooltip)}</span>` : `<span class="detail-perm-key">${escapeHtml(r.key)}</span>`}
                    ${r.inheritedFrom ? `<span class="text-secondary small ms-1">· inherited from <code>${escapeHtml(r.inheritedFrom)}</code></span>` : ''}
                </div>
                <div class="form-check form-switch m-0">
                    <input class="form-check-input"
                           type="checkbox"
                           role="switch"
                           data-change-action="toggle-perm"
                           data-perm="${escapeHtml(r.permName)}"
                           ${r.checked ? 'checked' : ''}
                           ${r.disabled ? 'disabled' : ''}
                           aria-label="${escapeHtml(r.label)}">
                </div>
            </div>
        `).join('');

        return `
            <div class="detail-perm-group">
                <div class="detail-perm-group-header">
                    <h5>${escapeHtml(g.title)}</h5>
                    <span class="detail-perm-group-meta">${escapeHtml(g.meta)}</span>
                </div>
                ${rowsHtml}
            </div>
        `;
    }

    // ── Action handlers ────────────────────────────────────

    async onActionSetMode(event, element) {
        const mode = element?.dataset?.mode;
        if (!mode || mode === this.mode) return;
        this.mode = mode;
        await this.render();
    }

    async onActionFilterPerms(event, element) {
        this.filterText = element?.value || '';
        await this.render();
    }

    async onActionTogglePerm(event, element) {
        if (this.mode === 'effective') return; // disabled visually
        const permName = element?.dataset?.perm;
        if (!permName) return;
        const checked = !!element.checked;
        element.disabled = true;
        try {
            const current = { ...(this.model.get('permissions') || {}) };
            current[permName] = checked;
            const resp = await this.model.save({ permissions: current });
            if (resp && resp.status && resp.status >= 400) throw new Error('Save failed');
            this.model.set('permissions', current);
            this.getApp()?.toast?.success(`${permName} ${checked ? 'granted' : 'revoked'}`);
            await this.render();
        } catch (err) {
            element.checked = !checked;
            this.getApp()?.toast?.error(`Failed to update permission: ${err.message}`);
        } finally {
            element.disabled = false;
        }
    }
}


// ── Devices section (browser + push unified) ──────────────

class UserDevicesSection extends View {
    constructor(options = {}) {
        super({
            className: 'user-devices-section',
            ...options
        });
        this.devicesCollection     = options.devicesCollection;
        this.pushDevicesCollection = options.pushDevicesCollection;
        this.kindFilter = 'all'; // all | browser | push
        this.template = () => this._buildTemplate();
    }

    async onAfterRender() {
        await super.onAfterRender();
        // Refresh on collection updates
        const wire = (col) => {
            if (col && !col._userViewWired) {
                col.on('fetch:success', () => {
                    if (this.isMounted()) this.render().catch(() => {});
                }, this);
                col._userViewWired = true;
            }
        };
        wire(this.devicesCollection);
        wire(this.pushDevicesCollection);
    }

    _buildTemplate() {
        const rows = this._collectRows();
        const browserCount = (this.devicesCollection?.models?.length) || 0;
        const pushCount = (this.pushDevicesCollection?.models?.length) || 0;

        const tableRows = rows.length
            ? rows.map(r => this._renderRow(r)).join('')
            : `<tr><td colspan="6" class="text-center text-secondary py-3">No devices found.</td></tr>`;

        return `
            <div class="section-eyebrow">Section · Devices · ${browserCount + pushCount} total</div>
            <h3 class="section-title">Devices &amp; sessions</h3>

            <div class="detail-toolbar d-flex justify-content-between align-items-center mb-3">
                <div class="d-flex gap-2 align-items-center">
                    <div class="btn-group" role="group" aria-label="Device kind filter">
                        <button type="button" class="btn btn-sm ${this.kindFilter === 'all' ? 'btn-secondary' : 'btn-outline-secondary'}" data-action="set-kind" data-kind="all">All</button>
                        <button type="button" class="btn btn-sm ${this.kindFilter === 'browser' ? 'btn-secondary' : 'btn-outline-secondary'}" data-action="set-kind" data-kind="browser">Browser</button>
                        <button type="button" class="btn btn-sm ${this.kindFilter === 'push' ? 'btn-secondary' : 'btn-outline-secondary'}" data-action="set-kind" data-kind="push">Push</button>
                    </div>
                    <span class="text-secondary small">${browserCount} browser · ${pushCount} push</span>
                </div>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-secondary" data-action="refresh-devices"><i class="bi bi-arrow-clockwise me-1"></i>Refresh</button>
                </div>
            </div>

            <div class="card">
                <div class="table-responsive">
                    <table class="table table-hover m-0 align-middle small">
                        <thead>
                            <tr>
                                <th class="text-secondary text-uppercase fw-semibold" style="font-size: 0.7rem; letter-spacing: 0.08em; width: 100px;">Kind</th>
                                <th class="text-secondary text-uppercase fw-semibold" style="font-size: 0.7rem; letter-spacing: 0.08em;">Device</th>
                                <th class="text-secondary text-uppercase fw-semibold" style="font-size: 0.7rem; letter-spacing: 0.08em; width: 140px;">Last seen</th>
                                <th class="text-secondary text-uppercase fw-semibold" style="font-size: 0.7rem; letter-spacing: 0.08em; width: 200px;">Identifier</th>
                                <th class="text-secondary text-uppercase fw-semibold" style="font-size: 0.7rem; letter-spacing: 0.08em; width: 140px;">Signals</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    _collectRows() {
        const out = [];
        if (this.kindFilter === 'all' || this.kindFilter === 'browser') {
            for (const d of this.devicesCollection?.models || []) {
                out.push({
                    kind: 'browser',
                    icon: deviceIcon(d.get('device_info')),
                    label: deviceLabel(d.get('device_info')),
                    identifier: d.get('duid') || '',
                    lastSeen: d.get('last_seen'),
                    signals: 'trusted'
                });
            }
        }
        if (this.kindFilter === 'all' || this.kindFilter === 'push') {
            for (const d of this.pushDevicesCollection?.models || []) {
                out.push({
                    kind: 'push',
                    icon: 'bi-bell',
                    label: deviceLabel(d.get('device_info')),
                    identifier: d.get('duid') || '',
                    lastSeen: d.get('last_seen'),
                    signals: 'trusted'
                });
            }
        }
        // Sort newest-last-seen first
        out.sort((a, b) => (epochToMs(b.lastSeen) || 0) - (epochToMs(a.lastSeen) || 0));
        return out;
    }

    _renderRow(r) {
        const kindBadge = r.kind === 'push'
            ? `<span class="badge text-bg-primary"><i class="bi ${escapeHtml(r.icon)} me-1"></i>Push</span>`
            : `<span class="badge text-bg-info"><i class="bi ${escapeHtml(r.icon)} me-1"></i>Browser</span>`;
        const idShort = r.identifier
            ? (r.identifier.length > 24 ? `${r.identifier.slice(0, 8)}…${r.identifier.slice(-6)}` : r.identifier)
            : '—';
        return `
            <tr>
                <td>${kindBadge}</td>
                <td><div>${escapeHtml(r.label)}</div></td>
                <td><code>${escapeHtml(formatRelative(r.lastSeen))}</code></td>
                <td><code class="text-secondary small">${escapeHtml(idShort)}</code></td>
                <td><span class="badge text-bg-light">${escapeHtml(r.signals)}</span></td>
            </tr>
        `;
    }

    async onActionSetKind(event, element) {
        const kind = element?.dataset?.kind;
        if (!kind || kind === this.kindFilter) return;
        this.kindFilter = kind;
        await this.render();
    }

    async onActionRefreshDevices() {
        await Promise.all([
            this.devicesCollection?.fetch?.().catch(() => {}),
            this.pushDevicesCollection?.fetch?.().catch(() => {})
        ]);
        await this.render();
    }
}


// ── Audit section (incidents + activity + object logs unified) ──

class UserAuditSection extends View {
    constructor(options = {}) {
        super({
            className: 'user-audit-section',
            ...options
        });
        this.eventsCollection     = options.eventsCollection;
        this.activityCollection   = options.activityCollection;
        this.objectLogsCollection = options.objectLogsCollection;
        this.sourceFilter = 'activity';   // activity | incident | object (no "all")
        this.searchText   = '';
        this.pageSize     = 25;
        this.visibleCount = 25;            // grows on "Load more"
        this._refreshing  = false;
        this.template = () => this._buildTemplate();
    }

    async onAfterRender() {
        await super.onAfterRender();
        // Re-render on any source collection update
        const wire = (col) => {
            if (col && !col._userAuditWired) {
                col.on('fetch:success', () => {
                    if (this.isMounted()) this.render().catch(() => {});
                }, this);
                col._userAuditWired = true;
            }
        };
        wire(this.eventsCollection);
        wire(this.activityCollection);
        wire(this.objectLogsCollection);
    }

    _buildTemplate() {
        const allItems = this._collectItems();
        const total = allItems.length;
        const items = allItems.slice(0, this.visibleCount);
        const hasMore = total > this.visibleCount;

        const itemsHtml = items.length
            ? items.map(i => this._renderItem(i)).join('')
            : '<li class="detail-audit-entry"><div class="text-secondary small">No audit entries match.</div></li>';

        const sourceColl = this._currentCollection();
        const totalKnown = sourceColl?.totalCount ?? sourceColl?.models?.length ?? 0;
        const eyebrow = `Section · Audit · showing ${items.length} of ${total}${totalKnown > total ? ` (${totalKnown} total)` : ''}`;

        return `
            <div class="section-eyebrow">${escapeHtml(eyebrow)}</div>
            <h3 class="section-title">What this account did</h3>

            <div class="detail-toolbar d-flex justify-content-between align-items-center mb-3">
                <div class="btn-group" role="group" aria-label="Audit source filter">
                    <button type="button" class="btn btn-sm ${this.sourceFilter === 'incident' ? 'btn-secondary' : 'btn-outline-secondary'}" data-action="set-source" data-source="incident">Incidents</button>
                    <button type="button" class="btn btn-sm ${this.sourceFilter === 'activity' ? 'btn-secondary' : 'btn-outline-secondary'}" data-action="set-source" data-source="activity">Activity</button>
                    <button type="button" class="btn btn-sm ${this.sourceFilter === 'object' ? 'btn-secondary' : 'btn-outline-secondary'}" data-action="set-source" data-source="object">Object changes</button>
                </div>
                <div class="d-flex gap-2 align-items-center">
                    <input class="form-control form-control-sm"
                           style="max-width: 220px;"
                           placeholder="Filter visible entries…"
                           value="${escapeHtml(this.searchText)}"
                           data-action="filter-audit"
                           data-action-debounce="200">
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-action="refresh-audit" title="Refresh">
                        <i class="bi bi-arrow-clockwise${this._refreshing ? ' bi-spin' : ''}"></i>
                    </button>
                </div>
            </div>

            <ul class="detail-audit-list">${itemsHtml}</ul>

            ${hasMore ? `
                <div class="text-center mt-2">
                    <button type="button" class="btn btn-sm btn-link link-secondary" data-action="load-more">
                        Show ${Math.min(this.pageSize, total - this.visibleCount)} more <i class="bi bi-chevron-down ms-1"></i>
                    </button>
                </div>
            ` : ''}
        `;
    }

    _currentCollection() {
        if (this.sourceFilter === 'incident') return this.eventsCollection;
        if (this.sourceFilter === 'object')   return this.objectLogsCollection;
        return this.activityCollection;
    }

    _collectItems() {
        const out = [];
        const want = this.sourceFilter;

        // Tone helper for log entries
        const toneFor = (level) => {
            const l = (level || '').toLowerCase();
            if (l === 'error' || l === 'critical') return 'danger';
            if (l === 'warning' || l === 'warn')   return 'warning';
            return 'info';
        };

        if (want === 'incident') {
            for (const e of this.eventsCollection?.models || []) {
                const cat = e.get('category');
                out.push({
                    ts: epochToMs(e.get('created')),
                    sourceLabel: 'incident',
                    icon: 'bi-shield-exclamation',
                    tone: 'danger',
                    headline: e.get('title') || cat || 'Incident event',
                    detail: cat ? `<code class="small">${escapeHtml(cat)}</code>` : '',
                    when: formatRelative(e.get('created'))
                });
            }
        } else if (want === 'activity') {
            for (const a of this.activityCollection?.models || []) {
                const kind = a.get('kind') || 'activity';
                const log  = a.get('log');
                const path = a.get('path');
                const headline = log
                    ? String(log).slice(0, 140)
                    : (path ? path : kind);
                const detail = log && path ? `<code class="small">${escapeHtml(path)}</code>` : '';
                out.push({
                    ts: epochToMs(a.get('created')),
                    sourceLabel: 'activity',
                    icon: 'bi-clock-history',
                    tone: toneFor(a.get('level')),
                    headline,
                    detail,
                    when: formatRelative(a.get('created'))
                });
            }
        } else if (want === 'object') {
            for (const log of this.objectLogsCollection?.models || []) {
                const kind = log.get('kind') || 'change';
                const msg  = log.get('log');
                const headline = msg
                    ? String(msg).slice(0, 140)
                    : kind;
                out.push({
                    ts: epochToMs(log.get('created')),
                    sourceLabel: 'object',
                    icon: 'bi-pencil',
                    tone: toneFor(log.get('level')),
                    headline,
                    detail: msg ? `<code class="small">${escapeHtml(kind)}</code>` : '',
                    when: formatRelative(log.get('created'))
                });
            }
        }

        // Client-side search across headline + detail
        const q = this.searchText.trim().toLowerCase();
        const filtered = q
            ? out.filter(i =>
                (i.headline || '').toLowerCase().includes(q) ||
                (i.detail   || '').toLowerCase().includes(q) ||
                (i.sourceLabel || '').toLowerCase().includes(q))
            : out;

        filtered.sort((a, b) => (b.ts || 0) - (a.ts || 0));
        return filtered;
    }

    _renderItem(item) {
        const toneCls = item.tone ? ` tone-${item.tone}` : '';
        return `
            <li class="detail-audit-entry">
                <div class="detail-audit-icon${toneCls}"><i class="bi ${escapeHtml(item.icon)}"></i></div>
                <div class="detail-audit-source">${escapeHtml(item.sourceLabel)}</div>
                <div class="text-truncate">${escapeHtml(item.headline)}${item.detail ? ` <span class="text-secondary">· ${item.detail}</span>` : ''}</div>
                <div class="detail-audit-when">${escapeHtml(item.when)}</div>
            </li>
        `;
    }

    async onActionSetSource(event, element) {
        const source = element?.dataset?.source;
        if (!source || source === this.sourceFilter) return;
        this.sourceFilter = source;
        this.visibleCount = this.pageSize;   // reset pagination
        await this.render();
    }

    async onActionFilterAudit(event, element) {
        this.searchText = element?.value || '';
        this.visibleCount = this.pageSize;
        await this.render();
    }

    async onActionLoadMore() {
        this.visibleCount += this.pageSize;
        await this.render();
    }

    async onActionRefreshAudit() {
        if (this._refreshing) return;
        this._refreshing = true;
        try {
            const col = this._currentCollection();
            if (col) await col.fetch();
        } catch (err) {
            this.getApp()?.toast?.error('Failed to refresh: ' + (err.message || ''));
        } finally {
            this._refreshing = false;
            await this.render();
        }
    }
}


// ── API Keys section ───────────────────────────────────────

class UserApiKeysSection extends View {
    constructor(options = {}) {
        super({
            className: 'user-api-keys-section',
            ...options
        });
        this.apiKeys = [];
        this.generatedToken = null;
        this.template = () => this._buildTemplate();
    }

    async onBeforeRender() {
        await this._loadKeys();
    }

    async _loadKeys() {
        try {
            const resp = await rest.GET('/api/account/api_keys', { user: this.model.id }, {}, { dataOnly: true });
            this.apiKeys = resp.success && Array.isArray(resp.data) ? resp.data : [];
            // Bubble count up so the parent can update the sidebar badge
            this.emit('count:changed', this.apiKeys.length);
        } catch (e) {
            this.apiKeys = [];
        }
    }

    _buildTemplate() {
        const rows = this.apiKeys.length
            ? this.apiKeys.map(k => this._renderKeyRow(k)).join('')
            : '<div class="text-center text-secondary py-4">No API keys for this user.</div>';

        const tokenBlock = this.generatedToken ? `
            <div class="alert alert-success">
                <div class="fw-semibold mb-2">Generated API Key</div>
                <div class="d-flex gap-2 align-items-center">
                    <code class="flex-grow-1" style="word-break: break-all;">${escapeHtml(this.generatedToken)}</code>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-action="copy-token"><i class="bi bi-clipboard"></i></button>
                </div>
                <div class="small mt-2 text-danger fw-semibold"><i class="bi bi-exclamation-circle me-1"></i>This token will not be shown again. Copy it now.</div>
            </div>
        ` : '';

        return `
            <div class="section-eyebrow">Section · API Keys</div>
            <h3 class="section-title">API Keys</h3>

            ${tokenBlock}

            <div class="detail-toolbar d-flex justify-content-between align-items-center mb-3">
                <span class="text-secondary small">${this.apiKeys.length} key${this.apiKeys.length === 1 ? '' : 's'}</span>
                <button class="btn btn-primary btn-sm" data-action="generate-key">
                    <i class="bi bi-plus-lg me-1"></i>Generate Key
                </button>
            </div>

            <div>${rows}</div>
        `;
    }

    _renderKeyRow(key) {
        const name = key.name || 'API Key';
        const created = key.created ? formatDate(key.created) : '—';
        const expires = key.expires ? formatDate(key.expires) : 'Never';
        const lastUsed = key.last_used ? formatRelative(key.last_used) : 'Never';
        const ips = key.allowed_ips?.length ? key.allowed_ips.join(', ') : 'Any';
        const isActive = key.is_active !== false;
        const statusBadge = isActive
            ? '<span class="badge text-bg-success">Active</span>'
            : '<span class="badge text-bg-secondary">Inactive</span>';
        const tokenPreview = key.token_prefix ? `${escapeHtml(key.token_prefix)}…` : '••••••••';

        return `
            <div class="card mb-2">
                <div class="card-body py-2 px-3 d-flex align-items-center gap-3">
                    <i class="bi bi-key text-secondary fs-5"></i>
                    <div class="flex-grow-1 min-w-0">
                        <div class="fw-semibold small">${escapeHtml(name)} ${statusBadge}</div>
                        <div class="text-secondary small d-flex flex-wrap gap-2 mt-1">
                            <span><code>${tokenPreview}</code></span>
                            <span><i class="bi bi-calendar me-1"></i>Created ${escapeHtml(created)}</span>
                            <span><i class="bi bi-clock me-1"></i>Expires ${escapeHtml(expires)}</span>
                            <span><i class="bi bi-activity me-1"></i>Last used ${escapeHtml(lastUsed)}</span>
                            <span><i class="bi bi-globe me-1"></i>IPs: ${escapeHtml(ips)}</span>
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger" data-action="revoke-key" data-id="${escapeHtml(key.id)}" title="Revoke">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
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
            await this._loadKeys();
            await this.render();
        } else {
            this.getApp()?.toast?.error(resp.message || 'Failed to generate API key');
        }
        return true;
    }

    async onActionRevokeKey(event, el) {
        const id = el?.dataset?.id;
        if (!id) return true;

        const confirmed = await Modal.confirm(
            'Revoke this API key? Any applications using it will lose access immediately.',
            'Revoke API Key'
        );
        if (!confirmed) return true;

        const resp = await rest.DELETE(`/api/account/api_keys/${id}`, {}, {}, { dataOnly: true });
        if (resp.success) {
            this.getApp()?.toast?.success('API key revoked');
            this.generatedToken = null;
            await this._loadKeys();
            await this.render();
        } else {
            this.getApp()?.toast?.error(resp.message || 'Failed to revoke API key');
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

        // Section view instances
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

        const profileSection = new UserProfileSection({ model });
        const permissionsSection = new UserPermissionsSection({ model });
        const apiKeysSection = new UserApiKeysSection({ model });

        // Groups — TableView of MemberList scoped to this user
        const groupsSection = new TableView({
            collection: membersCollection,
            title: 'Groups',
            eyebrow: 'Section · Groups',
            showFullscreen: false,
            searchable: false,
            hideActivePillNames: ['user'],
            clickAction: 'view',
            viewDialogOptions: { header: false, noBodyPadding: true, buttons: [] },
            columns: [
                { key: 'group.name', label: 'Group', sortable: true },
                { key: 'group.kind', label: 'Kind', formatter: 'badge' },
                { key: 'permissions|keys|badge', label: 'Permissions' },
                { key: 'created', label: 'Joined', formatter: 'date', sortable: true }
            ]
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
        const loginEventsTable = new TableView({
            collection: loginsCollection,
            hideActivePillNames: ['user'],
            columns: [
                { key: 'created', label: 'Date', formatter: 'datetime', sortable: true, width: '160px' },
                { key: 'ip_address', label: 'IP Address' },
                { key: 'city', label: 'City', formatter: "default('—')" },
                { key: 'region', label: 'Region', formatter: "default('—')" },
                { key: 'country_code', label: 'Country', sortable: true },
                { key: 'source', label: 'Source', sortable: true }
            ]
        });
        loginEventsTable.onTabActivated = async () => {
            await loginEventsTable.collection?.fetch();
        };
        const locationsSection = new TabView({
            tabs: {
                'Map': loginMapView,
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
        const personalSection = new AdminPersonalSection({ model });
        const securitySection = new AdminSecuritySection({ model });
        const connectedSection = new AdminConnectedSection({ model });
        const metadataSection = new AdminMetadataSection({ model });

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
        // automatically filters chips with `when:` callbacks)
        const chips = [
            { text: m => isOnline(m) ? 'Online' : null, variant: 'success',
              when: m => isOnline(m) },
            { text: m => {
                if (m.get('is_superuser')) return 'Superuser';
                if (m.get('is_staff')) return 'Staff';
                return null;
              }, variant: 'info',
              when: m => m.get('is_staff') || m.get('is_superuser') },
            { icon: 'bi-shield-check', text: 'Email verified', variant: 'light',
              when: m => !!m.get('is_email_verified') },
            { icon: 'bi-shield-check', text: 'Phone verified', variant: 'light',
              when: m => !!m.get('is_phone_verified') && !!m.get('phone_number') },
            { text: '2FA enabled', variant: 'light',
              when: m => !!m.get('requires_mfa') },
            { icon: 'bi-lock', text: 'Locked', variant: 'warning',
              when: m => m.get('is_active') === false }
        ];

        // Context menu — supported admin actions only.
        // Groups separated by dividers: identity / auth / verification / state.
        const contextItems = [
            { label: 'Edit User',              action: 'edit-user',              icon: 'bi-pencil' },
            { label: 'Clear Avatar',           action: 'clear-avatar',           icon: 'bi-person-x' },
            { type: 'divider' },
            { label: 'Send Password Reset',    action: 'reset-password',         icon: 'bi-envelope' },
            { label: 'Send Magic Login Link',  action: 'send-magic-link',        icon: 'bi-link-45deg' },
            { label: 'Revoke All Sessions',    action: 'revoke-all-sessions',    icon: 'bi-box-arrow-right' },
            { type: 'divider' },
            { label: 'Send Email Verification', action: 'send-email-verification', icon: 'bi-envelope-check',
              when: m => !m.get('is_email_verified') },
            { label: 'Force Verify Email',      action: 'force-verify-email',      icon: 'bi-patch-check',
              when: m => !m.get('is_email_verified') },
            { label: 'Force Verify Phone',      action: 'force-verify-phone',      icon: 'bi-patch-check',
              when: m => !!m.get('phone_number') && !m.get('is_phone_verified') }
        ];

        super({
            className: 'user-view',
            ...options,
            model,
            header: {
                icon: 'bi-person-circle',
                iconToneFn: m => {
                    if (!m.get('is_active')) return null;
                    if (m.get('is_superuser')) return 'danger';
                    if (m.get('is_staff')) return 'info';
                    return 'primary';
                },
                titleField: 'display_name',
                titleFn: m => {
                    return m.get('display_name')
                        || m.get('username')
                        || m.get('email')
                        || (m.get('id') != null ? `User #${m.get('id')}` : 'Loading user…');
                },
                subtitlePath: '_subtitle',
                subtitlePlaceholder: 'No contact info on file',
                chips,
                activeField: 'is_active',
                actions: [],   // Magic link / reset password live in the context menu
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
        // Profile section bubbles its inline edits up to action handlers here
        this.profileSection.on('action:edit-personal', () => this.onActionEditPersonal());
        this.profileSection.on('action:edit-account',  () => this.onActionEditAccount());
        this.profileSection.on('action:manage-linked', () => this.onActionManageLinked());
        this.profileSection.on('action:manage-passkeys', () => this.onActionManagePasskeys());

        // Inline force-verify / unverify on the email & phone rows
        this.profileSection.on('action:force-verify-email', () => this._setVerification('is_email_verified', true,  'Email'));
        this.profileSection.on('action:unverify-email',     () => this._setVerification('is_email_verified', false, 'Email'));
        this.profileSection.on('action:force-verify-phone', () => this._setVerification('is_phone_verified', true,  'Phone'));
        this.profileSection.on('action:unverify-phone',     () => this._setVerification('is_phone_verified', false, 'Phone'));

        // API keys count -> sidebar badge
        this.apiKeysSection.on('count:changed', (n) => {
            this.setBadge('ApiKeys', n > 0 ? { text: String(n), variant: 'muted' } : null);
        });

        // Sidebar badges from shared collections
        const updateGroupsBadge = () => {
            const n = this.membersCollection.models?.length ?? 0;
            this.setBadge('Groups', n > 0 ? { text: String(n), variant: 'muted' } : null);
        };
        const updateDevicesBadge = () => {
            const browser = this.devicesCollection.models?.length ?? 0;
            const push = this.pushDevicesCollection.models?.length ?? 0;
            const total = browser + push;
            this.setBadge('Devices', total > 0 ? { text: String(total), variant: 'muted' } : null);
        };
        const updateAuditBadge = () => {
            const total =
                (this.eventsCollection.models?.length ?? 0) +
                (this.activityCollection.models?.length ?? 0) +
                (this.objectLogsCollection.models?.length ?? 0);
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
            // Re-render the Profile section + header
            if (this.profileSection?.isMounted()) this.profileSection.render().catch(() => {});
            if (this.headerView?.isMounted()) this.headerView.render().catch(() => {});
        } catch (err) {
            this.getApp()?.toast?.error(`Failed to update: ${err.message}`);
        }
    }

    /**
     * Compute the synthetic `_subtitle` field the header binds to.
     * Format: "{email} · last seen {relative} from {city}"
     */
    _refreshComputedFields() {
        const m = this.model;
        const parts = [];
        if (m.get('email')) parts.push(m.get('email'));
        if (m.get('phone_number')) parts.push(m.get('phone_number'));
        const last = m.get('last_activity');
        if (last) parts.push(`last seen ${formatRelative(last)}`);
        const lastLogin = this.loginsCollection?.models?.[0];
        const city = lastLogin?.get?.('city');
        if (city) parts[parts.length - 1] = `${parts[parts.length - 1]} from ${city}`;
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

    async onActionEditPersonal() {
        const resp = await Modal.modelForm({
            title: 'Edit personal info',
            model: this.model,
            size: 'md',
            formConfig: {
                fields: [
                    { name: 'display_name',  type: 'text',  label: 'Display name', columns: 12 },
                    { name: 'username',      type: 'text',  label: 'Username',     columns: 12 },
                    { name: 'email',         type: 'email', label: 'Email',        columns: 12 },
                    { name: 'phone_number',  type: 'text',  label: 'Phone',        columns: 12 }
                ]
            }
        });
        if (resp) await this._fullRefresh();
        return true;
    }

    async onActionEditAccount() {
        const resp = await Modal.modelForm({
            title: 'Edit account',
            model: this.model,
            size: 'md',
            formConfig: {
                fields: [
                    { name: 'is_active',  type: 'switch', label: 'Active',        columns: 6 },
                    { name: 'is_staff',   type: 'switch', label: 'Staff',         columns: 6 },
                    { name: 'requires_mfa', type: 'switch', label: 'Requires MFA', columns: 6 },
                    { name: 'metadata.timezone', type: 'text', label: 'Timezone', columns: 12,
                      tooltip: 'IANA timezone, e.g. America/Los_Angeles' }
                ]
            }
        });
        if (resp) await this._fullRefresh();
        return true;
    }

    async onActionManageLinked() {
        // Lazy-load the connection list so the user can unlink from a focused dialog.
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
                    return `
                        <div class="card mb-2"><div class="card-body py-2 px-3 d-flex align-items-center gap-3">
                            <i class="bi ${escapeHtml(icon)} fs-5"></i>
                            <div class="flex-grow-1 min-w-0">
                                <div class="fw-semibold small text-capitalize">${escapeHtml(c.provider)}</div>
                                <div class="text-secondary small">${escapeHtml(c.email || '')} · Connected ${escapeHtml(formatRelative(c.created))}</div>
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-danger" data-action="unlink" data-id="${escapeHtml(c.id)}"><i class="bi bi-x-lg me-1"></i>Unlink</button>
                        </div></div>
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
                    return `
                        <div class="card mb-2"><div class="card-body py-2 px-3 d-flex align-items-center gap-3">
                            <i class="bi bi-fingerprint fs-5 text-primary"></i>
                            <div class="flex-grow-1 min-w-0">
                                <div class="fw-semibold small">${escapeHtml(data.friendly_name || 'Unnamed Passkey')}</div>
                                <div class="text-secondary small">Created ${escapeHtml(formatDate(data.created))} · Last used ${escapeHtml(data.last_used ? formatRelative(data.last_used) : 'never')} · ${escapeHtml(String(data.sign_count || 0))} uses</div>
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-action="edit-passkey" data-id="${escapeHtml(data.id)}"><i class="bi bi-pencil"></i></button>
                            <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-passkey" data-id="${escapeHtml(data.id)}"><i class="bi bi-trash"></i></button>
                        </div></div>
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
            // Reload so the new session takes effect.
            window.location.reload();
        } else {
            this.getApp()?.toast?.error(resp.message || 'Failed to impersonate');
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

UserView.VIEW_CLASS = UserView;
User.VIEW_CLASS = UserView;
User.MODEL_REF = 'account.User';

export default UserView;
