import TablePage from '../pages/TablePage.js';
import { PushDeliveryList } from '../models/Push.js';
import PushDeliveryView from './views/PushDeliveryView.js';

class PushDeliveryTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_push_deliveries',
            pageName: 'Push Deliveries',
            router: "admin/push/deliveries",
            Collection: PushDeliveryList,
            itemViewClass: PushDeliveryView,
            viewDialogOptions: {
                header: false,
                size: 'md'
            },

            columns: [
                { key: 'id', label: 'ID', width: '70px' },
                { key: 'created', label: 'Timestamp', formatter: 'datetime' },
                { key: 'user.display_name', label: 'User' },
                { key: 'device.device_name', label: 'Device' },
                { key: 'title', label: 'Title' },
                { key: 'category', label: 'Category' },
                { key: 'status', label: 'Status', formatter: 'badge' },
            ],
            
            searchable: true,
            sortable: true,
            paginated: true,
            showRefresh: true,

            tableOptions: {
                pageSizes: [10, 25, 50],
                defaultPageSize: 25,
                emptyMessage: 'No deliveries found.',
                emptyIcon: 'bi-send',
                actions: ["view"],
            }
        });
    }
}

export default PushDeliveryTablePage;
