/**
 * DeviceView - User device inspector built on the DetailView primitive.
 *
 * Header + side-nav layout matching RuleSetView / JobDetailsView. Sections:
 *   Overview · Hardware · ──Activity── Locations · Sessions ·
 *   ──Detail── Metadata
 *
 * Overview leads with four KPIs (Sessions / Locations / Days active /
 * Last login), then a Hardware-summary card and a Threat-signals audit
 * list. Hardware section dumps the full `device_info` blob in
 * field-card format. Locations is a TableView on UserDeviceLocationList
 * scoped to this device.
 *
 * Open via `Modal.detail(new DeviceView({ model }))` — pair with
 * `viewDialogOptions: { header: false, noBodyPadding: true,
 * buttons: [] }` when wired through TableView. Inherits `size: 'lg'`
 * from `Modal.detail()`'s default.
 */

import DetailView from '@core/views/data/DetailView.js';
import View from '@core/View.js';
import TableView from '@core/views/table/TableView.js';
import TableRow from '@core/views/table/TableRow.js';
import Modal from '@core/views/feedback/Modal.js';
import { User, UserDevice, UserDeviceLocationList } from '@core/models/User.js';


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
    if (diffSec < 0) return 'in the future';
    if (diffSec < 60)    return `${diffSec}s ago`;
    if (diffSec < 3600)  return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
}

function formatDateTime(value) {
    const ms = epochToMs(value);
    if (ms == null) return '—';
    return new Date(ms).toLocaleString();
}

/** Extract a "Chrome 122" / "Firefox 117" style browser label */
function browserLabel(deviceInfo) {
    const ua = deviceInfo?.user_agent || {};
    const parts = [ua.family, ua.major].filter(Boolean);
    return parts.length ? parts.join(' ') : 'Unknown browser';
}

/** Extract a "macOS 14.4" / "Windows 11" style OS label */
function osLabel(deviceInfo) {
    const os = deviceInfo?.os || {};
    const ver = [os.major, os.minor].filter(Boolean).join('.');
    return os.family ? `${os.family} ${ver}`.trim() : 'Unknown OS';
}

/** Best-effort device descriptor — falls back to "" when generic */
function deviceLabel(deviceInfo) {
    const dev = deviceInfo?.device || {};
    const parts = [dev.brand, dev.family].filter(Boolean);
    if (!parts.length) return '';
    const name = parts.join(' ');
    return dev.model ? `${name} (${dev.model})` : name;
}

/** Choose a header icon based on the browser/OS family */
function pickIcon(deviceInfo) {
    const browser = (deviceInfo?.user_agent?.family || '').toLowerCase();
    const os = (deviceInfo?.os?.family || '').toLowerCase();
    const device = (deviceInfo?.device?.family || '').toLowerCase();

    if (browser.includes('chrome'))  return 'bi-browser-chrome';
    if (browser.includes('firefox')) return 'bi-browser-firefox';
    if (browser.includes('safari'))  return 'bi-browser-safari';
    if (browser.includes('edge'))    return 'bi-browser-edge';
    if (os.includes('mac') || os.includes('ios')) return 'bi-apple';
    if (os.includes('windows'))      return 'bi-windows';
    if (os.includes('android'))      return 'bi-android2';
    if (os.includes('linux'))        return 'bi-ubuntu';
    if (device.includes('iphone'))   return 'bi-phone';
    if (device.includes('ipad'))     return 'bi-tablet';
    return 'bi-laptop';
}

/** Detect any threat signals on the device or its last-known geo */
function collectThreatFlags(model) {
    const di = model.get('device_info') || {};
    const geo = di.last_geo || di.geolocation || model.get('last_geo') || {};
    const flags = [];
    if (geo.is_vpn)    flags.push({ key: 'vpn',   label: 'VPN'   });
    if (geo.is_tor)    flags.push({ key: 'tor',   label: 'Tor'   });
    if (geo.is_proxy)  flags.push({ key: 'proxy', label: 'Proxy' });
    if (geo.is_cloud)  flags.push({ key: 'cloud', label: 'Cloud' });
    return flags;
}

/** Approximate days-active from first_seen → last_seen. */
function daysActive(model) {
    const firstMs = epochToMs(model.get('first_seen'));
    const lastMs  = epochToMs(model.get('last_seen'));
    if (firstMs == null || lastMs == null) return null;
    const days = Math.max(0, Math.floor((lastMs - firstMs) / 86400000));
    return days;
}

/** Truncate long DUIDs while keeping head + tail for recognizability. */
function truncateMiddle(value, max = 12) {
    if (value == null) return '';
    const s = String(value);
    if (s.length <= max) return s;
    const head = Math.ceil(max / 2);
    const tail = Math.floor(max / 2);
    return `${s.slice(0, head)}…${s.slice(-tail)}`;
}


// ── Location row (multiline) ───────────────────────────────

class DeviceLocationRow extends TableRow {
    get locationText() {
        const geo = this.model?.get('geolocation') || {};
        return [geo.city, geo.region].filter(Boolean).join(', ') || geo.country_name || '—';
    }
    get countryName() {
        return this.model?.get('geolocation')?.country_name || '';
    }
    get ispName() {
        const geo = this.model?.get('geolocation') || {};
        return geo.isp || geo.asn_org || '';
    }
    get threatFlags() {
        const geo = this.model?.get('geolocation') || {};
        const flags = [];
        if (geo.is_vpn)   flags.push('<span class="badge text-bg-warning">VPN</span>');
        if (geo.is_tor)   flags.push('<span class="badge text-bg-danger">Tor</span>');
        if (geo.is_proxy) flags.push('<span class="badge text-bg-warning">Proxy</span>');
        if (geo.is_cloud) flags.push('<span class="badge text-bg-info">Cloud</span>');
        return flags.join(' ');
    }
    get hasThreatFlags() {
        const geo = this.model?.get('geolocation') || {};
        return !!(geo.is_vpn || geo.is_tor || geo.is_proxy || geo.is_cloud);
    }
}


// ── Overview section ───────────────────────────────────────

class DeviceOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'device-overview-section p-3',
            ...options
        });

        this.locationsCollection = options.locationsCollection || null;
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        return `
            <div class="detail-kpi-grid">
                <div data-container="dv-kpi-sessions"></div>
                <div data-container="dv-kpi-locations"></div>
                <div data-container="dv-kpi-days"></div>
                <div data-container="dv-kpi-last-login"></div>
            </div>
            <div class="detail-pair">
                <div data-container="dv-overview-hardware"></div>
                <div data-container="dv-overview-threats"></div>
            </div>
        `;
    }

    async onInit() {
        const m = this.model;

        // KPIs
        const sessionsCount = m.get('session_count') ?? m.get('sessions') ?? null;
        const locationsCount = this._readLocationsCount();
        const days = daysActive(m);
        const lastSeen = m.get('last_seen');

        this.kpiSessions  = this._kpi('dv-kpi-sessions',  'Sessions',  sessionsCount == null ? '—' : String(sessionsCount));
        this.kpiLocations = this._kpi('dv-kpi-locations', 'Locations', locationsCount == null ? '—' : String(locationsCount));
        this.kpiDays      = this._kpi('dv-kpi-days',      'Days active', days == null ? '—' : String(days));
        this.kpiLastLogin = this._kpi(
            'dv-kpi-last-login',
            'Last login',
            lastSeen ? formatRelative(lastSeen) : 'Never',
            lastSeen ? 'success' : null
        );
        [this.kpiSessions, this.kpiLocations, this.kpiDays, this.kpiLastLogin].forEach(c => this.addChild(c));

        // Hardware summary card
        this.hardwareCard = new DeviceHardwareSummaryCard({
            containerId: 'dv-overview-hardware',
            model: m
        });
        this.addChild(this.hardwareCard);

        // Threat-signals card (audit list)
        this.threatsCard = new DeviceThreatSignalsCard({
            containerId: 'dv-overview-threats',
            model: m
        });
        this.addChild(this.threatsCard);

        // React to locations collection — keep the KPI live
        if (this.locationsCollection) {
            this.locationsCollection.on('fetch:success', () => this._refreshLocationsKpi(), this);
        }
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

    _readLocationsCount() {
        if (!this.locationsCollection) return null;
        return this.locationsCollection.totalCount
            ?? this.locationsCollection.models?.length
            ?? null;
    }

    _refreshLocationsKpi() {
        const count = this._readLocationsCount();
        if (this.kpiLocations?.element) {
            const span = this.kpiLocations.element.querySelector('.metric-card-value');
            if (span) span.textContent = count == null ? '—' : String(count);
        }
    }
}


// ── Hardware summary card (Overview right-column) ──────────

class DeviceHardwareSummaryCard extends View {
    constructor(options = {}) {
        super({ ...options });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const di = m.get('device_info') || {};
        const ua = di.user_agent || {};
        const os = di.os || {};
        const screen = di.screen || {};
        const screenText = (screen.width && screen.height)
            ? `${screen.width} × ${screen.height}${screen.pixel_ratio ? ` · ${screen.pixel_ratio}×` : ''}`
            : '—';

        const rows = [
            ['Browser',  ua.family ? `${this.escapeHtml(browserLabel(di))}${ua.minor ? ` <span class="text-secondary">·</span> ${this.escapeHtml(String(ua.minor))}` : ''}` : '<span class="text-secondary">—</span>'],
            ['OS',       os.family ? this.escapeHtml(osLabel(di)) : '<span class="text-secondary">—</span>'],
            ['Screen',   screenText !== '—' ? this.escapeHtml(screenText) : '<span class="text-secondary">—</span>'],
            ['Locale',   di.locale   ? `<code>${this.escapeHtml(String(di.locale))}</code>`   : '<span class="text-secondary">—</span>'],
            ['Timezone', di.timezone ? `<code>${this.escapeHtml(String(di.timezone))}</code>` : '<span class="text-secondary">—</span>'],
            ['First seen', m.get('first_seen')
                ? `<code>${this.escapeHtml(formatDateTime(m.get('first_seen')))}</code> <span class="text-secondary">· ${this.escapeHtml(formatRelative(m.get('first_seen')))}</span>`
                : '<span class="text-secondary">—</span>']
        ];

        const rowsHtml = rows.map(([k, v]) =>
            `<li class="d-flex justify-content-between border-bottom border-opacity-25 py-1"><span class="text-secondary">${this.escapeHtml(k)}</span><span>${v}</span></li>`
        ).join('');

        return `
            <div class="card">
                <div class="card-body">
                    <div class="card-title"><i class="bi bi-cpu"></i>Hardware &amp; environment</div>
                    <ul class="list-unstyled mb-0 small">${rowsHtml}</ul>
                </div>
            </div>
        `;
    }
}


// ── Threat signals card (audit-list) ───────────────────────

class DeviceThreatSignalsCard extends View {
    constructor(options = {}) {
        super({ ...options });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const di = m.get('device_info') || {};
        const geo = di.last_geo || di.geolocation || m.get('last_geo') || {};
        const isTrusted = !!m.get('is_trusted');
        const flags = collectThreatFlags(m);
        const lastSeenRel = m.get('last_seen') ? formatRelative(m.get('last_seen')) : 'unknown';

        const entries = [];

        // TRUST
        entries.push({
            tone: isTrusted ? 'success' : null,
            icon: isTrusted ? 'bi-shield-check' : 'bi-shield',
            source: 'trust',
            text: isTrusted
                ? `Marked <strong>trusted</strong>`
                : `Not marked trusted`,
            when: lastSeenRel
        });

        // VPN
        const vpnHit = flags.find(f => f.key === 'vpn');
        entries.push({
            tone: vpnHit ? 'warning' : 'success',
            icon: vpnHit ? 'bi-shield-exclamation' : 'bi-shield-check',
            source: 'vpn',
            text: vpnHit ? 'VPN detected on last session' : 'No VPN detected on last session',
            when: 'live'
        });

        // TOR
        const torHit = flags.find(f => f.key === 'tor');
        entries.push({
            tone: torHit ? 'danger' : 'success',
            icon: torHit ? 'bi-shield-x' : 'bi-shield-check',
            source: 'tor',
            text: torHit ? 'Seen from a Tor exit' : 'Never seen from a Tor exit',
            when: 'live'
        });

        // GEO — locations seen
        const locCount = m.get('location_count') ?? null;
        const geoText = locCount != null
            ? `${locCount} distinct location${locCount === 1 ? '' : 's'}`
            : (geo.country_name ? `Last from ${this.escapeHtml(geo.country_name)}` : 'Location unknown');
        entries.push({
            tone: 'info',
            icon: 'bi-geo-alt',
            source: 'geo',
            text: geoText,
            when: 'live'
        });

        // DUID
        const duid = m.get('duid');
        entries.push({
            tone: null,
            icon: 'bi-fingerprint',
            source: 'duid',
            text: duid
                ? `<code>${this.escapeHtml(truncateMiddle(duid, 12))}</code>`
                : '<span class="text-secondary">No device id</span>',
            when: m.get('first_seen') ? formatRelative(m.get('first_seen')) : ''
        });

        const itemsHtml = entries.map(e => `
            <li class="detail-audit-entry">
                <div class="detail-audit-icon${e.tone ? ` tone-${e.tone}` : ''}"><i class="bi ${this.escapeHtml(e.icon)}"></i></div>
                <div class="detail-audit-source">${this.escapeHtml(e.source)}</div>
                <div>${e.text}</div>
                <div class="detail-audit-when">${this.escapeHtml(e.when || '')}</div>
            </li>
        `).join('');

        return `
            <div class="card">
                <div class="card-body">
                    <div class="card-title"><i class="bi bi-shield-check"></i>Threat signals</div>
                    <ul class="detail-audit-list">${itemsHtml}</ul>
                </div>
            </div>
        `;
    }
}


// ── Hardware section (full device_info dump) ───────────────

class DeviceHardwareSection extends View {
    constructor(options = {}) {
        super({
            className: 'device-hardware-section p-3',
            ...options
        });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const di = m.get('device_info') || {};
        const ua = di.user_agent || {};
        const os = di.os || {};
        const dev = di.device || {};
        const screen = di.screen || {};

        const browserCard = this._fieldCard('Browser', 'bi-window', [
            ['Family',  ua.family ? this.escapeHtml(String(ua.family)) : '<span class="text-secondary">—</span>'],
            ['Version', [ua.major, ua.minor, ua.patch].filter(v => v != null && v !== '').map(v => this.escapeHtml(String(v))).join('.') || '<span class="text-secondary">—</span>'],
            ['Engine',  ua.engine ? this.escapeHtml(String(ua.engine)) : '<span class="text-secondary">—</span>']
        ]);

        const osCard = this._fieldCard('Operating system', 'bi-display', [
            ['Family',  os.family ? this.escapeHtml(String(os.family)) : '<span class="text-secondary">—</span>'],
            ['Version', [os.major, os.minor, os.patch].filter(v => v != null && v !== '').map(v => this.escapeHtml(String(v))).join('.') || '<span class="text-secondary">—</span>']
        ]);

        const hardwareCard = this._fieldCard('Hardware', 'bi-cpu', [
            ['Brand',  dev.brand  ? this.escapeHtml(String(dev.brand))  : '<span class="text-secondary">—</span>'],
            ['Family', dev.family ? this.escapeHtml(String(dev.family)) : '<span class="text-secondary">—</span>'],
            ['Model',  dev.model  ? this.escapeHtml(String(dev.model))  : '<span class="text-secondary">—</span>']
        ]);

        const screenRows = [];
        if (screen.width && screen.height) {
            screenRows.push(['Resolution', `${screen.width} × ${screen.height}`]);
        }
        if (screen.pixel_ratio != null) {
            screenRows.push(['Pixel ratio', `${this.escapeHtml(String(screen.pixel_ratio))}×`]);
        }
        if (screen.color_depth != null) {
            screenRows.push(['Color depth', `${this.escapeHtml(String(screen.color_depth))}-bit`]);
        }
        if (di.locale)   screenRows.push(['Locale',   `<code>${this.escapeHtml(String(di.locale))}</code>`]);
        if (di.timezone) screenRows.push(['Timezone', `<code>${this.escapeHtml(String(di.timezone))}</code>`]);
        const envCard = screenRows.length
            ? this._fieldCard('Display & environment', 'bi-aspect-ratio', screenRows)
            : '';

        const idRows = [
            ['Device ID', m.get('duid')   ? `<code>${this.escapeHtml(String(m.get('duid')))}</code>` : '<span class="text-secondary">—</span>'],
            ['Last IP',   m.get('last_ip') ? `<code>${this.escapeHtml(String(m.get('last_ip')))}</code>` : '<span class="text-secondary">—</span>'],
            ['First seen', m.get('first_seen') ? `<code>${this.escapeHtml(formatDateTime(m.get('first_seen')))}</code>` : '<span class="text-secondary">—</span>'],
            ['Last seen',  m.get('last_seen')  ? `<code>${this.escapeHtml(formatDateTime(m.get('last_seen')))}</code>`  : '<span class="text-secondary">—</span>']
        ];
        const idCard = this._fieldCard('Identification', 'bi-fingerprint', idRows);

        const uaString = di.string ? `
            <div class="detail-field-card">
                <div class="detail-field-card-header">
                    <h4><i class="bi bi-code-slash"></i>User agent string</h4>
                </div>
                <div class="detail-field-card-body">
                    <pre class="detail-error-block" style="color: var(--bs-secondary-color);">${this.escapeHtml(String(di.string))}</pre>
                </div>
            </div>
        ` : '';

        return `
            ${browserCard}
            ${osCard}
            ${hardwareCard}
            ${envCard}
            ${idCard}
            ${uaString}
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


// ── Sessions section (no collection wired yet) ─────────────
//
// There is no UserDeviceSession collection in the framework today, so this
// section renders an informational placeholder. Once a session model is
// added, swap this out for a TableView the same way Locations does.

class DeviceSessionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'device-sessions-section p-3',
            ...options
        });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        return `
            <div class="card">
                <div class="card-body text-center text-secondary py-4">
                    <i class="bi bi-clock-history fs-1 d-block mb-2"></i>
                    <p class="mb-0 small">Session history is not yet recorded server-side.
                    Once a UserDeviceSession collection lands, this section
                    will list every login/token-grant for this device.</p>
                </div>
            </div>
        `;
    }
}


// ── Metadata section ───────────────────────────────────────

class DeviceMetadataSection extends View {
    constructor(options = {}) {
        super({
            className: 'device-metadata-section p-3',
            ...options
        });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const meta = this.model.get('metadata') || {};
        const isEmpty = Object.keys(meta).length === 0;

        if (isEmpty) {
            return `
                <div class="card">
                    <div class="card-body text-center text-secondary py-4">
                        <i class="bi bi-braces fs-1 d-block mb-2"></i>
                        <p class="mb-0 small">No metadata recorded for this device.</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="card">
                <div class="card-body">
                    <div class="card-title"><i class="bi bi-braces"></i>Metadata</div>
                    <pre class="bg-body-tertiary border rounded p-3 small mb-0" style="white-space: pre-wrap; word-break: break-word; max-height: 60vh; overflow: auto;"><code>{{model.metadata|json}}</code></pre>
                </div>
            </div>
        `;
    }
}


// ── DeviceView (assembly) ──────────────────────────────────

class DeviceView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new UserDevice(options.data || {});
        const di = model.get('device_info') || {};

        // Shared collection — Locations table + Overview KPI + sidebar badge
        const locationsCollection = new UserDeviceLocationList({
            params: { user_device: model.get('id'), size: 10 }
        });

        // Section view instances
        const overviewSection = new DeviceOverviewSection({ model, locationsCollection });
        const hardwareSection = new DeviceHardwareSection({ model });

        const locationsSection = new TableView({
            collection: locationsCollection,
            title: 'Locations',
            eyebrow: 'Section · Locations',
            showFullscreen: false,
            showRefresh: true,
            searchable: false,
            tableOptions: { striped: false, hover: true },
            hideActivePillNames: ['user_device'],
            clickAction: 'view',
            itemClass: DeviceLocationRow,
            selectable: false,
            columns: [
                {
                    key: 'ip_address',
                    label: 'Location',
                    template: `
                        <div class="fw-semibold small">
                            <i class="bi bi-geo-alt text-secondary me-1"></i>{{locationText}}
                            {{#countryName}} <span class="text-secondary fw-normal">· {{countryName}}</span>{{/countryName}}
                        </div>
                        <div class="text-secondary small mt-1">
                            <code>{{model.ip_address}}</code>
                            {{#ispName}} <span class="mx-1">·</span> {{ispName}}{{/ispName}}
                            {{#hasThreatFlags|bool}} <span class="ms-1">{{{threatFlags}}}</span>{{/hasThreatFlags|bool}}
                        </div>`
                },
                { key: 'first_seen', label: 'First seen', formatter: 'epoch|relative', sortable: true, width: '120px' },
                { key: 'last_seen',  label: 'Last seen',  formatter: 'epoch|relative', sortable: true, width: '120px' }
            ]
        });

        const sessionsSection = new DeviceSessionsSection({ model });
        const metadataSection = new DeviceMetadataSection({ model });

        // Section list
        const sections = [
            { key: 'Overview',  label: 'Overview',  icon: 'bi-grid-1x2', view: overviewSection },
            { key: 'Hardware',  label: 'Hardware',  icon: 'bi-cpu',      view: hardwareSection },
            { type: 'divider', label: 'Activity' },
            { key: 'Locations', label: 'Locations', icon: 'bi-geo-alt',       view: locationsSection },
            { key: 'Sessions',  label: 'Sessions',  icon: 'bi-clock-history', view: sessionsSection },
            { type: 'divider', label: 'Detail' },
            { key: 'Metadata',  label: 'Metadata',  icon: 'bi-braces',   view: metadataSection }
        ];

        // Header config
        const headerIcon = pickIcon(di);
        const titleFn = m => {
            const _di = m.get('device_info') || {};
            const browser = browserLabel(_di);
            const os = osLabel(_di);
            return `${browser} on ${os}`;
        };

        const chips = [
            { icon: 'bi-window', text: m => browserLabel(m.get('device_info') || {}), variant: 'info',
              when: m => !!(m.get('device_info')?.user_agent?.family) },
            { icon: 'bi-fingerprint',
              text: m => m.get('duid') ? `duid · ${truncateMiddle(m.get('duid'), 12)}` : null,
              variant: 'light',
              when: m => !!m.get('duid') },
            { text: m => {
                const n = m.get('session_count') ?? m.get('sessions');
                return (n != null) ? `${n} ${n === 1 ? 'session' : 'sessions'}` : null;
              }, variant: 'light' },
            { text: m => {
                const n = m.get('location_count');
                return (n != null) ? `${n} ${n === 1 ? 'location' : 'locations'}` : null;
              }, variant: 'light' },
            { icon: 'bi-shield-check', text: 'Trusted', variant: 'success',
              when: m => !!m.get('is_trusted') },
            // Threat-flag chips render only when present
            { icon: 'bi-shield-exclamation', text: 'VPN',   variant: 'warning',
              when: m => collectThreatFlags(m).some(f => f.key === 'vpn') },
            { icon: 'bi-shield-x',           text: 'Tor',   variant: 'danger',
              when: m => collectThreatFlags(m).some(f => f.key === 'tor') },
            { icon: 'bi-shield-exclamation', text: 'Proxy', variant: 'warning',
              when: m => collectThreatFlags(m).some(f => f.key === 'proxy') },
            { icon: 'bi-cloud',              text: 'Cloud', variant: 'info',
              when: m => collectThreatFlags(m).some(f => f.key === 'cloud') }
        ];

        // Pre-compute the synthetic subtitle the header reads via subtitlePath.
        // Stashed onto attributes._subtitle so a header re-render picks it up.
        const _refreshSubtitle = (m) => {
            const lastSeen = m.get('last_seen');
            const ip = m.get('last_ip');
            const _di = m.get('device_info') || {};
            const geo = _di.last_geo || _di.geolocation || m.get('last_geo') || {};
            const user = m.get('user');

            const parts = [];
            if (lastSeen) {
                parts.push(`Last seen ${formatRelative(lastSeen)}`);
            } else {
                parts.push('Never seen');
            }
            if (ip) parts.push(`from ${ip}`);
            const place = [geo.city, geo.country_name].filter(Boolean).join(', ');
            if (place) parts.push(`· ${place}`);
            if (user?.display_name) parts.push(`· owner ${user.display_name}`);
            m.attributes._subtitle = parts.join(' ');
        };
        _refreshSubtitle(model);

        // Active toggle — only show if the model has an `is_trusted` field
        // surfaced (any non-undefined value, including false).
        const hasTrustField = model.get('is_trusted') !== undefined;

        // Context menu items
        const contextItems = [
            { label: 'View user', action: 'view-user', icon: 'bi-person' },
            { label: 'View locations', action: 'view-locations-section', icon: 'bi-geo-alt' }
        ];
        if (hasTrustField) {
            contextItems.push({ label: model.get('is_trusted') ? 'Mark untrusted' : 'Mark trusted', action: 'toggle-trusted', icon: 'bi-shield-check' });
        }
        contextItems.push({ type: 'divider' });
        contextItems.push({ label: 'Forget device', action: 'forget-device', icon: 'bi-trash', danger: true });

        super({
            className: 'device-view',
            ...options,
            model,
            header: {
                icon: headerIcon,
                iconToneFn: m => {
                    const info = m.get('device_info') || {};
                    if (info.is_tor || info.is_proxy) return 'danger';
                    if (info.is_vpn || info.is_cloud) return 'warning';
                    return 'info';
                },
                titleFn,
                subtitlePath: '_subtitle',
                chips,
                activeField: hasTrustField ? 'is_trusted' : null,
                actions: [
                    { label: 'View user', icon: 'bi-person', action: 'view-user', title: 'Open the user that owns this device' },
                    { label: 'Forget',    icon: 'bi-trash',  action: 'forget-device', title: 'Delete this device record' }
                ],
                contextMenu: { items: contextItems }
            },
            sections,
            activeSection: 'Overview'
        });

        // Stash references for action handlers + cross-section wiring
        this.locationsCollection = locationsCollection;
        this.overviewSection  = overviewSection;
        this.hardwareSection  = hardwareSection;
        this.locationsSection = locationsSection;
        this.sessionsSection  = sessionsSection;
        this.metadataSection  = metadataSection;
        this._refreshSubtitle = _refreshSubtitle;
    }

    async onAfterBuild() {
        // Live sidebar badge for Locations
        const updateLocationsBadge = () => {
            const n = this.locationsCollection.totalCount ?? this.locationsCollection.models?.length ?? 0;
            this.setBadge('Locations', n > 0 ? { text: String(n), variant: 'muted' } : null);
        };
        this.locationsCollection.on('fetch:success', updateLocationsBadge, this);
        if (this.locationsCollection.models?.length) updateLocationsBadge();

        // Sessions badge — best-effort from the model (no collection yet)
        const sessionsCount = this.model.get('session_count') ?? this.model.get('sessions');
        if (sessionsCount != null && sessionsCount > 0) {
            this.setBadge('Sessions', { text: String(sessionsCount), variant: 'muted' });
        }

        // Fire-and-forget initial fetch so the KPI + badge populate before the
        // user navigates into the Locations section
        this.locationsCollection.fetch().catch(() => { /* fail silent */ });
    }

    // ── Actions ────────────────────────────────────────────

    async onActionViewUser() {
        const user = this.model.get('user');
        const userId = user?.id || user;
        if (!userId) {
            this.getApp()?.toast?.warning?.('No user linked to this device');
            return;
        }
        // Re-emit for legacy listeners (e.g. UserDeviceTablePage) that bind
        // 'view-user' and want to handle it themselves.
        this.emit('view-user', { userId });

        const ViewClass = User.VIEW_CLASS;
        if (!ViewClass) return;

        const userModel = new User({ id: userId });
        try {
            await userModel.fetch();
        } catch {
            // Even if the fetch fails, open the view — it will surface the error
        }
        const view = new ViewClass({ model: userModel });
        await Modal.detail(view);
    }

    async onActionViewLocationsSection() {
        await this.showSection('Locations');
    }

    async onActionToggleTrusted() {
        const next = !this.model.get('is_trusted');
        try {
            const resp = await this.model.save({ is_trusted: next });
            if (resp && resp.status && resp.status >= 400) {
                throw new Error('Save failed');
            }
            this.model.set('is_trusted', next);
            this.getApp()?.toast?.success(next ? 'Marked trusted' : 'Marked untrusted');
            // Refresh header so chip + active toggle reflect the new state
            if (this.headerView?.isMounted()) {
                await this.headerView.render();
            }
            // Refresh the Overview's threat-signals card
            if (this.overviewSection?.threatsCard?.isMounted()) {
                await this.overviewSection.threatsCard.render();
            }
            this.emit('detail:updated');
        } catch (err) {
            this.getApp()?.toast?.error(`Failed to update trust: ${err.message}`);
        }
    }

    async onActionForgetDevice() {
        const confirmed = await Modal.confirm(
            'Forget this device? The record will be deleted.',
            'Forget Device'
        );
        if (!confirmed) return true;

        try {
            const resp = await this.model.destroy();
            if (resp && resp.success === false) {
                throw new Error(resp.data?.error || 'Delete failed');
            }
            this.getApp()?.toast?.success('Device forgotten');
            // Close the modal envelope
            const dialog = this.element?.closest('.modal');
            if (dialog) {
                const bsModal = window.bootstrap?.Modal?.getInstance(dialog);
                if (bsModal) bsModal.hide();
            }
            this.emit('device:deleted', { model: this.model });
        } catch (err) {
            this.getApp()?.toast?.error(`Failed to forget: ${err.message}`);
        }
        return true;
    }

    /**
     * Static helper kept for legacy callers (e.g. LogView) that pass a
     * DUID and expect the modal to open. Fetches the device, then opens
     * a DetailView modal.
     */
    static async show(duid) {
        const model = await UserDevice.getByDuid(duid);
        if (model) {
            return Modal.detail(new DeviceView({ model }));
        }
        Modal.alert({ message: `Could not find device with DUID: ${duid}`, type: 'warning' });
        return null;
    }
}

DeviceView.VIEW_CLASS = DeviceView;
UserDevice.VIEW_CLASS = DeviceView;

export default DeviceView;
