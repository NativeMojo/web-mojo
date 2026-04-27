/**
 * IPSetTablePage - Manage kernel-level IP blocking sets
 *
 * Supports country blocking, abuse feeds (AbuseIPDB), datacenter ranges,
 * and custom CIDR lists. Fleet-wide sync via ipset + iptables.
 *
 * Route: system/security/ipsets
 */

import TablePage from '@core/pages/TablePage.js';
import Modal from '@core/views/feedback/Modal.js';
import { IPSet, IPSetList, IPSetForms, IPSetKindBadgeOptions, IPSetSourceOptions, CommonBlockCountries } from '@ext/admin/models/IPSet.js';
import IPSetView from './IPSetView.js';

class IPSetTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_ipsets',
            pageName: 'IP Sets',
            router: 'admin/security/ipsets',
            Collection: IPSetList,
            itemViewClass: IPSetView,
            formEdit: IPSetForms.edit,
            onAdd: () => this._handleAdd(),

            viewDialogOptions: {
                header: false,
                size: 'xl'
            },

            defaultQuery: {
                sort: 'name',
            },

            columns: [
                {
                    key: 'is_enabled', label: 'Active', width: '70px', sortable: true,
                    formatter: 'yesnoicon',
                    filter: {
                        type: 'select',
                        options: [
                            { value: 'true', label: 'Enabled' },
                            { value: 'false', label: 'Disabled' }
                        ]
                    }
                },
                { key: 'name', label: 'Name', sortable: true },
                {
                    key: 'kind', label: 'Kind', sortable: true, width: '120px',
                    formatter: (value) => {
                        const opt = IPSetKindBadgeOptions.find(o => o.value === value);
                        return `<span class="badge bg-primary bg-opacity-75">${opt ? opt.label : value}</span>`;
                    },
                    filter: {
                        type: 'select',
                        options: IPSetKindBadgeOptions
                    }
                },
                {
                    key: 'description', label: 'Description',
                    formatter: "truncate(40)|default('—')"
                },
                { key: 'cidr_count', label: 'CIDRs', width: '80px', sortable: true },
                {
                    key: 'source', label: 'Source', width: '110px',
                    formatter: (value) => {
                        const opt = IPSetSourceOptions.find(o => o.value === value);
                        return opt ? opt.label : (value || '—');
                    }
                },
                {
                    key: 'last_synced|datetime', label: 'Last Synced', width: '160px', sortable: true,
                },
                {
                    key: 'sync_error', label: 'Status', width: '80px',
                    formatter: (value) => {
                        if (value) return '<span class="text-danger" title="' + value + '"><i class="bi bi-exclamation-triangle"></i> Error</span>';
                        return '<span class="text-success"><i class="bi bi-check-circle"></i></span>';
                    }
                },
            ],

            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,
            showRefresh: true,
            showAdd: true,
            showExport: true,

            emptyMessage: 'No IP sets configured. Create one to start blocking traffic at the network level.',

            batchBarLocation: 'top',
            batchActions: [
                { label: 'Enable', icon: 'bi bi-toggle-on', action: 'enable' },
                { label: 'Disable', icon: 'bi bi-toggle-off', action: 'disable' },
                { label: 'Sync to Fleet', icon: 'bi bi-broadcast', action: 'sync' },
                { label: 'Refresh Source', icon: 'bi bi-arrow-clockwise', action: 'refresh' },
                { label: 'Delete', icon: 'bi bi-trash', action: 'delete', danger: true },
            ],

            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }

    /**
     * Custom add handler — transforms country_code into proper IPSet fields
     */
    async _handleAdd() {
        const result = await Modal.form({
            ...IPSetForms.create
        });
        if (!result) return;

        // Transform form data based on kind
        if (result.kind === 'country' && result.country_code) {
            const cc = result.country_code;
            const countryOpt = CommonBlockCountries.find(o => o.value === cc);
            result.name = `country_${cc}`;
            result.source = 'ipdeny';
            result.description = countryOpt ? `Country block: ${countryOpt.label}` : `Country block: ${cc.toUpperCase()}`;
            delete result.country_code;
        } else if (result.kind === 'abuse') {
            result.source = 'abuseipdb';
        } else if (result.kind === 'datacenter' || result.kind === 'custom') {
            result.source = 'manual';
        }

        const model = new IPSet();
        const resp = await model.save(result);
        if (resp?.data?.status) {
            this.getApp()?.toast?.success('IP Set created');
            this.tableView?.collection?.fetch();
        } else {
            Modal.showError(resp?.data?.error || 'Failed to create IP Set');
        }
    }

    // ── Batch Actions ──

    async onActionBatchEnable() {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;
        const confirmed = await this.getApp().confirm(`Enable ${selected.length} IP set(s)? They will be synced to the fleet.`);
        if (!confirmed) return;
        await Promise.all(selected.map(item => item.model.save({ enable: 1 })));
        this.getApp().toast.success(`${selected.length} IP set(s) enabled`);
        this.tableView.collection.fetch();
    }

    async onActionBatchDisable() {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;
        const confirmed = await this.getApp().confirm(`Disable ${selected.length} IP set(s)? They will be removed from the fleet.`);
        if (!confirmed) return;
        await Promise.all(selected.map(item => item.model.save({ disable: 1 })));
        this.getApp().toast.success(`${selected.length} IP set(s) disabled`);
        this.tableView.collection.fetch();
    }

    async onActionBatchSync() {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;
        const confirmed = await this.getApp().confirm(`Sync ${selected.length} IP set(s) to all fleet instances?`);
        if (!confirmed) return;
        await Promise.all(selected.map(item => item.model.save({ sync: 1 })));
        this.getApp().toast.success(`${selected.length} IP set(s) syncing to fleet`);
        this.tableView.collection.fetch();
    }

    async onActionBatchRefresh() {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;
        const confirmed = await this.getApp().confirm(`Refresh source data for ${selected.length} IP set(s)?`);
        if (!confirmed) return;
        await Promise.all(selected.map(item => item.model.save({ refresh_source: 1 })));
        this.getApp().toast.success(`${selected.length} IP set(s) refreshing`);
        this.tableView.collection.fetch();
    }

    async onActionBatchDelete() {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;
        const confirmed = await Modal.confirm(
            `Delete ${selected.length} IP set(s)? They will be removed from all fleet instances. This cannot be undone.`,
            'Delete IP Sets',
            { confirmText: 'Delete', confirmClass: 'btn-danger' }
        );
        if (!confirmed) return;
        await Promise.all(selected.map(item => item.model.destroy()));
        this.getApp().toast.success(`${selected.length} IP set(s) deleted`);
        this.tableView.collection.fetch();
    }
}

export default IPSetTablePage;
