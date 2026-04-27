/**
 * ShortLinkTablePage - Manage application shortlinks (/s/<code>)
 *
 * Lists all shortlinks with CRUD, filtering, and search. The Add/Edit dialogs
 * expose OG metadata fields (og:title, og:description, og:image) as flat form
 * inputs; a custom submit handler collapses them into the REST API's
 * metadata map.
 *
 * Route: system/shortlinks/links
 */

import TablePage from '@core/pages/TablePage.js';
import Modal from '@core/views/feedback/Modal.js';
import {
    ShortLink,
    ShortLinkList,
    ShortLinkForms,
    SHORTLINK_SOURCE_OPTIONS,
    flattenShortLinkMetadata,
    extractShortLinkPayload,
} from '@core/models/ShortLink.js';
import ShortLinkView, { getShortUrl } from './ShortLinkView.js';

class ShortLinkTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_shortlinks',
            pageName: 'Shortlinks',
            router: 'admin/shortlinks/links',
            Collection: ShortLinkList,
            itemViewClass: ShortLinkView,
            onAdd: () => this._handleAdd(),
            onItemEdit: (model) => this._handleEdit(model),

            viewDialogOptions: {
                header: false,
                size: 'xl',
            },

            defaultQuery: {
                sort: '-created',
            },

            columns: [
                {
                    key: 'is_active',
                    label: 'Active',
                    width: '70px',
                    sortable: true,
                    formatter: 'yesnoicon',
                    filter: {
                        type: 'select',
                        options: [
                            { value: 'true', label: 'Active' },
                            { value: 'false', label: 'Disabled' },
                        ],
                    },
                },
                {
                    key: 'code',
                    label: 'Code',
                    sortable: true,
                    template: `
                        <div class="d-flex align-items-center gap-2">
                            <code>{{model.code}}</code>
                            <button class="btn btn-sm btn-link p-0 text-muted"
                                    data-action="copy-code"
                                    data-code="{{model.code}}"
                                    title="Copy short URL">
                                <i class="bi bi-clipboard"></i>
                            </button>
                        </div>
                    `,
                },
                {
                    key: 'url',
                    label: 'Destination',
                    sortable: true,
                    formatter: "truncate(60)|default('—')",
                },
                {
                    key: 'source',
                    label: 'Source',
                    width: '110px',
                    sortable: true,
                    filter: {
                        type: 'select',
                        options: SHORTLINK_SOURCE_OPTIONS,
                    },
                },
                {
                    key: 'hit_count',
                    label: 'Hits',
                    width: '80px',
                    sortable: true,
                },
                {
                    key: 'track_clicks',
                    label: 'Tracked',
                    width: '90px',
                    formatter: 'yesnoicon',
                    filter: {
                        type: 'select',
                        options: [
                            { value: 'true', label: 'Tracked' },
                            { value: 'false', label: 'Not tracked' },
                        ],
                    },
                },
                {
                    key: 'expires_at',
                    label: 'Expires',
                    width: '160px',
                    sortable: true,
                    formatter: "datetime|default('Never')",
                },
                {
                    key: 'created',
                    label: 'Created',
                    width: '160px',
                    sortable: true,
                    formatter: 'datetime',
                    visibility: 'lg',
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

            emptyMessage: 'No shortlinks yet — create one to share a link with a rich preview card.',

            batchBarLocation: 'top',
            batchActions: [
                { label: 'Enable', icon: 'bi bi-toggle-on', action: 'enable' },
                { label: 'Disable', icon: 'bi bi-toggle-off', action: 'disable' },
                { label: 'Delete', icon: 'bi bi-trash', action: 'delete', danger: true },
            ],

            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false,
                actions: ['edit', 'delete'],
                pageSizes: [25, 50, 100],
                defaultPageSize: 25,
                emptyIcon: 'bi-link-45deg',
            },
        });
    }

    // ── Add/Edit handlers (flatten/unflatten metadata) ──

    async _handleAdd() {
        const result = await Modal.form({ ...ShortLinkForms.create });
        if (!result) return;

        const payload = extractShortLinkPayload(result);
        try {
            const model = new ShortLink();
            await model.save(payload);
            const shortUrl = getShortUrl(model, this.getApp());
            try {
                await navigator.clipboard?.writeText?.(shortUrl);
                this.getApp()?.toast?.success(`Shortlink created — ${shortUrl} copied to clipboard`);
            } catch (_e) {
                this.getApp()?.toast?.success(`Shortlink created: ${shortUrl}`);
            }
            this.tableView?.collection?.fetch();
        } catch (err) {
            Modal.showError(err?.data?.error || err?.message || 'Failed to create shortlink');
        }
    }

    async _handleEdit(model) {
        if (!model) return;
        const seed = {
            ...model.toJSON(),
            ...flattenShortLinkMetadata(model.get('metadata')),
        };
        const result = await Modal.form({
            ...ShortLinkForms.edit,
            data: seed,
        });
        if (!result) return;

        const payload = extractShortLinkPayload(result);
        try {
            await model.save(payload);
            this.getApp()?.toast?.success('Shortlink updated');
            this.tableView?.collection?.fetch();
        } catch (err) {
            Modal.showError(err?.data?.error || err?.message || 'Failed to update shortlink');
        }
    }

    // ── Row actions ──

    async onActionCopyCode(event, element) {
        event?.stopPropagation?.();
        const code = element?.dataset?.code;
        if (!code) return;
        const fakeModel = { get: (k) => (k === 'code' ? code : null) };
        const url = getShortUrl(fakeModel, this.getApp());
        try {
            await navigator.clipboard.writeText(url);
            this.getApp()?.toast?.success(`Copied: ${url}`);
        } catch (_e) {
            this.getApp()?.toast?.warning('Copy failed — select the URL manually.');
        }
    }

    // ── Batch actions ──

    async onActionBatchEnable() {
        const selected = this.tableView?.getSelectedItems?.() || [];
        if (!selected.length) return;
        const confirmed = await this.getApp().confirm(`Enable ${selected.length} shortlink(s)?`);
        if (!confirmed) return;
        await Promise.all(selected.map((item) => item.model.save({ is_active: true })));
        this.getApp().toast.success(`${selected.length} shortlink(s) enabled`);
        this.tableView.collection.fetch();
    }

    async onActionBatchDisable() {
        const selected = this.tableView?.getSelectedItems?.() || [];
        if (!selected.length) return;
        const confirmed = await this.getApp().confirm(`Disable ${selected.length} shortlink(s)?`);
        if (!confirmed) return;
        await Promise.all(selected.map((item) => item.model.save({ is_active: false })));
        this.getApp().toast.success(`${selected.length} shortlink(s) disabled`);
        this.tableView.collection.fetch();
    }

    async onActionBatchDelete() {
        const selected = this.tableView?.getSelectedItems?.() || [];
        if (!selected.length) return;
        const confirmed = await Modal.confirm(
            `Delete ${selected.length} shortlink(s)? This cannot be undone.`,
            'Delete Shortlinks',
            { confirmText: 'Delete', confirmClass: 'btn-danger' },
        );
        if (!confirmed) return;
        await Promise.all(selected.map((item) => item.model.destroy()));
        this.getApp().toast.success(`${selected.length} shortlink(s) deleted`);
        this.tableView.collection.fetch();
    }
}

export default ShortLinkTablePage;
