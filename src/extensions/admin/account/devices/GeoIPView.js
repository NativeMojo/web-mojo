/**
 * GeoIPView - Detail view for a GeoLocatedIP record, built on the
 * DetailView primitive.
 *
 * Sections (collapsed from 8 → 7):
 *   Overview · Network · Risk & Reputation
 *   ── Enforcement ── Block & Whitelist
 *   ── Activity ──   Events · Logs (incident + audit, kind-filtered)
 *   ── Detail ──     Metadata
 *
 * Map is embedded inside Overview (lazy-init via MapView) instead of
 * being its own section.
 *
 * Open via `Modal.detail(new GeoIPView({ model }))` — pair with
 * `viewDialogOptions: { header: false, noBodyPadding: true,
 * buttons: [] }` when wired through TableView. Inherits `size: 'lg'`
 * from `Modal.detail()`'s default.
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import TableView from '@core/views/table/TableView.js';
import Modal from '@core/views/feedback/Modal.js';
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

function formatRelative(epochSeconds) {
    if (epochSeconds == null) return '—';
    const ms = (typeof epochSeconds === 'number' && epochSeconds < 1e11)
        ? epochSeconds * 1000
        : new Date(epochSeconds).getTime();
    if (!Number.isFinite(ms)) return '—';
    const delta = Math.round((Date.now() - ms) / 1000);
    if (delta < 0)      return 'just now';
    if (delta < 60)     return `${delta}s ago`;
    if (delta < 3600)   return `${Math.floor(delta / 60)}m ago`;
    if (delta < 86400)  return `${Math.floor(delta / 3600)}h ago`;
    return `${Math.floor(delta / 86400)}d ago`;
}

function formatDateTime(value) {
    if (value == null) return '—';
    const ms = (typeof value === 'number' && value < 1e11)
        ? value * 1000
        : new Date(value).getTime();
    if (!Number.isFinite(ms)) return '—';
    return new Date(ms).toLocaleString();
}

function yesNo(v) {
    return v
        ? `<i class="bi bi-check-circle-fill text-success"></i>`
        : `<i class="bi bi-dash text-secondary"></i>`;
}


// ── Overview section ──────────────────────────────────────

class GeoIPOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'geoip-overview-section',
            ...options
        });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        return `
            <div class="section-eyebrow">Section · Overview</div>
            <h3 class="section-title">IP at a glance</h3>
            <div data-container="geoip-overview-status"></div>
            <div class="detail-kpi-grid">
                <div data-container="geoip-kpi-threat"></div>
                <div data-container="geoip-kpi-events"></div>
                <div data-container="geoip-kpi-lastseen"></div>
                <div data-container="geoip-kpi-logins"></div>
            </div>
            <div class="detail-pair">
                <div data-container="geoip-overview-location"></div>
                <div data-container="geoip-overview-signals"></div>
            </div>
        `;
    }

    async onInit() {
        const m = this.model;

        this.statusPanel = new GeoIPStatusPanel({
            containerId: 'geoip-overview-status',
            model: m
        });
        this.statusPanel.on('action:block',     () => this.emit('action:block'));
        this.statusPanel.on('action:whitelist', () => this.emit('action:whitelist'));
        this.statusPanel.on('action:unblock',   () => this.emit('action:unblock'));
        this.addChild(this.statusPanel);

        // KPIs
        const score      = m.get('risk_score');
        const threatLevel = m.get('threat_level') || 'unknown';
        const lastSeen   = m.get('last_seen');
        const eventCount = m.get('event_count') ?? m.get('incident_count');
        const loginCount = m.get('login_attempts') ?? m.get('login_count');

        this.kpiThreat   = this._kpi('geoip-kpi-threat',   'Threat score',
            score != null ? `${score} / 100` : '—',
            THREAT_TONE[threatLevel] || null);
        this.kpiEvents   = this._kpi('geoip-kpi-events',   'Incident events',
            eventCount != null ? String(eventCount) : '—',
            (eventCount && eventCount > 0) ? 'warning' : null);
        this.kpiLastSeen = this._kpi('geoip-kpi-lastseen', 'Last seen',
            lastSeen ? formatRelative(lastSeen) : '—');
        this.kpiLogins   = this._kpi('geoip-kpi-logins',   'Login attempts',
            loginCount != null ? String(loginCount) : '—');
        [this.kpiThreat, this.kpiEvents, this.kpiLastSeen, this.kpiLogins]
            .forEach(c => this.addChild(c));

        // Location & network card (with embedded map)
        this.locationCard = new GeoIPLocationCard({
            containerId: 'geoip-overview-location',
            model: m
        });
        this.addChild(this.locationCard);

        // Threat signals card
        this.signalsCard = new GeoIPSignalsCard({
            containerId: 'geoip-overview-signals',
            model: m
        });
        this.addChild(this.signalsCard);
    }

    _kpi(containerId, label, value, tone = null) {
        return new View({
            containerId,
            className: `metric-card${tone ? ` metric-card-tone-${tone}` : ''}`,
            template: `
                <div class="metric-card-label">${this.escapeHtml(label)}</div>
                <div class="metric-card-value">${this.escapeHtml(value)}</div>
            `
        });
    }
}


// ── Status panel (Overview hero) ──────────────────────────

class GeoIPStatusPanel extends View {
    constructor(options = {}) {
        super({ ...options });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const isBlocked     = !!m.get('is_blocked');
        const isWhitelisted = !!m.get('is_whitelisted');
        const isThreat      = !!m.get('is_threat');
        const isSuspicious  = !!m.get('is_suspicious');
        const threatLevel   = (m.get('threat_level') || '').toLowerCase();

        let tone, stateLabel, headline, meta;
        if (isBlocked) {
            tone = 'danger';
            stateLabel = 'Blocked';
            const reason = m.get('blocked_reason');
            const until  = m.get('blocked_until');
            headline = reason ? `Blocked: ${reason}` : 'Currently blocked';
            const untilStr = until ? `until <strong>${this.escapeHtml(formatDateTime(until))}</strong>` : 'permanently';
            const blockedAt = m.get('blocked_at');
            meta = `Blocked ${untilStr}${blockedAt ? ` · ${formatRelative(blockedAt)}` : ''}`;
        } else if (isWhitelisted) {
            tone = 'success';
            stateLabel = 'Whitelisted';
            const reason = m.get('whitelisted_reason');
            headline = reason ? `Whitelisted: ${reason}` : 'On whitelist';
            meta = `This IP bypasses the firewall`;
        } else if (isThreat || ['high', 'critical'].includes(threatLevel)) {
            tone = 'danger';
            stateLabel = 'Allowed · high risk';
            headline = `Active threat (${threatLevel || 'high'})`;
            meta = `Risk score <strong>${m.get('risk_score') ?? '—'}</strong> · this IP is allowed but flagged`;
        } else if (isSuspicious || threatLevel === 'medium') {
            tone = 'warning';
            stateLabel = 'Allowed · elevated risk';
            const flags = [];
            if (m.get('is_vpn')) flags.push('VPN');
            if (m.get('is_tor')) flags.push('Tor');
            if (m.get('is_proxy')) flags.push('proxy');
            if (m.get('is_datacenter')) flags.push('datacenter');
            headline = flags.length
                ? `${flags.join(' / ')} signal detected`
                : `Suspicious${threatLevel ? ` · ${threatLevel}` : ''}`;
            const lastSeen = m.get('last_seen');
            meta = `Risk score <strong>${m.get('risk_score') ?? '—'}</strong>${lastSeen ? ` · last seen ${formatRelative(lastSeen)}` : ''}`;
        } else {
            tone = 'success';
            stateLabel = 'Allowed';
            headline = `No active threat signals`;
            const lastSeen = m.get('last_seen');
            meta = lastSeen ? `Last seen ${formatRelative(lastSeen)}` : 'No recent activity';
        }

        const actions = [];
        if (!isBlocked) {
            actions.push(`<button class="btn btn-danger btn-sm" data-action="block"><i class="bi bi-slash-circle me-1"></i>Block 24h</button>`);
        } else {
            actions.push(`<button class="btn btn-outline-success btn-sm" data-action="unblock"><i class="bi bi-unlock me-1"></i>Unblock</button>`);
        }
        if (!isWhitelisted) {
            actions.push(`<button class="btn btn-outline-secondary btn-sm" data-action="whitelist"><i class="bi bi-shield-check me-1"></i>Whitelist</button>`);
        }

        return `
            <div class="detail-status-panel tone-${tone}">
                <div class="detail-status-headline">
                    <div class="detail-status-state"><span class="detail-status-dot"></span>${this.escapeHtml(stateLabel)}</div>
                    <div class="detail-status-line">${this.escapeHtml(headline)}</div>
                    <div class="detail-status-meta">${meta}</div>
                </div>
                ${actions.length ? `<div class="detail-status-actions">${actions.join('')}</div>` : ''}
            </div>
        `;
    }

    async onActionBlock()     { this.emit('action:block'); }
    async onActionUnblock()   { this.emit('action:unblock'); }
    async onActionWhitelist() { this.emit('action:whitelist'); }
}


// ── Location & Network card (left of Overview pair) ───────

class GeoIPLocationCard extends View {
    constructor(options = {}) {
        super({ ...options });
        this.template = () => this._buildTemplate();
        this._mapMounted = false;
    }

    _buildTemplate() {
        const m = this.model;
        const cc      = m.get('country_code') || '';
        const country = m.get('country_name') || '—';
        const region  = m.get('region') || '';
        const city    = m.get('city') || '';
        const lat     = m.get('latitude');
        const lng     = m.get('longitude');
        const asn     = m.get('asn');
        const asnOrg  = m.get('asn_org');
        const isp     = m.get('isp');
        const reverse = m.get('reverse_dns');
        const flag    = COUNTRY_FLAG(cc);

        const rows = [
            ['Country',     `${flag ? `${flag} ` : ''}${this.escapeHtml(country)}${cc ? ` <code class="text-secondary small">${this.escapeHtml(cc)}</code>` : ''}`],
            ['Region · City', `${this.escapeHtml(region || '—')}${city ? ` · ${this.escapeHtml(city)}` : ''}`],
            ['Coordinates', (lat != null && lng != null) ? `<code>${this.escapeHtml(String(lat))}, ${this.escapeHtml(String(lng))}</code>` : '<span class="text-secondary">—</span>'],
            ['ASN',         asn ? `<code>${this.escapeHtml(String(asn))}</code>${asnOrg ? ` · ${this.escapeHtml(asnOrg)}` : ''}` : '<span class="text-secondary">—</span>'],
            ['ISP',         isp ? this.escapeHtml(isp) : '<span class="text-secondary">—</span>'],
            ['Reverse DNS', reverse ? `<code class="small">${this.escapeHtml(reverse)}</code>` : '<span class="text-secondary">—</span>']
        ];

        const rowsHtml = rows.map(([k, v]) =>
            `<li class="d-flex justify-content-between border-bottom border-opacity-25 py-1"><span class="text-secondary">${this.escapeHtml(k)}</span><span>${v}</span></li>`
        ).join('');

        const hasCoords = lat != null && lng != null;
        const mapBlock = hasCoords
            ? `<div data-container="geoip-overview-map"></div>
               <div class="d-flex justify-content-end mt-2">
                   <button class="btn btn-sm btn-outline-secondary" data-action="open-on-map">
                       <i class="bi bi-box-arrow-up-right me-1"></i>Open on map
                   </button>
               </div>`
            : `<div class="text-secondary small fst-italic">No coordinates available for this IP.</div>`;

        return `
            <div class="card">
                <div class="card-body">
                    <div class="card-title"><i class="bi bi-geo-alt"></i>Location &amp; network</div>
                    <ul class="list-unstyled mb-3 small">${rowsHtml}</ul>
                    ${mapBlock}
                </div>
            </div>
        `;
    }

    async onAfterRender() {
        await super.onAfterRender();
        const m = this.model;
        const lat = m.get('latitude');
        const lng = m.get('longitude');
        if (lat == null || lng == null) return;

        // Lazy-mount the map after the card is in the DOM
        if (!this._mapMounted) {
            const city    = m.get('city') || '';
            const region  = m.get('region') || '';
            const country = m.get('country_name') || '';
            const locationStr = [city, region, country].filter(Boolean).join(', ');
            const mapView = new MapView({
                containerId: 'geoip-overview-map',
                markers: [{
                    lat,
                    lng,
                    popup: `<strong>${m.get('ip_address')}</strong><br>${locationStr}`
                }],
                tileLayer: 'light',
                zoom: 4,
                height: 180
            });
            this.addChild(mapView);
            await mapView.render();
            this._mapMounted = true;
        }
    }

    async onActionOpenOnMap() {
        const lat = this.model.get('latitude');
        const lng = this.model.get('longitude');
        if (lat == null || lng == null) return;
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(url, '_blank');
    }
}


// ── Threat signals card (right of Overview pair) ──────────

class GeoIPSignalsCard extends View {
    constructor(options = {}) {
        super({ ...options });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const signals = [
            {
                key: 'vpn', label: 'vpn', icon: 'bi-shield-shaded',
                hit: !!m.get('is_vpn'), tone: 'warning',
                hitText: 'Detected as <strong>VPN exit node</strong>',
                missText: 'Not a known VPN exit'
            },
            {
                key: 'tor', label: 'tor', icon: 'bi-shield-lock',
                hit: !!m.get('is_tor'), tone: 'danger',
                hitText: 'Detected as <strong>Tor exit node</strong>',
                missText: 'Not a Tor exit node'
            },
            {
                key: 'proxy', label: 'proxy', icon: 'bi-diagram-3',
                hit: !!m.get('is_proxy'), tone: 'warning',
                hitText: 'Detected as <strong>open proxy</strong>',
                missText: 'Not a known open proxy'
            },
            {
                key: 'cloud', label: 'cloud', icon: 'bi-cloud-fill',
                hit: !!m.get('is_cloud'), tone: 'info',
                hitText: 'Cloud-provider IP',
                missText: 'Not a cloud provider'
            },
            {
                key: 'datacenter', label: 'datacenter', icon: 'bi-hdd-stack',
                hit: !!m.get('is_datacenter'), tone: 'warning',
                hitText: 'Datacenter IP',
                missText: 'Not a datacenter range'
            },
            {
                key: 'attacker', label: 'attacker', icon: 'bi-exclamation-octagon',
                hit: !!m.get('is_known_attacker'), tone: 'danger',
                hitText: 'Known attacker',
                missText: 'No attacker record'
            },
            {
                key: 'abuser', label: 'abuser', icon: 'bi-exclamation-triangle',
                hit: !!m.get('is_known_abuser'), tone: 'danger',
                hitText: 'Known abuser',
                missText: 'No abuse record'
            }
        ];

        const provider = m.get('provider');
        const lastSeen = m.get('last_seen');
        const sourceMeta = provider ? `source: ${this.escapeHtml(provider)}` : 'live';
        const checkedMeta = lastSeen ? formatRelative(lastSeen) : 'live';

        const items = signals.map(s => {
            const tone = s.hit ? s.tone : '';
            const text = s.hit ? s.hitText : s.missText;
            const iconClass = s.hit ? s.icon : 'bi-shield-check';
            return `
                <li class="detail-audit-entry">
                    <div class="detail-audit-icon${tone ? ` tone-${tone}` : ''}"><i class="bi ${this.escapeHtml(iconClass)}"></i></div>
                    <div class="detail-audit-source">${this.escapeHtml(s.label)}</div>
                    <div>${text} <span class="text-secondary">· ${s.hit ? sourceMeta : 'no signal'}</span></div>
                    <div class="detail-audit-when">${this.escapeHtml(checkedMeta)}</div>
                </li>
            `;
        }).join('');

        return `
            <div class="card">
                <div class="card-body">
                    <div class="card-title"><i class="bi bi-shield-exclamation"></i>Threat signals</div>
                    <ul class="detail-audit-list">${items}</ul>
                </div>
            </div>
        `;
    }
}


// ── Network section ───────────────────────────────────────

class GeoIPNetworkSection extends View {
    constructor(options = {}) {
        super({
            className: 'geoip-network-section',
            ...options
        });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;

        const identityRows = [
            ['IP address',  `<code>${this.escapeHtml(m.get('ip_address') || '—')}</code>`],
            ['IP version',  m.get('ip_version') ? this.escapeHtml(String(m.get('ip_version'))) : '<span class="text-secondary">—</span>'],
            ['Subnet',      m.get('subnet') ? `<code>${this.escapeHtml(m.get('subnet'))}</code>` : '<span class="text-secondary">—</span>'],
            ['Reverse DNS', m.get('reverse_dns') ? `<code class="small">${this.escapeHtml(m.get('reverse_dns'))}</code>` : '<span class="text-secondary">—</span>']
        ];

        const carrierRows = [
            ['ASN',           m.get('asn') ? `<code>${this.escapeHtml(String(m.get('asn')))}</code>` : '<span class="text-secondary">—</span>'],
            ['ASN org',       m.get('asn_org') ? this.escapeHtml(m.get('asn_org')) : '<span class="text-secondary">—</span>'],
            ['ISP',           m.get('isp') ? this.escapeHtml(m.get('isp')) : '<span class="text-secondary">—</span>'],
            ['Connection',    m.get('connection_type') ? this.escapeHtml(m.get('connection_type')) : '<span class="text-secondary">—</span>'],
            ['Mobile carrier', m.get('mobile_carrier') ? this.escapeHtml(m.get('mobile_carrier')) : '<span class="text-secondary">—</span>']
        ];

        const hostingRows = [
            ['Cloud provider', yesNo(m.get('is_cloud'))],
            ['Datacenter',     yesNo(m.get('is_datacenter'))],
            ['Mobile',         yesNo(m.get('is_mobile'))],
            ['VPN',            yesNo(m.get('is_vpn'))],
            ['Tor exit',       yesNo(m.get('is_tor'))],
            ['Proxy',          yesNo(m.get('is_proxy'))]
        ];

        return `
            <div class="section-eyebrow">Section · Network</div>
            <h3 class="section-title">Network detail</h3>
            ${this._fieldCard('Identity', 'bi-hash', identityRows)}
            ${this._fieldCard('Carrier · ASN · ISP', 'bi-broadcast', carrierRows)}
            ${this._fieldCard('Hosting flags', 'bi-hdd-stack', hostingRows)}
        `;
    }

    _fieldCard(title, icon, rows) {
        const rowsHtml = rows.map(([label, value]) => `
            <div class="detail-field-row">
                <div class="detail-field-label">${this.escapeHtml(label)}</div>
                <div class="detail-field-value">${value}</div>
            </div>
        `).join('');
        return `
            <div class="detail-field-card">
                <div class="detail-field-card-header">
                    <h4><i class="bi ${this.escapeHtml(icon)}"></i>${this.escapeHtml(title)}</h4>
                </div>
                <div class="detail-field-card-body">${rowsHtml}</div>
            </div>
        `;
    }
}


// ── Risk & Reputation section ─────────────────────────────

class GeoIPRiskSection extends View {
    constructor(options = {}) {
        super({
            className: 'geoip-risk-section',
            ...options
        });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const provider = m.get('provider') || 'unknown';
        const lastSeen = m.get('last_seen');
        const sourceMeta = `source: ${this.escapeHtml(provider)}`;
        const checkedMeta = lastSeen ? formatRelative(lastSeen) : 'live';

        const flags = [
            { label: 'threat',     icon: 'bi-shield-exclamation', tone: 'danger',
              hit: !!m.get('is_threat'),
              text: 'Marked as <strong>active threat</strong>' },
            { label: 'suspicious', icon: 'bi-question-octagon', tone: 'warning',
              hit: !!m.get('is_suspicious'),
              text: 'Flagged <strong>suspicious</strong>' },
            { label: 'attacker',   icon: 'bi-exclamation-octagon-fill', tone: 'danger',
              hit: !!m.get('is_known_attacker'),
              text: 'Known <strong>attacker</strong>' },
            { label: 'abuser',     icon: 'bi-exclamation-triangle-fill', tone: 'danger',
              hit: !!m.get('is_known_abuser'),
              text: 'Known <strong>abuser</strong>' },
            { label: 'vpn',        icon: 'bi-shield-shaded', tone: 'warning',
              hit: !!m.get('is_vpn'),
              text: '<strong>VPN exit</strong>' },
            { label: 'tor',        icon: 'bi-shield-lock', tone: 'danger',
              hit: !!m.get('is_tor'),
              text: '<strong>Tor exit</strong>' },
            { label: 'proxy',      icon: 'bi-diagram-3', tone: 'warning',
              hit: !!m.get('is_proxy'),
              text: '<strong>Open proxy</strong>' }
        ];

        const items = flags.map(f => {
            const tone = f.hit ? f.tone : '';
            const text = f.hit ? f.text : `No <strong>${this.escapeHtml(f.label)}</strong> signal`;
            const iconClass = f.hit ? f.icon : 'bi-shield-check';
            return `
                <li class="detail-audit-entry">
                    <div class="detail-audit-icon${tone ? ` tone-${tone}` : ''}"><i class="bi ${this.escapeHtml(iconClass)}"></i></div>
                    <div class="detail-audit-source">${this.escapeHtml(f.label)}</div>
                    <div>${text} <span class="text-secondary">· ${sourceMeta}</span></div>
                    <div class="detail-audit-when">${this.escapeHtml(checkedMeta)}</div>
                </li>
            `;
        }).join('');

        const score = m.get('risk_score');
        const threatLevel = m.get('threat_level') || 'unknown';
        const tone = THREAT_TONE[threatLevel] || null;
        const summaryRows = [
            ['Threat level', `<span class="badge text-bg-${tone || 'secondary'}">${this.escapeHtml(threatLevel)}</span>`],
            ['Risk score',   score != null ? `<strong>${this.escapeHtml(String(score))}</strong> / 100` : '<span class="text-secondary">—</span>'],
            ['Provider',     this.escapeHtml(provider)]
        ];
        const summaryHtml = summaryRows.map(([k, v]) => `
            <div class="detail-field-row">
                <div class="detail-field-label">${this.escapeHtml(k)}</div>
                <div class="detail-field-value">${v}</div>
            </div>
        `).join('');

        return `
            <div class="section-eyebrow">Section · Risk &amp; Reputation</div>
            <h3 class="section-title">Reputation breakdown</h3>
            <div class="detail-field-card">
                <div class="detail-field-card-header">
                    <h4><i class="bi bi-shield-exclamation"></i>Summary</h4>
                </div>
                <div class="detail-field-card-body">${summaryHtml}</div>
            </div>
            <ul class="detail-audit-list">${items}</ul>
        `;
    }
}


// ── Block & Whitelist section ─────────────────────────────

class GeoIPBlockSection extends View {
    constructor(options = {}) {
        super({
            className: 'geoip-block-section',
            ...options
        });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const isBlocked     = !!m.get('is_blocked');
        const isWhitelisted = !!m.get('is_whitelisted');

        const blockRows = [
            ['Status',         isBlocked
                ? `<span class="badge text-bg-danger"><i class="bi bi-slash-circle me-1"></i>Blocked</span>`
                : `<span class="badge text-bg-success"><i class="bi bi-check2 me-1"></i>Allowed</span>`],
            ['Reason',         m.get('blocked_reason') ? this.escapeHtml(m.get('blocked_reason')) : '<span class="text-secondary">—</span>'],
            ['Blocked at',     m.get('blocked_at')    ? `<code>${this.escapeHtml(formatDateTime(m.get('blocked_at')))}</code>`    : '<span class="text-secondary">—</span>'],
            ['Blocked until',  m.get('blocked_until') ? `<code>${this.escapeHtml(formatDateTime(m.get('blocked_until')))}</code>` : '<span class="text-secondary">Permanent / —</span>'],
            ['Block count',    m.get('block_count') != null ? this.escapeHtml(String(m.get('block_count'))) : '<span class="text-secondary">0</span>']
        ];

        const whitelistRows = [
            ['Status',       isWhitelisted
                ? `<span class="badge text-bg-info"><i class="bi bi-shield-check me-1"></i>Whitelisted</span>`
                : `<span class="badge text-bg-secondary">Not whitelisted</span>`],
            ['Reason',       m.get('whitelisted_reason') ? this.escapeHtml(m.get('whitelisted_reason')) : '<span class="text-secondary">—</span>']
        ];

        const blockActions = isBlocked
            ? `<button class="btn btn-outline-success btn-sm" data-action="unblock"><i class="bi bi-unlock me-1"></i>Unblock</button>`
            : `<button class="btn btn-outline-danger btn-sm" data-action="block"><i class="bi bi-slash-circle me-1"></i>Block IP</button>`;
        const whitelistActions = isWhitelisted
            ? `<button class="btn btn-outline-secondary btn-sm" data-action="unwhitelist"><i class="bi bi-x-circle me-1"></i>Remove whitelist</button>`
            : `<button class="btn btn-outline-primary btn-sm" data-action="whitelist"><i class="bi bi-shield-check me-1"></i>Whitelist</button>`;

        return `
            <div class="section-eyebrow">Section · Block &amp; Whitelist</div>
            <h3 class="section-title">Enforcement state</h3>
            <div class="detail-field-card">
                <div class="detail-field-card-header">
                    <h4><i class="bi bi-slash-circle"></i>Block</h4>
                    ${blockActions}
                </div>
                <div class="detail-field-card-body">${this._rows(blockRows)}</div>
            </div>
            <div class="detail-field-card">
                <div class="detail-field-card-header">
                    <h4><i class="bi bi-shield-check"></i>Whitelist</h4>
                    ${whitelistActions}
                </div>
                <div class="detail-field-card-body">${this._rows(whitelistRows)}</div>
            </div>
        `;
    }

    _rows(rows) {
        return rows.map(([label, value]) => `
            <div class="detail-field-row">
                <div class="detail-field-label">${this.escapeHtml(label)}</div>
                <div class="detail-field-value">${value}</div>
            </div>
        `).join('');
    }

    async onActionBlock()       { this.emit('action:block'); }
    async onActionUnblock()     { this.emit('action:unblock'); }
    async onActionWhitelist()   { this.emit('action:whitelist'); }
    async onActionUnwhitelist() { this.emit('action:unwhitelist'); }
}


// ── Metadata section ──────────────────────────────────────

class GeoIPMetadataSection extends View {
    constructor(options = {}) {
        super({
            className: 'geoip-metadata-section',
            ...options
        });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const rows = [
            ['Record ID',     m.get('id') ? `<code>${this.escapeHtml(String(m.get('id')))}</code>` : '<span class="text-secondary">—</span>'],
            ['Provider',      m.get('provider') ? this.escapeHtml(m.get('provider')) : '<span class="text-secondary">—</span>'],
            ['Created',       m.get('created')    ? `<code>${this.escapeHtml(formatDateTime(m.get('created')))}</code>`    : '<span class="text-secondary">—</span>'],
            ['Modified',      m.get('modified')   ? `<code>${this.escapeHtml(formatDateTime(m.get('modified')))}</code>`   : '<span class="text-secondary">—</span>'],
            ['Last seen',     m.get('last_seen')  ? `<code>${this.escapeHtml(formatDateTime(m.get('last_seen')))}</code>`  : '<span class="text-secondary">—</span>'],
            ['Expires at',    m.get('expires_at') ? `<code>${this.escapeHtml(formatDateTime(m.get('expires_at')))}</code>` : '<span class="text-secondary">—</span>']
        ];
        const rowsHtml = rows.map(([label, value]) => `
            <div class="detail-field-row">
                <div class="detail-field-label">${this.escapeHtml(label)}</div>
                <div class="detail-field-value">${value}</div>
            </div>
        `).join('');

        const raw = JSON.stringify(m.attributes || {}, null, 2);

        return `
            <div class="section-eyebrow">Section · Metadata</div>
            <h3 class="section-title">Record metadata</h3>
            <div class="detail-field-card">
                <div class="detail-field-card-header">
                    <h4><i class="bi bi-info-circle"></i>Audit fields</h4>
                </div>
                <div class="detail-field-card-body">${rowsHtml}</div>
            </div>
            <h6 class="text-body-secondary small text-uppercase mt-3 mb-2" style="letter-spacing: 0.06em;">Raw JSON</h6>
            <pre class="bg-body-tertiary border rounded p-3 small mb-0" style="white-space: pre-wrap; word-break: break-word;"><code>${this.escapeHtml(raw)}</code></pre>
        `;
    }
}


// ── GeoIPView (assembly) ──────────────────────────────────

class GeoIPView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new GeoLocatedIP(options.data || {});
        const ipAddress = model.get('ip_address');

        // Shared collections — fire-and-forget initial fetch in onAfterBuild
        const eventsCollection = new IncidentEventList({
            params: { source_ip: ipAddress, size: 25, sort: '-created' }
        });
        // Combined logs — kind filter lets the user split traffic vs audit
        const logsCollection = new LogList({
            params: { ip: ipAddress, size: 25, sort: '-created' }
        });

        // Section views
        const overviewSection = new GeoIPOverviewSection({ model });
        const networkSection  = new GeoIPNetworkSection({ model });
        const riskSection     = new GeoIPRiskSection({ model });
        const blockSection    = new GeoIPBlockSection({ model });
        const metadataSection = new GeoIPMetadataSection({ model });

        const eventsSection = new TableView({
            collection: eventsCollection,
            title: 'Events',
            eyebrow: 'Section · Events',
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

        const logsSection = new TableView({
            collection: logsCollection,
            title: 'Logs',
            eyebrow: 'Section · Logs',
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

        const sections = [
            { key: 'Overview', label: 'Overview',          icon: 'bi-grid-1x2',           view: overviewSection },
            { key: 'Network',  label: 'Network',           icon: 'bi-diagram-3',          view: networkSection },
            { key: 'Risk',     label: 'Risk & Reputation', icon: 'bi-shield-exclamation', view: riskSection },
            { type: 'divider', label: 'Enforcement' },
            { key: 'Block',    label: 'Block & Whitelist', icon: 'bi-slash-circle',       view: blockSection },
            { type: 'divider', label: 'Activity' },
            { key: 'Events',   label: 'Events',            icon: 'bi-list-ul',            view: eventsSection },
            { key: 'Logs',     label: 'Logs',              icon: 'bi-code-square',        view: logsSection,
              permissions: 'view_logs' },
            { type: 'divider', label: 'Detail' },
            { key: 'Metadata', label: 'Metadata',          icon: 'bi-braces',             view: metadataSection }
        ];

        // Header — dynamic icon tone based on threat
        const isThreat     = !!model.get('is_threat');
        const isSuspicious = !!model.get('is_suspicious');
        const threatLevel  = (model.get('threat_level') || '').toLowerCase();
        const isBlocked    = !!model.get('is_blocked');

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
            // Network flags — only when true
            { icon: 'bi-shield-shaded',  text: 'VPN',        variant: 'warning',
              when: m => !!m.get('is_vpn') },
            { icon: 'bi-shield-lock',    text: 'Tor',        variant: 'danger',
              when: m => !!m.get('is_tor') },
            { icon: 'bi-diagram-3',      text: 'Proxy',      variant: 'warning',
              when: m => !!m.get('is_proxy') },
            { icon: 'bi-cloud-fill',     text: 'Cloud',      variant: 'info',
              when: m => !!m.get('is_cloud') },
            { icon: 'bi-hdd-stack',      text: 'Datacenter', variant: 'warning',
              when: m => !!m.get('is_datacenter') },
            { icon: 'bi-slash-circle',   text: 'Blocked',    variant: 'danger',
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
        this.logsCollection = logsCollection;
        this.overviewSection = overviewSection;
        this.networkSection  = networkSection;
        this.riskSection     = riskSection;
        this.blockSection    = blockSection;
        this.metadataSection = metadataSection;
        this.eventsSection   = eventsSection;
        this.logsSection     = logsSection;

        // Pre-compute the synthetic subtitle the header reads via subtitlePath
        this._refreshComputedFields();
    }

    async onAfterBuild() {
        // Wire StatusPanel + Block-section action emits to the view's handlers
        this.overviewSection.on('action:block',     () => this.onActionBlockIp());
        this.overviewSection.on('action:unblock',   () => this.onActionUnblockIp());
        this.overviewSection.on('action:whitelist', () => this.onActionWhitelistIp());

        this.blockSection.on('action:block',       () => this.onActionBlockIp());
        this.blockSection.on('action:unblock',     () => this.onActionUnblockIp());
        this.blockSection.on('action:whitelist',   () => this.onActionWhitelistIp());
        this.blockSection.on('action:unwhitelist', () => this.onActionUnwhitelistIp());

        // Sidebar badges: events count + logs count
        const updateEventsBadge = () => {
            const n = this.eventsCollection.totalCount ?? this.eventsCollection.models?.length ?? 0;
            this.setBadge('Events', n > 0 ? { text: String(n), variant: n > 10 ? 'warning' : 'muted' } : null);
        };
        const updateLogsBadge = () => {
            const n = this.logsCollection.totalCount ?? this.logsCollection.models?.length ?? 0;
            this.setBadge('Logs', n > 0 ? { text: String(n), variant: 'muted' } : null);
        };
        this.eventsCollection.on('fetch:success', updateEventsBadge, this);
        this.logsCollection.on('fetch:success',   updateLogsBadge,   this);

        // Fire-and-forget initial fetches
        this.eventsCollection.fetch().catch(() => {});
        this.logsCollection.fetch().catch(() => {});
    }

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

    /** Re-render header + Overview + Block sections after model changes */
    async _refreshFromModel() {
        this._refreshComputedFields();
        if (this.headerView?.isMounted()) {
            await this.headerView.render();
        }
        if (this.overviewSection?.isMounted()) {
            await this.overviewSection.render();
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
