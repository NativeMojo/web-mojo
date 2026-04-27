/**
 * MetricsMiniChartWidget - Bootstrap card wrapper around MetricsMiniChart
 *
 * Renders a compact card with:
 *  - icon (Bootstrap Icons class)
 *  - title
 *  - subtitle (inserted raw into the template so Mustache can render tokens like '{{total}}')
 *  - optional trending indicator (up/down percent) under the subtitle
 *  - embedded MetricsMiniChart
 *  - optional settings dropdown (granularity, chartType, date range)
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
 *   showSettings: true, // optional - show settings dropdown
 *   settingsKey: 'myChart', // optional - localStorage key for persisting settings
 *   showDateRange: true, // optional - include date range in settings
 *   containerId: 'decline-24h-chart'
 * });
 */

import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import MetricsMiniChart from './MetricsMiniChart.js';

// Format a Date / ISO / 'YYYY-MM-DD' string as a value suitable for an
// HTML `<input type="date">`. Used to seed the settings dialog.
function formatDateForInput(date) {
    if (!date) return '';
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

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
    this.subtitle = options.subtitle || '';
    this.background = options.background || null;
    this.textColor = options.textColor || null;

    // Settings config
    this.showSettings = options.showSettings || false;
    this.settingsKey = options.settingsKey || null;
    this.showDateRange = options.showDateRange || false;
    this.showRefresh = options.showRefresh !== false;

    // Trending options/state
    this.showTrending = !!options.showTrending;
    this.trendRange = options.trendRange ?? null;
    this.trendOffset = options.trendOffset ?? 0;
    this.prevTrendOffset = options.prevTrendOffset ?? 0;
    this.total = 0;
    this.lastValue = 0;
    this.prevValue = 0;
    this.trendingPercent = 0;
    this.trendingUp = null;
    this.hasTrending = false;
    this.trendingClass = 'metrics-mini-chart-trending-text';
    this.trendingIcon = '';
    this.trendingLabel = '';

    // Chart config
    this.chartOptions = {
      endpoint: options.endpoint,
      account: options.account,
      granularity: options.granularity,
      slugs: options.slugs,
      category: options.category,
      dateStart: options.dateStart,
      dateEnd: options.dateEnd,
      defaultDateRange: options.defaultDateRange,
      refreshInterval: options.refreshInterval,
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
      valueFormat: options.valueFormat,
      labelFormat: options.labelFormat,
      tooltipFormatter: options.tooltipFormatter,
      tooltipTemplate: options.tooltipTemplate,
      showCrosshair: options.showCrosshair,
      crosshairColor: options.crosshairColor,
      crosshairWidth: options.crosshairWidth,
      xAxisColor: options.xAxisColor,
      xAxisWidth: options.xAxisWidth,
      xAxisDashed: options.xAxisDashed,
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
    // Load saved settings if available
    if (this.showSettings && this.settingsKey) {
      this._loadSettings();
    }

    // Create and register the child chart
    this.chart = new MetricsMiniChart({
      ...this.chartOptions,
      containerId: 'chart'
    });
    this.addChild(this.chart);

    // Create header view
    this.header = new View({
      containerId: 'chart-header',
      title: this.title,
      icon: this.icon,
      template: `
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div class="flex-grow-1">
            <h6 class="card-title mb-1" style="${this.textColor ? `color: ${this.textColor}` : ''}">${this.title}</h6>
            <div class="metrics-mini-chart-subtitle" style="${this.textColor ? `color: ${this.textColor}` : ''}">${this.subtitle}</div>
              {{#hasTrending}}
                <div class="{{trendingClass}}"  style="${this.textColor ? `color: ${this.textColor}` : ''}">
                  <i class="{{trendingIcon}} me-1"></i>{{trendingLabel}}
                </div>
              {{/hasTrending}}
          </div>
          ${this.icon ? `<i class="${this.icon} fs-4 flex-shrink-0" aria-hidden="true" style="${this.textColor ? `color: ${this.textColor}` : ''}"></i>` : ''}
        </div>`
    });
    this.addChild(this.header);

    // Settings now open as a Modal dialog on cog click (see
    // `onActionToggleSettings`). No SettingsView child is needed; this
    // sidesteps the popover-after-re-render bug where the cog stopped
    // working after navigating away and back.

    // Listen for data load events
    if (this.chart?.on) {
      this.chart.on('metrics:loaded', this.onChildMetricsLoaded, this);
    }

    this.updateFromChartData({ render: false });
  }

  async onAfterRender() {
    await super.onAfterRender();
  }

  onChildMetricsLoaded() {
    this.updateFromChartData({ render: true });
  }

  updateFromChartData({ render = true } = {}) {
    const values = Array.isArray(this.chart?.data) ? this.chart.data : null;
    if (!values || values.length === 0) {
      this.total = 0;
      this.hasTrending = false;
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
    
    // Set dynamic labels based on granularity
    this._updateGranularityLabels();

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
      this.header.hasTrending = this.showTrending;
    } else {
      this.header.hasTrending = false;
    }

    if (render) {
      this.header.render();
    }
  }

  _updateGranularityLabels() {
    const granularity = this.chartOptions.granularity || 'days';
    
    const nowLabels = {
      'hours': 'This Hour',
      'days': 'Today',
      'weeks': 'This Week',
      'months': 'This Month',
      'years': 'This Year'
    };
    
    const totalLabels = {
      'hours': 'Total (24h)',
      'days': 'Total (Period)',
      'weeks': 'Total (Period)',
      'months': 'Total (Period)',
      'years': 'Total (Period)'
    };
    
    this.header.now_label = nowLabels[granularity] || 'Current';
    this.header.total_label = totalLabels[granularity] || 'Total';
  }

  get cardStyle() {
    const styles = [];
    if (this.background) styles.push(`background: ${this.background}`);
    if (this.textColor) styles.push(`color: ${this.textColor}`);
    styles.push('border: 0');
    return styles.join('; ');
  }

  async getTemplate() {
    return `
      <div class="card h-100 shadow-sm" style="${this.cardStyle}; position: relative;">
        ${this.showRefresh || this.showSettings ? `
        <div class="metrics-chart-actions">
          ${this.showRefresh ? `
            <button class="btn btn-link p-0 text-muted metrics-refresh-btn" type="button" data-action="refresh-chart" style="${this.textColor ? `color: ${this.textColor} !important` : ''}">
              <i class="bi bi-arrow-clockwise"></i>
            </button>
          ` : ''}
          ${this.showSettings ? `
            <button class="btn btn-link p-0 text-muted metrics-settings-btn" type="button" data-action="toggle-settings" style="${this.textColor ? `color: ${this.textColor} !important` : ''}">
              <i class="bi bi-gear-fill"></i>
            </button>
          ` : ''}
        </div>
        ` : ''}
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

  /**
   * Open the settings dialog. Uses `Modal.form` so the chart's settings
   * UI is a proper modal — easier to use, theme-consistent with the rest
   * of the framework, and immune to the popover-after-re-render bug.
   */
  async onActionToggleSettings(event, element) {
    const fields = [
      {
        name: 'granularity',
        type: 'select',
        label: 'Granularity',
        value: this.chartOptions.granularity || 'hours',
        options: [
          { value: 'hours',  label: 'Hours' },
          { value: 'days',   label: 'Days' },
          { value: 'weeks',  label: 'Weeks' },
          { value: 'months', label: 'Months' },
          { value: 'years',  label: 'Years' }
        ]
      },
      {
        name: 'chartType',
        type: 'select',
        label: 'Chart Type',
        value: this.chartOptions.chartType || 'line',
        options: [
          { value: 'line', label: 'Line' },
          { value: 'bar',  label: 'Bar' }
        ]
      }
    ];

    if (this.showDateRange) {
      fields.push(
        {
          name: 'dateStart',
          type: 'date',
          label: 'Start date',
          value: formatDateForInput(this.chartOptions.dateStart)
        },
        {
          name: 'dateEnd',
          type: 'date',
          label: 'End date',
          value: formatDateForInput(this.chartOptions.dateEnd)
        }
      );
    }

    const data = await Modal.form({
      title: this.title ? `${this.title} — Settings` : 'Chart Settings',
      size: 'sm',
      submitText: 'Apply',
      cancelText: 'Cancel',
      fields
    });

    // Modal.form resolves with the form data on submit, or null on cancel.
    if (data) await this._handleSettingsApply(data);
  }

  /**
   * Handle settings apply
   * @private
   */
  async _handleSettingsApply(data) {
    let hasChanges = false;
    let granularityChanged = false;
    let datesExplicitlySet = false;

    // Check if dates were explicitly changed by user in the form
    if ((data.dateStart && data.dateStart !== this.chartOptions.dateStart) || 
        (data.dateEnd && data.dateEnd !== this.chartOptions.dateEnd)) {
      datesExplicitlySet = true;
    }

    // Apply granularity
    if (data.granularity && data.granularity !== this.chartOptions.granularity) {
      this.chartOptions.granularity = data.granularity;
      this.chart.granularity = data.granularity;
      granularityChanged = true;
      hasChanges = true;
    }

    // Apply chart type
    if (data.chartType && data.chartType !== this.chartOptions.chartType) {
      this.chartOptions.chartType = data.chartType;
      this.chart.chartType = data.chartType;
      hasChanges = true;
    }

    // Apply dates or auto-adjust based on granularity
    if (datesExplicitlySet) {
      // User explicitly set dates in the form
      if (data.dateStart) {
        this.chartOptions.dateStart = new Date(data.dateStart);
        this.chart.dateStart = new Date(data.dateStart);
      }
      if (data.dateEnd) {
        this.chartOptions.dateEnd = new Date(data.dateEnd);
        this.chart.dateEnd = new Date(data.dateEnd);
      }
      hasChanges = true;
    } else if (granularityChanged && (this.chartOptions.dateStart || this.chartOptions.dateEnd)) {
      // Only auto-adjust if dates were already set (don't set them for the first time)
      const endDate = new Date();
      let startDate;
      
      switch (data.granularity) {
        case 'hours':
          startDate = new Date(endDate.getTime() - (24 * 60 * 60 * 1000));
          break;
        case 'days':
          startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000));
          break;
        case 'weeks':
          startDate = new Date(endDate.getTime() - (12 * 7 * 24 * 60 * 60 * 1000));
          break;
        case 'months':
          startDate = new Date(endDate);
          startDate.setMonth(startDate.getMonth() - 12);
          break;
        case 'years':
          startDate = new Date(endDate);
          startDate.setFullYear(startDate.getFullYear() - 5);
          break;
        default:
          startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000));
      }
      
      this.chartOptions.dateStart = startDate;
      this.chart.dateStart = startDate;
      this.chartOptions.dateEnd = endDate;
      this.chart.dateEnd = endDate;
    }

    // Save and refresh if changes were made
    if (hasChanges) {
      this._saveSettings();
      await this.chart.refresh();
    }
  }

  /**
   * Handle refresh button click
   */
  async onActionRefreshChart(event, element) {
    const icon = element.querySelector('i');
    if (icon) {
      icon.classList.add('spin');
    }
    
    if (this.chart) {
      if (this.account) this.chart.account = this.account;
      await this.chart.refresh();
    }
    
    if (icon) {
      icon.classList.remove('spin');
    }
  }

  refresh() {
    if (this.chart) {
      if (this.account) this.chart.account = this.account;
      this.chart.refresh();
    }
  }

  _loadSettings() {
    if (!this.settingsKey) return;

    try {
      const stored = localStorage.getItem(`metrics-chart-${this.settingsKey}`);
      if (stored) {
        const settings = JSON.parse(stored);
        
        if (settings.granularity) {
          this.chartOptions.granularity = settings.granularity;
        }
        if (settings.chartType) {
          this.chartOptions.chartType = settings.chartType;
        }
        if (settings.dateStart !== undefined) {
          this.chartOptions.dateStart = settings.dateStart;
        }
        if (settings.dateEnd !== undefined) {
          this.chartOptions.dateEnd = settings.dateEnd;
        }
      }
    } catch (error) {
      console.error('Failed to load chart settings:', error);
    }
  }

  _saveSettings() {
    if (!this.settingsKey) return;

    try {
      const settings = {
        granularity: this.chartOptions.granularity,
        chartType: this.chartOptions.chartType,
        dateStart: this.chartOptions.dateStart,
        dateEnd: this.chartOptions.dateEnd
      };
      
      localStorage.setItem(`metrics-chart-${this.settingsKey}`, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save chart settings:', error);
    }
  }
}
