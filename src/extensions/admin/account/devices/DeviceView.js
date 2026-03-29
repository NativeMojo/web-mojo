/**
 * DeviceView - Clean, modern user device detail view
 *
 * SideNavView layout with:
 * - Details: browser, OS, device, user agent in clean field rows
 * - Locations: multiline table of all locations this device connected from
 * - Header: smart browser/OS icon, device summary, last seen, context menu
 */

import View from '@core/View.js';
import SideNavView from '@core/views/navigation/SideNavView.js';
import TableView from '@core/views/table/TableView.js';
import TableRow from '@core/views/table/TableRow.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { UserDevice, UserDeviceLocationList } from '@core/models/User.js';
import Dialog from '@core/views/feedback/Dialog.js';

// ── Location row for multiline table ──

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
        if (geo.is_vpn) flags.push('<span class="badge bg-warning text-dark" style="font-size:0.6rem;">VPN</span>');
        if (geo.is_tor) flags.push('<span class="badge bg-danger" style="font-size:0.6rem;">Tor</span>');
        if (geo.is_proxy) flags.push('<span class="badge bg-warning text-dark" style="font-size:0.6rem;">Proxy</span>');
        return flags.join(' ');
    }
    get hasThreatFlags() {
        const geo = this.model?.get('geolocation') || {};
        return !!(geo.is_vpn || geo.is_tor || geo.is_proxy);
    }
}

class DeviceView extends View {
    constructor(options = {}) {
        super({
            className: 'device-view',
            ...options
        });

        this.model = options.model || new UserDevice(options.data || {});
        this.deviceInfo = this.model.get('device_info') || {};
        this.deviceIcon = this._getIcon(this.deviceInfo);

        // Computed properties for template
        this.browserFull = this._getBrowser();
        this.osFull = this._getOS();
        this.deviceFull = this._getDevice();
        this.isMobile = this._isMobile();

        this.template = `
            <style>
                .dv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
                .dv-identity { display: flex; align-items: center; gap: 1rem; }
                .dv-icon-wrap { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; }
                .dv-title { font-size: 1.15rem; font-weight: 600; margin: 0; line-height: 1.3; }
                .dv-subtitle { font-size: 0.8rem; color: #6c757d; margin-top: 0.15rem; }
                .dv-status { text-align: right; display: flex; align-items: flex-start; gap: 0.75rem; }
                .dv-last-seen-label { font-size: 0.7rem; color: #adb5bd; text-transform: uppercase; letter-spacing: 0.04em; }
                .dv-last-seen-value { font-size: 0.88rem; font-weight: 500; }
                .dv-last-seen-ip { font-size: 0.75rem; color: #6c757d; margin-top: 0.1rem; }
            </style>

            <div class="dv-header">
                <div class="dv-identity">
                    <div class="dv-icon-wrap bg-primary bg-opacity-10 text-primary">
                        <i class="bi {{deviceIcon}}"></i>
                    </div>
                    <div>
                        <h4 class="dv-title">{{browserFull}} <span class="fw-normal text-muted">on</span> {{osFull}}</h4>
                        <div class="dv-subtitle">
                            {{deviceFull}}
                            {{#model.user.display_name}}
                                <span class="text-muted mx-1">&middot;</span>
                                <a href="#" data-action="view-user" class="text-decoration-none">{{model.user.display_name}}</a>
                            {{/model.user.display_name}}
                        </div>
                    </div>
                </div>
                <div class="dv-status">
                    <div>
                        <div class="dv-last-seen-label">Last Seen</div>
                        <div class="dv-last-seen-value">{{model.last_seen|relative}}</div>
                        {{#model.last_ip}}<div class="dv-last-seen-ip">{{model.last_ip}}</div>{{/model.last_ip}}
                    </div>
                    <div data-container="device-context-menu"></div>
                </div>
            </div>

            <div data-container="device-sidenav" style="min-height: 300px;"></div>
        `;
    }

    // ── Computed getters ──────────────────────────

    _getBrowser() {
        const ua = this.deviceInfo?.user_agent || {};
        const parts = [ua.family, ua.major].filter(Boolean);
        return parts.length ? parts.join(' ') : 'Unknown Browser';
    }

    _getOS() {
        const os = this.deviceInfo?.os || {};
        const ver = [os.major, os.minor].filter(Boolean).join('.');
        return os.family ? `${os.family} ${ver}`.trim() : 'Unknown OS';
    }

    _getDevice() {
        const dev = this.deviceInfo?.device || {};
        const parts = [dev.brand, dev.family].filter(Boolean);
        const name = parts.length ? parts.join(' ') : 'Unknown Device';
        return dev.model ? `${name} (${dev.model})` : name;
    }

    _isMobile() {
        const dev = this.deviceInfo?.device || {};
        const os = this.deviceInfo?.os || {};
        return ['iPhone', 'Android', 'iPad'].some(m =>
            (dev.family || '').includes(m) || (os.family || '').includes(m)
        );
    }

    _getIcon(deviceInfo) {
        const os = deviceInfo?.os?.family?.toLowerCase() || '';
        const browser = deviceInfo?.user_agent?.family?.toLowerCase() || '';
        const device = deviceInfo?.device?.family?.toLowerCase() || '';

        if (browser.includes('chrome')) return 'bi-browser-chrome';
        if (browser.includes('firefox')) return 'bi-browser-firefox';
        if (browser.includes('safari')) return 'bi-browser-safari';
        if (browser.includes('edge')) return 'bi-browser-edge';
        if (os.includes('mac') || os.includes('ios')) return 'bi-apple';
        if (os.includes('windows')) return 'bi-windows';
        if (os.includes('android')) return 'bi-android2';
        if (os.includes('linux')) return 'bi-ubuntu';
        if (device.includes('iphone')) return 'bi-phone';
        if (device.includes('ipad')) return 'bi-tablet';
        return 'bi-laptop';
    }

    async onInit() {
        // ── Details section ─────────────────────────
        const detailsView = new View({
            model: this.model,
            template: `
                <style>
                    .dv-section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #adb5bd; margin-bottom: 0.5rem; margin-top: 1.5rem; }
                    .dv-section-label:first-child { margin-top: 0; }
                    .dv-field-row { display: flex; align-items: baseline; padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0; }
                    .dv-field-row:last-child { border-bottom: none; }
                    .dv-field-label { width: 130px; font-size: 0.78rem; color: #6c757d; flex-shrink: 0; }
                    .dv-field-value { flex: 1; font-size: 0.88rem; color: #212529; }
                    .dv-ua-string { font-family: ui-monospace, monospace; font-size: 0.73rem; color: #6c757d; word-break: break-all; line-height: 1.5; padding: 0.5rem 0.75rem; background: #f8f9fa; border-radius: 6px; margin-top: 0.25rem; }
                </style>

                <div class="dv-section-label">Browser</div>
                <div class="dv-field-row">
                    <div class="dv-field-label">Name</div>
                    <div class="dv-field-value">{{model.device_info.user_agent.family|default('—')}}</div>
                </div>
                <div class="dv-field-row">
                    <div class="dv-field-label">Version</div>
                    <div class="dv-field-value">{{model.device_info.user_agent.major|default('—')}}{{#model.device_info.user_agent.minor}}.{{model.device_info.user_agent.minor}}{{/model.device_info.user_agent.minor}}{{#model.device_info.user_agent.patch}}.{{model.device_info.user_agent.patch}}{{/model.device_info.user_agent.patch}}</div>
                </div>

                <div class="dv-section-label">Operating System</div>
                <div class="dv-field-row">
                    <div class="dv-field-label">Name</div>
                    <div class="dv-field-value">{{model.device_info.os.family|default('—')}}</div>
                </div>
                <div class="dv-field-row">
                    <div class="dv-field-label">Version</div>
                    <div class="dv-field-value">{{model.device_info.os.major|default('—')}}{{#model.device_info.os.minor}}.{{model.device_info.os.minor}}{{/model.device_info.os.minor}}{{#model.device_info.os.patch}}.{{model.device_info.os.patch}}{{/model.device_info.os.patch}}</div>
                </div>

                <div class="dv-section-label">Hardware</div>
                <div class="dv-field-row">
                    <div class="dv-field-label">Brand</div>
                    <div class="dv-field-value">{{model.device_info.device.brand|default('—')}}</div>
                </div>
                <div class="dv-field-row">
                    <div class="dv-field-label">Family</div>
                    <div class="dv-field-value">{{model.device_info.device.family|default('—')}}</div>
                </div>
                <div class="dv-field-row">
                    <div class="dv-field-label">Model</div>
                    <div class="dv-field-value">{{model.device_info.device.model|default('—')}}</div>
                </div>

                <div class="dv-section-label">Identification</div>
                <div class="dv-field-row">
                    <div class="dv-field-label">Device ID</div>
                    <div class="dv-field-value" style="font-family: ui-monospace, monospace; font-size: 0.78rem;">{{model.duid|truncate_middle(32)}}</div>
                </div>
                <div class="dv-field-row">
                    <div class="dv-field-label">Last IP</div>
                    <div class="dv-field-value">{{model.last_ip|default('—')}}</div>
                </div>
                <div class="dv-field-row">
                    <div class="dv-field-label">First Seen</div>
                    <div class="dv-field-value">{{model.first_seen|epoch|datetime|default('—')}}</div>
                </div>
                <div class="dv-field-row">
                    <div class="dv-field-label">Last Seen</div>
                    <div class="dv-field-value">{{model.last_seen|epoch|datetime|default('—')}}</div>
                </div>

                {{#model.device_info.string}}
                <div class="dv-section-label">User Agent String</div>
                <div class="dv-ua-string">{{model.device_info.string}}</div>
                {{/model.device_info.string}}
            `
        });

        // ── Locations section — multiline rows ──────
        const locationsView = new TableView({
            collection: new UserDeviceLocationList({
                params: { user_device: this.model.get('id'), size: 10 }
            }),
            hideActivePillNames: ['user_device'],
            clickAction: 'view',
            itemClass: DeviceLocationRow,
            selectable: false,
            columns: [
                {
                    key: 'ip_address',
                    label: 'Location',
                    template: `
                        <div style="font-size:0.85rem; font-weight:500;">
                            <i class="bi bi-geo-alt text-muted me-1" style="font-size:0.95rem; vertical-align:middle;"></i>{{locationText}}
                            {{#countryName}} <span class="text-muted fw-normal">&middot; {{countryName}}</span>{{/countryName}}
                        </div>
                        <div style="font-size:0.73rem; color:#6c757d; margin-top:0.15rem;">
                            {{model.ip_address}}
                            {{#ispName}} <span class="text-muted mx-1">&middot;</span> {{ispName}}{{/ispName}}
                            {{#hasThreatFlags|bool}} <span class="ms-1">{{{threatFlags}}}</span>{{/hasThreatFlags|bool}}
                        </div>`
                },
                { key: 'first_seen', label: 'First Seen', formatter: 'epoch|relative', width: '110px' },
                { key: 'last_seen', label: 'Last Seen', formatter: 'epoch|relative', width: '110px' }
            ]
        });

        // ── SideNavView ─────────────────────────────
        this.sideNavView = new SideNavView({
            containerId: 'device-sidenav',
            activeSection: 'details',
            navWidth: 160,
            contentPadding: '1rem 1.5rem',
            enableResponsive: true,
            minWidth: 450,
            sections: [
                { key: 'details', label: 'Details', icon: 'bi-info-circle', view: detailsView },
                { key: 'locations', label: 'Locations', icon: 'bi-geo-alt', view: locationsView }
            ]
        });
        this.addChild(this.sideNavView);

        // ── Context Menu ────────────────────────────
        const deviceMenu = new ContextMenu({
            containerId: 'device-context-menu',
            className: "context-menu-view header-menu-absolute",
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'View User', action: 'view-user', icon: 'bi-person' },
                    { label: 'Block Device', action: 'block-device', icon: 'bi-shield-slash', disabled: true },
                    { type: 'divider' },
                    { label: 'Delete Record', action: 'delete-device', icon: 'bi-trash', danger: true }
                ]
            }
        });
        this.addChild(deviceMenu);
    }

    async onActionViewUser() {
        this.emit('view-user', { userId: this.model.get('user')?.id });
    }

    async onActionDeleteDevice() {
        const confirmed = await Dialog.confirm(
            'Are you sure you want to delete this device record?',
            'Delete Device'
        );
        if (!confirmed) return true;

        const resp = await this.model.destroy();
        if (resp.success) {
            this.emit('device:deleted', { model: this.model });
        }
        return true;
    }

    static async show(duid) {
        const model = await UserDevice.getByDuid(duid);
        if (model) {
            return Dialog.showDialog({
                title: false,
                size: 'lg',
                body: new DeviceView({ model }),
                buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
            });
        }
        Dialog.alert({ message: `Could not find device with DUID: ${duid}`, type: 'warning' });
        return null;
    }
}

UserDevice.VIEW_CLASS = DeviceView;
export default DeviceView;
