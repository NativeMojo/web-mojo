/**
 * MetricsMiniChart - Metrics display with integrated mini sparkline
 * Shows a metric value with label and a small trend chart
 * Supports the same /api/metrics/fetch API as MetricsChart
 */

import View from '@core/View.js';
import MiniChart from './MiniChart.js';

export default class MetricsMiniChart extends View {
  constructor(options = {}) {
    super({
      className: 'metrics-mini-chart',
      ...options
    });

    // Metric data
    this.label = options.label || '';
    this.value = options.value || 0;
    this.data = options.data || [];
    this.trend = options.trend; // 'up', 'down', or auto-calculate
    this.trendValue = options.trendValue; // Percentage change
    
    // Chart configuration
    this.chartType = options.chartType || 'line';
    this.chartWidth = options.chartWidth || 100;
    this.chartHeight = options.chartHeight || 40;
    this.chartColor = options.chartColor || 'rgba(54, 162, 235, 1)';
    this.fill = options.fill !== false;
    this.smoothing = options.smoothing || 0.3;
    
    // Formatting
    this.valueFormatter = options.valueFormatter || null;
    this.suffix = options.suffix || '';
    this.prefix = options.prefix || '';
    
    // Styling
    this.variant = options.variant || 'default'; // 'default', 'success', 'danger', 'warning', 'info'
    this.size = options.size || 'md'; // 'sm', 'md', 'lg'
    
    // Layout
    this.layout = options.layout || 'horizontal'; // 'horizontal' or 'vertical'
    
    // API configuration (matching MetricsChart)
    this.endpoint = options.endpoint || '/api/metrics/fetch';
    this.account = options.account || 'global';
    this.granularity = options.granularity || 'hours';
    this.slugs = options.slugs || null; // Single slug or array of slugs
    this.category = options.category || null;
    this.dateStart = options.dateStart || null;
    this.dateEnd = options.dateEnd || null;
    this.defaultDateRange = options.defaultDateRange || '24h';
    
    // State
    this.isLoading = false;
    this.lastFetch = null;
    this.refreshInterval = options.refreshInterval;
    
    // Initialize date range if missing
    if (!this.dateStart || !this.dateEnd) {
      this.setQuickRange(this.defaultDateRange);
    }
    
    // Normalize slugs to array
    if (this.slugs && !Array.isArray(this.slugs)) {
      this.slugs = [this.slugs];
    }
    
    // Create mini chart instance
    this.miniChart = null;
  }

  getTemplate() {
    const sizeClass = `metrics-mini-chart-${this.size}`;
    const variantClass = this.variant !== 'default' ? `metrics-mini-chart-${this.variant}` : '';
    const layoutClass = `metrics-mini-chart-${this.layout}`;
    
    return `
      <div class="metrics-mini-chart-container ${sizeClass} ${variantClass} ${layoutClass}">
        <div class="metrics-info">
          <div class="metrics-label">${this.escapeHtml(this.label)}</div>
          <div class="metrics-value-row">
            <div class="metrics-value" data-ref="value">
              ${this.formatValue(this.value)}
            </div>
            ${this.renderTrendBadge()}
          </div>
        </div>
        <div class="metrics-chart" data-container="chart"></div>
      </div>
    `;
  }

  async onInit() {
    // Create mini chart
    this.miniChart = new MiniChart({
      chartType: this.chartType,
      data: this.data,
      width: this.chartWidth,
      height: this.chartHeight,
      color: this.getChartColor(),
      fillColor: this.getFillColor(),
      fill: this.fill,
      smoothing: this.smoothing,
      animate: true
    });
    
    this.addChild(this.miniChart, 'chart');
    
    // Setup auto-refresh if configured
    if (this.refreshInterval && this.endpoint) {
      this.startAutoRefresh();
    }
  }

  async onAfterRender() {
    await super.onAfterRender();
    
    // Fetch initial data if endpoint provided
    if (this.endpoint && this.data.length === 0) {
      await this.fetchData();
    }
  }

  renderTrendBadge() {
    if (!this.trend && this.trendValue === undefined) {
      return '';
    }
    
    const trend = this.trend || (this.trendValue > 0 ? 'up' : 'down');
    const trendIcon = trend === 'up' ? 'bi-arrow-up' : 'bi-arrow-down';
    const trendClass = trend === 'up' ? 'trend-up' : 'trend-down';
    const trendValueStr = this.trendValue !== undefined 
      ? `${Math.abs(this.trendValue)}%` 
      : '';
    
    return `
      <span class="metrics-trend ${trendClass}">
        <i class="bi ${trendIcon}"></i>
        ${trendValueStr}
      </span>
    `;
  }

  getChartColor() {
    // Return color based on variant
    const colorMap = {
      success: 'rgba(75, 192, 192, 1)',
      danger: 'rgba(255, 99, 132, 1)',
      warning: 'rgba(255, 206, 86, 1)',
      info: 'rgba(54, 162, 235, 1)',
      default: this.chartColor
    };
    
    return colorMap[this.variant] || this.chartColor;
  }

  getFillColor() {
    const color = this.getChartColor();
    // Convert to fill with low opacity
    return color.replace(/[\d.]+\)$/, '0.1)');
  }

  formatValue(value) {
    let formatted = value;
    
    if (this.valueFormatter) {
      // Use custom formatter
      if (typeof this.valueFormatter === 'function') {
        formatted = this.valueFormatter(value);
      } else if (this.dataFormatter) {
        formatted = this.dataFormatter.pipe(value, this.valueFormatter);
      }
    } else {
      // Default formatting
      if (typeof value === 'number') {
        formatted = value.toLocaleString();
      }
    }
    
    return `${this.prefix}${formatted}${this.suffix}`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
    
    // Update chart data
    this.setData(sanitizedValues);
    
    // Calculate current value (latest data point)
    const currentValue = sanitizedValues[sanitizedValues.length - 1] || 0;
    this.setValue(currentValue);
    
    // Auto-calculate trend if we have at least 2 data points
    if (sanitizedValues.length >= 2) {
      const firstValue = sanitizedValues[0];
      const lastValue = sanitizedValues[sanitizedValues.length - 1];
      
      if (firstValue !== 0) {
        this.trendValue = parseFloat(((lastValue - firstValue) / firstValue * 100).toFixed(1));
        this.trend = this.trendValue >= 0 ? 'up' : 'down';
      }
    }
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
  setValue(value) {
    this.value = value;
    const valueElement = this.element?.querySelector('[data-ref="value"]');
    if (valueElement) {
      valueElement.textContent = this.formatValue(value);
    }
  }

  setData(data) {
    this.data = data;
    if (this.miniChart) {
      this.miniChart.setData(data);
    }
    
    // Auto-calculate trend if not set
    if (data.length >= 2 && this.trendValue === undefined) {
      const first = typeof data[0] === 'object' ? data[0].value : data[0];
      const last = typeof data[data.length - 1] === 'object' ? data[data.length - 1].value : data[data.length - 1];
      
      if (first !== 0) {
        this.trendValue = ((last - first) / first * 100).toFixed(1);
        this.trend = this.trendValue > 0 ? 'up' : 'down';
      }
    }
  }

  setLabel(label) {
    this.label = label;
    const labelElement = this.element?.querySelector('.metrics-label');
    if (labelElement) {
      labelElement.textContent = label;
    }
  }

  setVariant(variant) {
    if (this.element) {
      this.element.querySelector('.metrics-mini-chart-container')
        ?.classList.remove(`metrics-mini-chart-${this.variant}`);
      this.element.querySelector('.metrics-mini-chart-container')
        ?.classList.add(`metrics-mini-chart-${variant}`);
    }
    this.variant = variant;
    
    if (this.miniChart) {
      this.miniChart.setColor(this.getChartColor());
    }
  }

  refresh() {
    return this.fetchData();
  }

  async onBeforeDestroy() {
    this.stopAutoRefresh();
    await super.onBeforeDestroy();
  }
}
