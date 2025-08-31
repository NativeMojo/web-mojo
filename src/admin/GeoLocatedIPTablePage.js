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

            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                { key: 'ip_address', label: 'IP Address', sortable: true },
                { key: 'city', label: 'City', sortable: true, formatter: "default('—')" },
                { key: 'region', label: 'Region', sortable: true, formatter: "default('—')" },
                { key: 'country_name', label: 'Country', sortable: true, formatter: "default('—')" },
                { key: 'provider', label: 'Provider', sortable: true },
                { key: 'is_expired', label: 'Expired', formatter: "boolean|badge" },
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
                emptyMessage: 'No GeoIP records found.',
                emptyIcon: 'bi-globe',
                actions: ["view"],
            }
        });
    }

    async onItemView(item, mode, event, target) {
        const dialog = await super.onItemView(item, mode, event, target);
        if (dialog && dialog.bodyView) {
            dialog.bodyView.on('geoip:deleted', () => {
                dialog.hide();
                this.refreshTable();
            });
        }
        return dialog;
    }
}

export default GeoLocatedIPTablePage;
