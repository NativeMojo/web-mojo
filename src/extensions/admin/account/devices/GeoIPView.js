/**
 * GeoIPView - Detail view for a GeoLocatedIP record, built on the
 * DetailView primitive.
 *
 * Sections (collapsed from 8 → 7):
 *   Overview · Network · Risk & Reputation
 *   ── Enforcement ── Block & Whitelist
 *   ── Activity ──   Activity (TabView: Events · Logs)
 *   ── Detail ──     Metadata
 *
 * Map is embedded inside Overview (lazy-init on mount via MapView)
 * instead of being its own section. Threat flags (VPN / Tor / Proxy /
 * Cloud / Datacenter) are promoted to header chips and only render
 * when truthy.
 *
 * Open via `Modal.detail(new GeoIPView({ model }))` — pair with
 * `viewDialogOptions: { header: false, noBodyPadding: true,
 * buttons: [] }` when wired through TableView. Inherits `size: 'lg'`
 * from `Modal.detail()`'s default.
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import TableView from '@core/views/table/TableView.js';
import TabView from '@core/views/navigation/TabView.js';
import Modal from '@core/views/feedback/Modal.js';
import MetricCard from '@core/views/data/MetricCard.js';
import StatusPanel from '@core/views/data/StatusPanel.js';
import KnownFieldsCard from '@core/views/data/KnownFieldsCard.js';
import MapView from '@ext/map/MapView.js';
import { GeoLocatedIP } from '@core/models/System.js';
import { IncidentEventList } from '@ext/admin/models/Incident.js';
import { LogList } from '@core/models/Log.js';


// ── Helpers ───────────────────────────────────────────────

const COUNTRY_FLAG = (cc) => {
    if (!cc || typeof cc !== 'string' || cc.length !== 2) return '';
    const A = 0x41, REGIONAL = 0x1F1E6;
    const up = cc.toUpperCase();
    return String.fromCodePoint(REGIONAL + (up.charCodeAt(0) - A))
         + String.fromCodePoint(REGIONAL + (up.charCodeAt(1) - A));
};

const THREAT_TONE = {
    none: 'success',
    low: 'success',
    medium: 'warning',
    high: 'danger',
    critical: 'danger'
};


// ── Overview section ──────────────────────────────────────
//
// Mustache template binds to `this` (the section view) and `this.model`.
// Map embed sits flush against the section background — no card chrome.

class GeoIPOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'geoip-overview-section',
            template: `
                <div class="detail-section-eyebrow">Overview</div>

                <div data-container="geoip-overview-status"></div>

                <div class="detail-kpi-grid">
                    <div data-container="geoip-kpi-threat"></div>
                    <div data-container="geoip-kpi-events"></div>
                    <div data-container="geoip-kpi-lastseen"></div>
                    <div data-container="geoip-kpi-logins"></div>
                </div>

                <div class="detail-section-eyebrow">Location &amp; network</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Country</div>
                    <div class="detail-flat-row-value">
                        {{#hasCountry|bool}}{{{countryDisplay}}}{{/hasCountry|bool}}
                        {{^hasCountry|bool}}<span class="text-secondary fst-italic">—</span>{{/hasCountry|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Region · City</div>
                    <div class="detail-flat-row-value">
                        {{#hasLocation|bool}}{{regionCityDisplay}}{{/hasLocation|bool}}
                        {{^hasLocation|bool}}<span class="text-secondary fst-italic">—</span>{{/hasLocation|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Coordinates</div>
                    <div class="detail-flat-row-value">
                        {{#hasCoords|bool}}<code>{{coordsDisplay}}</code>{{/hasCoords|bool}}
                        {{^hasCoords|bool}}<span class="text-secondary fst-italic">—</span>{{/hasCoords|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">ASN · ISP</div>
                    <div class="detail-flat-row-value">
                        {{#hasAsnOrIsp|bool}}{{{asnIspDisplay}}}{{/hasAsnOrIsp|bool}}
                        {{^hasAsnOrIsp|bool}}<span class="text-secondary fst-italic">—</span>{{/hasAsnOrIsp|bool}}
                    </div>
                </div>

                <div data-container="geoip-overview-map"></div>
                {{#hasCoords|bool}}
                    <div class="detail-flat-row-action">
                        <button type="button" class="detail-section-action" data-action="open-on-map" data-bs-toggle="tooltip" title="Open on map">
                            <i class="bi bi-box-arrow-up-right"></i>
                        </button>
                    </div>
                {{/hasCoords|bool}}
            `,
            ...options
        });
        this._mapMounted = false;
    }

    // ── Computed properties for the template ─────────────

    get hasCountry() {
        return !!(this.model.get('country_code') || this.model.get('country_name'));
    }

    get countryDisplay() {
        const cc = this.model.get('country_code') || '';
        const name = this.model.get('country_name') || '';
        const flag = COUNTRY_FLAG(cc);
        const safeName = this.escapeHtml(name || cc || '—');
        const codeChip = cc
            ? ` <code class="text-secondary small">${this.escapeHtml(cc)}</code>`
            : '';
        return `${flag ? `${flag} ` : ''}${safeName}${codeChip}`;
    }

    get hasLocation() {
        return !!(this.model.get('region') || this.model.get('city'));
    }

    get regionCityDisplay() {
        const region = this.model.get('region') || '';
        const city = this.model.get('city') || '';
        return [region, city].filter(Boolean).join(' · ');
    }

    get hasCoords() {
        const lat = this.model.get('latitude');
        const lng = this.model.get('longitude');
        return lat != null && lng != null;
    }

    get coordsDisplay() {
        const lat = this.model.get('latitude');
        const lng = this.model.get('longitude');
        return `${lat}, ${lng}`;
    }

    get hasAsnOrIsp() {
        return !!(this.model.get('asn') || this.model.get('isp'));
    }

    get asnIspDisplay() {
        const asn = this.model.get('asn');
        const asnOrg = this.model.get('asn_org');
        const isp = this.model.get('isp');
        const parts = [];
        if (asn) {
            const asnHtml = `<code>${this.escapeHtml(String(asn))}</code>`;
            const orgHtml = asnOrg ? ` ${this.escapeHtml(asnOrg)}` : '';
            parts.push(`${asnHtml}${orgHtml}`);
        }
        if (isp) parts.push(this.escapeHtml(isp));
        return parts.join(' · ');
    }

    // ── Children ─────────────────────────────────────────

    async onInit() {
        const m = this.model;

        this.statusPanel = new StatusPanel({
            containerId: 'geoip-overview-status',
            model: m,
            tone: m2 => this._statusTone(m2),
            state: m2 => this._statusState(m2),
            headline: m2 => this._statusHeadline(m2),
            meta: m2 => this._statusMeta(m2),
            actions: m2 => this._statusActions(m2)
        });
        this.addChild(this.statusPanel);

        // KPIs — use core MetricCard (default size, no metric-card-lg)
        this.kpiThreat = new MetricCard({
            containerId: 'geoip-kpi-threat',
            label: 'Threat score',
            value: () => {
                const score = this.model.get('risk_score');
                return score != null ? `${score} / 100` : '—';
            },
            tone: THREAT_TONE[(m.get('threat_level') || 'unknown').toLowerCase()] || 'default'
        });
        this.kpiEvents = new MetricCard({
            containerId: 'geoip-kpi-events',
            label: 'Incident events',
            value: () => {
                const c = this.model.get('event_count') ?? this.model.get('incident_count');
                return c != null ? String(c) : '—';
            },
            tone: ((m.get('event_count') ?? m.get('incident_count') ?? 0) > 0) ? 'warning' : 'default'
        });
        this.kpiLastSeen = new MetricCard({
            containerId: 'geoip-kpi-lastseen',
            label: 'Last seen',
            value: this.model.get('last_seen')
                ? this.model._formatRelative(this.model.get('last_seen'))
                : '—'
        });
        this.kpiLogins = new MetricCard({
            containerId: 'geoip-kpi-logins',
            label: 'Login attempts',
            value: () => {
                const c = this.model.get('login_attempts') ?? this.model.get('login_count');
                return c != null ? String(c) : '—';
            }
        });
        [this.kpiThreat, this.kpiEvents, this.kpiLastSeen, this.kpiLogins]
            .forEach(c => this.addChild(c));
    }

    // ── StatusPanel resolvers ────────────────────────────

    _statusTone(m) {
        if (m.get('is_blocked')) return 'danger';
        if (m.get('is_whitelisted')) return 'success';
        const lvl = (m.get('threat_level') || '').toLowerCase();
        if (m.get('is_threat') || ['high', 'critical'].includes(lvl)) return 'danger';
        if (m.get('is_suspicious') || lvl === 'medium') return 'warning';
        return 'success';
    }

    _statusState(m) {
        if (m.get('is_blocked')) return 'Blocked';
        if (m.get('is_whitelisted')) return 'Whitelisted';
        const lvl = (m.get('threat_level') || '').toLowerCase();
        if (m.get('is_threat') || ['high', 'critical'].includes(lvl)) return 'Allowed · high risk';
        if (m.get('is_suspicious') || lvl === 'medium') return 'Allowed · elevated risk';
        return 'Allowed';
    }

    _statusHeadline(m) {
        if (m.get('is_blocked')) {
            const reason = m.get('blocked_reason');
            return reason ? `Blocked: ${reason}` : 'Currently blocked';
        }
        if (m.get('is_whitelisted')) {
            const reason = m.get('whitelisted_reason');
            return reason ? `Whitelisted: ${reason}` : 'On whitelist';
        }
        const lvl = (m.get('threat_level') || '').toLowerCase();
        if (m.get('is_threat') || ['high', 'critical'].includes(lvl)) {
            return `Active threat (${lvl || 'high'})`;
        }
        if (m.get('is_suspicious') || lvl === 'medium') {
            const flags = [];
            if (m.get('is_vpn')) flags.push('VPN');
            if (m.get('is_tor')) flags.push('Tor');
            if (m.get('is_proxy')) flags.push('proxy');
            if (m.get('is_datacenter')) flags.push('datacenter');
            return flags.length
                ? `${flags.join(' / ')} signal detected`
                : `Suspicious${lvl ? ` · ${lvl}` : ''}`;
        }
        return 'No active threat signals';
    }

    /**
     * Trusted-HTML meta line. Caller is in source code, not user input.
     * StatusPanel's `meta` is rendered as trusted HTML.
     */
    _statusMeta(m) {
        const score = m.get('risk_score');
        const lastSeen = m.get('last_seen');
        const fmtRel = (v) => v ? this.model._formatRelative(v) : null;
        const fmtDate = (v) => v ? this.model._formatDateTime(v) : null;

        if (m.get('is_blocked')) {
            const until = m.get('blocked_until');
            const blockedAt = m.get('blocked_at');
            const untilStr = until
                ? `until <strong>${this.escapeHtml(fmtDate(until) || '')}</strong>`
                : 'permanently';
            return `Blocked ${untilStr}${blockedAt ? ` · ${this.escapeHtml(fmtRel(blockedAt) || '')}` : ''}`;
        }
        if (m.get('is_whitelisted')) {
            return 'This IP bypasses the firewall';
        }
        const scoreFrag = `Risk score <strong>${this.escapeHtml(String(score ?? '—'))}</strong>`;
        const lastSeenFrag = lastSeen ? ` · last seen ${this.escapeHtml(fmtRel(lastSeen) || '')}` : '';
        return `${scoreFrag}${lastSeenFrag}`;
    }

    _statusActions(m) {
        const out = [];
        if (!m.get('is_blocked')) {
            out.push({ label: 'Block 24h', action: 'block', icon: 'bi-slash-circle', variant: 'danger' });
        } else {
            out.push({ label: 'Unblock', action: 'unblock', icon: 'bi-unlock', variant: 'outline-success' });
        }
        if (!m.get('is_whitelisted')) {
            out.push({ label: 'Whitelist', action: 'whitelist', icon: 'bi-shield-check', variant: 'outline-secondary' });
        }
        return out;
    }

    // ── Map lazy-mount ───────────────────────────────────

    async onAfterMount() {
        await super.onAfterMount?.();
        const m = this.model;
        const lat = m.get('latitude');
        const lng = m.get('longitude');
        if (lat == null || lng == null || this._mapMounted) return;

        const city    = m.get('city') || '';
        const region  = m.get('region') || '';
        const country = m.get('country_name') || '';
        const locationStr = [city, region, country].filter(Boolean).join(', ');
        this.mapView = new MapView({
            containerId: 'geoip-overview-map',
            markers: [{
                lat,
                lng,
                popup: `<strong>${this.escapeHtml(m.get('ip_address') || '')}</strong><br>${this.escapeHtml(locationStr)}`
            }],
            tileLayer: 'light',
            zoom: 4,
            height: 200
        });
        this.addChild(this.mapView);
        await this.mapView.render();
        this._mapMounted = true;
    }

    async onActionOpenOnMap() {
        const lat = this.model.get('latitude');
        const lng = this.model.get('longitude');
        if (lat == null || lng == null) return;
        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    }
}


// ── Network section ───────────────────────────────────────

class GeoIPNetworkSection extends View {
    constructor(options = {}) {
        super({
            className: 'geoip-network-section',
            template: `
                <div class="detail-section-eyebrow">Identity</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">IP address</div>
                    <div class="detail-flat-row-value"><code>{{model.ip_address|default:'—'}}</code></div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">IP version</div>
                    <div class="detail-flat-row-value">{{model.ip_version|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Subnet</div>
                    <div class="detail-flat-row-value">
                        {{#model.subnet}}<code>{{model.subnet}}</code>{{/model.subnet}}
                        {{^model.subnet}}<span class="text-secondary fst-italic">—</span>{{/model.subnet}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Reverse DNS</div>
                    <div class="detail-flat-row-value">
                        {{#model.reverse_dns}}<code class="small">{{model.reverse_dns}}</code>{{/model.reverse_dns}}
                        {{^model.reverse_dns}}<span class="text-secondary fst-italic">—</span>{{/model.reverse_dns}}
                    </div>
                </div>

                <div class="detail-section-eyebrow">Carrier · ASN · ISP</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">ASN</div>
                    <div class="detail-flat-row-value">
                        {{#model.asn}}<code>{{model.asn}}</code>{{/model.asn}}
                        {{^model.asn}}<span class="text-secondary fst-italic">—</span>{{/model.asn}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">ASN org</div>
                    <div class="detail-flat-row-value">{{model.asn_org|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">ISP</div>
                    <div class="detail-flat-row-value">{{model.isp|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Connection</div>
                    <div class="detail-flat-row-value">{{model.connection_type|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Mobile carrier</div>
                    <div class="detail-flat-row-value">{{model.mobile_carrier|default:'—'}}</div>
                </div>

                <div class="detail-section-eyebrow">Hosting flags</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Cloud provider</div>
                    <div class="detail-flat-row-value">{{{model.is_cloud|yesnoicon}}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Datacenter</div>
                    <div class="detail-flat-row-value">{{{model.is_datacenter|yesnoicon}}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Mobile</div>
                    <div class="detail-flat-row-value">{{{model.is_mobile|yesnoicon}}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">VPN</div>
                    <div class="detail-flat-row-value">{{{model.is_vpn|yesnoicon}}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Tor exit</div>
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
}


// ── Risk & Reputation section ─────────────────────────────
//
// Threat-flag breakdown rendered as flat rows with badges — no card
// wrapper. Threat flags are also promoted to header chips at the
// DetailView level so the body just shows the score + which flags
// fired.

class GeoIPRiskSection extends View {
    constructor(options = {}) {
        super({
            className: 'geoip-risk-section',
            template: `
                <div class="detail-section-eyebrow">Summary</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Threat level</div>
                    <div class="detail-flat-row-value">
                        <span class="badge text-bg-{{threatLevelTone}}">{{threatLevelLabel}}</span>
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Risk score</div>
                    <div class="detail-flat-row-value">
                        {{#hasScore|bool}}<strong>{{model.risk_score}}</strong> / 100{{/hasScore|bool}}
                        {{^hasScore|bool}}<span class="text-secondary fst-italic">—</span>{{/hasScore|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Provider</div>
                    <div class="detail-flat-row-value">{{model.provider|default:'unknown'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Last checked</div>
                    <div class="detail-flat-row-value">{{model.last_seen|relative|default:'—'}}</div>
                </div>

                <div class="detail-section-eyebrow">Reputation flags</div>
                {{#firedFlags.length}}
                    {{#firedFlags}}
                        <div class="detail-flat-row">
                            <div class="detail-flat-row-label">{{label}}</div>
                            <div class="detail-flat-row-value">
                                <span class="badge text-bg-{{tone}}"><i class="bi {{icon}} me-1"></i>{{title}}</span>
                                {{#detail}}<span class="text-secondary">· {{detail}}</span>{{/detail}}
                            </div>
                        </div>
                    {{/firedFlags}}
                {{/firedFlags.length}}
                {{^firedFlags.length}}
                    <div class="detail-flat-row">
                        <div class="detail-flat-row-label">Status</div>
                        <div class="detail-flat-row-value text-secondary fst-italic">No reputation flags fired.</div>
                    </div>
                {{/firedFlags.length}}
            `,
            ...options
        });
    }

    get threatLevelLabel() {
        return this.model.get('threat_level') || 'unknown';
    }

    get threatLevelTone() {
        const lvl = (this.model.get('threat_level') || '').toLowerCase();
        return THREAT_TONE[lvl] || 'secondary';
    }

    get hasScore() {
        return this.model.get('risk_score') != null;
    }

    /**
     * Only the flags that actually fired on this record. Each row
     * renders a tone-coded badge + description. Header chips already
     * surface the same flags at a glance — the section provides the
     * descriptions.
     */
    get firedFlags() {
        const m = this.model;
        const all = [
            { key: 'is_threat',          label: 'threat',     icon: 'bi-shield-exclamation',     tone: 'danger',
              title: 'Active threat',    detail: 'Marked as an active threat' },
            { key: 'is_suspicious',      label: 'suspicious', icon: 'bi-question-octagon',       tone: 'warning',
              title: 'Suspicious',       detail: 'Flagged suspicious by enrichment' },
            { key: 'is_known_attacker',  label: 'attacker',   icon: 'bi-exclamation-octagon-fill', tone: 'danger',
              title: 'Known attacker',   detail: 'Recorded in attacker feeds' },
            { key: 'is_known_abuser',    label: 'abuser',     icon: 'bi-exclamation-triangle-fill', tone: 'danger',
              title: 'Known abuser',     detail: 'Recorded in abuse feeds' },
            { key: 'is_vpn',             label: 'vpn',        icon: 'bi-shield-shaded',          tone: 'warning',
              title: 'VPN exit',         detail: 'Detected as a VPN exit node' },
            { key: 'is_tor',             label: 'tor',        icon: 'bi-shield-lock',            tone: 'danger',
              title: 'Tor exit',         detail: 'Detected as a Tor exit node' },
            { key: 'is_proxy',           label: 'proxy',      icon: 'bi-diagram-3',              tone: 'warning',
              title: 'Open proxy',       detail: 'Detected as an open proxy' }
        ];
        return all.filter(f => !!m.get(f.key));
    }
}


// ── Block & Whitelist section ─────────────────────────────

class GeoIPBlockSection extends View {
    constructor(options = {}) {
        super({
            className: 'geoip-block-section',
            template: `
                <div class="detail-section-eyebrow">
                    Block
                    <div class="detail-flat-row-action">
                        {{#model.is_blocked|bool}}
                            <button type="button" class="detail-section-action" data-action="unblock" data-bs-toggle="tooltip" title="Unblock"><i class="bi bi-unlock"></i></button>
                        {{/model.is_blocked|bool}}
                        {{^model.is_blocked|bool}}
                            <button type="button" class="detail-section-action" data-action="block" data-bs-toggle="tooltip" title="Block IP"><i class="bi bi-slash-circle"></i></button>
                        {{/model.is_blocked|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Status</div>
                    <div class="detail-flat-row-value">
                        {{#model.is_blocked|bool}}<span class="badge text-bg-danger"><i class="bi bi-slash-circle me-1"></i>Blocked</span>{{/model.is_blocked|bool}}
                        {{^model.is_blocked|bool}}<span class="badge text-bg-success"><i class="bi bi-check2 me-1"></i>Allowed</span>{{/model.is_blocked|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Reason</div>
                    <div class="detail-flat-row-value">{{model.blocked_reason|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Blocked at</div>
                    <div class="detail-flat-row-value">
                        {{#model.blocked_at}}<code>{{model.blocked_at|datetime}}</code>{{/model.blocked_at}}
                        {{^model.blocked_at}}<span class="text-secondary fst-italic">—</span>{{/model.blocked_at}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Blocked until</div>
                    <div class="detail-flat-row-value">
                        {{#model.blocked_until}}<code>{{model.blocked_until|datetime}}</code>{{/model.blocked_until}}
                        {{^model.blocked_until}}<span class="text-secondary fst-italic">Permanent / —</span>{{/model.blocked_until}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Block count</div>
                    <div class="detail-flat-row-value">{{blockCountDisplay}}</div>
                </div>

                <div class="detail-section-eyebrow">
                    Whitelist
                    <div class="detail-flat-row-action">
                        {{#model.is_whitelisted|bool}}
                            <button type="button" class="detail-section-action" data-action="unwhitelist" data-bs-toggle="tooltip" title="Remove whitelist"><i class="bi bi-x-circle"></i></button>
                        {{/model.is_whitelisted|bool}}
                        {{^model.is_whitelisted|bool}}
                            <button type="button" class="detail-section-action" data-action="whitelist" data-bs-toggle="tooltip" title="Whitelist"><i class="bi bi-shield-check"></i></button>
                        {{/model.is_whitelisted|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Status</div>
                    <div class="detail-flat-row-value">
                        {{#model.is_whitelisted|bool}}<span class="badge text-bg-info"><i class="bi bi-shield-check me-1"></i>Whitelisted</span>{{/model.is_whitelisted|bool}}
                        {{^model.is_whitelisted|bool}}<span class="badge text-bg-secondary">Not whitelisted</span>{{/model.is_whitelisted|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Reason</div>
                    <div class="detail-flat-row-value">{{model.whitelisted_reason|default:'—'}}</div>
                </div>
            `,
            ...options
        });
    }

    get blockCountDisplay() {
        const c = this.model.get('block_count');
        return c != null ? String(c) : '0';
    }

    async onActionBlock()       { this.emit('action:block'); }
    async onActionUnblock()     { this.emit('action:unblock'); }
    async onActionWhitelist()   { this.emit('action:whitelist'); }
    async onActionUnwhitelist() { this.emit('action:unwhitelist'); }
}


// ── Activity section (TabView wrapper: Events + Logs) ────
//
// Wraps a `TabView` of two TableViews. The eyebrow comes first, then
// the TabView, so SideNavView's "Activity" entry leads with a labeled
// section like every other DetailView section.

class GeoIPActivitySection extends View {
    constructor(options = {}) {
        const { eventsTable, logsTable, ...viewOptions } = options;

        super({
            className: 'geoip-activity-section',
            template: `
                <div class="detail-section-eyebrow">Activity</div>
                <div data-container="geoip-activity-tabs"></div>
            `,
            ...viewOptions
        });

        this.eventsTable = eventsTable;
        this.logsTable   = logsTable;
    }

    async onInit() {
        const tabs = {};
        if (this.eventsTable) tabs['Events'] = this.eventsTable;
        if (this.logsTable)   tabs['Logs']   = this.logsTable;

        this.tabView = new TabView({
            containerId: 'geoip-activity-tabs',
            tabs,
            activeTab: 'Events'
        });
        this.addChild(this.tabView);
    }
}


// ── Metadata section ──────────────────────────────────────
//
// Audit fields (Created / Modified / Last seen / Expires at) plus the
// raw JSON dump are handled by `KnownFieldsCard` in a single config.

class GeoIPMetadataSection extends View {
    constructor(options = {}) {
        super({
            className: 'geoip-metadata-section',
            template: `
                <div class="detail-section-eyebrow">Metadata</div>
                <div data-container="geoip-metadata-card"></div>
            `,
            ...options
        });
    }

    async onInit() {
        this.knownFields = new KnownFieldsCard({
            containerId: 'geoip-metadata-card',
            model: this.model,
            data: m => m.attributes || {},
            knownKeys: [
                { key: 'id',         label: 'Record ID',
                  formatter: (v) => v != null
                      ? `<code>${this.escapeHtml(String(v))}</code>`
                      : '<span class="text-secondary fst-italic">—</span>' },
                { key: 'provider',   label: 'Provider' },
                { key: 'created',    label: 'Created',   formatter: 'datetime' },
                { key: 'modified',   label: 'Modified',  formatter: 'datetime' },
                { key: 'last_seen',  label: 'Last seen', formatter: 'datetime' },
                { key: 'expires_at', label: 'Expires at', formatter: 'datetime' }
            ],
            rawLabel: 'Raw record JSON',
            rawCollapsed: true
        });
        this.addChild(this.knownFields);
    }
}


// ── GeoIPView (assembly) ──────────────────────────────────

class GeoIPView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new GeoLocatedIP(options.data || {});
        const ipAddress = model.get('ip_address');

        // Helpers stashed on the model so child sections can format
        // dates/relatives without each importing dataFormatter directly.
        // (DataFormatter pipes handle most cases; these are fallbacks
        // for trusted-HTML slots like StatusPanel.meta where we hand
        // back full HTML strings.)
        if (!model._formatRelative) {
            model._formatRelative = (value) => {
                if (value == null) return '';
                const ms = (typeof value === 'number' && value < 1e11)
                    ? value * 1000
                    : new Date(value).getTime();
                if (!Number.isFinite(ms)) return '';
                const delta = Math.round((Date.now() - ms) / 1000);
                if (delta < 0)     return 'just now';
                if (delta < 60)    return `${delta}s ago`;
                if (delta < 3600)  return `${Math.floor(delta / 60)}m ago`;
                if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
                return `${Math.floor(delta / 86400)}d ago`;
            };
            model._formatDateTime = (value) => {
                if (value == null) return '';
                const ms = (typeof value === 'number' && value < 1e11)
                    ? value * 1000
                    : new Date(value).getTime();
                if (!Number.isFinite(ms)) return '';
                return new Date(ms).toLocaleString();
            };
        }

        // Shared collections — fire-and-forget initial fetch in onAfterBuild
        const eventsCollection = new IncidentEventList({
            params: { source_ip: ipAddress, size: 25, sort: '-created' }
        });
        const logsCollection = new LogList({
            params: { ip: ipAddress, size: 25, sort: '-created' }
        });

        // Section views
        const overviewSection = new GeoIPOverviewSection({ model });
        const networkSection  = new GeoIPNetworkSection({ model });
        const riskSection     = new GeoIPRiskSection({ model });
        const blockSection    = new GeoIPBlockSection({ model });
        const metadataSection = new GeoIPMetadataSection({ model });

        const eventsTable = new TableView({
            collection: eventsCollection,
            title: 'Events',
            showFullscreen: false,
            searchable: false,
            hideActivePillNames: ['source_ip'],
            columns: [
                { key: 'id', label: 'ID', sortable: true, width: '60px' },
                { key: 'created', label: 'Date', formatter: 'datetime', sortable: true, width: '160px' },
                { key: 'category|badge', label: 'Category' },
                { key: 'title', label: 'Title' }
            ]
        });

        const logsTable = new TableView({
            collection: logsCollection,
            title: 'Logs',
            permissions: 'view_logs',
            showFullscreen: false,
            searchable: false,
            hideActivePillNames: ['ip'],
            columns: [
                {
                    key: 'created',
                    label: 'Timestamp',
                    sortable: true,
                    formatter: 'epoch|datetime',
                    width: '180px',
                    filter: {
                        name: 'created',
                        type: 'daterange',
                        startName: 'dr_start',
                        endName: 'dr_end',
                        fieldName: 'dr_field',
                        label: 'Date Range',
                        format: 'YYYY-MM-DD',
                        displayFormat: 'MMM DD, YYYY',
                        separator: ' to '
                    }
                },
                {
                    key: 'level',
                    label: 'Level',
                    sortable: true,
                    width: '90px',
                    filter: {
                        type: 'select',
                        options: [
                            { value: 'info',    label: 'Info' },
                            { value: 'warning', label: 'Warning' },
                            { value: 'error',   label: 'Error' }
                        ]
                    }
                },
                {
                    key: 'kind',
                    label: 'Kind',
                    width: '120px',
                    filter: { type: 'text' }
                },
                { key: 'log', label: 'Log' }
            ]
        });

        const activitySection = new GeoIPActivitySection({
            model,
            eventsTable,
            logsTable
        });

        const sections = [
            { key: 'Overview',  label: 'Overview',          icon: 'bi-grid-1x2',           view: overviewSection },
            { key: 'Network',   label: 'Network',           icon: 'bi-diagram-3',          view: networkSection },
            { key: 'Risk',      label: 'Risk & Reputation', icon: 'bi-shield-exclamation', view: riskSection },
            { type: 'divider', label: 'Enforcement' },
            { key: 'Block',     label: 'Block & Whitelist', icon: 'bi-slash-circle',       view: blockSection },
            { type: 'divider', label: 'Activity' },
            { key: 'Activity',  label: 'Activity',          icon: 'bi-list-ul',            view: activitySection,
              permissions: 'view_logs' },
            { type: 'divider', label: 'Detail' },
            { key: 'Metadata',  label: 'Metadata',          icon: 'bi-braces',             view: metadataSection }
        ];

        // Header — dynamic icon tone based on threat
        const iconToneFn = m => {
            const blk = !!m.get('is_blocked');
            const thr = !!m.get('is_threat');
            const sus = !!m.get('is_suspicious');
            const lvl = (m.get('threat_level') || '').toLowerCase();
            if (blk || thr || ['high', 'critical'].includes(lvl)) return 'danger';
            if (sus || lvl === 'medium') return 'warning';
            return 'info';
        };

        const chips = [
            // Country flag + code
            { text: m => {
                  const cc = m.get('country_code');
                  const flag = COUNTRY_FLAG(cc);
                  const name = m.get('country_name');
                  if (!cc && !name) return null;
                  return `${flag ? `${flag} ` : ''}${name || cc}`;
              }, variant: 'light',
              when: m => !!(m.get('country_code') || m.get('country_name')) },
            // Threat level — split into three when-gated chips so we can vary
            // the badge variant by severity (DetailHeaderView's variant is
            // static per chip).
            { icon: 'bi-exclamation-triangle-fill',
              text: m => `Threat: ${m.get('threat_level')}`,
              variant: 'danger',
              when: m => ['high', 'critical'].includes((m.get('threat_level') || '').toLowerCase()) },
            { icon: 'bi-exclamation-triangle',
              text: m => `Threat: ${m.get('threat_level')}`,
              variant: 'warning',
              when: m => (m.get('threat_level') || '').toLowerCase() === 'medium' },
            { icon: 'bi-shield-check',
              text: m => `Threat: ${m.get('threat_level')}`,
              variant: 'light',
              when: m => {
                  const lvl = (m.get('threat_level') || '').toLowerCase();
                  return lvl && !['high', 'critical', 'medium'].includes(lvl);
              } },
            // Risk score
            { text: m => m.get('risk_score') != null ? `Risk score ${m.get('risk_score')}` : null,
              variant: 'light',
              when: m => m.get('risk_score') != null },
            // Network / threat flags — only when true
            { icon: 'bi-shield-shaded',  text: 'VPN',         variant: 'warning',
              when: m => !!m.get('is_vpn') },
            { icon: 'bi-shield-lock',    text: 'Tor',         variant: 'danger',
              when: m => !!m.get('is_tor') },
            { icon: 'bi-diagram-3',      text: 'Proxy',       variant: 'warning',
              when: m => !!m.get('is_proxy') },
            { icon: 'bi-cloud-fill',     text: 'Cloud',       variant: 'info',
              when: m => !!m.get('is_cloud') },
            { icon: 'bi-hdd-stack',      text: 'Datacenter',  variant: 'warning',
              when: m => !!m.get('is_datacenter') },
            { icon: 'bi-slash-circle',   text: 'Blocked',     variant: 'danger',
              when: m => !!m.get('is_blocked') },
            { icon: 'bi-shield-check',   text: 'Whitelisted', variant: 'success',
              when: m => !!m.get('is_whitelisted') }
        ];

        const headerActions = [
            { label: 'Block',       icon: 'bi-slash-circle',     action: 'block-ip' },
            { label: 'Whitelist',   icon: 'bi-shield-check',     action: 'whitelist-ip' },
            { label: 'Refresh geo', icon: 'bi-arrow-clockwise',  action: 'refresh-geoip' }
        ];

        const contextItems = [
            { label: 'Refresh geolocation', action: 'refresh-geoip',     icon: 'bi-arrow-clockwise' },
            { label: 'Refresh threat data', action: 'threat-analysis',   icon: 'bi-shield-exclamation' },
            { label: 'View on map',         action: 'view-on-map',       icon: 'bi-map' },
            { type: 'divider' },
            { label: 'Edit Location',       action: 'edit-location',     icon: 'bi-geo-alt' },
            { label: 'Edit Network',        action: 'edit-network',      icon: 'bi-diagram-3' },
            { label: 'Edit Security',       action: 'edit-security',     icon: 'bi-shield-lock' },
            { type: 'divider' },
            { label: 'Block 24h',           action: 'block-ip',          icon: 'bi-slash-circle' },
            { label: 'Unblock',             action: 'unblock-ip',        icon: 'bi-unlock' },
            { label: 'Whitelist',           action: 'whitelist-ip',      icon: 'bi-shield-check' },
            { label: 'Remove whitelist',    action: 'unwhitelist-ip',    icon: 'bi-x-circle' },
            { type: 'divider' },
            { label: 'Delete record',       action: 'delete-geoip',      icon: 'bi-trash', danger: true }
        ];

        super({
            className: 'geoip-view',
            ...options,
            model,
            header: {
                icon: 'bi-globe2',
                iconToneFn,
                titleFn: m => m.get('ip_address') || '—',
                subtitlePath: '_subtitle',
                chips,
                actions: headerActions,
                contextMenu: { items: contextItems }
            },
            sections,
            activeSection: 'Overview'
        });

        // Stash references for action handlers + cross-section wiring
        this.eventsCollection = eventsCollection;
        this.logsCollection   = logsCollection;
        this.overviewSection  = overviewSection;
        this.networkSection   = networkSection;
        this.riskSection      = riskSection;
        this.blockSection     = blockSection;
        this.activitySection  = activitySection;
        this.metadataSection  = metadataSection;
        this.eventsTable      = eventsTable;
        this.logsTable        = logsTable;

        // Pre-compute the synthetic subtitle the header reads via subtitlePath
        this._refreshComputedFields();
    }

    async onAfterBuild() {
        // Wire StatusPanel + Block-section action emits to the view's handlers
        // (StatusPanel emits action events at the action level; the
        // block-section emits its own pencil-button action events as
        // well, all routed through this view's onAction* handlers.)
        this.blockSection.on('action:block',       () => this.onActionBlockIp());
        this.blockSection.on('action:unblock',     () => this.onActionUnblockIp());
        this.blockSection.on('action:whitelist',   () => this.onActionWhitelistIp());
        this.blockSection.on('action:unwhitelist', () => this.onActionUnwhitelistIp());

        // Sidebar badge: total Activity count = events + logs (Activity
        // is now a single section combining both via TabView).
        const updateActivityBadge = () => {
            const eventCount = this.eventsCollection.totalCount ?? this.eventsCollection.models?.length ?? 0;
            const logCount   = this.logsCollection.totalCount   ?? this.logsCollection.models?.length   ?? 0;
            const total = eventCount + logCount;
            const variant = eventCount > 10 ? 'warning' : 'muted';
            this.setBadge('Activity', total > 0 ? { text: String(total), variant } : null);
        };
        this.eventsCollection.on('fetch:success', updateActivityBadge, this);
        this.logsCollection.on('fetch:success',   updateActivityBadge, this);

        // Fire-and-forget initial fetches
        this.eventsCollection.fetch().catch(() => {});
        this.logsCollection.fetch().catch(() => {});
    }

    // ── Action routing for StatusPanel / block-section ────

    async onActionBlock()     { return this.onActionBlockIp(); }
    async onActionUnblock()   { return this.onActionUnblockIp(); }
    async onActionWhitelist() { return this.onActionWhitelistIp(); }

    /**
     * Compute the synthetic `_subtitle` field the header binds to via
     * subtitlePath. Stashed directly on `model.attributes._subtitle` so a
     * re-render of the header picks it up.
     */
    _refreshComputedFields() {
        const m = this.model;
        const parts = [];
        const city    = m.get('city');
        const region  = m.get('region');
        const country = m.get('country_name');
        const loc = [city, region, country].filter(Boolean).join(', ');
        if (loc) parts.push(loc);

        const asn = m.get('asn');
        const isp = m.get('isp');
        if (asn || isp) {
            const asnPart = asn ? `ASN ${asn}` : '';
            const ispPart = isp ? ` (${isp})` : '';
            parts.push(`${asnPart}${ispPart}`.trim());
        }

        const reverse = m.get('reverse_dns');
        if (reverse) parts.push(`reverse ${reverse}`);

        m.attributes._subtitle = parts.length ? parts.join(' · ') : '';
    }

    /** Re-render header + Overview + Risk + Block sections after model changes */
    async _refreshFromModel() {
        this._refreshComputedFields();
        if (this.headerView?.isMounted()) {
            await this.headerView.render();
        }
        if (this.overviewSection?.isMounted()) {
            await this.overviewSection.render();
        }
        if (this.riskSection?.isMounted()) {
            await this.riskSection.render();
        }
        if (this.blockSection?.isMounted()) {
            await this.blockSection.render();
        }
    }

    // ── Actions ────────────────────────────────────────────

    async onActionRefreshGeoip() {
        try {
            await this.model.save({ refresh: true });
            this.getApp()?.toast?.info(`Refresh requested for ${this.model.get('ip_address')}`);
            await this.model.fetch();
            await this._refreshFromModel();
        } catch (err) {
            this.getApp()?.toast?.error(err.message || 'Failed to refresh geolocation');
        }
    }

    async onActionThreatAnalysis(event, element) {
        try {
            if (element) element.disabled = true;
            const resp = await this.model.save({ threat_analysis: 1 });
            if (resp.success || resp.status === 200) {
                this.getApp()?.toast?.success('Threat data refreshed');
                await this.model.fetch();
                await this._refreshFromModel();
            } else {
                this.getApp()?.toast?.error('Failed to refresh threat data');
            }
        } finally {
            if (element) element.disabled = false;
        }
        return true;
    }

    async onActionViewOnMap() {
        const lat = this.model.get('latitude');
        const lng = this.model.get('longitude');
        if (lat == null || lng == null) {
            this.getApp()?.toast?.warning('No coordinates available for this IP');
            return;
        }
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(url, '_blank');
    }

    async onActionEditLocation() {
        const resp = await Modal.modelForm({
            title: `Edit Location — ${this.model.get('ip_address')}`,
            model: this.model,
            formConfig: GeoLocatedIP.EDIT_LOCATION_FORM
        });
        if (resp) {
            await this._refreshFromModel();
            this.getApp()?.toast?.success('Location updated');
        }
    }

    async onActionEditSecurity() {
        const resp = await Modal.modelForm({
            title: `Edit Security — ${this.model.get('ip_address')}`,
            model: this.model,
            formConfig: GeoLocatedIP.EDIT_SECURITY_FORM
        });
        if (resp) {
            await this._refreshFromModel();
            this.getApp()?.toast?.success('Security settings updated');
        }
    }

    async onActionEditNetwork() {
        const resp = await Modal.modelForm({
            title: `Edit Network — ${this.model.get('ip_address')}`,
            model: this.model,
            formConfig: GeoLocatedIP.EDIT_NETWORK_FORM
        });
        if (resp) {
            await this._refreshFromModel();
            this.getApp()?.toast?.success('Network information updated');
        }
    }

    async onActionBlockIp() {
        const data = await Modal.form({
            title: 'Block IP',
            icon: 'bi-slash-circle',
            size: 'sm',
            fields: [
                { name: 'reason', type: 'text', label: 'Reason', required: true,
                  placeholder: 'e.g., Suspicious activity' },
                {
                    name: 'ttl', type: 'select', label: 'Duration',
                    options: [
                        { value: 3600,    label: '1 hour' },
                        { value: 21600,   label: '6 hours' },
                        { value: 86400,   label: '24 hours' },
                        { value: 604800,  label: '7 days' },
                        { value: 2592000, label: '30 days' },
                        { value: 0,       label: 'Permanent' }
                    ],
                    value: 86400
                }
            ]
        });
        if (!data) return true;

        const resp = await this.model.save({
            block: { reason: data.reason, ttl: parseInt(data.ttl) }
        });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success('IP blocked');
            await this.model.fetch();
            await this._refreshFromModel();
        } else {
            this.getApp()?.toast?.error('Failed to block IP');
        }
        return true;
    }

    async onActionUnblockIp() {
        const data = await Modal.form({
            title: 'Unblock IP',
            icon: 'bi-unlock',
            size: 'sm',
            fields: [
                { name: 'reason', type: 'text', label: 'Reason',
                  placeholder: 'e.g., False positive' }
            ]
        });
        if (!data) return true;

        const resp = await this.model.save({
            unblock: data.reason || 'Unblocked from admin'
        });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success('IP unblocked');
            await this.model.fetch();
            await this._refreshFromModel();
        } else {
            this.getApp()?.toast?.error('Failed to unblock IP');
        }
        return true;
    }

    async onActionWhitelistIp() {
        const data = await Modal.form({
            title: 'Whitelist IP',
            icon: 'bi-shield-check',
            size: 'sm',
            fields: [
                { name: 'reason', type: 'text', label: 'Reason', required: true,
                  placeholder: 'e.g., Known office IP' }
            ]
        });
        if (!data) return true;

        const resp = await this.model.save({ whitelist: data.reason });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success('IP whitelisted');
            await this.model.fetch();
            await this._refreshFromModel();
        } else {
            this.getApp()?.toast?.error('Failed to whitelist IP');
        }
        return true;
    }

    async onActionUnwhitelistIp() {
        const confirmed = await Modal.confirm(
            'Remove this IP from the whitelist?',
            'Remove Whitelist'
        );
        if (!confirmed) return true;

        const resp = await this.model.save({ unwhitelist: 1 });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success('IP removed from whitelist');
            await this.model.fetch();
            await this._refreshFromModel();
        } else {
            this.getApp()?.toast?.error('Failed to remove from whitelist');
        }
        return true;
    }

    async onActionDeleteGeoip() {
        const confirmed = await Modal.confirm(
            `Are you sure you want to delete the GeoIP record for "${this.model.get('ip_address')}"?`,
            'Confirm Deletion',
            { confirmClass: 'btn-danger', confirmText: 'Delete' }
        );
        if (!confirmed) return;

        const resp = await this.model.destroy();
        if (resp?.success) {
            this.getApp()?.toast?.success('GeoIP record deleted');
            const dialog = this.element?.closest('.modal');
            if (dialog) {
                const bsModal = window.bootstrap?.Modal?.getInstance(dialog);
                if (bsModal) bsModal.hide();
            }
            this.emit('geoip:deleted', { model: this.model });
        }
    }

    /**
     * Static helper preserved from the previous implementation — used by
     * LogView and IncidentView to open a GeoIP detail modal from an IP.
     */
    static async show(ip) {
        const model = await GeoLocatedIP.lookup(ip);
        if (model) {
            const view = new GeoIPView({ model });
            await Modal.detail(view);
            return;
        }
        Modal.alert({
            message: `Could not find geolocation data for IP: ${ip}`,
            type: 'warning'
        });
    }
}

GeoIPView.VIEW_CLASS = GeoIPView;
GeoLocatedIP.VIEW_CLASS = GeoIPView;
GeoLocatedIP.MODEL_REF = 'account.GeoLocatedIP';

export default GeoIPView;
