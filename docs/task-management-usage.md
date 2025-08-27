# Task Management Page Usage Guide

The `TaskManagementPage` is a comprehensive administrative dashboard for monitoring and managing async tasks in your MOJO application. It provides real-time monitoring of task runners, task queues, and system metrics.

## Features

- **Real-time Task Statistics**: Live counters for pending, running, completed, and failed tasks
- **Runner Management**: Monitor and control task runners with status indicators and actions
- **Interactive Charts**: Visual representation of task flow and error trends using MetricsChart
- **Tabbed Task Tables**: Organized views of tasks by status (Pending, Running, Completed, Errors)
- **Context Menus**: Right-click actions for runners and tasks
- **Auto-refresh**: Configurable automatic data updates
- **Export Capabilities**: Export charts and task data

## Basic Usage

### 1. Import and Setup

```javascript
import { TaskManagementPage } from '../admin/index.js';

// Create the page instance
const taskPage = new TaskManagementPage({
  title: 'Task Management Dashboard'
});

// Mount to container
await taskPage.mount(document.getElementById('main-content'));
```

### 2. Integration with Router

```javascript
// In your router configuration
router.addRoute('/admin/tasks', async () => {
  const taskPage = new TaskManagementPage();
  return taskPage;
});
```

### 3. Portal Integration

```javascript
// Add to your admin portal menu
const adminMenu = [
  { label: 'Dashboard', path: '/admin', icon: 'bi-speedometer2' },
  { label: 'Task Management', path: '/admin/tasks', icon: 'bi-cpu' },
  // ... other menu items
];
```

## Required API Endpoints

Your backend must provide these REST API endpoints:

### Task Statistics
```
GET /api/tasks/status
Response: {
  "status": true,
  "data": {
    "pending": 20,
    "running": 5,
    "completed": 7,
    "errors": 3,
    "channels": { /* channel breakdown */ },
    "runners": { /* runner info */ }
  }
}
```

### Task Lists
```
GET /api/tasks/pending
GET /api/tasks/running
GET /api/tasks/completed
GET /api/tasks/errors

Response: {
  "status": true,
  "count": 10,
  "data": [
    {
      "id": "task-123",
      "function": "process_data",
      "channel": "default",
      "created": 1756172404.078486,
      "status": "pending",
      "error": null,
      "completed_at": null
    }
    // ... more tasks
  ]
}
```

### Task Runners
```
GET /api/tasks/runners
Response: {
  "status": true,
  "data": [
    {
      "hostname": "worker-01",
      "status": "active",
      "last_ping": 1756172552.825427,
      "max_workers": 5,
      "channels": ["default", "high_priority"],
      "ping_age": 12.716786861419678
    }
  ]
}
```

### Metrics (for charts)
```
GET /api/metrics/fetch
Query params: slugs=tasks_pub,tasks_completed,tasks_errors,tasks_expired
```

## Component Architecture

The TaskManagementPage is composed of several child components:

```
TaskManagementPage
├── TaskStatsView (statistics cards)
├── TaskRunnersView (runner status panel)
├── TaskChartsView
│   ├── MetricsChart (task flow)
│   └── MetricsChart (task errors)
└── TabView
    ├── PendingTasksTable
    ├── RunningTasksTable
    ├── CompletedTasksTable
    └── ErrorTasksTable
```

## Customization Options

### 1. Custom Table Columns

```javascript
class CustomPendingTasksTable extends BaseTaskTable {
  constructor(options = {}) {
    super({
      ...options,
      title: 'Pending Tasks',
      endpoint: '/api/tasks/pending',
      columns: [
        { key: 'id', label: 'Task ID', sortable: true },
        { key: 'priority', label: 'Priority', sortable: true, formatter: 'badge' },
        { key: 'function', label: 'Function', sortable: true },
        { key: 'channel', label: 'Channel', sortable: true },
        { key: 'created', label: 'Created', sortable: true, formatter: 'datetime' }
      ]
    });
  }
}
```

### 2. Custom Chart Configuration

```javascript
class CustomTaskChartsView extends View {
  async onInit() {
    this.customChart = new MetricsChart({
      title: 'Task Throughput by Channel',
      endpoint: '/api/metrics/channel-breakdown',
      height: 300,
      chartType: 'bar',
      colors: ['#007bff', '#28a745', '#dc3545', '#ffc107'],
      containerId: 'custom-chart'
    });
    this.addChild(this.customChart);
  }
}
```

### 3. Custom Runner Actions

```javascript
class CustomTaskRunnersView extends TaskRunnersView {
  async onActionRestartRunner(action, event, element) {
    const runnerId = element.getAttribute('data-runner-id');
    
    try {
      const response = await this.rest.POST(`/api/runners/${runnerId}/restart`);
      if (response.success) {
        this.showSuccess('Runner restarted successfully');
        await this.loadRunners(); // Refresh the view
      }
    } catch (error) {
      this.showError('Failed to restart runner: ' + error.message);
    }
  }
}
```

## Event Handling

The TaskManagementPage emits several events you can listen to:

```javascript
const taskPage = new TaskManagementPage();

// Listen for dashboard refresh events
taskPage.on('tasks:dashboard-refreshed', (data) => {
  console.log('Dashboard refreshed at:', data.timestamp);
});

// Listen for runner actions
taskPage.taskRunnersView.on('runner:action', (data) => {
  console.log('Runner action:', data.action, 'on', data.runnerId);
});

// Listen for task actions
taskPage.taskTablesView.on('task:action', (data) => {
  console.log('Task action:', data.action, 'on', data.taskId);
});
```

## Styling and Themes

The component uses Bootstrap 5 classes and includes custom CSS in `admin.css`:

```css
/* Customize task status badges */
.badge.status-pending { background-color: #0d6efd !important; }
.badge.status-running { background-color: #198754 !important; }
.badge.status-completed { background-color: #0dcaf0 !important; }
.badge.status-error { background-color: #dc3545 !important; }

/* Customize runner status indicators */
.task-runners-section .status-indicator .badge {
  font-size: 0.8rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
}
```

## Advanced Usage

### Auto-refresh Configuration

```javascript
class AutoRefreshTaskPage extends TaskManagementPage {
  async onAfterMount() {
    await super.onAfterMount();
    
    // Set up auto-refresh every 10 seconds
    this.refreshInterval = setInterval(async () => {
      await this.refreshDashboard();
    }, 10000);
  }
  
  async onBeforeDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    await super.onBeforeDestroy();
  }
}
```

### WebSocket Integration

```javascript
import { WebSocketClient } from '../utils/WebSocket.js';

class RealtimeTaskPage extends TaskManagementPage {
  async onInit() {
    await super.onInit();
    
    // Connect to task events WebSocket
    this.ws = new WebSocketClient('/ws/tasks');
    this.ws.on('task:status-changed', this.handleTaskUpdate.bind(this));
    this.ws.on('runner:status-changed', this.handleRunnerUpdate.bind(this));
  }
  
  handleTaskUpdate(data) {
    // Update specific task in tables
    const activeTable = this.taskTablesView.getTab(this.taskTablesView.getActiveTab());
    if (activeTable?.updateItem) {
      activeTable.updateItem(data.taskId, data.task);
    }
  }
  
  handleRunnerUpdate(data) {
    // Refresh runner status
    this.taskRunnersView.loadRunners();
  }
}
```

## Performance Considerations

1. **Pagination**: Tables are paginated by default (10 items per page)
2. **Lazy Loading**: Charts load data only when visible
3. **Debounced Refresh**: Automatic refreshes are debounced to prevent excessive API calls
4. **Memory Management**: Components are properly destroyed when navigating away

## Best Practices

1. **Error Handling**: Always wrap API calls in try-catch blocks
2. **User Feedback**: Provide loading states and success/error messages
3. **Responsive Design**: Test on different screen sizes
4. **Accessibility**: Use proper ARIA labels and keyboard navigation
5. **Performance**: Implement caching for frequently accessed data

## Troubleshooting

### Common Issues

1. **Charts not loading**: Ensure `/api/metrics/fetch` endpoint returns data for the required slugs
2. **Tables empty**: Check that task endpoints return data in the expected format
3. **Actions not working**: Verify that action handler methods are properly named (onAction*)
4. **Styling issues**: Import `admin.css` in your main CSS file

### Debug Mode

Enable debug logging:

```javascript
const taskPage = new TaskManagementPage({
  debug: true
});

// This will log all API calls, state changes, and errors
```
