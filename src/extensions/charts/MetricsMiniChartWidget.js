/**
 * MetricsMiniChartWidget - Bootstrap card wrapper around MetricsMiniChart
 *
 * Renders a compact card with:
 *  - icon (Bootstrap Icons class)
 *  - title
 *  - subtitle (inserted raw into the template so Mustache can render tokens like '{{total}}')
 *  - optional trending indicator (up/down percent) under the subtitle
 *  - embedded MetricsMiniChart
 *
 * Usage:
 * new MetricsMiniChartWidget({
 *   icon: "bi bi-credit-card-fill",
 *   title: 'Declined Transactions',
 *   subtitle: '{{total}} Transactions', // will be rendered by Mustache at runtime
 *   background: "#F3465D",
 *   textColor: "#FFFFFF",
 *   granularity: 'hours',
 *   slugs: ['pos_tx_declined'],
 *   account: 'global',
 *   chartType: 'bar',
 *   showTooltip: true,
 *   showXAxis: true,
 *   height: 80,
 *   chartWidth: '100%',
 *   color: 'rgba(245, 245, 255, 0.8)',
 *   fill: true,
 *   fillColor: 'rgba(245, 245, 255, 0.6)',
 *   smoothing: 0.3,
 *   showTrending: true, // optional
 *   containerId: 'decline-24h-chart'
 * });
 */

import View from '@core/View.js';
import MetricsMiniChart from './MetricsMiniChart.js';

export default class MetricsMiniChartWidget extends View {
  constructor(options = {}) {
    super({
      ...options,
      tagName: 'div',
      className: `metrics-mini-chart-widget ${options.className || ''}`.trim()
    });

    // Display config
    this.icon = options.icon || null;
    this.title = options.title || '';
    // Subtitle is injected RAW into the template string so Mustache parses its tokens
    this.subtitle = options.subtitle || '';
    this.background = options.background || null;
    this.textColor = options.textColor || null;

    // Trending options/state
    this.showTrending = !!options.showTrending;
    this.trendRange = options.trendRange ?? null;   // e.g. 4 => compare last 2 vs prev 2
    this.trendOffset = options.trendOffset ?? 0;    // e.g. 1 => skip most recent incomplete bucket
    this.prevTrendOffset = options.prevTrendOffset ?? 0; // e.g. 7 => align previous window to same day last week
    this.total = 0;
    this.lastValue = 0;
    this.prevValue = 0;
    this.trendingPercent = 0;
    this.trendingUp = null; // null means unknown
    this.hasTrending = false;
    this.trendingClass = '';
    this.trendingIcon = '';
    this.trendingLabel = '';

    // Chart config (we'll forward these to the child MetricsMiniChart)
    this.chartOptions = {
      endpoint: options.endpoint, // defaults inside MetricsMiniChart
      account: options.account,
      granularity: options.granularity,
      slugs: options.slugs,
      category: options.category,
      dateStart: options.dateStart,
      dateEnd: options.dateEnd,
      defaultDateRange: options.defaultDateRange,
      refreshInterval: options.refreshInterval,

      // Visuals and interactions
      chartType: options.chartType || 'line',
      showTooltip: options.showTooltip !== undefined ? options.showTooltip : true,
      showXAxis: options.showXAxis || false,
      height: options.height || 80,
      width: options.chartWidth || options.width || '100%',
      color: options.color,
      fill: options.fill !== undefined ? options.fill : true,
      fillColor: options.fillColor,
      smoothing: options.smoothing ?? 0.3,
      strokeWidth: options.strokeWidth,
      barGap: options.barGap,

      // Optional formatters and templates
      valueFormat: options.valueFormat,
      labelFormat: options.labelFormat,
      tooltipFormatter: options.tooltipFormatter,
      tooltipTemplate: options.tooltipTemplate,

      // Crosshair and axis styling overrides (optional passthroughs)
      showCrosshair: options.showCrosshair,
      crosshairColor: options.crosshairColor,
      crosshairWidth: options.crosshairWidth,
      xAxisColor: options.xAxisColor,
      xAxisWidth: options.xAxisWidth,
      xAxisDashed: options.xAxisDashed,

      // Other rendering params
      padding: options.padding,
      minValue: options.minValue,
      maxValue: options.maxValue,
      showDots: options.showDots,
      dotRadius: options.dotRadius,
      animate: options.animate,
      animationDuration: options.animationDuration
    };
  }

  async onInit() {
    // Create and register the child chart
    this.chart = new MetricsMiniChart({
      ...this.chartOptions,
      containerId: 'chart' // mount inside our template container
    });

    this.addChild(this.chart);

      this.header = new View({
          containerId: 'chart-header',
          title: this.title,
          icon: this.icon,
          template: `
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div class="me-3">
            <h6 class="card-title mb-1" style="${this.textColor ? `color: ${this.textColor}` : ''}">${this.title}</h6>
            <div class="card-subtitle" style="${this.textColor ? `color: ${this.textColor}` : ''}">${this.subtitle}</div>
              {{#hasTrending}}
                <div class="small mt-1 fw-semibold {{trendingClass}}"  style="${this.textColor ? `color: ${this.textColor}` : ''}">
                  <i class="{{trendingIcon}} me-1"></i>{{trendingLabel}}
                </div>
              {{/hasTrending}}
          </div>
          ${this.icon ? `<i class="${this.icon} fs-4 flex-shrink-0" aria-hidden="true" style="${this.textColor ? `color: ${this.textColor}` : ''}"></i>` : ''}
        </div>`
      });

    this.addChild(this.header);

    // Listen for data load events to compute totals/trending and refresh the widget UI
    if (this.chart?.on) {
      this.chart.on('metrics:loaded', this.onChildMetricsLoaded, this);
    }

    // If the chart already has data (e.g., provided via options), compute immediately
    this.updateFromChartData({ render: false });
  }

  onChildMetricsLoaded() {
    this.updateFromChartData({ render: true });
  }

  updateFromChartData({ render = true } = {}) {
    const values = Array.isArray(this.chart?.data) ? this.chart.data : null;
    if (!values || values.length === 0) {
      this.total = 0;
      this.hasTrending = false;
      // Refresh the view to ensure subtitle using {{total}} updates to 0
        this.header.title = this.title;
      if (render) this.render();
      return;
    }

    // Normalize values to numbers
    const nums = values.map((v) => {
      if (typeof v === 'number') return v;
      if (v && typeof v.value === 'number') return v.value;
      const n = parseFloat(v);
      return Number.isNaN(n) ? 0 : n;
    });

    // Compute total
    this.header.title = this.title;
    this.header.total = nums.reduce((a, b) => a + b, 0);
    const offset = Math.max(0, parseInt(this.trendOffset || 0, 10) || 0);
    const endIndex = Math.max(0, nums.length - 1 - offset);
    this.header.now_value = nums[endIndex];

    // Compute trending using windowed sums with optional offset
    let hasTrend = false;
    let lastSum = 0;
    let prevSum = 0;

    const k = (this.trendRange && this.trendRange >= 2) ? Math.max(1, Math.floor(this.trendRange / 2)) : 1;

    if (endIndex >= 0) {
      const lastEnd = endIndex;
      const lastStart = lastEnd - (k - 1);
      let prevStart, prevEnd;
      if (this.prevTrendOffset && this.prevTrendOffset > 0) {
        prevStart = lastStart - this.prevTrendOffset;
        prevEnd = lastEnd - this.prevTrendOffset;
      } else {
        prevEnd = lastStart - 1;
        prevStart = prevEnd - (k - 1);
      }

      if (lastStart >= 0 && prevStart >= 0) {
        // Sum helper
        const sumRange = (arr, s, e) => {
          let sum = 0;
          for (let i = s; i <= e; i++) sum += arr[i] || 0;
          return sum;
        };

        lastSum = sumRange(nums, lastStart, lastEnd);
        prevSum = sumRange(nums, prevStart, prevEnd);
        hasTrend = true;
      }
    }

    // Fallback to single-point comparison if not enough data for windows
    if (!hasTrend) {
      const prevIndex = endIndex - (this.prevTrendOffset && this.prevTrendOffset > 0 ? this.prevTrendOffset : 1);
      if (prevIndex >= 0) {
        lastSum = nums[endIndex];
        prevSum = nums[prevIndex];
        hasTrend = true;
      }
    }

    if (hasTrend) {
      this.header.lastValue = lastSum;
      this.header.prevValue = prevSum;

      let percent = 0;
      if (prevSum === 0) {
        percent = lastSum > 0 ? 100 : 0;
      } else {
        percent = ((lastSum - prevSum) / Math.abs(prevSum)) * 100;
      }

      this.header.trendingPercent = percent;
      this.header.trendingUp = percent >= 0;
      if (!this.textColor) {
          this.header.trendingClass = this.header.trendingUp ? 'text-success' : 'text-danger';
      } else {
          this.header.trendingClass = '';
      }

      this.header.trendingIcon = this.header.trendingUp ? 'bi bi-arrow-up' : 'bi bi-arrow-down';

      const sign = percent > 0 ? '+' : '';
      this.header.trendingLabel = `${sign}${percent.toFixed(1)}%`;
      this.header.hasTrending = true;
    } else {
      this.header.hasTrending = false;
    }

    if (render) {
      // Re-render to update the UI (subtitle with {{total}} and trending block)
      this.header.render();
    }
  }

  get cardStyle() {
    const styles = [];
    if (this.background) styles.push(`background: ${this.background}`);
    if (this.textColor) styles.push(`color: ${this.textColor}`);
    // Ensure inner elements inherit text color
    styles.push('border: 0');
    return styles.join('; ');
  }

  async getTemplate() {
    return `
      <div class="card h-100 shadow-sm" style="${this.cardStyle}">
        <div class="card-body p-3">
          <div data-container="chart-header"></div>
          <div data-container="chart"></div>
        </div>
      </div>
    `;
  }

  async onBeforeDestroy() {
    if (this.chart?.off) {
      this.chart.off('metrics:loaded', this.onChildMetricsLoaded, this);
    }
    await super.onBeforeDestroy();
  }

  refresh() {
    if (this.chart) {
        this.chart.account = this.account;
        this.chart.refresh();
    }
  }
}
