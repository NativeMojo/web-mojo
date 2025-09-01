/**
 * GeoLocatedIPTablePage - GeoIP cache management using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '../pages/TablePage.js';
import { GeoLocatedIPList } from '../models/System.js';
import GeoIPView from './views/GeoIPView.js';

class GeoLocatedIPTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_system_geoip',
            pageName: 'GeoIP Cache',
            router: "admin/system/geoip",
            Collection: GeoLocatedIPList,
            
            itemViewClass: GeoIPView,
            viewDialogOptions: {
                header: false,
                size: 'lg'
            },

            // Column definitions
            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                { key: 'ip_address', label: 'IP Address', sortable: true },
                { key: 'city', label: 'City', sortable: true, formatter: "default('—')" },
                { key: 'region', label: 'Region', sortable: true, formatter: "default('—')" },
                { key: 'country_name', label: 'Country', sortable: true, formatter: "default('—')" },
                { key: 'provider', label: 'Provider', sortable: true },
                { key: 'is_expired', label: 'Expired', formatter: "boolean|badge" }
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
            emptyMessage: 'No GeoIP records found.',

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

export default GeoLocatedIPTablePage;