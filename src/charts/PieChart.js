/**
 * PieChart - Pie chart component with segment interactions for MOJO framework
 * Supports click interactions, custom colors, and DataFormatter integration
 */

import BaseChart from './BaseChart.js';

export default class PieChart extends BaseChart {
  constructor(options = {}) {
    super({
      ...options,
      chartType: 'pie'
    });

    // Pie-specific options
    this.cutout = options.cutout || 0; // 0 for pie, >0 for doughnut
    this.rotation = options.rotation || 0; // Starting angle
    this.circumference = options.circumference || 360; // Full circle
    
    // Segment configuration
    this.borderWidth = options.borderWidth || 2;
    this.borderColor = options.borderColor || '#ffffff';
    this.hoverBorderWidth = options.hoverBorderWidth || 3;
    
    // Label configuration
    this.showLabels = options.showLabels !== false;
    this.labelPosition = options.labelPosition || 'outside'; // 'inside', 'outside'
    this.labelFormatter = options.labelFormatter || null;
    this.valueFormatter = options.valueFormatter || null;
    
    // Data field configuration
    this.labelField = options.labelField || 'label';
    this.valueField = options.valueField || 'value';
    
    // Color scheme for segments
    this.colors = options.colors || [
      '#FF6384', // Red
      '#36A2EB', // Blue  
      '#FFCE56', // Yellow
      '#4BC0C0', // Teal
      '#9966FF', // Purple
      '#FF9F40', // Orange
      '#C9CBCF', // Grey
      '#4BC0C0', // Green
      '#FF6384', // Pink
      '#36A2EB'  // Light Blue
    ];

    // Animation options
    this.animateRotate = options.animateRotate !== false;
    this.animateScale = options.animateScale || false;
    
    // Interaction options
    this.clickable = options.clickable !== false;
    this.hoverable = options.hoverable !== false;
    
    // Selected segment tracking
    this.selectedSegment = null;
    this.highlightedSegments = new Set();

    // Template data properties (available to Mustache)
    this.refreshEnabled = !!(this.endpoint || this.websocketUrl);
    this.showLabels = this.showLabels;
    this.cutout = this.cutout;
  }

  async getTemplate() {
    // Hide chart type switcher for PieChart
    const baseTemplate = await super.getTemplate();
    return baseTemplate.replace('chart-type-switcher', 'chart-type-switcher d-none');
  }

  processChartData(data) {
    if (!data) return data;

    let processedData;

    // Handle different data input formats
    if (Array.isArray(data)) {
      // Array of objects: [{label: 'A', value: 100}, {label: 'B', value: 200}]
      processedData = this.processArrayData(data);
    } else if (data.labels && data.datasets) {
      // Chart.js format: {labels: [...], datasets: [...]}
      processedData = this.processChartJSData(data);
    } else if (typeof data === 'object' && !data.labels) {
      // Simple object: {A: 100, B: 200}
      processedData = this.processObjectData(data);
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
      const label = item[this.labelField];
      const value = item[this.valueField];
      
      if (label !== undefined && value !== undefined) {
        labels.push(label);
        values.push(value);
      }
    });

    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: this.generateColors(labels.length),
        borderColor: this.borderColor,
        borderWidth: this.borderWidth,
        hoverBorderWidth: this.hoverBorderWidth
      }]
    };
  }

  processChartJSData(data) {
    const processedData = { ...data };
    
    // Apply our styling to existing datasets
    processedData.datasets = processedData.datasets.map(dataset => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || this.generateColors(processedData.labels.length),
      borderColor: dataset.borderColor || this.borderColor,
      borderWidth: dataset.borderWidth || this.borderWidth,
      hoverBorderWidth: dataset.hoverBorderWidth || this.hoverBorderWidth
    }));

    return processedData;
  }

  processObjectData(data) {
    const labels = Object.keys(data);
    const values = Object.values(data);

    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: this.generateColors(labels.length),
        borderColor: this.borderColor,
        borderWidth: this.borderWidth,
        hoverBorderWidth: this.hoverBorderWidth
      }]
    };
  }

  applyFormattersToData(data) {
    if (!data) return data;

    const processedData = { ...data };

    // Apply label formatter to labels
    if (this.labelFormatter && processedData.labels) {
      processedData.labels = processedData.labels.map(label => 
        this.dataFormatter.apply(label, this.labelFormatter)
      );
    }

    return processedData;
  }

  generateColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(this.colors[i % this.colors.length]);
    }
    return colors;
  }

  buildChartOptions() {
    const options = super.buildChartOptions();

    // Pie chart specific configuration
    options.cutout = this.cutout;
    options.rotation = this.rotation;
    options.circumference = this.circumference;

    // Animation configuration
    options.animation = {
      animateRotate: this.animateRotate,
      animateScale: this.animateScale,
      duration: this.animations ? 1000 : 0
    };

    // Plugin configuration
    options.plugins = {
      ...options.plugins,
      legend: {
        ...options.plugins.legend,
        position: options.plugins.legend.position || 'right',
        labels: {
          ...options.plugins.legend.labels,
          usePointStyle: true,
          padding: 20,
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const dataset = data.datasets[0];
                const value = dataset.data[i];
                const backgroundColor = dataset.backgroundColor[i];
                
                // Calculate percentage
                const total = dataset.data.reduce((sum, val) => sum + val, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                
                return {
                  text: `${label} (${percentage}%)`,
                  fillStyle: backgroundColor,
                  strokeStyle: backgroundColor,
                  lineWidth: 0,
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        ...options.plugins.tooltip,
        callbacks: {
          ...options.plugins.tooltip.callbacks,
          label: (context) => {
            const label = context.label || '';
            const value = context.raw;
            const dataset = context.dataset;
            
            // Calculate percentage
            const total = dataset.data.reduce((sum, val) => sum + val, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            
            // Apply value formatter if configured
            let formattedValue = value;
            if (this.valueFormatter) {
              formattedValue = this.dataFormatter.apply(value, this.valueFormatter);
            } else if (this.tooltipFormatters.y) {
              formattedValue = this.dataFormatter.apply(value, this.tooltipFormatters.y);
            }
            
            return `${label}: ${formattedValue} (${percentage}%)`;
          }
        }
      }
    };

    // Remove scales (not used in pie charts)
    delete options.scales;

    return options;
  }

  setupChartEventHandlers() {
    super.setupChartEventHandlers();

    if (!this.chart || !this.clickable) return;

    // Override click handler for pie chart specific behavior
    this.chart.options.onClick = (event, elements) => {
      if (elements.length > 0) {
        const element = elements[0];
        const index = element.index;
        const dataset = this.chart.data.datasets[0];
        const label = this.chart.data.labels[index];
        const value = dataset.data[index];

        // Calculate percentage
        const total = dataset.data.reduce((sum, val) => sum + val, 0);
        const percentage = ((value / total) * 100).toFixed(1);

        // Toggle segment selection
        this.toggleSegmentSelection(index);

        // Emit click event
        const eventBus = this.getApp()?.events;
        if (eventBus) {
          eventBus.emit('chart:segment-clicked', {
            chart: this,
            index,
            label,
            value,
            percentage: parseFloat(percentage),
            isSelected: this.selectedSegment === index
          });
        }
      }
    };

    // Hover handler for visual feedback
    if (this.hoverable) {
      this.chart.options.onHover = (event, elements) => {
        this.canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
        
        if (elements.length > 0) {
          const element = elements[0];
          const index = element.index;
          
          // Emit hover event
          const eventBus = this.getApp()?.events;
          if (eventBus) {
            eventBus.emit('chart:segment-hover', {
              chart: this,
              index,
              label: this.chart.data.labels[index],
              value: this.chart.data.datasets[0].data[index]
            });
          }
        }
      };
    }
  }

  toggleSegmentSelection(index) {
    if (this.selectedSegment === index) {
      // Deselect current segment
      this.selectedSegment = null;
      this.resetSegmentStyle(index);
    } else {
      // Reset previous selection
      if (this.selectedSegment !== null) {
        this.resetSegmentStyle(this.selectedSegment);
      }
      
      // Select new segment
      this.selectedSegment = index;
      this.highlightSegment(index);
    }
  }

  highlightSegment(index) {
    if (!this.chart) return;

    const meta = this.chart.getDatasetMeta(0);
    const segment = meta.data[index];
    
    if (segment) {
      // Expand segment slightly
      segment.outerRadius += 10;
      this.chart.update('none');
    }
  }

  resetSegmentStyle(index) {
    if (!this.chart) return;

    const meta = this.chart.getDatasetMeta(0);
    const segment = meta.data[index];
    
    if (segment) {
      // Reset segment to normal size
      segment.outerRadius -= 10;
      this.chart.update('none');
    }
  }

  highlightSegments(indices) {
    if (!Array.isArray(indices)) {
      indices = [indices];
    }

    this.highlightedSegments.clear();
    indices.forEach(index => {
      this.highlightedSegments.add(index);
      this.highlightSegment(index);
    });
  }

  clearHighlights() {
    this.highlightedSegments.forEach(index => {
      this.resetSegmentStyle(index);
    });
    this.highlightedSegments.clear();
    
    if (this.selectedSegment !== null) {
      this.resetSegmentStyle(this.selectedSegment);
      this.selectedSegment = null;
    }
  }

  // Public API extensions
  selectSegment(index) {
    if (index >= 0 && index < this.chart?.data?.labels?.length) {
      this.toggleSegmentSelection(index);
    }
  }

  getSegmentData(index) {
    if (!this.chart || !this.chart.data) return null;

    const dataset = this.chart.data.datasets[0];
    const label = this.chart.data.labels[index];
    const value = dataset.data[index];
    const total = dataset.data.reduce((sum, val) => sum + val, 0);
    const percentage = ((value / total) * 100).toFixed(1);

    return {
      index,
      label,
      value,
      percentage: parseFloat(percentage),
      color: dataset.backgroundColor[index],
      isSelected: this.selectedSegment === index
    };
  }

  getAllSegments() {
    if (!this.chart || !this.chart.data) return [];

    return this.chart.data.labels.map((_, index) => this.getSegmentData(index));
  }

  updateSegmentColor(index, color) {
    if (!this.chart || !this.chart.data.datasets[0]) return;

    this.chart.data.datasets[0].backgroundColor[index] = color;
    this.chart.update('none');

    // Emit color change event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('chart:segment-color-changed', {
        chart: this,
        index,
        color,
        segment: this.getSegmentData(index)
      });
    }
  }

  addSegment(label, value, color = null) {
    if (!this.chart || !this.chart.data) return;

    const dataset = this.chart.data.datasets[0];
    const segmentColor = color || this.colors[this.chart.data.labels.length % this.colors.length];

    this.chart.data.labels.push(label);
    dataset.data.push(value);
    dataset.backgroundColor.push(segmentColor);

    this.chart.update();

    // Emit segment added event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('chart:segment-added', {
        chart: this,
        label,
        value,
        color: segmentColor,
        index: this.chart.data.labels.length - 1
      });
    }
  }

  removeSegment(index) {
    if (!this.chart || !this.chart.data || index < 0 || index >= this.chart.data.labels.length) {
      return;
    }

    const dataset = this.chart.data.datasets[0];
    const label = this.chart.data.labels[index];
    const value = dataset.data[index];

    this.chart.data.labels.splice(index, 1);
    dataset.data.splice(index, 1);
    dataset.backgroundColor.splice(index, 1);

    // Reset selection if removed segment was selected
    if (this.selectedSegment === index) {
      this.selectedSegment = null;
    } else if (this.selectedSegment > index) {
      this.selectedSegment--;
    }

    this.chart.update();

    // Emit segment removed event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('chart:segment-removed', {
        chart: this,
        label,
        value,
        index,
        removedSegment: { label, value, index }
      });
    }
  }

  // Override applyThemeToOptions for pie chart specific theming
  applyThemeToOptions(options) {
    super.applyThemeToOptions(options);

    const isDark = this.theme === 'dark';
    
    // Adjust border colors for theme
    if (isDark) {
      this.borderColor = '#404449';
    } else {
      this.borderColor = '#ffffff';
    }
  }

  // Static dialog method
  static async showDialog(options = {}) {
    const {
      title = 'Pie Chart',
      size = 'lg',
      ...chartOptions
    } = options;

    const chart = new PieChart({
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