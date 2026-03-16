/**
 * MetricsChart - Specialized metrics chart extending SeriesChart
 * Provides header controls and a REST-based fetch to transform API data into Chart.js format
 */

import SeriesChart from './SeriesChart.js';
import Dialog from '@core/views/feedback/Dialog.js';

export default class MetricsChart extends SeriesChart {
  constructor(options = {}) {
    super({
      ...options,
      chartType: options.chartType || 'line',
      title: options.title || 'Metrics',
      colors: options.colors,
      yAxis: options.yAxis || { label: 'Count', beginAtZero: true },
      tooltip: options.tooltip || { y: 'number' },
      width: options.width,
      height: options.height
    });

    // API configuration
    this.endpoint = options.endpoint || '/api/metrics/fetch';
    this.account = options.account || 'global';

    // Initial parameters
    this.granularity = options.granularity || 'hours';
    this.slugs = options.slugs || null;
    this.category = options.category || null;
    this.dateStart = options.dateStart || null;
    this.dateEnd = options.dateEnd || null;
    this.defaultDateRange = options.defaultDateRange || '24h';

    // Control visibility options
    this.showGranularity = options.showGranularity !== false;
    this.showDateRange = options.showDateRange !== false;

    // Options for controls
    this.granularityOptions = options.granularityOptions || [
      { value: 'minutes', label: 'Minutes' },
      { value: 'hours', label: 'Hours' },
      { value: 'days', label: 'Days' },
      { value: 'weeks', label: 'Weeks' },
      { value: 'months', label: 'Months' }
    ];

    this.quickRanges = options.quickRanges || [
      { value: '1h', label: '1H' },
      { value: '24h', label: '24H' },
      { value: '7d', label: '7D' },
      { value: '30d', label: '30D' }
    ];

    this.availableMetrics = options.availableMetrics || [
      { value: 'api_calls', label: 'API Calls' },
      { value: 'api_errors', label: 'API Errors' },
      { value: 'incident_evt', label: 'System Events' },
      { value: 'incidents', label: 'Incidents' }
    ];

    // Dataset limiting (useful for charts with many categories e.g., countries)
    this.maxDatasets = Number.isFinite(options.maxDatasets) ? options.maxDatasets : null;
    this.groupRemainingLabel = options.groupRemainingLabel || 'Other';

    // State
    this.isLoading = false;
    this.lastFetch = null;

    // Initialize date range if missing
    if (!this.dateStart || !this.dateEnd) {
      this.setQuickRange(this.defaultDateRange);
    }
  }

  async onInit() {
    // Build gear dropdown menu items
    const menuItems = [];

    // Granularity options
    if (this.showGranularity) {
      menuItems.push('<li><h6 class="dropdown-header">Granularity</h6></li>');
      for (const opt of this.granularityOptions) {
        const selected = opt.value === this.granularity ? ' mc-selected' : '';
        menuItems.push(`<li><a class="dropdown-item${selected}" role="button" data-action="granularity-changed" data-value="${opt.value}">${opt.label}</a></li>`);
      }
    }

    // Quick date ranges
    if (this.showDateRange) {
      if (menuItems.length) menuItems.push('<li><hr class="dropdown-divider"></li>');
      menuItems.push('<li><h6 class="dropdown-header">Date Range</h6></li>');
      for (const qr of this.quickRanges) {
        const selected = qr.value === this.defaultDateRange ? ' mc-selected' : '';
        menuItems.push(`<li><a class="dropdown-item${selected}" role="button" data-action="quick-range" data-range="${qr.value}">${qr.label}</a></li>`);
      }
      menuItems.push(`<li><a class="dropdown-item" role="button" data-action="show-date-range-dialog"><i class="bi bi-calendar-range me-1"></i>Custom Range...</a></li>`);
    }

    const gearHtml = menuItems.length ? `
      <style>
        .mc-gear-menu .dropdown-item.mc-selected { background: #f0f0f0; color: inherit; }
        .mc-gear-menu .dropdown-item.mc-selected::before { content: '\\F633'; font-family: 'bootstrap-icons'; margin-right: 0.4rem; font-size: 0.75em; }
      </style>
      <div class="btn-group btn-group-sm me-2">
        <button type="button" class="btn btn-outline-secondary btn-sm dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false" title="Chart Settings">
          <i class="bi bi-gear"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end mc-gear-menu">${menuItems.join('')}</ul>
      </div>` : '';

    // Use SeriesChart's built-in line/bar toggle
    this.showTypeSwitch = true;

    const controls = [];
    if (gearHtml) controls.push({ type: 'html', html: gearHtml });

    this.headerConfig = {
      titleHtml: this.title || 'Metrics',
      chartTitle: this.chartTitle || '',
      showExport: this.exportEnabled === true,
      showRefresh: this.refreshEnabled,
      showTheme: false,
      controls
    };

    await super.onInit();
  }

  // ─── Granularity → date range mapping ──────────────────────────────────────
  // When granularity changes, auto-pick a sensible date range so we get
  // a reasonable number of data points (not 10,000 minute-buckets over 30 days).

  static GRANULARITY_DEFAULTS = {
    minutes: '1h',    // ~60 points
    hours:   '24h',   // ~24 points
    days:    '30d',   // ~30 points
    weeks:   '30d',   // ~4 points (show more if available)
    months:  '30d'    // ~1 point  (show more if available)
  };

  // Action Handlers
  async onActionGranularityChanged(event, element) {
    const newGranularity = element.dataset?.value || element.value;
    if (newGranularity && newGranularity !== this.granularity) {
      this.granularity = newGranularity;

      // Auto-adjust date range to match granularity
      const defaultRange = MetricsChart.GRANULARITY_DEFAULTS[newGranularity] || '24h';
      this.setQuickRange(defaultRange);

      // Update active states in dropdown
      this._updateDropdownActive('granularity-changed', newGranularity, 'value');

      await this.fetchData();
    }
    return true;
  }

  async onActionShowDateRangeDialog() {
    try {
      const data = await Dialog.showForm({
        title: 'Select Date Range',
        size: 'sm',
        fields: [
          {
            name: 'dt_start',
            type: 'datetime-local',
            label: 'Start',
            value: this.formatDateTimeLocal(this.dateStart),
            required: true
          },
          {
            name: 'dt_end',
            type: 'datetime-local',
            label: 'End',
            value: this.formatDateTimeLocal(this.dateEnd),
            required: true
          }
        ]
      });

      if (data?.dt_start && data?.dt_end) {
        this.dateStart = new Date(data.dt_start);
        this.dateEnd = new Date(data.dt_end);
        // Clear quick range active states since we're using custom
        this._updateDropdownActive('quick-range', '', 'range');
        await this.fetchData();
      }
    } catch (error) {
      console.error('Date range dialog error:', error);
    }
    return true;
  }

  async onActionQuickRange(event, el) {
    const range = el.dataset?.range;
    if (!range) return true;

    this.setQuickRange(range);
    this._updateDropdownActive('quick-range', range, 'range');
    await this.fetchData();
    return true;
  }

  _updateDropdownActive(action, activeValue, dataKey) {
    const items = this.element?.querySelectorAll(`[data-action="${action}"]`);
    if (!items) return;
    items.forEach(item => {
      const val = item.dataset?.[dataKey];
      item.classList.toggle('mc-selected', val === activeValue);
    });
  }

  // Data Management
  buildApiParams() {
    const params = {
      granularity: this.granularity,
      account: this.account,
      with_labels: true
    };

    // Add slugs
    if (this.slugs) {
        this.slugs.forEach(slug => {
          if (!params['slugs[]']) params['slugs[]'] = [];
          params['slugs[]'].push(slug);
        });
    }

    if (this.category) {
        params.category = this.category;
    }
    // Date range
    if (this.dateStart) {
      params.dr_start = Math.floor(this.dateStart.getTime() / 1000);
    }
    if (this.dateEnd) {
      params.dr_end = Math.floor(this.dateEnd.getTime() / 1000);
    }

    // Cache buster
    params._ = Date.now();

    return params;
  }

  async fetchData() {
    if (!this.endpoint) return;

    this.isLoading = true;
    this.showLoading();

    try {
      const rest = this.getApp()?.rest;
      if (!rest) {
        throw new Error('No REST client available');
      }

      const params = this.buildApiParams();
      const response = await rest.GET(this.endpoint, params);

      // Handle Rest standardized response
      if (!response.success) {
        throw new Error(response.message || 'Network error');
      }
      if (!response.data?.status) {
        throw new Error(response.data?.error || 'Server error');
      }

      const metricsData = response.data.data;
      const chartData = this.processMetricsData(metricsData);
      await this.setData(chartData);
      this.lastFetch = new Date();

      // Emit success event
      this.emit('metrics:data-loaded', {
        chart: this,
        data: metricsData,
        params
      });

    } catch (error) {
      console.error('Failed to fetch metrics data:', error);
      this.showError(`Failed to load metrics: ${error.message}`);

      // Emit error event
      this.emit('metrics:error', { chart: this, error });

    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  }

  processMetricsData(data) {
    // Expecting: { labels: [...], data: { metric_slug: [values...] } }
    const { data: metricsData, labels } = data;
    const metricEntries = Object.entries(metricsData || {});

    const rankedEntries = metricEntries.map(([metric, values]) => {
      const sanitizedValues = values.map(val => {
        if (val === null || val === undefined || val === '') return 0;
        return typeof val === 'number' ? val : (parseFloat(val) || 0);
      });
      const total = sanitizedValues.reduce((sum, val) => sum + val, 0);
      return { metric, values: sanitizedValues, total };
    });

    rankedEntries.sort((a, b) => b.total - a.total);

    let visibleEntries = rankedEntries;
    let otherEntry = null;

    if (this.maxDatasets && this.maxDatasets > 0 && rankedEntries.length > this.maxDatasets) {
      visibleEntries = rankedEntries.slice(0, this.maxDatasets);
      const remaining = rankedEntries.slice(this.maxDatasets);

      const otherValues = labels.map((_, index) =>
        remaining.reduce((sum, entry) => sum + (entry.values[index] || 0), 0)
      );

      otherEntry = {
        metric: this.groupRemainingLabel,
        values: otherValues,
        total: otherValues.reduce((sum, val) => sum + val, 0),
        isGrouped: true
      };
    }

    const datasets = [];
    const allEntries = otherEntry ? [...visibleEntries, otherEntry] : visibleEntries;

    this.ensureColorPool(allEntries.length);
    const backgroundAlpha = this.chartType === 'line' ? 0.25 : 0.65;

    allEntries.forEach((entry, index) => {
      const baseColor = this.getColor(index);
      datasets.push({
        label: this.formatMetricLabel(entry.metric),
        data: entry.values,
        backgroundColor: this.withAlpha(baseColor, backgroundAlpha),
        borderColor: baseColor,
        borderWidth: 2,
        tension: this.chartType === 'line' ? 0.4 : 0,
        fill: false,
        pointRadius: this.chartType === 'line' ? 3 : 0,
        pointHoverRadius: 5
      });
    });

    return { labels, datasets };
  }

  formatMetricLabel(metric) {
    return metric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Date utilities
  setQuickRange(range) {
    const now = new Date();
    let startDate;

    switch (range) {
      case '1h':
        startDate = new Date(now.getTime() - (60 * 60 * 1000));
        break;
      case '24h':
        startDate = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        break;
      case '7d':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case '30d':
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        break;
      default:
        startDate = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    }

    this.dateStart = startDate;
    this.dateEnd = now;
  }

  formatDateTimeLocal(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  formatDateRangeDisplay() {
    if (!this.dateStart || !this.dateEnd) return 'Select Range';

    const fmt = (d) => {
      const mon = d.toLocaleString('default', { month: 'short' });
      const day = d.getDate();
      const hrs = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${mon} ${day} ${hrs}:${min}`;
    };

    // Check if this matches a quick range (within 2 min tolerance)
    const diffMs = this.dateEnd.getTime() - this.dateStart.getTime();
    const diffHours = diffMs / (60 * 60 * 1000);
    if (Math.abs(diffHours - 1) < 0.05) return 'Last 1H';
    if (Math.abs(diffHours - 24) < 0.05) return 'Last 24H';
    const diffDays = diffMs / (24 * 60 * 60 * 1000);
    if (Math.abs(diffDays - 7) < 0.05) return 'Last 7D';
    if (Math.abs(diffDays - 30) < 0.5) return 'Last 30D';

    return `${fmt(this.dateStart)} – ${fmt(this.dateEnd)}`;
  }

  // Public API
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
    const base = super.getStats();
    return {
      ...base,
      lastFetch: this.lastFetch,
      granularity: this.granularity,
      slugs: [...this.slugs],
      dateRange: {
        start: this.dateStart,
        end: this.dateEnd
      }
    };
  }
}
