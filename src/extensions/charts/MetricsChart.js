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
import Modal from '@core/views/feedback/Modal.js';
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
        // Default to integer formatting — metric counts are typically whole
        // numbers, and DataFormatter's `number` formatter defaults to 2
        // decimals which would render Y-axis ticks as "60.00, 80.00, ..."
        // Callers that want decimals can pass tooltip: { y: 'number:2' }.
        this.tooltip = options.tooltip || { y: 'number:0' };
        this.colors = options.colors;
        this.colorGenerator = options.colorGenerator;
        this.legendPosition = options.legendPosition || 'top';
        this.legendJustify = options.legendJustify || 'start';
        this.showLegend = options.showLegend !== false;
        this.showXLabels = options.showXLabels !== false;
        this.showYLabels = options.showYLabels !== false;
        this.highlightOnHover = options.highlightOnHover === true;

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

        // Compact header — when true, drop the gear menu entirely and
        // show only a small inline range toggle. Used by dashboard panels
        // where the chart is sub-titled by the surrounding card and we
        // don't want the full granularity picker.
        this.compactHeader = options.compactHeader === true;
        if (this.compactHeader) {
            // In compact mode the gear menu is suppressed; the type switch
            // is also off by default since dashboard charts pin a type.
            this.showGranularity = false;
            this.showTypeSwitch = options.showTypeSwitch === true;
        }

        // Pass-through to the series API so KPI-style displays elsewhere
        // (and any caller that wants access to deltas) can request prev_data
        // + deltas in the same call. Note: this changes which endpoint is
        // hit — `series` (point-in-time + deltas) instead of `fetch`
        // (full time-series). Most chart use-cases want `fetch`; only set
        // this when you need deltas.
        this.withDelta = options.withDelta === true;
        if (this.withDelta && options.endpoint === undefined) {
            // Default endpoint switch — only when caller didn't pin one.
            this.endpoint = '/api/metrics/series';
        }

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
            xLabelFormat: this._resolveXLabelFormat(),
            colors: this.colors,
            colorGenerator: this.colorGenerator,
            showLegend: this.showLegend,
            legendPosition: this.legendPosition,
            legendJustify: this.legendJustify,
            showXLabels: this.showXLabels,
            showYLabels: this.showYLabels,
            highlightOnHover: this.highlightOnHover
        });
        this.addChild(this.chart);
    }

    /**
     * Resolve the xLabelFormat for the child chart. Caller-supplied
     * `tooltip.x` always wins (including explicit `null` for no formatting);
     * otherwise default from the granularity.
     * @private
     */
    _resolveXLabelFormat() {
        if (this.tooltip && this.tooltip.x !== undefined) return this.tooltip.x;
        return MetricsChart.X_LABEL_FORMAT_BY_GRANULARITY[this.granularity] || null;
    }

    async onAfterRender() {
        await this.fetchData();
    }

    // ── template ──────────────────────────────────────────────────────

    async getTemplate() {
        // In compact mode, suppress the header row entirely — no <h5>, no
        // gear menu, no type switch. Used by dashboard panels that have
        // their own card header above the chart.
        const headerHtml = this.compactHeader ? '' : `
                <div class="d-flex justify-content-between align-items-center mb-2 mojo-metrics-chart-header">
                    <h5 class="mb-0 mojo-metrics-chart-title">{{{title}}}</h5>
                    <div class="btn-toolbar" role="toolbar">
                        ${this._renderGearMenuHtml()}
                        ${this._renderTypeSwitchHtml()}
                    </div>
                </div>`;
        return `
            <div class="mojo-metrics-chart-container">
                ${headerHtml}
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
        // Update the child chart's xLabelFormat to match the new granularity
        // unless the caller pinned `tooltip.x`.
        if (this.chart && (!this.tooltip || this.tooltip.x === undefined)) {
            this.chart.xLabelFormat = this._resolveXLabelFormat();
        }
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
            const data = await Modal.form({
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
        if (this.withDelta) params.with_delta = true;
        if (this.slugs && this.slugs.length) {
            // Both /api/metrics/fetch AND /api/metrics/series require
            // `slugs=a,b,c` (plural, comma-separated). The singular
            // `slug=` form returns 400 "missing required parameter" on
            // the production backend (dev backend was permissive — this
            // bit us: empirical "both work" turned out to be wrong).
            // slugs[]=… also returns 400 / collapses to 'default'.
            params.slugs = this.slugs.join(',');
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
        // Split on both `_` and `:` so slugs like `firewall:blocks` and
        // `incident_events` produce "Firewall Blocks" / "Incident Events"
        // — clean, capitalized, no slug punctuation in the legend.
        return String(metric)
            .split(/[_:]/)
            .filter(Boolean)
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

    // Default xLabelFormat for the child SeriesChart, picked by granularity.
    // Caller-supplied `tooltip.x` overrides; pass `tooltip: { x: null }` for
    // explicit "no format" (raw labels).
    // X-label format defaults per granularity. `time` owns HH/mm tokens;
    // `date` owns YYYY/MMM/D tokens — they're separate formatters in
    // DataFormatter. Also note: a colon inside a format string would break
    // the pipe parser (`:` is the arg separator), so we use formats that
    // don't contain a literal colon (the `time` formatter's HH:mm token
    // string is fine because the `:` is part of the OUTPUT, not the format
    // tokens — DataFormatter's `time` formatter parses the colons in its
    // tokens correctly via its own internal parser).
    static X_LABEL_FORMAT_BY_GRANULARITY = {
        minutes: "time:'HH:mm'",
        hours:   "time:'HH:mm'",
        days:    "date:'MMM D'",
        weeks:   "date:'MMM D'",
        months:  "date:'MMM YYYY'"
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
        if (this.chart && (!this.tooltip || this.tooltip.x === undefined)) {
            this.chart.xLabelFormat = this._resolveXLabelFormat();
        }
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
