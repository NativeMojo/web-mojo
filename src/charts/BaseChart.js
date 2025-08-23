/**
 * BaseChart - Foundation class for all chart components in MOJO framework
 * Uses Chart.js 4.x with API integration, refresh capabilities, and event system
 */

import View from '../core/View.js';
import WebSocketClient from '../utils/WebSocket.js';
import dataFormatter from '../utils/DataFormatter.js';

export default class BaseChart extends View {
  constructor(options = {}) {
    super({
      ...options,
      className: `chart-component ${options.className || ''}`,
      tagName: 'div'
    });

    // Chart.js instance
    this.chart = null;
    this.chartType = options.chartType || 'line';

    // Data source options
    this.endpoint = options.endpoint || null;
    this.data = options.data || null;
    this.dataTransform = options.dataTransform || null; // Function to transform API data

    // Refresh options
    this.refreshInterval = options.refreshInterval || null; // ms
    this.autoRefresh = options.autoRefresh !== false;
    this.refreshTimer = null;

    // WebSocket for real-time updates
    this.websocketUrl = options.websocketUrl || null;
    this.websocket = null;
    this.websocketReconnect = options.websocketReconnect !== false;

    // Chart configuration
    this.title = options.title || '';
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: options.maintainAspectRatio !== false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: options.showLegend !== false,
          position: options.legendPosition || 'top'
        },
        title: {
          display: !!this.title,
          text: this.title
        },
        tooltip: {
          enabled: options.showTooltips !== false,
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1
        }
      },
      ...options.chartOptions
    };

    // Axis configuration with DataFormatter support
    this.xAxis = options.xAxis || null;
    this.yAxis = options.yAxis || null;
    this.tooltipFormatters = options.tooltip || {};

    // Theme and appearance
    this.theme = options.theme || 'light';
    this.colorScheme = options.colorScheme || 'default';
    this.animations = options.animations !== false;

    // Export options
    this.exportEnabled = options.exportEnabled !== false;
    this.exportFormats = options.exportFormats || ['png', 'jpg'];

    // State
    this.isLoading = false;
    this.hasError = false;
    this.lastFetch = null;
    this.dataPoints = 0;

    // Canvas element
    this.canvas = null;

    // Chart.js CDN URL - can be customized
    this.chartJsCdn = options.chartJsCdn || 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';

    // DataFormatter instance (use singleton)
    this.dataFormatter = dataFormatter;

    // Template data properties (available to Mustache)
    this.refreshEnabled = !!(this.endpoint || this.websocketUrl);

    // Store essential listeners for cleanup
    this._essentialListeners = [];
  }

  async getTemplate() {
    return `
      <div class="chart-container" data-theme="{{theme}}">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div class="chart-title-section">
            <h5 class="mb-1 chart-title">{{title}}</h5>
            <small class="text-muted last-updated" style="display: none;">
              Last updated: <span class="timestamp"></span>
            </small>
          </div>
          <div class="chart-controls">
            <div class="btn-toolbar" role="toolbar">
              <!-- Chart type switcher (for SeriesChart) -->
              <div class="btn-group btn-group-sm me-2 chart-type-switcher" role="group" style="display: none;">
                <button type="button" class="btn btn-outline-primary" data-action="set-chart-type" data-type="line" title="Line Chart">
                  <i class="bi bi-graph-up"></i>
                </button>
                <button type="button" class="btn btn-outline-primary" data-action="set-chart-type" data-type="bar" title="Bar Chart">
                  <i class="bi bi-bar-chart"></i>
                </button>
              </div>

              <!-- Standard controls -->
              <div class="btn-group btn-group-sm me-2" role="group">
                {{#refreshEnabled}}
                <button type="button" class="btn btn-outline-secondary refresh-btn" data-action="refresh-chart" title="Refresh Data">
                  <i class="bi bi-arrow-clockwise"></i>
                </button>
                {{/refreshEnabled}}

                {{#exportEnabled}}
                <div class="btn-group" role="group">
                  <button type="button" class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" title="Export Chart">
                    <i class="bi bi-download"></i>
                  </button>
                  <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="#" data-action="export-chart" data-format="png">
                      <i class="bi bi-image"></i> PNG
                    </a></li>
                    <li><a class="dropdown-item" href="#" data-action="export-chart" data-format="jpg">
                      <i class="bi bi-image"></i> JPEG
                    </a></li>
                  </ul>
                </div>
                {{/exportEnabled}}

                <button type="button" class="btn btn-outline-secondary theme-toggle" data-action="toggle-theme" title="Toggle Theme">
                  <i class="bi bi-palette"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="chart-content position-relative">
          <canvas class="chart-canvas" data-container="canvas"></canvas>

          <!-- Loading overlay -->
          <div class="chart-overlay d-none" data-loading>
            <div class="d-flex flex-column align-items-center">
              <div class="spinner-border text-primary mb-2" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <small class="text-muted">Loading chart data...</small>
            </div>
          </div>

          <!-- Error overlay -->
          <div class="chart-overlay d-none" data-error>
            <div class="alert alert-danger mb-0" role="alert">
              <div class="d-flex align-items-center">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <div class="flex-grow-1">
                  <strong>Error:</strong> <span class="error-message">Failed to load chart data</span>
                </div>
                <button class="btn btn-sm btn-outline-danger ms-2" data-action="retry-load">
                  <i class="bi bi-arrow-clockwise"></i> Retry
                </button>
              </div>
            </div>
          </div>

          <!-- No data overlay -->
          <div class="chart-overlay d-none" data-no-data>
            <div class="text-center text-muted">
              <i class="bi bi-bar-chart display-4 mb-3 opacity-50"></i>
              <p class="mb-0">No data available</p>
              {{#refreshEnabled}}
              <button class="btn btn-sm btn-outline-secondary mt-2" data-action="refresh-chart">
                <i class="bi bi-arrow-clockwise"></i> Refresh
              </button>
              {{/refreshEnabled}}
            </div>
          </div>

          <!-- WebSocket status indicator -->
          <div class="position-absolute top-0 end-0 mt-2 me-2">
            <span class="badge bg-success websocket-status" style="display: none;" data-websocket-status>
              <i class="bi bi-wifi"></i> Live
            </span>
          </div>
        </div>

        <div class="chart-footer mt-2" style="display: none;">
          <div class="row">
            <div class="col">
              <small class="text-muted">
                <i class="bi bi-graph-up me-1"></i>
                <span class="data-points">0</span> data points
              </small>
            </div>
            <div class="col text-end">
              <small class="text-muted refresh-info">
                Auto-refresh: <span class="refresh-status">Off</span>
              </small>
            </div>
          </div>
        </div>
      </div>
    `;
  }



  async onAfterRender() {
    // Cache DOM elements
    this.canvas = this.element.querySelector('.chart-canvas');
    this.titleElement = this.element.querySelector('.chart-title');
    this.contentElement = this.element.querySelector('.chart-content');
    this.footerElement = this.element.querySelector('.chart-footer');

    // Overlay elements
    this.loadingOverlay = this.element.querySelector('[data-loading]');
    this.errorOverlay = this.element.querySelector('[data-error]');
    this.noDataOverlay = this.element.querySelector('[data-no-data]');
    this.websocketStatus = this.element.querySelector('[data-websocket-status]');

    // Control elements
    this.refreshBtn = this.element.querySelector('.refresh-btn');
    this.themeToggle = this.element.querySelector('.theme-toggle');

    // Initialize Chart.js
    await this.initializeChartJS();

    // Apply initial theme
    this.applyTheme();

    // Load initial data
    if (this.data) {
      await this.updateChart(this.data);
    } else if (this.endpoint) {
      await this.fetchData();
    }

    // Set up auto-refresh
    if (this.autoRefresh && this.refreshInterval && this.endpoint) {
      this.startAutoRefresh();
    }

    // Set up WebSocket
    if (this.websocketUrl) {
      await this.connectWebSocket();
    }

    // Set up resize observer
    this.setupResizeObserver();

    // Show footer with stats
    this.showFooter();
  }

  async initializeChartJS() {
    try {
      // Load Chart.js if not already loaded
      if (typeof window.Chart === 'undefined') {
        await this.loadChartJS();
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize Chart.js:', error);
      this.showError('Failed to initialize charting library');
      return false;
    }
  }

  async loadChartJS() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = this.chartJsCdn;
      script.onload = () => {
        console.log('Chart.js loaded successfully');
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load Chart.js'));
      };
      document.head.appendChild(script);
    });
  }

  // Action Handlers (EventDelegate)
  async handleActionRefreshChart() {
    await this.fetchData();
  }

  async handleActionRetryLoad() {
    this.hideError();
    await this.fetchData();
  }

  async handleActionExportChart(event, element) {
    const format = element.getAttribute('data-format') || 'png';
    this.exportChart(format);
  }

  async handleActionToggleTheme() {
    this.toggleTheme();
  }

  async handleActionSetChartType(event, element) {
    const type = element.getAttribute('data-type');
    if (type && this.setChartType) {
      await this.setChartType(type);
    }
  }

  // Data Management
  async fetchData() {
    if (!this.endpoint) return;

    this.showLoading();
    this.setRefreshButtonState(true);

    try {
      const response = await fetch(this.endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let data = await response.json();

      // Transform data if transformer provided
      if (this.dataTransform && typeof this.dataTransform === 'function') {
        data = this.dataTransform(data);
      }

      this.lastFetch = new Date();
      await this.updateChart(data);
      this.updateLastUpdatedTime();

      // Emit success event
      const eventBus = this.getApp()?.events;
      if (eventBus) {
        eventBus.emit('chart:data-loaded', {
          chart: this,
          data,
          source: 'http',
          endpoint: this.endpoint
        });
      }

    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      this.showError(`Failed to load data: ${error.message}`);

      // Emit error event
      const eventBus = this.getApp()?.events;
      if (eventBus) {
        eventBus.emit('chart:error', {
          chart: this,
          error,
          source: 'http',
          endpoint: this.endpoint
        });
      }
    } finally {
      this.hideLoading();
      this.setRefreshButtonState(false);
    }
  }

  async connectWebSocket() {
    if (!this.websocketUrl) return;

    try {
      this.websocket = new WebSocketClient({
        url: this.websocketUrl,
        autoReconnect: this.websocketReconnect,
        dataTransform: this.dataTransform,
        eventBus: this.getApp()?.events,
        debug: false
      });

      // Set up WebSocket event handlers
      this.websocket.on('connected', () => {
        this.showWebSocketStatus(true);
        console.log('WebSocket connected for chart data');
      });

      this.websocket.on('disconnected', () => {
        this.showWebSocketStatus(false);
        console.log('WebSocket disconnected');
      });

      this.websocket.on('data', async (data) => {
        await this.updateChart(data);
        this.updateLastUpdatedTime();

        // Emit real-time update event
        const eventBus = this.getApp()?.events;
        if (eventBus) {
          eventBus.emit('chart:data-updated', {
            chart: this,
            data,
            source: 'websocket'
          });
        }
      });

      this.websocket.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.showWebSocketStatus(false, 'error');
      });

      // Connect
      await this.websocket.connect();

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.showWebSocketStatus(false, 'error');
    }
  }

  async updateChart(data) {
    if (!data) {
      this.showNoData();
      return;
    }

    this.hideAllOverlays();
    this.data = data;

    // Process data with axis formatters
    const processedData = this.processChartData(data);

    if (this.chart) {
      // Update existing chart
      this.chart.data = processedData;
      this.chart.update('none'); // No animation for real-time updates
    } else {
      // Create new chart
      await this.createChart(processedData);
    }

    // Update stats
    this.updateDataStats(processedData);
  }

  processChartData(data) {
    // This method should be overridden by subclasses
    // Base implementation just applies formatters to labels if configured

    let processedData = { ...data };

    // Apply formatters to labels if xAxis formatter is configured
    if (this.xAxis && typeof this.xAxis === 'string' && processedData.labels) {
      processedData.labels = processedData.labels.map(label =>
        this.dataFormatter.apply(label, this.xAxis)
      );
    }

    return processedData;
  }

  async createChart(data) {
    if (!this.canvas || typeof window.Chart === 'undefined') {
      throw new Error('Chart.js not loaded or canvas not found');
    }

    // Build chart configuration
    const config = {
      type: this.chartType,
      data: data,
      options: this.buildChartOptions()
    };

    try {
      this.chart = new window.Chart(this.canvas, config);

      // Set up chart event handlers
      this.setupChartEventHandlers();

    } catch (error) {
      console.error('Failed to create chart:', error);
      throw error;
    }
  }

  buildChartOptions() {
    const options = { ...this.chartOptions };

    // Apply theme colors
    this.applyThemeToOptions(options);

    // Configure tooltips with formatters
    if (this.tooltipFormatters.x || this.tooltipFormatters.y) {
      options.plugins = options.plugins || {};
      options.plugins.tooltip = options.plugins.tooltip || {};
      options.plugins.tooltip.callbacks = options.plugins.tooltip.callbacks || {};

      if (this.tooltipFormatters.x) {
        options.plugins.tooltip.callbacks.title = (context) => {
          const value = context[0]?.label;
          return value ? this.dataFormatter.apply(value, this.tooltipFormatters.x) : value;
        };
      }

      if (this.tooltipFormatters.y) {
        options.plugins.tooltip.callbacks.label = (context) => {
          const value = context.raw;
          const formattedValue = this.dataFormatter.apply(value, this.tooltipFormatters.y);
          return `${context.dataset.label}: ${formattedValue}`;
        };
      }
    }

    return options;
  }

  setupChartEventHandlers() {
    if (!this.chart) return;

    // Click events
    this.chart.options.onClick = (event, elements) => {
      if (elements.length > 0) {
        const element = elements[0];
        const datasetIndex = element.datasetIndex;
        const index = element.index;
        const value = this.chart.data.datasets[datasetIndex].data[index];
        const label = this.chart.data.labels[index];

        // Emit click event
        const eventBus = this.getApp()?.events;
        if (eventBus) {
          eventBus.emit('chart:point-clicked', {
            chart: this,
            datasetIndex,
            index,
            value,
            label,
            dataset: this.chart.data.datasets[datasetIndex]
          });
        }
      }
    };

    // Hover events
    this.chart.options.onHover = (event, elements) => {
      this.canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    };
  }

  // Theme Management
  applyTheme() {
    this.element.setAttribute('data-theme', this.theme);

    if (this.chart) {
      this.chart.options = this.buildChartOptions();
      this.chart.update('none');
    }
  }

  applyThemeToOptions(options) {
    const isDark = this.theme === 'dark';

    // Grid and axis colors
    if (options.scales) {
      Object.keys(options.scales).forEach(scaleId => {
        const scale = options.scales[scaleId];
        scale.grid = scale.grid || {};
        scale.ticks = scale.ticks || {};

        scale.grid.color = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        scale.ticks.color = isDark ? '#e9ecef' : '#495057';
      });
    }

    // Legend colors
    if (options.plugins?.legend) {
      options.plugins.legend.labels = options.plugins.legend.labels || {};
      options.plugins.legend.labels.color = isDark ? '#e9ecef' : '#495057';
    }

    // Title colors
    if (options.plugins?.title) {
      options.plugins.title.color = isDark ? '#ffffff' : '#212529';
    }
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.applyTheme();

    // Emit theme change event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('chart:theme-changed', {
        chart: this,
        theme: this.theme
      });
    }
  }

  // Auto-refresh Management
  startAutoRefresh() {
    if (!this.endpoint || !this.refreshInterval) return;

    this.stopAutoRefresh();

    this.refreshTimer = setInterval(() => {
      this.fetchData();
    }, this.refreshInterval);

    this.updateRefreshStatus(true);
  }

  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.updateRefreshStatus(false);
  }

  // Export Functionality
  exportChart(format = 'png') {
    if (!this.chart) return;

    try {
      const url = this.chart.toBase64Image('image/' + format, 1);
      const link = document.createElement('a');
      link.download = `chart-${Date.now()}.${format}`;
      link.href = url;
      link.click();

      // Emit export event
      const eventBus = this.getApp()?.events;
      if (eventBus) {
        eventBus.emit('chart:exported', {
          chart: this,
          format,
          filename: link.download
        });
      }

    } catch (error) {
      console.error('Failed to export chart:', error);
      this.showError('Failed to export chart');
    }
  }

  // UI State Management
  showLoading() {
    this.isLoading = true;
    this.hideAllOverlays();
    this.loadingOverlay?.classList.remove('d-none');
  }

  hideLoading() {
    this.isLoading = false;
    this.loadingOverlay?.classList.add('d-none');
  }

  showError(message) {
    this.hasError = true;
    this.hideAllOverlays();
    const errorMessageEl = this.errorOverlay?.querySelector('.error-message');
    if (errorMessageEl) {
      errorMessageEl.textContent = message;
    }
    this.errorOverlay?.classList.remove('d-none');
  }

  hideError() {
    this.hasError = false;
    this.errorOverlay?.classList.add('d-none');
  }

  showNoData() {
    this.hideAllOverlays();
    this.noDataOverlay?.classList.remove('d-none');
  }

  hideAllOverlays() {
    this.loadingOverlay?.classList.add('d-none');
    this.errorOverlay?.classList.add('d-none');
    this.noDataOverlay?.classList.add('d-none');
  }

  showWebSocketStatus(connected, status = 'connected') {
    if (!this.websocketStatus) return;

    if (connected) {
      this.websocketStatus.className = 'badge bg-success';
      this.websocketStatus.innerHTML = '<i class="bi bi-wifi"></i> Live';
    } else {
      this.websocketStatus.className = status === 'error' ? 'badge bg-danger' : 'badge bg-secondary';
      this.websocketStatus.innerHTML = status === 'error' ?
        '<i class="bi bi-wifi-off"></i> Error' :
        '<i class="bi bi-wifi-off"></i> Offline';
    }

    this.websocketStatus.style.display = 'inline-block';
  }

  setRefreshButtonState(loading) {
    if (!this.refreshBtn) return;

    const icon = this.refreshBtn.querySelector('i');
    if (loading) {
      this.refreshBtn.disabled = true;
      icon?.classList.add('spin');
    } else {
      this.refreshBtn.disabled = false;
      icon?.classList.remove('spin');
    }
  }

  updateLastUpdatedTime() {
    const lastUpdatedEl = this.element.querySelector('.last-updated');
    const timestampEl = this.element.querySelector('.timestamp');

    if (lastUpdatedEl && timestampEl) {
      timestampEl.textContent = new Date().toLocaleTimeString();
      lastUpdatedEl.style.display = 'block';
    }
  }

  updateRefreshStatus(active) {
    const statusEl = this.element.querySelector('.refresh-status');
    if (statusEl) {
      statusEl.textContent = active ?
        `Every ${this.refreshInterval / 1000}s` : 'Off';
    }
  }

  updateDataStats(data) {
    // Count data points
    let points = 0;
    if (data.datasets) {
      points = data.datasets.reduce((sum, dataset) => {
        return sum + (dataset.data ? dataset.data.length : 0);
      }, 0);
    }

    this.dataPoints = points;

    const dataPointsEl = this.element.querySelector('.data-points');
    if (dataPointsEl) {
      dataPointsEl.textContent = `${points} data point${points !== 1 ? 's' : ''}`;
    }
  }

  showFooter() {
    if (this.footerElement) {
      this.footerElement.style.display = 'block';
    }
  }

  setupResizeObserver() {
    if (!window.ResizeObserver || !this.contentElement) return;

    const resizeObserver = new ResizeObserver(() => {
      if (this.chart) {
        this.chart.resize();
      }
    });

    resizeObserver.observe(this.contentElement);
    this._resizeObserver = resizeObserver;
  }

  // Cleanup
  async onBeforeDestroy() {
    // Stop auto-refresh
    this.stopAutoRefresh();

    // Disconnect WebSocket
    if (this.websocket) {
      this.websocket.disconnect();
      this.websocket = null;
    }

    // Destroy Chart.js instance
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    // Clean up resize observer
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    // Clean up essential listeners
    if (this._essentialListeners) {
      this._essentialListeners.forEach(({ el, type, fn }) => {
        if (el) el.removeEventListener(type, fn);
      });
      this._essentialListeners = [];
    }

    // Emit destroy event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('chart:destroyed', { chart: this });
    }
  }

  // Public API
  setData(data) {
    this.data = data;
    return this.updateChart(data);
  }

  setEndpoint(endpoint) {
    this.endpoint = endpoint;
    if (endpoint) {
      return this.fetchData();
    }
  }

  setWebSocketUrl(url) {
    if (this.websocket) {
      this.websocket.disconnect();
    }
    this.websocketUrl = url;
    if (url) {
      return this.connectWebSocket();
    }
  }

  refresh() {
    return this.fetchData();
  }

  export(format = 'png') {
    return this.exportChart(format);
  }

  setTheme(theme) {
    this.theme = theme;
    this.applyTheme();
  }

  getStats() {
    return {
      isLoading: this.isLoading,
      hasError: this.hasError,
      dataPoints: this.dataPoints,
      lastFetch: this.lastFetch,
      theme: this.theme,
      chartType: this.chartType,
      autoRefresh: !!this.refreshTimer,
      websocketConnected: this.websocket?.isConnected || false
    };
  }
}
