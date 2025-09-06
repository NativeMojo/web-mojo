import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

class MetricsPermission extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/metrics/permissions',
            id_key: 'account'
        });
    }
}

class MetricsPermissionList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: MetricsPermission,
            endpoint: '/api/metrics/permissions',
            ...options,
        });
    }

}

const MetricsForms = {
    edit: {
        title: 'Edit Metrics Permissions',
        fields: [
            { name: 'account', type: 'text', label: 'Account', columns:12 },
            { name: 'view_permissions', type: 'tags', label: 'View Permissions', help: 'Enter permissions or "public"', columns:12 },
            { name: 'write_permissions', type: 'tags', label: 'Write Permissions', help: 'Enter permissions', columns:12 },
        ]
    }
};

export { MetricsPermission, MetricsPermissionList, MetricsForms };
