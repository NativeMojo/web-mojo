import TablePage from '../pages/TablePage.js';
import { PushDeviceList } from '../models/Push.js';
import PushDeviceView from './views/PushDeviceView.js';

class PushDeviceTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_push_devices',
            pageName: 'Registered Devices',
            router: "admin/push/devices",
            Collection: PushDeviceList,
            itemViewClass: PushDeviceView,
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
                { key: 'push_enabled', label: 'Push Enabled', format: 'boolean' },
                { key: 'last_seen', label: 'Last Seen', formatter: 'datetime' },
            ],
            
            searchable: true,
            sortable: true,
            paginated: true,
            showRefresh: true,

            tableOptions: {
                pageSizes: [10, 25, 50],
                defaultPageSize: 25,
                emptyMessage: 'No devices found.',
                emptyIcon: 'bi-phone',
                actions: ["view", "delete"],
            }
        });
    }
}

export default PushDeviceTablePage;
