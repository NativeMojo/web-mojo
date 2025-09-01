/**
 * UserDeviceLocationTablePage - Device location tracking using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '../pages/TablePage.js';
import { UserDeviceLocationList } from '../models/User.js';

class UserDeviceLocationTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_user_device_locations',
            pageName: 'Device Locations',
            router: "admin/user/device-locations",
            Collection: UserDeviceLocationList,

            // Column definitions
            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                { key: 'user.display_name', label: 'User', sortable: true },
                { key: 'user_device', label: 'Device', template: '{{user_device.device_info.user_agent.family}} on {{user_device.device_info.os.family}}', sortable: true },
                { key: 'ip_address', label: 'IP Address', sortable: true },
                { key: 'geolocation.city', label: 'City', formatter: "default('—')" },
                { key: 'geolocation.region', label: 'Region', formatter: "default('—')" },
                { key: 'geolocation.country_name', label: 'Country', formatter: "default('—')" },
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
            emptyMessage: 'No device locations found.',

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

export default UserDeviceLocationTablePage;