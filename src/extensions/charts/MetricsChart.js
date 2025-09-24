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
      colors: options.colors || [
        'rgba(54, 162, 235, 0.8)',   // Blue
        'rgba(255, 99, 132, 0.8)',   // Red
        'rgba(75, 192, 192, 0.8)',   // Green
        'rgba(255, 206, 86, 0.8)',   // Yellow
        'rgba(153, 102, 255, 0.8)',  // Purple
        'rgba(255, 159, 64, 0.8)',   // Orange
        'rgba(199, 199, 199, 0.8)',  // Grey
        'rgba(83, 102, 255, 0.8)'    // Indigo
      ],
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

    // State
    this.isLoading = false;
    this.lastFetch = null;

    // Initialize date range if missing
    if (!this.dateStart || !this.dateEnd) {
      this.setQuickRange(this.defaultDateRange);
    }
  }

  async onInit() {
    // Build header controls for granularity and date range
    const controls = [];

    if (this.showGranularity) {
      controls.push({
        type: 'select',
        name: 'granularity',
        action: 'granularity-changed',
        size: 'sm',
        options: this.granularityOptions.map(opt => ({
          value: opt.value,
          label: opt.label,
          selected: opt.value === this.granularity
        }))
      });
    }

    if (this.showDateRange) {
      controls.push({
        type: 'button',
        action: 'show-date-range-dialog',
        labelHtml: `<i class="bi bi-calendar-range me-1"></i>${this.formatDateRangeDisplay()}`,
        title: 'Select Date Range',
        variant: 'outline-secondary',
        size: 'sm'
      });
    }

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

  // Action Handlers
  async onActionGranularityChanged(event, element) {
    const newGranularity = element.value;
    if (newGranularity && newGranularity !== this.granularity) {
      this.granularity = newGranularity;
      await this.fetchData();
    }
  }

  async onActionShowDateRangeDialog() {
    try {
      const result = await Dialog.showForm({
        title: 'Select Date Range',
        size: 'md',
        fields: [
          {
            name: 'dateRange',
            type: 'daterange',
            label: 'Date Range',
            startName: 'dt_start',
            endName: 'dt_end',
            startDate: this.formatDateTimeLocal(this.dateStart),
            endDate: this.formatDateTimeLocal(this.dateEnd),
            required: true
          }
        ],
        formConfig: {
          options: {
            submitButton: false,
            resetButton: false
          }
        }
      });

      if (result && result.startDate && result.endDate) {
        this.dateStart = new Date(result.startDate);
        this.dateEnd = new Date(result.endDate);

        // Update the header button label
        const btn = this.element?.querySelector('[data-action="show-date-range-dialog"]');
        if (btn) {
          btn.innerHTML = `<i class="bi bi-calendar-range me-1"></i>${this.formatDateRangeDisplay()}`;
        }

        await this.fetchData();
      }
    } catch (error) {
      console.error('Date range dialog error:', error);
    }
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
    const datasets = [];

    Object.keys(metricsData).forEach((metric, index) => {
      const values = metricsData[metric];

      const sanitizedValues = values.map(val => {
        if (val === null || val === undefined || val === '') return 0;
        return typeof val === 'number' ? val : (parseFloat(val) || 0);
      });

      datasets.push({
        label: this.formatMetricLabel(metric),
        data: sanitizedValues,
        backgroundColor: this.colors[index % this.colors.length].replace('0.8', '0.6'),
        borderColor: this.colors[index % this.colors.length],
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
