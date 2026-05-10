/**
 * UserDeviceLocationTablePage - Login locations with map and table tabs
 *
 * Tab 1 "Map": Interactive login location map (system-wide summary)
 * Tab 2 "Logins": Paginated login events table
 */

import Page from '@core/Page.js';
import TabView from '@core/views/navigation/TabView.js';
import TableView from '@core/views/table/TableView.js';
import { groupByDay } from '@core/views/list/grouping.js';
import { LoginEventList } from '@ext/admin/models/LoginEvent.js';
import LoginLocationMapView from './LoginLocationMapView.js';

class UserDeviceLocationTablePage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            pageName: 'Device Locations',
            className: 'device-locations-page'
        });

        this.name = options.name || 'admin_user_device_locations';
        this.route = options.router || 'admin/user/device-locations';
    }

    async getTemplate() {
        return `
            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h4 class="mb-1">Device Locations</h4>
                        <p class="text-muted mb-0 small">Login locations across all users</p>
                    </div>
                </div>
                <div data-container="tabs"></div>
            </div>
        `;
    }

    async onInit() {
        const loginMapView = new LoginLocationMapView({
            height: 400,
            mapStyle: 'dark'
        });

        const loginEventsTable = new TableView({
            collection: new LoginEventList({ params: { size: 20 } }),
            searchable: true,
            searchPlaceholder: 'Search user, IP, or city',
            sortable: true,
            filterable: true,
            paginated: true,
            showRefresh: true,
            showExport: true,

            // Day-range segment + day-grouped headers, matching the rest of
            // the admin audit feeds (logs, signals, sent messages, etc.).
            dayRangeFilter: true,
            ...groupByDay('created'),

            columns: [
                { key: 'created', label: 'Date', formatter: 'datetime', sortable: true, width: '160px' },
                { key: 'user.display_name', label: 'User', sortable: true },
                { key: 'ip_address', label: 'IP Address', sortable: true },
                { key: 'city', label: 'City', formatter: "default('—')" },
                { key: 'region', label: 'Region', formatter: "default('—')", visibility: 'xl' },
                { key: 'country_code', label: 'Country', sortable: true },
                { key: 'source', label: 'Source', sortable: true, visibility: 'xl' },
                { key: 'is_new_country', label: 'New Country', formatter: 'boolean', sortable: true, width: '110px' }
            ]
        });
        loginEventsTable.onTabActivated = async () => {
            await loginEventsTable.collection?.fetch();
        };

        this.tabView = new TabView({
            containerId: 'tabs',
            tabs: {
                'Map': loginMapView,
                'Logins': loginEventsTable
            },
            activeTab: 'Map'
        });
        this.addChild(this.tabView);
    }
}

export default UserDeviceLocationTablePage;
