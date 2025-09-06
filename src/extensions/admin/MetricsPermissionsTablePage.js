import TablePage from '@core/pages/TablePage.js';
import { MetricsPermissionList, MetricsForms } from '@core/models/Metrics.js';
import MetricsPermissionsView from './views/MetricsPermissionsView.js';

class MetricsPermissionsTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_metrics_permissions',
            pageName: 'Metrics Permissions',
            router: "admin/metrics/permissions",
            Collection: MetricsPermissionList,
            formEdit: MetricsForms.edit,
            itemViewClass: MetricsPermissionsView,
            viewDialogOptions: {
                header: false,
                size: 'lg'
            },

            columns: [
                { key: 'account', label: 'Account', sortable: true },
                { key: 'view_permissions', label: 'View Permissions', formatter: 'list|badge' },
                { key: 'write_permissions', label: 'Write Permissions', formatter: 'list|badge' },
            ],

            selectable: true,
            searchable: true,
            sortable: true,
            paginated: true,
            showRefresh: true,
            showAdd: true,
            showExport: true,

            tableOptions: {
                pageSizes: [10, 25, 50],
                defaultPageSize: 25,
                emptyMessage: 'No metrics permissions found.',
                emptyIcon: 'bi-bar-chart-line',
                actions: ["view", "edit", "delete"],
            }
        });
    }
}

export default MetricsPermissionsTablePage;
