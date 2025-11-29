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
import MetricsMiniChart from './MetricsMiniChart.js';

/**
 * Settings content view for the popover
 * @private
 */
class SettingsView extends View {
  constructor(options = {}) {
    super({
      tagName: 'div',
      className: 'metrics-chart-settings-content',
      ...options
    });
    
    this.granularity = options.granularity;
    this.chartType = options.chartType;
    this.dateStart = options.dateStart;
    this.dateEnd = options.dateEnd;
    this.showDateRange = options.showDateRange;
  }
  
  getTemplate() {
    return `
      <div style="min-width: 220px;">
        <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
          <h6 class="mb-0">Chart Settings</h6>
          <button type="button" class="btn-close btn-close-sm" data-action="close" aria-label="Close"></button>
        </div>

        <label class="form-label small mb-1">Granularity</label>
        <select class="form-select form-select-sm mb-2" data-setting="granularity">
          <option value="hours" ${this.granularity === 'hours' ? 'selected' : ''}>Hours</option>
          <option value="days" ${this.granularity === 'days' ? 'selected' : ''}>Days</option>
          <option value="weeks" ${this.granularity === 'weeks' ? 'selected' : ''}>Weeks</option>
          <option value="months" ${this.granularity === 'months' ? 'selected' : ''}>Months</option>
          <option value="years" ${this.granularity === 'years' ? 'selected' : ''}>Years</option>
        </select>
        
        <label class="form-label small mb-1">Chart Type</label>
        <select class="form-select form-select-sm mb-2" data-setting="chartType">
          <option value="line" ${this.chartType === 'line' ? 'selected' : ''}>Line</option>
          <option value="bar" ${this.chartType === 'bar' ? 'selected' : ''}>Bar</option>
        </select>
        
        ${this.showDateRange ? `
        <label class="form-label small mb-1">Date Range</label>
        <input type="date" class="form-control form-control-sm mb-1" data-setting="dateStart" value="${this.dateStart || ''}" />
        <input type="date" class="form-control form-control-sm mb-2" data-setting="dateEnd" value="${this.dateEnd || ''}" />
        ` : ''}
        
        <div class="d-grid gap-2">
          <button type="button" class="btn btn-sm btn-primary" data-action="apply">Apply</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" data-action="cancel">Cancel</button>
        </div>
      </div>
    `;
  }
  
  async onActionApply() {
    const granularity = this.element.querySelector('[data-setting="granularity"]')?.value;
    const chartType = this.element.querySelector('[data-setting="chartType"]')?.value;
    const dateStart = this.element.querySelector('[data-setting="dateStart"]')?.value;
    const dateEnd = this.element.querySelector('[data-setting="dateEnd"]')?.value;
    
    this.emit('settings:apply', { granularity, chartType, dateStart, dateEnd });
  }
  
  async onActionCancel() {
    this.emit('settings:cancel');
  }
  
  async onActionClose() {
    this.emit('settings:cancel');
  }
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
    // Subtitle is injected RAW into the template string so Mustache parses its tokens
    this.subtitle = options.subtitle || '';
    this.background = options.background || null;
    this.textColor = options.textColor || null;

    // Settings config
    this.showSettings = options.showSettings || false;
    this.settingsKey = options.settingsKey || null;
    this.showDateRange = options.showDateRange || false;
    this.showRefresh = options.showRefresh !== false; // Enabled by default
    this._pendingSettings = null; // Store pending settings until Apply is clicked

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
    this.trendingClass = 'metrics-mini-chart-trending-text';
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
    // Load saved settings if available
    if (this.showSettings && this.settingsKey) {
      this._loadSettings();
    }

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

    // Listen for data load events to compute totals/trending and refresh the widget UI
    if (this.chart?.on) {
      this.chart.on('metrics:loaded', this.onChildMetricsLoaded, this);
    }

    // If the chart already has data (e.g., provided via options), compute immediately
    this.updateFromChartData({ render: false });
  }

  async onAfterRender() {
    await super.onAfterRender();

    // Initialize popover if settings are enabled
    if (this.showSettings) {
      this._initSettingsPopover();
    }
  }

  onChildMetricsLoaded() {
    this.updateFromChartData({ render: true });
    
    // Reinitialize popover after chart updates (in case DOM was re-rendered)
    // Skip if we just applied settings (to avoid double initialization)
    if (this.showSettings && this.isMounted() && !this._skipNextPopoverInit) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        this._initSettingsPopover();
      }, 100);
    }
    
    // Reset flag
    this._skipNextPopoverInit = false;
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
      this.header.hasTrending = this.showTrending;
    } else {
      this.header.hasTrending = false;
    }

    if (render) {
      // Re-render to update the UI (subtitle with {{total}} and trending block)
      this.header.render();
    }
  }

  /**
   * Update labels based on current granularity
   * @private
   */
  _updateGranularityLabels() {
    const granularity = this.chartOptions.granularity || 'days';
    
    // Mapping for "now" label (current/most recent bucket)
    const nowLabels = {
      'hours': 'This Hour',
      'days': 'Today',
      'weeks': 'This Week',
      'months': 'This Month',
      'years': 'This Year'
    };
    
    // Mapping for "total" label (sum of all buckets in range)
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
    // Ensure inner elements inherit text color
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
            <button class="btn btn-link p-0 text-muted metrics-settings-btn" type="button" data-settings-trigger style="${this.textColor ? `color: ${this.textColor} !important` : ''}">
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
    // Clean up settings view
    if (this._settingsView) {
      await this._settingsView.destroy();
      this._settingsView = null;
    }
    
    // Dispose of popover
    if (this._settingsPopover) {
      this._settingsPopover.dispose();
      this._settingsPopover = null;
    }

    if (this.chart?.off) {
      this.chart.off('metrics:loaded', this.onChildMetricsLoaded, this);
    }
    await super.onBeforeDestroy();
  }

  /**
   * Initialize settings popover
   * @private
   */
  _initSettingsPopover() {
    const button = this.element.querySelector('[data-settings-trigger]');
    if (!button) return;

    // Clean up existing
    if (this._settingsView) {
      this._settingsView.destroy();
      this._settingsView = null;
    }
    if (this._settingsPopover) {
      this._settingsPopover.dispose();
      this._settingsPopover = null;
    }

    // Remove any existing event listeners
    if (this._popoverShownHandler) {
      button.removeEventListener('shown.bs.popover', this._popoverShownHandler);
    }

    // Create settings view
    this._settingsView = new SettingsView({
      granularity: this.chartOptions.granularity,
      chartType: this.chartOptions.chartType,
      dateStart: this.chartOptions.dateStart,
      dateEnd: this.chartOptions.dateEnd,
      showDateRange: this.showDateRange
    });

    // Listen for apply/cancel events
    this._settingsView.on('settings:apply', (data) => this._handleSettingsApply(data));
    this._settingsView.on('settings:cancel', () => this._handleSettingsCancel());

    // Render the settings view
    this._settingsView.render();

    // Create handler for shown event
    this._popoverShownHandler = () => {
      const popoverBody = document.querySelector('.popover.show .popover-body');
      if (popoverBody && this._settingsView) {
        popoverBody.innerHTML = '';
        popoverBody.appendChild(this._settingsView.element);
        this._settingsView.bindEvents();
      }
    };

    // Create popover using placeholder content
    this._settingsPopover = new bootstrap.Popover(button, {
      content: '<div>Loading...</div>',
      html: true,
      placement: 'bottom',
      trigger: 'click',
      sanitize: false,
      customClass: 'metrics-chart-settings-popover'
    });

    // Attach event listener (not once, so it works every time)
    button.addEventListener('shown.bs.popover', this._popoverShownHandler);
  }

  /**
   * Handle settings apply
   * @private
   */
  async _handleSettingsApply(data) {
    // Hide popover first
    if (this._settingsPopover) {
      this._settingsPopover.hide();
    }

    let hasChanges = false;
    let granularityChanged = false;
    let datesExplicitlySet = false;

    // Check if dates were explicitly changed
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
      if (data.dateStart) {
        this.chartOptions.dateStart = new Date(data.dateStart);
        this.chart.dateStart = new Date(data.dateStart);
      }
      if (data.dateEnd) {
        this.chartOptions.dateEnd = new Date(data.dateEnd);
        this.chart.dateEnd = new Date(data.dateEnd);
      }
      hasChanges = true;
    } else if (granularityChanged) {
      // Auto-adjust date range for new granularity
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
      this._skipNextPopoverInit = true;
      await this.chart.refresh();
      
      // Reinitialize popover after refresh
      setTimeout(() => {
        if (this.showSettings && this.isMounted()) {
          this._initSettingsPopover();
        }
      }, 150);
    }
  }

  /**
   * Handle settings cancel
   * @private
   */
  _handleSettingsCancel() {
    if (this._settingsPopover) {
      this._settingsPopover.hide();
    }
  }

  /**
   * Handle refresh button click
   */
  async onActionRefreshChart(event, element) {
    // Add spinning animation
    const icon = element.querySelector('i');
    if (icon) {
      icon.classList.add('spin');
    }
    
    if (this.chart) {
      if (this.account) this.chart.account = this.account;
      await this.chart.refresh();
    }
    
    // Remove spinning animation
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

  /**
   * Load settings from localStorage
   * @private
   */
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

  /**
   * Save settings to localStorage
   * @private
   */
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
