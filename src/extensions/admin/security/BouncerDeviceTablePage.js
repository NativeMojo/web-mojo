/**
 * BouncerDeviceTablePage - Device reputation management
 *
 * Shows bouncer device records with risk tiers, event counts,
 * and block counts for each tracked device.
 */

import TablePage from '@core/pages/TablePage.js';
import { BouncerDeviceList } from '@ext/admin/models/Bouncer.js';
import BouncerDeviceView from './BouncerDeviceView.js';

export default class BouncerDeviceTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_bouncer_devices',
            pageName: 'Bouncer Devices',
            router: 'admin/security/bouncer-devices',
            Collection: BouncerDeviceList,
            itemViewClass: BouncerDeviceView,

            viewDialogOptions: {
                header: false,
                size: 'xl'
            },

            defaultQuery: {
                sort: '-last_seen',
            },

            columns: [
                {
                    key: 'muid',
                    label: 'MUID',
                    template: '<code>{{model.muid|truncate_middle(16)}}</code>',
                    sortable: true,
                    filter: { type: 'text' }
                },
                {
                    key: 'risk_tier',
                    label: 'Risk Tier',
                    sortable: true,
                    formatter: (value) => {
                        const classes = {
                            blocked: 'bg-danger',
                            high: 'bg-danger',
                            medium: 'bg-warning',
                            low: 'bg-success',
                            unknown: 'bg-secondary'
                        };
                        return `<span class="badge ${classes[value] || 'bg-secondary'}">${(value || 'unknown').toUpperCase()}</span>`;
                    },
                    filter: {
                        type: 'select',
                        options: ['unknown', 'low', 'medium', 'high', 'blocked']
                    }
                },
                {
                    key: 'event_count',
                    label: 'Events',
                    sortable: true
                },
                {
                    key: 'block_count',
                    label: 'Blocks',
                    sortable: true
                },
                {
                    key: 'last_seen_ip',
                    label: 'Last IP',
                    template: '<code>{{model.last_seen_ip|default("—")}}</code>'
                },
                {
                    key: 'last_seen',
                    label: 'Last Seen',
                    formatter: 'relative',
                    sortable: true
                }
            ],

            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            showRefresh: true,
            showAdd: false,
            showExport: true,

            emptyMessage: 'No bouncer devices tracked yet.',

            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }
}
