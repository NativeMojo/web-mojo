import TablePage from '@core/pages/TablePage.js';
import { MetricsPermission, MetricsPermissionList, MetricsForms } from '@core/models/Metrics.js';
import MetricsPermissionsView from './MetricsPermissionsView.js';

MetricsPermission.EDIT_FORM = MetricsForms.edit;
MetricsPermission.VIEW_CLASS = MetricsPermissionsView;

class MetricsPermissionsTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_metrics_permissions',
            pageName: 'Metrics Permissions',
            router: "admin/metrics/permissions",
            Collection: MetricsPermissionList,
            viewDialogOptions: {
                header: false,
                size: 'lg'
            },

            columns: [
                { key: 'account', label: 'Account', sortable: true },
                { key: 'view_permissions', label: 'View Permissions', formatter: 'list|badge' },
                { key: 'write_permissions', label: 'Write Permissions', formatter: 'list|badge' },
            ],

            actions: ["view", "edit", "delete"],
            emptyMessage: 'No metrics permissions found.',

            selectable: true,
            searchable: true,
            sortable: true,
            paginated: true,
            showRefresh: true,
            // Add flow not wired (no MetricsForms.create exists today). Existing rows
            // are managed via edit/delete; new rows come from the metrics ingest path.
            showAdd: false,
            showExport: true
        });
    }
}

export default MetricsPermissionsTablePage;
