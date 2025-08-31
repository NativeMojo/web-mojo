import TablePage from '../pages/TablePage.js';
import { UserDeviceList } from '../models/User.js';
import DeviceView from './views/DeviceView.js';

class UserDeviceTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_user_devices',
            pageName: 'User Devices',
            router: "admin/user/devices",
            Collection: UserDeviceList,
            itemViewClass: DeviceView,
            viewDialogOptions: {
                header: false,
                size: 'lg'
            },

            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                { key: 'duid', label: 'Device ID', sortable: true, formatter: 'truncate_middle(16)' },
                { key: 'user.display_name', label: 'User', sortable: true, formatter: "default('—')" },
                { key: 'device_info.user_agent.family', label: 'Browser', formatter: "default('—')" },
                { key: 'device_info.os.family', label: 'OS', formatter: "default('—')" },
                { key: 'last_ip', label: 'Last IP', sortable: true },
                { key: 'first_seen', label: 'First Seen', formatter: "epoch|datetime" },
                { key: 'last_seen', label: 'Last Seen', formatter: "epoch|datetime" }
            ],

            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            showRefresh: true,
            showAdd: false,
            showExport: true,

            tableOptions: {
                pageSizes: [10, 25, 50, 100],
                defaultPageSize: 25,
                emptyMessage: 'No user devices found.',
                emptyIcon: 'bi-phone',
                actions: ["view"],
            }
        });
    }
}

export default UserDeviceTablePage;
