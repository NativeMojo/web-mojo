/**
 * ProfileDevicesSection - Devices tab
 *
 * TableView with pagination showing registered devices.
 * Rich two-line rows: device+brand on top, browser+OS below.
 * Click a row to see full device detail in a dialog.
 */
import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import TableView from '@core/views/table/TableView.js';
import TableRow from '@core/views/table/TableRow.js';
import { UserDeviceList } from '@core/models/User.js';

class DeviceRow extends TableRow {
    get deviceIcon() {
        const dev = this.model?.get('device_info')?.device || {};
        const os = this.model?.get('device_info')?.os || {};
        const isMobile = ['iPhone', 'Android'].some(m =>
            (dev.family || '').includes(m) || (os.family || '').includes(m)
        );
        return isMobile ? 'bi-phone' : 'bi-laptop';
    }

    get deviceName() {
        const dev = this.model?.get('device_info')?.device || {};
        return `${dev.brand || ''} ${dev.family || ''}`.trim() || 'Unknown Device';
    }

    get deviceModel() {
        return this.model?.get('device_info')?.device?.model || '';
    }

    get browserName() {
        const ua = this.model?.get('device_info')?.user_agent || {};
        return ua.family ? `${ua.family} ${ua.major || ''}`.trim() : '';
    }

    get osName() {
        const os = this.model?.get('device_info')?.os || {};
        return os.family ? `${os.family} ${os.major || ''}`.trim() : '';
    }

    get deviceMeta() {
        const parts = [this.browserName, this.osName].filter(Boolean);
        return parts.join(' · ') || '—';
    }
}

export default class ProfileDevicesSection extends View {
    constructor(options = {}) {
        super({
            className: 'profile-devices-section',
            template: `
                <style>
                    .pds-primary { font-size: 0.85rem; font-weight: 500; }
                    .pds-model { font-weight: 400; color: #6c757d; }
                    .pds-secondary { font-size: 0.73rem; color: #6c757d; margin-top: 0.15rem; }
                    .pds-icon { color: #6c757d; font-size: 1.1rem; vertical-align: middle; margin-right: 0.35rem; }
                </style>
                <div id="devices-table"></div>
            `,
            ...options
        });
    }

    async onInit() {
        await super.onInit();
        this.tableView = new TableView({
            containerId: 'devices-table',
            collection: new UserDeviceList({ size: 10 }),
            defaultQuery: { user: this.model.id },
            searchable: false,
            filterable: false,
            selectable: false,
            actions: null,
            clickAction: 'view',
            itemClass: DeviceRow,
            columns: [
                {
                    key: 'device_info',
                    label: 'Device',
                    template: `
                        <div class="pds-primary">
                            <i class="bi {{deviceIcon}} pds-icon"></i>{{deviceName}}
                            {{#deviceModel}} <span class="pds-model">({{deviceModel}})</span>{{/deviceModel}}
                        </div>
                        <div class="pds-secondary">
                            {{deviceMeta}}
                            {{#model.last_ip}} <span class="text-muted mx-1">&middot;</span> {{model.last_ip}}{{/model.last_ip}}
                        </div>`
                },
                {
                    key: 'last_seen',
                    label: 'Last Seen',
                    formatter: 'relative'
                }
            ],
            onItemView: (model) => this._showDeviceDetail(model)
        });
        this.addChild(this.tableView);
    }

    _showDeviceDetail(model) {
        const data = model.toJSON ? model.toJSON() : model;
        const info = data.device_info || {};
        const dev = info.device || {};
        const ua = info.user_agent || {};
        const os = info.os || {};

        const device = `${dev.brand || ''} ${dev.family || ''}`.trim() || 'Unknown';
        const browser = ua.family ? `${ua.family} ${[ua.major, ua.minor, ua.patch].filter(Boolean).join('.')}` : 'Unknown';
        const osName = os.family ? `${os.family} ${[os.major, os.minor, os.patch].filter(Boolean).join('.')}` : '—';
        const isMobile = ['iPhone', 'Android'].some(m =>
            (dev.family || '').includes(m) || (os.family || '').includes(m)
        );

        const row = (label, value) => `
            <div style="display:flex; padding:0.4rem 0; border-bottom:1px solid #f0f0f0;">
                <div style="width:120px; font-size:0.8rem; color:#6c757d; flex-shrink:0;">${label}</div>
                <div style="flex:1; font-size:0.85rem;">${value || '—'}</div>
            </div>`;

        Modal.dialog({
            title: `<i class="bi ${isMobile ? 'bi-phone' : 'bi-laptop'} me-2"></i>${device}`,
            size: 'sm',
            centered: true,
            body: `
                <div style="font-size:0.85rem;">
                    ${row('Device', `${device} (${dev.model || '—'})`)}
                    ${row('Browser', browser)}
                    ${row('OS', osName)}
                    ${row('Last IP', data.last_ip)}
                    ${row('Type', isMobile ? 'Mobile' : 'Desktop')}
                    ${row('First Seen', data.first_seen ? new Date(data.first_seen * 1000).toLocaleString() : '—')}
                    ${row('Last Seen', data.last_seen ? new Date(data.last_seen * 1000).toLocaleString() : '—')}
                </div>`,
            buttons: [
                { text: 'Close', class: 'btn-outline-secondary', dismiss: true }
            ]
        });
    }
}
