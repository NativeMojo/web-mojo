/**
 * ProfileSessionsSection - Sessions tab
 *
 * Uses ListView + UserDeviceLocationList to show
 * active sessions with browser, device, location info.
 */
import View from '@core/View.js';
import ListView from '@core/views/list/ListView.js';
import ListViewItem from '@core/views/list/ListViewItem.js';
import { UserDeviceLocationList } from '@core/models/User.js';

class SessionItem extends ListViewItem {
    get browserName() {
        const ud = this.model?.get('user_device');
        return ud?.device_info?.user_agent?.family || 'Unknown';
    }

    get deviceName() {
        const ud = this.model?.get('user_device');
        const dev = ud?.device_info?.device || {};
        return `${dev.brand || ''} ${dev.family || ''}`.trim() || 'Unknown Device';
    }

    get location() {
        const geo = this.model?.get('geolocation') || {};
        const parts = [geo.city, geo.region].filter(Boolean);
        return parts.length ? parts.join(', ') : (geo.country_name || '');
    }

    get isMobile() {
        const ud = this.model?.get('user_device');
        const dev = ud?.device_info?.device || {};
        const os = ud?.device_info?.os || {};
        return ['iPhone', 'Android'].some(m =>
            (dev.family || '').includes(m) || (os.family || '').includes(m)
        );
    }

    get deviceIcon() {
        return this.isMobile ? 'bi-phone' : 'bi-laptop';
    }
}

export default class ProfileSessionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'profile-sessions-section',
            template: `
                <style>
                    .pss-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.75rem; border: 1px solid #f0f0f0; border-radius: 8px; margin-bottom: 0.4rem; }
                    .pss-icon { width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0; background: #f0f0f0; color: #6c757d; }
                    .pss-info { flex: 1; min-width: 0; }
                    .pss-name { font-weight: 600; font-size: 0.85rem; }
                    .pss-meta { font-size: 0.73rem; color: #6c757d; }
                </style>
                <div id="sessions-list"></div>
            `,
            ...options
        });
    }

    async onInit() {
        await super.onInit();
        this.listView = new ListView({
            containerId: 'sessions-list',
            collection: new UserDeviceLocationList({ size: 20 }),
            defaultQuery: { user: this.model.id },
            itemClass: SessionItem,
            itemTemplate: `
                <div class="pss-row">
                    <div class="pss-icon"><i class="bi {{deviceIcon}}"></i></div>
                    <div class="pss-info">
                        <div class="pss-name">{{browserName}} on {{deviceName}}</div>
                        <div class="pss-meta">{{location}} &middot; {{model.ip_address}} &middot; Last seen {{model.last_seen|relative}}</div>
                    </div>
                </div>
            `,
            emptyMessage: 'No session data available'
        });
        this.addChild(this.listView);
    }
}
