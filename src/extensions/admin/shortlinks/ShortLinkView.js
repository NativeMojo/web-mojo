/**
 * ShortLinkView - Detail view for a ShortLink record, built on the
 * DetailView primitive (header + side-nav layout).
 *
 * Sections:
 *   Overview · Configuration ·
 *   ── Activity ──  Click History · Metrics
 *   ── Detail ──    OG / Social · Metadata
 *
 * Overview leads with four `MetricCard` KPIs (Hits 30d / 7d / today /
 * top country) followed by a borderless Slack/iMessage-style preview
 * region driven by Mustache + getter properties — no card wrapper, no
 * inline `<style>` block. Configuration / OG / Metadata sections all use
 * the framework's flat `.detail-section-eyebrow` + `.detail-flat-row`
 * primitives. Metadata wraps `KnownFieldsCard` for known-key promotion +
 * collapsible raw JSON.
 *
 * Open via `Modal.detail(new ShortLinkView({ model }))` — pair with
 * `viewDialogOptions: { header: false, noBodyPadding: true,
 * buttons: [] }` when wired through TableView/TablePage. Inherits
 * `size: 'lg'` from `Modal.detail()`'s default — DO NOT override to `xl`.
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import MetricCard from '@core/views/data/MetricCard.js';
import KnownFieldsCard from '@core/views/data/KnownFieldsCard.js';
import TableView from '@core/views/table/TableView.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import dataFormatter from '@core/utils/DataFormatter.js';
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

const escapeHtml = MOJOUtils.escapeHtml;


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
    return Math.round((t - Date.now()) / 86400000);
}

function sourceLabel(value) {
    if (!value) return '';
    const opt = SHORTLINK_SOURCE_OPTIONS.find((o) => o.value === value);
    return opt ? opt.label : String(value);
}

/**
 * Roll up the shared 30-day clicks collection into the numbers the
 * Overview KPIs display. `count30 / count7 / countToday / topCountry /
 * botPct` all read from one in-memory pass over `clicksCollection.models`.
 */
function summarizeClicks(clicksCollection) {
    const models = clicksCollection?.models || [];
    const now = Date.now();
    const dayMs = 86400000;
    const start30 = now - 30 * dayMs;
    const start7 = now - 7 * dayMs;
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const startTodayMs = startToday.getTime();

    let count30 = 0;
    let count7 = 0;
    let countToday = 0;
    let bots = 0;
    const countryCounts = new Map();

    for (const click of models) {
        const created = click.get?.('created');
        if (created == null) continue;
        const t = typeof created === 'number'
            ? (created < 1e11 ? created * 1000 : created)
            : new Date(created).getTime();
        if (!Number.isFinite(t)) continue;
        if (t < start30) continue;
        count30++;
        if (t >= start7) count7++;
        if (t >= startTodayMs) countToday++;
        if (click.get?.('is_bot')) bots++;

        // Top country uses the click row's country field. The row exposes
        // either a top-level `country` or a nested `geo.country` depending
        // on backend serialization — try both.
        const country = click.get?.('country')
            || click.get?.('geo')?.country
            || click.get?.('ip_info')?.country
            || null;
        if (country) {
            countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
        }
    }

    let topCountry = null;
    let topCountryCount = 0;
    for (const [country, n] of countryCounts) {
        if (n > topCountryCount) {
            topCountry = country;
            topCountryCount = n;
        }
    }

    return {
        count30,
        count7,
        countToday,
        topCountry,
        botPct: count30 > 0 ? Math.round((bots / count30) * 1000) / 10 : null,
    };
}


// ── Overview section ───────────────────────────────────────

class ShortLinkOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'shortlink-overview-section',
            template: `
                <div class="detail-kpi-grid">
                    <div data-container="sl-kpi-30d"></div>
                    <div data-container="sl-kpi-7d"></div>
                    <div data-container="sl-kpi-today"></div>
                    <div data-container="sl-kpi-country"></div>
                </div>

                <div class="detail-section-eyebrow">Slack / iMessage preview</div>
                {{#hasOg|bool}}
                <div class="sl-preview">
                    <div class="sl-preview-thumb">
                        {{#hasOgImage|bool}}<img src="{{ogImage}}" alt="">{{/hasOgImage|bool}}
                        {{^hasOgImage|bool}}<i class="bi bi-link-45deg"></i>{{/hasOgImage|bool}}
                    </div>
                    <div class="sl-preview-body">
                        <div class="sl-preview-domain">{{domain}}</div>
                        {{#hasOgTitle|bool}}<div class="sl-preview-title">{{ogTitle}}</div>{{/hasOgTitle|bool}}
                        {{#hasOgDescription|bool}}<div class="sl-preview-desc">{{ogDescription}}</div>{{/hasOgDescription|bool}}
                    </div>
                </div>
                <div class="text-secondary small mt-2">
                    <i class="bi bi-info-circle me-1"></i>
                    Pulled from <code>og:title</code>, <code>og:description</code>, <code>og:image</code> on the destination page.
                </div>
                {{/hasOg|bool}}
                {{^hasOg|bool}}
                <div class="alert alert-info mb-0 small d-flex align-items-start gap-2">
                    <i class="bi bi-info-circle flex-shrink-0 mt-1"></i>
                    <div>
                        No OG metadata set on this link. The server auto-scrapes the destination URL in the background &mdash;
                        custom values entered in <strong>OG / Social</strong> override scraped values.
                    </div>
                </div>
                {{/hasOg|bool}}
            `,
            ...options,
        });
        this.clicksCollection = options.clicksCollection || null;
    }

    // ── Computed properties bound by the Mustache template ─────

    get _flat() { return flattenShortLinkMetadata(this.model.get('metadata')); }
    get ogTitle() { return this._flat.og_title || ''; }
    get ogDescription() { return this._flat.og_description || ''; }
    get ogImage() { return this._flat.og_image || ''; }
    get hasOgTitle() { return !!this.ogTitle; }
    get hasOgDescription() { return !!this.ogDescription; }
    get hasOgImage() { return !!this.ogImage; }
    get hasOg() { return this.hasOgTitle || this.hasOgDescription || this.hasOgImage; }
    get domain() { return getDomain(this.model.get('url')); }

    async onInit() {
        const stats = summarizeClicks(this.clicksCollection);

        // Four KPI cards — default size (no metric-card-lg).
        this.kpi30 = new MetricCard({
            containerId: 'sl-kpi-30d',
            label: 'Hits · 30d',
            value: stats.count30,
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
        this.kpiCountry = new MetricCard({
            containerId: 'sl-kpi-country',
            label: 'Top country',
            value: stats.topCountry || '—',
        });
        [this.kpi30, this.kpi7, this.kpiToday, this.kpiCountry]
            .forEach((c) => this.addChild(c));

        if (this.clicksCollection) {
            this.clicksCollection.on('fetch:success', () => this._refreshKpis(), this);
        }
    }

    _refreshKpis() {
        const stats = summarizeClicks(this.clicksCollection);
        this.kpi30?.setValue(stats.count30);
        this.kpi7?.setValue(stats.count7);
        this.kpiToday?.setValue(stats.countToday);
        this.kpiCountry?.setValue(stats.topCountry || '—');
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
            template: `
                <div class="detail-section-eyebrow">
                    Destination
                    <button class="detail-section-action" data-action="edit-shortlink" data-bs-toggle="tooltip" title="Edit shortlink">
                        <i class="bi bi-pencil"></i>
                    </button>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Original URL</div>
                    <div class="detail-flat-row-value text-truncate">
                        {{#hasUrl|bool}}<a href="{{model.url}}" target="_blank" rel="noopener noreferrer">{{model.url}}</a>{{/hasUrl|bool}}
                        {{^hasUrl|bool}}<span class="text-secondary fst-italic">—</span>{{/hasUrl|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Code</div>
                    <div class="detail-flat-row-value">
                        {{#hasCode|bool}}<code>{{model.code}}</code>{{/hasCode|bool}}
                        {{^hasCode|bool}}<span class="text-secondary fst-italic">—</span>{{/hasCode|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Source</div>
                    <div class="detail-flat-row-value">
                        {{#hasSource|bool}}{{sourceLabel}}{{/hasSource|bool}}
                        {{^hasSource|bool}}<span class="text-secondary fst-italic">—</span>{{/hasSource|bool}}
                    </div>
                </div>

                <div class="detail-section-eyebrow">
                    Tracking
                    <button class="detail-section-action" data-action="edit-shortlink" data-bs-toggle="tooltip" title="Edit tracking">
                        <i class="bi bi-pencil"></i>
                    </button>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Track clicks</div>
                    <div class="detail-flat-row-value">
                        {{#trackClicks|bool}}<span class="badge text-bg-success"><i class="bi bi-check2 me-1"></i>Enabled</span>{{/trackClicks|bool}}
                        {{^trackClicks|bool}}<span class="badge text-bg-secondary">Disabled</span>{{/trackClicks|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Bot passthrough</div>
                    <div class="detail-flat-row-value">
                        {{#botPassthrough|bool}}<span class="badge text-bg-info"><i class="bi bi-robot me-1"></i>Bypassed</span>{{/botPassthrough|bool}}
                        {{^botPassthrough|bool}}<span class="badge text-bg-secondary">Bots see preview</span>{{/botPassthrough|bool}}
                    </div>
                </div>

                <div class="detail-section-eyebrow">
                    Lifecycle
                    <button class="detail-section-action" data-action="edit-shortlink" data-bs-toggle="tooltip" title="Edit lifecycle">
                        <i class="bi bi-pencil"></i>
                    </button>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Active</div>
                    <div class="detail-flat-row-value">
                        {{#isActive|bool}}<span class="badge text-bg-success">Active</span>{{/isActive|bool}}
                        {{^isActive|bool}}<span class="badge text-bg-secondary">Disabled</span>{{/isActive|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Expires</div>
                    <div class="detail-flat-row-value">
                        {{#hasExpires|bool}}<code>{{model.expires_at|datetime}}</code>{{/hasExpires|bool}}
                        {{^hasExpires|bool}}<span class="text-secondary">Never</span>{{/hasExpires|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Protected</div>
                    <div class="detail-flat-row-value">
                        {{#isProtected|bool}}<span class="badge text-bg-warning"><i class="bi bi-shield-lock me-1"></i>Protected</span>{{/isProtected|bool}}
                        {{^isProtected|bool}}<span class="badge text-bg-secondary">Unprotected</span>{{/isProtected|bool}}
                    </div>
                </div>
            `,
            ...options,
        });
    }

    // ── Computed properties bound by the Mustache template ─────

    get hasUrl() { return !!this.model.get('url'); }
    get hasCode() { return !!this.model.get('code'); }
    get hasSource() { return !!this.model.get('source'); }
    get hasExpires() { return !!this.model.get('expires_at'); }
    get sourceLabel() { return sourceLabel(this.model.get('source')); }
    get trackClicks() { return !!this.model.get('track_clicks'); }
    get botPassthrough() { return !!this.model.get('bot_passthrough'); }
    get isActive() { return !!this.model.get('is_active'); }
    get isProtected() { return !!this.model.get('is_protected'); }
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
            this.template = `
                <div class="detail-section-eyebrow">Click metrics</div>
                <div data-container="sl-metrics-chart"></div>
            `;
        } else {
            // Empty-state — the only reason metrics aren't here is
            // `track_clicks=false` or no owning user. Both are clear
            // explanations rendered without a card wrapper.
            this.template = `
                <div class="detail-section-eyebrow">Click metrics</div>
                <div class="alert alert-info mb-0 d-flex align-items-start gap-2">
                    <i class="bi bi-info-circle flex-shrink-0 mt-1"></i>
                    <div>{{reason}}</div>
                </div>
            `;
            this.reason = !trackClicks
                ? 'Click tracking is disabled — enable "Track clicks" on this shortlink to collect time-series data.'
                : 'No owning user on this shortlink — per-link metrics are recorded per user account.';
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
            template: `
                <div class="detail-section-eyebrow">
                    OG / Social
                    <button class="detail-section-action" data-action="edit-og" data-bs-toggle="tooltip" title="{{#hasAny|bool}}Edit OG metadata{{/hasAny|bool}}{{^hasAny|bool}}Add OG metadata{{/hasAny|bool}}">
                        <i class="bi bi-pencil"></i>
                    </button>
                </div>
                {{#hasAny|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">og:title</div>
                    <div class="detail-flat-row-value">
                        {{#hasOgTitle|bool}}{{ogTitle}}{{/hasOgTitle|bool}}
                        {{^hasOgTitle|bool}}<span class="text-secondary fst-italic">—</span>{{/hasOgTitle|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">og:description</div>
                    <div class="detail-flat-row-value">
                        {{#hasOgDescription|bool}}{{ogDescription}}{{/hasOgDescription|bool}}
                        {{^hasOgDescription|bool}}<span class="text-secondary fst-italic">—</span>{{/hasOgDescription|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">og:image</div>
                    <div class="detail-flat-row-value text-truncate">
                        {{#hasOgImage|bool}}<a href="{{ogImage}}" target="_blank" rel="noopener noreferrer">{{ogImage}}</a>{{/hasOgImage|bool}}
                        {{^hasOgImage|bool}}<span class="text-secondary fst-italic">—</span>{{/hasOgImage|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">twitter:card</div>
                    <div class="detail-flat-row-value">
                        {{#hasTwitterCard|bool}}<code>{{twitterCard}}</code>{{/hasTwitterCard|bool}}
                        {{^hasTwitterCard|bool}}<span class="text-secondary fst-italic">—</span>{{/hasTwitterCard|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">twitter:title</div>
                    <div class="detail-flat-row-value">
                        {{#hasTwitterTitle|bool}}{{twitterTitle}}{{/hasTwitterTitle|bool}}
                        {{^hasTwitterTitle|bool}}<span class="text-secondary fst-italic">—</span>{{/hasTwitterTitle|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">twitter:description</div>
                    <div class="detail-flat-row-value">
                        {{#hasTwitterDescription|bool}}{{twitterDescription}}{{/hasTwitterDescription|bool}}
                        {{^hasTwitterDescription|bool}}<span class="text-secondary fst-italic">—</span>{{/hasTwitterDescription|bool}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">twitter:image</div>
                    <div class="detail-flat-row-value text-truncate">
                        {{#hasTwitterImage|bool}}<a href="{{twitterImage}}" target="_blank" rel="noopener noreferrer">{{twitterImage}}</a>{{/hasTwitterImage|bool}}
                        {{^hasTwitterImage|bool}}<span class="text-secondary fst-italic">—</span>{{/hasTwitterImage|bool}}
                    </div>
                </div>
                {{/hasAny|bool}}
                {{^hasAny|bool}}
                <p class="text-secondary small mb-0">
                    No custom OG / Twitter metadata. The server scrapes the destination URL in the
                    background &mdash; set values here to override what gets scraped.
                </p>
                {{/hasAny|bool}}
            `,
            ...options,
        });
    }

    // ── Computed properties bound by the Mustache template ─────

    get _flat() { return flattenShortLinkMetadata(this.model.get('metadata')); }
    get ogTitle() { return this._flat.og_title || ''; }
    get ogDescription() { return this._flat.og_description || ''; }
    get ogImage() { return this._flat.og_image || ''; }
    get twitterCard() { return this._flat.twitter_card || ''; }
    get twitterTitle() { return this._flat.twitter_title || ''; }
    get twitterDescription() { return this._flat.twitter_description || ''; }
    get twitterImage() { return this._flat.twitter_image || ''; }
    get hasOgTitle() { return !!this.ogTitle; }
    get hasOgDescription() { return !!this.ogDescription; }
    get hasOgImage() { return !!this.ogImage; }
    get hasTwitterCard() { return !!this.twitterCard; }
    get hasTwitterTitle() { return !!this.twitterTitle; }
    get hasTwitterDescription() { return !!this.twitterDescription; }
    get hasTwitterImage() { return !!this.twitterImage; }
    get hasAny() {
        return this.hasOgTitle || this.hasOgDescription || this.hasOgImage
            || this.hasTwitterCard || this.hasTwitterTitle
            || this.hasTwitterDescription || this.hasTwitterImage;
    }

    async refresh() {
        if (this.isMounted()) await this.render();
    }
}


// ── Metadata section (KnownFieldsCard) ─────────────────────

class ShortLinkMetadataSection extends View {
    constructor(options = {}) {
        super({
            className: 'shortlink-metadata-section',
            template: `
                <div class="detail-section-eyebrow">
                    Metadata
                    <button class="detail-section-action" data-action="edit-metadata" data-bs-toggle="tooltip" title="Edit metadata JSON">
                        <i class="bi bi-pencil"></i>
                    </button>
                </div>
                <div data-container="sl-metadata-card"></div>
            `,
            ...options,
        });
    }

    async onInit() {
        // KnownFieldsCard promotes server-known fields, hides the og:*/twitter:*
        // keys (already shown in OG / Social), and keeps the raw JSON blob
        // accessible via a collapsible <details> block.
        this.knownFields = new KnownFieldsCard({
            containerId: 'sl-metadata-card',
            model: this.model,
            data: (m) => m.get('metadata') || {},
            knownKeys: [],
            rawLabel: 'Raw metadata JSON',
            rawCollapsed: false,
            emptyText: 'No metadata is set on this shortlink. Use this for arbitrary configuration the framework doesn’t know about.',
        });
        this.addChild(this.knownFields);
    }

    async refresh() {
        if (this.isMounted?.()) await this.render();
    }
}


// ── ShortLinkView (assembly) ───────────────────────────────

class ShortLinkView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new ShortLink(options.data || {});

        // Shared collection: Click History table + Overview KPI roll-up.
        // 30-day window — matches the Overview MetricsChart range.
        const since = Math.floor(Date.now() / 1000) - 30 * 86400;
        const clicksCollection = new ShortLinkClickList({
            params: {
                shortlink: model.get('id'),
                created__gte: since,
                sort: '-created',
                size: 200,
            },
        });

        // Section views (built before super() so SideNavView can mount them).
        const overviewSection = new ShortLinkOverviewSection({ model, clicksCollection });
        const configurationSection = new ShortLinkConfigurationSection({ model });

        const trackClicks = !!model.get('track_clicks');
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
                emptyMessage: trackClicks
                    ? 'No clicks recorded yet.'
                    : 'Click tracking is disabled for this shortlink. Enable "Track clicks" in Configuration to collect per-click history.',
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

        // Header chips — only render when value exists (`when:` callbacks
        // gate visibility per the framework's chip filtering).
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
                subtitleFn: m => {
                    const url = m.get('url') || '';
                    return url ? `→ ${url}` : '';
                },
                chips,
                activeField: 'is_active',
                // Trusted HTML — `auxFn` interpolates model fields. Free
                // text comes through `escapeHtml(...)` before composition.
                auxFn: m => _buildHeaderAux(m),
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
    }

    async onAfterBuild() {
        // Live sidebar badge: total hits on Click History.
        const updateClicksBadge = () => {
            const hits = this.model.get('hit_count') || 0;
            this.setBadge('ClickHistory', hits > 0
                ? { text: hits >= 1000 ? `${(hits / 1000).toFixed(1)}k` : String(hits), variant: 'muted' }
                : null);
        };
        updateClicksBadge();
        this.clicksCollection.on('fetch:success', updateClicksBadge, this);

        // Fire-and-forget initial fetch (drives KPIs + table).
        this.clicksCollection.fetch().catch(() => { /* fail silent */ });
    }

    /** Re-render the sections that read directly from the model. */
    async _refreshFromModel() {
        if (this.headerView?.isMounted()) await this.headerView.render();
        if (this.overviewSection?.isMounted()) await this.overviewSection.refreshFromModel();
        if (this.configurationSection?.isMounted()) await this.configurationSection.render();
        if (this.ogSection?.isMounted()) await this.ogSection.refresh();
        if (this.metadataSection?.isMounted()) await this.metadataSection.refresh();
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


// ── Header aux helper ──────────────────────────────────────

/**
 * State-aware right-gutter readout for the DetailHeaderView.
 * Trusted HTML — every model-controlled value is escaped before
 * interpolation. Three states: Disabled (warning dot), Expired
 * (danger dot), Active (success dot, hit count + last-modified
 * relative).
 */
function _buildHeaderAux(m) {
    const isActive = !!m.get('is_active');
    const exp = expiresInDays(m);
    const isExpired = exp != null && exp < 0;
    const hits = m.get('hit_count') || 0;
    const modified = m.get('modified');
    const modifiedRel = modified
        ? dataFormatter.pipe(modified, 'relative')
        : '';

    let dotTone, main, sub;
    if (!isActive) {
        dotTone = 'warning';
        main = 'Disabled';
        sub = modifiedRel ? `updated ${escapeHtml(modifiedRel)}` : '';
    } else if (isExpired) {
        dotTone = 'danger';
        main = 'Expired';
        sub = modifiedRel ? `updated ${escapeHtml(modifiedRel)}` : '';
    } else {
        dotTone = 'success';
        main = `${hits.toLocaleString()} ${hits === 1 ? 'hit' : 'hits'}`;
        sub = modifiedRel ? `updated ${escapeHtml(modifiedRel)}` : '';
    }

    const dotCls = dotTone ? ` dh-aux-dot-${dotTone}` : '';
    return `
        <span class="dh-aux-presence">
            <span class="dh-aux-dot${dotCls}"></span>
            <span>${escapeHtml(main)}</span>
        </span>
        ${sub ? `<span class="dh-aux-meta">${sub}</span>` : ''}
    `;
}


ShortLinkView.VIEW_CLASS = ShortLinkView;
ShortLink.VIEW_CLASS = ShortLinkView;
ShortLink.MODEL_REF = 'shortlink.ShortLink';

export default ShortLinkView;
export {
    ShortLinkView,
    ShortLinkOverviewSection,
    ShortLinkConfigurationSection,
    ShortLinkMetricsSection,
    ShortLinkOgSection,
    ShortLinkMetadataSection,
    getShortUrl,
};
