/**
 * MetricsChart — composed view that fetches /api/metrics/fetch and displays
 * the results in a native SeriesChart child.
 *
 * Owns: REST fetch, header bar with title + gear menu (granularity, quick
 *       date ranges, custom range dialog) + line/bar toggle, loading/error
 *       overlays.
 *
 * The actual rendering is delegated to a child SeriesChart mounted via
 * `addChild` with `containerId: 'chart'`.
 *
 * Public API matches the prior MetricsChart so admin callers (CloudWatchChart,
 * AdminDashboardPage, ShortLinkView, PushDashboardPage) need no changes —
 * EXCEPT that `.export(format)` was removed; use `exportChartPng(chart)` from
 * `web-mojo/charts/exportChart` instead.
 */

import View from '@core/View.js';
import Dialog from '@core/views/feedback/Dialog.js';
import SeriesChart from './SeriesChart.js';

class MetricsChart extends View {
    constructor(options = {}) {
        super({
            ...options,
            className: `mojo-metrics-chart ${options.className || ''}`.trim()
        });

        // Title is rendered as raw HTML via Mustache `{{{title}}}` so admin
        // callers can pass icon markup like '<i class="bi-graph-up"></i> API'.
        // ⚠️ Trust boundary: this option must be developer-controlled. Never
        // set `title:` from user input or untrusted API data — it would be a
        // stored XSS vector.
        this.title = options.title || 'Metrics';
        this.chartTitle = options.chartTitle || '';

        // Chart configuration
        this.chartType = options.chartType || 'line';
        this.height = options.height || 300;
        this.yAxis = options.yAxis || { label: 'Count', beginAtZero: true };
        this.tooltip = options.tooltip || { y: 'number' };
        this.colors = options.colors;
        this.colorGenerator = options.colorGenerator;

        // API
        this.endpoint = options.endpoint || '/api/metrics/fetch';
        this.account = options.account || 'global';
        this.granularity = options.granularity || 'hours';
        this.slugs = options.slugs || null;
        this.category = options.category || null;
        this.dateStart = options.dateStart || null;
        this.dateEnd = options.dateEnd || null;
        this.defaultDateRange = options.defaultDateRange || '24h';

        // Controls
        this.showGranularity = options.showGranularity !== false;
        this.showDateRange = options.showDateRange !== false;
        this.showTypeSwitch = options.showTypeSwitch !== false;

        this.granularityOptions = options.granularityOptions || [
            { value: 'minutes', label: 'Minutes' },
            { value: 'hours',   label: 'Hours' },
            { value: 'days',    label: 'Days' },
            { value: 'weeks',   label: 'Weeks' },
            { value: 'months',  label: 'Months' }
        ];

        this.quickRanges = options.quickRanges || [
            { value: '1h',  label: '1H' },
            { value: '24h', label: '24H' },
            { value: '7d',  label: '7D' },
            { value: '30d', label: '30D' }
        ];

        // Dataset capping (large category sets like countries)
        this.maxDatasets = Number.isFinite(options.maxDatasets) ? options.maxDatasets : null;
        this.groupRemainingLabel = options.groupRemainingLabel || 'Other';

        // State
        this.isLoading = false;
        this.lastFetch = null;

        if (!this.dateStart || !this.dateEnd) {
            this.setQuickRange(this.defaultDateRange);
        }
    }

    // ── lifecycle ─────────────────────────────────────────────────────

    async onInit() {
        this.chart = new SeriesChart({
            containerId: 'chart',
            chartType: this.chartType,
            height: this.height,
            valueFormatter: this.tooltip?.y || null,
            xLabelFormat: this.tooltip?.x || null,
            colors: this.colors,
            colorGenerator: this.colorGenerator,
            showLegend: true,
            legendPosition: 'top'
        });
        this.addChild(this.chart);
    }

    async onAfterRender() {
        await this.fetchData();
    }

    // ── template ──────────────────────────────────────────────────────

    async getTemplate() {
        return `
            <div class="mojo-metrics-chart-container">
                <div class="d-flex justify-content-between align-items-center mb-2 mojo-metrics-chart-header">
                    <h5 class="mb-0 mojo-metrics-chart-title">{{{title}}}</h5>
                    <div class="btn-toolbar" role="toolbar">
                        ${this._renderGearMenuHtml()}
                        ${this._renderTypeSwitchHtml()}
                    </div>
                </div>
                <div class="position-relative" style="min-height:${typeof this.height === 'number' ? this.height + 'px' : this.height};">
                    <div data-container="chart"></div>
                    <div class="chart-overlay d-none" data-loading>
                        <div class="d-flex flex-column align-items-center">
                            <div class="spinner-border text-primary mb-2" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <small class="text-muted">Loading metrics…</small>
                        </div>
                    </div>
                    <div class="chart-overlay d-none" data-error>
                        <div class="alert alert-danger mb-0">
                            <i class="bi bi-exclamation-triangle me-1"></i>
                            <span class="error-message"></span>
                            <button class="btn btn-sm btn-outline-danger ms-2" data-action="retry-fetch">Retry</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _renderGearMenuHtml() {
        const items = [];
        if (this.showGranularity) {
            items.push('<li><h6 class="dropdown-header">Granularity</h6></li>');
            for (const opt of this.granularityOptions) {
                const sel = opt.value === this.granularity ? ' mc-selected' : '';
                items.push(`<li><a class="dropdown-item${sel}" role="button" data-action="granularity-changed" data-value="${this._escAttr(opt.value)}">${this._escHtml(opt.label)}</a></li>`);
            }
        }
        if (this.showDateRange) {
            if (items.length) items.push('<li><hr class="dropdown-divider"></li>');
            items.push('<li><h6 class="dropdown-header">Date Range</h6></li>');
            for (const qr of this.quickRanges) {
                const sel = qr.value === this.defaultDateRange ? ' mc-selected' : '';
                items.push(`<li><a class="dropdown-item${sel}" role="button" data-action="quick-range" data-range="${this._escAttr(qr.value)}">${this._escHtml(qr.label)}</a></li>`);
            }
            items.push('<li><a class="dropdown-item" role="button" data-action="show-date-range-dialog"><i class="bi bi-calendar-range me-1"></i>Custom Range…</a></li>');
        }
        if (!items.length) return '';
        return `
            <style>
                .mc-gear-menu .dropdown-item.mc-selected { background:#f0f0f0; color:inherit; }
                .mc-gear-menu .dropdown-item.mc-selected::before { content:'\\F633'; font-family:'bootstrap-icons'; margin-right:0.4rem; font-size:0.75em; }
            </style>
            <div class="btn-group btn-group-sm me-2">
                <button type="button" class="btn btn-outline-secondary btn-sm dropdown-toggle"
                        data-bs-toggle="dropdown" aria-expanded="false" title="Chart Settings">
                    <i class="bi bi-gear"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end mc-gear-menu">${items.join('')}</ul>
            </div>`;
    }

    _renderTypeSwitchHtml() {
        if (!this.showTypeSwitch) return '';
        const lineActive = this.chartType === 'line' ? 'btn-primary' : 'btn-outline-primary';
        const barActive  = this.chartType === 'bar'  ? 'btn-primary' : 'btn-outline-primary';
        return `
            <div class="btn-group btn-group-sm" role="group">
                <button type="button" class="btn ${lineActive} btn-sm" data-action="set-chart-type" data-type="line" title="Line"><i class="bi bi-graph-up"></i></button>
                <button type="button" class="btn ${barActive} btn-sm"  data-action="set-chart-type" data-type="bar"  title="Bar"><i class="bi bi-bar-chart"></i></button>
            </div>`;
    }

    // ── escape helpers (for the few HTML-string interpolation points) ─

    _escHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    _escAttr(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ── action handlers ───────────────────────────────────────────────

    async onActionGranularityChanged(event, element) {
        const v = element.dataset?.value;
        if (!v || v === this.granularity) return;
        this.granularity = v;
        this.setQuickRange(MetricsChart.GRANULARITY_DEFAULTS[v] || '24h');
        this._updateDropdownActive('granularity-changed', v, 'value');
        await this.fetchData();
    }

    async onActionQuickRange(event, element) {
        const range = element.dataset?.range;
        if (!range) return;
        this.setQuickRange(range);
        this._updateDropdownActive('quick-range', range, 'range');
        await this.fetchData();
    }

    async onActionShowDateRangeDialog() {
        try {
            const data = await Dialog.showForm({
                title: 'Select Date Range',
                size: 'sm',
                fields: [
                    { name: 'dt_start', type: 'datetime-local', label: 'Start', value: this.formatDateTimeLocal(this.dateStart), required: true },
                    { name: 'dt_end',   type: 'datetime-local', label: 'End',   value: this.formatDateTimeLocal(this.dateEnd),   required: true }
                ]
            });
            if (data?.dt_start && data?.dt_end) {
                this.dateStart = new Date(data.dt_start);
                this.dateEnd = new Date(data.dt_end);
                this._updateDropdownActive('quick-range', '', 'range');
                await this.fetchData();
            }
        } catch (err) {
            console.error('Date range dialog error:', err);
        }
    }

    async onActionSetChartType(event, element) {
        event.stopPropagation();
        const t = element.getAttribute('data-type');
        if (!t || t === this.chartType) return;
        this.chartType = t;
        if (this.chart) this.chart.setChartType(t);
        // Refresh button styles by re-querying the toolbar.
        const btns = this.element?.querySelectorAll('[data-action="set-chart-type"]');
        btns?.forEach(b => {
            const isActive = b.getAttribute('data-type') === t;
            b.classList.toggle('btn-primary', isActive);
            b.classList.toggle('btn-outline-primary', !isActive);
        });
    }

    async onActionRetryFetch() {
        return this.fetchData();
    }

    _updateDropdownActive(action, activeValue, dataKey) {
        const items = this.element?.querySelectorAll(`[data-action="${action}"]`);
        items?.forEach(item => {
            const v = item.dataset?.[dataKey];
            item.classList.toggle('mc-selected', v === activeValue);
        });
    }

    // ── data ──────────────────────────────────────────────────────────

    buildApiParams() {
        const params = {
            granularity: this.granularity,
            account: this.account,
            with_labels: true
        };
        if (this.slugs) {
            this.slugs.forEach(slug => {
                if (!params['slugs[]']) params['slugs[]'] = [];
                params['slugs[]'].push(slug);
            });
        }
        if (this.category) params.category = this.category;
        if (this.dateStart) params.dr_start = Math.floor(this.dateStart.getTime() / 1000);
        if (this.dateEnd)   params.dr_end   = Math.floor(this.dateEnd.getTime() / 1000);
        params._ = Date.now();
        return params;
    }

    async fetchData() {
        if (!this.endpoint) return;
        this.isLoading = true;
        this._showLoading();

        try {
            const rest = this.getApp()?.rest;
            if (!rest) throw new Error('No REST client available');

            const params = this.buildApiParams();
            const response = await rest.GET(this.endpoint, params);

            if (!response.success) throw new Error(response.message || 'Network error');
            if (!response.data?.status) throw new Error(response.data?.error || 'Server error');

            const metrics = response.data.data;
            const chartData = this.processMetricsData(metrics);
            await this.setData(chartData);
            this.lastFetch = new Date();
            this._hideError();

            this.emit?.('metrics:data-loaded', { chart: this, data: metrics, params });
        } catch (err) {
            console.error('Failed to fetch metrics:', err);
            this._showError(`Failed to load metrics: ${err.message}`);
            this.emit?.('metrics:error', { chart: this, error: err });
        } finally {
            this.isLoading = false;
            this._hideLoading();
        }
    }

    processMetricsData(data) {
        const { data: metrics, labels } = data || {};
        const entries = Object.entries(metrics || {});

        const ranked = entries.map(([metric, values]) => {
            const sanitized = (values || []).map(v => {
                if (v === null || v === undefined || v === '') return 0;
                return typeof v === 'number' ? v : (parseFloat(v) || 0);
            });
            const total = sanitized.reduce((s, v) => s + v, 0);
            return { metric, values: sanitized, total };
        });
        ranked.sort((a, b) => b.total - a.total);

        let visible = ranked;
        let other = null;
        if (this.maxDatasets && this.maxDatasets > 0 && ranked.length > this.maxDatasets) {
            visible = ranked.slice(0, this.maxDatasets);
            const remaining = ranked.slice(this.maxDatasets);
            const otherValues = (labels || []).map((_, i) =>
                remaining.reduce((s, e) => s + (e.values[i] || 0), 0)
            );
            other = {
                metric: this.groupRemainingLabel,
                values: otherValues,
                total: otherValues.reduce((s, v) => s + v, 0)
            };
        }

        const all = other ? [...visible, other] : visible;
        const datasets = all.map(entry => ({
            label: this.formatMetricLabel(entry.metric),
            data: entry.values
        }));

        return { labels: labels || [], datasets };
    }

    formatMetricLabel(metric) {
        return String(metric)
            .split('_')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    }

    async setData(chartData) {
        if (this.chart) this.chart.setData(chartData);
    }

    refresh() {
        return this.fetchData();
    }

    // ── overlays ──────────────────────────────────────────────────────

    _showLoading() {
        const el = this.element?.querySelector('[data-loading]');
        el?.classList.remove('d-none');
    }
    _hideLoading() {
        const el = this.element?.querySelector('[data-loading]');
        el?.classList.add('d-none');
    }
    _showError(msg) {
        const el = this.element?.querySelector('[data-error]');
        const m = el?.querySelector('.error-message');
        if (m) m.textContent = msg;
        el?.classList.remove('d-none');
    }
    _hideError() {
        const el = this.element?.querySelector('[data-error]');
        el?.classList.add('d-none');
    }

    // ── date utilities ────────────────────────────────────────────────

    static GRANULARITY_DEFAULTS = {
        minutes: '1h',
        hours:   '24h',
        days:    '30d',
        weeks:   '30d',
        months:  '30d'
    };

    setQuickRange(range) {
        const now = new Date();
        let start;
        switch (range) {
            case '1h':  start = new Date(now.getTime() - 60 * 60 * 1000); break;
            case '24h': start = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
            case '7d':  start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
            case '30d': start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
            default:    start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
        this.dateStart = start;
        this.dateEnd = now;
    }

    formatDateTimeLocal(date) {
        if (!date) return '';
        const y = date.getFullYear();
        const mo = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const mi = String(date.getMinutes()).padStart(2, '0');
        return `${y}-${mo}-${d}T${h}:${mi}`;
    }

    // ── public API ────────────────────────────────────────────────────

    setGranularity(granularity) {
        this.granularity = granularity;
        return this.fetchData();
    }

    setDateRange(startDate, endDate) {
        this.dateStart = new Date(startDate);
        this.dateEnd = new Date(endDate);
        return this.fetchData();
    }

    setMetrics(slugs) {
        this.slugs = [...slugs];
        return this.fetchData();
    }

    getStats() {
        return {
            isLoading: this.isLoading,
            lastFetch: this.lastFetch,
            granularity: this.granularity,
            slugs: this.slugs ? [...this.slugs] : [],
            dateRange: { start: this.dateStart, end: this.dateEnd }
        };
    }
}

export default MetricsChart;
