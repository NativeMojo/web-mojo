import TablePage from '@core/pages/TablePage.js';
import { PushDelivery, PushDeliveryList } from '@ext/admin/models/Push.js';
import { groupByDay } from '@core/views/list/grouping.js';
import PushDeliveryView from './PushDeliveryView.js';

PushDelivery.VIEW_CLASS = PushDeliveryView;

class PushDeliveryTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_push_deliveries',
            pageName: 'Push Deliveries',
            router: "admin/push/deliveries",
            Collection: PushDeliveryList,

            dayRangeFilter: true,
            ...groupByDay('created'),
            searchPlaceholder: 'Search title, user, or device',

            defaultQuery: {
                sort: '-created'
            },

            viewDialogOptions: {
                header: false,
                size: 'md'
            },

            columns: [
                { key: 'id', label: 'ID', width: '70px' },
                { key: 'created', label: 'Timestamp', formatter: 'datetime' },
                { key: 'user.display_name', label: 'User', visibility: 'md' },
                { key: 'device.device_name', label: 'Device', visibility: 'md' },
                { key: 'title', label: 'Title' },
                { key: 'category', label: 'Category', visibility: 'lg' },
                { key: 'status', label: 'Status', formatter: 'badge' },
            ],

            actions: ["view"],
            emptyMessage: 'No deliveries found.',

            searchable: true,
            sortable: true,
            paginated: true,
            showRefresh: true
        });
    }
}

export default PushDeliveryTablePage;
