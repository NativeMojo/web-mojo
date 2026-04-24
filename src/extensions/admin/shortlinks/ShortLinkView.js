/**
 * ShortLinkView - Detail view for a ShortLink record
 *
 * Modal-hosted TabView with five tabs:
 *   Details | Preview | Metadata | Click History | Metrics
 *
 * Context menu exposes Copy Short URL, Open Destination, Enable/Disable,
 * Edit, Delete.
 */

import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import DataView from '@core/views/data/DataView.js';
import TableView from '@core/views/table/TableView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import Dialog from '@core/views/feedback/Dialog.js';
import Modal from '@core/views/feedback/Modal.js';
import FormView from '@core/forms/FormView.js';
import { MetricsChart } from '@ext/charts/index.js';
import {
    ShortLink,
    ShortLinkClickList,
    ShortLinkForms,
    SHORTLINK_SOURCE_OPTIONS,
    TWITTER_CARD_OPTIONS,
    flattenShortLinkMetadata,
    buildShortLinkMetadata,
    extractShortLinkPayload,
} from '@core/models/ShortLink.js';

// ── Helpers ────────────────────────────────────────────────

/**
 * Compose the full short URL for a ShortLink.
 * Prefers a server-supplied `short_link` field; otherwise builds
 * `{base}/s/<code>` using `app.config.shortlink_base_url` or
 * `window.location.origin`.
 */
function getShortUrl(model, app) {
    const serverUrl = model?.get?.('short_link');
    if (serverUrl) return serverUrl;
    const code = model?.get?.('code');
    if (!code) return '';
    const base =
        app?.config?.shortlink_base_url ||
        (typeof window !== 'undefined' ? window.location.origin : '');
    return `${String(base).replace(/\/+$/, '')}/s/${code}`;
}

function getDomain(url) {
    if (!url) return '';
    try {
        return new URL(url).hostname;
    } catch (_e) {
        return url;
    }
}

function isShortLinkExpired(model) {
    const raw = model?.get?.('expires_at');
    if (!raw) return false;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) && t < Date.now();
}

// ── ShortLinkView ──────────────────────────────────────────

class ShortLinkView extends View {
    constructor(options = {}) {
        super({
            className: 'shortlink-view',
            ...options,
        });

        this.model = options.model || new ShortLink(options.data || {});

        this._refreshHeader();

        this.template = `
            <div class="shortlink-view-container">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div class="d-flex align-items-start gap-3 flex-grow-1">
                        <div class="fs-1 text-primary"><i class="bi bi-link-45deg"></i></div>
                        <div class="flex-grow-1" style="min-width: 0;">
                            <div class="input-group input-group-lg mb-2" style="max-width: 620px;">
                                <input type="text" class="form-control font-monospace" readonly value="{{shortUrl}}">
                                <button class="btn btn-outline-primary" data-action="copy-short-url" title="Copy short URL">
                                    <i class="bi bi-clipboard"></i>
                                </button>
                                <a class="btn btn-outline-secondary" href="{{shortUrl}}" target="_blank" rel="noopener noreferrer" title="Open short URL in a new tab">
                                    <i class="bi bi-box-arrow-up-right"></i>
                                </a>
                            </div>
                            <div class="text-muted small text-truncate" style="max-width: 620px;" title="{{model.url}}">
                                <i class="bi bi-arrow-right"></i> {{model.url}}
                            </div>
                            <div class="d-flex align-items-center gap-2 mt-2 flex-wrap">
                                <span class="badge {{activeBadge}}">{{activeLabel}}</span>
                                {{#model.source}}<span class="badge bg-secondary">{{model.source}}</span>{{/model.source}}
                                {{#hasHits|bool}}<span class="badge bg-light text-dark border">{{model.hit_count}} hits</span>{{/hasHits|bool}}
                                {{#isExpired|bool}}<span class="badge bg-danger">Expired</span>{{/isExpired|bool}}
                                {{#model.track_clicks}}<span class="badge bg-info text-dark">Tracked</span>{{/model.track_clicks}}
                            </div>
                        </div>
                    </div>
                    <div data-container="shortlink-context-menu"></div>
                </div>

                <div data-container="shortlink-tabs"></div>
            </div>
        `;
    }

    _refreshHeader() {
        const app = this.getApp?.();
        this.shortUrl = getShortUrl(this.model, app);
        this.isActive = !!this.model.get('is_active');
        this.activeLabel = this.isActive ? 'Active' : 'Disabled';
        this.activeBadge = this.isActive ? 'bg-success' : 'bg-secondary';
        this.isExpired = isShortLinkExpired(this.model);
        this.hasHits = (this.model.get('hit_count') || 0) > 0;
    }

    async onInit() {
        await this._buildTabs();
        await this._buildContextMenu();
    }

    async _buildTabs() {
        // ── Details tab ──
        const sourceVal = this.model.get('source') || '';
        const sourceOpt = SHORTLINK_SOURCE_OPTIONS.find((o) => o.value === sourceVal);
        const sourceLabel = sourceOpt ? sourceOpt.label : (sourceVal || '—');

        this.detailsView = new DataView({
            model: this.model,
            className: 'p-3',
            columns: 2,
            showEmptyValues: true,
            emptyValueText: '—',
            fields: [
                { name: 'code', label: 'Code', template: `<code>${this.model.get('code') || '—'}</code>`, colSize: 4 },
                { name: 'source', label: 'Source', template: sourceLabel, colSize: 4 },
                { name: 'is_active', label: 'Active', type: 'boolean', colSize: 4 },
                { name: 'url', label: 'Destination', type: 'url', colSize: 12 },
                { name: 'hit_count', label: 'Hits', colSize: 3 },
                { name: 'track_clicks', label: 'Track clicks', type: 'boolean', colSize: 3 },
                { name: 'bot_passthrough', label: 'Bot passthrough', type: 'boolean', colSize: 3 },
                { name: 'is_protected', label: 'Protected', type: 'boolean', colSize: 3 },
                { name: 'expires_at', label: 'Expires', format: 'datetime', colSize: 6 },
                { name: 'created', label: 'Created', format: 'datetime', colSize: 6 },
                { name: 'modified', label: 'Modified', format: 'datetime', colSize: 6 },
                { name: 'user.username', label: 'Owner', colSize: 6 },
                { name: 'group.name', label: 'Group', colSize: 12 },
            ],
        });

        // ── Preview tab ──
        this.previewView = new (class extends View {
            constructor(opts) {
                super({ className: 'p-3', ...opts });
                this._syncFromModel();
                this.template = `
                    <p class="text-muted small mb-3">
                        Preview of how this link appears when shared in Slack, iMessage, WhatsApp, and other platforms that render OpenGraph metadata.
                    </p>
                    {{#hasOg|bool}}
                    <div class="card shadow-sm" style="max-width: 540px; border-left: 4px solid #0d6efd;">
                        {{#ogImage}}<img src="{{ogImage}}" class="card-img-top" style="max-height: 260px; object-fit: cover;" onerror="this.style.display='none'">{{/ogImage}}
                        <div class="card-body">
                            <div class="text-muted small mb-1">{{domain}}</div>
                            {{#ogTitle}}<h5 class="card-title mb-1">{{ogTitle}}</h5>{{/ogTitle}}
                            {{#ogDescription}}<p class="card-text small text-muted mb-0">{{ogDescription}}</p>{{/ogDescription}}
                        </div>
                    </div>
                    {{/hasOg|bool}}
                    {{^hasOg|bool}}
                    <div class="alert alert-info mb-0 small d-flex align-items-start gap-2">
                        <i class="bi bi-info-circle flex-shrink-0 mt-1"></i>
                        <div>
                            No OG metadata set on this link. The server auto-scrapes the destination URL in the background —
                            custom values entered in the <strong>Metadata</strong> tab take priority over scraped values.
                        </div>
                    </div>
                    {{/hasOg|bool}}
                `;
            }
            _syncFromModel() {
                const flat = flattenShortLinkMetadata(this.model?.get('metadata'));
                this.ogTitle = flat.og_title || '';
                this.ogDescription = flat.og_description || '';
                this.ogImage = flat.og_image || '';
                this.hasOg = !!(this.ogTitle || this.ogDescription || this.ogImage);
                this.domain = getDomain(this.model?.get('url'));
            }
            async refreshFromModel() {
                this._syncFromModel();
                if (this.isMounted?.()) await this.render();
            }
        })({ model: this.model });

        // ── Metadata tab (editable form) ──
        const metaSeed = flattenShortLinkMetadata(this.model.get('metadata'));
        this.metadataForm = new FormView({
            className: 'p-3',
            model: this.model,
            data: metaSeed,
            submitButtonText: 'Save Metadata',
            submitButtonClass: 'btn btn-primary',
            formConfig: {
                fields: [
                    { name: 'og_title', type: 'text', label: 'og:title', cols: 12 },
                    { name: 'og_description', type: 'textarea', label: 'og:description', rows: 3, cols: 12 },
                    { name: 'og_image', type: 'url', label: 'og:image', placeholder: 'https://…', cols: 12 },
                    { name: 'twitter_card', type: 'select', label: 'twitter:card', options: TWITTER_CARD_OPTIONS, cols: 6 },
                    { name: 'twitter_title', type: 'text', label: 'twitter:title', cols: 6 },
                    { name: 'twitter_description', type: 'textarea', label: 'twitter:description', rows: 2, cols: 12 },
                    { name: 'twitter_image', type: 'url', label: 'twitter:image', cols: 12 },
                ],
            },
        });
        this.metadataForm.on('submit', async (payload) => {
            const formData = payload?.data || payload;
            const metadata = buildShortLinkMetadata(formData);
            try {
                await this.model.save({ metadata });
                this.getApp()?.toast?.success('Metadata saved');
                await this.previewView.refreshFromModel();
            } catch (err) {
                Modal.showError(err?.data?.error || err?.message || 'Failed to save metadata');
            }
        });

        // ── Click History tab (lazy TableView) ──
        const clickCollection = new ShortLinkClickList({
            params: { shortlink: this.model.get('id'), sort: '-created', size: 25 },
        });
        this.clicksTable = new TableView({
            collection: clickCollection,
            className: 'p-2',
            hideActivePillNames: ['shortlink'],
            columns: [
                { key: 'created', label: 'Time', width: '180px', formatter: 'datetime', sortable: true },
                { key: 'ip', label: 'IP', width: '140px', template: '<code>{{model.ip}}</code>' },
                {
                    key: 'is_bot',
                    label: 'Bot',
                    width: '80px',
                    formatter: 'yesnoicon',
                    filter: {
                        type: 'select',
                        options: [
                            { value: 'true', label: 'Bots only' },
                            { value: 'false', label: 'Humans only' },
                        ],
                    },
                },
                { key: 'user_agent', label: 'User-Agent', formatter: 'truncate(60)' },
                { key: 'referer', label: 'Referer', formatter: "truncate(40)|default('—')" },
            ],
            searchable: false,
            sortable: true,
            filterable: true,
            paginated: true,
            tableOptions: {
                hover: true,
                size: 'sm',
                emptyMessage: this.model.get('track_clicks')
                    ? 'No clicks recorded yet.'
                    : 'Click tracking is disabled for this shortlink.',
                emptyIcon: 'bi-cursor',
                actions: [],
            },
        });

        // ── Metrics tab ──
        const trackClicks = !!this.model.get('track_clicks');
        const user = this.model.get('user');
        const userId = user?.id || user;
        const code = this.model.get('code');

        if (trackClicks && userId && code) {
            this.metricsChart = new MetricsChart({
                title: 'Clicks',
                slugs: [`sl:click:${code}`],
                account: `user-${userId}`,
                granularity: 'days',
                defaultDateRange: '30d',
                yAxis: { label: 'Clicks', beginAtZero: true },
                tooltip: { y: 'number' },
                height: 320,
            });
            this.metricsTab = new View({
                className: 'p-3',
                template: `<div data-container="shortlink-metrics-chart"></div>`,
            });
            this.metricsTab.addChild(this.metricsChart, 'shortlink-metrics-chart');
        } else {
            const reason = !trackClicks
                ? 'Click tracking is disabled — enable “Track clicks” on this shortlink to collect time-series data.'
                : 'No owning user on this shortlink — per-link metrics are recorded per user account.';
            this.metricsTab = new View({
                className: 'p-3',
                template: `
                    <div class="alert alert-info mb-0 d-flex align-items-start gap-2">
                        <i class="bi bi-info-circle flex-shrink-0 mt-1"></i>
                        <div>${reason}</div>
                    </div>
                `,
            });
        }

        // ── Assemble TabView ──
        this.tabView = new TabView({
            containerId: 'shortlink-tabs',
            tabs: {
                'Details': this.detailsView,
                'Preview': this.previewView,
                'Metadata': this.metadataForm,
                'Click History': this.clicksTable,
                'Metrics': this.metricsTab,
            },
            activeTab: 'Details',
        });
        this.addChild(this.tabView);
    }

    async _buildContextMenu() {
        const contextMenu = new ContextMenu({
            containerId: 'shortlink-context-menu',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Copy Short URL', action: 'copy-short-url', icon: 'bi-clipboard' },
                    { label: 'Open Destination', action: 'open-destination', icon: 'bi-box-arrow-up-right' },
                    { type: 'divider' },
                    this.isActive
                        ? { label: 'Disable', action: 'disable-shortlink', icon: 'bi-toggle-off' }
                        : { label: 'Enable', action: 'enable-shortlink', icon: 'bi-toggle-on' },
                    { label: 'Edit Shortlink', action: 'edit-shortlink', icon: 'bi-pencil' },
                    { type: 'divider' },
                    { label: 'Delete Shortlink', action: 'delete-shortlink', icon: 'bi-trash', danger: true },
                ],
            },
        });
        this.addChild(contextMenu);
    }

    // ── Actions ──

    async onActionCopyShortUrl() {
        if (!this.shortUrl) return;
        try {
            await navigator.clipboard.writeText(this.shortUrl);
            this.getApp()?.toast?.success(`Copied: ${this.shortUrl}`);
        } catch (_e) {
            this.getApp()?.toast?.warning('Copy failed — select the URL manually.');
        }
    }

    async onActionOpenDestination() {
        const url = this.model.get('url');
        if (!url || !/^https?:\/\//i.test(url)) return;
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    async onActionEnableShortlink() {
        try {
            await this.model.save({ is_active: true });
            this.getApp()?.toast?.success('Shortlink enabled');
            this._refreshHeader();
            await this.render();
        } catch (err) {
            Modal.showError(err?.data?.error || err?.message || 'Failed to enable');
        }
    }

    async onActionDisableShortlink() {
        const confirmed = await Dialog.confirm(
            'Disable this shortlink? Visitors will be redirected to the fallback URL.',
            'Disable Shortlink',
        );
        if (!confirmed) return;
        try {
            await this.model.save({ is_active: false });
            this.getApp()?.toast?.success('Shortlink disabled');
            this._refreshHeader();
            await this.render();
        } catch (err) {
            Modal.showError(err?.data?.error || err?.message || 'Failed to disable');
        }
    }

    async onActionEditShortlink() {
        const seed = {
            ...this.model.toJSON(),
            ...flattenShortLinkMetadata(this.model.get('metadata')),
        };
        const result = await Modal.form({
            ...ShortLinkForms.edit,
            data: seed,
        });
        if (!result) return;
        const payload = extractShortLinkPayload(result);
        try {
            await this.model.save(payload);
            this.getApp()?.toast?.success('Shortlink updated');
            this._refreshHeader();
            await this.render();
            await this.previewView?.refreshFromModel?.();
        } catch (err) {
            Modal.showError(err?.data?.error || err?.message || 'Failed to update');
        }
    }

    async onActionDeleteShortlink() {
        const confirmed = await Dialog.confirm(
            `Delete shortlink "${this.model.get('code')}"? This cannot be undone.`,
            'Delete Shortlink',
            { confirmText: 'Delete', confirmClass: 'btn-danger' },
        );
        if (!confirmed) return;

        try {
            await this.model.destroy();
            this.getApp()?.toast?.success('Shortlink deleted');
            this.emit('shortlink:deleted', { model: this.model });

            const dialog = this.element?.closest?.('.modal');
            if (dialog) {
                const bsModal = window.bootstrap?.Modal?.getInstance?.(dialog);
                if (bsModal) bsModal.hide();
            }
        } catch (err) {
            Modal.showError(err?.data?.error || err?.message || 'Failed to delete');
        }
    }
}

ShortLink.VIEW_CLASS = ShortLinkView;

export default ShortLinkView;
export { getShortUrl };
