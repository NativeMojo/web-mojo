/**
 * MetricsMiniChart - MiniChart with API integration
 * Extends MiniChart to add /api/metrics/fetch support (same API as MetricsChart)
 */

import MiniChart from './MiniChart.js';

export default class MetricsMiniChart extends MiniChart {
  constructor(options = {}) {
    super(options);

    // API configuration (matching MetricsChart)
    this.endpoint = options.endpoint || '/api/metrics/fetch';
    this.account = options.account || 'global';
    this.granularity = options.granularity || 'hours';
    this.slugs = options.slugs || null; // Single slug or array of slugs
    this.category = options.category || null;
    this.dateStart = options.dateStart || null;
    this.dateEnd = options.dateEnd || null;
    this.defaultDateRange = options.defaultDateRange || null;

    // State
    this.isLoading = false;
    this.lastFetch = null;
    this.refreshInterval = options.refreshInterval;

    // ONLY initialize date range if defaultDateRange is explicitly provided
    if (this.defaultDateRange && !this.dateStart && !this.dateEnd) {
      this.setQuickRange(this.defaultDateRange);
    }

    // Normalize slugs to array
    if (this.slugs && !Array.isArray(this.slugs)) {
      this.slugs = [this.slugs];
    }
  }

  async onAfterRender() {
    await super.onAfterRender();

    // Fetch initial data if endpoint provided and no data
    if (this.endpoint && (!this.data || this.data.length === 0)) {
      this.fetchData();
    }

    // Setup auto-refresh if configured
    if (this.refreshInterval && this.endpoint) {
      this.startAutoRefresh();
    }
  }

  buildApiParams() {
    const params = {
      granularity: this.granularity,
      account: this.account,
      with_labels: true
    };

    // Add slugs
    if (this.slugs && this.slugs.length > 0) {
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
      this.processMetricsData(metricsData);
      this.lastFetch = new Date();

      // Re-render to show updated values
      await this.render();

      this.emit('metrics:loaded', { chart: this, data: metricsData, params });

    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      this.emit('metrics:error', { chart: this, error });
    } finally {
      this.isLoading = false;
    }
  }

  processMetricsData(metricsData) {
    // Expecting: { labels: [...], data: { metric_slug: [values...] } }
    const { data: metrics, labels } = metricsData;

    if (!metrics) return;

    // Get the first (or only) metric's data
    const metricKeys = Object.keys(metrics);
    if (metricKeys.length === 0) return;

    const metricSlug = metricKeys[0];
    const values = metrics[metricSlug];

    // Sanitize values
    const sanitizedValues = values.map(val => {
      if (val === null || val === undefined || val === '') return 0;
      return typeof val === 'number' ? val : (parseFloat(val) || 0);
    });

    // Update labels (for tooltips)
    this.labels = labels || null;

    // Update chart data
    this.setData(sanitizedValues);
  }

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

  startAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      this.fetchData();
    }, this.refreshInterval);
  }

  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
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
    this.slugs = Array.isArray(slugs) ? slugs : [slugs];
    return this.fetchData();
  }

  refresh() {
    return this.fetchData();
  }

  async onBeforeDestroy() {
    this.stopAutoRefresh();
    await super.onBeforeDestroy();
  }
}
