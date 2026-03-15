/**
 * ProfileDevicesSection - Devices tab
 *
 * Uses ListView + UserDeviceList to show
 * registered devices with browser, OS, IP info.
 */
import View from '@core/View.js';
import ListView from '@core/views/list/ListView.js';
import ListViewItem from '@core/views/list/ListViewItem.js';
import { UserDeviceList } from '@core/models/User.js';

class DeviceItem extends ListViewItem {
    get deviceName() {
        const info = this.model?.get('device_info') || {};
        const dev = info.device || {};
        return `${dev.brand || ''} ${dev.family || ''}`.trim() || 'Unknown Device';
    }

    get browserInfo() {
        const info = this.model?.get('device_info') || {};
        const ua = info.user_agent || {};
        return ua.family ? `${ua.family} ${ua.major || ''}`.trim() : 'Unknown Browser';
    }

    get osName() {
        const info = this.model?.get('device_info') || {};
        return info.os?.family || '';
    }

    get isMobile() {
        const info = this.model?.get('device_info') || {};
        const dev = info.device || {};
        const os = info.os || {};
        return ['iPhone', 'Android'].some(m =>
            (dev.family || '').includes(m) || (os.family || '').includes(m)
        );
    }

    get deviceIcon() {
        return this.isMobile ? 'bi-phone' : 'bi-laptop';
    }
}

export default class ProfileDevicesSection extends View {
    constructor(options = {}) {
        super({
            className: 'profile-devices-section',
            template: `
                <style>
                    .pd-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.75rem; border: 1px solid #f0f0f0; border-radius: 8px; margin-bottom: 0.4rem; }
                    .pd-icon { width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0; background: #f0f0f0; color: #495057; }
                    .pd-info { flex: 1; min-width: 0; }
                    .pd-name { font-weight: 600; font-size: 0.85rem; }
                    .pd-meta { font-size: 0.73rem; color: #6c757d; }
                </style>
                <div id="devices-list"></div>
            `,
            ...options
        });
    }

    async onInit() {
        await super.onInit();
        this.listView = new ListView({
            containerId: 'devices-list',
            collection: new UserDeviceList({ size: 20 }),
            defaultQuery: { user: this.model.id },
            itemClass: DeviceItem,
            itemTemplate: `
                <div class="pd-row">
                    <div class="pd-icon"><i class="bi {{deviceIcon}}"></i></div>
                    <div class="pd-info">
                        <div class="pd-name">{{deviceName}}</div>
                        <div class="pd-meta">{{browserInfo}} &middot; {{osName}} &middot; {{model.last_ip}} &middot; Last seen {{model.last_seen|relative}}</div>
                    </div>
                </div>
            `,
            emptyMessage: 'No registered devices'
        });
        this.addChild(this.listView);
    }
}
