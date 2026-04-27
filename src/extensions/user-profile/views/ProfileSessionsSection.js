/**
 * ProfileSessionsSection - Sessions tab
 *
 * TableView with pagination showing active sessions.
 * Rich two-line rows: browser+device on top, location+IP below.
 * Click a row to see full session detail in a dialog.
 */
import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import TableView from '@core/views/table/TableView.js';
import TableRow from '@core/views/table/TableRow.js';
import { UserDeviceLocationList } from '@core/models/User.js';

class SessionRow extends TableRow {
    get deviceIcon() {
        const dev = this.model?.get('user_device')?.device_info?.device || {};
        const os = this.model?.get('user_device')?.device_info?.os || {};
        const isMobile = ['iPhone', 'Android'].some(m =>
            (dev.family || '').includes(m) || (os.family || '').includes(m)
        );
        return isMobile ? 'bi-phone' : 'bi-laptop';
    }

    get browserName() {
        const ua = this.model?.get('user_device')?.device_info?.user_agent || {};
        return ua.family ? `${ua.family} ${ua.major || ''}`.trim() : 'Unknown';
    }

    get deviceName() {
        const dev = this.model?.get('user_device')?.device_info?.device || {};
        return `${dev.brand || ''} ${dev.family || ''}`.trim() || 'Unknown';
    }

    get osName() {
        const os = this.model?.get('user_device')?.device_info?.os || {};
        return os.family || '';
    }

    get locationText() {
        const geo = this.model?.get('geolocation') || {};
        const parts = [geo.city, geo.region].filter(Boolean);
        return parts.length ? parts.join(', ') : (geo.country_name || '—');
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

export default class ProfileSessionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'profile-sessions-section',
            template: `
                <style>
                    .pss-primary { font-size: 0.85rem; font-weight: 500; }
                    .pss-secondary { font-size: 0.73rem; color: #6c757d; margin-top: 0.15rem; }
                    .pss-icon { color: #6c757d; font-size: 1.1rem; vertical-align: middle; margin-right: 0.35rem; }
                </style>
                <div id="sessions-table"></div>
            `,
            ...options
        });
    }

    async onInit() {
        await super.onInit();
        this.tableView = new TableView({
            containerId: 'sessions-table',
            collection: new UserDeviceLocationList({ size: 10 }),
            defaultQuery: { user: this.model.id },
            searchable: false,
            filterable: false,
            selectable: false,
            actions: null,
            clickAction: 'view',
            itemClass: SessionRow,
            columns: [
                {
                    key: 'user_device',
                    label: 'Session',
                    template: `
                        <div class="pss-primary">
                            <i class="bi {{deviceIcon}} pss-icon"></i>{{browserName}} <span class="text-muted fw-normal">on</span> {{deviceName}}
                        </div>
                        <div class="pss-secondary">
                            <i class="bi bi-geo-alt me-1"></i>{{locationText}}
                            <span class="text-muted mx-1">&middot;</span>
                            {{model.ip_address}}
                            {{#hasThreatFlags|bool}} <span class="ms-1">{{{threatFlags}}}</span>{{/hasThreatFlags|bool}}
                        </div>`
                },
                {
                    key: 'last_seen',
                    label: 'Last Seen',
                    formatter: 'relative'
                }
            ],
            onItemView: (model) => this._showSessionDetail(model)
        });
        this.addChild(this.tableView);
    }

    _showSessionDetail(model) {
        const data = model.toJSON ? model.toJSON() : model;
        const ud = data.user_device || {};
        const dev = ud.device_info?.device || {};
        const ua = ud.device_info?.user_agent || {};
        const os = ud.device_info?.os || {};
        const geo = data.geolocation || {};

        const browser = ua.family ? `${ua.family} ${[ua.major, ua.minor, ua.patch].filter(Boolean).join('.')}` : 'Unknown';
        const device = `${dev.brand || ''} ${dev.family || ''}`.trim() || 'Unknown';
        const osName = os.family ? `${os.family} ${[os.major, os.minor, os.patch].filter(Boolean).join('.')}` : '—';
        const location = [geo.city, geo.region, geo.country_name].filter(Boolean).join(', ') || '—';

        const flags = [];
        if (geo.is_vpn) flags.push('<span class="badge bg-warning text-dark">VPN</span>');
        if (geo.is_tor) flags.push('<span class="badge bg-danger">Tor</span>');
        if (geo.is_proxy) flags.push('<span class="badge bg-warning text-dark">Proxy</span>');
        if (geo.is_datacenter) flags.push('<span class="badge bg-secondary">Datacenter</span>');
        if (geo.is_known_attacker) flags.push('<span class="badge bg-danger">Known Attacker</span>');

        const row = (label, value) => `
            <div style="display:flex; padding:0.4rem 0; border-bottom:1px solid #f0f0f0;">
                <div style="width:120px; font-size:0.8rem; color:#6c757d; flex-shrink:0;">${label}</div>
                <div style="flex:1; font-size:0.85rem;">${value || '—'}</div>
            </div>`;

        Modal.dialog({
            title: `<i class="bi bi-clock-history me-2"></i>${browser} on ${device}`,
            size: 'sm',
            centered: true,
            body: `
                <div style="font-size:0.85rem;">
                    ${row('Browser', browser)}
                    ${row('Device', device)}
                    ${row('OS', osName)}
                    ${row('IP Address', data.ip_address)}
                    ${row('Location', location)}
                    ${row('ISP', geo.isp || geo.asn_org || '—')}
                    ${row('ASN', geo.asn || '—')}
                    ${row('Threat Level', geo.threat_level || '—')}
                    ${flags.length ? row('Flags', flags.join(' ')) : ''}
                    ${row('First Seen', data.first_seen ? new Date(data.first_seen * 1000).toLocaleString() : '—')}
                    ${row('Last Seen', data.last_seen ? new Date(data.last_seen * 1000).toLocaleString() : '—')}
                </div>`,
            buttons: [
                { text: 'Close', class: 'btn-outline-secondary', dismiss: true }
            ]
        });
    }
}
