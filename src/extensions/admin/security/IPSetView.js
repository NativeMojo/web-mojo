/**
 * IPSetView - Detail view for an IPSet record
 *
 * TabView layout: Configuration overview + CIDR data viewer.
 * Context menu for fleet operations: sync, enable/disable, refresh, delete.
 */

import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import DataView from '@core/views/data/DataView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import Dialog from '@core/views/feedback/Dialog.js';
import { IPSet, IPSetForms, IPSetKindBadgeOptions, IPSetSourceOptions } from '@core/models/IPSet.js';

class IPSetView extends View {
    constructor(options = {}) {
        super({
            className: 'ipset-view',
            ...options
        });

        this.model = options.model || new IPSet(options.data || {});

        const kind = this.model.get('kind') || '';
        const kindOpt = IPSetKindBadgeOptions.find(o => o.value === kind);
        this.kindLabel = kindOpt ? kindOpt.label : kind;
        this.isEnabled = !!this.model.get('is_enabled');
        this.enabledLabel = this.isEnabled ? 'Enabled' : 'Disabled';
        this.enabledBadge = this.isEnabled ? 'bg-success' : 'bg-secondary';

        this.template = `
            <div class="ipset-view-container">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <div class="d-flex align-items-center gap-3">
                        <div class="fs-1 text-primary">
                            <i class="bi bi-shield-shaded"></i>
                        </div>
                        <div>
                            <h4 class="mb-1">{{model.name}}</h4>
                            {{#model.description}}
                                <div class="text-muted mb-1">{{model.description}}</div>
                            {{/model.description}}
                            <div class="d-flex align-items-center gap-2">
                                <span class="badge bg-primary">{{kindLabel}}</span>
                                <span class="badge {{enabledBadge}}">{{enabledLabel}}</span>
                                {{#model.cidr_count}}
                                    <span class="badge bg-light text-dark border">{{model.cidr_count}} CIDRs</span>
                                {{/model.cidr_count}}
                            </div>
                        </div>
                    </div>
                    <div data-container="ipset-context-menu"></div>
                </div>

                <!-- Tabs -->
                <div data-container="ipset-tabs"></div>
            </div>
        `;
    }

    async onInit() {
        // ── Configuration tab ──
        const sourceVal = this.model.get('source') || '';
        const sourceOpt = IPSetSourceOptions.find(o => o.value === sourceVal);
        const sourceLabel = sourceOpt ? sourceOpt.label : sourceVal;

        const lastSynced = this.model.get('last_synced');
        const syncError = this.model.get('sync_error');

        const configFields = [
            { name: 'name', label: 'Name', cols: 6 },
            { name: 'kind', label: 'Kind', template: this.kindLabel, cols: 3 },
            { name: 'is_enabled', label: 'Enabled', formatter: 'yesnoicon', cols: 3 },
            { name: 'description', label: 'Description', cols: 12 },
            { name: 'source', label: 'Source', template: sourceLabel, cols: 4 },
            { name: 'source_url', label: 'Source URL', cols: 8 },
            { name: 'cidr_count', label: 'CIDRs Loaded', cols: 4 },
            {
                name: 'last_synced',
                label: 'Last Synced',
                template: lastSynced ? new Date(lastSynced).toLocaleString() : 'Never',
                cols: 4
            },
            {
                name: 'sync_error',
                label: 'Sync Status',
                template: syncError
                    ? `<span class="text-danger">${syncError}</span>`
                    : '<span class="text-success"><i class="bi bi-check-circle me-1"></i>OK</span>',
                cols: 4
            },
        ];

        this.configView = new DataView({
            model: this.model,
            className: 'p-3',
            columns: 2,
            showEmptyValues: true,
            emptyValueText: '—',
            fields: configFields
        });

        // ── CIDR Data tab ──
        this.cidrView = new View({
            className: 'p-3',
            ipsetModel: this.model,
            cidrData: null,
            cidrLoading: true,
            template: `
                {{#cidrLoading|bool}}
                <div class="text-center py-4 text-muted">
                    <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                    Loading CIDR data...
                </div>
                {{/cidrLoading|bool}}
                {{^cidrLoading|bool}}
                    {{#cidrData}}
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="text-muted small">{{ipsetModel.cidr_count}} CIDRs loaded</span>
                        <button class="btn btn-outline-secondary btn-sm" data-action="copy-cidrs" data-bs-toggle="tooltip" title="Copy to clipboard">
                            <i class="bi bi-clipboard me-1"></i>Copy
                        </button>
                    </div>
                    <pre class="bg-light border rounded p-3 small" style="max-height: 500px; overflow-y: auto;"><code>{{cidrData}}</code></pre>
                    {{/cidrData}}
                    {{^cidrData}}
                    <div class="text-center py-5 text-muted">
                        <i class="bi bi-database fs-1 mb-2 d-block"></i>
                        <p>No CIDRs loaded.</p>
                        <button class="btn btn-primary btn-sm" data-action="refresh-source">
                            <i class="bi bi-arrow-clockwise me-1"></i>Refresh Source
                        </button>
                    </div>
                    {{/cidrData}}
                {{/cidrLoading|bool}}
            `,
            async onInit() {
                try {
                    const resp = await this.ipsetModel.rest.GET(
                        `${this.ipsetModel.endpoint}/${this.ipsetModel.id}`,
                        { graph: 'detailed' }
                    );
                    if (resp.success || resp.status === 200) {
                        const data = resp.data?.data || resp.data;
                        this.cidrData = data?.data || null;
                    }
                } catch (_e) {
                    // Failed to load
                }
                this.cidrLoading = false;
            },
            async onActionCopyCidrs() {
                if (this.cidrData) {
                    await navigator.clipboard.writeText(this.cidrData);
                    this.getApp()?.toast?.success('CIDRs copied to clipboard');
                }
            },
            async onActionRefreshSource() {
                const resp = await this.ipsetModel.save({ refresh_source: 1 });
                if (resp.success || resp.status === 200) {
                    this.getApp()?.toast?.success('Refreshing source — this may take a moment');
                } else {
                    this.getApp()?.toast?.error('Failed to refresh source');
                }
            }
        });

        // ── TabView ──
        this.tabView = new TabView({
            containerId: 'ipset-tabs',
            tabs: {
                'Configuration': this.configView,
                'CIDR Data': this.cidrView
            },
            activeTab: 'Configuration'
        });
        this.addChild(this.tabView);

        // ── Context Menu ──
        const isEnabled = this.model.get('is_enabled');
        const contextMenu = new ContextMenu({
            containerId: 'ipset-context-menu',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Sync to Fleet', action: 'sync-fleet', icon: 'bi-broadcast' },
                    { label: 'Refresh Source', action: 'refresh-source', icon: 'bi-arrow-clockwise' },
                    { type: 'divider' },
                    isEnabled
                        ? { label: 'Disable', action: 'disable-ipset', icon: 'bi-toggle-off' }
                        : { label: 'Enable', action: 'enable-ipset', icon: 'bi-toggle-on' },
                    { label: 'Edit IP Set', action: 'edit-ipset', icon: 'bi-pencil' },
                    { type: 'divider' },
                    { label: 'Delete IP Set', action: 'delete-ipset', icon: 'bi-trash', danger: true }
                ]
            }
        });
        this.addChild(contextMenu);
    }

    // ── Actions ──

    async onActionSyncFleet() {
        const resp = await this.model.save({ sync: 1 });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success('Syncing to fleet...');
        } else {
            this.getApp()?.toast?.error('Sync failed');
        }
    }

    async onActionRefreshSource() {
        const resp = await this.model.save({ refresh_source: 1 });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success('Refreshing source data...');
        } else {
            this.getApp()?.toast?.error('Refresh failed');
        }
    }

    async onActionEnableIpset() {
        const resp = await this.model.save({ enable: 1 });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success('IP Set enabled and synced');
            await this.render();
        } else {
            this.getApp()?.toast?.error('Failed to enable');
        }
    }

    async onActionDisableIpset() {
        const confirmed = await Dialog.confirm(
            'Disable this IP set? It will be removed from iptables on all fleet instances.',
            'Disable IP Set'
        );
        if (!confirmed) return;

        const resp = await this.model.save({ disable: 1 });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success('IP Set disabled and removed from fleet');
            await this.render();
        } else {
            this.getApp()?.toast?.error('Failed to disable');
        }
    }

    async onActionEditIpset() {
        const resp = await Dialog.showModelForm({
            title: `Edit IP Set — ${this.model.get('name')}`,
            model: this.model,
            formConfig: IPSetForms.edit,
        });
        if (resp) {
            await this.render();
            this.getApp()?.toast?.success('IP Set updated');
        }
    }

    async onActionDeleteIpset() {
        const confirmed = await Dialog.confirm(
            `Delete IP set "${this.model.get('name')}"? This will remove it from all fleet instances. This cannot be undone.`,
            'Delete IP Set',
            { confirmText: 'Delete', confirmClass: 'btn-danger' }
        );
        if (!confirmed) return;

        try {
            await this.model.destroy();
            this.getApp()?.toast?.success('IP Set deleted');
            this.emit('ipset:deleted', { model: this.model });

            // Close the modal
            const dialog = this.element?.closest('.modal');
            if (dialog) {
                const bsModal = window.bootstrap?.Modal?.getInstance(dialog);
                if (bsModal) bsModal.hide();
            }
        } catch (error) {
            this.getApp()?.toast?.error(`Delete failed: ${error.message}`);
        }
    }
}

IPSet.VIEW_CLASS = IPSetView;

export default IPSetView;
