/**
 * ShortLinkView - Detail view for a ShortLink record, built on the
 * DetailView primitive (header + side-nav layout).
 *
 * Sections:
 *   Overview · Configuration ·
 *   ── Activity ──  Click History · Metrics
 *   ── Detail ──    OG / Social · Metadata
 *
 * Open via `Modal.detail(new ShortLinkView({ model }))` — pair with
 * `viewDialogOptions: { header: false, noBodyPadding: true,
 * buttons: [] }` when wired through TableView/TablePage. Inherits
 * `size: 'lg'` from `Modal.detail()`'s default.
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import DataView from '@core/views/data/DataView.js';
import MetricCard from '@core/views/data/MetricCard.js';
import TableView from '@core/views/table/TableView.js';
import Modal from '@core/views/feedback/Modal.js';
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
 * Compose the full short URL for a ShortLink. Prefers a server-supplied
 * `short_link` field; otherwise builds `{base}/s/<code>` using
 * `app.config.shortlink_base_url` or `window.location.origin`.
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

function expiresInDays(model) {
    const raw = model?.get?.('expires_at');
    if (!raw) return null;
    const t = new Date(raw).getTime();
    if (!Number.isFinite(t)) return null;
    const days = Math.round((t - Date.now()) / 86400000);
    return days;
}

function sourceLabel(value) {
    if (!value) return '';
    const opt = SHORTLINK_SOURCE_OPTIONS.find((o) => o.value === value);
    return opt ? opt.label : String(value);
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


// ── Overview section ───────────────────────────────────────

class ShortLinkOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'shortlink-overview-section',
            ...options,
        });
        this.clicksCollection = options.clicksCollection || null;
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const flat = flattenShortLinkMetadata(m.get('metadata'));
        const ogTitle = flat.og_title || '';
        const ogDescription = flat.og_description || '';
        const ogImage = flat.og_image || '';
        const hasOg = !!(ogTitle || ogDescription || ogImage);
        const domain = getDomain(m.get('url'));

        const totalHits = m.get('hit_count') || 0;
        const expiresAt = m.get('expires_at');
        const expiresLabel = expiresAt ? new Date(expiresAt).toISOString().slice(0, 10) : 'Never';

        const stats = this._summarizeClicks();

        // Inline preview card — recreates the "Slack/iMessage" mock from the
        // migration mockup. No new CSS — styled with existing Bootstrap card +
        // inline structural styling that mirrors the mockup's compact layout.
        const previewCardHtml = hasOg ? `
            <div class="border rounded p-2" style="background: var(--bs-secondary-bg);">
                <div class="d-flex gap-2">
                    ${ogImage
                        ? `<img src="${escapeHtml(ogImage)}" alt="" style="flex: 0 0 80px; height: 80px; border-radius: 0.4rem; object-fit: cover;">`
                        : `<div style="flex: 0 0 80px; height: 80px; border-radius: 0.4rem; background: linear-gradient(135deg, var(--bs-primary), var(--bs-info)); display: grid; place-items: center; color: white;"><i class="bi bi-link-45deg" style="font-size: 1.6rem;"></i></div>`
                    }
                    <div style="min-width: 0; flex: 1;">
                        <div class="text-secondary" style="font-size: 0.65rem;">${escapeHtml(domain)}</div>
                        ${ogTitle ? `<div class="fw-semibold" style="font-size: 0.82rem; line-height: 1.3;">${escapeHtml(ogTitle)}</div>` : ''}
                        ${ogDescription ? `<div class="text-secondary text-truncate" style="font-size: 0.72rem;">${escapeHtml(ogDescription)}</div>` : ''}
                    </div>
                </div>
            </div>
            <div class="text-secondary small mt-2">
                <i class="bi bi-info-circle me-1"></i>
                Pulled from <code>og:title</code>, <code>og:description</code>, <code>og:image</code> on the destination page.
            </div>
        ` : `
            <div class="alert alert-info mb-0 small d-flex align-items-start gap-2">
                <i class="bi bi-info-circle flex-shrink-0 mt-1"></i>
                <div>
                    No OG metadata set on this link. The server auto-scrapes the destination URL in the background —
                    custom values entered in <strong>OG / Social</strong> override scraped values.
                </div>
            </div>
        `;

        return `
            <div class="detail-kpi-grid">
                <div data-container="sl-kpi-30d"></div>
                <div data-container="sl-kpi-7d"></div>
                <div data-container="sl-kpi-today"></div>
                <div data-container="sl-kpi-bots"></div>
            </div>
            <div class="detail-pair">
                <div class="card">
                    <div class="card-body">
                        <div class="card-title"><i class="bi bi-chat-square-text"></i>Slack / iMessage preview</div>
                        ${previewCardHtml}
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div class="card-title"><i class="bi bi-graph-up"></i>Hits · last 30 days</div>
                        ${this._sparklineSvg(stats.byDay)}
                        <ul class="list-unstyled mb-0 small mt-2">
                            <li class="d-flex justify-content-between border-top border-opacity-25 py-1"><span class="text-secondary">Total hits</span><span>${escapeHtml(String(totalHits))}</span></li>
                            <li class="d-flex justify-content-between border-top border-opacity-25 py-1"><span class="text-secondary">Top referer</span><span>${stats.topReferer ? escapeHtml(stats.topReferer) : '<span class="text-tertiary">—</span>'}</span></li>
                            <li class="d-flex justify-content-between border-top border-opacity-25 py-1"><span class="text-secondary">Bot traffic</span><span>${stats.botPct == null ? '<span class="text-tertiary">—</span>' : `${stats.botPct}%`}</span></li>
                            <li class="d-flex justify-content-between border-top border-opacity-25 py-1"><span class="text-secondary">Avg / day (30d)</span><span>${stats.avgPerDay == null ? '<span class="text-tertiary">—</span>' : escapeHtml(String(stats.avgPerDay))}</span></li>
                            <li class="d-flex justify-content-between py-1"><span class="text-secondary">Expires</span><code>${escapeHtml(expiresLabel)}</code></li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Roll up the shared clicks collection into the numbers we need.
     * The collection is fetched with `created__gte = now - 30d` so its
     * models represent the 30-day window.
     */
    _summarizeClicks() {
        const models = this.clicksCollection?.models || [];
        const now = Date.now();
        const dayMs = 86400000;
        const start30 = now - 30 * dayMs;
        const start7 = now - 7 * dayMs;
        const startToday = new Date();
        startToday.setHours(0, 0, 0, 0);
        const startTodayMs = startToday.getTime();

        let count30 = 0, count7 = 0, countToday = 0, bots = 0;
        const byDay = new Array(30).fill(0);
        const refererCounts = new Map();

        for (const click of models) {
            const created = click.get?.('created');
            const t = created != null ? new Date(typeof created === 'number' ? (created < 1e11 ? created * 1000 : created) : created).getTime() : NaN;
            if (!Number.isFinite(t)) continue;
            if (t < start30) continue;
            count30++;
            const bucket = Math.min(29, Math.max(0, Math.floor((t - start30) / dayMs)));
            byDay[bucket]++;
            if (t >= start7) count7++;
            if (t >= startTodayMs) countToday++;
            if (click.get?.('is_bot')) bots++;
            const ref = click.get?.('referer');
            if (ref) {
                const host = getDomain(ref);
                if (host) refererCounts.set(host, (refererCounts.get(host) || 0) + 1);
            }
        }

        let topReferer = null;
        let topRefererCount = 0;
        for (const [host, n] of refererCounts) {
            if (n > topRefererCount) { topReferer = host; topRefererCount = n; }
        }

        return {
            count30, count7, countToday,
            botPct: count30 > 0 ? Math.round((bots / count30) * 1000) / 10 : null,
            avgPerDay: count30 > 0 ? Math.round((count30 / 30) * 10) / 10 : null,
            topReferer,
            byDay,
        };
    }

    _sparklineSvg(byDay) {
        const max = Math.max(1, ...byDay);
        const w = 320, h = 80;
        const stepX = w / Math.max(1, byDay.length - 1);
        const points = byDay.map((v, i) => {
            const x = i * stepX;
            const y = h - 4 - ((v / max) * (h - 8));
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        const polyPoints = `${points} ${w},${h} 0,${h}`;
        const gid = `sl-grad-${Math.random().toString(36).slice(2, 8)}`;
        return `
            <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width: 100%; height: 80px;">
                <defs>
                    <linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stop-color="var(--bs-success)" stop-opacity="0.3"/>
                        <stop offset="1" stop-color="var(--bs-success)" stop-opacity="0"/>
                    </linearGradient>
                </defs>
                <polygon fill="url(#${gid})" points="${polyPoints}"/>
                <polyline fill="none" stroke="var(--bs-success)" stroke-width="1.5" points="${points}"/>
            </svg>
        `;
    }

    async onInit() {
        const stats = this._summarizeClicks();
        const totalHits = this.model.get('hit_count') || 0;

        // KPI cards — use core MetricCard primitive
        this.kpi30 = new MetricCard({
            containerId: 'sl-kpi-30d',
            label: 'Hits · 30d',
            value: stats.count30 || (totalHits > 0 ? '—' : 0),
            tone: stats.count30 > 0 ? 'success' : 'default',
        });
        this.kpi7 = new MetricCard({
            containerId: 'sl-kpi-7d',
            label: 'Hits · 7d',
            value: stats.count7,
        });
        this.kpiToday = new MetricCard({
            containerId: 'sl-kpi-today',
            label: 'Today',
            value: stats.countToday,
        });
        this.kpiBots = new MetricCard({
            containerId: 'sl-kpi-bots',
            label: 'Bot traffic',
            value: stats.botPct == null ? '—' : `${stats.botPct}%`,
            tone: stats.botPct != null && stats.botPct > 25 ? 'warning' : 'default',
        });
        [this.kpi30, this.kpi7, this.kpiToday, this.kpiBots].forEach((c) => this.addChild(c));

        if (this.clicksCollection) {
            this.clicksCollection.on('fetch:success', () => this._refreshKpis(), this);
        }
    }

    _refreshKpis() {
        const stats = this._summarizeClicks();
        this.kpi30?.setValue(stats.count30);
        this.kpi7?.setValue(stats.count7);
        this.kpiToday?.setValue(stats.countToday);
        this.kpiBots?.setValue(stats.botPct == null ? '—' : `${stats.botPct}%`);
    }

    async refreshFromModel() {
        if (this.isMounted?.()) await this.render();
    }
}


// ── Configuration section ──────────────────────────────────

class ShortLinkConfigurationSection extends View {
    constructor(options = {}) {
        super({
            className: 'shortlink-configuration-section',
            ...options,
        });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const url = m.get('url') || '';
        const code = m.get('code') || '';
        const source = sourceLabel(m.get('source')) || '<span class="text-tertiary">—</span>';
        const trackClicks = !!m.get('track_clicks');
        const botPassthrough = !!m.get('bot_passthrough');
        const isProtected = !!m.get('is_protected');
        const expiresAt = m.get('expires_at');
        const expiresStr = expiresAt
            ? `<code>${escapeHtml(new Date(expiresAt).toLocaleString())}</code>`
            : '<span class="text-tertiary">Never</span>';
        const isActive = !!m.get('is_active');

        const yesNo = (v) => v
            ? '<span class="badge text-bg-success"><i class="bi bi-check2 me-1"></i>Enabled</span>'
            : '<span class="badge text-bg-secondary">Disabled</span>';

        const visibility = isProtected
            ? '<span class="badge text-bg-warning"><i class="bi bi-shield-lock me-1"></i>Protected</span>'
            : '<span class="badge text-bg-secondary">Unprotected</span>';

        return `
            <div class="detail-field-card">
                <div class="detail-field-card-header">
                    <h4><i class="bi bi-link-45deg"></i>Destination</h4>
                    <button class="btn btn-sm btn-link p-0" data-action="edit-shortlink" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                </div>
                <div class="detail-field-card-body">
                    <div class="detail-field-row">
                        <div class="detail-field-label">Original URL</div>
                        <div class="detail-field-value text-truncate" title="${escapeHtml(url)}">
                            ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>` : '—'}
                        </div>
                    </div>
                    <div class="detail-field-row">
                        <div class="detail-field-label">Code</div>
                        <div class="detail-field-value"><code>${escapeHtml(code)}</code></div>
                    </div>
                    <div class="detail-field-row">
                        <div class="detail-field-label">Source</div>
                        <div class="detail-field-value">${source}</div>
                    </div>
                </div>
            </div>

            <div class="detail-field-card">
                <div class="detail-field-card-header">
                    <h4><i class="bi bi-graph-up"></i>Tracking</h4>
                    <button class="btn btn-sm btn-link p-0" data-action="edit-shortlink" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                </div>
                <div class="detail-field-card-body">
                    <div class="detail-field-row">
                        <div class="detail-field-label">Track clicks</div>
                        <div class="detail-field-value">${yesNo(trackClicks)}</div>
                    </div>
                    <div class="detail-field-row">
                        <div class="detail-field-label">Bot passthrough</div>
                        <div class="detail-field-value">
                            ${botPassthrough
                                ? '<span class="badge text-bg-info"><i class="bi bi-robot me-1"></i>Bypassed</span>'
                                : '<span class="badge text-bg-secondary">Bots see preview</span>'}
                        </div>
                    </div>
                </div>
            </div>

            <div class="detail-field-card">
                <div class="detail-field-card-header">
                    <h4><i class="bi bi-clock-history"></i>Lifecycle</h4>
                    <button class="btn btn-sm btn-link p-0" data-action="edit-shortlink" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                </div>
                <div class="detail-field-card-body">
                    <div class="detail-field-row">
                        <div class="detail-field-label">Active</div>
                        <div class="detail-field-value">
                            ${isActive
                                ? '<span class="badge text-bg-success">Active</span>'
                                : '<span class="badge text-bg-secondary">Disabled</span>'}
                        </div>
                    </div>
                    <div class="detail-field-row">
                        <div class="detail-field-label">Expires</div>
                        <div class="detail-field-value">${expiresStr}</div>
                    </div>
                    <div class="detail-field-row">
                        <div class="detail-field-label">Protected</div>
                        <div class="detail-field-value">${visibility}</div>
                    </div>
                </div>
            </div>
        `;
    }
}


// ── Metrics section ────────────────────────────────────────

class ShortLinkMetricsSection extends View {
    constructor(options = {}) {
        super({
            className: 'shortlink-metrics-section',
            ...options,
        });

        const trackClicks = !!this.model.get('track_clicks');
        const user = this.model.get('user');
        this.userId = user?.id || user || null;
        this.code = this.model.get('code');
        this.canShowMetrics = trackClicks && this.userId && this.code;

        if (this.canShowMetrics) {
            this.template = `<div data-container="sl-metrics-chart"></div>`;
        } else {
            const reason = !trackClicks
                ? 'Click tracking is disabled — enable "Track clicks" on this shortlink to collect time-series data.'
                : 'No owning user on this shortlink — per-link metrics are recorded per user account.';
            this.template = `
                <div class="alert alert-info mb-0 d-flex align-items-start gap-2">
                    <i class="bi bi-info-circle flex-shrink-0 mt-1"></i>
                    <div>${escapeHtml(reason)}</div>
                </div>
            `;
        }
    }

    async onInit() {
        if (!this.canShowMetrics) return;
        this.metricsChart = new MetricsChart({
            containerId: 'sl-metrics-chart',
            title: 'Clicks',
            slugs: [`sl:click:${this.code}`],
            account: `user-${this.userId}`,
            granularity: 'days',
            defaultDateRange: '30d',
            yAxis: { label: 'Clicks', beginAtZero: true },
            tooltip: { y: 'number' },
            height: 320,
        });
        this.addChild(this.metricsChart);
    }
}


// ── OG / Social section ────────────────────────────────────

class ShortLinkOgSection extends View {
    constructor(options = {}) {
        super({
            className: 'shortlink-og-section',
            ...options,
        });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const flat = flattenShortLinkMetadata(this.model.get('metadata'));
        const hasAny = !!(flat.og_title || flat.og_description || flat.og_image
            || flat.twitter_card || flat.twitter_title || flat.twitter_description || flat.twitter_image);

        return `
            <div class="d-flex justify-content-between align-items-baseline mb-3">
                <div>
                    <div class="text-body-secondary text-uppercase small fw-semibold" style="letter-spacing: 0.05em;">metadata · og:* · twitter:*</div>
                    <h5 class="mb-0">OG / Social</h5>
                </div>
                <button class="btn btn-primary btn-sm" data-action="edit-og">
                    <i class="bi bi-pencil me-1"></i>${hasAny ? 'Edit OG metadata' : 'Add OG metadata'}
                </button>
            </div>
            ${hasAny
                ? `<div data-container="sl-og-fields"></div>`
                : `
                    <div class="text-center text-body-secondary py-4 border rounded">
                        <i class="bi bi-share fs-1 d-block mb-2"></i>
                        <p class="mb-3 small">No custom OG / Twitter metadata. The server scrapes the destination URL in the background — set values here to override what gets scraped.</p>
                        <button class="btn btn-primary btn-sm" data-action="edit-og">
                            <i class="bi bi-plus-lg me-1"></i>Add OG metadata
                        </button>
                    </div>
                `}
        `;
    }

    async onInit() {
        await this._buildFieldsView();
    }

    async _buildFieldsView() {
        const flat = flattenShortLinkMetadata(this.model.get('metadata'));
        const fields = [];
        if (flat.og_title)            fields.push({ name: 'og_title',            label: 'og:title',            cols: 12 });
        if (flat.og_description)      fields.push({ name: 'og_description',      label: 'og:description',      cols: 12 });
        if (flat.og_image)            fields.push({ name: 'og_image',            label: 'og:image', type: 'url', cols: 12 });
        if (flat.twitter_card)        fields.push({ name: 'twitter_card',        label: 'twitter:card',        cols: 6 });
        if (flat.twitter_title)       fields.push({ name: 'twitter_title',       label: 'twitter:title',       cols: 6 });
        if (flat.twitter_description) fields.push({ name: 'twitter_description', label: 'twitter:description', cols: 12 });
        if (flat.twitter_image)       fields.push({ name: 'twitter_image',       label: 'twitter:image', type: 'url', cols: 12 });

        if (!fields.length) return;

        const ogModel = {
            get: (k) => flat[k],
            attributes: flat,
            on() {}, off() {},
        };

        this.fieldsView = new DataView({
            containerId: 'sl-og-fields',
            model: ogModel,
            columns: 2,
            showEmptyValues: false,
            fields,
        });
        this.addChild(this.fieldsView);
    }

    async refresh() {
        if (this.isMounted()) await this.render();
    }
}


// ── Metadata section (raw JSON) ────────────────────────────

class ShortLinkMetadataSection extends View {
    constructor(options = {}) {
        super({
            className: 'shortlink-metadata-section',
            ...options,
        });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const meta = this.model.get('metadata') || {};
        const isEmpty = Object.keys(meta).length === 0;

        return `
            <div class="d-flex justify-content-between align-items-baseline mb-3">
                <div>
                    <div class="text-body-secondary text-uppercase small fw-semibold" style="letter-spacing: 0.05em;">${isEmpty ? 'No metadata yet' : 'Every key on shortlink.metadata'}</div>
                    <h5 class="mb-0">Metadata</h5>
                </div>
                <button class="btn btn-primary btn-sm" data-action="edit-metadata">
                    <i class="bi bi-pencil me-1"></i>${isEmpty ? 'Add metadata' : 'Edit JSON'}
                </button>
            </div>
            ${isEmpty
                ? `
                    <div class="text-center text-body-secondary py-4 border rounded">
                        <i class="bi bi-braces fs-1 d-block mb-2"></i>
                        <p class="mb-3 small">No metadata is set on this shortlink. Use this for arbitrary configuration the framework doesn't know about.</p>
                        <button class="btn btn-primary btn-sm" data-action="edit-metadata">
                            <i class="bi bi-plus-lg me-1"></i>Add metadata
                        </button>
                    </div>
                `
                : `
                    <pre class="bg-body-tertiary border rounded p-3 small mb-0" style="white-space: pre-wrap; word-break: break-word;"><code>${escapeHtml(JSON.stringify(meta, null, 2))}</code></pre>
                `}
        `;
    }
}


// ── ShortLinkView (assembly) ───────────────────────────────

class ShortLinkView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new ShortLink(options.data || {});

        // Shared collection: Click History table + Overview KPI roll-up.
        // 30-day window — Overview's per-day sparkline buckets reads this.
        const since = Math.floor(Date.now() / 1000) - 30 * 86400;
        const clicksCollection = new ShortLinkClickList({
            params: {
                shortlink: model.get('id'),
                created__gte: since,
                sort: '-created',
                size: 200,
            },
        });

        // Section view instances (must be created before super() so they can
        // be passed via the sections config to the SideNavView).
        const overviewSection = new ShortLinkOverviewSection({ model, clicksCollection });
        const configurationSection = new ShortLinkConfigurationSection({ model });

        const clickHistorySection = new TableView({
            collection: clicksCollection,
            title: 'Click History',
            eyebrow: 'Section · Click History',
            showFullscreen: false,
            searchable: false,
            sortable: true,
            filterable: true,
            paginated: true,
            hideActivePillNames: ['shortlink', 'created__gte'],
            tableOptions: {
                hover: true,
                size: 'sm',
                emptyMessage: model.get('track_clicks')
                    ? 'No clicks recorded yet.'
                    : 'Click tracking is disabled for this shortlink.',
                emptyIcon: 'bi-cursor',
                actions: [],
            },
            columns: [
                { key: 'created', label: 'Time', width: '180px', formatter: 'datetime', sortable: true },
                { key: 'ip', label: 'IP', width: '140px', template: '<code>{{model.ip}}</code>' },
                {
                    key: 'is_bot', label: 'Bot', width: '80px', formatter: 'yesnoicon',
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
        });

        const metricsSection = new ShortLinkMetricsSection({ model });
        const ogSection = new ShortLinkOgSection({ model });
        const metadataSection = new ShortLinkMetadataSection({ model });

        const sections = [
            { key: 'Overview',      label: 'Overview',      icon: 'bi-grid-1x2', view: overviewSection },
            { key: 'Configuration', label: 'Configuration', icon: 'bi-sliders',  view: configurationSection },
            { type: 'divider', label: 'Activity' },
            { key: 'ClickHistory',  label: 'Click History', icon: 'bi-cursor',   view: clickHistorySection },
            { key: 'Metrics',       label: 'Metrics',       icon: 'bi-graph-up', view: metricsSection },
            { type: 'divider', label: 'Detail' },
            { key: 'OgSocial',      label: 'OG / Social',   icon: 'bi-share',    view: ogSection },
            { key: 'Metadata',      label: 'Metadata',      icon: 'bi-braces',   view: metadataSection },
        ];

        // Header config — chips + actions per migration plan
        const chips = [
            { icon: 'bi-tag-fill', text: m => sourceLabel(m.get('source')) || null, variant: 'primary',
              when: m => !!m.get('source') },
            { icon: 'bi-cursor',   text: m => `${m.get('hit_count') || 0} hits`, variant: 'success',
              when: m => (m.get('hit_count') || 0) > 0 },
            { icon: 'bi-graph-up', text: 'Tracked', variant: 'info',
              when: m => !!m.get('track_clicks') },
            { icon: 'bi-eye-slash', text: 'Untracked', variant: 'secondary',
              when: m => !m.get('track_clicks') },
            { icon: 'bi-clock', text: m => {
                  const d = expiresInDays(m);
                  if (d == null) return null;
                  if (d < 0) return 'Expired';
                  return `expires in ${d}d`;
              }, variant: 'warning',
              when: m => {
                  const d = expiresInDays(m);
                  return d != null && d <= 14;
              } },
            { icon: 'bi-shield-lock', text: 'Protected', variant: 'warning',
              when: m => !!m.get('is_protected') },
        ];

        super({
            className: 'shortlink-view',
            ...options,
            model,
            header: {
                icon: 'bi-link-45deg',
                titleFn: m => m.get('short_link') || getShortUrl(m, options.app) || m.get('code') || 'Short link',
                subtitlePath: '_subtitle',
                chips,
                activeField: 'is_active',
                actions: [
                    { label: 'Copy', icon: 'bi-clipboard', action: 'copy-link', title: 'Copy short URL' },
                    { label: 'Open', icon: 'bi-box-arrow-up-right', action: 'open-destination', title: 'Open destination URL' },
                    { label: 'Edit', icon: 'bi-pencil', action: 'edit-shortlink', title: 'Edit shortlink' },
                ],
                contextMenu: {
                    items: [
                        { label: 'Copy short URL',     action: 'copy-link',         icon: 'bi-clipboard' },
                        { label: 'Open destination',   action: 'open-destination',  icon: 'bi-box-arrow-up-right' },
                        { type: 'divider' },
                        { label: 'Edit shortlink',     action: 'edit-shortlink',    icon: 'bi-pencil' },
                        { label: 'Refresh OG metadata', action: 'refresh-og',       icon: 'bi-arrow-clockwise' },
                        { type: 'divider' },
                        { label: 'Delete shortlink',   action: 'delete-shortlink',  icon: 'bi-trash', danger: true },
                    ],
                },
            },
            sections,
            activeSection: 'Overview',
        });

        // Stash references for action handlers + cross-section wiring
        this.clicksCollection = clicksCollection;
        this.overviewSection = overviewSection;
        this.configurationSection = configurationSection;
        this.clickHistorySection = clickHistorySection;
        this.metricsSection = metricsSection;
        this.ogSection = ogSection;
        this.metadataSection = metadataSection;

        // Pre-compute synthetic subtitle so the header reads "→ {url}"
        this._refreshComputedFields();
    }

    async onAfterBuild() {
        // Live sidebar badge: total hits on Click History
        const updateClicksBadge = () => {
            const hits = this.model.get('hit_count') || 0;
            this.setBadge('ClickHistory', hits > 0
                ? { text: hits >= 1000 ? `${(hits / 1000).toFixed(1)}k` : String(hits), variant: 'muted' }
                : null);
        };
        updateClicksBadge();
        this.clicksCollection.on('fetch:success', updateClicksBadge, this);

        // Fire-and-forget initial fetch (drives KPIs, sparkline, table)
        this.clicksCollection.fetch().catch(() => {});
    }

    /**
     * Synthetic subtitle field — DetailHeaderView reads `_subtitle` via
     * `subtitlePath`. Format: "→ {url}". Stashed on `model.attributes`
     * so a header re-render picks it up.
     */
    _refreshComputedFields() {
        const url = this.model.get('url') || '';
        this.model.attributes._subtitle = url ? `→ ${url}` : '';
    }

    /** Re-render the sections that read directly from the model. */
    async _refreshFromModel() {
        this._refreshComputedFields();
        if (this.headerView?.isMounted()) await this.headerView.render();
        if (this.overviewSection?.isMounted()) await this.overviewSection.refreshFromModel();
        if (this.configurationSection?.isMounted()) await this.configurationSection.render();
        if (this.ogSection?.isMounted()) await this.ogSection.refresh();
        if (this.metadataSection?.isMounted()) await this.metadataSection.render();
    }

    // ── Actions ────────────────────────────────────────────

    async onActionCopyLink() {
        const url = getShortUrl(this.model, this.getApp?.());
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            this.getApp()?.toast?.success(`Copied: ${url}`);
        } catch (_e) {
            this.getApp()?.toast?.warning('Copy failed — select the URL manually.');
        }
    }

    async onActionOpenDestination() {
        const url = this.model.get('url');
        if (!url || !/^https?:\/\//i.test(url)) return;
        window.open(url, '_blank', 'noopener,noreferrer');
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
            await this._refreshFromModel();
            this.emit('detail:updated');
        } catch (err) {
            Modal.showError(err?.data?.error || err?.message || 'Failed to update');
        }
    }

    /**
     * Edit just the OG / Twitter fields. Submits a metadata-only patch so
     * we don't trample other shortlink fields.
     */
    async onActionEditOg() {
        const flat = flattenShortLinkMetadata(this.model.get('metadata'));
        const result = await Modal.form({
            title: 'Edit OG / Social metadata',
            size: 'md',
            fields: [
                { name: 'og_title',            type: 'text',     label: 'og:title', cols: 12 },
                { name: 'og_description',      type: 'textarea', label: 'og:description', rows: 3, cols: 12 },
                { name: 'og_image',            type: 'url',      label: 'og:image', placeholder: 'https://…', cols: 12 },
                { name: 'twitter_card',        type: 'select',   label: 'twitter:card', options: TWITTER_CARD_OPTIONS, cols: 6 },
                { name: 'twitter_title',       type: 'text',     label: 'twitter:title', cols: 6 },
                { name: 'twitter_description', type: 'textarea', label: 'twitter:description', rows: 2, cols: 12 },
                { name: 'twitter_image',       type: 'url',      label: 'twitter:image', cols: 12 },
            ],
            data: flat,
            submitText: 'Save',
            cancelText: 'Cancel',
        });
        if (!result) return;
        const metadata = buildShortLinkMetadata(result);
        try {
            await this.model.save({ metadata });
            this.model.set('metadata', metadata);
            this.getApp()?.toast?.success('OG metadata saved');
            await this._refreshFromModel();
            this.emit('detail:updated');
        } catch (err) {
            Modal.showError(err?.data?.error || err?.message || 'Failed to save metadata');
        }
    }

    /**
     * Power-user escape hatch — edit the entire metadata blob as JSON.
     */
    async onActionEditMetadata() {
        const current = this.model.get('metadata') || {};
        const initial = JSON.stringify(current, null, 2);

        const result = await Modal.form({
            title: 'Edit metadata (JSON)',
            icon: 'bi-braces',
            size: 'lg',
            fields: [
                {
                    type: 'html', columns: 12,
                    html: `<div class="alert alert-info small mb-3">
                        <i class="bi bi-info-circle me-1"></i>
                        Free-form JSON object. OG / Twitter keys are also editable from the OG / Social section.
                    </div>`,
                },
                {
                    name: 'metadata_json', type: 'textarea', label: 'Metadata',
                    rows: 16, columns: 12,
                    value: initial,
                    placeholder: '{ "key": "value" }',
                    tooltip: 'Must be a valid JSON object',
                },
            ],
            submitText: 'Save',
            cancelText: 'Cancel',
        });
        if (!result) return;

        let parsed;
        try {
            parsed = JSON.parse(result.metadata_json);
            if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error('Metadata must be a JSON object (e.g. `{}`), not an array or scalar.');
            }
        } catch (err) {
            this.getApp()?.toast?.error(`Invalid JSON: ${err.message}`);
            return;
        }

        try {
            await this.model.save({ metadata: parsed });
            this.model.set('metadata', parsed);
            this.getApp()?.toast?.success('Metadata updated');
            await this._refreshFromModel();
            this.emit('detail:updated');
        } catch (err) {
            Modal.showError(err?.data?.error || err?.message || 'Failed to save metadata');
        }
    }

    /**
     * Re-fetch the model so freshly-scraped OG metadata appears.
     * The backend asynchronously scrapes destination URLs in the background;
     * this lets the user pull in the latest scraped values.
     */
    async onActionRefreshOg() {
        try {
            await this.model.fetch();
            await this._refreshFromModel();
            this.getApp()?.toast?.success('OG metadata refreshed');
        } catch (err) {
            this.getApp()?.toast?.error(err?.message || 'Failed to refresh metadata');
        }
    }

    async onActionDeleteShortlink() {
        const confirmed = await Modal.confirm(
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

ShortLinkView.VIEW_CLASS = ShortLinkView;
ShortLink.VIEW_CLASS = ShortLinkView;
ShortLink.MODEL_REF = 'shortlink.ShortLink';

export default ShortLinkView;
export { getShortUrl };
