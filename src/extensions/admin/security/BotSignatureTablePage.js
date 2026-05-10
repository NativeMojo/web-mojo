/**
 * BotSignatureTablePage - Bot signature management with full CRUD
 *
 * Manages auto-learned and manual bot signatures used by the
 * bouncer pre-screening system. Supports create, enable/disable, delete.
 */

import TablePage from '@core/pages/TablePage.js';
import { BouncerSignatureList } from '@ext/admin/models/Bouncer.js';

// BouncerSignature.ADD_FORM / EDIT_FORM are registered on the model (Bouncer.js).
export default class BotSignatureTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_bot_signatures',
            pageName: 'Bot Signatures',
            router: 'admin/security/bot-signatures',
            Collection: BouncerSignatureList,

            viewDialogOptions: {
                size: 'lg'
            },

            defaultQuery: {
                sort: '-modified',
            },

            dayRangeFilter: true,
            searchPlaceholder: 'Search signature value or notes',

            columns: [
                {
                    key: 'sig_type',
                    label: 'Type',
                    formatter: 'badge',
                    sortable: true,
                    filter: {
                        type: 'select',
                        options: ['user_agent', 'ip_pattern', 'fingerprint', 'behavior', 'header', 'cookie']
                    }
                },
                {
                    key: 'value',
                    label: 'Value',
                    formatter: 'truncate(60)',
                    filter: { type: 'text' }
                },
                {
                    key: 'source',
                    label: 'Source',
                    formatter: (value) => {
                        const cls = value === 'auto' ? 'bg-info' : 'bg-primary';
                        return `<span class="badge ${cls}">${(value || 'unknown').toUpperCase()}</span>`;
                    },
                    filter: {
                        type: 'select',
                        options: ['auto', 'manual']
                    }
                },
                {
                    key: 'confidence',
                    label: 'Confidence',
                    sortable: true,
                    formatter: (value) => `${value || 0}%`
                },
                {
                    key: 'hit_count',
                    label: 'Hits',
                    sortable: true
                },
                {
                    key: 'is_active',
                    label: 'Active',
                    formatter: (value) => {
                        return value
                            ? '<span class="badge bg-success">ON</span>'
                            : '<span class="badge bg-secondary">OFF</span>';
                    },
                    filter: {
                        type: 'boolean',
                        trueLabel: 'Active',
                        falseLabel: 'Inactive'
                    }
                },
                {
                    key: 'expires_at',
                    label: 'Expires',
                    formatter: 'datetime|default("Never")'
                }
            ],

            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,
            selectable: true,

            showRefresh: true,
            showAdd: true,
            showExport: true,

            emptyMessage: 'No bot signatures. Click "Add" to create a manual signature.',

            batchBarLocation: 'top',
            batchActions: [
                { label: 'Enable', icon: 'bi bi-check-circle', action: 'enable' },
                { label: 'Disable', icon: 'bi bi-pause-circle', action: 'disable' },
                { label: 'Delete', icon: 'bi bi-trash', action: 'delete' },
            ],

            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }

    onActionBatchEnable()  { return this.batchAction({ field: 'is_active', value: true,  label: 'Enable' }); }
    onActionBatchDisable() { return this.batchAction({ field: 'is_active', value: false, label: 'Disable' }); }
    onActionBatchDelete()  { return this.batchAction({ destroy: true,                    label: 'Delete' }); }
}
