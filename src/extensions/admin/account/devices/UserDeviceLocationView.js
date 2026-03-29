/**
 * UserDeviceLocationView - Clean, modern session location detail view
 *
 * Shows a device-location record with:
 * - Header: device icon, browser/device summary, location, IP, threat badges
 * - SideNavView: Location, Device, Network & Risk, Map (if coords), Events
 *
 * Opened when clicking a location row in admin UserView or DeviceView.
 */

import View from '@core/View.js';
import SideNavView from '@core/views/navigation/SideNavView.js';
import TableView from '@core/views/table/TableView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { UserDeviceLocation } from '@core/models/User.js';
import { IncidentEventList } from '@core/models/Incident.js';
import { LogList } from '@core/models/Log.js';
import Dialog from '@core/views/feedback/Dialog.js';

class UserDeviceLocationView extends View {
    constructor(options = {}) {
        super({
            className: 'udl-view',
            ...options
        });

        this.model = options.model || new UserDeviceLocation(options.data || {});

        // Extract nested data
        this._ud = this.model.get('user_device') || {};
        this._di = this._ud.device_info || {};
        this._geo = this.model.get('geolocation') || {};

        // Computed for template
        this.deviceIcon = this._getDeviceIcon();
        this.browserFull = this._getBrowser();
        this.osFull = this._getOS();
        this.deviceFull = this._getDevice();
        this.locationSummary = this._getLocationSummary();
        this.countryFlag = this._geo.country_code || '';
        this.threatLevel = this._geo.threat_level || 'unknown';
        this.threatColor = this._getThreatColor();
        this.hasCoordinates = !!(this._geo.latitude && this._geo.longitude);

        this.template = `
            <style>
                .udl-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
                .udl-identity { display: flex; align-items: center; gap: 1rem; }
                .udl-icon-wrap { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; }
                .udl-title { font-size: 1.15rem; font-weight: 600; margin: 0; line-height: 1.3; }
                .udl-subtitle { font-size: 0.8rem; color: #6c757d; margin-top: 0.15rem; }
                .udl-right { display: flex; align-items: flex-start; gap: 0.75rem; }
                .udl-threat-label { font-size: 0.7rem; color: #adb5bd; text-transform: uppercase; letter-spacing: 0.04em; }
                .udl-threat-value { font-size: 1rem; font-weight: 600; }
                .udl-threat-flags { display: flex; gap: 0.35rem; margin-top: 0.35rem; }
                .udl-flag { font-size: 0.65rem; padding: 0.15em 0.45em; border-radius: 3px; font-weight: 600; }
            </style>

            <div class="udl-header">
                <div class="udl-identity">
                    <div class="udl-icon-wrap bg-primary bg-opacity-10 text-primary">
                        <i class="bi {{deviceIcon}}"></i>
                    </div>
                    <div>
                        <h4 class="udl-title">{{locationSummary}}</h4>
                        <div class="udl-subtitle">
                            {{browserFull}} <span class="text-muted">on</span> {{deviceFull}}
                            <span class="text-muted mx-1">&middot;</span>
                            {{model.ip_address}}
                        </div>
                    </div>
                </div>
                <div class="udl-right">
                    <div class="text-end">
                        <div class="udl-threat-label">Threat Level</div>
                        <div class="udl-threat-value {{threatColor}}">{{threatLevel|capitalize}}</div>
                        <div class="udl-threat-flags">
                            {{#_geo.is_vpn}}<span class="udl-flag bg-warning text-dark">VPN</span>{{/_geo.is_vpn}}
                            {{#_geo.is_tor}}<span class="udl-flag bg-danger text-white">Tor</span>{{/_geo.is_tor}}
                            {{#_geo.is_proxy}}<span class="udl-flag bg-warning text-dark">Proxy</span>{{/_geo.is_proxy}}
                            {{#_geo.is_datacenter}}<span class="udl-flag bg-secondary text-white">DC</span>{{/_geo.is_datacenter}}
                            {{#_geo.is_cloud}}<span class="udl-flag bg-info text-white">Cloud</span>{{/_geo.is_cloud}}
                        </div>
                    </div>
                    <div data-container="udl-context-menu"></div>
                </div>
            </div>

            <div data-container="udl-sidenav" style="min-height: 300px;"></div>
        `;
    }

    // ── Computed helpers ─────────────────────────

    _getDeviceIcon() {
        const browser = this._di?.user_agent?.family?.toLowerCase() || '';
        const os = this._di?.os?.family?.toLowerCase() || '';
        const device = this._di?.device?.family?.toLowerCase() || '';
        if (browser.includes('chrome')) return 'bi-browser-chrome';
        if (browser.includes('firefox')) return 'bi-browser-firefox';
        if (browser.includes('safari')) return 'bi-browser-safari';
        if (browser.includes('edge')) return 'bi-browser-edge';
        if (os.includes('mac') || os.includes('ios')) return 'bi-apple';
        if (os.includes('windows')) return 'bi-windows';
        if (os.includes('android')) return 'bi-android2';
        if (device.includes('iphone')) return 'bi-phone';
        if (device.includes('ipad')) return 'bi-tablet';
        return 'bi-geo-alt';
    }

    _getBrowser() {
        const ua = this._di?.user_agent || {};
        return ua.family ? `${ua.family} ${ua.major || ''}`.trim() : 'Unknown Browser';
    }

    _getOS() {
        const os = this._di?.os || {};
        const ver = [os.major, os.minor].filter(Boolean).join('.');
        return os.family ? `${os.family} ${ver}`.trim() : 'Unknown OS';
    }

    _getDevice() {
        const dev = this._di?.device || {};
        const parts = [dev.brand, dev.family].filter(Boolean);
        return parts.length ? parts.join(' ') : 'Unknown Device';
    }

    _getLocationSummary() {
        const parts = [this._geo.city, this._geo.region, this._geo.country_name].filter(Boolean);
        return parts.length ? parts.join(', ') : 'Unknown Location';
    }

    _getThreatColor() {
        const level = (this._geo.threat_level || '').toLowerCase();
        if (level === 'high' || this._geo.is_threat) return 'text-danger';
        if (level === 'medium' || this._geo.is_suspicious) return 'text-warning';
        if (level === 'low') return 'text-success';
        return 'text-muted';
    }

    async onInit() {
        const geo = this._geo;
        const di = this._di;

        // ── Location section ────────────────────────
        const locationView = new View({
            model: this.model,
            template: `
                <style>
                    .udl-section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #adb5bd; margin-bottom: 0.5rem; margin-top: 1.5rem; }
                    .udl-section-label:first-child { margin-top: 0; }
                    .udl-field-row { display: flex; align-items: baseline; padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0; }
                    .udl-field-row:last-child { border-bottom: none; }
                    .udl-field-label { width: 130px; font-size: 0.78rem; color: #6c757d; flex-shrink: 0; }
                    .udl-field-value { flex: 1; font-size: 0.88rem; color: #212529; }
                </style>

                <div class="udl-section-label">Geography</div>
                <div class="udl-field-row">
                    <div class="udl-field-label">City</div>
                    <div class="udl-field-value">${geo.city || '—'}</div>
                </div>
                <div class="udl-field-row">
                    <div class="udl-field-label">Region</div>
                    <div class="udl-field-value">${geo.region || '—'}</div>
                </div>
                <div class="udl-field-row">
                    <div class="udl-field-label">Country</div>
                    <div class="udl-field-value">${geo.country_name || '—'} ${geo.country_code ? `<span class="text-muted">(${geo.country_code})</span>` : ''}</div>
                </div>
                <div class="udl-field-row">
                    <div class="udl-field-label">Postal Code</div>
                    <div class="udl-field-value">${geo.postal_code || '—'}</div>
                </div>
                <div class="udl-field-row">
                    <div class="udl-field-label">Timezone</div>
                    <div class="udl-field-value">${geo.timezone || '—'}</div>
                </div>
                ${geo.latitude ? `
                <div class="udl-field-row">
                    <div class="udl-field-label">Coordinates</div>
                    <div class="udl-field-value">${geo.latitude}, ${geo.longitude}</div>
                </div>` : ''}

                <div class="udl-section-label">Network</div>
                <div class="udl-field-row">
                    <div class="udl-field-label">IP Address</div>
                    <div class="udl-field-value" style="font-family: ui-monospace, monospace; font-size: 0.82rem;">{{model.ip_address}}</div>
                </div>
                <div class="udl-field-row">
                    <div class="udl-field-label">ISP</div>
                    <div class="udl-field-value">${geo.isp || '—'}</div>
                </div>
                <div class="udl-field-row">
                    <div class="udl-field-label">ASN</div>
                    <div class="udl-field-value">${geo.asn || '—'} ${geo.asn_org ? `<span class="text-muted small">(${geo.asn_org})</span>` : ''}</div>
                </div>

                <div class="udl-section-label">Timestamps</div>
                <div class="udl-field-row">
                    <div class="udl-field-label">First Seen</div>
                    <div class="udl-field-value">{{model.first_seen|epoch|datetime|default('—')}}</div>
                </div>
                <div class="udl-field-row">
                    <div class="udl-field-label">Last Seen</div>
                    <div class="udl-field-value">{{model.last_seen|epoch|datetime|default('—')}}</div>
                </div>
            `
        });

        // ── Device section ──────────────────────────
        const deviceView = new View({
            model: this.model,
            template: `
                <style>
                    .udl-section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #adb5bd; margin-bottom: 0.5rem; margin-top: 1.5rem; }
                    .udl-section-label:first-child { margin-top: 0; }
                    .udl-field-row { display: flex; align-items: baseline; padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0; }
                    .udl-field-row:last-child { border-bottom: none; }
                    .udl-field-label { width: 130px; font-size: 0.78rem; color: #6c757d; flex-shrink: 0; }
                    .udl-field-value { flex: 1; font-size: 0.88rem; color: #212529; }
                    .udl-ua-string { font-family: ui-monospace, monospace; font-size: 0.73rem; color: #6c757d; word-break: break-all; line-height: 1.5; padding: 0.5rem 0.75rem; background: #f8f9fa; border-radius: 6px; margin-top: 0.25rem; }
                </style>

                <div class="udl-section-label">Browser</div>
                <div class="udl-field-row">
                    <div class="udl-field-label">Name</div>
                    <div class="udl-field-value">${di?.user_agent?.family || '—'}</div>
                </div>
                <div class="udl-field-row">
                    <div class="udl-field-label">Version</div>
                    <div class="udl-field-value">${[di?.user_agent?.major, di?.user_agent?.minor, di?.user_agent?.patch].filter(Boolean).join('.') || '—'}</div>
                </div>

                <div class="udl-section-label">Operating System</div>
                <div class="udl-field-row">
                    <div class="udl-field-label">Name</div>
                    <div class="udl-field-value">${di?.os?.family || '—'}</div>
                </div>
                <div class="udl-field-row">
                    <div class="udl-field-label">Version</div>
                    <div class="udl-field-value">${[di?.os?.major, di?.os?.minor, di?.os?.patch].filter(Boolean).join('.') || '—'}</div>
                </div>

                <div class="udl-section-label">Hardware</div>
                <div class="udl-field-row">
                    <div class="udl-field-label">Brand</div>
                    <div class="udl-field-value">${di?.device?.brand || '—'}</div>
                </div>
                <div class="udl-field-row">
                    <div class="udl-field-label">Family</div>
                    <div class="udl-field-value">${di?.device?.family || '—'}</div>
                </div>
                <div class="udl-field-row">
                    <div class="udl-field-label">Model</div>
                    <div class="udl-field-value">${di?.device?.model || '—'}</div>
                </div>

                ${di?.string ? `
                <div class="udl-section-label">User Agent String</div>
                <div class="udl-ua-string">${di.string}</div>` : ''}
            `
        });

        // ── Risk & Reputation section ───────────────
        const riskView = new View({
            model: this.model,
            template: `
                <style>
                    .udl-section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #adb5bd; margin-bottom: 0.5rem; margin-top: 1.5rem; }
                    .udl-section-label:first-child { margin-top: 0; }
                    .udl-field-row { display: flex; align-items: baseline; padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0; }
                    .udl-field-row:last-child { border-bottom: none; }
                    .udl-field-label { width: 130px; font-size: 0.78rem; color: #6c757d; flex-shrink: 0; }
                    .udl-field-value { flex: 1; font-size: 0.88rem; color: #212529; }
                    .udl-risk-icon { font-size: 0.85rem; margin-right: 0.35rem; }
                    .udl-risk-yes { color: #dc3545; }
                    .udl-risk-no { color: #adb5bd; }
                </style>

                <div class="udl-section-label">Threat Assessment</div>
                <div class="udl-field-row">
                    <div class="udl-field-label">Threat Level</div>
                    <div class="udl-field-value ${this.threatColor}" style="font-weight: 600;">${(geo.threat_level || 'Unknown')}</div>
                </div>
                <div class="udl-field-row">
                    <div class="udl-field-label">Risk Score</div>
                    <div class="udl-field-value">${geo.risk_score != null ? geo.risk_score : '—'}</div>
                </div>

                <div class="udl-section-label">Detection Flags</div>
                ${this._riskRow('VPN', 'bi-shield', geo.is_vpn)}
                ${this._riskRow('Tor Exit Node', 'bi-shield-lock', geo.is_tor)}
                ${this._riskRow('Proxy', 'bi-diagram-3', geo.is_proxy)}
                ${this._riskRow('Cloud Provider', 'bi-cloud', geo.is_cloud)}
                ${this._riskRow('Datacenter', 'bi-hdd-stack', geo.is_datacenter)}
                ${this._riskRow('Mobile', 'bi-phone', geo.is_mobile)}

                <div class="udl-section-label">Reputation</div>
                ${this._riskRow('Known Attacker', 'bi-exclamation-triangle', geo.is_known_attacker)}
                ${this._riskRow('Known Abuser', 'bi-flag', geo.is_known_abuser)}
                ${this._riskRow('Threat', 'bi-shield-exclamation', geo.is_threat)}
                ${this._riskRow('Suspicious', 'bi-question-circle', geo.is_suspicious)}
            `
        });

        // ── Build sections array ────────────────────
        const sections = [
            { key: 'location', label: 'Location', icon: 'bi-geo-alt', view: locationView },
            { key: 'device', label: 'Device', icon: 'bi-laptop', view: deviceView },
            { key: 'risk', label: 'Risk', icon: 'bi-shield-exclamation', view: riskView }
        ];

        // Map (if coordinates)
        if (this.hasCoordinates) {
            try {
                const MapView = (await import('@ext/map/MapView.js')).default;
                const mapView = new MapView({
                    markers: [{
                        lat: this._geo.latitude,
                        lng: this._geo.longitude,
                        popup: `<strong>${this.model.get('ip_address')}</strong><br>${this.locationSummary}`
                    }],
                    tileLayer: 'light',
                    zoom: 6,
                    height: 400
                });
                sections.push({ key: 'map', label: 'Map', icon: 'bi-map', view: mapView });
            } catch (e) {
                // MapView extension not available — skip
            }
        }

        // Events (by IP)
        const ip = this.model.get('ip_address');
        if (ip) {
            const eventsView = new TableView({
                collection: new IncidentEventList({
                    params: { size: 10, source_ip: ip }
                }),
                hideActivePillNames: ['source_ip'],
                columns: [
                    { key: 'created', label: 'Date', formatter: 'datetime', sortable: true, width: '150px' },
                    { key: 'category|badge', label: 'Category' },
                    { key: 'title', label: 'Title' }
                ]
            });
            sections.push({ type: 'divider', label: 'Activity' });
            sections.push({ key: 'events', label: 'Events', icon: 'bi-calendar-event', view: eventsView });

            const logsView = new TableView({
                collection: new LogList({
                    params: { size: 10, ip }
                }),
                permissions: 'view_logs',
                hideActivePillNames: ['ip'],
                columns: [
                    { key: 'created', label: 'Timestamp', sortable: true, formatter: 'epoch|datetime' },
                    { key: 'level', label: 'Level', sortable: true },
                    { key: 'kind', label: 'Kind' },
                    { name: 'log', label: 'Log' }
                ]
            });
            sections.push({ key: 'logs', label: 'Logs', icon: 'bi-journal-text', view: logsView, permissions: 'view_logs' });
        }

        // ── SideNavView ─────────────────────────────
        this.sideNavView = new SideNavView({
            containerId: 'udl-sidenav',
            activeSection: this.hasCoordinates ? 'map' : 'location',
            navWidth: 160,
            contentPadding: '1rem 1.5rem',
            enableResponsive: true,
            minWidth: 450,
            sections
        });
        this.addChild(this.sideNavView);

        // ── Context Menu ────────────────────────────
        const menu = new ContextMenu({
            containerId: 'udl-context-menu',
            className: 'context-menu-view header-menu-absolute',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    ...(this._ud?.user ? [{ label: 'View User', action: 'view-user', icon: 'bi-person' }] : []),
                    ...(this._ud?.id ? [{ label: 'View Device', action: 'view-device', icon: 'bi-laptop' }] : []),
                    ...(this.hasCoordinates ? [{
                        label: 'Open in Maps',
                        action: 'open-in-maps',
                        icon: 'bi-box-arrow-up-right'
                    }] : []),
                    { type: 'divider' },
                    { label: 'Delete Record', action: 'delete-record', icon: 'bi-trash', danger: true }
                ]
            }
        });
        this.addChild(menu);
    }

    // ── Helpers ──────────────────────────────────

    _riskRow(label, icon, value) {
        const cls = value ? 'udl-risk-yes' : 'udl-risk-no';
        const indicator = value
            ? '<i class="bi bi-check-circle-fill udl-risk-icon udl-risk-yes"></i>Yes'
            : '<i class="bi bi-dash-circle udl-risk-icon udl-risk-no"></i>No';
        return `
            <div class="udl-field-row">
                <div class="udl-field-label"><i class="bi ${icon} me-1 ${cls}"></i>${label}</div>
                <div class="udl-field-value">${indicator}</div>
            </div>`;
    }

    // ── Actions ──────────────────────────────────

    async onActionViewUser() {
        const userId = this._ud?.user?.id || this._ud?.user;
        if (userId) this.emit('view-user', { userId });
    }

    async onActionViewDevice() {
        const deviceId = this._ud?.id;
        if (deviceId) this.emit('view-device', { deviceId });
    }

    async onActionOpenInMaps() {
        if (this.hasCoordinates) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${this._geo.latitude},${this._geo.longitude}`, '_blank');
        }
    }

    async onActionDeleteRecord() {
        const confirmed = await Dialog.confirm(
            'Are you sure you want to delete this location record?',
            'Delete Location Record'
        );
        if (!confirmed) return true;

        const resp = await this.model.destroy();
        if (resp.success) {
            this.emit('location:deleted', { model: this.model });
        }
        return true;
    }

    static async show(id) {
        const model = new UserDeviceLocation({ id });
        await model.fetch();
        if (model.id) {
            return Dialog.showDialog({
                title: false,
                size: 'lg',
                body: new UserDeviceLocationView({ model }),
                buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
            });
        }
        Dialog.alert({ message: `Could not find location record: ${id}`, type: 'warning' });
        return null;
    }
}

UserDeviceLocation.VIEW_CLASS = UserDeviceLocationView;
export default UserDeviceLocationView;
