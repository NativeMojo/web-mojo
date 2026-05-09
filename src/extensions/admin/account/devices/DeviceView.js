/**
 * DeviceView - User device inspector built on the DetailView primitive.
 *
 * Header + side-nav layout matching JobDetailsView / GeoIPView (the
 * Wave 2/3 canonical examples). Sections (5):
 *   Overview · Hardware · ──Activity── Locations · Sessions ·
 *   ──Detail── Metadata
 *
 * Overview leads with four `MetricCard` KPIs (Sessions / Locations /
 * Days active / Last login), then a `Timeline` of threat-signal events
 * (trust / VPN / Tor / proxy / geo / DUID) so the operator's first
 * question — "is this device safe?" — has a single answer block.
 * Hardware uses `.detail-section-eyebrow` + `.detail-flat-row` (no
 * `.detail-field-card` wrappers); Locations is a `TableView` on
 * `UserDeviceLocationList`; Sessions is a placeholder (no collection
 * lands until the backend records sessions); Metadata uses
 * `KnownFieldsCard` from `@core`.
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
import MetricCard from '@core/views/data/MetricCard.js';
import Timeline from '@core/views/data/Timeline.js';
import KnownFieldsCard from '@core/views/data/KnownFieldsCard.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import { User, UserDevice, UserDeviceLocationList } from '@core/models/User.js';

const escapeHtml = MOJOUtils.escapeHtml;


// ── Module-local helpers ───────────────────────────────────
//
// Used outside Mustache pipe paths — auxFn / Timeline `detail` slot /
// header `titleFn`. Inside templates, prefer DataFormatter pipes
// (`|datetime`, `|relative`, `|truncate_middle(12)`).

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

/** Read the geo-side flags from any of the locations the model exposes them on. */
function _geoFor(model) {
    const di = model.get('device_info') || {};
    return di.last_geo || di.geolocation || model.get('last_geo') || {};
}

/** Detect any threat signals on the device or its last-known geo */
function collectThreatFlags(model) {
    const geo = _geoFor(model);
    const flags = [];
    if (geo.is_vpn)    flags.push({ key: 'vpn',   label: 'VPN'   });
    if (geo.is_tor)    flags.push({ key: 'tor',   label: 'Tor'   });
    if (geo.is_proxy)  flags.push({ key: 'proxy', label: 'Proxy' });
    if (geo.is_cloud)  flags.push({ key: 'cloud', label: 'Cloud' });
    return flags;
}

function hasFlag(model, key) {
    return collectThreatFlags(model).some(f => f.key === key);
}

/** Approximate days-active from first_seen → last_seen. */
function daysActive(model) {
    const firstMs = epochToMs(model.get('first_seen'));
    const lastMs  = epochToMs(model.get('last_seen'));
    if (firstMs == null || lastMs == null) return null;
    return Math.max(0, Math.floor((lastMs - firstMs) / 86400000));
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
//
// Mustache template binds to `this` (the section view). KPIs are
// `MetricCard` children mounted in `onInit()`; the threat-signal feed
// is a `Timeline` instance driven by the model.

class DeviceOverviewSection extends View {
    constructor(options = {}) {
        const { locationsCollection, ...viewOptions } = options;
        super({
            className: 'device-overview-section',
            template: `
                <div class="detail-section-eyebrow">Overview</div>
                <div class="detail-kpi-grid">
                    <div data-container="dv-kpi-sessions"></div>
                    <div data-container="dv-kpi-locations"></div>
                    <div data-container="dv-kpi-days"></div>
                    <div data-container="dv-kpi-last-login"></div>
                </div>

                <div class="detail-section-eyebrow">Threat signals</div>
                <div data-container="dv-overview-threats"></div>
            `,
            ...viewOptions
        });
        this.locationsCollection = locationsCollection || null;
    }

    async onInit() {
        const m = this.model;

        this.kpiSessions = new MetricCard({
            containerId: 'dv-kpi-sessions',
            label: 'Sessions',
            value: () => {
                const n = m.get('session_count') ?? m.get('sessions');
                return n == null ? '—' : String(n);
            }
        });
        this.kpiLocations = new MetricCard({
            containerId: 'dv-kpi-locations',
            label: 'Locations',
            value: () => {
                const n = this._readLocationsCount();
                return n == null ? '—' : String(n);
            }
        });
        this.kpiDays = new MetricCard({
            containerId: 'dv-kpi-days',
            label: 'Days active',
            value: () => {
                const d = daysActive(m);
                return d == null ? '—' : String(d);
            }
        });
        this.kpiLastLogin = new MetricCard({
            containerId: 'dv-kpi-last-login',
            label: 'Last login',
            value: () => m.get('last_seen') ? formatRelative(m.get('last_seen')) : 'Never',
            tone: m.get('last_seen') ? 'success' : 'default'
        });
        [this.kpiSessions, this.kpiLocations, this.kpiDays, this.kpiLastLogin]
            .forEach(c => this.addChild(c));

        // Threat-signal feed — a vertical timeline that captures the
        // audit-list shape (icon + source + line + relative-time gutter)
        // using the `@core` Timeline primitive.
        this.threatTimeline = new Timeline({
            containerId: 'dv-overview-threats',
            model: m,
            emptyText: 'No threat signals recorded.',
            items: mm => this._threatItems(mm)
        });
        this.addChild(this.threatTimeline);

        // React to locations collection — keep the KPI live
        if (this.locationsCollection) {
            this.locationsCollection.on('fetch:success', () => {
                if (this.kpiLocations?.isMounted?.()) {
                    this.kpiLocations.render();
                }
            }, this);
        }
    }

    _readLocationsCount() {
        if (!this.locationsCollection) return null;
        return this.locationsCollection.totalCount
            ?? this.locationsCollection.models?.length
            ?? null;
    }

    /**
     * Build the threat-signal Timeline items. `detail` is trusted HTML —
     * model-controlled fields are escaped with MOJOUtils.escapeHtml.
     */
    _threatItems(model) {
        const m = model || this.model;
        const geo = _geoFor(m);
        const isTrusted = !!m.get('is_trusted');
        const lastSeenRel = m.get('last_seen') ? formatRelative(m.get('last_seen')) : 'unknown';

        const items = [];

        // TRUST
        items.push({
            tone: isTrusted ? 'success' : 'default',
            headline: isTrusted ? 'Marked trusted' : 'Not marked trusted',
            detail: isTrusted
                ? 'Operator has flagged this device as safe.'
                : 'No trust override set.',
            when: lastSeenRel
        });

        // VPN
        const vpnHit = hasFlag(m, 'vpn');
        items.push({
            tone: vpnHit ? 'warning' : 'success',
            headline: vpnHit ? 'VPN detected' : 'No VPN signal',
            detail: vpnHit ? 'Last session originated from a VPN exit.' : '',
            when: 'live'
        });

        // TOR
        const torHit = hasFlag(m, 'tor');
        items.push({
            tone: torHit ? 'danger' : 'success',
            headline: torHit ? 'Seen from a Tor exit' : 'No Tor signal',
            detail: torHit ? 'Recent activity routed through the Tor network.' : '',
            when: 'live'
        });

        // PROXY (only render row when fired — keep the timeline tight when it isn't)
        if (hasFlag(m, 'proxy')) {
            items.push({
                tone: 'warning',
                headline: 'Open proxy detected',
                detail: 'Last session went through an open proxy.',
                when: 'live'
            });
        }

        // GEO — locations seen
        const locCount = m.get('location_count') ?? null;
        const geoText = locCount != null
            ? `${locCount} distinct location${locCount === 1 ? '' : 's'}`
            : (geo.country_name ? `Last from ${escapeHtml(geo.country_name)}` : 'Location unknown');
        items.push({
            tone: 'info',
            headline: 'Geo footprint',
            detail: geoText,
            when: 'live'
        });

        // DUID
        const duid = m.get('duid');
        if (duid) {
            items.push({
                tone: 'default',
                headline: 'Device fingerprint',
                detail: `<code>${escapeHtml(String(duid))}</code>`,
                when: m.get('first_seen') ? formatRelative(m.get('first_seen')) : ''
            });
        }

        return items;
    }
}


// ── Hardware section (full device_info dump as flat rows) ──
//
// Three labeled sub-sections (Browser / Operating system / Hardware /
// Display & environment / Identification) of `.detail-flat-row`s plus
// an optional User-agent string block. No `.detail-field-card`
// wrappers per Wave 3 design language.

class DeviceHardwareSection extends View {
    constructor(options = {}) {
        super({
            className: 'device-hardware-section',
            template: `
                <div class="detail-section-eyebrow">Browser</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Family</div>
                    <div class="detail-flat-row-value">{{model.device_info.user_agent.family|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Version</div>
                    <div class="detail-flat-row-value">
                        {{#hasBrowserVersion|bool}}{{browserVersion}}{{/hasBrowserVersion|bool}}
                        {{^hasBrowserVersion|bool}}<span class="text-secondary fst-italic">—</span>{{/hasBrowserVersion|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Engine</div>
                    <div class="detail-flat-row-value">{{model.device_info.user_agent.engine|default:'—'}}</div>
                </div>

                <div class="detail-section-eyebrow">Operating system</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Family</div>
                    <div class="detail-flat-row-value">{{model.device_info.os.family|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Version</div>
                    <div class="detail-flat-row-value">
                        {{#hasOsVersion|bool}}{{osVersion}}{{/hasOsVersion|bool}}
                        {{^hasOsVersion|bool}}<span class="text-secondary fst-italic">—</span>{{/hasOsVersion|bool}}
                    </div>
                </div>

                <div class="detail-section-eyebrow">Hardware</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Brand</div>
                    <div class="detail-flat-row-value">{{model.device_info.device.brand|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Family</div>
                    <div class="detail-flat-row-value">{{model.device_info.device.family|default:'—'}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Model</div>
                    <div class="detail-flat-row-value">{{model.device_info.device.model|default:'—'}}</div>
                </div>

                <div class="detail-section-eyebrow">Display &amp; environment</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Resolution</div>
                    <div class="detail-flat-row-value">
                        {{#hasResolution|bool}}{{resolutionDisplay}}{{/hasResolution|bool}}
                        {{^hasResolution|bool}}<span class="text-secondary fst-italic">—</span>{{/hasResolution|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Pixel ratio</div>
                    <div class="detail-flat-row-value">
                        {{#hasPixelRatio|bool}}{{pixelRatioDisplay}}{{/hasPixelRatio|bool}}
                        {{^hasPixelRatio|bool}}<span class="text-secondary fst-italic">—</span>{{/hasPixelRatio|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Color depth</div>
                    <div class="detail-flat-row-value">
                        {{#hasColorDepth|bool}}{{colorDepthDisplay}}{{/hasColorDepth|bool}}
                        {{^hasColorDepth|bool}}<span class="text-secondary fst-italic">—</span>{{/hasColorDepth|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Locale</div>
                    <div class="detail-flat-row-value">
                        {{#model.device_info.locale}}<code>{{model.device_info.locale}}</code>{{/model.device_info.locale}}
                        {{^model.device_info.locale}}<span class="text-secondary fst-italic">—</span>{{/model.device_info.locale}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Timezone</div>
                    <div class="detail-flat-row-value">
                        {{#model.device_info.timezone}}<code>{{model.device_info.timezone}}</code>{{/model.device_info.timezone}}
                        {{^model.device_info.timezone}}<span class="text-secondary fst-italic">—</span>{{/model.device_info.timezone}}
                    </div>
                </div>

                <div class="detail-section-eyebrow">Identification</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Device ID</div>
                    <div class="detail-flat-row-value">
                        {{#model.duid}}<code>{{model.duid}}</code>{{/model.duid}}
                        {{^model.duid}}<span class="text-secondary fst-italic">—</span>{{/model.duid}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Last IP</div>
                    <div class="detail-flat-row-value">
                        {{#model.last_ip}}<code>{{model.last_ip}}</code>{{/model.last_ip}}
                        {{^model.last_ip}}<span class="text-secondary fst-italic">—</span>{{/model.last_ip}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">First seen</div>
                    <div class="detail-flat-row-value">
                        {{#model.first_seen}}<code>{{model.first_seen|datetime}}</code>{{/model.first_seen}}
                        {{^model.first_seen}}<span class="text-secondary fst-italic">—</span>{{/model.first_seen}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Last seen</div>
                    <div class="detail-flat-row-value">
                        {{#model.last_seen}}<code>{{model.last_seen|datetime}}</code>{{/model.last_seen}}
                        {{^model.last_seen}}<span class="text-secondary fst-italic">—</span>{{/model.last_seen}}
                    </div>
                </div>

                {{#hasUaString|bool}}
                <div class="detail-section-eyebrow">User agent</div>
                <pre class="detail-error-block">{{model.device_info.string}}</pre>
                {{/hasUaString|bool}}
            `,
            ...options
        });
    }

    // ── Computed properties for the template ────────────

    get hasBrowserVersion() {
        const ua = this.model?.get('device_info')?.user_agent || {};
        return [ua.major, ua.minor, ua.patch].some(v => v != null && v !== '');
    }

    get browserVersion() {
        const ua = this.model?.get('device_info')?.user_agent || {};
        return [ua.major, ua.minor, ua.patch].filter(v => v != null && v !== '').join('.');
    }

    get hasOsVersion() {
        const os = this.model?.get('device_info')?.os || {};
        return [os.major, os.minor, os.patch].some(v => v != null && v !== '');
    }

    get osVersion() {
        const os = this.model?.get('device_info')?.os || {};
        return [os.major, os.minor, os.patch].filter(v => v != null && v !== '').join('.');
    }

    get hasResolution() {
        const screen = this.model?.get('device_info')?.screen || {};
        return !!(screen.width && screen.height);
    }

    get resolutionDisplay() {
        const screen = this.model?.get('device_info')?.screen || {};
        return `${screen.width} × ${screen.height}`;
    }

    get hasPixelRatio() {
        const screen = this.model?.get('device_info')?.screen || {};
        return screen.pixel_ratio != null;
    }

    get pixelRatioDisplay() {
        const screen = this.model?.get('device_info')?.screen || {};
        return `${screen.pixel_ratio}×`;
    }

    get hasColorDepth() {
        const screen = this.model?.get('device_info')?.screen || {};
        return screen.color_depth != null;
    }

    get colorDepthDisplay() {
        const screen = this.model?.get('device_info')?.screen || {};
        return `${screen.color_depth}-bit`;
    }

    get hasUaString() {
        return !!this.model?.get('device_info')?.string;
    }
}


// ── Sessions section ────────────────────────────────────────
//
// There is no `UserDeviceSession` collection in the framework today,
// so this section renders an empty-state via the standard flat-row
// layout. Once a session model + endpoint land, swap this out for a
// `TableView` the same way Locations does.

class DeviceSessionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'device-sessions-section',
            template: `
                <div class="detail-section-eyebrow">Sessions</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Status</div>
                    <div class="detail-flat-row-value text-secondary fst-italic">
                        Session history is not yet recorded server-side. Once a
                        UserDeviceSession collection lands, this section will
                        list every login / token-grant for this device.
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Sessions seen</div>
                    <div class="detail-flat-row-value">
                        {{#hasSessionCount|bool}}<strong>{{sessionCount}}</strong>{{/hasSessionCount|bool}}
                        {{^hasSessionCount|bool}}<span class="text-secondary fst-italic">—</span>{{/hasSessionCount|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Last login</div>
                    <div class="detail-flat-row-value">
                        {{#model.last_seen}}<code>{{model.last_seen|datetime}}</code> <span class="text-secondary">· {{model.last_seen|relative}}</span>{{/model.last_seen}}
                        {{^model.last_seen}}<span class="text-secondary fst-italic">Never</span>{{/model.last_seen}}
                    </div>
                </div>
            `,
            ...options
        });
    }

    get hasSessionCount() {
        const n = this.model?.get('session_count') ?? this.model?.get('sessions');
        return n != null;
    }

    get sessionCount() {
        const n = this.model?.get('session_count') ?? this.model?.get('sessions');
        return n == null ? '' : String(n);
    }
}


// ── Metadata section ───────────────────────────────────────
//
// Promotes a few known device-record fields and keeps the raw blob
// available via `<details>`. Uses the `KnownFieldsCard` primitive.

class DeviceMetadataSection extends View {
    constructor(options = {}) {
        super({
            className: 'device-metadata-section',
            template: `
                <div class="detail-section-eyebrow">Metadata</div>
                <div data-container="dv-metadata-card"></div>
            `,
            ...options
        });
    }

    async onInit() {
        this.knownFields = new KnownFieldsCard({
            containerId: 'dv-metadata-card',
            model: this.model,
            // Combined view: any explicit `metadata` blob plus a small set
            // of audit-style fields off the record itself. KnownFieldsCard
            // does dotted-path lookups so we can promote nested keys.
            data: m => {
                const meta = m.get('metadata') || {};
                return {
                    ...meta,
                    _record_id: m.get('id'),
                    _user: m.get('user'),
                    _duid: m.get('duid'),
                    _first_seen: m.get('first_seen'),
                    _last_seen: m.get('last_seen'),
                    _is_trusted: m.get('is_trusted')
                };
            },
            knownKeys: [
                { key: '_record_id', label: 'Record ID',
                  formatter: (v) => v != null
                      ? `<code>${escapeHtml(String(v))}</code>`
                      : '<span class="text-secondary fst-italic">—</span>' },
                { key: '_duid', label: 'DUID',
                  formatter: (v) => v
                      ? `<code>${escapeHtml(String(v))}</code>`
                      : '<span class="text-secondary fst-italic">—</span>' },
                { key: '_user.display_name', label: 'Owner', hideEmpty: true },
                { key: '_first_seen', label: 'First seen', formatter: 'datetime' },
                { key: '_last_seen',  label: 'Last seen',  formatter: 'datetime' },
                { key: '_is_trusted', label: 'Trusted', formatter: 'yesnoicon' }
            ],
            rawLabel: 'Raw metadata',
            rawCollapsed: true,
            emptyText: 'No metadata recorded for this device.'
        });
        this.addChild(this.knownFields);
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

        // Section list (5 sections + 2 dividers)
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
            { text: m => {
                const n = m.get('session_count') ?? m.get('sessions');
                return (n != null) ? `${n} ${n === 1 ? 'session' : 'sessions'}` : null;
              }, variant: 'light' },
            { text: m => {
                const n = m.get('location_count');
                return (n != null) ? `${n} ${n === 1 ? 'location' : 'locations'}` : null;
              }, variant: 'light' },
            // State chips — only render when truthy (per spec)
            { icon: 'bi-shield-check',       text: 'Trusted', variant: 'success',
              when: m => !!m.get('is_trusted') },
            { icon: 'bi-slash-circle',       text: 'Blocked', variant: 'danger',
              when: m => !!m.get('is_blocked') },
            // Threat-flag chips — only render when present
            { icon: 'bi-shield-exclamation', text: 'VPN',   variant: 'warning',
              when: m => hasFlag(m, 'vpn') },
            { icon: 'bi-shield-x',           text: 'Tor',   variant: 'danger',
              when: m => hasFlag(m, 'tor') },
            { icon: 'bi-shield-exclamation', text: 'Proxy', variant: 'warning',
              when: m => hasFlag(m, 'proxy') },
            { icon: 'bi-cloud',              text: 'Cloud', variant: 'info',
              when: m => hasFlag(m, 'cloud') }
        ];

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
                    if (hasFlag(m, 'tor') || hasFlag(m, 'proxy')) return 'danger';
                    if (hasFlag(m, 'vpn') || hasFlag(m, 'cloud')) return 'warning';
                    if (m.get('is_blocked')) return 'danger';
                    if (m.get('is_trusted')) return 'success';
                    return 'info';
                },
                titleFn,
                subtitleFn: m => _buildSubtitle(m),
                chips,
                // Right-gutter aux block — presence dot + "Last seen 4m ago"
                // line, replacing the prior `_subtitle` synthetic-field
                // round-trip. Trusted HTML; model fields escaped.
                auxFn: m => _buildHeaderAux(m),
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
            // Refresh the Overview's threat-signals timeline
            if (this.overviewSection?.threatTimeline?.isMounted()) {
                await this.overviewSection.threatTimeline.render();
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


// ── Header subtitle / aux helpers ──────────────────────────

function _buildSubtitle(m) {
    const lastSeen = m.get('last_seen');
    const ip = m.get('last_ip');
    const geo = _geoFor(m);
    const user = m.get('user');

    const parts = [];
    parts.push(lastSeen ? `Last seen ${formatRelative(lastSeen)}` : 'Never seen');
    if (ip) parts.push(`from ${ip}`);
    const place = [geo.city, geo.country_name].filter(Boolean).join(', ');
    if (place) parts.push(`· ${place}`);
    if (user?.display_name) parts.push(`· owner ${user.display_name}`);
    return parts.join(' ');
}

/**
 * Trusted-HTML right-gutter aux block. Caller is in source code; every
 * model field is escaped via MOJOUtils.escapeHtml before composition.
 */
function _buildHeaderAux(m) {
    const lastSeen = m.get('last_seen');
    const isOnline = (() => {
        const ms = epochToMs(lastSeen);
        if (ms == null) return false;
        return (Date.now() - ms) < 5 * 60 * 1000;
    })();

    let dotCls = '';
    let main = '';
    if (m.get('is_blocked')) {
        dotCls = ' dh-aux-dot-danger';
        main = 'Blocked';
    } else if (isOnline) {
        dotCls = ' dh-aux-dot-success';
        main = 'Online';
    } else if (lastSeen) {
        dotCls = ' dh-aux-dot-secondary';
        main = 'Offline';
    } else {
        dotCls = ' dh-aux-dot-secondary';
        main = 'Never seen';
    }

    const sub = lastSeen ? `Last seen ${escapeHtml(formatRelative(lastSeen))}` : '';

    return `
        <span class="dh-aux-dot${dotCls}"></span>
        <span class="dh-aux-meta"><span>${escapeHtml(main)}</span>${sub ? `<span class="text-secondary small">${sub}</span>` : ''}</span>
    `;
}

DeviceView.VIEW_CLASS = DeviceView;
UserDevice.VIEW_CLASS = DeviceView;

export default DeviceView;
export {
    DeviceView,
    DeviceOverviewSection,
    DeviceHardwareSection,
    DeviceSessionsSection,
    DeviceMetadataSection
};
