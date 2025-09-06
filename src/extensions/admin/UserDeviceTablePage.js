/**
 * UserDeviceTablePage - User device management using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '@core/pages/TablePage.js';
import { UserDeviceList } from '@core/models/User.js';
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

            // Column definitions
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

            // Table features
            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            // Toolbar
            showRefresh: true,
            showAdd: false,
            showExport: true,

            // Empty state
            emptyMessage: 'No user devices found.',

            // Table display options
            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }
}

export default UserDeviceTablePage;