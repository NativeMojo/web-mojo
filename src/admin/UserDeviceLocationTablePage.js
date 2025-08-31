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
                emptyMessage: 'No device locations found.',
                emptyIcon: 'bi-geo-alt',
                actions: ["view"],
            }
        });
    }
}

export default UserDeviceLocationTablePage;
