/**
 * SeriesChart - Combined Line and Bar chart component for MOJO framework
 * Supports switching between line and bar chart types with the same data
 */

import BaseChart from './BaseChart.js';

export default class SeriesChart extends BaseChart {
  constructor(options = {}) {
    super({
      ...options,
      chartType: options.chartType || 'line'
    });

    // Series-specific options
    this.allowTypeSwitch = options.allowTypeSwitch !== false;
    this.orientation = options.orientation || 'vertical'; // 'vertical' or 'horizontal'
    this.stacked = options.stacked || false;
    this.stepped = options.stepped || false; // For line charts
    this.tension = options.tension || 0.4; // Line curve tension
    this.fill = options.fill || false; // Fill area under line

    // Data series configuration
    this.series = options.series || [];
    this.xField = options.xField || 'x';
    this.yField = options.yField || 'y';

    // Color scheme for multiple datasets
    this.colors = options.colors || [
      'rgba(54, 162, 235, 0.8)',   // Blue
      'rgba(255, 99, 132, 0.8)',   // Red
      'rgba(75, 192, 192, 0.8)',   // Green
      'rgba(255, 206, 86, 0.8)',   // Yellow
      'rgba(153, 102, 255, 0.8)',  // Purple
      'rgba(255, 159, 64, 0.8)',   // Orange
      'rgba(199, 199, 199, 0.8)',  // Grey
      'rgba(83, 102, 255, 0.8)'    // Indigo
    ];

    // Axis configuration with DataFormatter support
    this.xAxisConfig = this.processAxisConfig(this.xAxis);
    this.yAxisConfig = this.processAxisConfig(this.yAxis);
  }

  async getTemplate() {
    const baseTemplate = await super.getTemplate();
    
    // Show the chart type switcher for SeriesChart
    return baseTemplate.replace(
      'style="display: none;"', 
      this.allowTypeSwitch ? '' : 'style="display: none;"'
    );
  }

  get() {
    return {
      ...super.get(),
      chartType: this.chartType,
      allowTypeSwitch: this.allowTypeSwitch,
      orientation: this.orientation,
      stacked: this.stacked
    };
  }

  async onAfterRender() {
    await super.onAfterRender();
    
    // Update chart type switcher UI
    this.updateChartTypeSwitcher();
  }

  // Action Handlers
  async handleActionSetChartType(event, element) {
    const newType = element.getAttribute('data-type');
    if (newType && newType !== this.chartType) {
      await this.setChartType(newType);
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

    // Update UI
    this.updateChartTypeSwitcher();

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

    return {
      labels,
      datasets: [{
        label: this.title || 'Data',
        data: values,
        backgroundColor: this.colors[0].replace('0.8', '0.6'),
        borderColor: this.colors[0],
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
    
    processedData.datasets = processedData.datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || this.colors[index % this.colors.length].replace('0.8', '0.6'),
      borderColor: dataset.borderColor || this.colors[index % this.colors.length],
      borderWidth: dataset.borderWidth || 2,
      tension: this.chartType === 'line' ? (dataset.tension ?? this.tension) : 0,
      fill: this.chartType === 'line' ? (dataset.fill ?? this.fill) : false,
      stepped: this.chartType === 'line' ? (dataset.stepped ?? this.stepped) : false
    }));

    return processedData;
  }

  processSeriesData(data) {
    const labels = data.labels || [];
    const datasets = [];

    data.series.forEach((series, index) => {
      datasets.push({
        label: series.name || series.label || `Series ${index + 1}`,
        data: series.data || [],
        backgroundColor: series.backgroundColor || this.colors[index % this.colors.length].replace('0.8', '0.6'),
        borderColor: series.borderColor || this.colors[index % this.colors.length],
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

    // Apply x-axis formatter to labels
    if (this.xAxisConfig.formatter && processedData.labels) {
      processedData.labels = processedData.labels.map(label => 
        this.dataFormatter.apply(label, this.xAxisConfig.formatter)
      );
    }

    return processedData;
  }

  processAxisConfig(axisConfig) {
    if (!axisConfig) return {};

    if (typeof axisConfig === 'string') {
      // Simple string format: "date:MMM YYYY"
      return { formatter: axisConfig };
    }

    if (typeof axisConfig === 'object') {
      // Object format: { field: 'date', formatter: 'date:MMM YYYY', label: 'Month' }
      return {
        field: axisConfig.field,
        formatter: axisConfig.formatter,
        label: axisConfig.label,
        ...axisConfig
      };
    }

    return {};
  }

  buildChartOptions() {
    const options = super.buildChartOptions();

    // Configure scales based on chart type and orientation
    options.scales = this.buildScalesConfig();

    // Configure stacking if enabled
    if (this.stacked && this.chartType === 'bar') {
      options.scales.x.stacked = true;
      options.scales.y.stacked = true;
    }

    // Configure indexAxis for horizontal bars
    if (this.chartType === 'bar' && this.orientation === 'horizontal') {
      options.indexAxis = 'y';
    }

    // Configure interaction mode
    options.interaction = {
      intersect: false,
      mode: this.chartType === 'line' ? 'index' : 'nearest'
    };

    // Configure elements styling
    options.elements = {
      line: {
        tension: this.tension,
        borderWidth: 2
      },
      point: {
        radius: this.chartType === 'line' ? 4 : 0,
        hoverRadius: 6,
        hitRadius: 8
      },
      bar: {
        borderWidth: 1,
        borderSkipped: false
      }
    };

    return options;
  }

  buildScalesConfig() {
    const scales = {};

    // Determine which axis is which based on orientation
    const xAxisConfig = this.orientation === 'horizontal' ? this.yAxisConfig : this.xAxisConfig;
    const yAxisConfig = this.orientation === 'horizontal' ? this.xAxisConfig : this.yAxisConfig;

    // X-axis configuration
    scales.x = {
      type: this.getAxisType(xAxisConfig),
      display: true,
      title: {
        display: !!xAxisConfig.label,
        text: xAxisConfig.label || ''
      },
      grid: {
        display: true
      },
      ticks: {
        maxTicksLimit: 20
      }
    };

    // Y-axis configuration
    scales.y = {
      type: this.getAxisType(yAxisConfig),
      display: true,
      beginAtZero: yAxisConfig.beginAtZero !== false,
      title: {
        display: !!yAxisConfig.label,
        text: yAxisConfig.label || ''
      },
      grid: {
        display: true
      },
      ticks: {
        callback: (value) => {
          if (yAxisConfig.formatter) {
            return this.dataFormatter.apply(value, yAxisConfig.formatter);
          }
          return value;
        }
      }
    };

    return scales;
  }

  getAxisType(axisConfig) {
    if (!axisConfig.formatter) return 'linear';

    // Determine axis type from formatter
    if (axisConfig.formatter.startsWith('date')) {
      return 'time';
    }
    
    if (axisConfig.formatter.startsWith('category')) {
      return 'category';
    }

    return 'linear';
  }



  updateChartTypeSwitcher() {
    const buttons = this.element.querySelectorAll('[data-action="set-chart-type"]');
    
    buttons.forEach(button => {
      const buttonType = button.getAttribute('data-type');
      if (buttonType === this.chartType) {
        button.classList.add('active');
        button.classList.remove('btn-outline-primary');
        button.classList.add('btn-primary');
      } else {
        button.classList.remove('active');
        button.classList.remove('btn-primary');
        button.classList.add('btn-outline-primary');
      }
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

    const Dialog = (await import('../components/Dialog.js')).default;

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