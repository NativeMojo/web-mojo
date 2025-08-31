/**
 * DeviceView - Comprehensive user device management interface
 */

import View from '../../core/View.js';
import TabView from '../../views/navigation/TabView.js';
import Table from '../../views/table/Table.js';
import ContextMenu from '../../views/feedback/ContextMenu.js';
import { UserDevice, UserDeviceLocationList } from '../../models/User.js';
import Dialog from '../../core/Dialog.js';

class DeviceView extends View {
    constructor(options = {}) {
        super({
            className: 'device-view',
            ...options
        });

        this.model = options.model || new UserDevice(options.data || {});
        this.deviceInfo = this.model.get('device_info') || {};
        this.deviceIcon = this.getIconForDevice(this.deviceInfo);

        this.template = `
            <div class="device-view-container">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <!-- Left Side: Icon & Info -->
                    <div class="d-flex align-items-center gap-3">
                        <div class="fs-1 text-primary">
                            <i class="bi {{deviceIcon}}"></i>
                        </div>
                        <div>
                            <h3 class="mb-1">
                                {{deviceInfo.user_agent.family}} on {{deviceInfo.os.family}}
                            </h3>
                            <div class="text-muted small">
                                DUID: {{model.duid|truncate_middle(32)}}
                            </div>
                            <div class="text-muted small mt-1">
                                User: <a href="#" data-action="view-user">{{model.user.display_name}}</a>
                            </div>
                        </div>
                    </div>

                    <!-- Right Side: Status & Actions -->
                    <div class="d-flex align-items-center gap-4">
                        <div class="text-end">
                            <div class="text-muted small">Last Seen</div>
                            <div>{{model.last_seen|relative}}</div>
                            <div class="text-muted small">from {{model.last_ip}}</div>
                        </div>
                        <div data-container="device-context-menu"></div>
                    </div>
                </div>

                <!-- Tab Container -->
                <div data-container="device-tabs"></div>
            </div>
        `;
    }

    getIconForDevice(deviceInfo) {
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

        return 'bi-laptop'; // Default icon
    }

    async onInit() {
        // Info Tab
        this.infoView = new View({
            model: this.model,
            className: "p-3",
            template: `
                <div class="list-group">
                  <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                      <h6 class="mb-1 text-muted">Browser</h6>
                    </div>
                    <p class="mb-1 fs-5">{{model.device_info.user_agent.family}} {{model.device_info.user_agent.major}}</p>
                  </div>
                  <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                      <h6 class="mb-1 text-muted">Operating System</h6>
                    </div>
                    <p class="mb-1 fs-5">{{model.device_info.os.family}} {{model.device_info.os.major}}.{{model.device_info.os.minor}}</p>
                  </div>
                  <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                      <h6 class="mb-1 text-muted">Device</h6>
                    </div>
                    <p class="mb-1 fs-5">{{model.device_info.device.brand}} {{model.device_info.device.model}}</p>
                  </div>
                  <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                      <h6 class="mb-1 text-muted">Full User Agent</h6>
                    </div>
                    <small class="text-muted" style="word-break: break-all;">{{model.device_info.string}}</small>
                  </div>
                </div>
            `
        });

        // Locations Tab
        const locationsCollection = new UserDeviceLocationList({
            params: { user_device: this.model.get('id'), size: 10 }
        });
        this.locationsView = new Table({
            title: 'Device Locations',
            collection: locationsCollection,
            hideActivePillNames: ['user_device'],
            columns: [
                { key: 'ip_address', label: 'IP Address', sortable: true },
                { key: 'geolocation.city', label: 'City', formatter: "default('—')" },
                { key: 'geolocation.region', label: 'Region', formatter: "default('—')" },
                { key: 'geolocation.country_name', label: 'Country', formatter: "default('—')" },
                { key: 'first_seen', label: 'First Seen', formatter: 'datetime' },
                { key: 'last_seen', label: 'Last Seen', formatter: 'datetime' },
            ]
        });

        // TabView
        this.tabView = new TabView({
            tabs: {
                'Info': this.infoView,
                'Locations': this.locationsView,
            },
            activeTab: 'Info',
            containerId: 'device-tabs'
        });
        this.addChild(this.tabView);

        // ContextMenu
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
        // This would typically navigate to the user view or open it in a new dialog
        console.log("View user:", this.model.get('user'));
        this.emit('view-user', { userId: this.model.get('user')?.id });
    }

    async onActionDeleteDevice() {
        // Placeholder for delete logic
        console.log("Delete device:", this.model.id);
    }

    static async show(duid) {
        const model = await UserDevice.getByDuid(duid);
        if (model) {
            const view = new DeviceView({ model });
            const dialog = new Dialog({
                header: false,
                size: 'lg',
                body: view,
                buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
            });
            await dialog.render(true, document.body);
            dialog.show();
            return dialog;
        }
        Dialog.alert({ message: `Could not find device with DUID: ${duid}`, type: 'warning' });
        return null;
    }
}

UserDevice.VIEW_CLASS = DeviceView;
export default DeviceView;
