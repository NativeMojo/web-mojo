import TablePage from '@core/pages/TablePage.js';
import { PushDeviceList } from '@ext/admin/models/Push.js';

// PushDevice.VIEW_CLASS is registered on the model (Push.js).
class PushDeviceTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_push_devices',
            pageName: 'Registered Devices',
            router: "admin/push/devices",
            Collection: PushDeviceList,
            viewDialogOptions: {
                header: false,
                size: 'lg'
            },

            columns: [
                { key: 'id', label: 'ID', width: '70px' },
                { key: 'user.display_name', label: 'User' },
                { key: 'device_name', label: 'Device Name' },
                { key: 'platform', label: 'Platform', formatter: 'badge' },
                { key: 'app_version', label: 'App Version' },
                { key: 'push_enabled', label: 'Push Enabled', formatter: 'boolean' },
                { key: 'last_seen', label: 'Last Seen', formatter: 'datetime' },
            ],

            actions: ["view", "delete"],
            emptyMessage: 'No devices found.',

            searchable: true,
            sortable: true,
            paginated: true,
            showRefresh: true
        });
    }
}

export default PushDeviceTablePage;
