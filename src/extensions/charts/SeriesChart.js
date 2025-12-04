/**
 * SeriesChart - Combined Line and Bar chart component for MOJO framework
 * Supports switching between line and bar chart types with the same data
 */

import BaseChart from './BaseChart.js';
import Dialog from '@core/views/feedback/Dialog.js';

const DEFAULT_CHART_COLORS = [
  'rgba(52, 152, 219, 0.85)',  // Belize Hole
  'rgba(231, 76, 60, 0.85)',   // Alizarin
  'rgba(46, 204, 113, 0.85)',  // Emerald
  'rgba(241, 196, 15, 0.85)',  // Sunflower
  'rgba(155, 89, 182, 0.85)',  // Amethyst
  'rgba(230, 126, 34, 0.85)',  // Carrot
  'rgba(26, 188, 156, 0.85)',  // Turquoise
  'rgba(52, 73, 94, 0.85)',    // Wet asphalt
  'rgba(243, 156, 18, 0.85)',  // Orange
  'rgba(142, 68, 173, 0.85)',  // Wisteria
  'rgba(39, 174, 96, 0.85)',   // Nephritis
  'rgba(41, 128, 185, 0.85)',  // Peter River
  'rgba(192, 57, 43, 0.85)',   // Pomegranate
  'rgba(127, 140, 141, 0.85)', // Asbestos
  'rgba(22, 160, 133, 0.85)',  // Green Sea
  'rgba(211, 84, 0, 0.85)',    // Pumpkin
  'rgba(44, 62, 80, 0.85)',    // Midnight Blue
  'rgba(214, 69, 65, 0.85)',   // Valencia
  'rgba(149, 165, 166, 0.85)', // Concrete
  'rgba(52, 232, 158, 0.85)'   // Mint
];


export default class SeriesChart extends BaseChart {
  constructor(options = {}) {
    super({
      ...options,
      chartType: options.chartType || 'line'
    });

    // Series-specific options
    this.showTypeSwitch = true;
    if (options.showTypeSwitch !== undefined) this.showTypeSwitch = options.showTypeSwitch;
    this.orientation = options.orientation || 'vertical'; // 'vertical' or 'horizontal'
    this.stacked = options.stacked || false;
    this.stepped = options.stepped || false; // For line charts
    this.tension = options.tension || 0.4; // Line curve tension
    this.fill = options.fill || false; // Fill area under line
    this.showRefreshButton = options.showRefreshButton !== false;

    if (!this.headerConfig) {
        this.headerConfig = {
          titleHtml: this.title || '',
          chartTitle: this.chartTitle || '',
          showExport: this.exportEnabled,
          showRefresh: this.refreshEnabled,
          showTheme: true,
          controls: []
        }
    }


    // Data series configuration
    this.series = options.series || [];
    this.xField = options.xField || 'x';
    this.yField = options.yField || 'y';



    // Color scheme for multiple datasets
    const providedColors = Array.isArray(options.colors) && options.colors.length
      ? options.colors
      : DEFAULT_CHART_COLORS;
    this.colors = [...providedColors];



    // Process tooltip formatters
    this.tooltipFormatters = options.tooltip || {};
  }

  getColor(index) {
    this.ensureColorPool(index + 1);
    return this.colors[index];
  }

  ensureColorPool(count) {
    if (this.colors.length >= count) return;

    while (this.colors.length < count) {
      const nextIndex = this.colors.length;
      const hue = (nextIndex * 37) % 360;
      const color = `hsla(${hue}, 70%, 55%, 0.85)`;
      this.colors.push(color);
    }
  }

  withAlpha(color, alpha = 0.4) {
    if (!color) return color;
    const rgbaMatch = color.match(/rgba?\(([^)]+)\)/i);
    if (rgbaMatch) {
      const parts = rgbaMatch[1].split(',').map(part => part.trim());
      const [r, g, b] = parts;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    const hslaMatch = color.match(/hsla?\(([^)]+)\)/i);
    if (hslaMatch) {
      const parts = hslaMatch[1].split(',').map(part => part.trim());
      const [h, s, l] = parts;
      return `hsla(${h}, ${s}, ${l}, ${alpha})`;
    }
    return color;
  }

  async getTemplate() {
    return await super.getTemplate();
  }

  async onInit() {
    // Provide header controls (type switcher) via BaseChart headerConfig
    if (this.showTypeSwitch) {
        this.headerConfig.controls.push({
            type: 'buttongroup',
            size: 'sm',
            buttons: [
                { action: 'set-chart-type', labelHtml: '<i class="bi bi-graph-up"></i>', title: 'Line', variant: (this.chartType === 'line' ? 'primary' : 'outline-primary'), data: { type: 'line' } },
                { action: 'set-chart-type', labelHtml: '<i class="bi bi-bar-chart"></i>', title: 'Bar', variant: (this.chartType === 'bar' ? 'primary' : 'outline-primary'), data: { type: 'bar' } }
            ]
        });
    }

    await super.onInit();

  }

  // Action Handlers
  async onActionSetChartType(event, element) {
    event.stopPropagation();
    const newType = element.getAttribute('data-type');
    if (newType && newType !== this.chartType) {
      await this.setChartType(newType);
    }
  }

  async rebuildChart() {
    if (this.chart && this.data) {
      this.chart.destroy();
      this.chart = null;

      const processedData = this.processChartData(this.data);
      await this.createChart(processedData);
    }
  }

  async setChartType(newType) {
    if (!['line', 'bar'].includes(newType)) {
      throw new Error(`Unsupported chart type: ${newType}`);
    }

    const oldType = this.chartType;
    this.chartType = newType;

    // Recreate chart with new type
    if (this.chart && this.data) {
      this.chart.destroy();
      this.chart = null;

      const processedData = this.processChartData(this.data);
      await this.createChart(processedData);
    }

    // Update type switcher button styles dynamically
    this._updateTypeSwitcherButtons();

    // Emit type change event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('chart:type-changed', {
        chart: this,
        oldType,
        newType: this.chartType
      });
    }
  }

  processChartData(data) {
    if (!data) return data;

    let processedData;

    // Handle different data input formats
    if (Array.isArray(data)) {
      // Array of objects: [{x: '2024-01', y: 100}, {x: '2024-02', y: 150}]
      processedData = this.processArrayData(data);
    } else if (data.labels && data.datasets) {
      // Chart.js format: {labels: [...], datasets: [...]}
      processedData = this.processChartJSData(data);
    } else if (data.series) {
      // Custom series format: {series: [{name: 'Sales', data: [...]}]}
      processedData = this.processSeriesData(data);
    } else {
      processedData = data;
    }

    // Apply formatters to the processed data
    return this.applyFormattersToData(processedData);
  }

  processArrayData(data) {
    const labels = [];
    const values = [];

    data.forEach(item => {
      const xValue = item[this.xField];
      const yValue = item[this.yField];

      labels.push(xValue);
      values.push(yValue);
    });

    this.ensureColorPool(1);
    const baseColor = this.getColor(0);
    const backgroundAlpha = this.chartType === 'line' ? 0.25 : 0.65;

    return {
      labels,
      datasets: [{
        label: this.title || 'Data',
        data: values,
        backgroundColor: this.withAlpha(baseColor, backgroundAlpha),
        borderColor: baseColor,
        borderWidth: 2,
        tension: this.chartType === 'line' ? this.tension : 0,
        fill: this.chartType === 'line' ? this.fill : false,
        stepped: this.chartType === 'line' ? this.stepped : false
      }]
    };
  }

  processChartJSData(data) {
    // Already in Chart.js format, just apply our styling
    const processedData = { ...data };

    if (!processedData.datasets) {
      processedData.datasets = [];
      return processedData;
    }

    const datasetCount = processedData.datasets.length;
    this.ensureColorPool(datasetCount);
    const backgroundAlpha = this.chartType === 'line' ? 0.25 : 0.65;

    processedData.datasets = processedData.datasets.map((dataset, index) => {
      const baseColor = dataset.borderColor || this.getColor(index);
      return {
        ...dataset,
        backgroundColor: dataset.backgroundColor || this.withAlpha(baseColor, backgroundAlpha),
        borderColor: baseColor,
        borderWidth: dataset.borderWidth || 2,
        tension: this.chartType === 'line' ? (dataset.tension ?? this.tension) : 0,
        fill: this.chartType === 'line' ? (dataset.fill ?? this.fill) : false,
        stepped: this.chartType === 'line' ? (dataset.stepped ?? this.stepped) : false
      };
    });

    return processedData;
  }

  processSeriesData(data) {
    const labels = data.labels || [];
    const datasets = [];
    const count = data.series?.length || 0;
    this.ensureColorPool(count);
    const backgroundAlpha = this.chartType === 'line' ? 0.25 : 0.65;

    data.series.forEach((series, index) => {
      const baseColor = series.borderColor || this.getColor(index);
      datasets.push({
        label: series.name || series.label || `Series ${index + 1}`,
        data: series.data || [],
        backgroundColor: series.backgroundColor || this.withAlpha(baseColor, backgroundAlpha),
        borderColor: baseColor,
        borderWidth: series.borderWidth || 2,
        tension: this.chartType === 'line' ? (series.tension ?? this.tension) : 0,
        fill: this.chartType === 'line' ? (series.fill ?? this.fill) : false,
        stepped: this.chartType === 'line' ? (series.stepped ?? this.stepped) : false
      });
    });

    return { labels, datasets };
  }

  applyFormattersToData(data) {
    if (!data) return data;

    const processedData = { ...data };

    // Apply x-axis formatter to labels if configured
    const xAxisCfg = this.normalizeAxis ? this.normalizeAxis(this.xAxis) : {};
    if (xAxisCfg.formatter && processedData.labels) {
      processedData.labels = processedData.labels.map(label =>
        this.dataFormatter.pipe(label, xAxisCfg.formatter)
      );
    }

    return processedData;
  }

  applySubclassChartOptions(options) {
    // Stacking for bar charts
    if (this.stacked && this.chartType === 'bar' && options.scales) {
      if (options.scales.x) options.scales.x.stacked = true;
      if (options.scales.y) options.scales.y.stacked = true;
    }

    // Horizontal bars
    if (this.chartType === 'bar' && this.orientation === 'horizontal') {
      options.indexAxis = 'y';
    }

    // Interaction mode tuned to chart type
    options.interaction = options.interaction || {};
    options.interaction.intersect = false;
    options.interaction.mode = this.chartType === 'line' ? 'index' : 'nearest';

    // Elements styling
    options.elements = options.elements || {};
    options.elements.line = {
      ...(options.elements.line || {}),
      tension: this.tension,
      borderWidth: 2
    };
    options.elements.point = {
      ...(options.elements.point || {}),
      radius: this.chartType === 'line' ? 4 : 0,
      hoverRadius: 6,
      hitRadius: 8
    };
    options.elements.bar = {
      ...(options.elements.bar || {}),
      borderWidth: 1,
      borderSkipped: false
    };
  }



  // Process simple axis configuration into detailed config
  processAxisConfig(axisConfig) {
    if (!axisConfig) return {};

    if (typeof axisConfig === 'string') {
      // Simple string format: just a formatter name
      return { formatter: axisConfig };
    }

    if (typeof axisConfig === 'object') {
      // Object format: full configuration
      return {
        formatter: axisConfig.formatter,
        label: axisConfig.label,
        type: axisConfig.type,
        beginAtZero: axisConfig.beginAtZero,
        ...axisConfig
      };
    }

    return {};
  }





  _updateTypeSwitcherButtons() {
    const buttons = this.element?.querySelectorAll('[data-action="set-chart-type"]');
    if (!buttons || buttons.length === 0) return;

    buttons.forEach(button => {
      const buttonType = button.getAttribute('data-type');
      const isActive = buttonType === this.chartType;

      // Normalize classes for Bootstrap primary/outline-primary variants
      button.classList.toggle('btn-primary', isActive);
      button.classList.toggle('btn-outline-primary', !isActive);

      // Optional 'active' state for accessibility/visual feedback
      button.classList.toggle('active', isActive);
    });
  }

  // Public API extensions
  setOrientation(orientation) {
    if (!['vertical', 'horizontal'].includes(orientation)) {
      throw new Error(`Invalid orientation: ${orientation}`);
    }

    this.orientation = orientation;

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;

      if (this.data) {
        const processedData = this.processChartData(this.data);
        this.createChart(processedData);
      }
    }
  }

  setStacked(stacked) {
    this.stacked = stacked;

    if (this.chart) {
      this.chart.options.scales.x.stacked = stacked;
      this.chart.options.scales.y.stacked = stacked;
      this.chart.update();
    }
  }

  addSeries(series) {
    if (!this.data || !this.data.datasets) return;

    const newDataset = {
      label: series.label || series.name || `Series ${this.data.datasets.length + 1}`,
      data: series.data || [],
      backgroundColor: series.backgroundColor || this.colors[this.data.datasets.length % this.colors.length].replace('0.8', '0.6'),
      borderColor: series.borderColor || this.colors[this.data.datasets.length % this.colors.length],
      borderWidth: series.borderWidth || 2,
      tension: this.chartType === 'line' ? (series.tension ?? this.tension) : 0,
      fill: this.chartType === 'line' ? (series.fill ?? this.fill) : false
    };

    this.data.datasets.push(newDataset);

    if (this.chart) {
      this.chart.data.datasets.push(newDataset);
      this.chart.update();
    }

    // Emit series added event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('chart:series-added', {
        chart: this,
        series: newDataset
      });
    }
  }

  removeSeries(index) {
    if (!this.data || !this.data.datasets || index < 0 || index >= this.data.datasets.length) {
      return;
    }

    const removedSeries = this.data.datasets.splice(index, 1)[0];

    if (this.chart) {
      this.chart.data.datasets.splice(index, 1);
      this.chart.update();
    }

    // Emit series removed event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('chart:series-removed', {
        chart: this,
        series: removedSeries,
        index
      });
    }
  }

  // Static dialog method
  static async showDialog(options = {}) {
    const {
      title = 'Chart Viewer',
      size = 'xl',
      ...chartOptions
    } = options;

    const chart = new SeriesChart({
      ...chartOptions,
      title
    });



    const dialog = new Dialog({
      title,
      body: chart,
      size,
      centered: true,
      backdrop: 'static',
      keyboard: true,
      buttons: [
        {
          text: 'Export PNG',
          action: 'export',
          class: 'btn btn-outline-primary'
        },
        {
          text: 'Close',
          action: 'close',
          class: 'btn btn-secondary',
          dismiss: true
        }
      ]
    });

    // Render and mount
    await dialog.render();
    document.body.appendChild(dialog.element);
    await dialog.mount();

    // Show the dialog
    dialog.show();

    return new Promise((resolve) => {
      dialog.on('hidden', () => {
        dialog.destroy();
        resolve(chart);
      });

      dialog.on('action:export', () => {
        chart.exportChart('png');
      });

      dialog.on('action:close', () => {
        dialog.hide();
      });
    });
  }
}
