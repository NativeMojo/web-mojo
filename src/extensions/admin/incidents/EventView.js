/**
 * EventView - Detailed view for an IncidentEvent record.
 *
 * DetailView shell:
 *   - Tone-driven header (icon + chips reflect level / scope / category /
 *     country / triggered signals / related model)
 *   - SideNav rail with per-domain sections that appear only when the
 *     event payload populates them: Overview · Source · Request ·
 *     Stack Trace · OSSEC Alert · Bouncer · Permissions · Raw
 *
 * Mirrors the `IncidentView` / `LoginEventView` organisation: section
 * classes live in-file; the assembly is at the bottom.
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import MetricCard from '@core/views/data/MetricCard.js';
import KnownFieldsCard from '@core/views/data/KnownFieldsCard.js';
import StackTraceView from '@core/views/data/StackTraceView.js';
import Modal from '@core/views/feedback/Modal.js';
import dataFormatter from '@core/utils/DataFormatter.js';
import { Incident, IncidentEvent } from '@ext/admin/models/Incident.js';
import { User, UserDevice, UserDeviceLocation } from '@core/models/User.js';
import { GeoLocatedIP } from '@core/models/System.js';
import { Member } from '@core/models/Member.js';
import { Ticket } from '@ext/admin/models/Tickets.js';
import { Job } from '@ext/admin/models/Job.js';
import { Log } from '@core/models/Log.js';
import { ApiKey } from '@core/models/ApiKey.js';
import IncidentView from './IncidentView.js';
import GeoIPView from '../account/devices/GeoIPView.js';

/**
 * Map of model_name strings (as returned by the API) to Model classes.
 * Used to resolve the related model for "View Related Model" actions.
 */
const MODEL_REGISTRY = {
    user: User,
    userdevice: UserDevice,
    userdevicelocation: UserDeviceLocation,
    geolocatedip: GeoLocatedIP,
    member: Member,
    incident: Incident,
    incidentevent: IncidentEvent,
    ticket: Ticket,
    job: Job,
    log: Log,
    apikey: ApiKey,
};

// ── Helpers ────────────────────────────────────────────────

/**
 * Map a numeric event level (1-5 scheme used by IncidentEvent) to a
 * Bootstrap-icon and tone string. The tone feeds both the header icon
 * and the Level chip's variant, keeping severity readouts in sync.
 */
function _iconForLevel(level) {
    const n = Number(level) || 0;
    if (n >= 5) return { icon: 'bi-exclamation-octagon-fill', tone: 'danger' };
    if (n >= 4) return { icon: 'bi-exclamation-triangle-fill', tone: 'warning' };
    if (n >= 3) return { icon: 'bi-info-circle-fill',         tone: 'info' };
    return         { icon: 'bi-bell-fill',                    tone: 'secondary' };
}

/** Bootstrap badge variant for known `triggered_signals`. Falls back to `light`. */
function _signalChipVariant(signal) {
    const s = String(signal || '').toLowerCase();
    if (s === 'geo_tor' || s.includes('attack') || s.includes('malware')) return 'danger';
    if (s.startsWith('geo_') || s.includes('vpn') || s.includes('proxy') || s.includes('datacenter')) return 'warning';
    if (s.includes('rate') || s.includes('throttle')) return 'info';
    return 'light';
}

/** Bouncer decision badge variant. */
function _decisionVariant(decision) {
    const d = String(decision || '').toLowerCase();
    if (d === 'block' || d === 'deny' || d === 'reject') return 'danger';
    if (d === 'monitor' || d === 'review' || d === 'challenge') return 'warning';
    if (d === 'allow' || d === 'pass' || d === 'accept') return 'success';
    return 'secondary';
}

/** True when the event is an OSSEC alert (by scope OR by presence of an alert_id). */
function _isOssec(model) {
    return String(model.get('scope') || '').toLowerCase() === 'ossec'
        || !!model.get('metadata.alert_id');
}

/** Resolve the source IP from either the top-level field or `metadata.source_ip`. */
function _sourceIp(model) {
    return model.get('source_ip') || model.get('metadata.source_ip') || '';
}


// ── Overview section ───────────────────────────────────────

/**
 * Compact KPI strip + identity flat-rows. Replaces the prior 2-column
 * `DataView` dump.
 */
class EventOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'event-overview-section',
            template: `
                <style>
                    /* The framework's .detail-kpi-grid only drops to 2-up below
                       480px container width — but an lg modal is wider than that,
                       so long values like 'Rest_value_error' overflow the 4-up
                       layout. Force 2x2 in this section, and let any oversized
                       value wrap on any character. */
                    .event-overview-section .detail-kpi-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                    .event-overview-section .metric-card-value {
                        overflow-wrap: anywhere;
                        word-break: break-word;
                    }
                </style>
                <div class="detail-kpi-grid">
                    <div data-container="event-kpi-level"></div>
                    <div data-container="event-kpi-scope"></div>
                    <div data-container="event-kpi-category"></div>
                    <div data-container="event-kpi-when"></div>
                </div>

                <div class="detail-section-eyebrow">Identity</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Event ID</div>
                    <div class="detail-flat-row-value"><code>{{model.id|default:'—'}}</code></div>
                </div>
                {{#hasIncident|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Incident</div>
                    <div class="detail-flat-row-value">
                        <a role="button" class="text-decoration-none" data-action="view-incident"><code>#{{model.incident}}</code></a>
                    </div>
                </div>
                {{/hasIncident|bool}}
                {{#hasRelatedModel|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Related model</div>
                    <div class="detail-flat-row-value">
                        <a role="button" class="text-decoration-none" data-action="view-model">{{relatedModelDisplay}}</a>
                    </div>
                </div>
                {{/hasRelatedModel|bool}}
                {{#hasServer|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Server</div>
                    <div class="detail-flat-row-value"><code>{{model.metadata.server}}</code></div>
                </div>
                {{/hasServer|bool}}
                {{#hasDetails|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Details</div>
                    <div class="detail-flat-row-value text-break">{{model.details}}</div>
                </div>
                {{/hasDetails|bool}}
            `,
            ...options
        });
    }

    get hasIncident()      { return this.model.get('incident') != null; }
    get hasRelatedModel()  { return !!this.model.get('model_name') && this.model.get('model_id') != null; }
    get hasServer()        { return !!this.model.get('metadata.server'); }
    get hasDetails()       { return !!this.model.get('details'); }

    get relatedModelDisplay() {
        const name = this.model.get('model_name');
        const id = this.model.get('model_id');
        return [name, id != null ? `#${id}` : null].filter(Boolean).join(' ');
    }

    async onInit() {
        const m = this.model;
        const tone = _iconForLevel(m.get('level')).tone;

        this.kpiLevel = new MetricCard({
            containerId: 'event-kpi-level',
            label: 'Level',
            value: m.get('level') != null ? `L${m.get('level')}` : '—',
            tone: tone === 'secondary' ? 'default' : tone
        });
        this.kpiScope = new MetricCard({
            containerId: 'event-kpi-scope',
            label: 'Scope',
            value: m.get('scope') || '—'
        });
        this.kpiCategory = new MetricCard({
            containerId: 'event-kpi-category',
            label: 'Category',
            value: dataFormatter.apply('capitalize', m.get('category')) || '—'
        });
        this.kpiWhen = new MetricCard({
            containerId: 'event-kpi-when',
            label: 'When',
            value: dataFormatter.apply('relative', m.get('created')) || '—'
        });

        [this.kpiLevel, this.kpiScope, this.kpiCategory, this.kpiWhen]
            .forEach(c => this.addChild(c));
    }
}


// ── Source section ─────────────────────────────────────────

/**
 * Geo + IP readout. Mirrors `IncidentSourceSection` in shape, but
 * lighter — events are immutable so there's no block/whitelist
 * toolbar. The Source IP row is a click-through to `GeoIPView` when
 * the IP is present.
 */
class EventSourceSection extends View {
    constructor(options = {}) {
        super({
            className: 'event-source-section',
            template: `
                <div class="detail-section-eyebrow">Source</div>
                {{#hasSourceIp|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Source IP</div>
                    <div class="detail-flat-row-value">
                        <a role="button" class="font-monospace fw-semibold text-decoration-none" data-action="view-geoip">{{sourceIp}}</a>
                    </div>
                </div>
                {{/hasSourceIp|bool}}
                {{#hasRequestIp|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Request IP</div>
                    <div class="detail-flat-row-value"><code>{{requestIp}}</code></div>
                </div>
                {{/hasRequestIp|bool}}
                {{#hasCityRegion|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">City · Region</div>
                    <div class="detail-flat-row-value">{{cityRegion}}</div>
                </div>
                {{/hasCityRegion|bool}}
                {{#hasCountry|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Country</div>
                    <div class="detail-flat-row-value">{{countryDisplay}}</div>
                </div>
                {{/hasCountry|bool}}
                {{#hasTimezone|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Timezone</div>
                    <div class="detail-flat-row-value">{{model.metadata.timezone}}</div>
                </div>
                {{/hasTimezone|bool}}
                {{#hasLatLon|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Lat / Lon</div>
                    <div class="detail-flat-row-value"><code>{{latLon}}</code></div>
                </div>
                {{/hasLatLon|bool}}
            `,
            ...options
        });
    }

    get sourceIp()       { return _sourceIp(this.model); }
    get requestIp()      { return this.model.get('request_ip') || this.model.get('metadata.request_ip') || ''; }
    get hasSourceIp()    { return !!this.sourceIp; }
    get hasRequestIp()   { return !!this.requestIp && this.requestIp !== this.sourceIp; }
    get cityRegion() {
        return [this.model.get('metadata.city'), this.model.get('metadata.region')].filter(Boolean).join(' · ');
    }
    get hasCityRegion()  { return !!this.cityRegion; }
    get countryDisplay() {
        const cc   = this.model.get('metadata.country_code');
        const name = this.model.get('metadata.country_name');
        return [name, cc ? `(${cc})` : null].filter(Boolean).join(' ');
    }
    get hasCountry()     { return !!this.countryDisplay; }
    get hasTimezone()    { return !!this.model.get('metadata.timezone'); }
    get latLon() {
        const lat = this.model.get('metadata.latitude');
        const lon = this.model.get('metadata.longitude');
        return (lat != null && lon != null) ? `${lat}, ${lon}` : '';
    }
    get hasLatLon()      { return !!this.latLon; }

    async onActionViewGeoip() {
        const ip = this.sourceIp;
        if (!ip) return true;
        if (GeoIPView && typeof GeoIPView.show === 'function') {
            await GeoIPView.show(ip);
        } else {
            this.getApp()?.toast?.warning('GeoIP details unavailable in this build.');
        }
        return true;
    }
}


// ── Request section ────────────────────────────────────────

/**
 * HTTP request capture — mirrors `IncidentRequestSection` (HTTP fields
 * + optional `request_data` payload block).
 */
class EventRequestSection extends View {
    constructor(options = {}) {
        super({
            className: 'event-request-section',
            template: `
                <div class="detail-section-eyebrow">Request</div>
                {{#hasMethod|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Method</div>
                    <div class="detail-flat-row-value"><span class="badge bg-info text-dark">{{httpMethod}}</span></div>
                </div>
                {{/hasMethod|bool}}
                {{#hasStatus|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Status</div>
                    <div class="detail-flat-row-value"><code>{{httpStatus}}</code></div>
                </div>
                {{/hasStatus|bool}}
                {{#hasHost|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Host</div>
                    <div class="detail-flat-row-value"><code>{{httpHost}}</code></div>
                </div>
                {{/hasHost|bool}}
                {{#hasPath|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Path</div>
                    <div class="detail-flat-row-value"><code>{{httpPath}}</code></div>
                </div>
                {{/hasPath|bool}}
                {{#hasUrl|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">URL</div>
                    <div class="detail-flat-row-value"><code>{{httpUrl}}</code></div>
                </div>
                {{/hasUrl|bool}}
                {{#hasProtocol|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Protocol</div>
                    <div class="detail-flat-row-value"><code>{{httpProtocol}}</code></div>
                </div>
                {{/hasProtocol|bool}}
                {{#hasQueryString|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Query string</div>
                    <div class="detail-flat-row-value"><code>{{httpQueryString}}</code></div>
                </div>
                {{/hasQueryString|bool}}
                {{#hasUserAgent|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">User agent</div>
                    <div class="detail-flat-row-value text-break small font-monospace">{{httpUserAgent}}</div>
                </div>
                {{/hasUserAgent|bool}}

                {{#hasRequestData|bool}}
                <div class="detail-section-eyebrow">Request data</div>
                <pre class="detail-payload-block"><code>{{requestDataJson}}</code></pre>
                {{/hasRequestData|bool}}
            `,
            ...options
        });
    }

    get httpMethod()       { return this.model.get('metadata.http_method') || this.model.get('http_method') || ''; }
    get httpStatus()       {
        const s = this.model.get('metadata.http_status');
        return s != null ? String(s) : '';
    }
    get httpHost()         { return this.model.get('metadata.http_host') || ''; }
    get httpPath()         { return this.model.get('metadata.http_path') || ''; }
    get httpUrl()          { return this.model.get('metadata.http_url') || ''; }
    get httpProtocol()     { return this.model.get('metadata.http_protocol') || ''; }
    get httpQueryString()  { return this.model.get('metadata.http_query_string') || ''; }
    get httpUserAgent()    { return this.model.get('metadata.http_user_agent') || this.model.get('metadata.user_agent') || ''; }

    get hasMethod()        { return !!this.httpMethod; }
    get hasStatus()        { return !!this.httpStatus; }
    get hasHost()          { return !!this.httpHost; }
    get hasPath()          { return !!this.httpPath; }
    get hasUrl()           { return !!this.httpUrl; }
    get hasProtocol()      { return !!this.httpProtocol; }
    get hasQueryString()   { return !!this.httpQueryString; }
    get hasUserAgent()     { return !!this.httpUserAgent; }

    get hasRequestData()   { return this.model.get('metadata.request_data') != null
                                 && (typeof this.model.get('metadata.request_data') !== 'object'
                                     || Object.keys(this.model.get('metadata.request_data')).length > 0); }
    get requestDataJson() {
        const rd = this.model.get('metadata.request_data');
        if (rd == null) return '';
        if (typeof rd === 'string') return rd;
        try { return JSON.stringify(rd, null, 2); }
        catch (_e) { return String(rd); }
    }
}


// ── Stack Trace section ────────────────────────────────────

class EventStackTraceSection extends View {
    constructor(options = {}) {
        const { stackTrace = '', ...rest } = options;
        super({
            className: 'event-stack-trace-section',
            template: `
                <div class="detail-section-eyebrow">Stack Trace</div>
                <div data-container="event-stack-trace-body"></div>
            `,
            ...rest
        });
        this.stackTrace = stackTrace;
    }

    async onInit() {
        try {
            this.body = new StackTraceView({
                containerId: 'event-stack-trace-body',
                stackTrace: this.stackTrace
            });
            this.addChild(this.body);
        } catch (_e) {
            this.body = new View({
                containerId: 'event-stack-trace-body',
                template: `<pre class="detail-payload-block">{{stackTrace}}</pre>`
            });
            this.body.stackTrace = this.stackTrace;
            this.addChild(this.body);
        }
    }
}


// ── OSSEC Alert section ────────────────────────────────────

class EventOssecSection extends View {
    constructor(options = {}) {
        super({
            className: 'event-ossec-section',
            template: `
                <div class="detail-section-eyebrow">OSSEC Alert</div>
                {{#hasAlertId|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Alert ID</div>
                    <div class="detail-flat-row-value"><code>{{model.metadata.alert_id}}</code></div>
                </div>
                {{/hasAlertId|bool}}
                {{#hasRuleId|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Rule ID</div>
                    <div class="detail-flat-row-value"><code>{{model.metadata.rule_id}}</code></div>
                </div>
                {{/hasRuleId|bool}}
                {{#hasLogfile|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Logfile</div>
                    <div class="detail-flat-row-value"><code>{{model.metadata.logfile}}</code></div>
                </div>
                {{/hasLogfile|bool}}
                {{#hasUpstream|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Upstream</div>
                    <div class="detail-flat-row-value"><code>{{model.metadata.upstream}}</code></div>
                </div>
                {{/hasUpstream|bool}}
                {{#hasErrorCode|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Error code</div>
                    <div class="detail-flat-row-value"><code>{{model.metadata.error_code}}</code></div>
                </div>
                {{/hasErrorCode|bool}}
                {{#hasErrorMessage|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Error message</div>
                    <div class="detail-flat-row-value">{{model.metadata.error_message}}</div>
                </div>
                {{/hasErrorMessage|bool}}

                {{#hasAlertText|bool}}
                <div class="detail-section-eyebrow">Raw alert</div>
                <pre class="detail-payload-block"><code>{{model.metadata.text}}</code></pre>
                {{/hasAlertText|bool}}
            `,
            ...options
        });
    }

    get hasAlertId()      { return !!this.model.get('metadata.alert_id'); }
    get hasRuleId()       { return this.model.get('metadata.rule_id') != null; }
    get hasLogfile()      { return !!this.model.get('metadata.logfile'); }
    get hasUpstream()     { return !!this.model.get('metadata.upstream'); }
    get hasErrorCode()    { return this.model.get('metadata.error_code') != null && this.model.get('metadata.error_code') !== ''; }
    get hasErrorMessage() { return !!this.model.get('metadata.error_message'); }
    get hasAlertText()    { return !!this.model.get('metadata.text'); }
}


// ── Bouncer section ────────────────────────────────────────

class EventBouncerSection extends View {
    constructor(options = {}) {
        super({
            className: 'event-bouncer-section',
            template: `
                <div class="detail-section-eyebrow">Bouncer</div>
                {{#hasDecision|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Decision</div>
                    <div class="detail-flat-row-value">{{{decisionBadge}}}</div>
                </div>
                {{/hasDecision|bool}}
                {{#hasRiskScore|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Risk score</div>
                    <div class="detail-flat-row-value"><code>{{model.metadata.risk_score}}</code></div>
                </div>
                {{/hasRiskScore|bool}}
                {{#hasPageType|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Page type</div>
                    <div class="detail-flat-row-value">{{model.metadata.page_type}}</div>
                </div>
                {{/hasPageType|bool}}
                {{#hasMuid|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">MUID</div>
                    <div class="detail-flat-row-value"><code>{{model.metadata.muid}}</code></div>
                </div>
                {{/hasMuid|bool}}
                {{#hasDuid|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">DUID</div>
                    <div class="detail-flat-row-value"><code>{{model.metadata.duid|default:'—'}}</code></div>
                </div>
                {{/hasDuid|bool}}

                {{#hasSignals|bool}}
                <div class="detail-section-eyebrow">Triggered signals</div>
                <div class="d-flex flex-wrap gap-2">{{{signalsHtml}}}</div>
                {{/hasSignals|bool}}
            `,
            ...options
        });
    }

    get hasDecision()  { return !!this.model.get('metadata.decision'); }
    get hasRiskScore() { return this.model.get('metadata.risk_score') != null; }
    get hasPageType()  { return !!this.model.get('metadata.page_type'); }
    get hasMuid()      { return !!this.model.get('metadata.muid'); }
    get hasDuid()      { return this.model.get('metadata.duid') !== undefined; }

    get decisionBadge() {
        const d = this.model.get('metadata.decision') || '';
        const variant = _decisionVariant(d);
        return `<span class="badge bg-${this.escapeHtml(variant)}">${this.escapeHtml(String(d))}</span>`;
    }

    get signals() {
        const s = this.model.get('metadata.triggered_signals');
        return Array.isArray(s) ? s : [];
    }
    get hasSignals() { return this.signals.length > 0; }
    get signalsHtml() {
        return this.signals.map(sig => {
            const variant = _signalChipVariant(sig);
            return `<span class="badge bg-${this.escapeHtml(variant)}">${this.escapeHtml(String(sig))}</span>`;
        }).join('');
    }
}


// ── Permissions section ────────────────────────────────────

class EventPermissionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'event-permissions-section',
            template: `
                <div class="detail-section-eyebrow">Permissions</div>
                {{#hasPermissionKeys|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Permission keys</div>
                    <div class="detail-flat-row-value">{{{permissionKeysHtml}}}</div>
                </div>
                {{/hasPermissionKeys|bool}}
                {{#hasPerms|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Perms</div>
                    <div class="detail-flat-row-value">{{{permsHtml}}}</div>
                </div>
                {{/hasPerms|bool}}
            `,
            ...options
        });
    }

    _coerceList(value) {
        if (value == null || value === '') return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return value.split(/[,\s]+/).filter(Boolean);
        if (typeof value === 'object') return Object.keys(value);
        return [String(value)];
    }
    _renderList(value) {
        const list = this._coerceList(value);
        if (!list.length) return '<span class="text-secondary fst-italic">—</span>';
        return list.map(v => `<code class="me-1">${this.escapeHtml(String(v))}</code>`).join(' ');
    }

    get hasPermissionKeys() { return this._coerceList(this.model.get('metadata.permission_keys')).length > 0; }
    get hasPerms()          { return this._coerceList(this.model.get('metadata.perms')).length > 0; }

    get permissionKeysHtml() { return this._renderList(this.model.get('metadata.permission_keys')); }
    get permsHtml()          { return this._renderList(this.model.get('metadata.perms')); }
}


// ── Raw section ────────────────────────────────────────────

class EventRawSection extends View {
    constructor(options = {}) {
        super({
            className: 'event-raw-section',
            template: `
                <div class="detail-section-eyebrow">Raw metadata</div>
                <div data-container="event-raw-card"></div>
            `,
            ...options
        });
    }

    async onInit() {
        this.card = new KnownFieldsCard({
            containerId: 'event-raw-card',
            model: this.model,
            data: (m) => m.get('metadata') || {},
            knownKeys: [],
            rawCollapsed: false,
            rawLabel: 'Raw metadata JSON',
            emptyText: 'No metadata recorded on this event.'
        });
        this.addChild(this.card);
    }
}


// ── EventView (assembly) ───────────────────────────────────

class EventView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new IncidentEvent(options.data || {});
        const metadata = model.get('metadata') || {};

        // Decide section visibility once at construction time. The rail
        // only carries sections that have data to show — matches the
        // pattern in IncidentView (`IncidentView.js:1677+`).
        const hasSource = !!_sourceIp(model)
            || !!model.get('metadata.city')
            || !!model.get('metadata.country_code')
            || !!model.get('metadata.region');

        const hasRequest = !!(metadata.http_method || metadata.http_status != null
            || metadata.http_host || metadata.http_path || metadata.http_url
            || metadata.http_protocol || metadata.http_query_string
            || metadata.http_user_agent || metadata.user_agent
            || (metadata.request_data && (typeof metadata.request_data !== 'object'
                || Object.keys(metadata.request_data).length > 0)));

        const hasStackTrace = !!metadata.stack_trace;

        const hasOssec = _isOssec(model);

        const hasBouncer = !!metadata.decision || metadata.risk_score != null
            || (Array.isArray(metadata.triggered_signals) && metadata.triggered_signals.length > 0);

        const hasPermissions = (metadata.permission_keys != null && metadata.permission_keys !== '')
            || (metadata.perms != null && metadata.perms !== '');

        // ── Section instances ─────────────────────────────
        const overviewSection = new EventOverviewSection({ model });
        const sourceSection = hasSource ? new EventSourceSection({ model }) : null;
        const requestSection = hasRequest ? new EventRequestSection({ model }) : null;
        const stackTraceSection = hasStackTrace
            ? new EventStackTraceSection({ stackTrace: metadata.stack_trace })
            : null;
        const ossecSection = hasOssec ? new EventOssecSection({ model }) : null;
        const bouncerSection = hasBouncer ? new EventBouncerSection({ model }) : null;
        const permissionsSection = hasPermissions ? new EventPermissionsSection({ model }) : null;
        const rawSection = new EventRawSection({ model });

        const investigationSections = [
            sourceSection && { key: 'Source', label: 'Source', icon: 'bi-globe2', view: sourceSection },
            requestSection && { key: 'Request', label: 'Request', icon: 'bi-funnel', view: requestSection },
            stackTraceSection && { key: 'StackTrace', label: 'Stack Trace', icon: 'bi-code-square', view: stackTraceSection },
            ossecSection && { key: 'Ossec', label: 'OSSEC Alert', icon: 'bi-shield-exclamation', view: ossecSection },
            bouncerSection && { key: 'Bouncer', label: 'Bouncer', icon: 'bi-shield-shaded', view: bouncerSection },
            permissionsSection && { key: 'Permissions', label: 'Permissions', icon: 'bi-key', view: permissionsSection }
        ].filter(Boolean);

        const sections = [
            { key: 'Overview', label: 'Overview', icon: 'bi-grid-1x2', view: overviewSection }
        ];
        if (investigationSections.length) {
            sections.push({ type: 'divider', label: 'Investigation' });
            sections.push(...investigationSections);
        }
        sections.push({ type: 'divider', label: 'Raw' });
        sections.push({ key: 'Raw', label: 'Raw', icon: 'bi-braces', view: rawSection });

        // ── Header config ─────────────────────────────────
        const levelMeta = _iconForLevel(model.get('level'));

        const chips = [
            {
                text: m => m.get('level') != null ? `L${m.get('level')}` : '',
                variant: _iconForLevel(model.get('level')).tone === 'secondary'
                    ? 'secondary'
                    : _iconForLevel(model.get('level')).tone,
                when: m => m.get('level') != null
            },
            { textPath: 'scope', variant: 'light', when: m => !!m.get('scope') },
            {
                text: m => dataFormatter.apply('capitalize', m.get('category')),
                variant: 'light',
                when: m => !!m.get('category')
            },
            {
                icon: 'bi-globe-americas',
                textPath: 'metadata.country_code',
                variant: 'light',
                when: m => !!m.get('metadata.country_code')
            }
        ];

        // Per-signal chips (cap at 4 with a +N overflow chip).
        const signals = Array.isArray(metadata.triggered_signals) ? metadata.triggered_signals : [];
        const visibleSignals = signals.slice(0, 4);
        for (const sig of visibleSignals) {
            chips.push({
                icon: 'bi-flag-fill',
                text: String(sig),
                variant: _signalChipVariant(sig)
            });
        }
        if (signals.length > visibleSignals.length) {
            chips.push({
                text: `+${signals.length - visibleSignals.length} more`,
                variant: 'light'
            });
        }

        // Related model chip — click-through to the related model's VIEW_CLASS.
        chips.push({
            icon: 'bi-box-arrow-up-right',
            text: m => {
                const name = m.get('model_name');
                const id = m.get('model_id');
                return [name, id != null ? `#${id}` : null].filter(Boolean).join(' ');
            },
            variant: 'light',
            action: 'view-model',
            when: m => !!m.get('model_name') && m.get('model_id') != null
        });

        const contextMenu = {
            items: [
                { label: 'View Incident', action: 'view-incident', icon: 'bi-shield-exclamation', disabled: !model.get('incident') },
                { label: 'View Related Model', action: 'view-model', icon: 'bi-box-arrow-up-right',
                  disabled: !(model.get('model_name') && model.get('model_id') != null) },
                { type: 'divider' },
                { label: 'Delete Event', action: 'delete-event', icon: 'bi-trash', danger: true }
            ]
        };

        super({
            className: 'event-view',
            ...options,
            model,
            header: {
                icon: levelMeta.icon,
                iconToneFn: m => _iconForLevel(m.get('level')).tone,
                titleFn: m => m.get('title') || 'System Event',
                subtitleFn: m => {
                    const created = m.get('created');
                    const dt = created != null
                        ? dataFormatter.apply('datetime', dataFormatter.apply('epoch', created))
                        : '';
                    const ip = _sourceIp(m);
                    return [dt, ip ? `from ${ip}` : null].filter(Boolean).join(' · ');
                },
                chips,
                actions: [],
                contextMenu
            },
            sections,
            activeSection: 'Overview'
        });

        this.overviewSection = overviewSection;
        this.sourceSection = sourceSection;
        this.requestSection = requestSection;
        this.stackTraceSection = stackTraceSection;
        this.ossecSection = ossecSection;
        this.bouncerSection = bouncerSection;
        this.permissionsSection = permissionsSection;
        this.rawSection = rawSection;
    }

    async onActionViewIncident() {
        const incidentId = this.model.get('incident') || this.model.get('incident_id');
        if (!incidentId) {
            this.getApp()?.toast?.warning('No incident linked to this event');
            return true;
        }
        const incident = new Incident({ id: incidentId });
        const view = new IncidentView({ model: incident });
        await Modal.detail(view);
        return true;
    }

    async onActionViewModel() {
        const modelName = this.model.get('model_name') || this.model.get('model_class');
        const objectId  = this.model.get('model_id')   || this.model.get('object_id');
        if (!modelName || objectId == null) {
            this.getApp()?.toast?.warning('No related model linked to this event');
            return true;
        }

        const key = String(modelName).toLowerCase().replace(/[^a-z]/g, '');
        const ModelClass = MODEL_REGISTRY[key];

        if (!ModelClass) {
            this.getApp()?.toast?.warning(`Unknown model type: ${modelName}`);
            return true;
        }
        if (!ModelClass.VIEW_CLASS) {
            this.getApp()?.toast?.warning(`No detail view available for ${modelName}`);
            return true;
        }

        await Modal.showModelById(ModelClass, objectId);
        return true;
    }

    async onActionDeleteEvent() {
        const confirmed = await Modal.confirm(
            'Are you sure you want to delete this event? This action cannot be undone.',
            'Confirm Deletion',
            { confirmClass: 'btn-danger', confirmText: 'Delete' }
        );
        if (confirmed) {
            const resp = await this.model.destroy();
            if (resp.success) {
                this.emit('event:deleted', { model: this.model });
            }
        }
        return true;
    }
}


IncidentEvent.VIEW_CLASS = EventView;
IncidentEvent.MODEL_REF  = 'incident.Event';
EventView.VIEW_CLASS     = EventView;

export default EventView;
export {
    EventView,
    EventOverviewSection,
    EventSourceSection,
    EventRequestSection,
    EventStackTraceSection,
    EventOssecSection,
    EventBouncerSection,
    EventPermissionsSection,
    EventRawSection
};
