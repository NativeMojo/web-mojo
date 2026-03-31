/**
 * BlockedIPsTablePage - Active IP blocks management
 *
 * Filtered view of GeoLocatedIP records where is_blocked=true.
 * Provides unblock and whitelist actions from the table.
 */

import TablePage from '@core/pages/TablePage.js';
import { GeoLocatedIPList } from '@core/models/System.js';
import GeoIPView from '../account/devices/GeoIPView.js';

export default class BlockedIPsTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_blocked_ips',
            pageName: 'Blocked IPs',
            router: 'admin/security/blocked-ips',
            Collection: GeoLocatedIPList,
            itemViewClass: GeoIPView,

            viewDialogOptions: {
                header: false,
                size: 'xl'
            },

            defaultQuery: {
                sort: '-modified',
                is_blocked: true,
            },

            columns: [
                {
                    key: 'ip_address',
                    label: 'IP Address',
                    sortable: true,
                    template: '<code>{{model.ip_address}}</code>'
                },
                {
                    key: 'threat_level',
                    label: 'Threat Level',
                    sortable: true,
                    filter: {
                        type: 'select',
                        options: ['none', 'low', 'medium', 'high', 'critical']
                    }
                },
                {
                    key: 'country_code',
                    label: 'Country',
                    sortable: true,
                    filter: { type: 'text' }
                },
                {
                    key: 'city',
                    label: 'City',
                    sortable: true
                },
                {
                    key: 'org',
                    label: 'Organization',
                    formatter: 'truncate(40)'
                },
                {
                    key: 'modified',
                    label: 'Blocked At',
                    formatter: 'datetime',
                    sortable: true
                }
            ],

            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,
            selectable: true,

            showRefresh: true,
            showAdd: false,
            showExport: true,

            emptyMessage: 'No blocked IPs. The firewall has no active IP blocks.',

            batchBarLocation: 'top',
            batchActions: [
                { label: 'Unblock', icon: 'bi bi-unlock', action: 'unblock' },
                { label: 'Whitelist', icon: 'bi bi-check-circle', action: 'whitelist' },
            ],

            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }

    async onActionBatchUnblock() {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;

        const confirmed = await this.getApp().confirm(
            `Unblock ${selected.length} IP${selected.length > 1 ? 's' : ''}?`
        );
        if (!confirmed) return;

        await Promise.all(selected.map(item =>
            this.getApp().rest.POST(`/api/system/geoip/${item.model.id}`, {
                action: 'unblock',
                value: 'Bulk unblock from admin'
            })
        ));
        this.getApp().toast.success(`${selected.length} IP(s) unblocked`);
        this.tableView.collection.fetch();
    }

    async onActionBatchWhitelist() {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;

        const confirmed = await this.getApp().confirm(
            `Whitelist ${selected.length} IP${selected.length > 1 ? 's' : ''}?`
        );
        if (!confirmed) return;

        await Promise.all(selected.map(item =>
            this.getApp().rest.POST(`/api/system/geoip/${item.model.id}`, {
                action: 'whitelist',
                value: 'Bulk whitelist from admin'
            })
        ));
        this.getApp().toast.success(`${selected.length} IP(s) whitelisted`);
        this.tableView.collection.fetch();
    }
}
