# Charts Components - Interactive Data Visualization

## Overview

The MOJO Charts package provides powerful, interactive chart components built on Chart.js 4.x with seamless integration into the MOJO framework. All components support real-time data updates, API integration, and responsive design with Bootstrap 5.

## Installation & Import

```javascript
// Import the charts package
import { SeriesChart, PieChart } from 'web-mojo/charts';

// Or import individual components
import SeriesChart from 'web-mojo/charts/SeriesChart.js';
import PieChart from 'web-mojo/charts/PieChart.js';
import WebSocketClient from 'web-mojo/charts/WebSocketClient.js';
```

## Package Features

- **SeriesChart**: Combined Line + Bar charts with easy type switching
- **PieChart**: Interactive pie charts with segment selection
- **Real-time Updates**: WebSocket and HTTP polling support
- **DataFormatter Integration**: Easy axis and tooltip formatting
- **EventBus Integration**: Rich event system for inter-component communication
- **API-First Design**: Built around REST endpoints with auto-refresh
- **Responsive Design**: Mobile-friendly with touch support
- **Theme Support**: Light/dark modes with CSS custom properties
- **Export Functionality**: PNG/JPG export capabilities

---

## BaseChart (Foundation Class)

All chart components extend BaseChart, which provides common functionality.

### Core Features

- API endpoint integration
- WebSocket real-time updates
- Loading and error states
- Export functionality
- Theme switching
- Auto-refresh capabilities
- EventBus integration

### Common Constructor Options

```javascript
const chartOptions = {
  // Data source
  endpoint: '/api/chart-data',          // HTTP endpoint
  websocketUrl: 'ws://api.com/live',    // WebSocket URL
  data: chartData,                      // Direct data
  dataTransform: (data) => processData(data), // Data transformer
  
  // Refresh settings
  refreshInterval: 30000,               // Auto-refresh every 30s
  autoRefresh: true,                    // Enable auto-refresh
  websocketReconnect: true,             // Auto-reconnect WebSocket
  
  // Display options
  title: 'Sales Dashboard',             // Chart title
  theme: 'light',                       // 'light' or 'dark'
  showLegend: true,                     // Show legend
  legendPosition: 'top',                // Legend position
  exportEnabled: true,                  // Enable export
  
  // Chart.js options
  chartOptions: {                       // Direct Chart.js config
    responsive: true,
    maintainAspectRatio: false
  }
};
```

### Common Events

All charts emit these events via EventBus:

```javascript
// Listen to chart events
app.events.on('chart:loaded', (data) => {
  console.log('Chart loaded:', data.chart.title);
  console.log('Data points:', data.dataPoints);
});

app.events.on('chart:error', (data) => {
  console.error('Chart error:', data.error);
  console.log('Endpoint:', data.endpoint);
});

app.events.on('chart:data-updated', (data) => {
  console.log('Real-time update from:', data.source);
});

app.events.on('chart:theme-changed', (data) => {
  console.log('Theme switched to:', data.theme);
});
```

### Common Actions (EventDelegate)

All charts respond to these `data-action` attributes:

- `data-action="refresh-chart"` - Refresh data
- `data-action="export-chart" data-format="png"` - Export chart
- `data-action="toggle-theme"` - Switch light/dark theme
- `data-action="retry-load"` - Retry after error

---

## SeriesChart (Line + Bar Combined)

Combined line and bar chart component that allows switching between chart types with the same data.

### Constructor Options

```javascript
const seriesChart = new SeriesChart({
  // Base options
  containerId: 'sales-chart',
  endpoint: '/api/sales-data',
  title: 'Monthly Sales',
  
  // Chart type (switchable)
  chartType: 'line',                    // 'line' or 'bar'
  allowTypeSwitch: true,                // Show type switcher
  
  // Orientation and stacking
  orientation: 'vertical',              // 'vertical' or 'horizontal'
  stacked: false,                       // Stack multiple series
  
  // Line chart options
  tension: 0.4,                         // Line curve (0 = straight)
  stepped: false,                       // Stepped lines
  fill: false,                          // Fill area under line
  
  // Axis configuration with DataFormatter
  xAxis: {
    field: 'date',                      // Data field name
    formatter: 'date:MMM YYYY',         // DataFormatter pattern
    label: 'Month'                      // Axis label
  },
  yAxis: {
    field: 'revenue',
    formatter: 'currency:USD',          // Format as currency
    label: 'Revenue',
    beginAtZero: true                   // Start Y axis at zero
  },
  
  // Tooltip formatting
  tooltip: {
    x: 'date:MMM DD, YYYY',            // X-axis tooltip format
    y: 'currency:USD:2'                // Y-axis tooltip format
  },
  
  // Data series
  colors: [                             // Custom color scheme
    'rgba(54, 162, 235, 0.8)',         // Blue
    'rgba(255, 99, 132, 0.8)',         // Red
    'rgba(75, 192, 192, 0.8)'          // Green
  ]
});
```

### Data Formats

SeriesChart accepts multiple data formats:

#### Array of Objects
```javascript
const arrayData = [
  { date: '2024-01', revenue: 15000, profit: 5000 },
  { date: '2024-02', revenue: 18000, profit: 6500 },
  { date: '2024-03', revenue: 22000, profit: 8200 }
];

seriesChart.setData(arrayData);
```

#### Chart.js Format
```javascript
const chartJsData = {
  labels: ['Jan 2024', 'Feb 2024', 'Mar 2024'],
  datasets: [{
    label: 'Revenue',
    data: [15000, 18000, 22000],
    backgroundColor: 'rgba(54, 162, 235, 0.6)',
    borderColor: 'rgba(54, 162, 235, 1)'
  }, {
    label: 'Profit',
    data: [5000, 6500, 8200],
    backgroundColor: 'rgba(255, 99, 132, 0.6)',
    borderColor: 'rgba(255, 99, 132, 1)'
  }]
};

seriesChart.setData(chartJsData);
```

#### Series Format
```javascript
const seriesData = {
  labels: ['Jan 2024', 'Feb 2024', 'Mar 2024'],
  series: [{
    name: 'Revenue',
    data: [15000, 18000, 22000]
  }, {
    name: 'Profit', 
    data: [5000, 6500, 8200]
  }]
};

seriesChart.setData(seriesData);
```

### Methods

```javascript
// Chart type switching
await seriesChart.setChartType('bar');        // Switch to bar chart
await seriesChart.setChartType('line');       // Switch to line chart

// Orientation
seriesChart.setOrientation('horizontal');     // Horizontal bars
seriesChart.setStacked(true);                 // Enable stacking

// Series management
seriesChart.addSeries({
  label: 'Expenses',
  data: [8000, 9500, 11000],
  backgroundColor: 'rgba(255, 206, 86, 0.6)'
});

seriesChart.removeSeries(1);                  // Remove series by index

// Data management
seriesChart.setData(newData);                 // Set new data
seriesChart.setEndpoint('/api/new-endpoint'); // Change API endpoint
await seriesChart.refresh();                  // Manual refresh
```

### Events

```javascript
// SeriesChart specific events
app.events.on('chart:type-changed', (data) => {
  console.log(`Chart type changed from ${data.oldType} to ${data.newType}`);
});

app.events.on('chart:series-added', (data) => {
  console.log('New series added:', data.series.label);
});

app.events.on('chart:point-clicked', (data) => {
  console.log('Data point clicked:', {
    value: data.value,
    label: data.label,
    dataset: data.dataset.label
  });
});
```

### Actions (EventDelegate)

SeriesChart specific actions:
- `data-action="set-chart-type" data-type="line"` - Switch to line chart
- `data-action="set-chart-type" data-type="bar"` - Switch to bar chart

### Usage Example

```javascript
class SalesDashboard extends View {
  async onInit() {
    // Create sales chart
    this.salesChart = new SeriesChart({
      containerId: 'sales-chart',
      endpoint: '/api/sales/monthly',
      title: 'Monthly Sales Performance',
      chartType: 'line',
      
      // API data transformation
      dataTransform: (data) => ({
        labels: data.months.map(month => 
          this.dataFormatter.apply(month, 'date:MMM YYYY')
        ),
        datasets: [{
          label: 'Revenue',
          data: data.revenue,
          borderColor: '#0d6efd',
          backgroundColor: 'rgba(13, 110, 253, 0.1)',
          fill: true
        }, {
          label: 'Target',
          data: data.targets,
          borderColor: '#198754',
          borderDash: [5, 5]
        }]
      }),
      
      // Formatting
      tooltip: {
        y: 'currency:USD'
      },
      
      // Auto-refresh every minute
      refreshInterval: 60000
    });
    
    await this.salesChart.render();
    await this.salesChart.mount();
  }
  
  async handleActionToggleChartType() {
    const currentType = this.salesChart.chartType;
    const newType = currentType === 'line' ? 'bar' : 'line';
    await this.salesChart.setChartType(newType);
  }
}
```

---

## PieChart

Interactive pie chart component with segment selection and customizable styling.

### Constructor Options

```javascript
const pieChart = new PieChart({
  // Base options
  containerId: 'market-share',
  endpoint: '/api/market-data',
  title: 'Market Share',
  
  // Pie-specific options
  cutout: 0,                            // 0 = pie, >0 = doughnut
  rotation: 0,                          // Starting angle (degrees)
  circumference: 360,                   // Full circle (degrees)
  
  // Segment styling
  borderWidth: 2,                       // Segment border width
  borderColor: '#ffffff',               // Segment border color
  hoverBorderWidth: 3,                  // Hover border width
  
  // Labels and formatting
  showLabels: true,                     // Show segment labels
  labelPosition: 'outside',             // 'inside' or 'outside'
  labelFormatter: 'capitalize',         // Format labels
  valueFormatter: 'currency:USD',       // Format values
  
  // Data field mapping
  labelField: 'category',               // Object property for labels
  valueField: 'amount',                 // Object property for values
  
  // Colors
  colors: [                             // Custom color palette
    '#FF6384', '#36A2EB', '#FFCE56',
    '#4BC0C0', '#9966FF', '#FF9F40'
  ],
  
  // Animation
  animateRotate: true,                  // Rotate animation
  animateScale: false,                  // Scale animation
  
  // Interaction
  clickable: true,                      // Enable click selection
  hoverable: true                       // Enable hover effects
});
```

### Data Formats

PieChart accepts multiple data formats:

#### Array of Objects
```javascript
const arrayData = [
  { category: 'Desktop', amount: 45000 },
  { category: 'Mobile', amount: 38000 },
  { category: 'Tablet', amount: 17000 }
];

pieChart.setData(arrayData);
```

#### Chart.js Format
```javascript
const chartJsData = {
  labels: ['Desktop', 'Mobile', 'Tablet'],
  datasets: [{
    data: [45000, 38000, 17000],
    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
  }]
};

pieChart.setData(chartJsData);
```

#### Simple Object
```javascript
const objectData = {
  'Desktop': 45000,
  'Mobile': 38000,
  'Tablet': 17000
};

pieChart.setData(objectData);
```

### Methods

```javascript
// Segment interaction
pieChart.selectSegment(0);               // Select first segment
pieChart.highlightSegments([0, 2]);      // Highlight segments 0 and 2
pieChart.clearHighlights();              // Clear all highlights

// Segment data
const segment = pieChart.getSegmentData(0); // Get segment info
const allSegments = pieChart.getAllSegments(); // Get all segments

// Segment management
pieChart.addSegment('Other', 5000, '#C9CBCF');  // Add new segment
pieChart.removeSegment(2);                      // Remove segment by index
pieChart.updateSegmentColor(0, '#FF0000');      // Change segment color

// Data access
console.log(segment);
// Output: {
//   index: 0,
//   label: 'Desktop',
//   value: 45000,
//   percentage: 45.0,
//   color: '#FF6384',
//   isSelected: true
// }
```

### Events

```javascript
// PieChart specific events
app.events.on('chart:segment-clicked', (data) => {
  console.log(`Segment clicked: ${data.label} (${data.percentage}%)`);
  console.log('Selected:', data.isSelected);
});

app.events.on('chart:segment-hover', (data) => {
  console.log(`Hovering: ${data.label} - $${data.value}`);
});

app.events.on('chart:segment-added', (data) => {
  console.log('New segment added:', data.label);
});

app.events.on('chart:segment-color-changed', (data) => {
  console.log(`Segment ${data.index} color changed to ${data.color}`);
});
```

### Usage Example

```javascript
class MarketAnalytics extends View {
  async onInit() {
    // Create market share pie chart
    this.marketChart = new PieChart({
      containerId: 'market-chart',
      endpoint: '/api/analytics/market-share',
      title: 'Market Share by Platform',
      
      // Data transformation
      dataTransform: (data) => data.platforms.map(platform => ({
        category: platform.name,
        amount: platform.users,
        revenue: platform.revenue
      })),
      
      // Formatting
      labelFormatter: 'capitalize',
      valueFormatter: 'number:0,0',
      
      // Custom colors
      colors: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1'],
      
      // Real-time updates
      websocketUrl: 'ws://api.example.com/market-live',
      refreshInterval: 300000  // Refresh every 5 minutes
    });
    
    await this.marketChart.render();
    await this.marketChart.mount();
    
    // Listen for segment selections
    this.getApp().events.on('chart:segment-clicked', (data) => {
      if (data.chart === this.marketChart) {
        this.showSegmentDetails(data);
      }
    });
  }
  
  showSegmentDetails(segmentData) {
    // Show detailed view for selected segment
    const details = `
      <div class="segment-details">
        <h5>${segmentData.label}</h5>
        <p>Share: ${segmentData.percentage}%</p>
        <p>Users: ${this.formatNumber(segmentData.value)}</p>
      </div>
    `;
    
    this.element.querySelector('#segment-details').innerHTML = details;
  }
}
```

---

## DataFormatter Integration

Charts leverage MOJO's DataFormatter for consistent data presentation.

### Axis Formatting

```javascript
const chart = new SeriesChart({
  // Simple string format
  xAxis: 'date:MMM YYYY',               // January 2024
  yAxis: 'currency:USD',                // $1,234.56
  
  // Object format with more options
  xAxis: {
    field: 'timestamp',
    formatter: 'date:MMM DD',           // Jan 15
    label: 'Date'
  },
  yAxis: {
    field: 'value',
    formatter: 'number:0,0.00',         // 1,234.56
    label: 'Amount',
    beginAtZero: true
  }
});
```

### Tooltip Formatting

```javascript
const chart = new SeriesChart({
  tooltip: {
    x: 'date:MMM DD, YYYY',            // January 15, 2024
    y: 'currency:USD:2'                // $1,234.56
  }
});

const pieChart = new PieChart({
  labelFormatter: 'capitalize',         // Desktop -> Desktop
  valueFormatter: 'percent:1',          // 45.2%
  tooltip: {
    y: 'currency:USD'                  // $45,000.00
  }
});
```

### Available Formatters

```javascript
// Date/Time
'date:MMM YYYY'        // Jan 2024
'date:DD/MM/YYYY'      // 15/01/2024
'time:HH:mm'           // 14:30
'datetime:short'       // 1/15/24 2:30 PM
'relative'             // 2 hours ago

// Numbers
'number:0,0'           // 1,234
'number:0,0.00'        // 1,234.56
'currency:USD'         // $1,234.56
'percent:1'            // 45.2%
'filesize'             // 1.2 MB
'compact'              // 1.2K

// Text
'capitalize'           // hello world -> Hello World
'truncate:20'          // Long text...
'mask:***-**-0000'     // 123-45-6789

// Custom formatters
'badge:success'        // <span class="badge bg-success">Value</span>
'icon:user'            // <i class="bi bi-user"></i>
```

---

## WebSocket Integration

Charts support real-time data updates via WebSocket connections.

### Basic WebSocket Setup

```javascript
const chart = new SeriesChart({
  // Primary WebSocket connection
  websocketUrl: 'ws://api.example.com/live-data',
  
  // HTTP fallback
  endpoint: '/api/data',
  refreshInterval: 30000,               // Fallback polling
  
  // WebSocket options
  websocketReconnect: true,             // Auto-reconnect
  
  // Data transformation for WebSocket messages
  dataTransform: (wsMessage) => {
    // Transform WebSocket message to chart data
    return {
      labels: wsMessage.timestamps.map(ts => 
        new Date(ts).toLocaleDateString()
      ),
      datasets: [{
        label: 'Live Data',
        data: wsMessage.values
      }]
    };
  }
});
```

### WebSocket Events

```javascript
// WebSocket connection events (via EventBus)
app.events.on('websocket:connected', (data) => {
  console.log('WebSocket connected for chart:', data.websocket.url);
});

app.events.on('websocket:disconnected', (data) => {
  console.log('WebSocket disconnected:', data.data.reason);
});

app.events.on('websocket:reconnecting', (data) => {
  console.log(`Reconnecting... attempt ${data.data.attempt}`);
});

app.events.on('websocket:error', (data) => {
  console.error('WebSocket error:', data.data.error);
});
```

### Custom WebSocket Client

```javascript
import { WebSocketClient } from 'web-mojo/charts';

// Create standalone WebSocket client
const wsClient = new WebSocketClient({
  url: 'ws://api.example.com/charts',
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectInterval: 3000,
  
  // Data transformation
  dataTransform: (message) => {
    try {
      const data = JSON.parse(message);
      return {
        timestamp: new Date().toISOString(),
        ...data
      };
    } catch (error) {
      console.error('Invalid WebSocket message:', message);
      return null;
    }
  },
  
  // Event integration
  eventBus: app.events
});

// Connect and handle data
await wsClient.connect();

wsClient.on('data', (data) => {
  // Update multiple charts with same data
  salesChart.setData(data.sales);
  userChart.setData(data.users);
});

// Send data to server
wsClient.send({
  action: 'subscribe',
  channels: ['sales', 'users', 'revenue']
});
```

---

## Event System Integration

Charts integrate deeply with MOJO's EventBus for loose coupling and reactive behavior.

### Global Event Listeners

```javascript
class DashboardView extends View {
  async onInit() {
    const events = this.getApp().events;
    
    // Listen to all chart events
    events.on('chart:loaded', this.onChartLoaded.bind(this));
    events.on('chart:error', this.onChartError.bind(this));
    events.on('chart:data-updated', this.onDataUpdated.bind(this));
    
    // Chart-specific events
    events.on('chart:type-changed', this.onChartTypeChanged.bind(this));
    events.on('chart:segment-clicked', this.onSegmentClicked.bind(this));
    events.on('chart:point-clicked', this.onPointClicked.bind(this));
  }
  
  onChartLoaded(data) {
    console.log(`Chart "${data.chart.title}" loaded with ${data.dataPoints} points`);
    this.updateDashboardStats();
  }
  
  onChartError(data) {
    // Show global error notification
    this.showError(`Chart error: ${data.error.message}`);
    
    // Log for analytics
    this.trackEvent('chart_error', {
      chart_type: data.chart.chartType,
      endpoint: data.endpoint,
      error: data.error.message
    });
  }
  
  onDataUpdated(data) {
    // Update last refreshed timestamp
    this.updateLastRefreshedTime();
    
    // Emit custom event for other components
    this.getApp().events.emit('dashboard:data-refreshed', {
      source: data.source,
      chart: data.chart.title
    });
  }
  
  onSegmentClicked(data) {
    // Navigate to detailed view
    this.navigateToSegmentDetails(data.label, data.value);
  }
  
  async onPointClicked(data) {
    // Show data point details in modal
    const details = await this.fetchDataPointDetails(data.index);
    this.showDataPointModal(details);
  }
}
```

### Inter-Chart Communication

```javascript
class AnalyticsPage extends View {
  async createCharts() {
    // Create related charts
    this.overviewChart = new PieChart({
      containerId: 'overview-chart',
      endpoint: '/api/overview'
    });
    
    this.trendsChart = new SeriesChart({
      containerId: 'trends-chart',  
      endpoint: '/api/trends'
    });
    
    // Set up chart interaction
    this.getApp().events.on('chart:segment-clicked', (data) => {
      if (data.chart === this.overviewChart) {
        // Update trends chart based on pie segment selection
        const category = data.label;
        this.trendsChart.setEndpoint(`/api/trends?category=${category}`);
      }
    });
    
    // Synchronize themes
    this.getApp().events.on('chart:theme-changed', (data) => {
      // Apply same theme to all charts
      [this.overviewChart, this.trendsChart].forEach(chart => {
        if (chart !== data.chart) {
          chart.setTheme(data.theme);
        }
      });
    });
  }
}
```

---

## CSS Customization

Charts use CSS custom properties for easy theming and customization.

### CSS Custom Properties

```css
:root {
  /* Light theme colors */
  --chart-bg: #ffffff;
  --chart-content-bg: #ffffff;
  --chart-border: #dee2e6;
  --chart-text: #212529;
  --chart-text-muted: #6c757d;
  --chart-overlay-bg: rgba(255, 255, 255, 0.95);
  --chart-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  --chart-hover-bg: rgba(0, 0, 0, 0.05);
  --chart-focus-ring: rgba(13, 110, 253, 0.25);
  --chart-grid-color: rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] {
  /* Dark theme colors */
  --chart-bg: #212529;
  --chart-content-bg: #2b3035;
  --chart-border: #404449;
  --chart-text: #ffffff;
  --chart-text-muted: #adb5bd;
  --chart-overlay-bg: rgba(33, 37, 41, 0.95);
  --chart-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
  --chart-hover-bg: rgba(255, 255, 255, 0.1);
  --chart-focus-ring: rgba(13, 110, 253, 0.4);
  --chart-grid-color: rgba(255, 255, 255, 0.1);
}
```

### Custom Chart Styling

```css
/* Custom branded charts */
.sales-dashboard .chart-component {
  border: 2px solid #0d6efd;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(13, 110, 253, 0.15);
}

.sales-dashboard .chart-title {
  color: #0d6efd;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sales-dashboard .chart-controls .btn {
  border-radius: 6px;
  font-weight: 500;
}

/* Custom pie chart segments */
.market-analysis .chart-component[data-chart-type="pie"] {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* Compact chart variant */
.chart-compact {
  padding: 0.5rem;
  min-height: 200px;
}

.chart-compact .chart-title {
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.chart-compact .chart-controls .btn {
  padding: 0.125rem 0.25rem;
  font-size: 0.75rem;
}
```

### Size Utilities

```css
/* Chart size variants */
.chart-sm { min-height: 200px; }
.chart-lg { min-height: 600px; }
.chart-xl { min-height: 700px; }

/* Aspect ratios */
.chart-square { aspect-ratio: 1 / 1; }
.chart-wide { aspect-ratio: 16 / 9; }
.chart-tall { aspect-ratio: 3 / 4; }
```

---

## Best Practices

### Performance Optimization

```javascript
// 1. Use data transformation for large datasets
const chart = new SeriesChart({
  endpoint: '/api/large-dataset',
  dataTransform: (data) => {
    // Sample or aggregate large datasets
    if (data.length > 1000) {
      return data.filter((_, index) => index % 10 === 0);
    }
    return data;
  }
});

// 2. Disable animations for real-time updates
const realtimeChart = new SeriesChart({
  websocketUrl: 'ws://api.com/live',
  animations: false,  // Better performance
  chartOptions: {
    animation: { duration: 0 }
  }
});

// 3. Use appropriate refresh intervals
const chart = new SeriesChart({
  endpoint: '/api/data',
  refreshInterval: 60000,  // 1 minute, not too frequent
  autoRefresh: true
});
```

### Memory Management

```javascript
class ChartManager extends View {
  constructor() {
    this.charts = new Map();
  }
  
  createChart(id, options) {
    // Clean up existing chart
    if (this.charts.has(id)) {
      this.charts.get(id).destroy();
    }
    
    const chart = new SeriesChart(options);
    this.charts.set(id, chart);
    return chart;
  }
  
  async onBeforeDestroy() {
    // Clean up all charts
    for (const [id, chart] of this.charts) {
      await chart.destroy();
    }
    this.charts.clear();
  }
}
```

### Error Handling

```javascript
class RobustChart extends SeriesChart {
  constructor(options) {
    super({
      ...options,
      // Retry configuration
      maxRetries: 3,
      retryDelay: 2000
    });
    
    this.retryCount = 0;
  }
  
  async fetchData() {
    try {
      await super.fetchData();
      this.retryCount = 0; // Reset on success
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retry ${this.retryCount}/${this.maxRetries} in ${this.retryDelay}ms`);
        
        setTimeout(() => {
          this.fetchData();
        }, this.retryDelay);
      } else {
        this.showError('Failed to load data after multiple attempts');
      }
    }
  }
}
```

### Accessibility

```javascript
const accessibleChart = new SeriesChart({
  containerId: 'accessible-chart',
  title: 'Monthly Sales Data',
  
  // Provide data table alternative
  chartOptions: {
    plugins: {
      title: {
        display: true,
        text: 'Monthly Sales Data - Chart'
      },
      legend: {
        labels: {
          generateLabels: (chart) => {
            // Generate accessible legend labels
            return chart.data.datasets.map((dataset, i) => ({
              text: `${dataset.label}: Click to toggle visibility`,
              fillStyle: dataset.backgroundColor,
              hidden: !chart.isDatasetVisible(i),
              datasetIndex: i
            }));
          }
        }
      }
    }
  },
      
  // ARIA attributes
  attributes: {
    'aria-label': 'Monthly sales chart showing revenue trends',
    'role': 'img',
    'tabindex': '0'
  }
});
    
// Provide keyboard navigation
chart.canvas.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    // Provide alternative data access
    this.showDataTable();
  }
});
```

---

## Complete Usage Example

Here's a comprehensive example showing all chart features working together:

```javascript
class ExecutiveDashboard extends Page {
async onInit() {
// Set up global event listeners
this.setupChartEventListeners();
    
// Create multiple related charts
await this.createRevenueChart();
await this.createMarketShareChart();
await this.createPerformanceChart();
    
// Start real-time updates
this.startRealTimeUpdates();
}

setupChartEventListeners() {
const events = this.getApp().events;
    
// Global chart error handling
events.on('chart:error', (data) => {
  this.showNotification(`Chart Error: ${data.error.message}`, 'error');
  this.logError('chart_error', data);
});
    
// Cross-chart interactions
events.on('chart:segment-clicked', (data) => {
  if (data.chart === this.marketChart) {
    this.filterOtherCharts(data.label);
  }
});
    
// Theme synchronization
events.on('chart:theme-changed', (data) => {
  this.syncThemeAcrossCharts(data.theme);
});
}

async createRevenueChart() {
this.revenueChart = new SeriesChart({
  containerId: 'revenue-chart',
  title: 'Monthly Revenue Trends',
  endpoint: '/api/dashboard/revenue',
      
  // Chart configuration
  chartType: 'line',
  allowTypeSwitch: true,
      
  // Advanced axis configuration
  xAxis: {
    field: 'month',
    formatter: 'date:MMM YYYY',
    label: 'Month'
  },
  yAxis: {
    field: 'amount',
    formatter: 'currency:USD:0',
    label: 'Revenue',
    beginAtZero: false
  },
      
  // Enhanced tooltips
  tooltip: {
    x: 'date:MMMM YYYY',
    y: 'currency:USD:2'
  },
      
  // Real-time updates
  websocketUrl: 'ws://api.example.com/live/revenue',
  refreshInterval: 300000, // 5 minute fallback
      
  // Data transformation
  dataTransform: (data) => {
    // Handle both HTTP and WebSocket data formats
    const months = data.months || data.labels;
    const values = data.revenue || data.values;
        
    return {
      labels: months.map(month => new Date(month)),
      datasets: [{
        label: 'Revenue',
        data: values,
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        fill: true,
        tension: 0.4
      }, {
        label: 'Target',
        data: data.targets || [],
        borderColor: '#198754',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        pointRadius: 0
      }]
    };
  },
      
  // Custom styling
  chartOptions: {
    elements: {
      point: {
        radius: 6,
        hoverRadius: 8
      }
    }
  }
});
    
await this.revenueChart.render();
await this.revenueChart.mount();
}

async createMarketShareChart() {
this.marketChart = new PieChart({
  containerId: 'market-chart',
  title: 'Market Share by Product',
  endpoint: '/api/dashboard/market-share',
      
  // Pie configuration
  cutout: 0,
  borderWidth: 3,
  hoverBorderWidth: 5,
      
  // Data formatting
  labelFormatter: 'capitalize',
  valueFormatter: 'percent:1',
      
  // Custom colors matching brand
  colors: [
    '#0d6efd', '#198754', '#ffc107', 
    '#dc3545', '#6f42c1', '#fd7e14'
  ],
      
  // Animation
  animateRotate: true,
  animateScale: false,
      
  // Data transformation
  dataTransform: (data) => {
    return data.products.map(product => ({
      label: product.name,
      value: product.marketShare
    }));
  }
});
    
await this.marketChart.render();
await this.marketChart.mount();
}

async createPerformanceChart() {
this.performanceChart = new SeriesChart({
  containerId: 'performance-chart',
  title: 'Quarterly Performance',
  endpoint: '/api/dashboard/performance',
      
  // Bar chart configuration
  chartType: 'bar',
  orientation: 'vertical',
  stacked: true,
      
  // Axis configuration
  xAxis: {
    field: 'quarter',
    formatter: (value) => `Q${value}`,
    label: 'Quarter'
  },
  yAxis: {
    field: 'value',
    formatter: 'compact',
    label: 'Performance Score'
  },
      
  // Multiple series
  dataTransform: (data) => ({
    labels: data.quarters,
    datasets: [{
      label: 'Sales',
      data: data.sales,
      backgroundColor: 'rgba(13, 110, 253, 0.8)'
    }, {
      label: 'Marketing', 
      data: data.marketing,
      backgroundColor: 'rgba(25, 135, 84, 0.8)'
    }, {
      label: 'Support',
      data: data.support,
      backgroundColor: 'rgba(255, 193, 7, 0.8)'
    }]
  })
});
    
await this.performanceChart.render();
await this.performanceChart.mount();
}

startRealTimeUpdates() {
// WebSocket connection for all charts
this.wsClient = new WebSocketClient({
  url: 'ws://api.example.com/dashboard/live',
  autoReconnect: true,
  eventBus: this.getApp().events
});
    
this.wsClient.on('data', (message) => {
  switch (message.type) {
    case 'revenue':
      this.revenueChart.updateChart(message.data);
      break;
    case 'market_share':
      this.marketChart.updateChart(message.data);
      break;
    case 'performance':
      this.performanceChart.updateChart(message.data);
      break;
  }
});
    
this.wsClient.connect();
}

filterOtherCharts(selectedProduct) {
// Update other charts based on product selection
const productFilter = `?product=${encodeURIComponent(selectedProduct)}`;
    
this.revenueChart.setEndpoint(`/api/dashboard/revenue${productFilter}`);
this.performanceChart.setEndpoint(`/api/dashboard/performance${productFilter}`);
    
// Show filter indicator
this.showFilterIndicator(`Filtered by: ${selectedProduct}`);
}

syncThemeAcrossCharts(theme) {
[this.revenueChart, this.marketChart, this.performanceChart].forEach(chart => {
  if (chart) {
    chart.setTheme(theme);
  }
});
}

async handleActionExportDashboard() {
// Export all charts as a combined report
const exports = await Promise.all([
  this.revenueChart.export('png'),
  this.marketChart.export('png'),
  this.performanceChart.export('png')
]);
    
// Combine into dashboard report
this.generateDashboardReport(exports);
}

async onBeforeDestroy() {
// Clean up WebSocket
if (this.wsClient) {
  this.wsClient.disconnect();
}
    
// Clean up charts
const charts = [this.revenueChart, this.marketChart, this.performanceChart];
await Promise.all(charts.map(chart => chart?.destroy()));
}
}
```

---

## Troubleshooting

### Common Issues

#### Chart Not Rendering
```javascript
// Problem: Chart appears blank
// Solution: Check container element exists and has dimensions

const chart = new SeriesChart({
containerId: 'my-chart' // Make sure this element exists
});

// Ensure container has dimensions
.chart-container {
width: 100%;
height: 400px; /* Required for Chart.js */
}
```

#### Data Not Loading
```javascript
// Problem: API calls failing
// Solution: Add error handling and logging

const chart = new SeriesChart({
endpoint: '/api/data',
dataTransform: (data) => {
console.log('Raw API data:', data); // Debug data format
return processedData;
}
});

// Listen for errors
app.events.on('chart:error', (data) => {
console.error('Chart error details:', data);
});
```

#### WebSocket Issues  
```javascript
// Problem: WebSocket not connecting
// Solution: Check URL and add connection debugging

const chart = new SeriesChart({
websocketUrl: 'ws://localhost:8080/data', // Check URL is correct
websocketReconnect: true,
endpoint: '/api/fallback' // Always provide HTTP fallback
});

app.events.on('websocket:error', (data) => {
console.error('WebSocket error:', data.data.error);
});

app.events.on('websocket:reconnecting', (data) => {
console.log(`Reconnecting... attempt ${data.data.attempt}`);
});
```

#### Performance Issues
```javascript
// Problem: Slow chart updates
// Solution: Optimize data and disable animations

const chart = new SeriesChart({
animations: false, // Disable for real-time updates
chartOptions: {
animation: { duration: 0 }
},
  
// Limit data points
dataTransform: (data) => {
// Sample large datasets
if (data.length > 500) {
  return data.filter((_, i) => i % Math.ceil(data.length / 500) === 0);
}
return data;
}
});
```

### Debug Mode

```javascript
// Enable debug logging
const chart = new SeriesChart({
endpoint: '/api/data',
debug: true // Enable debug output
});

// Manual debugging
console.log('Chart stats:', chart.getStats());
console.log('Chart data:', chart.data);
console.log('WebSocket status:', chart.websocket?.getStatus());
```

---

## API Reference

### BaseChart Methods

```javascript
// Data methods
chart.setData(data)                    // Set chart data directly
chart.setEndpoint(url)                 // Change API endpoint
chart.setWebSocketUrl(url)             // Change WebSocket URL
chart.refresh()                        // Manual refresh
chart.updateChart(data)                // Update with new data

// Display methods
chart.setTheme(theme)                  // 'light' or 'dark'
chart.export(format)                   // 'png' or 'jpg'
chart.show()                           // Show chart
chart.hide()                           // Hide chart

// State methods
chart.getStats()                       // Get chart statistics
chart.getCurrentState()                // Get current state
chart.isLoading()                      // Check loading state
chart.hasError()                       // Check error state

// Lifecycle
chart.render()                         // Render chart
chart.mount()                          // Mount to DOM
chart.destroy()                        // Clean up resources
```

### SeriesChart Methods

```javascript
// Chart type
chart.setChartType(type)              // 'line' or 'bar'
chart.setOrientation(orientation)      // 'vertical' or 'horizontal'
chart.setStacked(stacked)             // Enable/disable stacking

// Series management
chart.addSeries(series)               // Add new data series
chart.removeSeries(index)             // Remove series by index
chart.updateSeries(index, series)     // Update existing series
```

### PieChart Methods

```javascript
// Segment interaction
chart.selectSegment(index)            // Select segment
chart.highlightSegments(indices)      // Highlight segments
chart.clearHighlights()               // Clear highlights

// Segment management
chart.addSegment(label, value, color) // Add segment
chart.removeSegment(index)            // Remove segment
chart.updateSegmentColor(index, color)// Change segment color

// Data access
chart.getSegmentData(index)           // Get segment info
chart.getAllSegments()                // Get all segments
```

### Events Reference

```javascript
// Base chart events
'chart:loaded'          // Chart finished loading
'chart:error'           // Error occurred
'chart:data-updated'    // Data refreshed
'chart:theme-changed'   // Theme switched
'chart:exported'        // Chart exported
'chart:destroyed'       // Chart destroyed

// SeriesChart events
'chart:type-changed'    // Chart type switched
'chart:series-added'    // Series added
'chart:series-removed'  // Series removed
'chart:point-clicked'   // Data point clicked

// PieChart events
'chart:segment-clicked'   // Segment clicked
'chart:segment-hover'     // Segment hovered
'chart:segment-added'     // Segment added
'chart:segment-removed'   // Segment removed
'chart:segment-color-changed' // Segment color changed

// WebSocket events
'websocket:connected'     // WebSocket connected
'websocket:disconnected'  // WebSocket disconnected
'websocket:reconnecting'  // Reconnecting
'websocket:error'         // WebSocket error
```

---

## Conclusion

The MOJO Charts package provides a powerful, flexible foundation for data visualization in web applications. Key benefits include:

### ✅ **Developer Experience**
- Simple API with sensible defaults
- Multiple data format support
- Rich event system for interactivity
- Comprehensive error handling

### ✅ **Real-Time Capabilities**
- WebSocket integration with auto-reconnect
- HTTP fallback for reliability
- Optimized for live data updates

### ✅ **Enterprise Ready**
- Bootstrap 5 integration
- Accessibility compliance
- Mobile-responsive design
- Theme support

### ✅ **Framework Integration**
- MOJO EventBus integration
- DataFormatter support
- EventDelegate actions
- View lifecycle management

### Getting Started Checklist

1. **Install Package**: Import charts components
2. **Create Container**: Add chart container element
3. **Configure Chart**: Set endpoint and formatting options
4. **Handle Events**: Listen for chart interactions
5. **Style & Theme**: Customize appearance
6. **Test Real-time**: Set up WebSocket updates
7. **Error Handling**: Add robust error management
8. **Performance**: Optimize for your data size

The Charts package seamlessly integrates with the MOJO framework while providing the full power of Chart.js for creating beautiful, interactive data visualizations that scale from simple dashboards to complex analytics applications.