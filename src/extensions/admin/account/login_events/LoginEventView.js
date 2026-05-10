/**
 * LoginEventView - Detail view for an individual LoginEvent record.
 *
 * Built on the DetailView primitive. UserView's Locations · Logins
 * ListView opens this modal on row click (clickAction: 'view') once
 * `LoginEvent.VIEW_CLASS = LoginEventView` is wired (at the bottom of
 * this file).
 *
 * Sections:
 *   Overview · Source · ── Activity ── Audit
 *
 * Overview leads with four KPIs (Result · Source · Country · When),
 * then identity flat-rows. Source mirrors GeoIPView's section-level
 * layout (geolocation + threat). Audit is a ListView of LogList records
 * scoped to the same IP, day-grouped via groupByDay('created').
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import MetricCard from '@core/views/data/MetricCard.js';
import ListView from '@core/views/list/ListView.js';
import { groupByDay } from '@core/views/list/grouping.js';
import dataFormatter from '@core/utils/DataFormatter.js';
import { LogList } from '@core/models/Log.js';
import { LoginEvent } from '@ext/admin/models/LoginEvent.js';


// ── Helpers ────────────────────────────────────────────────

const EVENT_TYPE_TONE = {
    success_login: 'success', success: 'success', login: 'success',
    failed_login:  'danger',  failure: 'danger',  failed: 'danger',
    suspicious:    'warning', mfa_required: 'warning', mfa: 'warning'
};

const EVENT_TYPE_LABEL = {
    success_login: 'Success',     success: 'Success',     login: 'Success',
    failed_login:  'Failed',      failure: 'Failed',      failed: 'Failed',
    suspicious:    'Suspicious',  mfa_required: 'MFA required', mfa: 'MFA required'
};

function _eventToneOf(model) {
    const t = String(model?.get?.('event_type') || '').toLowerCase();
    return EVENT_TYPE_TONE[t] || null;
}
function _eventLabelOf(model) {
    const raw = model?.get?.('event_type') || '';
    const t = String(raw).toLowerCase();
    return EVENT_TYPE_LABEL[t] || raw || 'Login';
}


// ── Overview section ───────────────────────────────────────

class LoginOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'login-overview-section',
            template: `
                <div class="detail-kpi-grid">
                    <div data-container="login-kpi-result"></div>
                    <div data-container="login-kpi-source"></div>
                    <div data-container="login-kpi-country"></div>
                    <div data-container="login-kpi-time"></div>
                </div>

                <div class="detail-section-eyebrow">Identity</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">User</div>
                    <div class="detail-flat-row-value">{{model.user.display_name|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Email</div>
                    <div class="detail-flat-row-value">
                        {{#hasEmail|bool}}{{{model.user.email|clipboard}}}{{/hasEmail|bool}}
                        {{^hasEmail|bool}}<span class="text-secondary">—</span>{{/hasEmail|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">IP address</div>
                    <div class="detail-flat-row-value"><code>{{model.ip_address|default:'—'}}</code></div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">User agent</div>
                    <div class="detail-flat-row-value text-break small font-monospace">{{model.user_agent|default:'—'}}</div>
                </div>
            `,
            // The Email row uses the `clipboard` formatter which emits a
            // [data-bs-toggle="tooltip"] copy button.
            enableTooltips: true,
            ...options
        });
    }

    get hasEmail() { return !!this.model?.get?.('user')?.email; }

    async onInit() {
        const m = this.model;
        this.kpiResult = new MetricCard({
            containerId: 'login-kpi-result',
            label: 'Result',
            value: _eventLabelOf(m),
            tone: _eventToneOf(m) || 'default'
        });
        this.kpiSource = new MetricCard({
            containerId: 'login-kpi-source',
            label: 'Source',
            value: m.get('source') || '—'
        });
        this.kpiCountry = new MetricCard({
            containerId: 'login-kpi-country',
            label: 'Country',
            value: m.get('country_code') || m.get('country_name') || '—'
        });
        this.kpiTime = new MetricCard({
            containerId: 'login-kpi-time',
            label: 'When',
            value: dataFormatter.apply('relative', m.get('created')) || '—'
        });
        [this.kpiResult, this.kpiSource, this.kpiCountry, this.kpiTime]
            .forEach(c => this.addChild(c));
    }
}


// ── Source section ─────────────────────────────────────────

class LoginSourceSection extends View {
    constructor(options = {}) {
        super({
            className: 'login-source-section',
            template: `
                <div class="detail-section-eyebrow">Geolocation</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Country</div>
                    <div class="detail-flat-row-value">{{countryDisplay|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Region · City</div>
                    <div class="detail-flat-row-value">{{regionCity|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">ASN · ISP</div>
                    <div class="detail-flat-row-value">{{asnIsp|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Datacenter</div>
                    <div class="detail-flat-row-value">{{{model.is_datacenter|yesnoicon}}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">VPN</div>
                    <div class="detail-flat-row-value">{{{model.is_vpn|yesnoicon}}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Tor</div>
                    <div class="detail-flat-row-value">{{{model.is_tor|yesnoicon}}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Proxy</div>
                    <div class="detail-flat-row-value">{{{model.is_proxy|yesnoicon}}}</div>
                </div>
            `,
            ...options
        });
    }

    get countryDisplay() {
        const cc = this.model?.get?.('country_code');
        const name = this.model?.get?.('country_name');
        return [name, cc ? `(${cc})` : null].filter(Boolean).join(' ');
    }
    get regionCity() {
        return [this.model?.get?.('region'), this.model?.get?.('city')].filter(Boolean).join(' · ');
    }
    get asnIsp() {
        return [this.model?.get?.('asn'), this.model?.get?.('isp')].filter(Boolean).join(' · ');
    }
}


// ── Audit section (related logs from same IP) ──────────────

class LoginAuditSection extends View {
    constructor(options = {}) {
        const { auditCollection, ...rest } = options;
        super({
            className: 'login-audit-section',
            template: `
                <div class="detail-section-eyebrow">Related logs from this IP</div>
                <div data-container="login-audit-list"></div>
            `,
            ...rest
        });
        this.auditCollection = auditCollection;
    }

    async onInit() {
        this.list = new ListView({
            containerId: 'login-audit-list',
            collection: this.auditCollection,
            paginated: true,
            paginationMode: 'pages',
            pageSize: 5,
            ...groupByDay('created'),
            emptyMessage: 'No related logs from this IP.',
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
        this.addChild(this.list);
    }
}


// ── LoginEventView (assembly) ──────────────────────────────

class LoginEventView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new LoginEvent(options.data || {});
        const ip = model.get('ip_address');

        // Audit collection — LogList scoped to the source IP. UserView's
        // Audit feeds use the same `levelTone` / `levelIcon` formatters
        // (registered there); this view depends on UserView being loaded
        // first, which is the natural sequence in the admin portal.
        const auditCollection = ip
            ? new LogList({ params: { ip, size: 25, sort: '-created' } })
            : null;

        const overviewSection = new LoginOverviewSection({ model });
        const sourceSection   = new LoginSourceSection({ model });
        const auditSection    = new LoginAuditSection({ model, auditCollection });

        const sections = [
            { key: 'Overview', label: 'Overview', icon: 'bi-grid-1x2',      view: overviewSection },
            { key: 'Source',   label: 'Source',   icon: 'bi-globe',         view: sourceSection },
            { type: 'divider', label: 'Activity' },
            { key: 'Audit',    label: 'Audit',    icon: 'bi-clock-history', view: auditSection,
              permissions: 'view_logs' }
        ];

        const tone = _eventToneOf(model);

        const chips = [
            { text: m => _eventLabelOf(m), variant: tone || 'secondary',
              when: m => !!m.get('event_type') },
            { icon: 'bi-globe-americas', textPath: 'country_code', variant: 'light',
              when: m => !!m.get('country_code') },
            { icon: 'bi-tag-fill',       textPath: 'source',       variant: 'light',
              when: m => !!m.get('source') },
            { icon: 'bi-shield-lock',    text: 'Tor',         variant: 'danger',
              tooltip: 'Source IP is a Tor exit node',
              when: m => !!m.get('is_tor') },
            { icon: 'bi-shield-shaded',  text: 'VPN',         variant: 'warning',
              tooltip: 'Source IP is a VPN exit node',
              when: m => !!m.get('is_vpn') },
            { icon: 'bi-diagram-3',      text: 'Proxy',       variant: 'warning',
              tooltip: 'Source IP is an open proxy',
              when: m => !!m.get('is_proxy') },
            { icon: 'bi-hdd-stack',      text: 'Datacenter',  variant: 'warning',
              tooltip: 'Source IP belongs to a datacenter range',
              when: m => !!m.get('is_datacenter') }
        ];

        super({
            className: 'login-event-view',
            ...options,
            model,
            header: {
                icon: tone === 'danger' ? 'bi-shield-x' : 'bi-box-arrow-in-right',
                iconToneFn: m => _eventToneOf(m),
                titleFn: m => m.get('ip_address') ? `Login from ${m.get('ip_address')}` : 'Login event',
                subtitleFn: m => {
                    const user = m.get('user') || {};
                    const userName = user.display_name || user.email || user.username
                        || (user.id != null ? `User #${user.id}` : '');
                    const created = m.get('created');
                    const dt = created ? dataFormatter.apply('datetime', created) : '';
                    return [userName, dt].filter(Boolean).join(' · ');
                },
                chips,
                actions: []
            },
            sections,
            activeSection: 'Overview'
        });

        this.auditCollection = auditCollection;
        this.overviewSection = overviewSection;
        this.sourceSection   = sourceSection;
        this.auditSection    = auditSection;
    }

    async onAfterBuild() {
        // Sidebar badge: count of related logs.
        if (this.auditCollection) {
            const updateAuditBadge = () => {
                const n = this.auditCollection.totalCount ?? this.auditCollection.models?.length ?? 0;
                this.setBadge('Audit', n > 0 ? { text: String(n), variant: 'muted' } : null);
            };
            this.auditCollection.on('fetch:success', updateAuditBadge, this);
            this.auditCollection.fetch().catch(() => {});
        }
    }
}


LoginEvent.VIEW_CLASS = LoginEventView;
LoginEvent.MODEL_REF  = 'account.LoginEvent';
LoginEventView.VIEW_CLASS = LoginEventView;

export default LoginEventView;
export {
    LoginEventView,
    LoginOverviewSection,
    LoginSourceSection,
    LoginAuditSection
};
