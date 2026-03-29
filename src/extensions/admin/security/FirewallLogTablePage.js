/**
 * FirewallLogTablePage - Firewall activity log
 *
 * Shows log entries filtered to kind__startswith=firewall: so admins
 * can see block/unblock/whitelist history.
 */

import TablePage from '@core/pages/TablePage.js';
import { LogList } from '@core/models/Log.js';
import LogView from '../monitoring/LogView.js';

export default class FirewallLogTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_firewall_log',
            pageName: 'Firewall Log',
            router: 'admin/security/firewall-log',
            Collection: LogList,
            itemViewClass: LogView,

            viewDialogOptions: {
                header: false,
                size: 'xl'
            },

            defaultQuery: {
                sort: '-created',
                kind__startswith: 'firewall:',
            },

            columns: [
                {
                    key: 'created',
                    label: 'Timestamp',
                    formatter: 'datetime',
                    sortable: true,
                    filter: { type: 'daterange' }
                },
                {
                    key: 'kind',
                    label: 'Action',
                    sortable: true,
                    filter: { type: 'text' }
                },
                {
                    key: 'message',
                    label: 'Details',
                    formatter: 'truncate(80)'
                },
                {
                    key: 'path',
                    label: 'IP / Path',
                    formatter: 'truncate(40)'
                },
                {
                    key: 'user',
                    label: 'Admin',
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

            emptyMessage: 'No firewall log entries found.',

            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }
}
