/**
 * BouncerSignalTablePage - Bot detection assessment audit trail
 *
 * Shows bouncer signal assessments with risk scores, decisions,
 * and triggered signals for each request evaluated.
 */

import TablePage from '@core/pages/TablePage.js';
import { BouncerSignalList } from '@ext/admin/models/Bouncer.js';
import BouncerSignalView from './BouncerSignalView.js';

export default class BouncerSignalTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_bouncer_signals',
            pageName: 'Bouncer Signals',
            router: 'admin/security/bouncer-signals',
            Collection: BouncerSignalList,
            itemViewClass: BouncerSignalView,

            viewDialogOptions: {
                header: false,
                size: 'xl'
            },

            defaultQuery: {
                sort: '-created',
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
                    key: 'ip_address',
                    label: 'IP',
                    template: '<code>{{model.ip_address}}</code>',
                    filter: { type: 'text' }
                },
                {
                    key: 'decision',
                    label: 'Decision',
                    formatter: (value) => {
                        const classes = { allow: 'bg-success', monitor: 'bg-warning', block: 'bg-danger' };
                        return `<span class="badge ${classes[value] || 'bg-secondary'}">${(value || 'unknown').toUpperCase()}</span>`;
                    },
                    filter: {
                        type: 'select',
                        options: ['allow', 'monitor', 'block']
                    }
                },
                {
                    key: 'risk_score',
                    label: 'Risk',
                    sortable: true,
                    formatter: (value) => {
                        const score = value || 0;
                        const color = score >= 80 ? 'danger' : score >= 50 ? 'warning' : score >= 20 ? 'info' : 'success';
                        return `<span class="text-${color} fw-semibold">${score}</span>`;
                    }
                },
                {
                    key: 'page_type',
                    label: 'Page',
                    filter: { type: 'text' }
                },
                {
                    key: 'stage',
                    label: 'Stage',
                    filter: {
                        type: 'select',
                        options: ['assess', 'submit', 'event']
                    }
                },
                {
                    key: 'muid',
                    label: 'Device',
                    formatter: 'truncate_middle(12)'
                }
            ],

            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            showRefresh: true,
            showAdd: false,
            showExport: true,

            emptyMessage: 'No bouncer signals recorded yet.',

            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }
}
