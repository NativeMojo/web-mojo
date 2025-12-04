/**
 * GeoLocatedIPTablePage - GeoIP cache management using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '@core/pages/TablePage.js';
import { GeoLocatedIPList, GeoLocatedIP } from '@core/models/System.js';
import GeoIPView from './GeoIPView.js';

class GeoLocatedIPTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_system_geoip',
            pageName: 'GeoIP Cache',
            router: "admin/system/geoip",
            Collection: GeoLocatedIPList,

            itemView: GeoIPView,
            viewDialogOptions: {
                header: false,
                size: 'xl'
            },

            // Column definitions
            columns: [
                { key: 'ip_address', label: 'IP Address', sortable: true },
                { key: 'city', label: 'City', sortable: true, formatter: "default('—')" },
                { key: 'region', label: 'Region', sortable: true, formatter: "default('—')" },
                { key: 'country_name', label: 'Country', sortable: true, formatter: "default('—')" },
                { key: 'isp', label: 'ISP', sortable: true, formatter: "default('—')" },
                { key: 'threat_level', label: 'Threat', formatter: "default('—')"}
            ],

            // Table features
            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            // Actions
            // actions: ['view', 'edit', 'delete'],
            clickAction: 'view',

            // Toolbar
            showRefresh: true,
            showAdd: true,
            showExport: true,

            // Empty state
            emptyMessage: 'No GeoIP records found.',

            // Table display options
            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            },
            tableViewOptions: {
                addButtonLabel: "Lookup IP",
                onAdd: (evt) => {
                    evt.preventDefault();
                    // Implement the logic for adding a new record
                    this.onLookup();
                }
            }
        });
    }

    async onLookup() {
        // Implement the logic for adding a new record
        const data = await this.getApp().showForm({
            title: "Lookup IP",
            fields: [
                {
                    name: 'ip',
                    type: 'text',
                    required: true
                }
            ]
        });
        if (data && data.ip) {
            const model = await GeoLocatedIP.lookup(data.ip);
            if (model) {
                this.tableView._onRowView({ model });
            }
        }
    }
}

export default GeoLocatedIPTablePage;
