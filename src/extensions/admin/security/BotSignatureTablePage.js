/**
 * BotSignatureTablePage - Bot signature management with full CRUD
 *
 * Manages auto-learned and manual bot signatures used by the
 * bouncer pre-screening system. Supports create, enable/disable, delete.
 */

import TablePage from '@core/pages/TablePage.js';
import { BouncerSignatureList, BouncerSignatureForms } from '@ext/admin/models/Bouncer.js';

export default class BotSignatureTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_bot_signatures',
            pageName: 'Bot Signatures',
            router: 'admin/security/bot-signatures',
            Collection: BouncerSignatureList,

            formCreate: BouncerSignatureForms.create,
            formEdit: BouncerSignatureForms.edit,

            viewDialogOptions: {
                size: 'lg'
            },

            defaultQuery: {
                sort: '-modified',
            },

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
                        type: 'select',
                        options: [
                            { label: 'Active', value: 'true' },
                            { label: 'Inactive', value: 'false' }
                        ]
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

    async onActionBatchEnable() {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;

        await Promise.all(selected.map(item => item.model.save({ is_active: true })));
        this.getApp().toast.success(`${selected.length} signature(s) enabled`);
        this.tableView.collection.fetch();
    }

    async onActionBatchDisable() {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;

        await Promise.all(selected.map(item => item.model.save({ is_active: false })));
        this.getApp().toast.success(`${selected.length} signature(s) disabled`);
        this.tableView.collection.fetch();
    }

    async onActionBatchDelete() {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;

        const confirmed = await this.getApp().confirm(
            `Delete ${selected.length} signature${selected.length > 1 ? 's' : ''}? This cannot be undone.`
        );
        if (!confirmed) return;

        await Promise.all(selected.map(item => item.model.destroy()));
        this.getApp().toast.success(`${selected.length} signature(s) deleted`);
        this.tableView.collection.fetch();
    }
}
