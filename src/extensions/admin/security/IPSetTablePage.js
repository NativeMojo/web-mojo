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

// IPSet.EDIT_FORM is registered on the model (IPSet.js). Add is custom (see
// _handleAdd) because of the country-code → name/source/description transform.
IPSet.VIEW_CLASS = IPSetView;

class IPSetTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_ipsets',
            pageName: 'IP Sets',
            router: 'admin/security/ipsets',
            Collection: IPSetList,
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
                        type: 'boolean',
                        trueLabel: 'Enabled',
                        falseLabel: 'Disabled'
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
                    formatter: "truncate(40)|default('—')",
                    visibility: 'lg'
                },
                { key: 'cidr_count', label: 'CIDRs', width: '80px', sortable: true, align: 'right', visibility: 'md' },
                {
                    key: 'source', label: 'Source', width: '110px',
                    visibility: 'md',
                    formatter: (value) => {
                        const opt = IPSetSourceOptions.find(o => o.value === value);
                        return opt ? opt.label : (value || '—');
                    }
                },
                {
                    key: 'last_synced|datetime', label: 'Last Synced', width: '160px', sortable: true,
                    visibility: 'lg'
                },
                {
                    key: 'sync_error', label: 'Status', width: '80px',
                    visibility: 'lg',
                    formatter: (value) => {
                        if (value) return '<span class="text-danger" title="' + value + '"><i class="bi bi-exclamation-triangle"></i> Error</span>';
                        return '<span class="text-success"><i class="bi bi-check-circle"></i></span>';
                    }
                },
            ],

            selectable: true,
            searchable: true,
            searchPlaceholder: 'Search name, description, or kind',
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

    onActionBatchEnable()  { return this.batchAction({ field: 'enable',         value: 1, label: 'Enable' }); }
    onActionBatchDisable() { return this.batchAction({ field: 'disable',        value: 1, label: 'Disable' }); }
    onActionBatchSync()    { return this.batchAction({ field: 'sync',           value: 1, label: 'Sync' }); }
    onActionBatchRefresh() { return this.batchAction({ field: 'refresh_source', value: 1, label: 'Refresh' }); }
    onActionBatchDelete()  { return this.batchAction({ destroy: true,                     label: 'Delete' }); }
}

export default IPSetTablePage;
